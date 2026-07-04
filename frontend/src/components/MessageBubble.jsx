import { useState } from 'react';

import CopyButton from './CopyButton.jsx';
import Markdown from './Markdown.jsx';

export default function MessageBubble({
  message,
  isLastAssistant,
  canRegenerate,
  editable,
  onEdit,
  onRegenerate,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);

  const isUser = message.role === 'user';

  const startEdit = () => {
    setDraft(message.content);
    setEditing(true);
  };

  const submitEdit = () => {
    const text = draft.trim();
    if (!text) return;
    setEditing(false);
    onEdit(message, text);
  };

  const showCopy = !isUser && message.content && !message.streaming;
  const showRegenerate = !isUser && isLastAssistant && canRegenerate;

  return (
    <div className={`msg ${isUser ? 'msg-user' : 'msg-assistant'}`}>
      <div className="msg-gutter">{isUser ? '>' : '#'}</div>
      <div className="msg-body">
        {editing ? (
          <div className="edit">
            <textarea
              className="edit-area"
              value={draft}
              autoFocus
              rows={Math.min(14, draft.split('\n').length + 1)}
              onChange={(e) => setDraft(e.target.value)}
            />
            <div className="row">
              <button className="chip primary" onClick={submitEdit}>
                отправить
              </button>
              <button className="chip" onClick={() => setEditing(false)}>
                отмена
              </button>
              {message.kind === 'source' && (
                <span className="hint">правка создаст новую сессию</span>
              )}
            </div>
          </div>
        ) : (
          <>
            {message.content && <Markdown>{message.content}</Markdown>}
            {message.streaming && <span className="cursor" aria-label="генерация" />}
            {message.error && <div className="msg-error">⚠ {message.error}</div>}
            <div className="row msg-actions">
              {showCopy && <CopyButton text={message.content} />}
              {showRegenerate && (
                <button className="chip" onClick={onRegenerate}>
                  перегенерировать
                </button>
              )}
              {isUser && editable && (
                <button className="chip" onClick={startEdit}>
                  редактировать
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
