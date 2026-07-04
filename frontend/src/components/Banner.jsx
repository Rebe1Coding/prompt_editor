import Icon from './Icon.jsx';

export default function Banner({ kind, children, onClose }) {
  return (
    <div className={`banner banner--${kind}`}>
      <Icon name={kind === 'error' ? 'alert' : 'sparkles'} size={16} className="banner__icon" />
      <span className="banner__text">{children}</span>
      <button className="btn btn--ghost btn--icon btn--sm" onClick={onClose} title="Закрыть">
        <Icon name="x" size={15} />
      </button>
    </div>
  );
}
