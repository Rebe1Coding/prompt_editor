import { useState } from 'react';

import CopyButton from './CopyButton.jsx';
import DiffView from './DiffView.jsx';
import Icon from './Icon.jsx';
import Markdown from './Markdown.jsx';

const roleMeta = {
  source: { icon: 'file', label: 'Исходный промпт' },
  instruction: { icon: 'message', label: 'Уточнение' },
  result: { icon: 'sparkles', label: 'Результат' },
};

export default function MessageBubble({
  message,
  baseText,
  isLastAssistant,
  canRegenerate,
  editable,
  onEdit,
  onRegenerate,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const [showDiff, setShowDiff] = useState(false);

  const isUser = message.role === 'user';
  const meta = roleMeta[message.kind] || roleMeta.result;

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
  const canDiff = !isUser && !message.streaming && message.content && baseText;

  return (
    <article className={`turn ${isUser ? 'turn--user' : 'turn--assistant'}`}>
      <div className="turn__meta">
        <span className="turn__avatar">
          <Icon name={meta.icon} size={15} />
        </span>
        {meta.label}
      </div>

      <div className="turn__card">
        {editing ? (
          <div className="edit">
            <textarea
              className="edit__area"
              value={draft}
              autoFocus
              onChange={(e) => setDraft(e.target.value)}
            />
            <div className="edit__row">
              <button className="btn btn--primary btn--sm" onClick={submitEdit}>
                <Icon name="send" size={15} />
                Отправить
              </button>
              <button className="btn btn--sm" onClick={() => setEditing(false)}>
                Отмена
              </button>
              {message.kind === 'source' && (
                <span className="hint">Правка создаст новую сессию</span>
              )}
            </div>
          </div>
        ) : (
          <>
            {isUser ? (
              <pre className="turn__source">{message.content}</pre>
            ) : showDiff ? (
              <DiffView base={baseText} next={message.content} />
            ) : (
              message.content && <Markdown>{message.content}</Markdown>
            )}

            {message.streaming && <span className="cursor" aria-label="генерация" />}

            {message.error && (
              <div className="turn__error">
                <Icon name="alert" size={15} />
                {message.error}
              </div>
            )}

            {(showCopy || showRegenerate || canDiff || (isUser && editable)) && (
              <div className="turn__actions">
                {showCopy && <CopyButton text={message.content} />}
                {canDiff && (
                  <button
                    className={`btn btn--sm ${showDiff ? 'btn--primary' : ''}`}
                    onClick={() => setShowDiff((v) => !v)}
                    title="Показать отличия от предыдущей версии"
                  >
                    <Icon name="diff" size={15} />
                    {showDiff ? 'Скрыть отличия' : 'Отличия'}
                  </button>
                )}
                {showRegenerate && (
                  <button className="btn btn--sm" onClick={onRegenerate}>
                    <Icon name="refresh" size={15} />
                    Перегенерировать
                  </button>
                )}
                {isUser && editable && (
                  <button className="btn btn--sm" onClick={startEdit}>
                    <Icon name="pencil" size={15} />
                    Редактировать
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </article>
  );
}
