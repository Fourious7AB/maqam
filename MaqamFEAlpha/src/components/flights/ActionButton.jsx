export default function ActionButton({
  icon: Icon,
  danger = false,
  onClick,
  title,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`
        rounded-lg p-2 transition
        ${
          danger
            ? "text-red-500 hover:bg-red-50"
            : "text-slate-500 hover:bg-slate-100"
        }
      `}
    >
      <Icon size={16} />
    </button>
  );
}