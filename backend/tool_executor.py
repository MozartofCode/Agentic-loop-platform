import asyncio
import os
import uuid
from pathlib import Path

TOOL_TIMEOUT_SECONDS = 15

TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "read_file",
            "description": "Read the contents of a file in the workspace",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Relative path within workspace"}
                },
                "required": ["path"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "write_file",
            "description": "Create or overwrite a file in the workspace",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string"},
                    "content": {"type": "string"},
                },
                "required": ["path", "content"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_files",
            "description": "List files in the workspace (or a subdirectory)",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Subdirectory to list, default '.'"}
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "run_python",
            "description": "Execute Python code and return stdout + stderr. Timeout 15s.",
            "parameters": {
                "type": "object",
                "properties": {
                    "code": {"type": "string", "description": "Python source code"}
                },
                "required": ["code"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "bash",
            "description": "Run a bash shell command in the workspace directory. Timeout 15s.",
            "parameters": {
                "type": "object",
                "properties": {"command": {"type": "string"}},
                "required": ["command"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "finish",
            "description": "Mark task as complete. Call this when done.",
            "parameters": {
                "type": "object",
                "properties": {
                    "summary": {"type": "string", "description": "What was accomplished"},
                    "output": {"type": "string", "description": "Final code or result"},
                },
                "required": ["summary", "output"],
            },
        },
    },
]


def _resolve_safe_path(workspace: Path, rel_path: str) -> Path | None:
    """Resolve rel_path against workspace, returning None if it escapes the workspace root."""
    candidate = (workspace / rel_path).resolve()
    workspace_resolved = workspace.resolve()
    try:
        candidate.relative_to(workspace_resolved)
    except ValueError:
        return None
    return candidate


def _bash_command_is_safe(command: str, workspace: Path) -> bool:
    if ".." in command:
        return False
    workspace_str = str(workspace.resolve())
    for token in command.split():
        if token.startswith("/") and not token.startswith(workspace_str):
            return False
    return True


async def execute_tool(name: str, args: dict, workspace: Path) -> str:
    if name == "read_file":
        path = _resolve_safe_path(workspace, args["path"])
        if path is None:
            return "Error: path escapes workspace"
        if not path.exists():
            return f"Error: file not found: {args['path']}"
        try:
            return path.read_text()
        except Exception as e:
            return f"Error reading file: {e}"

    if name == "write_file":
        path = _resolve_safe_path(workspace, args["path"])
        if path is None:
            return "Error: path escapes workspace"
        path.parent.mkdir(parents=True, exist_ok=True)
        content = args["content"]
        path.write_text(content)
        return f"Written {len(content.splitlines())} lines to {args['path']}"

    if name == "list_files":
        sub = args.get("path", ".")
        path = _resolve_safe_path(workspace, sub)
        if path is None:
            return "Error: path escapes workspace"
        if not path.exists():
            return f"Error: directory not found: {sub}"
        results = []
        for root, dirs, files in os.walk(path):
            dirs[:] = [d for d in dirs if d not in (".git", "node_modules", "__pycache__")]
            for f in files:
                full = Path(root) / f
                results.append(str(full.relative_to(workspace.resolve())))
        return "\n".join(sorted(results)) if results else "(empty)"

    if name == "run_python":
        workspace.mkdir(parents=True, exist_ok=True)
        tmp_name = f".agent_tmp_{uuid.uuid4().hex[:8]}.py"
        tmp_path = workspace / tmp_name
        tmp_path.write_text(args["code"])
        try:
            proc = await asyncio.create_subprocess_exec(
                "python3",
                str(tmp_path.resolve()),
                cwd=str(workspace.resolve()),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            try:
                stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=TOOL_TIMEOUT_SECONDS)
            except asyncio.TimeoutError:
                proc.kill()
                await proc.wait()
                return "Timeout: command exceeded 15s"
            output = stdout.decode() + stderr.decode()
            return output if output.strip() else "(no output)"
        finally:
            tmp_path.unlink(missing_ok=True)

    if name == "bash":
        command = args["command"]
        if not _bash_command_is_safe(command, workspace):
            return "Error: path escapes workspace"
        workspace.mkdir(parents=True, exist_ok=True)
        try:
            proc = await asyncio.create_subprocess_shell(
                command,
                cwd=str(workspace),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            try:
                stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=TOOL_TIMEOUT_SECONDS)
            except asyncio.TimeoutError:
                proc.kill()
                await proc.wait()
                return "Timeout: command exceeded 15s"
            output = stdout.decode() + stderr.decode()
            return output if output.strip() else "(no output)"
        except Exception as e:
            return f"Error running command: {e}"

    if name == "finish":
        return args["output"]

    return f"Error: unknown tool {name}"
