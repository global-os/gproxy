export type SquintCompileSpec = {
  source: string
  output: string
  externals?: Record<string, string>
}

export type GappDependencySpec = {
  version: string
  source: 'bundled' | 'cdn' | 'platform'
  format: 'iife' | 'esm' | 'importmap'
  path?: string
  url?: string
  global?: string
  order?: number
}

export type GappManifest = {
  name?: string
  version?: string
  /** Absolute path to a 16×16 BMP under .Resources/icons/16x16/ */
  icon?: string
  entry?: string
  type?: 'classic' | 'module'
  compile?: {
    squint?: SquintCompileSpec
  }
  dependencies?: Record<string, GappDependencySpec>
  /** ESM platform libs resolved via import map. Values are semver ranges. */
  deps?: Record<string, string>
}