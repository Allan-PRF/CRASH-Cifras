import { VERSOES_BIBLICAS } from '@crash-cifras/shared/constants'
import {
  MOMENTOS_VERSICULO,
  parseMomentosAtivos,
  parseModoVersiculo,
  quantidadeFromMomentosAtivos,
  prepararVersiculoPrefsParaSalvar,
} from '@crash-cifras/shared/versiculos-config'
import { FormField } from '../ui/FormField'
import { inputOrangeClassName, selectClassName } from '../ui/inputClasses'

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

export function versiculoPrefsFromMusica(raw, versaoUsuario = 'NVI') {
  const salvo = prepararVersiculoPrefsParaSalvar(raw)
  if (salvo) {
    return {
      manual_referencia: '',
      manual_texto: '',
      manual_palavra: '',
      ...salvo,
    }
  }

  if (raw && typeof raw === 'object') {
    const momentos_ativos = parseMomentosAtivos(raw.momentos_ativos)
    const modo = parseModoVersiculo(raw.modo)
    return {
      modo,
      versao_biblica:
        typeof raw.versao_biblica === 'string' && raw.versao_biblica.trim()
          ? raw.versao_biblica.trim()
          : versaoUsuario || 'NVI',
      quantidade_versiculos: quantidadeFromMomentosAtivos(momentos_ativos),
      momentos_ativos,
      manual_referencia: String(raw.manual_referencia || '').trim(),
      manual_texto: String(raw.manual_texto || '').trim(),
      manual_palavra: String(raw.manual_palavra || '').trim(),
    }
  }

  const momentos_ativos = { verso: false, refrao: false, ponte: false }
  return {
    modo: 'ia',
    versao_biblica: versaoUsuario || 'NVI',
    quantidade_versiculos: quantidadeFromMomentosAtivos(momentos_ativos),
    momentos_ativos,
    manual_referencia: '',
    manual_texto: '',
    manual_palavra: '',
  }
}

function ModoToggle({ modo, onChange }) {
  const btnClass = (ativo) =>
    `rounded-lg border px-4 py-2 text-sm font-semibold transition ${
      ativo
        ? 'border-[var(--crash-cifra)] bg-[var(--crash-cifra)]/20 text-[var(--crash-cifra)]'
        : 'border-white/15 text-[var(--crash-texto-sec)] hover:border-white/30 hover:text-white'
    }`

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-[var(--crash-texto-sec)]">Modo:</span>
      <button type="button" className={btnClass(modo === 'ia')} onClick={() => onChange('ia')}>
        IA
      </button>
      <button
        type="button"
        className={btnClass(modo === 'manual')}
        onClick={() => onChange('manual')}
      >
        Manual
      </button>
    </div>
  )
}

export function VersiculoMusicaPrefsEditor({ prefs, onChange, versaoPadraoUsuario = 'NVI' }) {
  const modo = parseModoVersiculo(prefs.modo)
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

  function setModo(nextModo) {
    onChange({ ...prefs, modo: nextModo })
  }

  const versoesEditor = VERSOES_BIBLICAS.filter((v) =>
    ['NVI', 'ACF', 'NVT'].includes(v.sigla),
  )

  return (
    <article className="rounded-xl border-2 border-orange-500 bg-black/40 p-4">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-base">📖</span>
        <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--crash-cifra)]">
          Versículo bíblico
        </h3>
      </div>
      <p className="mb-4 text-xs text-[var(--crash-texto-sec)]">
        Padrão desta música. Ao preparar um evento, combina com as opções do evento (união:
        se estiver ON na música ou no evento, exibe versículo naquela seção).
      </p>

      <div className="space-y-4">
        <ModoToggle modo={modo} onChange={setModo} />

        {modo === 'ia' ? (
          <p className="text-xs text-[var(--crash-texto-sec)]">
            A IA gera referência, texto e aplicação pelo tema da música (teleprompter e
            preparo de evento).
          </p>
        ) : (
          <div className="space-y-3 rounded-lg border border-white/10 bg-black/30 p-3">
            <p className="text-xs text-[var(--crash-texto-sec)]">
              Cole ou digite a mensagem. O teleprompter usa este texto em vez de gerar pela
              IA.
            </p>
            <FormField label="Referência">
              <input
                type="text"
                value={prefs.manual_referencia || ''}
                onChange={(e) =>
                  onChange({ ...prefs, manual_referencia: e.target.value })
                }
                placeholder="Ex.: João 3:16"
                className={inputOrangeClassName}
              />
            </FormField>
            <FormField label="Texto do versículo">
              <textarea
                value={prefs.manual_texto || ''}
                onChange={(e) => onChange({ ...prefs, manual_texto: e.target.value })}
                placeholder="Texto bíblico ou mensagem para ministrar…"
                rows={4}
                className={`${inputOrangeClassName} min-h-[6rem] resize-y`}
              />
            </FormField>
            <FormField label="Palavra / aplicação (opcional)">
              <textarea
                value={prefs.manual_palavra || ''}
                onChange={(e) => onChange({ ...prefs, manual_palavra: e.target.value })}
                placeholder="Como aplicar na música ou no culto…"
                rows={2}
                className={`${inputOrangeClassName} resize-y`}
              />
            </FormField>
          </div>
        )}

        <FormField label="Versão bíblica">
          <select
            value={prefs.versao_biblica || versaoPadraoUsuario}
            onChange={(e) => onChange({ ...prefs, versao_biblica: e.target.value })}
            className={selectClassName}
          >
            {versoesEditor.map((v) => (
              <option key={v.sigla} value={v.sigla}>
                {v.sigla} — {v.nome}
              </option>
            ))}
          </select>
        </FormField>

        <div>
          <p className="mb-2 text-xs font-medium text-[var(--crash-texto-sec)]">
            Onde ministrar a palavra (teleprompter)
          </p>
          <div className="space-y-2">
            {MOMENTOS_VERSICULO.map((m) => (
              <label
                key={m.id}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/15 px-3 py-2.5"
              >
                <input
                  type="checkbox"
                  checked={momentos[m.id] === true}
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
              ? 'Nenhum versículo nesta música.'
              : `${quantidade} versículo${quantidade !== 1 ? 's' : ''} nas seções marcadas.`}
            {modo === 'manual' && quantidade > 0
              ? ' (mesmo texto nas seções marcadas)'
              : ''}
          </p>
        </div>
      </div>
    </article>
  )
}
