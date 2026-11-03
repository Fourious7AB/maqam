export default function Input({ label, ...props }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-600">
        {label}
      </span>

      <input
        {...props}
        className="
          w-full rounded-lg
          border border-slate-200
          bg-white
          px-3 py-2.5
          text-sm
          outline-none
          transition
          disabled:cursor-not-allowed
          disabled:bg-slate-100
          disabled:text-slate-400
          focus:border-blue-500
          focus:ring-2
          focus:ring-blue-100
        "
      />
    </label>
  );
}