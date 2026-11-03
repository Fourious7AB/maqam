export default function StatusBadge({ status }) {
  const styles = {
    Active:
      "bg-green-50 text-green-700 border-green-200",

    Inactive:
      "bg-red-50 text-red-700 border-red-200",

    Pending:
      "bg-yellow-50 text-yellow-700 border-yellow-200",
  };

  return (
    <span
      className={`
        inline-flex items-center
        rounded-full border
        px-2.5 py-1
        text-xs font-medium
        ${styles[status] || styles.Pending}
      `}
    >
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />

      {status}
    </span>
  );
}