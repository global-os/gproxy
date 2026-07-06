import fs from 'node:fs'
import path from 'node:path'
import { fetch as undiciFetch } from 'undici'
import { auth } from './auth.js'
import { resolveOutboundProxy } from './runtime/webview/proxy.js'

export type ConfigCheck = { ok: boolean; missing: string[] }
export type ProxyCheck = { configured: boolean; ok: boolean; error?: string }
export type BundleCheck = { ok: boolean; missing: string[] }
export type AuthProbeResult = { ok: boolean; ms: number; status?: number; error?: string }
export type SidecarProbeResult = {
  configured: boolean
  ok: boolean
  ms: number
  proxyActive?: boolean
  proxyOk?: boolean
  serverIp?: string
  proxyIp?: string
  vercelProxyIp?: string
  ipsMatch?: boolean
  error?: string
}

const REQUIRED_ENV = ['DATABASE_URL', 'BETTER_AUTH_SECRET'] as const

const BUNDLE_FILES = [
  path.join(process.cwd(), 'src/frontend/dist/index.html'),
  path.join(process.cwd(), 'src/build-version.json'),
]

export async function checkProxyUrl(): Promise<ProxyCheck> {
  const { urlRedacted, error } = await resolveOutboundProxy()
  if (error) return { configured: true, ok: false, error }
  return { configured: urlRedacted != null, ok: true }
}

export function checkConfig(): ConfigCheck {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]?.trim())
  return { ok: missing.length === 0, missing: [...missing] }
}

export function checkFrontendBundle(): BundleCheck {
  const missing = BUNDLE_FILES.filter((filePath) => !fs.existsSync(filePath)).map((filePath) =>
    path.relative(process.cwd(), filePath)
  )
  return { ok: missing.length === 0, missing }
}

async function fetchIpViaProxy(timeoutMs: number): Promise<string | null> {
  const { agent } = await resolveOutboundProxy()
  if (!agent) return null
  try {
    const res = await Promise.race([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      undiciFetch('https://api.ipify.org', { dispatcher: agent } as any),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs)),
    ])
    return (await (res as unknown as Response).text()).trim()
  } catch {
    return null
  }
}

export async function probeSidecar(timeoutMs = 5_000): Promise<SidecarProbeResult> {
  const url = process.env.SIDECAR_URL?.replace(/\/$/, '')
  if (!url) return { configured: false, ok: true, ms: 0 }
  const start = Date.now()
  try {
    const [res, vercelProxyIp] = await Promise.all([
      Promise.race([
        fetch(`${url}/health`),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs)),
      ]),
      fetchIpViaProxy(timeoutMs),
    ])
    if (!res.ok) {
      return { configured: true, ok: false, ms: Date.now() - start, error: `status ${res.status}` }
    }
    const body = await res.json().catch(() => null) as {
      proxyActive?: boolean
      ipProbe?: { serverIp?: string; proxyIp?: string; proxyOk?: boolean; checked?: boolean }
    } | null
    const proxyIp = body?.ipProbe?.proxyIp
    const ipsMatch = vercelProxyIp != null ? vercelProxyIp === proxyIp : undefined
    const ok = ipsMatch !== false
    return {
      configured: true,
      ok,
      ms: Date.now() - start,
      proxyActive: body?.proxyActive,
      proxyOk: body?.ipProbe?.proxyOk,
      serverIp: body?.ipProbe?.serverIp,
      proxyIp,
      ...(vercelProxyIp != null ? { vercelProxyIp, ipsMatch } : {}),
      ...(ipsMatch === false ? { error: `IP mismatch: vercel proxy egress ${vercelProxyIp} !== sidecar egress ${proxyIp}` } : {}),
    }
  } catch (err) {
    return { configured: true, ok: false, ms: Date.now() - start, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function probeAuthHandler(baseUrl: string, timeoutMs = 5_000): Promise<AuthProbeResult> {
  const start = Date.now()
  const probeUrl = new URL('/api/auth/sign-in/email', baseUrl)

  try {
    const probeRequest = new Request(probeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: probeUrl.origin,
      },
      body: JSON.stringify({ email: 'nobody-probe@example.com', password: 'wrongpassword' }),
    })
    const probeResponse = await Promise.race([
      auth.handler(probeRequest),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('auth probe timeout')), timeoutMs)
      ),
    ])
    const status = probeResponse.status
    const ok = status < 500
    return {
      ok,
      ms: Date.now() - start,
      status,
      ...(ok ? {} : { error: `unexpected status ${status}` }),
    }
  } catch (err) {
    return {
      ok: false,
      ms: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}