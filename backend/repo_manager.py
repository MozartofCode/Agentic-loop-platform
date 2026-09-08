import asyncio
import re
from pathlib import Path

CLONE_TIMEOUT_SECONDS = 60

_GITHUB_URL_RE = re.compile(
    r"^https://github\.com/([\w.-]+)/([\w.-]+?)(\.git)?/?$"
)


class RepoCloneError(Exception):
    pass


def parse_github_url(repo_url: str) -> tuple[str, str]:
    match = _GITHUB_URL_RE.match(repo_url.strip())
    if not match:
        raise RepoCloneError("Only https://github.com/<owner>/<repo> URLs are supported")
    return match.group(1), match.group(2)


async def clone_repo(repo_url: str, dest: Path, github_token: str | None) -> None:
    """Shallow-clone a GitHub repo into dest. dest must not already exist."""
    owner, repo = parse_github_url(repo_url)
    clone_url = f"https://github.com/{owner}/{repo}.git"
    if github_token:
        clone_url = f"https://x-access-token:{github_token}@github.com/{owner}/{repo}.git"

    dest.parent.mkdir(parents=True, exist_ok=True)
    proc = await asyncio.create_subprocess_exec(
        "git", "clone", "--depth", "1", clone_url, str(dest),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    try:
        _, stderr = await asyncio.wait_for(proc.communicate(), timeout=CLONE_TIMEOUT_SECONDS)
    except asyncio.TimeoutError:
        proc.kill()
        await proc.wait()
        raise RepoCloneError("Timed out cloning repo (60s)")

    if proc.returncode != 0:
        raise RepoCloneError(f"git clone failed: {stderr.decode().strip()[:500]}")
