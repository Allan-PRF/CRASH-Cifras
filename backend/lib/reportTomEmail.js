import { env } from '../config.js'

/**
 * Notifica o admin sobre report de tom errado na fonte (Resend).
 */
export async function enviarEmailReportTom({
  tituloMusica,
  artista,
  tomAtual,
  tomSugerido,
  comentario,
  reportadoPor,
  reportId,
}) {
  const to = env.adminNotifyEmail
  const subject = `[CRASH Cifras] Reporte de tom: ${tituloMusica || 'Música'}`
  const siteUrl = env.publicSiteUrl.replace(/\/$/, '')
  const html = `
    <p>Novo reporte de tom errado na fonte do acervo.</p>
    <ul>
      <li><strong>Música:</strong> ${tituloMusica || '—'}${artista ? ` — ${artista}` : ''}</li>
      <li><strong>Tom atual na fonte:</strong> ${tomAtual || '—'}</li>
      <li><strong>Tom sugerido:</strong> ${tomSugerido || '—'}</li>
      <li><strong>Reportado por:</strong> ${reportadoPor || '—'}</li>
      <li><strong>ID do report:</strong> ${reportId}</li>
    </ul>
    ${comentario ? `<p><strong>Comentário:</strong><br>${String(comentario).replace(/\n/g, '<br>')}</p>` : ''}
    <p>Corrija via <code>POST /api/acervo/motor/corrigir-tom</code> (admin) e marque o report como resolvido.</p>
    <p><a href="${siteUrl}">Abrir CRASH Cifras</a></p>
  `

  if (!env.resendApiKey) {
    console.info('[report-tom] RESEND_API_KEY ausente — e-mail não enviado:', { to, subject })
    return { status: 'pendente', subject, to }
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.emailFrom,
      to,
      subject,
      html,
    }),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    console.error('[report-tom] Resend falhou:', payload)
    return { status: 'erro', subject, to, payload }
  }

  return { status: 'enviado', subject, to, payload }
}
