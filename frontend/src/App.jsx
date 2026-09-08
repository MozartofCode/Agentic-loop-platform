import { useEffect, useState, useCallback } from 'react';
import { T, FONT } from './theme.js';
import { api } from './api.js';
import * as ws from './ws.js';
import Sidebar from './components/Sidebar.jsx';
import AgentPanel from './components/AgentPanel.jsx';
import SpawnModal from './components/SpawnModal.jsx';

const ANIMATIONS = `
@keyframes dotPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.3; transform: scale(0.8); }
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
`;

export default function App() {
  const [agents, setAgents] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [modal, setModal] = useState(false);

  useEffect(() => {
    ws.connect();

    const onInit = (payload) => {
      const map = {};
      for (const a of payload.agents) map[a.id] = a;
      setAgents(map);
      setSelectedId((cur) => cur || payload.agents[0]?.id || null);
    };

    const onEvent = (payload) => {
      setAgents((prev) => {
        const agent = prev[payload.agent_id];
        if (!agent) return prev;
        return {
          ...prev,
          [payload.agent_id]: { ...agent, events: [...agent.events, payload.event] },
        };
      });
    };

    const onAgentUpdate = (payload) => {
      setAgents((prev) => ({ ...prev, [payload.agent.id]: payload.agent }));
    };

    ws.on('init', onInit);
    ws.on('event', onEvent);
    ws.on('agent_update', onAgentUpdate);

    api.listAgents().then((list) => {
      setAgents((prev) => {
        if (Object.keys(prev).length > 0) return prev;
        const map = {};
        for (const a of list) map[a.id] = a;
        return map;
      });
    }).catch(() => {});

    return () => {
      ws.off('init', onInit);
      ws.off('event', onEvent);
      ws.off('agent_update', onAgentUpdate);
    };
  }, []);

  const spawn = useCallback(async (task, repoUrl) => {
    const agent = await api.spawnAgent(task, repoUrl);
    setAgents((prev) => ({ ...prev, [agent.id]: agent }));
    setSelectedId(agent.id);
    setModal(false);
  }, []);

  const stop = useCallback(async (id) => {
    await api.stopAgent(id);
  }, []);

  const rerun = useCallback((agent) => {
    spawn(agent.task, agent.repo_url);
  }, [spawn]);

  return (
    <div style={{ display: 'flex', height: '100vh', background: T.bg, fontFamily: FONT, color: T.text }}>
      <style>{ANIMATIONS}</style>
      <Sidebar
        agents={agents}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onSpawnClick={() => setModal(true)}
      />
      <AgentPanel agent={agents[selectedId]} onStop={stop} onRerun={rerun} />
      {modal && <SpawnModal onClose={() => setModal(false)} onSpawn={spawn} />}
    </div>
  );
}
