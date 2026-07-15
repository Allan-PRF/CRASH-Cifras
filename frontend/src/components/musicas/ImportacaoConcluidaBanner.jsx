import { Link } from 'react-router-dom'
import {
  clearImportDoneInvite,
  isCifraImportPronta,
} from '../../lib/importJobStorage'
import { btnPrimaryClassName, btnSecondaryClassName } from '../ui/inputClasses'

/**
 * CTA persistente após importação concluída em segundo plano
 * (espelha o bloco fase==='concluido' do ImportarYoutubeModal).
 */
export function ImportacaoConcluidaBanner({
  ministroId,
  invite,
  tituloEnriquecido = null,
  onDismiss,
}) {
  if (!invite?.musicaId) return null

  const titulo =
    (tituloEnriquecido && tituloEnriquecido !== 'Música'
      ? tituloEnriquecido
      : null) ||
    invite.titulo ||
    'Música'
  const cifraPronta = isCifraImportPronta(invite.etapa)
  const editarTo = `/musica/${invite.musicaId}/editar`
  const tocarTo = `/teleprompter/musica/${invite.musicaId}`

  function limparConvite() {
    clearImportDoneInvite(ministroId)
    onDismiss?.()
  }

  return (
    <div
      className="space-y-3 rounded-xl border border-[var(--crash-cifra)]/50 bg-[var(--crash-cifra)]/10 p-4"
      role="status"
      aria-live="polite"
    >
      <p className="text-sm font-semibold text-[var(--crash-cifra)]">
        {cifraPronta
          ? `✅ “${titulo}” está pronta!`
          : `Vídeo salvo — “${titulo}”. Cadastre a cifra.`}
      </p>
      <p className="text-xs text-[var(--crash-texto-sec)]">
        {cifraPronta
          ? 'Toque ou revise na edição.'
          : 'A geração ainda não deixou cifra completa — abra o editor para cadastrar.'}
      </p>
      <div className="flex flex-wrap gap-2">
        {cifraPronta ? (
          <>
            <Link
              to={tocarTo}
              className={btnPrimaryClassName}
              onClick={limparConvite}
            >
              Tocar
            </Link>
            <Link
              to={editarTo}
              className={btnSecondaryClassName}
              onClick={limparConvite}
            >
              Revisar cifra
            </Link>
          </>
        ) : (
          <Link
            to={editarTo}
            className={btnPrimaryClassName}
            onClick={limparConvite}
          >
            Cadastrar cifra
          </Link>
        )}
        <button type="button" onClick={limparConvite} className={btnSecondaryClassName}>
          Dispensar
        </button>
      </div>
    </div>
  )
}
