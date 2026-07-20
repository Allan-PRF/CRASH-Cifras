import {
  MOMENTOS_VERSICULO,
  parseMomentosAtivos,
  quantidadeFromMomentosAtivos,
} from '@crash-cifras/shared/versiculos-config'
import { VERSOES_BIBLICAS } from '@crash-cifras/shared/constants'
import { FormField } from '../ui/FormField'
import { selectClassName } from '../ui/inputClasses'

const HINT_MOMENTO = {
  verso: 'exibir versículo no Verso',
  refrao: 'exibir versículo no Refrão',
  ponte: 'exibir versículo na Ponte',
}

const LABEL_MOMENTO = {
  verso: 'Verso',
  refrao: 'Refrão',
  ponte: 'Ponte',
}

export function prefsEventoPadrao(versaoBiblica = 'NVI') {
  const momentos_ativos = { verso: false, refrao: false, ponte: false }
  return {
    versao_biblica: versaoBiblica,
    quantidade_versiculos: quantidadeFromMomentosAtivos(momentos_ativos),
    momentos_ativos,
  }
}

export function VersiculosPreparoPanel({ prefs, onChange, disabled }) {
  const momentos = parseMomentosAtivos(prefs.momentos_ativos)
  const quantidade = quantidadeFromMomentosAtivos(momentos)

  function toggleMomento(id) {
    const next = { ...momentos, [id]: !momentos[id] }
    onChange({
      ...prefs,
      momentos_ativos: next,
      quantidade_versiculos: quantidadeFromMomentosAtivos(next),
    })
  }

  return (
    <div className="space-y-4 rounded-xl border border-[var(--crash-cifra)]/40 bg-black/40 p-4">
      <h3 className="text-sm font-semibold text-white">📖 Versículos bíblicos</h3>

      <FormField label="Versão bíblica (evento)">
        <select
          value={prefs.versao_biblica || 'NVI'}
          disabled={disabled}
          onChange={(e) => onChange({ ...prefs, versao_biblica: e.target.value })}
          className={selectClassName}
        >
          {VERSOES_BIBLICAS.filter((v) =>
            ['NVI', 'ACF', 'NVT'].includes(v.sigla),
          ).map((v) => (
            <option key={v.sigla} value={v.sigla}>
              {v.sigla} — {v.nome}
            </option>
          ))}
        </select>
      </FormField>

      <div>
        <p className="mb-2 text-xs font-medium text-[var(--crash-texto-sec)]">
          Onde ministrar a palavra durante a música
        </p>
        <div className="space-y-2">
          {MOMENTOS_VERSICULO.map((m) => (
            <label
              key={m.id}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/15 px-3 py-2.5 transition hover:border-[var(--crash-cifra)]/50"
            >
              <input
                type="checkbox"
                checked={momentos[m.id] === true}
                disabled={disabled}
                onChange={() => toggleMomento(m.id)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--crash-cifra)]"
              />
              <span className="text-sm text-white">
                <span className="font-semibold">{LABEL_MOMENTO[m.id]}</span>
                <span className="mt-0.5 block text-xs text-[var(--crash-texto-sec)]">
                  {HINT_MOMENTO[m.id]}
                </span>
              </span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-[var(--crash-texto-sec)]">
          {quantidade === 0
            ? 'Nenhum versículo será gerado.'
            : `${quantidade} versículo${quantidade !== 1 ? 's' : ''} — um em cada seção marcada.`}
        </p>
      </div>
    </div>
  )
}
