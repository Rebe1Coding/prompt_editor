import { useState } from 'react';

export default function PromptInput({ mode, busy, onSend, onStop }) {
  const [text, setText] = useState('');

  const submit = () => {
    if (busy) return;
    const value = text.trim();
    if (!value) return;
    onSend(value);
    setText('');
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const placeholder =
    mode === 'create'
      ? 'Вставьте промпт для редактирования…'
      : 'Уточнение к последней версии (Shift+Enter — перенос строки)…';

  return (
    <div className="composer">
      <span className="composer-prompt">$</span>
      <textarea
        className="composer-area"
        value={text}
        placeholder={placeholder}
        disabled={busy}
        rows={Math.min(8, text.split('\n').length)}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
      />
      {busy ? (
        <button className="chip danger" onClick={onStop} title="Остановить генерацию">
          стоп ■
        </button>
      ) : (
        <button className="chip primary" onClick={submit} disabled={!text.trim()}>
          отправить ⏎
        </button>
      )}
    </div>
  );
}
