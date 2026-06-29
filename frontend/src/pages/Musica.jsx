import { Navigate, useParams } from 'react-router-dom'

/** Redirect legado: /musica/:id → teleprompter (Tarefa 5). */
export function Musica() {
  const { id } = useParams()
  return <Navigate to={`/teleprompter/musica/${id}`} replace />
}
