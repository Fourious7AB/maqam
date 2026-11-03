export default function StatusBadge({ status }) {
  const active = status === "Active";

  return (
    <span
      className={`
        inline-flex rounded-full px-2.5 py-1
        text-xs font-medium
        ${
          active
            ? "bg-green-50 text-green-700"
            : "bg-red-50 text-red-600"
        }
      `}
    >
      {status}
    </span>
  );
}