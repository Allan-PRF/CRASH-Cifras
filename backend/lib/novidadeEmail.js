import { env } from '../config.js'

export async function enviarEmailNovidade({ to, titulo, descricao, siteUrl }) {
  const subject = `Novidade no CRASH Cifras: ${titulo}`
  const html = `
    <p>Olá!</p>
    <p><strong>${titulo}</strong></p>
    <p>${descricao}</p>
    <p><a href="${siteUrl}">Abrir o CRASH Cifras</a></p>
    <p>Equipe CRASH Cifras</p>
  `

  if (!env.resendApiKey) {
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
    return { status: 'erro', subject, to, payload }
  }

  return { status: 'enviado', subject, to, payload }
}

export async function enviarNovidadeParaUsuariosAtivos(supabase, novidade) {
  const now = new Date()
  const { data: settings, error } = await supabase
    .from('user_settings')
    .select('user_id, assinatura_status, data_fim_trial, assinatura_expira_em')

  if (error) throw error

  const activeIds = (settings || [])
    .filter((row) => {
      if (row.assinatura_status === 'ativa') {
        if (!row.assinatura_expira_em) return true
        return new Date(row.assinatura_expira_em) > now
      }
      if (row.assinatura_status === 'trial' && row.data_fim_trial) {
        return new Date(row.data_fim_trial) > now
      }
      return false
    })
    .map((row) => row.user_id)

  const siteUrl = env.publicSiteUrl.replace(/\/$/, '')
  const results = { enviados: 0, erros: 0, total: 0 }

  for (const userId of activeIds) {
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId)
    if (userError || !userData?.user?.email) continue

    results.total += 1
    const outcome = await enviarEmailNovidade({
      to: userData.user.email,
      titulo: novidade.titulo,
      descricao: novidade.descricao,
      siteUrl,
    })

    if (outcome.status === 'enviado') results.enviados += 1
    else results.erros += 1
  }

  console.info(
    `[NOVIDADE] E-mails: ${results.enviados} enviados, ${results.erros} falhas, ${results.total} usuários ativos`,
  )

  return results
}
