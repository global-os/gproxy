import { randomBytes } from 'node:crypto'

const SLUG_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz'
/** Matches the old serial-id URL length (e.g. 42.app) while staying unguessable. */
const SLUG_LENGTH = 8

/** DNS-safe, unguessable public instance identifier (subdomain label). */
export function generateInstanceSlug(): string {
  const bytes = randomBytes(SLUG_LENGTH)
  let slug = ''
  for (let i = 0; i < SLUG_LENGTH; i++) {
    slug += SLUG_ALPHABET[bytes[i]! % SLUG_ALPHABET.length]!
  }
  return slug
}

const SHORT_SLUG_RE = /^[0-9a-z]{6,13}$/
const UUID_SLUG_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isLegacyUuidSlug(slug: string): boolean {
  return UUID_SLUG_RE.test(slug)
}

export function isValidInstanceSlug(slug: string): boolean {
  return SHORT_SLUG_RE.test(slug) || UUID_SLUG_RE.test(slug)
}