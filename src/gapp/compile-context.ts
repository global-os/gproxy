import type { SessionLogWriter } from '../services/session-logger.js'

export type GappCompileContext = {
  sessionId: number
  bundleName?: string
  log: SessionLogWriter
}