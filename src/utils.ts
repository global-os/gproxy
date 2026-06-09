const hostsToRegex = (hostPatterns: string[]): RegExp => {
  let combinedRegex = '(' + hostPatterns.join('|') + ')'
  return new RegExp(combinedRegex)
}

const removeLeadingSlash = (path: string): string => {
  return path.replace(/^\/+/, '')
}

export const pathFromHostnameAndPath = (
  hostname: string,
  path: string
): string => {
  // Extract hostname without port
  const hostWithoutPort = hostname.split(':')[0];
  
  // Instance subdomain: subdomain.app.dev.onetrueos.com or subdomain.app.onetrueos.com (but NOT app)
  const instanceMatch = hostWithoutPort.match(/^([a-z0-9]+)\.app(?:\.dev)?\.onetrueos\.com$/);
  if (instanceMatch && instanceMatch[1] !== 'app') {
    return '/instance/' + instanceMatch[1] + '/' + removeLeadingSlash(path);
  }
  
  // App domains: app.dev.onetrueos.com (dev), app.app.onetrueos.com (prod)
  if (hostWithoutPort === 'app.dev.onetrueos.com' || hostWithoutPort == 'app.app.dev.onetrueos.com' || hostWithoutPort === 'app.app.onetrueos.com') {

    // Needed to support Vite dev server ONLY
    if (path.startsWith('/assets/')) {
      return '/static' + path
    }

    if (path.startsWith('/static/')) {
      return path
    }
    return path === '/' ? '/app' : '/app/' + removeLeadingSlash(path);
  }
  
  // Fallback for unrecognized domains (e.g., Vercel preview URLs)
  return path
}