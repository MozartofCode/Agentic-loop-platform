import { T, MONO } from '../theme.js';

function elapsed(startedAt) {
  const secs = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  return `${mins}m ${secs % 60}s`;
}

function AgentRow({ agent, selected, onClick }) {
  const iterations = agent.events.filter((e) => e.type === 'iteration').length;
  const toolCalls = agent.events.filter((e) => e.type === 'tool_call').length;
  const thoughts = agent.events.filter((e) => e.type === 'thought').length;
  const running = agent.status === 'running';

  const statusColor = {
    running: T.accent,
    done: T.green,
    error: T.red,
    stopped: T.dim,
  }[agent.status] || T.dim;

  return (
    <div
      onClick={onClick}
      style={{
        padding: '10px 14px',
        borderLeft: selected ? `3px solid ${T.accent}` : '3px solid transparent',
        background: selected ? 'rgba(232, 168, 76, 0.08)' : 'transparent',
        cursor: 'pointer',
        borderBottom: `1px solid ${T.border}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            width: 7, height: 7, borderRadius: '50%', background: statusColor,
            animation: running ? 'dotPulse 1.4s ease-in-out infinite' : 'none',
          }}
        />
        <span style={{ fontFamily: MONO, fontSize: 12, color: T.text }}>{agent.id}</span>
        <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 11, color: T.dim }}>
          {elapsed(agent.started_at)}
        </span>
      </div>
      <div style={{ color: T.muted, fontSize: 12, marginTop: 6, lineHeight: 1.4 }}>
        {agent.task.length > 68 ? agent.task.slice(0, 68) + '…' : agent.task}
      </div>
      <div style={{ color: T.dim, fontSize: 10.5, marginTop: 6, fontFamily: MONO }}>
        {iterations} iter · {toolCalls} calls · {thoughts} thoughts
      </div>
    </div>
  );
}

export default function Sidebar({ agents, selectedId, onSelect, onSpawnClick }) {
  const list = Object.values(agents).sort((a, b) => b.started_at - a.started_at);
  const runningCount = list.filter((a) => a.status === 'running').length;

  return (
    <div style={{
      width: 260, minWidth: 260, background: T.panel, borderRight: `1px solid ${T.border}`,
      display: 'flex', flexDirection: 'column', height: '100vh',
    }}>
      <div style={{ padding: '16px 14px', borderBottom: `1px solid ${T.border}` }}>
        <div style={{ color: T.text, fontWeight: 600, fontSize: 14 }}>⬡ Agent Monitor</div>
        <div style={{ color: T.muted, fontSize: 11, marginTop: 4 }}>{runningCount} running</div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {list.map((agent) => (
          <AgentRow
            key={agent.id}
            agent={agent}
            selected={agent.id === selectedId}
            onClick={() => onSelect(agent.id)}
          />
        ))}
      </div>
      <button
        onClick={onSpawnClick}
        style={{
          width: '100%', padding: '14px 0', background: T.accent, color: T.bg,
          border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer',
        }}
      >
        + Spawn agent
      </button>
    </div>
  );
}
