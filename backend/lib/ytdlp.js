import ffmpegStatic from 'ffmpeg-static'

/** Binário ffmpeg do pacote npm (yt-dlp: --ffmpeg-location) */
export const ffmpegLocation = ffmpegStatic

/** Opções base para youtube-dl-exec / yt-dlp */
export function ytdlpOptions(overrides = {}) {
  const base = {
    noWarnings: true,
    preferFreeFormats: true,
  }
  if (ffmpegLocation) {
    base.ffmpegLocation = ffmpegLocation
  }
  return { ...base, ...overrides }
}
