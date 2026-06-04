import { Router } from 'express'
import { enviarNovidadeParaUsuariosAtivos } from '../lib/novidadeEmail.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { getSupabaseAdmin, requireAuth } from '../lib/supabase.js'

export const novidadesRouter = Router()

function admin(req) {
  return req.supabaseAdmin || getSupabaseAdmin()
}

function pickNovidade(row) {
  if (!row) return null
  return {
    id: row.id,
    titulo: row.titulo,
    descricao: row.descricao,
    video_url: row.video_url,
    ativo: row.ativo,
    criado_em: row.criado_em,
  }
}

/** Novidade ativa mais recente (banner na Home) */
novidadesRouter.get('/ativa', async (_req, res, next) => {
  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('novidades')
      .select('id, titulo, descricao, video_url, criado_em')
      .eq('ativo', true)
      .order('criado_em', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    res.json({ novidade: data ? pickNovidade(data) : null })
  } catch (err) {
    next(err)
  }
})

const adminRouter = Router()
adminRouter.use(requireAuth, requireAdmin)

adminRouter.get('/', async (req, res, next) => {
  try {
    const { data, error } = await admin(req)
      .from('novidades')
      .select('*')
      .order('criado_em', { ascending: false })

    if (error) throw error
    res.json({ novidades: data || [] })
  } catch (err) {
    next(err)
  }
})

adminRouter.post('/', async (req, res, next) => {
  try {
    const titulo = String(req.body?.titulo || '').trim()
    const descricao = String(req.body?.descricao || '').trim()
    const video_url = String(req.body?.video_url || '').trim() || null
    const ativo = Boolean(req.body?.ativo)

    if (!titulo || !descricao) {
      return res.status(400).json({ error: 'Título e descrição são obrigatórios.' })
    }

    const supabase = admin(req)

    if (ativo) {
      await supabase.from('novidades').update({ ativo: false }).eq('ativo', true)
    }

    const { data, error } = await supabase
      .from('novidades')
      .insert({ titulo, descricao, video_url, ativo })
      .select('*')
      .single()

    if (error) throw error

    let emailStats = null
    if (ativo) {
      emailStats = await enviarNovidadeParaUsuariosAtivos(supabase, data).catch((err) => {
        console.error('[NOVIDADE] Falha ao enviar e-mails:', err.message)
        return { enviados: 0, erros: 0, total: 0, falha: err.message }
      })
    }

    res.status(201).json({ novidade: data, emailStats })
  } catch (err) {
    next(err)
  }
})

adminRouter.patch('/:id', async (req, res, next) => {
  try {
    const id = req.params.id
    const supabase = admin(req)

    const { data: atual, error: fetchError } = await supabase
      .from('novidades')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (fetchError) throw fetchError
    if (!atual) return res.status(404).json({ error: 'Novidade não encontrada.' })

    const patch = {}
    if (req.body?.titulo !== undefined) {
      const titulo = String(req.body.titulo).trim()
      if (!titulo) return res.status(400).json({ error: 'Título inválido.' })
      patch.titulo = titulo
    }
    if (req.body?.descricao !== undefined) {
      const descricao = String(req.body.descricao).trim()
      if (!descricao) return res.status(400).json({ error: 'Descrição inválida.' })
      patch.descricao = descricao
    }
    if (req.body?.video_url !== undefined) {
      patch.video_url = String(req.body.video_url || '').trim() || null
    }
    if (req.body?.ativo !== undefined) {
      patch.ativo = Boolean(req.body.ativo)
    }

    const wasActive = atual.ativo
    const willActivate = patch.ativo === true && !wasActive

    if (patch.ativo === true) {
      await supabase.from('novidades').update({ ativo: false }).eq('ativo', true)
    }

    const { data, error } = await supabase
      .from('novidades')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw error

    let emailStats = null
    if (willActivate) {
      emailStats = await enviarNovidadeParaUsuariosAtivos(supabase, data).catch((err) => {
        console.error('[NOVIDADE] Falha ao enviar e-mails:', err.message)
        return { enviados: 0, erros: 0, total: 0, falha: err.message }
      })
    }

    res.json({ novidade: data, emailStats })
  } catch (err) {
    next(err)
  }
})

novidadesRouter.use('/admin', adminRouter)
