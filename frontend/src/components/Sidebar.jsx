function preview(text) {
  const firstLine = text.trim().split('\n')[0];
  return firstLine.length > 48 ? `${firstLine.slice(0, 48)}…` : firstLine;
}

export default function Sidebar({ sessions, activeId, busy, open, onSelect, onNew }) {
  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="sidebar-head">
        <span className="brand">prompt-editor</span>
        <button className="chip" onClick={onNew} disabled={busy}>
          + новый
        </button>
      </div>
      <nav className="session-list">
        {sessions.length === 0 && <p className="session-empty">пока нет сессий</p>}
        {sessions.map((s) => (
          <button
            key={s.id}
            className={`session ${s.id === activeId ? 'active' : ''}`}
            onClick={() => onSelect(s.id)}
            disabled={busy}
          >
            <span className="session-id">#{s.id}</span>
            <span className="session-preview">{preview(s.source_prompt)}</span>
            {s.final_file && (
              <span className="session-final" title="финализирована">
                ✓
              </span>
            )}
          </button>
        ))}
      </nav>
    </aside>
  );
}
