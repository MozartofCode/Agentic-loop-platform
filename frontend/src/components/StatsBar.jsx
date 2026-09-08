import { T, MONO } from '../theme.js';

function Cell({ value, label, first }) {
  return (
    <div style={{
      flex: 1, padding: '10px 16px',
      borderLeft: first ? 'none' : `1px solid ${T.border}`,
    }}>
      <div style={{ fontFamily: MONO, fontSize: 18, color: T.text }}>{value}</div>
      <div style={{ fontSize: 10, color: T.dim, marginTop: 2 }}>{label}</div>
    </div>
  );
}

export default function StatsBar({ agent }) {
  const events = agent?.events || [];
  const iterations = events.filter((e) => e.type === 'iteration').length;
  const toolCalls = events.filter((e) => e.type === 'tool_call').length;
  const thoughts = events.filter((e) => e.type === 'thought').length;

  return (
    <div style={{ display: 'flex', background: T.bg }}>
      <Cell value={iterations} label="Iterations" first />
      <Cell value={toolCalls} label="Tool calls" />
      <Cell value={thoughts} label="Thoughts" />
      <Cell value={events.length} label="Total events" />
    </div>
  );
}
