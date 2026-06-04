export function MedleyToggle({ active, disabled, onToggle }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      className={`mx-auto my-2 block rounded-full border px-4 py-1 text-xs font-semibold transition disabled:opacity-30 ${
        active
          ? 'border-[var(--crash-cifra)] bg-[var(--crash-cifra)] text-black'
          : 'border-white/15 text-[var(--crash-texto-sec)] hover:border-[var(--crash-cifra)] hover:text-white'
      }`}
    >
      🔗 {active ? 'MEDLEY ON' : 'medley'}
    </button>
  )
}
