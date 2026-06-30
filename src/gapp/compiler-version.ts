import { getBuildVersion } from '../build-version.js'

export const COMPILER_CACHE_KEY = getBuildVersion().sha
