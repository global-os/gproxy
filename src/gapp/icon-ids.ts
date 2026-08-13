/** 16×16 zany icons shipped under .Resources/icons/16x16/ (fixture seed). */
export const ZANY_ICON_IDS = [
  'alien',
  'banana',
  'bomb',
  'cat',
  'crown',
  'disco-ball',
  'donut',
  'eye',
  'flame',
  'frog',
  'gem',
  'ghost',
  'heart',
  'hotdog',
  'lightning',
  'mushroom',
  'pizza',
  'pretzel',
  'rainbow',
  'robot',
  'rocket',
  'skull',
  'sparkle',
  'star',
  'taco',
  'ufo',
  'watermelon',
  'wizard',
] as const

export type ZanyIconId = (typeof ZANY_ICON_IDS)[number]

export const RESOURCE_ICONS_DIR = '/.Resources/icons/16x16'

const iconSet = new Set<string>(ZANY_ICON_IDS)

const RESOURCE_ICON_PATH_RE = /^\/\.Resources\/icons\/16x16\/[a-z0-9-]+\.bmp$/

export function isZanyIconId(value: string): value is ZanyIconId {
  return iconSet.has(value)
}

export function isResourceIconPath(value: string): boolean {
  return RESOURCE_ICON_PATH_RE.test(value)
}

export function resourceIconPath(iconId: ZanyIconId): string {
  return `${RESOURCE_ICONS_DIR}/${iconId}.bmp`
}

/** Canonical absolute path from gapp.json icon or legacy short id. */
export function normalizeResourceIconPath(value: string): string | null {
  if (isResourceIconPath(value)) return value
  if (isZanyIconId(value)) return resourceIconPath(value)
  return null
}
