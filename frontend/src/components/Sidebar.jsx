import Icon from './Icon.jsx';

function preview(text) {
  const firstLine = text.trim().split('\n')[0];
  return firstLine.length > 44 ? `${firstLine.slice(0, 44)}…` : firstLine;
}

export default function Sidebar({ sessions, activeId, busy, open, onSelect, onNew }) {
  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="sidebar__head">
        <span className="brand">
          <Icon name="sparkles" size={20} />
          Prompt Editor
        </span>
      </div>

      <div className="sidebar__actions">
        <button className="btn btn--primary btn--block" onClick={onNew} disabled={busy}>
          <Icon name="plus" size={16} />
          Новая сессия
        </button>
      </div>

      <nav className="sessions">
        <span className="sessions__label">Сессии</span>
        {sessions.length === 0 && <p className="sessions__empty">Пока нет сессий</p>}
        {sessions.map((s) => (
          <button
            key={s.id}
            className={`session ${s.id === activeId ? 'active' : ''}`}
            onClick={() => onSelect(s.id)}
            disabled={busy}
          >
            <span className="session__badge">{s.id}</span>
            <span className="session__preview">{preview(s.source_prompt)}</span>
            {s.final_file && <Icon name="check" size={15} className="session__final" />}
          </button>
        ))}
      </nav>
    </aside>
  );
}
