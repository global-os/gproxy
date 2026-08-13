export function validateTbundlePath(path: string): string | null {
  if (!path) return 'path is empty'
  if (path.startsWith('/')) return 'path must be relative'
  if (path.includes('\\')) return 'path must use forward slashes'
  if (path.includes(';')) return 'semicolon in path is reserved for v2'
  if (path.includes('..')) return 'path must not contain ..'
  for (const segment of path.split('/')) {
    if (segment === '.' || segment === '..') {
      return 'path must not contain . or .. segments'
    }
  }
  return null
}
