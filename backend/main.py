import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from groq import AsyncGroq

from agent_runner import run_agent
from config import settings
from models import Agent, AgentEvent, AgentStatus, SpawnRequest
from repo_manager import RepoCloneError, clone_repo

agents: dict[str, Agent] = {}
ws_connections: set[WebSocket] = set()

groq_client = AsyncGroq(api_key=settings.groq_api_key)

SAMPLE_FILES = {
    "broken.py": (
        "def fibonacci(n):\n"
        "    # BUG: no base case — causes infinite recursion\n"
        "    return fibonacci(n - 1) + fibonacci(n - 2)\n\n"
        "print(fibonacci(10))\n"
    ),
    "api.py": (
        "from fastapi import FastAPI\n\n"
        "app = FastAPI()\n"
        "todos = []\n\n"
        "@app.get(\"/todos\")\n"
        "async def list_todos():\n"
        "    return todos\n"
    ),
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    workspace_root = Path(settings.agent_workspace)
    workspace_root.mkdir(parents=True, exist_ok=True)
    for name, content in SAMPLE_FILES.items():
        f = workspace_root / name
        if not f.exists():
            f.write_text(content)
    yield


app = FastAPI(lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


def agent_workspace_path(agent: Agent) -> Path:
    root = Path(settings.agent_workspace)
    if agent.repo_url:
        return root / "agents" / agent.id
    return root


async def broadcast(agent_id: str, event: AgentEvent):
    payload = {"type": "event", "agent_id": agent_id, "event": event.model_dump(mode="json")}
    dead = set()
    for ws in ws_connections:
        try:
            await ws.send_json(payload)
        except Exception:
            dead.add(ws)
    ws_connections.difference_update(dead)

    agent = agents.get(agent_id)
    if agent and event.type in ("finish", "error", "sys"):
        await broadcast_agent_update(agent)


async def broadcast_agent_update(agent: Agent):
    payload = {"type": "agent_update", "agent": agent.model_dump(mode="json")}
    dead = set()
    for ws in ws_connections:
        try:
            await ws.send_json(payload)
        except Exception:
            dead.add(ws)
    ws_connections.difference_update(dead)


@app.post("/agents", status_code=201)
async def spawn_agent(req: SpawnRequest):
    agent = Agent(task=req.task, repo_url=req.repo_url)
    agents[agent.id] = agent

    workspace = agent_workspace_path(agent)

    if req.repo_url:
        try:
            await clone_repo(req.repo_url, workspace, settings.github_token)
        except RepoCloneError as e:
            agent.status = AgentStatus.ERROR
            agent.events.append(AgentEvent(type="error", data={"msg": str(e)}))
            agents[agent.id] = agent
            return agent

    import asyncio
    asyncio.create_task(run_agent(agent, workspace, broadcast, groq_client, settings))
    return agent


@app.get("/agents")
async def list_agents():
    return list(agents.values())


@app.get("/agents/{agent_id}")
async def get_agent(agent_id: str):
    agent = agents.get(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@app.delete("/agents/{agent_id}", status_code=204)
async def stop_agent(agent_id: str):
    agent = agents.get(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    agent.stopped = True
    return None


@app.websocket("/ws")
async def ws_endpoint(websocket: WebSocket):
    await websocket.accept()
    ws_connections.add(websocket)
    try:
        await websocket.send_json({
            "type": "init",
            "agents": [a.model_dump(mode="json") for a in agents.values()],
        })
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        ws_connections.discard(websocket)
