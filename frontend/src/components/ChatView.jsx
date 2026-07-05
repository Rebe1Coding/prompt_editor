import { useEffect, useRef } from 'react';

import Banner from './Banner.jsx';
import Icon from './Icon.jsx';
import MessageBubble from './MessageBubble.jsx';
import PromptInput from './PromptInput.jsx';

function EmptyState() {
  return (
    <div className="empty">
      <span className="empty__badge">
        <Icon name="sparkles" size={26} />
      </span>
      <h2 className="empty__title">Улучшите свой промпт</h2>
      <p>Вставьте исходный промпт в редактор ниже — сервис вернёт исправленную версию потоком.</p>
      <p className="hint">Затем можно перегенерировать, уточнить правкой или сохранить в MD-файл.</p>
    </div>
  );
}

// Для каждого результата базой сравнения служит предыдущий результат,
// а для самого первого — исходный промпт сессии.
function diffBases(messages) {
  const bases = {};
  const source = messages.find((m) => m.kind === 'source');
  let previous = source ? source.content : null;
  for (const m of messages) {
    if (m.role !== 'assistant') continue;
    bases[m.id] = previous;
    if (m.content) previous = m.content;
  }
  return bases;
}

export default function ChatView({ chat, onToggleSidebar }) {
  const { messages, busy, activeId, mode, error, notice, canRegenerate, canFinalize } = chat;
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const lastAssistantId = [...messages].reverse().find((m) => m.role === 'assistant')?.id;
  const bases = diffBases(messages);

  return (
    <main className="workspace">
      <header className="topbar">
        <button
          className="btn btn--ghost btn--icon only-mobile"
          onClick={onToggleSidebar}
          title="Список сессий"
        >
          <Icon name="menu" size={18} />
        </button>
        <div className="topbar__title">
          <span className="topbar__name">
            {activeId == null ? 'Новая сессия' : `Сессия #${activeId}`}
          </span>
          <span className={`badge ${mode === 'create' ? '' : 'badge--accent'}`}>
            {mode === 'create' ? 'черновик' : 'редактирование'}
          </span>
        </div>
        <div className="topbar__actions">
          <button className="btn" onClick={chat.finalize} disabled={!canFinalize}>
            <Icon name="download" size={16} />
            Финализировать
          </button>
        </div>
      </header>

      {error && (
        <Banner kind="error" onClose={chat.dismissError}>
          {error}
        </Banner>
      )}
      {notice && (
        <Banner kind="notice" onClose={chat.dismissNotice}>
          {notice}
        </Banner>
      )}

      <div className="stream">
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="stream__inner">
            {messages.map((m) => (
              <MessageBubble
                key={m.id}
                message={m}
                baseText={bases[m.id]}
                isLastAssistant={m.id === lastAssistantId}
                canRegenerate={canRegenerate}
                editable={!busy && m.role === 'user' && !m.streaming}
                onEdit={chat.editMessage}
                onRegenerate={chat.regenerate}
              />
            ))}
            <div ref={endRef} />
          </div>
        )}
      </div>

      <PromptInput
        mode={mode}
        busy={busy}
        searchEnabled={chat.searchEnabled}
        onToggleSearch={chat.toggleSearch}
        onSend={chat.send}
        onStop={chat.stop}
      />
    </main>
  );
}
