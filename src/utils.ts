import pm from 'picomatch'

const removeLeadingSlash = (path: string) => path.replace(/^\/+/, '')

const appPath = (path: string) => {
  if (path.startsWith('/assets/') || path.startsWith('/static/')) return path
  if (path === '/health') return path
  return path === '/' ? '/app' : '/app/' + removeLeadingSlash(path)
}

const instancePath = (host: string, path: string) => {
  const slug = host.split('.')[0]
  return '/instance/' + slug + '/' + removeLeadingSlash(path)
}

const rules: [ReturnType<typeof pm>, (host: string, path: string) => string][] = [
  [pm('www.onetrueos.com'),           (_h, p)  => p === '/' ? '/www' : p],
  [pm('onetrueos.com'),               (_h, _p) => '/www-redirect'],
  [pm('app.app.onetrueos.com'),       (_h, p)  => appPath(p)],
  [pm('app.dev.onetrueos.com'),       (_h, p)  => appPath(p)],
  [pm('app.app.dev.onetrueos.com'),   (_h, p)  => appPath(p)],
  [pm('global-os-git-*-philip-petersons-projects.vercel.app'), (_h, p)  => appPath(p)],
  [pm('*.vercel.app'),                (_h, p)  => appPath(p)],
  [pm('*.app.onetrueos.com'),         (h, p)   => instancePath(h, p)],
  [pm('*.app.dev.onetrueos.com'),     (h, p)   => instancePath(h, p)],
]

export const pathFromHostnameAndPath = (hostname: string, path: string): string => {
  const host = hostname.split(':')[0]

  for (const [match, handler] of rules) {
    if (match(host)) return handler(host, path)
  }

  // Fallback for unrecognized domains
  return path
}
