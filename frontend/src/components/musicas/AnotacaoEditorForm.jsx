export const ANOTACAO_PLACEHOLDER =
  'Ex.: usar pad suave no verso, subir oitava no refrão...'

const TEXTAREA_CLASS = {
  modal:
    'w-full rounded-lg border border-[var(--crash-borda)] bg-black px-3 py-2 text-sm text-white outline-none focus:border-[var(--crash-cifra)] disabled:opacity-60',
  folha:
    'w-full resize-y rounded-lg border border-[var(--crash-cifra)]/50 bg-black px-3 py-2 text-sm leading-relaxed text-white outline-none placeholder:text-[var(--crash-texto-sec)] focus:border-[var(--crash-cifra)] disabled:opacity-60',
}

export function AnotacaoEditorForm({
  value,
  onChange,
  onBlur,
  saving = false,
  rows = 8,
  variant = 'modal',
  className = '',
  id,
  'aria-describedby': ariaDescribedby,
}) {
  const baseClass = TEXTAREA_CLASS[variant] ?? TEXTAREA_CLASS.modal

  return (
    <textarea
      id={id}
      aria-describedby={ariaDescribedby}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
      disabled={saving}
      rows={rows}
      placeholder={ANOTACAO_PLACEHOLDER}
      className={`${baseClass}${className ? ` ${className}` : ''}`}
    />
  )
}
