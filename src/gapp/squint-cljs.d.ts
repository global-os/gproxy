declare module 'squint-cljs/node-api.js' {
  export function compileString(
    source: string,
    opts?: { extension?: string; filename?: string }
  ): Promise<{ javascript?: string }>
}
