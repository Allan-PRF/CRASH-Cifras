import ffmpegStatic from 'ffmpeg-static'

/** Binário ffmpeg do pacote npm (yt-dlp: --ffmpeg-location) */
export const ffmpegLocation = ffmpegStatic

/** Opções base para youtube-dl-exec / yt-dlp */
export function ytdlpOptions(overrides = {}) {
  const base = {
    noWarnings: true,
    preferFreeFormats: true,
    noCheckCertificates: true,
    addHeader: [
      'referer:https://www.youtube.com/',
      'user-agent:Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    ],
  }
  if (ffmpegLocation) {
    base.ffmpegLocation = ffmpegLocation
  }
  return { ...base, ...overrides }
}
