import { useCallback, useEffect, useRef, useState } from 'react'
import { useIsMobile } from '../../hooks/useIsMobile'
import {
  TELEPROMPTER_YOUTUBE_HEADER,
  TELEPROMPTER_YOUTUBE_PILL_BOTTOM,
  TELEPROMPTER_YOUTUBE_PILL_LEFT,
  TELEPROMPTER_YOUTUBE_PILL_RIGHT_MOBILE,
  TELEPROMPTER_YOUTUBE_PILL_SIZE,
  TELEPROMPTER_YOUTUBE_RIGHT,
  TELEPROMPTER_YOUTUBE_TOP,
  TELEPROMPTER_YOUTUBE_VIDEO_HEIGHT,
  TELEPROMPTER_YOUTUBE_WIDTH,
  teleprompterYoutubePosPadrao,
} from '../../lib/teleprompterColunaDireita'
import { loadYoutubeIframeApi, saveYoutubeMinimized } from '../../lib/teleprompterYoutube'

const W = TELEPROMPTER_YOUTUBE_WIDTH
const H = TELEPROMPTER_YOUTUBE_VIDEO_HEIGHT
const HEADER_H = TELEPROMPTER_YOUTUBE_HEADER
const RADIUS = 12
const PILL_SIZE = TELEPROMPTER_YOUTUBE_PILL_SIZE

const HOST_PARENT_CSS =
  'position:absolute;inset:0;width:100%;height:100%;margin:0;padding:0;border:none;overflow:hidden;'

const IFRAME_CSS =
  'position:absolute;top:0;left:0;width:calc(100% + 0px);height:calc(100% + 60px);margin-top:-30px;margin-bottom:-30px;margin-left:0;margin-right:0;border:none;padding:0;display:block;'

const YOUTUBE_EMBED_PARAMS = {
  autoplay: '0',
  controls: '0',
  modestbranding: '1',
  rel: '0',
  showinfo: '0',
  enablejsapi: '1',
  playsinline: '1',
  iv_load_policy: '3',
  disablekb: '1',
  fs: '0',
}

function normalizePosition(position) {
  const padrao = teleprompterYoutubePosPadrao()
  if (!position || typeof position !== 'object') return padrao

  if (typeof position.top === 'number' && Number.isFinite(position.top)) {
    return { top: position.top, right: TELEPROMPTER_YOUTUBE_RIGHT }
  }

  if (typeof position.bottom === 'number' && typeof window !== 'undefined') {
    return {
      top: window.innerHeight - position.bottom - H,
      right: TELEPROMPTER_YOUTUBE_RIGHT,
    }
  }

  return padrao
}

function clampPosition(position) {
  const norm = normalizePosition(position)
  const minTop = TELEPROMPTER_YOUTUBE_TOP
  const right = TELEPROMPTER_YOUTUBE_RIGHT

  if (typeof window === 'undefined') {
    return { top: Math.max(minTop, norm.top), right }
  }

  const maxTop = Math.max(
    minTop,
    window.innerHeight - H - 80,
  )

  return {
    top: Math.min(Math.max(minTop, norm.top), maxTop),
    right,
  }
}

function aplicarIframePlayer(player, host) {
  try {
    const iframe = player?.getIframe?.()
    if (iframe) {
      iframe.removeAttribute('width')
      iframe.removeAttribute('height')
      iframe.style.cssText = IFRAME_CSS
    }
  } catch {
    // ignore
  }

  if (!host) return
  host.style.cssText = HOST_PARENT_CSS

  host.querySelectorAll('div').forEach((wrap) => {
    wrap.removeAttribute('width')
    wrap.removeAttribute('height')
    wrap.style.cssText = HOST_PARENT_CSS
  })
}

function embedSrc(videoId, { fallback = false } = {}) {
  const baseParams = fallback
    ? {
        autoplay: '0',
        controls: '1',
        modestbranding: '1',
        rel: '0',
        playsinline: '1',
      }
    : YOUTUBE_EMBED_PARAMS

  const params = new URLSearchParams({
    ...baseParams,
    origin: typeof window !== 'undefined' ? window.location.origin : '',
  })
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params}`
}

function readPlayerTime(player) {
  try {
    const t = player?.getCurrentTime?.()
    return typeof t === 'number' && Number.isFinite(t) && t > 0 ? t : 0
  } catch {
    return 0
  }
}

function YoutubePillIcon({ playing }) {
  return (
    <span className="relative flex items-center justify-center" aria-hidden>
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5 fill-[var(--crash-cifra)]"
        role="img"
      >
        <path d="M21.58 7.19a2.75 2.75 0 0 0-1.93-1.94C18.26 5 12 5 12 5s-6.26 0-7.65.25a2.75 2.75 0 0 0-1.93 1.94C2.17 8.58 2.17 12 2.17 12s0 3.42.25 4.81a2.75 2.75 0 0 0 1.93 1.94C5.74 19 12 19 12 19s6.26 0 7.65-.25a2.75 2.75 0 0 0 1.93-1.94c.25-1.39.25-4.81.25-4.81s0-3.42-.25-4.81Z" />
        <path className="fill-black" d="M10 9.5v5l4.5-2.5L10 9.5Z" />
      </svg>
      {playing && (
        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 animate-pulse rounded-full bg-[var(--crash-cifra)] ring-2 ring-black" />
      )}
    </span>
  )
}

export function MiniPlayerYoutube({
  videoId,
  teleprompterPaused,
  syncVideo,
  enabled,
  minimized,
  position,
  onToggleMinimized,
  onPositionChange,
}) {
  const hostRef = useRef(null)
  const playerRef = useRef(null)
  const playerReadyRef = useRef(false)
  const teleprompterPausedRef = useRef(teleprompterPaused)
  const prevTeleprompterPausedRef = useRef(teleprompterPaused)
  const syncVideoRef = useRef(syncVideo)
  const savedTimeRef = useRef(0)
  const activeVideoIdRef = useRef(null)
  const dragRef = useRef(null)
  const [videoPaused, setVideoPaused] = useState(true)
  const [apiErro, setApiErro] = useState(false)

  useEffect(() => {
    teleprompterPausedRef.current = teleprompterPaused
  }, [teleprompterPaused])

  useEffect(() => {
    syncVideoRef.current = syncVideo
  }, [syncVideo])

  const pos = clampPosition(position)
  const isMobile = useIsMobile()

  const shellStyle = minimized
    ? isMobile
      ? {
          position: 'fixed',
          right: `${TELEPROMPTER_YOUTUBE_PILL_RIGHT_MOBILE}px`,
          bottom: `${TELEPROMPTER_YOUTUBE_PILL_BOTTOM}px`,
          top: 'auto',
          left: 'auto',
          zIndex: 45,
          width: PILL_SIZE,
          height: PILL_SIZE,
          overflow: 'hidden',
          borderRadius: '50%',
          isolation: 'isolate',
        }
      : {
          position: 'fixed',
          left: `${TELEPROMPTER_YOUTUBE_PILL_LEFT}px`,
          bottom: `${TELEPROMPTER_YOUTUBE_PILL_BOTTOM}px`,
          top: 'auto',
          right: 'auto',
          zIndex: 45,
          width: PILL_SIZE,
          height: PILL_SIZE,
          overflow: 'hidden',
          borderRadius: '50%',
          isolation: 'isolate',
        }
    : {
        position: 'fixed',
        top: `${pos.top}px`,
        right: `${pos.right}px`,
        zIndex: 45,
        width: W,
        height: H,
        overflow: 'hidden',
        borderRadius: RADIUS,
      }

  /** Iframe fora da tela quando minimizado — evita vazar vídeo sobre a pílula. */
  const hostWrapperStyle = minimized
    ? {
        position: 'fixed',
        left: -9999,
        top: 0,
        width: W,
        height: H,
        overflow: 'hidden',
        opacity: 0,
        visibility: 'hidden',
        pointerEvents: 'none',
      }
    : {
        position: 'absolute',
        left: 0,
        top: 0,
        width: W,
        height: H,
        opacity: 1,
        zIndex: 0,
        pointerEvents: 'none',
      }

  const applyVideoPauseState = useCallback((shouldPause) => {
    const player = playerRef.current
    if (!playerReadyRef.current || !player) return
    try {
      if (shouldPause) {
        player.pauseVideo()
        setVideoPaused(true)
      } else {
        player.playVideo()
        setVideoPaused(false)
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    if (!enabled || !videoId) return undefined

    if (activeVideoIdRef.current !== videoId) {
      savedTimeRef.current = 0
      activeVideoIdRef.current = videoId
    }

    let cancelado = false
    playerReadyRef.current = false
    setApiErro(false)

    const reforcarEstilos = (player) => {
      aplicarIframePlayer(player, hostRef.current)
      requestAnimationFrame(() => aplicarIframePlayer(player, hostRef.current))
      window.setTimeout(() => aplicarIframePlayer(player, hostRef.current), 100)
    }

    const resumeTime = savedTimeRef.current

    loadYoutubeIframeApi()
      .then((YT) => {
        if (cancelado || !hostRef.current) return
        hostRef.current.style.cssText = HOST_PARENT_CSS
        playerRef.current?.destroy?.()
        const player = new YT.Player(hostRef.current, {
          videoId,
          width: W,
          height: H,
          playerVars: {
            autoplay: 0,
            controls: 0,
            modestbranding: 1,
            rel: 0,
            showinfo: 0,
            iv_load_policy: 3,
            disablekb: 1,
            fs: 0,
            playsinline: 1,
            start: resumeTime > 0 ? Math.floor(resumeTime) : undefined,
          },
          events: {
            onReady: (event) => {
              if (cancelado) return
              const p = event.target
              playerRef.current = p
              playerReadyRef.current = true
              reforcarEstilos(p)

              if (resumeTime > 0) {
                try {
                  p.seekTo(resumeTime, true)
                } catch {
                  // ignore
                }
              }

              if (!syncVideoRef.current) return
              try {
                if (!teleprompterPausedRef.current) {
                  p.playVideo()
                  setVideoPaused(false)
                }
              } catch {
                // ignore
              }
            },
            onStateChange: (event) => {
              if (event.data === YT.PlayerState.PLAYING) setVideoPaused(false)
              if (event.data === YT.PlayerState.PAUSED) setVideoPaused(true)
            },
          },
        })
        playerRef.current = player
      })
      .catch(() => setApiErro(true))

    return () => {
      cancelado = true
      const t = readPlayerTime(playerRef.current)
      if (t > 0) savedTimeRef.current = t
      playerReadyRef.current = false
      try {
        playerRef.current?.destroy?.()
      } catch {
        // ignore
      }
      playerRef.current = null
    }
  }, [enabled, videoId])

  useEffect(() => {
    if (!syncVideo || !playerReadyRef.current) return

    const wasPaused = prevTeleprompterPausedRef.current
    prevTeleprompterPausedRef.current = teleprompterPaused

    // Sync só no play da rolagem — pause da letra não pausa o vídeo (ensaio).
    if (!wasPaused || teleprompterPaused) return

    try {
      playerRef.current?.playVideo()
      setVideoPaused(false)
    } catch {
      // ignore
    }
  }, [teleprompterPaused, syncVideo])

  function expandPlayer(e) {
    e.stopPropagation()
    onToggleMinimized?.(false)
    saveYoutubeMinimized(false)
  }

  function handleMinimize(e) {
    e.stopPropagation()
    onToggleMinimized?.(true)
    saveYoutubeMinimized(true)
  }

  function togglePlayLocal(e) {
    e.stopPropagation()
    if (minimized) {
      expandPlayer(e)
      return
    }
    applyVideoPauseState(!videoPaused)
  }

  function onPointerDown(e) {
    if (minimized || e.button !== 0) return
    e.stopPropagation()
    const startY = e.clientY
    const startTop = pos.top

    dragRef.current = { startY, startTop }

    function onMove(ev) {
      if (!dragRef.current) return
      const dy = ev.clientY - dragRef.current.startY
      onPositionChange?.(
        clampPosition({
          top: dragRef.current.startTop + dy,
        }),
      )
    }

    function onUp() {
      dragRef.current = null
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  if (!enabled || !videoId) return null

  const pillPlaying = !videoPaused

  return (
    <div
      style={shellStyle}
      className={`touch-none select-none ${minimized ? '' : 'bg-black'}`}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Vídeo na camada de baixo — sem overlay com blur por cima. */}
      {!apiErro && (
        <div aria-hidden={minimized} style={hostWrapperStyle}>
          <div ref={hostRef} style={{ width: '100%', height: '100%' }} />
        </div>
      )}

      {minimized ? (
        <button
          type="button"
          onClick={expandPlayer}
          className="relative z-20 flex h-full w-full items-center justify-center rounded-full border-2 border-[var(--crash-cifra)]/70 bg-black/85 text-[var(--crash-cifra)] shadow-lg shadow-black/50 backdrop-blur-sm transition hover:border-[var(--crash-cifra)] hover:bg-black/95 active:scale-95"
          aria-label="Expandir vídeo do YouTube"
          title={pillPlaying ? 'YouTube tocando — toque para expandir' : 'YouTube pausado — toque para expandir'}
        >
          <YoutubePillIcon playing={pillPlaying} />
        </button>
      ) : (
        <div className="pointer-events-none absolute inset-0 z-[2] overflow-hidden rounded-xl border border-[var(--crash-cifra)]/40 shadow-2xl shadow-black/60">
          {apiErro ? (
            <iframe
              title="YouTube"
              src={embedSrc(videoId, { fallback: true })}
              ref={(el) => {
                if (el) el.style.cssText = IFRAME_CSS
              }}
              className="pointer-events-auto absolute inset-0 z-0 h-full w-full"
              allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
            />
          ) : null}

          <div
            className="pointer-events-auto absolute left-0 right-0 top-0 z-20 flex cursor-grab items-center justify-between gap-1 bg-black/85 px-2 active:cursor-grabbing"
            style={{ height: HEADER_H }}
            onPointerDown={onPointerDown}
          >
            <span className="truncate text-[10px] font-semibold text-[var(--crash-cifra)]">
              YouTube
            </span>
            <button
              type="button"
              onClick={handleMinimize}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--crash-cifra)]/50 bg-black/90 text-sm leading-none text-[var(--crash-cifra)] transition hover:border-[var(--crash-cifra)] hover:bg-[var(--crash-cifra)]/10"
              aria-label="Minimizar vídeo"
              title="Minimizar"
            >
              ▾
            </button>
          </div>

          {!apiErro && (
            <button
              type="button"
              onClick={togglePlayLocal}
              className="pointer-events-auto absolute inset-0 z-10 flex items-center justify-center bg-black/20 opacity-0 transition hover:opacity-100"
              aria-label={videoPaused ? 'Play vídeo' : 'Pause vídeo'}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-base text-white ring-2 ring-[var(--crash-cifra)]">
                {videoPaused ? '▶' : '⏸'}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
