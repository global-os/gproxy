import fs from 'fs'
import path from 'path'

export const FIXTURE_WILDCARD = '*'

export function fixtureUserDir(email: string): string {
  return path.resolve(process.cwd(), 'fixtures/by-user', email)
}

export function fixtureWildcardDir(): string {
  return fixtureUserDir(FIXTURE_WILDCARD)
}

/**
 * Shared `*` tree first, then per-user overrides.
 * Used by seed to build each DB user's desktop (all users get `*` when present).
 */
export function fixtureBasesForUser(email: string): string[] {
  const bases = [fixtureWildcardDir(), fixtureUserDir(email)]
  return bases.filter((base) => fs.existsSync(base))
}

export function resolveFixturePath(
  email: string,
  ...segments: string[]
): string | null {
  for (const base of fixtureBasesForUser(email)) {
    const candidate = path.join(base, ...segments)
    if (fs.existsSync(candidate)) return candidate
  }
  return null
}
