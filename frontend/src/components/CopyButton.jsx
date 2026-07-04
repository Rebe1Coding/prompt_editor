import { useState } from 'react';

import Icon from './Icon.jsx';

export default function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button className="btn btn--sm" onClick={copy} title="Копировать в формате Markdown">
      <Icon name={copied ? 'check' : 'copy'} size={15} />
      {copied ? 'Скопировано' : 'Копировать'}
    </button>
  );
}
