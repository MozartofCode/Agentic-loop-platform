import { useEffect, useRef } from 'react';
import { T } from '../theme.js';
import EventRow from './EventRow.jsx';

export default function EventLog({ agent }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [agent?.events?.length]);

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
      {(agent?.events || []).map((event, i) => (
        <EventRow key={i} event={event} />
      ))}
      {agent?.status === 'running' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', color: T.muted, fontSize: 12 }}>
          <div
            style={{
              width: 12, height: 12, borderRadius: '50%',
              border: `2px solid ${T.border}`, borderTopColor: T.accent,
              animation: 'spin 0.8s linear infinite',
            }}
          />
          waiting for model…
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
