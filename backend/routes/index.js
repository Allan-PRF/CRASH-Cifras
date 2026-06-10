import { Router } from 'express'
import { rateLimiters } from '../middleware/security.js'
import { assinaturasRouter } from './assinaturas.js'
import { chordsRouter } from './chords.js'
import { equipesRouter } from './equipes.js'
import { healthRouter } from './health.js'
import { importarRouter } from './importar.js'
import { trialRouter } from './trial.js'
import { securityRouter } from './security.js'
import { uploadRouter } from './upload.js'
import { versiculosRouter } from './versiculos.js'
import { youtubeRouter } from './youtube.js'
import { referralsRouter } from './referrals.js'
import { novidadesRouter } from './novidades.js'
import { debugRouter } from './debug.js'

export const apiRouter = Router()

apiRouter.use('/health', healthRouter)
apiRouter.use('/debug', debugRouter)
apiRouter.use('/security', securityRouter)
apiRouter.use('/upload', rateLimiters.upload, uploadRouter)
apiRouter.use('/assinaturas', assinaturasRouter)
apiRouter.use('/chords', chordsRouter)
apiRouter.use('/equipes', equipesRouter)
apiRouter.use('/importar', rateLimiters.youtube, importarRouter)
apiRouter.use('/youtube', rateLimiters.youtube, youtubeRouter)
apiRouter.use('/trial', trialRouter)
apiRouter.use('/versiculos', versiculosRouter)
apiRouter.use('/referrals', referralsRouter)
apiRouter.use('/novidades', novidadesRouter)
