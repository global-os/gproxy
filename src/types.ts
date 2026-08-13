import type { HttpBindings } from '@hono/node-server'
import { NodePgDatabase } from 'drizzle-orm/node-postgres'
import * as schema from './db/schema.js'
import { auth } from './auth.js'

// Define context types for TypeScript
export type Env = {
  Bindings: HttpBindings
  Variables: {
    db: NodePgDatabase<typeof schema>
    cookies: Record<string, string>
    isLocal: boolean
    user: typeof auth.$Infer.Session.user | null
    session: typeof auth.$Infer.Session.session | null
  }
}
