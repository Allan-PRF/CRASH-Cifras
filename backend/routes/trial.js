import { Router } from 'express'
import { env } from '../config.js'
import { getSupabaseAdmin } from '../lib/supabase.js'

export const trialRouter = Router()

async function enviarEmailTrial({ to, diasRestantes }) {
  const subject = `Seu teste grátis termina em ${diasRestantes} dias`
  const html = `
    <p>Olá!</p>
    <p>Seu teste grátis do <strong>CRASH Cifras</strong> termina em ${diasRestantes} dias.</p>
    <p>Escolha um plano para continuar usando o teleprompter, playlists e recursos do evento sem interrupção.</p>
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

trialRouter.post('/enviar-lembretes', async (req, res, next) => {
  try {
    if (env.cronSecret && req.headers.authorization !== `Bearer ${env.cronSecret}`) {
      return res.status(401).json({ error: 'Cron não autorizado' })
    }

    const supabase = getSupabaseAdmin()
    const hoje = new Date()
    const fimMin = new Date(hoje)
    fimMin.setDate(fimMin.getDate() + 1)
    const fimMax = new Date(hoje)
    fimMax.setDate(fimMax.getDate() + 2)

    const { data: usuarios, error } = await supabase
      .from('user_settings')
      .select('user_id, data_fim_trial, trial_email_2_dias_enviado_em')
      .eq('assinatura_status', 'trial')
      .is('trial_email_2_dias_enviado_em', null)
      .gt('data_fim_trial', fimMin.toISOString())
      .lte('data_fim_trial', fimMax.toISOString())

    if (error) throw error

    const resultados = []
    for (const item of usuarios ?? []) {
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
        item.user_id,
      )
      if (userError || !userData?.user?.email) {
        resultados.push({ userId: item.user_id, status: 'sem_email' })
        continue
      }

      const envio = await enviarEmailTrial({
        to: userData.user.email,
        diasRestantes: 2,
      })

      await supabase.from('trial_emails').upsert(
        {
          user_id: item.user_id,
          tipo: 'trial_2_dias',
          destinatario: userData.user.email,
          assunto: envio.subject,
          status: envio.status,
          payload: envio.payload,
          enviado_em: envio.status === 'enviado' ? new Date().toISOString() : null,
        },
        { onConflict: 'user_id,tipo' },
      )

      await supabase
        .from('user_settings')
        .update({ trial_email_2_dias_enviado_em: new Date().toISOString() })
        .eq('user_id', item.user_id)

      resultados.push({ userId: item.user_id, email: userData.user.email, status: envio.status })
    }

    res.json({ ok: true, processados: resultados.length, resultados })
  } catch (err) {
    next(err)
  }
})
