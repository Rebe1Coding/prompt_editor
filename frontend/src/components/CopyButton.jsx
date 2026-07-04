import { useState } from 'react';

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
    <button className="chip" onClick={copy} title="Копировать в формате Markdown">
      {copied ? '✓ скопировано' : 'копировать'}
    </button>
  );
}
