import { useEffect, useRef } from 'react';

import Banner from './Banner.jsx';
import MessageBubble from './MessageBubble.jsx';
import PromptInput from './PromptInput.jsx';

function EmptyState() {
  return (
    <div className="empty">
      <pre className="empty-art">{'> prompt-editor'}</pre>
      <p>Вставьте исходный промпт и нажмите «отправить».</p>
      <p>Сервис вернёт исправленную версию потоком токенов.</p>
      <p className="dim">Дальше: перегенерировать целиком, уточнить правкой или финализировать в MD-файл.</p>
    </div>
  );
}

export default function ChatView({ chat, onToggleSidebar }) {
  const { messages, busy, activeId, mode, error, notice, canRegenerate, canFinalize } = chat;
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const lastAssistantId = [...messages].reverse().find((m) => m.role === 'assistant')?.id;

  return (
    <main className="chat">
      <header className="chat-head">
        <button className="chip only-mobile" onClick={onToggleSidebar} title="Список сессий">
          ☰
        </button>
        <span className="chat-title">
          {activeId == null ? 'новая сессия' : `сессия #${activeId}`}
        </span>
        <button className="chip" onClick={chat.finalize} disabled={!canFinalize}>
          финализировать
        </button>
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

      <div className="messages">
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              isLastAssistant={m.id === lastAssistantId}
              canRegenerate={canRegenerate}
              editable={!busy && m.role === 'user' && !m.streaming}
              onEdit={chat.editMessage}
              onRegenerate={chat.regenerate}
            />
          ))
        )}
        <div ref={endRef} />
      </div>

      <PromptInput mode={mode} busy={busy} onSend={chat.send} onStop={chat.stop} />
    </main>
  );
}
