export default function Banner({ kind, children, onClose }) {
  return (
    <div className={`banner banner-${kind}`}>
      <span className="banner-text">{children}</span>
      <button className="banner-close" onClick={onClose} title="Закрыть">
        ✕
      </button>
    </div>
  );
}
