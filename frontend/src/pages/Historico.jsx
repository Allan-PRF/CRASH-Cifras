import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  btnSecondaryClassName,
  cardClassName,
  cardDashedClassName,
} from '../components/ui/inputClasses'
import {
  clearAllCultosPreparadosCache,
  getCultosPreparadosIndex,
  pruneStaleOfflineCultos,
} from '../lib/offlineCulto'
import { fetchHistoricoCultos } from '../services/historico'
import { fetchExistingPlaylistIds } from '../services/playlists'

export function Historico() {
  const [historico, setHistorico] = useState([])
  const [offline, setOffline] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pruneNotice, setPruneNotice] = useState('')
  const [clearing, setClearing] = useState(false)

  const refreshOffline = useCallback(() => {
    setOffline(getCultosPreparadosIndex())
  }, [])

  const syncOfflineCache = useCallback(async () => {
    const removed = await pruneStaleOfflineCultos(fetchExistingPlaylistIds)
    refreshOffline()
    if (removed.length > 0) {
      const nomes = removed.map((item) => item.nome).join(', ')
      setPruneNotice(
        removed.length === 1
          ? `Removido do cache local: ${nomes} (não existe mais no servidor).`
          : `Removidos do cache local ${removed.length} eventos que não existem mais no servidor.`,
      )
    }
    return removed
  }, [refreshOffline])

  useEffect(() => {
    let cancelled = false
    async function init() {
      setLoading(true)
      setError('')
      try {
        await syncOfflineCache()
        const hist = await fetchHistoricoCultos()
        if (!cancelled) setHistorico(hist)
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    init()
    return () => {
      cancelled = true
    }
  }, [syncOfflineCache])

  async function handleClearOffline() {
    setClearing(true)
    setPruneNotice('')
    try {
      clearAllCultosPreparadosCache()
      refreshOffline()
      setPruneNotice('Dados offline deste dispositivo foram limpos.')
    } finally {
      setClearing(false)
    }
  }

  return (
    <section className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-white">Histórico de Eventos</h1>
        <p className="mt-1 text-sm text-[var(--crash-texto-sec)]">
          Eventos registrados e pacotes preparados para uso offline.
        </p>
      </header>

      {loading && <p className="text-sm text-[var(--crash-texto-sec)]">Carregando…</p>}
      {error && (
        <p className="rounded-lg border border-red-900/40 bg-red-950/20 p-3 text-sm text-red-400">
          {error}
        </p>
      )}
      {pruneNotice && (
        <p className="rounded-lg border border-[var(--crash-cifra)]/30 bg-[var(--crash-cifra)]/10 p-3 text-sm text-[var(--crash-cifra)]">
          {pruneNotice}
        </p>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-white">Offline neste dispositivo</h2>
          {offline.length > 0 && (
            <button
              type="button"
              onClick={handleClearOffline}
              disabled={clearing}
              className={btnSecondaryClassName}
            >
              {clearing ? 'Limpando…' : 'Limpar dados offline'}
            </button>
          )}
        </div>
        {offline.length === 0 ? (
          <p className={`p-6 text-center text-sm text-[var(--crash-texto-sec)] ${cardDashedClassName}`}>
            Nenhum evento preparado localmente ainda.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {offline.map((item) => (
              <li key={item.id} className={`p-4 ${cardClassName}`}>
                <p className="font-semibold text-white">{item.nome}</p>
                <p className="text-sm text-[var(--crash-texto-sec)]">
                  {item.musicas} música(s) · cache {new Date(item.cachedAt).toLocaleString()}
                </p>
                <Link
                  to={`/playlist/${item.id}`}
                  className="mt-3 inline-block text-sm text-[var(--crash-cifra)] hover:underline"
                >
                  Abrir playlist
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Registrados no Supabase</h2>
        {!loading && historico.length === 0 ? (
          <p className={`p-6 text-center text-sm text-[var(--crash-texto-sec)] ${cardDashedClassName}`}>
            Nenhum evento registrado ainda.
          </p>
        ) : (
          <ul className="space-y-3">
            {historico.map((culto) => (
              <li key={culto.id} className={`p-4 ${cardClassName}`}>
                <p className="font-semibold text-white">
                  {culto.snapshot?.playlist?.nome || 'Evento'}
                </p>
                <p className="text-sm text-[var(--crash-texto-sec)]">
                  {new Date(culto.realizado_em).toLocaleString()} ·{' '}
                  {culto.snapshot?.musicas?.length || 0} música(s)
                </p>
                {culto.playlist_id && (
                  <Link
                    to={`/playlist/${culto.playlist_id}`}
                    className="mt-3 inline-block text-sm text-[var(--crash-cifra)] hover:underline"
                  >
                    Reabrir playlist
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  )
}
