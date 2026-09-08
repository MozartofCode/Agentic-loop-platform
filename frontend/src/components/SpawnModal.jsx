import { useState } from 'react';
import { T, MONO } from '../theme.js';

const PRESETS = [
  { label: 'Fix recursion bug', task: 'Read broken.py, fix the fibonacci function, test it, write fixed.py' },
  { label: 'Extend REST API', task: 'Add POST /todos, DELETE /todos/{id}, GET /todos/{id} to api.py' },
  { label: 'Write utility lib', task: 'Create utils.py with chunked, flatten, memoize, retry decorators + docstrings' },
  { label: 'Benchmark sort', task: 'Compare bubble, merge, quicksort on lists of 100/1000/10000 items, write benchmark.py' },
];

export default function SpawnModal({ onClose, onSpawn }) {
  const [task, setTask] = useState('');
  const [repoUrl, setRepoUrl] = useState('');

  const spawn = (taskText) => {
    if (!taskText.trim()) return;
    onSpawn(taskText.trim(), repoUrl.trim());
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 480, background: T.panel, border: `1px solid ${T.border}`,
          borderRadius: 8, padding: 20,
        }}
      >
        <div style={{ color: T.text, fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Spawn agent</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => spawn(p.task)}
              style={{
                padding: '10px 10px', background: T.card, border: `1px solid ${T.border}`,
                borderRadius: 6, color: T.text, fontSize: 12, textAlign: 'left', cursor: 'pointer',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div style={{ color: T.muted, fontSize: 10, textTransform: 'uppercase', marginBottom: 6 }}>
          Custom task
        </div>
        <textarea
          value={task}
          onChange={(e) => setTask(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') spawn(task);
          }}
          placeholder="Describe what the agent should do…"
          rows={4}
          style={{
            width: '100%', resize: 'vertical', background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 6, color: T.text, fontSize: 13, padding: 10, fontFamily: 'inherit',
            boxSizing: 'border-box', marginBottom: 12,
          }}
        />

        <div style={{ color: T.muted, fontSize: 10, textTransform: 'uppercase', marginBottom: 6 }}>
          GitHub repo (optional) — connect a repo as the agent's workspace
        </div>
        <input
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          placeholder="https://github.com/owner/repo"
          style={{
            width: '100%', background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 6, color: T.text, fontSize: 13, padding: 10, fontFamily: MONO,
            boxSizing: 'border-box', marginBottom: 16,
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              padding: '9px 16px', background: 'transparent', border: `1px solid ${T.border}`,
              borderRadius: 6, color: T.muted, fontSize: 13, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => spawn(task)}
            style={{
              padding: '9px 18px', background: T.accent, border: 'none',
              borderRadius: 6, color: T.bg, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Spawn
          </button>
        </div>
      </div>
    </div>
  );
}
