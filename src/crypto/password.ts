import { hex } from '@better-auth/utils/hex'
import { scryptAsync } from '@noble/hashes/scrypt.js'
import { hexToBytes } from '@noble/hashes/utils.js'

function constantTimeEqual(a: Uint8Array, b: Uint8Array) {
  let c = a.length ^ b.length
  const length = Math.max(a.length, b.length)
  for (let i = 0; i < length; i++) {
    c |= (i < a.length ? a[i] : 0) ^ (i < b.length ? b[i] : 0)
  }
  return c === 0
}

type ScryptConfig = {
  N: number
  r: number
  p: number
  dkLen: number
}

// better-auth defaults — used for verifying existing password hashes
const LEGACY_SCRYPT: ScryptConfig = { N: 16384, r: 16, p: 1, dkLen: 64 }

// Lighter params for serverless CPUs (sign-up + failed-login dummy hashes)
const SERVERLESS_SCRYPT: ScryptConfig = { N: 4096, r: 8, p: 1, dkLen: 64 }

const isServerless = Boolean(process.env.VERCEL)

function maxmem(config: ScryptConfig) {
  return 128 * config.N * config.r * 2
}

async function deriveKey(
  password: string,
  salt: Uint8Array,
  config: ScryptConfig
) {
  return scryptAsync(password.normalize('NFKC'), salt, {
    ...config,
    maxmem: maxmem(config),
  })
}

async function hashWithConfig(password: string, config: ScryptConfig) {
  const salt = hex.encode(crypto.getRandomValues(new Uint8Array(16)))
  const key = await deriveKey(password, hexToBytes(salt), config)
  return `${salt}:${hex.encode(key)}`
}

async function verifyWithConfig(
  hash: string,
  password: string,
  config: ScryptConfig
) {
  const [salt, key] = hash.split(':')
  if (!salt || !key) return false
  return constantTimeEqual(
    await deriveKey(password, hexToBytes(salt), config),
    hexToBytes(key)
  )
}

export async function hashPassword(password: string) {
  return hashWithConfig(
    password,
    isServerless ? SERVERLESS_SCRYPT : LEGACY_SCRYPT
  )
}

export async function verifyPassword({
  hash,
  password,
}: {
  hash: string
  password: string
}) {
  if (await verifyWithConfig(hash, password, LEGACY_SCRYPT)) return true
  if (
    isServerless &&
    (await verifyWithConfig(hash, password, SERVERLESS_SCRYPT))
  )
    return true
  return false
}

export async function benchmarkScrypt(): Promise<{
  legacyMs: number
  serverlessMs: number
  isServerless: boolean
}> {
  const password = 'benchmark-password'
  const salt = new Uint8Array(16)

  const legacyStart = Date.now()
  await deriveKey(password, salt, LEGACY_SCRYPT)
  const legacyMs = Date.now() - legacyStart

  const serverlessStart = Date.now()
  await deriveKey(password, salt, SERVERLESS_SCRYPT)
  const serverlessMs = Date.now() - serverlessStart

  return { legacyMs, serverlessMs, isServerless }
}
