# Agent Monitor

A full-stack platform for running and monitoring multiple agentic coding loops in real time.
Spawn agents with plain-English tasks; each agent reasons, calls tools (read/write files, run
Python, run bash), and iterates until the task is done. The frontend shows every step of every
agent — thoughts, tool calls, outputs, iteration counts — live over a WebSocket connection.

Agents can work in a scratch workspace, or you can **connect a GitHub repo** and have the agent
run against a real, cloned copy of it.

**LLM provider:** [Groq](https://console.groq.com) (free tier). Model: `openai/gpt-oss-120b`
(a tool-calling-capable model currently on Groq's free tier — swap `GROQ_MODEL` in `.env` if
Groq's lineup changes; check available models at any time with
`curl https://api.groq.com/openai/v1/models -H "Authorization: Bearer $GROQ_API_KEY"`).
No paid services, no database — state is in-memory for this MVP.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Browser                              │
│   React UI (Vite dev server)  ◄──────►  WebSocket client │
└───┬──────────────────────┬───────────────────────────────┘
    │ HTTP (REST)          │ WebSocket
    ▼                      ▼
┌─────────────────────────────────────────────────────────┐
│                  FastAPI  :8000                          │
│   POST   /agents        → spawn agent (optional repo_url)│
│   GET    /agents        → list all agents                │
│   GET    /agents/{id}   → agent detail + events          │
│   DELETE /agents/{id}   → stop agent                      │
│   WS     /ws            → event stream (all agents)      │
│                                                            │
│   AgentRunner (asyncio task per agent)                    │
│   ├── clones GitHub repo into workspace, if requested     │
│   ├── calls Groq API                                      │
│   ├── executes tools (sandboxed to the agent's workspace) │
│   └── broadcasts events → all WS connections              │
└──────────────────────────────┬────────────────────────────┘
                                │ HTTPS
                                ▼
                     ┌──────────────────┐
                     │   Groq API       │
                     │  llama-3.3-70b   │
                     └──────────────────┘
```

## Setup

```bash
cp .env.example .env
# Edit .env and add your GROQ_API_KEY from console.groq.com (free)
```

### Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend (new terminal)

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**.

## Connecting a GitHub repo

When spawning an agent, optionally paste a public GitHub repo URL
(`https://github.com/owner/repo`) into the "GitHub repo" field. The backend shallow-clones
the repo into `backend/workspace/agents/<agent-id>` and the agent's tools (`read_file`,
`write_file`, `list_files`, `run_python`, `bash`) operate inside that clone instead of the
shared scratch workspace. Leave it blank to use the default sample workspace.

To clone private repos, set `GITHUB_TOKEN` in `.env` to a GitHub personal access token with
`repo` scope.

Cloned repos are local working copies only in this MVP — the agent can read, write, and run
code in the clone, but nothing is pushed back to GitHub. Committing/pushing agent changes is
future work (see below).

## Project layout

```
backend/
├── main.py            # FastAPI app, routes, WebSocket hub
├── agent_runner.py     # Agentic loop logic
├── tool_executor.py    # Tool definitions and sandboxed execution
├── repo_manager.py     # GitHub repo cloning for the "connect a repo" feature
├── models.py           # Pydantic models
├── config.py            # Settings (reads .env)
└── requirements.txt

frontend/
├── index.html
├── vite.config.js
├── package.json
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── ws.js            # WebSocket singleton + event bus
    ├── api.js           # REST helpers
    ├── theme.js
    └── components/
        ├── Sidebar.jsx
        ├── AgentPanel.jsx
        ├── EventLog.jsx
        ├── EventRow.jsx
        ├── StatsBar.jsx
        └── SpawnModal.jsx
```

## Branches

- `production` — the stable branch (formerly `main`).
- `staging` — active development for this MVP happens here.

## Out of scope for this MVP

- User authentication
- Persistent storage / database
- Pushing agent changes back to GitHub (commits/PRs)
- Agent-to-agent orchestration
- Streaming LLM responses (uses complete responses)
- Docker / deployment config
