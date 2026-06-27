import { desc, eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { sessionLog } from '../db/schema.js'

export type SessionLogLevel = 'info' | 'warn' | 'error'
export type SessionLogSource = 'compile' | 'launch' | 'instance'

export type SessionLogEntry = {
  id: number
  sessionId: number
  level: SessionLogLevel
  source: SessionLogSource
  message: string
  detail: string | null
  createdAt: string
}

export type SessionLogWriter = {
  info: (source: SessionLogSource, message: string, detail?: string) => Promise<void>
  warn: (source: SessionLogSource, message: string, detail?: string) => Promise<void>
  error: (source: SessionLogSource, message: string, detail?: string) => Promise<void>
}

export async function appendSessionLog(opts: {
  sessionId: number
  level: SessionLogLevel
  source: SessionLogSource
  message: string
  detail?: string
}): Promise<void> {
  await db.insert(sessionLog).values({
    session_id: opts.sessionId,
    level: opts.level,
    source: opts.source,
    message: opts.message,
    detail: opts.detail ?? null,
  })
}

export function createSessionLogWriter(sessionId: number): SessionLogWriter {
  const write =
    (level: SessionLogLevel) =>
    async (source: SessionLogSource, message: string, detail?: string) => {
      await appendSessionLog({ sessionId, level, source, message, detail })
    }

  return {
    info: write('info'),
    warn: write('warn'),
    error: write('error'),
  }
}

export async function listSessionLogs(
  sessionId: number,
  limit = 100,
): Promise<SessionLogEntry[]> {
  const rows = await db
    .select()
    .from(sessionLog)
    .where(eq(sessionLog.session_id, sessionId))
    .orderBy(desc(sessionLog.created_at))
    .limit(limit)

  return rows.map((row) => ({
    id: row.id,
    sessionId: row.session_id,
    level: row.level as SessionLogLevel,
    source: row.source as SessionLogSource,
    message: row.message,
    detail: row.detail,
    createdAt: row.created_at.toISOString(),
  }))
}