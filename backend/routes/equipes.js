import { Router } from 'express'
import {
  EQUIPE_MAX_MUSICOS,
  EQUIPE_MAX_MESA,
  EQUIPE_TIPOS_MEMBRO,
  INSTRUMENTOS,
} from '@crash-cifras/shared/constants'
import { getSupabaseAdmin, requireAuth } from '../lib/supabase.js'

export const equipesRouter = Router()

const INSTRUMENTOS_VALIDOS = new Set(INSTRUMENTOS.map((i) => i.id))

function admin(req) {
  return req.supabaseAdmin || getSupabaseAdmin()
}

equipesRouter.get('/minha', requireAuth, async (req, res, next) => {
  try {
    const { data: membro, error: membroErr } = await req.supabase
      .from('equipe_membros')
      .select('equipe_id, tipo, instrumento')
      .eq('user_id', req.user.id)
      .maybeSingle()

    if (membroErr) throw membroErr
    if (!membro) return res.json({ equipe: null, membros: [], meuTipo: null })

    const { data: equipe, error: equipeErr } = await req.supabase
      .from('equipes')
      .select('id, lider_id, nome, codigo, created_at')
      .eq('id', membro.equipe_id)
      .single()

    if (equipeErr) throw equipeErr

    const { data: membros, error: membrosErr } = await req.supabase
      .from('equipe_membros')
      .select('id, user_id, instrumento, tipo, status_online, joined_at')
      .eq('equipe_id', equipe.id)
      .order('joined_at', { ascending: true })

    if (membrosErr) throw membrosErr

    const userIds = membros.map((m) => m.user_id)
    const { data: profiles } = await admin(req)
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', userIds)

    const profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]))

    const membrosComNome = membros.map((m) => ({
      ...m,
      display_name: profileMap[m.user_id]?.display_name || 'Músico',
      avatar_url: profileMap[m.user_id]?.avatar_url || null,
    }))

    res.json({
      equipe,
      membros: membrosComNome,
      meuTipo: membro.tipo,
      meuInstrumento: membro.instrumento,
    })
  } catch (err) {
    next(err)
  }
})

equipesRouter.post('/criar', requireAuth, async (req, res, next) => {
  try {
    const nome = (req.body?.nome || '').trim()
    if (!nome || nome.length < 2) {
      return res.status(400).json({ error: 'Nome da equipe é obrigatório (mínimo 2 caracteres)' })
    }

    const { data: existente } = await req.supabase
      .from('equipe_membros')
      .select('equipe_id')
      .eq('user_id', req.user.id)
      .maybeSingle()

    if (existente) {
      return res.status(409).json({ error: 'Você já faz parte de uma equipe. Saia antes de criar outra.' })
    }

    const { data: equipe, error } = await req.supabase
      .from('equipes')
      .insert({ lider_id: req.user.id, nome })
      .select('*')
      .single()

    if (error) throw error

    const { error: membroErr } = await req.supabase
      .from('equipe_membros')
      .insert({
        equipe_id: equipe.id,
        user_id: req.user.id,
        tipo: 'lider',
        instrumento: req.body?.instrumento || 'voz',
      })

    if (membroErr) throw membroErr

    res.status(201).json({ equipe })
  } catch (err) {
    next(err)
  }
})

equipesRouter.post('/entrar', requireAuth, async (req, res, next) => {
  try {
    const codigo = (req.body?.codigo || '').trim().toUpperCase()
    if (!codigo || codigo.length !== 6) {
      return res.status(400).json({ error: 'Código da equipe inválido (6 caracteres)' })
    }

    const instrumento = req.body?.instrumento || 'voz'
    if (!INSTRUMENTOS_VALIDOS.has(instrumento)) {
      return res.status(400).json({ error: 'Instrumento inválido' })
    }

    const { data: existente } = await req.supabase
      .from('equipe_membros')
      .select('equipe_id')
      .eq('user_id', req.user.id)
      .maybeSingle()

    if (existente) {
      return res.status(409).json({ error: 'Você já faz parte de uma equipe. Saia antes de entrar em outra.' })
    }

    const { data: lookup } = await admin(req)
      .rpc('get_equipe_by_codigo', { p_codigo: codigo })

    const equipeInfo = Array.isArray(lookup) ? lookup[0] : lookup
    if (!equipeInfo) {
      return res.status(404).json({ error: 'Equipe não encontrada com este código' })
    }

    const tipo = instrumento === 'mesa' ? 'mesa' : 'musico'

    const { data: membrosAtuais } = await admin(req)
      .from('equipe_membros')
      .select('tipo')
      .eq('equipe_id', equipeInfo.id)

    const totalMusicos = (membrosAtuais || []).filter((m) => m.tipo === 'musico').length
    const totalMesa = (membrosAtuais || []).filter((m) => m.tipo === 'mesa').length

    if (tipo === 'musico' && totalMusicos >= EQUIPE_MAX_MUSICOS) {
      return res.status(409).json({ error: `Limite de ${EQUIPE_MAX_MUSICOS} músicos atingido nesta equipe` })
    }
    if (tipo === 'mesa' && totalMesa >= EQUIPE_MAX_MESA) {
      return res.status(409).json({ error: `Limite de ${EQUIPE_MAX_MESA} operador de mesa atingido nesta equipe` })
    }

    const { error: insertErr } = await admin(req)
      .from('equipe_membros')
      .insert({
        equipe_id: equipeInfo.id,
        user_id: req.user.id,
        tipo,
        instrumento,
      })

    if (insertErr) throw insertErr

    res.status(201).json({ equipe: equipeInfo, tipo, instrumento })
  } catch (err) {
    next(err)
  }
})

equipesRouter.post('/sair', requireAuth, async (req, res, next) => {
  try {
    const { data: membro } = await req.supabase
      .from('equipe_membros')
      .select('equipe_id, tipo')
      .eq('user_id', req.user.id)
      .maybeSingle()

    if (!membro) {
      return res.status(404).json({ error: 'Você não faz parte de nenhuma equipe' })
    }

    if (membro.tipo === 'lider') {
      return res.status(400).json({ error: 'O líder não pode sair. Exclua a equipe ou transfira a liderança.' })
    }

    const { error } = await req.supabase
      .from('equipe_membros')
      .delete()
      .eq('user_id', req.user.id)
      .eq('equipe_id', membro.equipe_id)

    if (error) throw error
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

equipesRouter.delete('/remover-membro/:membroId', requireAuth, async (req, res, next) => {
  try {
    const { data: membro } = await req.supabase
      .from('equipe_membros')
      .select('equipe_id, user_id, tipo')
      .eq('id', req.params.membroId)
      .single()

    if (!membro) {
      return res.status(404).json({ error: 'Membro não encontrado' })
    }

    const { data: equipe } = await req.supabase
      .from('equipes')
      .select('lider_id')
      .eq('id', membro.equipe_id)
      .single()

    if (equipe?.lider_id !== req.user.id) {
      return res.status(403).json({ error: 'Apenas o líder pode remover membros' })
    }

    if (membro.tipo === 'lider') {
      return res.status(400).json({ error: 'Não é possível remover o líder da equipe' })
    }

    const { error } = await req.supabase
      .from('equipe_membros')
      .delete()
      .eq('id', req.params.membroId)

    if (error) throw error
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

equipesRouter.delete('/excluir', requireAuth, async (req, res, next) => {
  try {
    const { data: equipe } = await req.supabase
      .from('equipes')
      .select('id')
      .eq('lider_id', req.user.id)
      .maybeSingle()

    if (!equipe) {
      return res.status(404).json({ error: 'Você não é líder de nenhuma equipe' })
    }

    const { error: membrosErr } = await req.supabase
      .from('equipe_membros')
      .delete()
      .eq('equipe_id', equipe.id)

    if (membrosErr) throw membrosErr

    const { error } = await req.supabase
      .from('equipes')
      .delete()
      .eq('id', equipe.id)

    if (error) throw error
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

// ==========================================
// SESSÃO AO VIVO
// ==========================================

equipesRouter.get('/sessao', requireAuth, async (req, res, next) => {
  try {
    const { data: membro } = await req.supabase
      .from('equipe_membros')
      .select('equipe_id, tipo')
      .eq('user_id', req.user.id)
      .maybeSingle()

    if (!membro) return res.json({ sessao: null })

    const { data: sessao } = await req.supabase
      .from('equipe_sessao')
      .select('*')
      .eq('equipe_id', membro.equipe_id)
      .maybeSingle()

    res.json({ sessao, meuTipo: membro.tipo, equipeId: membro.equipe_id })
  } catch (err) {
    next(err)
  }
})

equipesRouter.post('/sessao', requireAuth, async (req, res, next) => {
  try {
    const { data: equipe } = await req.supabase
      .from('equipes')
      .select('id')
      .eq('lider_id', req.user.id)
      .maybeSingle()

    if (!equipe) {
      return res.status(403).json({ error: 'Apenas o líder pode controlar a sessão' })
    }

    const updates = {
      equipe_id: equipe.id,
      updated_by: req.user.id,
      updated_at: new Date().toISOString(),
    }
    const body = req.body || {}
    if (body.playlist_id !== undefined) updates.playlist_id = body.playlist_id
    if (body.musica_id !== undefined) updates.musica_id = body.musica_id
    if (body.secao_index !== undefined) updates.secao_index = body.secao_index
    if (body.tocando !== undefined) updates.tocando = body.tocando
    if (body.tom_offset !== undefined) updates.tom_offset = body.tom_offset
    if (body.bpm !== undefined) updates.bpm = body.bpm

    const { data, error } = await req.supabase
      .from('equipe_sessao')
      .upsert(updates, { onConflict: 'equipe_id' })
      .select('*')
      .single()

    if (error) throw error
    res.json({ sessao: data })
  } catch (err) {
    next(err)
  }
})

// ==========================================
// PRESENÇA
// ==========================================

equipesRouter.post('/presenca', requireAuth, async (req, res, next) => {
  try {
    const { data: membro } = await req.supabase
      .from('equipe_membros')
      .select('equipe_id')
      .eq('user_id', req.user.id)
      .maybeSingle()

    if (!membro) return res.status(404).json({ error: 'Sem equipe' })

    const { error } = await req.supabase
      .from('equipe_presenca')
      .upsert({
        equipe_id: membro.equipe_id,
        user_id: req.user.id,
        last_seen: new Date().toISOString(),
      }, { onConflict: 'equipe_id,user_id' })

    if (error) throw error
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

equipesRouter.get('/presenca', requireAuth, async (req, res, next) => {
  try {
    const { data: membro } = await req.supabase
      .from('equipe_membros')
      .select('equipe_id')
      .eq('user_id', req.user.id)
      .maybeSingle()

    if (!membro) return res.json({ membros: [] })

    const threshold = new Date(Date.now() - 60_000).toISOString()
    const { data: presentes } = await req.supabase
      .from('equipe_presenca')
      .select('user_id, last_seen')
      .eq('equipe_id', membro.equipe_id)
      .gte('last_seen', threshold)

    res.json({ membros: presentes || [] })
  } catch (err) {
    next(err)
  }
})

equipesRouter.delete('/presenca', requireAuth, async (req, res, next) => {
  try {
    await req.supabase
      .from('equipe_presenca')
      .delete()
      .eq('user_id', req.user.id)
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

equipesRouter.get('/preview/:codigo', async (req, res, next) => {
  try {
    const codigo = (req.params.codigo || '').trim().toUpperCase()
    if (!codigo || codigo.length !== 6) {
      return res.status(400).json({ error: 'Código inválido' })
    }

    const supabase = getSupabaseAdmin()
    const { data } = await supabase.rpc('get_equipe_by_codigo', { p_codigo: codigo })
    const equipeInfo = Array.isArray(data) ? data[0] : data

    if (!equipeInfo) {
      return res.status(404).json({ error: 'Equipe não encontrada' })
    }

    res.json(equipeInfo)
  } catch (err) {
    next(err)
  }
})
