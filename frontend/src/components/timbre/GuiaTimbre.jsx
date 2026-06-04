import { equivalentePorNivel } from '../../lib/timbreLocal'
import { btnPrimaryClassName } from '../ui/inputClasses'

export function GuiaTimbre({ musica, guia, nivelTeclado, loading, onGenerate }) {
  if (!guia) {
    return (
      <section className="rounded-xl border border-dashed border-[var(--crash-borda)] p-8 text-center">
        <h2 className="text-xl font-bold text-white">🎛️ Guia de Timbre</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-[var(--crash-texto-sec)]">
          Gere sugestões por seção para timbre, efeitos, pedal e dinâmica. Nesta fase os
          dados são simulados e salvos no Supabase; Essentia/GPT entram depois.
        </p>
        <button
          type="button"
          disabled={loading}
          onClick={onGenerate}
          className={`mt-5 ${btnPrimaryClassName}`}
        >
          {loading ? 'Gerando…' : 'Gerar guia de timbre'}
        </button>
      </section>
    )
  }

  return (
    <section className="space-y-5">
      <header className="rounded-xl border border-[var(--crash-borda)] bg-black/50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--crash-cifra)]">
          🎛️ Guia de Timbre — {musica.titulo}
        </p>
        <p className="mt-1 text-sm text-[var(--crash-texto-sec)]">
          {guia.origem === 'simulado' ? 'Simulado nesta fase' : 'Analisado por IA'}
          {guia.tom ? ` · Tom: ${guia.tom}` : ''}
          {guia.bpm ? ` · BPM: ${guia.bpm}` : ''}
        </p>
        <button
          type="button"
          disabled={loading}
          onClick={onGenerate}
          className="mt-3 text-sm text-[var(--crash-cifra)] hover:underline"
        >
          {loading ? 'Gerando…' : 'Regenerar guia'}
        </button>
      </header>

      {guia.secoes?.map((timbre) => (
        <article
          key={`${timbre.secao_id}-${timbre.slug}`}
          className="rounded-xl border border-[var(--crash-borda)] bg-black/50 p-4"
        >
          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--crash-cifra)]">
            🎼 {timbre.nome}
          </h3>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <Info label="🎹 Timbre" value={`${timbre.familia_timbre} · ${timbre.timbre_nome}`} />
            <Info label="💡 Brilho" value={timbre.brilho} />
            <Info label="🎚️ Efeitos" value={timbre.efeitos?.join(' · ')} />
            <Info label="🦶 Pedal" value={timbre.pedal} />
            <Info label="🖐️ Toque" value={`${timbre.toque} · ${timbre.dinamica}`} />
            <Info label="🌊 Textura" value={timbre.textura} />
          </dl>
          <p className="mt-4 rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white">
            <span className="text-[var(--crash-cifra)]">Sugestão ({nivelTeclado}):</span>{' '}
            {equivalentePorNivel(timbre, nivelTeclado)}
          </p>
          <p className="mt-2 text-sm text-[var(--crash-texto-sec)]">⚠️ {timbre.dica}</p>
        </article>
      ))}
    </section>
  )
}

function Info({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-[var(--crash-texto-sec)]">
        {label}
      </dt>
      <dd className="mt-1 text-white">{value || '—'}</dd>
    </div>
  )
}
