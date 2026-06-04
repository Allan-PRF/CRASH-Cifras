import { Router } from 'express'
import multer from 'multer'
import { processAndUploadImage } from '../lib/uploadSecure.js'
import { requireAuth } from '../lib/supabase.js'

export const uploadRouter = Router()

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp']

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Tipo de arquivo não permitido. Use JPG, PNG ou WebP.'))
    }
  },
})

uploadRouter.post(
  '/foto-ministro',
  requireAuth,
  upload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado.' })
      }

      const supabase = req.supabaseAdmin || req.supabase
      const result = await processAndUploadImage({
        buffer: req.file.buffer,
        mimetype: req.file.mimetype,
        size: req.file.size,
        userId: req.user.id,
        supabase,
      })

      if (result.error) {
        return res.status(400).json({ error: result.error })
      }

      res.json({ url: result.url })
    } catch (err) {
      next(err)
    }
  },
)
