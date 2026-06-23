// defineRelations was a beta-only API in drizzle-orm (^1.0.0-beta.9-e89174b).
// Stable drizzle-orm (^0.45.2) uses `relations` from 'drizzle-orm' instead.
// To revert: swap back to `import { defineRelations } from 'drizzle-orm'` and
// restore the defineRelations(schema, (r) => ({ ... })) call once it stabilizes.
import { relations } from 'drizzle-orm';
import * as schema from './schema.js'

// relations defined here when needed
export default {}
