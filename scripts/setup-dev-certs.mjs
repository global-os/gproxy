#!/usr/bin/env node
import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const dirname = fileURLToPath(new URL('.', import.meta.url))
const certsDir = resolve(dirname, '..', 'certs')
const certPath = resolve(certsDir, 'dev.pem')
const keyPath = resolve(certsDir, 'dev-key.pem')
const domain = 'app.app.dev.onetrueos.com'

function hasMkcert() {
  try {
    execSync('mkcert --version', { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

if (!process.env.VERCEL && !hasMkcert()) {
  console.log('  mkcert not found, installing...')
  execSync('brew install mkcert', { stdio: 'inherit' })
}

if (!process.env.VERCEL) {
  try {
    execSync('sudo mkcert -install', { stdio: 'inherit' })
  } catch {
    try {
      execSync('mkcert -install 2>/dev/null', { stdio: 'inherit' })
    } catch {
      /* already trusted or no sudo */
    }
  }
}

if (!existsSync(certPath) || !existsSync(keyPath)) {
  execSync(`mkdir -p ${certsDir}`, { stdio: 'inherit' })
  execSync(
    `mkcert -cert-file ${certPath} -key-file ${keyPath} ${domain} localhost 127.0.0.1 ::1`,
    { stdio: 'inherit' }
  )
}
