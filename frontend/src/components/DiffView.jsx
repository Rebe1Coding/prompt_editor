import { computeDiff } from '../lib/diff.js';

export default function DiffView({ base, next }) {
  const parts = computeDiff(base, next);
  return (
    <div>
      <div className="diff-legend">
        <span className="diff-legend__item">
          <span className="diff-legend__swatch diff-legend__swatch--del" /> было
        </span>
        <span className="diff-legend__item">
          <span className="diff-legend__swatch diff-legend__swatch--add" /> стало
        </span>
      </div>
      <div className="diff">
        {parts.map((part, index) =>
          part.type === 'equal' ? (
            <span key={index}>{part.value}</span>
          ) : (
            <span key={index} className={`diff__${part.type}`}>
              {part.value}
            </span>
          ),
        )}
      </div>
    </div>
  );
}
