import json
from pathlib import Path

from groq import APIStatusError

from models import Agent, AgentEvent, AgentStatus, EventType
from tool_executor import TOOL_DEFINITIONS, execute_tool

SYSTEM_PROMPT = """You are a focused coding agent with access to a real filesystem and Python runtime.
Work through tasks step by step:
- Use read_file to understand existing code before modifying it
- Use write_file to save code you create or fix
- Use run_python to test your code and verify it works
- Use bash for shell operations (installing packages, running scripts)
- Use list_files to understand the workspace structure
- Use finish when the task is fully complete — include all final code in output

Be methodical. Verify your work. Keep reasoning concise. Prefer to write working,
tested code over theoretical explanations."""


async def run_agent(agent: Agent, workspace: Path, broadcast_fn, groq_client, settings) -> None:
    """Core agentic loop. Runs as an asyncio Task.
    broadcast_fn(agent_id, event) sends the event to all WebSocket listeners.
    """

    async def emit(event_type: EventType, **data):
        event = AgentEvent(type=event_type, data=data)
        agent.events.append(event)
        await broadcast_fn(agent.id, event)

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": agent.task},
    ]

    for iteration in range(1, settings.max_iterations + 1):
        if agent.stopped:
            agent.status = AgentStatus.STOPPED
            await emit(EventType.SYS, text="Stopped by user")
            return

        await emit(EventType.ITERATION, n=iteration)

        try:
            response = await groq_client.chat.completions.create(
                model=settings.groq_model,
                messages=messages,
                tools=TOOL_DEFINITIONS,
                tool_choice="auto",
                max_tokens=2048,
            )
        except APIStatusError as e:
            agent.status = AgentStatus.ERROR
            if e.status_code == 429:
                await emit(EventType.ERROR, msg="Rate limited — retry in a moment")
            else:
                await emit(EventType.ERROR, msg=str(e))
            return
        except Exception as e:
            agent.status = AgentStatus.ERROR
            await emit(EventType.ERROR, msg=str(e))
            return

        msg = response.choices[0].message
        messages.append(msg.model_dump(exclude_none=True))

        if msg.content:
            await emit(EventType.THOUGHT, text=msg.content)

        if not msg.tool_calls or response.choices[0].finish_reason == "stop":
            agent.status = AgentStatus.DONE
            await emit(EventType.SYS, text="Agent finished")
            return

        for tc in msg.tool_calls:
            try:
                args = json.loads(tc.function.arguments)
            except json.JSONDecodeError:
                args = {}
            await emit(EventType.TOOL_CALL, tool=tc.function.name, input=args, call_id=tc.id)

            if tc.function.name == "finish":
                await emit(EventType.FINISH, summary=args.get("summary", ""), output=args.get("output", ""))
                agent.status = AgentStatus.DONE
                return

            output = await execute_tool(tc.function.name, args, workspace)
            await emit(EventType.TOOL_RESULT, tool=tc.function.name, output=output, call_id=tc.id)

            messages.append({
                "role": "tool",
                "tool_call_id": tc.id,
                "content": output,
            })

    await emit(EventType.SYS, text="Max iterations reached")
    agent.status = AgentStatus.DONE
