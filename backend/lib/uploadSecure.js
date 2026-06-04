import crypto from 'crypto'
import sharp from 'sharp'
import { getSupabaseAdmin } from './supabase.js'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_SIZE = 5 * 1024 * 1024
const FOTO_BUCKET = 'ministros'

const MAGIC_BYTES = {
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/png': [0x89, 0x50, 0x4e, 0x47],
  'image/webp': [0x52, 0x49, 0x46, 0x46],
}

function validateMagicBytes(buffer, mimeType) {
  const magic = MAGIC_BYTES[mimeType]
  if (!magic) return false
  return magic.every((byte, i) => buffer[i] === byte)
}

/**
 * @param {{ buffer: Buffer, mimetype: string, size: number, userId: string, supabase?: import('@supabase/supabase-js').SupabaseClient }} params
 */
export async function processAndUploadImage({ buffer, mimetype, size, userId, supabase }) {
  if (size > MAX_FILE_SIZE) {
    return { url: null, error: 'Arquivo muito grande. Máximo 5MB.' }
  }

  if (!ALLOWED_MIME_TYPES.includes(mimetype)) {
    return { url: null, error: 'Tipo de arquivo não permitido. Use JPG, PNG ou WebP.' }
  }

  if (!validateMagicBytes(buffer, mimetype)) {
    return { url: null, error: 'Arquivo corrompido ou tipo inválido.' }
  }

  let processedBuffer
  try {
    processedBuffer = await sharp(buffer)
      .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
      .rotate()
      .withMetadata(false)
      .webp({ quality: 85 })
      .toBuffer()
  } catch {
    return { url: null, error: 'Erro ao processar imagem. Arquivo pode estar corrompido.' }
  }

  const safeFileName = `${userId}/${Date.now()}_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}.webp`

  let client = supabase
  try {
    if (!client) client = getSupabaseAdmin()
  } catch {
    return { url: null, error: 'Upload indisponível no servidor.' }
  }

  const { error } = await client.storage.from(FOTO_BUCKET).upload(safeFileName, processedBuffer, {
    contentType: 'image/webp',
    cacheControl: '3600',
    upsert: false,
  })

  if (error) {
    return { url: null, error: 'Erro ao fazer upload. Tente novamente.' }
  }

  const { data } = client.storage.from(FOTO_BUCKET).getPublicUrl(safeFileName)
  return { url: data.publicUrl, error: null }
}
