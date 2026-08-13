import type { WorkspaceLogWriter } from '../services/workspace-logger.js'

export type GappCompileContext = {
  workspaceId: number
  bundleName?: string
  log: WorkspaceLogWriter
}
