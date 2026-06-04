import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { cardClassName, cardDashedClassName } from '../components/ui/inputClasses'
import { getCultosPreparadosIndex } from '../lib/offlineCulto'
import { fetchHistoricoCultos } from '../services/historico'

export function Historico() {
  const [historico, setHistorico] = useState([])
  const [offline, setOffline] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setOffline(getCultosPreparadosIndex())
    fetchHistoricoCultos()
      .then(setHistorico)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

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

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Offline neste dispositivo</h2>
        {offline.length === 0 ? (
          <p className={`p-6 text-center text-sm text-[var(--crash-texto-sec)] ${cardDashedClassName}`}>
            Nenhum evento preparado localmente ainda.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {offline.map((item) => (
              <li
                key={item.id}
                className={`p-4 ${cardClassName}`}
              >
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
              <li
                key={culto.id}
                className={`p-4 ${cardClassName}`}
              >
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
