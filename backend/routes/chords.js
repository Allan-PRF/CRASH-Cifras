import { Router } from 'express'
import { Note, Interval } from 'tonal'

export const chordsRouter = Router()

chordsRouter.post('/transpose', (req, res) => {
  const { note, semitones } = req.body ?? {}

  if (!note || typeof semitones !== 'number') {
    return res.status(400).json({
      error: 'Envie { note: string, semitones: number }',
    })
  }

  const parsed = Note.get(note)
  if (parsed.empty) {
    return res.status(400).json({ error: `Nota inválida: ${note}` })
  }

  const transposed = Note.transpose(note, Interval.fromSemitones(semitones))

  res.json({ original: note, semitones, transposed })
})
