import { T, MONO } from '../theme.js';
import StatsBar from './StatsBar.jsx';
import EventLog from './EventLog.jsx';

function elapsed(startedAt) {
  const secs = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  return `${mins}m ${secs % 60}s`;
}

const STATUS_LABEL = {
  running: 'Running',
  done: 'Done',
  error: 'Error',
  stopped: 'Stopped',
};

export default function AgentPanel({ agent, onStop, onRerun }) {
  if (!agent) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.dim }}>
        Select or spawn an agent to see its activity
      </div>
    );
  }

  const statusColor = {
    running: T.accent,
    done: T.green,
    error: T.red,
    stopped: T.dim,
  }[agent.status] || T.dim;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', minWidth: 0 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px',
        borderBottom: `1px solid ${T.border}`,
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%', background: statusColor,
          animation: agent.status === 'running' ? 'dotPulse 1.4s ease-in-out infinite' : 'none',
        }} />
        <span style={{ fontFamily: MONO, fontSize: 13, color: T.text }}>{agent.id}</span>
        <span style={{ color: statusColor, fontSize: 12, fontWeight: 600 }}>{STATUS_LABEL[agent.status]}</span>
        <span style={{ color: T.dim, fontSize: 12, fontFamily: MONO }}>{elapsed(agent.started_at)}</span>
        <span style={{ color: T.muted, fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {agent.task}
        </span>
        {agent.status === 'running' ? (
          <button
            onClick={() => onStop(agent.id)}
            style={{
              padding: '6px 14px', background: 'transparent', border: `1px solid ${T.red}`,
              borderRadius: 6, color: T.red, fontSize: 12, cursor: 'pointer',
            }}
          >
            Stop
          </button>
        ) : (
          <button
            onClick={() => onRerun(agent)}
            style={{
              padding: '6px 14px', background: 'transparent', border: `1px solid ${T.accent}`,
              borderRadius: 6, color: T.accent, fontSize: 12, cursor: 'pointer',
            }}
          >
            Re-run
          </button>
        )}
      </div>
      <StatsBar agent={agent} />
      <EventLog agent={agent} />
    </div>
  );
}
