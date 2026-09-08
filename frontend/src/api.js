const BASE = '/api';

async function GET(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
  return res.json();
}

async function POST(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${url} failed: ${res.status}`);
  return res.json();
}

async function DELETE(url) {
  const res = await fetch(url, { method: 'DELETE' });
  if (!res.ok) throw new Error(`DELETE ${url} failed: ${res.status}`);
}

export const api = {
  spawnAgent: (task, repoUrl) => POST(`${BASE}/agents`, { task, repo_url: repoUrl || null }),
  listAgents: () => GET(`${BASE}/agents`),
  getAgent: (id) => GET(`${BASE}/agents/${id}`),
  stopAgent: (id) => DELETE(`${BASE}/agents/${id}`),
};
