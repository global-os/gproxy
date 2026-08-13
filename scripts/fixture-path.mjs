import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const FIXTURE_EMAIL = 'peterson@sent.com'
export const FIXTURE_WILDCARD = '*'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export function fixtureUserDir(email) {
  return path.join(root, 'fixtures/by-user', email)
}

export function fixtureBasesForUser(email) {
  return [fixtureUserDir(FIXTURE_WILDCARD), fixtureUserDir(email)].filter(
    (base) => fs.existsSync(base)
  )
}

export function resolveFixturePath(email, ...segments) {
  for (const base of fixtureBasesForUser(email)) {
    const candidate = path.join(base, ...segments)
    if (fs.existsSync(candidate)) return candidate
  }
  return null
}
