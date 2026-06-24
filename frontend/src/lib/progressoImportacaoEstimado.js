/** Duração estimada do motor (5 min) — barra sobe até o teto nesse intervalo. */
export const PROGRESSO_MOTOR_DURACAO_MS = 5 * 60 * 1000
export const PROGRESSO_MOTOR_INICIO = 5
export const PROGRESSO_MOTOR_TETO = 90

/**
 * Curva ease-out cúbica: sobe rápido no início e desacelera perto do teto.
 * @param {number} elapsedMs
 */
export function calcularProgressoEstimadoMotor(
  elapsedMs,
  {
    duracaoMs = PROGRESSO_MOTOR_DURACAO_MS,
    min = PROGRESSO_MOTOR_INICIO,
    max = PROGRESSO_MOTOR_TETO,
  } = {},
) {
  const t = Math.min(1, Math.max(0, elapsedMs / duracaoMs))
  const eased = 1 - (1 - t) ** 3
  return min + (max - min) * eased
}
