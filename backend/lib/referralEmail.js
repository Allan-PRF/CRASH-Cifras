import { env } from '../config.js'

export async function enviarEmailIndicacaoConfirmada({
  to,
  mesesGanhos,
  proximaCobrancaEm,
}) {
  const dataFormatada = proximaCobrancaEm
    ? new Date(proximaCobrancaEm).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : 'a definir após sua próxima renovação'

  const subject = 'Sua indicação foi confirmada — CRASH Cifras'
  const html = `
    <p>Olá!</p>
    <p><strong>Sua indicação foi confirmada!</strong></p>
    <p>Você ganhou <strong>${mesesGanhos} mês${mesesGanhos !== 1 ? 'es' : ''} grátis</strong> na sua assinatura.</p>
    <p>Próxima cobrança: <strong>${dataFormatada}</strong></p>
    <p>Enquanto houver meses bônus, a renovação será aplicada automaticamente sem cobrança.</p>
    <p>Equipe CRASH Cifras</p>
  `

  if (!env.resendApiKey) {
    return { status: 'pendente', subject, payload: { reason: 'RESEND_API_KEY ausente' } }
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
    return { status: 'erro', subject, payload }
  }

  return { status: 'enviado', subject, payload }
}
