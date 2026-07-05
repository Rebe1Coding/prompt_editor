import { useState } from 'react';

import Icon from './Icon.jsx';

export default function PromptInput({ mode, busy, searchEnabled, onToggleSearch, onSend, onStop }) {
  const [text, setText] = useState('');
  const [focus, setFocus] = useState(false);

  const submit = () => {
    if (busy) return;
    const value = text.trim();
    if (!value) return;
    onSend(value);
    setText('');
    setFocus(false);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
    if (e.key === 'Escape' && focus) setFocus(false);
  };

  const isCreate = mode === 'create';
  const label = isCreate ? 'Исходный промпт' : 'Уточнение';
  const placeholder = isCreate
    ? 'Вставьте промпт, который нужно улучшить…'
    : 'Опишите, что поправить в последней версии…';

  return (
    <div className={`composer ${focus ? 'composer--focus' : ''}`}>
      <div className="composer__inner">
        <div className="composer__bar">
          <span className="composer__label">
            <Icon name={isCreate ? 'file' : 'message'} size={14} />
            {label}
          </span>
          <button
            className="btn btn--ghost btn--icon btn--sm"
            onClick={() => setFocus((v) => !v)}
            title={focus ? 'Свернуть редактор' : 'Развернуть на весь экран'}
          >
            <Icon name={focus ? 'minimize' : 'maximize'} size={16} />
          </button>
        </div>

        <textarea
          className="composer__area"
          value={text}
          placeholder={placeholder}
          disabled={busy}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
        />

        <div className="composer__footer">
          <button
            className={`btn btn--sm btn--toggle ${searchEnabled ? 'is-active' : ''}`}
            onClick={onToggleSearch}
            aria-pressed={searchEnabled}
            title="Искать статьи по задаче и прикреплять их блоком «Может пригодиться»"
          >
            <Icon name="search" size={14} />
            Расширенный поиск
          </button>
          <span className="hint-tip" tabIndex={0}>
            <Icon name="help" size={14} />
            <span className="hint-tip__bubble" role="tooltip">
              Расширенный поиск подбирает статьи по проблеме, описанной в промпте, и
              прикрепляет их блоком «Может пригодиться».
            </span>
          </span>
          <span className="hint">Enter — отправить · Shift+Enter — новая строка</span>
          {busy ? (
            <button className="btn btn--danger" onClick={onStop} title="Остановить генерацию">
              <Icon name="square" size={15} />
              Стоп
            </button>
          ) : (
            <button className="btn btn--primary" onClick={submit} disabled={!text.trim()}>
              <Icon name="send" size={16} />
              Отправить
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
