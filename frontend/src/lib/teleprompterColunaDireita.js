/** Layout do teleprompter — canto superior direito (YouTube + versículo) e anotações embaixo. */

export const TELEPROMPTER_BARRA_INFERIOR_ALTURA = 80

/** Canto superior direito: mini player + card bíblico (mesma largura e margem). */
export const TELEPROMPTER_CANTO_TOP_RIGHT = 16
export const TELEPROMPTER_OVERLAY_WIDTH = 200

export const TELEPROMPTER_YOUTUBE_TOP = 70
export const TELEPROMPTER_YOUTUBE_RIGHT = TELEPROMPTER_CANTO_TOP_RIGHT
export const TELEPROMPTER_YOUTUBE_WIDTH = TELEPROMPTER_OVERLAY_WIDTH
export const TELEPROMPTER_YOUTUBE_VIDEO_HEIGHT = Math.round(
  (TELEPROMPTER_YOUTUBE_WIDTH * 9) / 16,
)
export const TELEPROMPTER_YOUTUBE_HEADER = 22

/** Botão minimizado — desktop: canto inferior esquerdo. */
export const TELEPROMPTER_YOUTUBE_PILL_SIZE = 44
export const TELEPROMPTER_YOUTUBE_PILL_LEFT = 16
export const TELEPROMPTER_YOUTUBE_PILL_BOTTOM = TELEPROMPTER_BARRA_INFERIOR_ALTURA + 12

export const TELEPROMPTER_VERSICULO_TOP = 220
export const TELEPROMPTER_VERSICULO_RIGHT = TELEPROMPTER_CANTO_TOP_RIGHT
export const TELEPROMPTER_VERSICULO_MAX_WIDTH = 280
export const TELEPROMPTER_VERSICULO_MAX_HEIGHT = 320

/** Ícone 📝 — canto inferior direito (inalterado). */
export const TELEPROMPTER_ANOTACAO_BOTTOM = TELEPROMPTER_BARRA_INFERIOR_ALTURA
export const TELEPROMPTER_ANOTACAO_RIGHT = 80
export const TELEPROMPTER_ANOTACAO_ICON_ALTURA = 40

/** Mobile: pílula à esquerda do botão de anotações (📝), com folga entre os dois. */
export const TELEPROMPTER_YOUTUBE_PILL_GAP_ANOTACAO = 12
export const TELEPROMPTER_YOUTUBE_PILL_RIGHT_MOBILE =
  TELEPROMPTER_ANOTACAO_RIGHT +
  TELEPROMPTER_ANOTACAO_ICON_ALTURA +
  TELEPROMPTER_YOUTUBE_PILL_GAP_ANOTACAO

/** Altura estimada do card bíblico (referência). */
export const RODAPE_VERSICULO_ALTURA = 100

/** Landscape: card fixo abaixo do letreiro, acima da barra de controles. */
export const TELEPROMPTER_VERSICULO_LANDSCAPE_BOTTOM = 20
export const TELEPROMPTER_VERSICULO_LANDSCAPE_MAX_WIDTH = 480

/** @deprecated use TELEPROMPTER_COLUNA_RIGHT → TELEPROMPTER_ANOTACAO_RIGHT */
export const TELEPROMPTER_COLUNA_RIGHT = TELEPROMPTER_ANOTACAO_RIGHT

export function teleprompterYoutubePosPadrao() {
  return {
    top: TELEPROMPTER_YOUTUBE_TOP,
    right: TELEPROMPTER_YOUTUBE_RIGHT,
  }
}
