import { useState } from 'react';
import { T, MONO, TOOL_COLORS, TOOL_ICONS } from '../theme.js';

function firstArgPreview(input) {
  const entries = Object.entries(input || {});
  if (entries.length === 0) return '';
  const [key, value] = entries[0];
  const str = typeof value === 'string' ? value : JSON.stringify(value);
  return `${key}: ${str.length > 50 ? str.slice(0, 50) + '…' : str}`;
}

export default function EventRow({ event }) {
  const [open, setOpen] = useState(true);

  switch (event.type) {
    case 'iteration':
      return (
        <div style={{ display: 'flex', alignItems: 'center', margin: '18px 0', gap: 12 }}>
          <div style={{ flex: 1, height: 1, background: T.border }} />
          <span style={{ color: T.dim, fontFamily: MONO, fontSize: 11 }}>iter {event.data.n}</span>
          <div style={{ flex: 1, height: 1, background: T.border }} />
        </div>
      );

    case 'thought':
      return (
        <div style={{ borderLeft: `3px solid ${T.accent}`, padding: '6px 12px', margin: '10px 0' }}>
          <div style={{ color: T.muted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
            reasoning
          </div>
          <div style={{ color: T.text, fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
            {event.data.text}
          </div>
        </div>
      );

    case 'tool_call': {
      const color = TOOL_COLORS[event.data.tool] || T.muted;
      const icon = TOOL_ICONS[event.data.tool] || '•';
      return (
        <div style={{ margin: '10px 0', border: `1px solid ${T.border}`, borderRadius: 6, background: T.card }}>
          <div
            onClick={() => setOpen(!open)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
              cursor: 'pointer', userSelect: 'none',
            }}
          >
            <span style={{ color, fontSize: 13 }}>{icon}</span>
            <span style={{ color, fontSize: 12, fontFamily: MONO, fontWeight: 600 }}>{event.data.tool}</span>
            <span style={{ color: T.muted, fontSize: 11, fontFamily: MONO }}>{firstArgPreview(event.data.input)}</span>
            <span style={{ marginLeft: 'auto', color: T.dim, fontSize: 10 }}>{open ? '▾' : '▸'}</span>
          </div>
          {open && (
            <pre style={{
              margin: 0, padding: '10px 12px', borderTop: `1px solid ${T.border}`,
              color: T.text, fontFamily: MONO, fontSize: 11.5, overflowX: 'auto',
            }}>
              {JSON.stringify(event.data.input, null, 2)}
            </pre>
          )}
        </div>
      );
    }

    case 'tool_result':
      return (
        <div style={{ marginLeft: 20, marginBottom: 10 }}>
          <div style={{ color: T.muted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
            output
          </div>
          <pre style={{
            margin: 0, padding: '10px 12px', borderRadius: 6,
            background: 'rgba(82, 199, 125, 0.08)', border: `1px solid rgba(82, 199, 125, 0.25)`,
            color: T.green, fontFamily: MONO, fontSize: 11.5, overflowX: 'auto', whiteSpace: 'pre-wrap',
          }}>
            {event.data.output}
          </pre>
        </div>
      );

    case 'finish':
      return (
        <div style={{
          margin: '14px 0', padding: 14, borderRadius: 8,
          border: `1px solid ${T.blue}`, background: 'rgba(107, 163, 247, 0.06)',
        }}>
          <div style={{ color: T.blue, fontWeight: 600, fontSize: 13, marginBottom: 8 }}>✓ task complete</div>
          <div style={{ color: T.muted, fontSize: 10, textTransform: 'uppercase', marginBottom: 4 }}>Summary</div>
          <div style={{ color: T.text, fontSize: 13, marginBottom: 10 }}>{event.data.summary}</div>
          <div style={{ color: T.muted, fontSize: 10, textTransform: 'uppercase', marginBottom: 4 }}>Output</div>
          <pre style={{
            margin: 0, padding: 10, borderRadius: 6, background: T.bg,
            color: T.text, fontFamily: MONO, fontSize: 11.5, overflowX: 'auto', whiteSpace: 'pre-wrap',
          }}>
            {event.data.output}
          </pre>
        </div>
      );

    case 'error':
      return (
        <div style={{
          margin: '10px 0', padding: 12, borderRadius: 6,
          border: `1px solid ${T.red}`, background: 'rgba(224, 90, 90, 0.08)',
          color: T.red, fontSize: 13,
        }}>
          {event.data.msg}
        </div>
      );

    case 'sys':
      return (
        <div style={{ textAlign: 'center', color: T.muted, fontSize: 11.5, margin: '10px 0' }}>
          {event.data.text}
        </div>
      );

    default:
      return null;
  }
}
