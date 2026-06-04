export function FormField({ label, children, hint }) {
  return (
    <label className="block">
      <span className="text-sm text-[var(--crash-texto-sec)]">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && (
        <p className="mt-1 text-xs text-[var(--crash-texto-sec)]">{hint}</p>
      )}
    </label>
  )
}
