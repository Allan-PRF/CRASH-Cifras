import { useEffect, useRef, useState } from 'react'
import {
  PROGRESSO_MOTOR_INICIO,
  PROGRESSO_MOTOR_TETO,
  calcularProgressoEstimadoMotor,
} from '../lib/progressoImportacaoEstimado.js'

/**
 * Animação visual 5% → 90% enquanto o motor processa (não reflete status real).
 * @param {boolean} ativo
 * @param {string|number|null} resetKey — reinicia ao trocar de job
 */
export function useProgressoEstimadoMotor(ativo, resetKey) {
  const [progresso, setProgresso] = useState(PROGRESSO_MOTOR_INICIO)
  const maxRef = useRef(PROGRESSO_MOTOR_INICIO)
  const startRef = useRef(null)

  useEffect(() => {
    maxRef.current = PROGRESSO_MOTOR_INICIO
    startRef.current = null
    setProgresso(PROGRESSO_MOTOR_INICIO)
  }, [resetKey])

  useEffect(() => {
    if (!ativo) return undefined

    startRef.current = startRef.current ?? Date.now()

    const tick = () => {
      const elapsed = Date.now() - startRef.current
      const raw = calcularProgressoEstimadoMotor(elapsed)
      const next = Math.max(maxRef.current, raw)
      maxRef.current = next
      setProgresso(next)
    }

    tick()
    const id = setInterval(tick, 350)
    return () => clearInterval(id)
  }, [ativo, resetKey])

  const noTeto = progresso >= PROGRESSO_MOTOR_TETO - 0.5

  return { progresso: Math.round(progresso), noTeto }
}
