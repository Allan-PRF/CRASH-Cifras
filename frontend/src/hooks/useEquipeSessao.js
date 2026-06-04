import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { api } from '../lib/api'

/** Usa sessão em cache; refresh só se ausente (evita corrida com cliques rápidos). */
async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    return { Authorization: `Bearer ${session.access_token}` }
  }
  const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession()
  const next = refreshed?.session
  if (refreshError || !next?.access_token) return null
  return { Authorization: `Bearer ${next.access_token}` }
}

/**
 * Hook para sincronização ao vivo da equipe via Supabase Realtime.
 *
 * Líder: envia estado via atualizarSessao()
 * Membro: recebe estado via subscription postgres_changes em equipe_sessao
 */
export function useEquipeSessao() {
  const [sessao, setSessao] = useState(null)
  const [meuTipo, setMeuTipo] = useState(null)
  const [equipeId, setEquipeId] = useState(null)
  const [membrosOnline, setMembrosOnline] = useState(0)
  const [liderNome, setLiderNome] = useState('')
  const channelRef = useRef(null)
  const presencaIntervalRef = useRef(null)
  const activeRef = useRef(false)

  const isLider = meuTipo === 'lider'

  const carregarSessao = useCallback(async () => {
    const headers = await authHeaders()
    if (!headers) return
    try {
      const { data } = await api.get('/equipes/sessao', { headers })
      setSessao(data.sessao)
      setMeuTipo(data.meuTipo)
      setEquipeId(data.equipeId)
    } catch {
      // sem equipe
    }
  }, [])

  const atualizarSessao = useCallback(async (updates) => {
    const headers = await authHeaders()
    if (!headers) return
    try {
      const { data } = await api.post('/equipes/sessao', updates, { headers })
      setSessao(data.sessao)
    } catch (err) {
      console.error('[SESSAO] erro ao atualizar:', err.message)
    }
  }, [])

  const enviarPresenca = useCallback(async () => {
    const headers = await authHeaders()
    if (!headers) return
    try {
      await api.post('/equipes/presenca', {}, { headers })
    } catch { /* silencioso */ }
  }, [])

  const buscarPresenca = useCallback(async () => {
    const headers = await authHeaders()
    if (!headers) return
    try {
      const { data } = await api.get('/equipes/presenca', { headers })
      setMembrosOnline((data.membros || []).length)
    } catch { /* silencioso */ }
  }, [])

  const removerPresenca = useCallback(async () => {
    const headers = await authHeaders()
    if (!headers) return
    try {
      await api.delete('/equipes/presenca', { headers })
    } catch { /* silencioso */ }
  }, [])

  const iniciar = useCallback(async () => {
    if (activeRef.current) return
    activeRef.current = true

    await carregarSessao()
  }, [carregarSessao])

  useEffect(() => {
    if (!equipeId) return

    const channel = supabase
      .channel(`equipe_sessao_${equipeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'equipe_sessao',
          filter: `equipe_id=eq.${equipeId}`,
        },
        (payload) => {
          const row = payload.new
          if (row) setSessao(row)
        },
      )
      .subscribe()

    channelRef.current = channel

    enviarPresenca()
    buscarPresenca()
    presencaIntervalRef.current = setInterval(() => {
      enviarPresenca()
      buscarPresenca()
    }, 15_000)

    return () => {
      channel.unsubscribe()
      channelRef.current = null
      clearInterval(presencaIntervalRef.current)
      removerPresenca()
      activeRef.current = false
    }
  }, [equipeId, enviarPresenca, buscarPresenca, removerPresenca])

  // Buscar nome do líder
  useEffect(() => {
    if (!equipeId || isLider) return
    ;(async () => {
      const headers = await authHeaders()
      if (!headers) return
      try {
        const { data } = await api.get('/equipes/minha', { headers })
        const lider = (data.membros || []).find((m) => m.tipo === 'lider')
        if (lider) setLiderNome(lider.display_name || 'Líder')
      } catch { /* silencioso */ }
    })()
  }, [equipeId, isLider])

  return {
    sessao,
    meuTipo,
    equipeId,
    isLider,
    membrosOnline,
    liderNome,
    iniciar,
    atualizarSessao,
  }
}
