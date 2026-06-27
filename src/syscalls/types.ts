import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type * as schema from '../db/schema.js'

export type SyscallContext = {
  db: NodePgDatabase<typeof schema>
  userId: string
}

export type SyscallResult =
  | { ok: true; result?: unknown; status?: number }
  | { ok: false; message: string; status: number }

export type SyscallHandler = (
  ctx: SyscallContext,
  args: Record<string, unknown>,
) => Promise<SyscallResult>