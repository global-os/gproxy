/** Normalize line endings and strip an optional UTF-8 BOM. */
export function normalizeTbundleSource(source: string): string {
  return source
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
}
