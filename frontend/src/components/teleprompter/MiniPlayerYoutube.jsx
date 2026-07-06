import { useCallback, useEffect, useRef, useState } from 'react'
import {
  TELEPROMPTER_YOUTUBE_RIGHT,
  TELEPROMPTER_YOUTUBE_TOP,
  TELEPROMPTER_YOUTUBE_HEADER,
  TELEPROMPTER_YOUTUBE_VIDEO_HEIGHT,
  TELEPROMPTER_YOUTUBE_WIDTH,
  teleprompterYoutubePosPadrao,
} from '../../lib/teleprompterColunaDireita'
import { loadYoutubeIframeApi, saveYoutubeMinimized } from '../../lib/teleprompterYoutube'

const W = TELEPROMPTER_YOUTUBE_WIDTH
const H = TELEPROMPTER_YOUTUBE_VIDEO_HEIGHT
const HEADER_H = TELEPROMPTER_YOUTUBE_HEADER
const RADIUS = 12

const MINI_SIZE = 40

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

  const shellStyle = {
    position: 'fixed',
    top: `${pos.top}px`,
    right: `${pos.right}px`,
    zIndex: 45,
    width: minimized ? MINI_SIZE : W,
    height: minimized ? MINI_SIZE : H,
    overflow: 'hidden',
    borderRadius: minimized ? MINI_SIZE : RADIUS,
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
                if (teleprompterPausedRef.current) {
                  p.pauseVideo()
                  setVideoPaused(true)
                } else {
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
    try {
      if (teleprompterPaused) {
        playerRef.current?.pauseVideo()
        setVideoPaused(true)
      } else {
        playerRef.current?.playVideo()
        setVideoPaused(false)
      }
    } catch {
      // ignore
    }
  }, [teleprompterPaused, syncVideo])

  function togglePlayLocal(e) {
    e.stopPropagation()
    if (minimized) {
      onToggleMinimized?.(false)
      saveYoutubeMinimized(false)
      return
    }
    applyVideoPauseState(!videoPaused)
  }

  function handleMinimize(e) {
    e.stopPropagation()
    const next = !minimized
    onToggleMinimized?.(next)
    saveYoutubeMinimized(next)
  }

  function onPointerDown(e) {
    if (e.button !== 0) return
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

  return (
    <div
      style={shellStyle}
      className="touch-none select-none"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {minimized ? (
        <button
          type="button"
          onClick={togglePlayLocal}
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) onPointerDown(e)
          }}
          className="relative z-10 flex h-full w-full items-center justify-center rounded-full bg-red-600 text-[11px] font-black text-white shadow-lg ring-2 ring-black/40 transition hover:bg-red-500 active:cursor-grabbing"
          aria-label="Expandir player YouTube"
          title="YouTube"
        >
          YT
        </button>
      ) : (
        <div className="relative h-full w-full overflow-hidden rounded-xl border border-white/20 bg-black/80 shadow-2xl backdrop-blur-md">
          {apiErro ? (
            <iframe
              title="YouTube"
              src={embedSrc(videoId, { fallback: true })}
              ref={(el) => {
                if (el) el.style.cssText = IFRAME_CSS
              }}
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
            />
          ) : null}

          <div
            className="absolute left-0 right-0 top-0 z-20 flex cursor-grab items-center justify-between bg-black/80 px-2 active:cursor-grabbing"
            style={{ height: HEADER_H }}
            onPointerDown={onPointerDown}
          >
            <span className="text-[10px] font-bold text-red-500">YT</span>
            <button
              type="button"
              onClick={handleMinimize}
              className="rounded px-1 text-[10px] text-white/80 hover:bg-white/10"
              aria-label="Minimizar"
            >
              −
            </button>
          </div>

          {!apiErro && (
            <button
              type="button"
              onClick={togglePlayLocal}
              className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 opacity-0 transition hover:opacity-100"
              aria-label={videoPaused ? 'Play vídeo' : 'Pause vídeo'}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-base text-white ring-2 ring-[var(--crash-cifra)]">
                {videoPaused ? '▶' : '⏸'}
              </span>
            </button>
          )}
        </div>
      )}

      {/* Host único e permanente — minimizar só esconde visualmente; pause usa pauseVideo. */}
      {!apiErro && (
        <div
          aria-hidden={minimized}
          className="pointer-events-none absolute left-0 top-0"
          style={{
            width: W,
            height: H,
            opacity: minimized ? 0 : 1,
            zIndex: minimized ? 0 : 1,
          }}
        >
          <div ref={hostRef} style={{ width: '100%', height: '100%' }} />
        </div>
      )}
    </div>
  )
}
