from pydantic import BaseModel
from typing import Any, Optional
from enum import Enum
import uuid, time


class AgentStatus(str, Enum):
    RUNNING = "running"
    DONE = "done"
    ERROR = "error"
    STOPPED = "stopped"


class EventType(str, Enum):
    ITERATION = "iteration"
    THOUGHT = "thought"
    TOOL_CALL = "tool_call"
    TOOL_RESULT = "tool_result"
    FINISH = "finish"
    ERROR = "error"
    SYS = "sys"


class AgentEvent(BaseModel):
    type: EventType
    at: float = 0.0  # unix timestamp ms
    data: dict[str, Any] = {}

    def model_post_init(self, __context):
        if not self.at:
            self.at = time.time() * 1000


class Agent(BaseModel):
    id: str = ""
    task: str
    status: AgentStatus = AgentStatus.RUNNING
    events: list[AgentEvent] = []
    started_at: float = 0.0
    stopped: bool = False  # soft-stop flag
    repo_url: Optional[str] = None  # GitHub repo cloned as the agent's workspace, if any

    def model_post_init(self, __context):
        if not self.id:
            self.id = f"agent-{uuid.uuid4().hex[:6]}"
        if not self.started_at:
            self.started_at = time.time() * 1000


class SpawnRequest(BaseModel):
    task: str
    repo_url: Optional[str] = None  # optional GitHub repo URL to clone as workspace


class BroadcastMessage(BaseModel):
    agent_id: str
    event: AgentEvent
