/**
 * Generates 16×16 zany desktop icon BMPs (24-bit, uncompressed).
 * Run: node scripts/generate-zany-icons.mjs
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(
  root,
  'fixtures/by-user',
  '*',
  '.Resources',
  'icons',
  '16x16'
)

/** @type {Record<string, [number, number, number]>} */
const P = {
  K: [8, 10, 18],
  W: [248, 252, 255],
  R: [255, 59, 92],
  O: [255, 140, 42],
  Y: [255, 220, 48],
  G: [46, 213, 115],
  T: [0, 210, 190],
  B: [58, 134, 255],
  P: [255, 105, 180],
  Pk: [255, 105, 180],
  V: [168, 85, 247],
  M: [120, 72, 220],
  N: [60, 40, 30],
  F: [255, 228, 180],
  S: [180, 190, 210],
  D: [40, 44, 62],
  L: [180, 255, 120],
}

function px(paletteKey) {
  const c = P[paletteKey]
  if (!c) throw new Error(`Unknown palette key: ${paletteKey}`)
  return c
}

/** 16 rows × 16 palette keys (top row first; BMP writer flips vertically). */
const icons = {
  'disco-ball': [
    '____KKKKKKKK____',
    '___KWWWWWWWWK___',
    '__KWBRTYVBRTYWK__',
    '_KWRGBYWRGBYWRK_',
    'KWBRTYVBRTYVBWK',
    'KWRGBYWRGBYWRWK',
    'KTYVBRTYVBRTYVK',
    'KYWRGBYWRGBYWRK',
    'KVBRTYVBRTYVBWK',
    'KWRGBYWRGBYWRWK',
    'KTYVBRTYVBRTYVK',
    '_KWRGBYWRGBYWRK_',
    '__KWBRTYVBRTYWK__',
    '___KWWWWWWWWK___',
    '____KKKKKKKK____',
    '________________',
  ],
  taco: [
    '________________',
    '_______OOO_______',
    '______OGGGO______',
    '_____OGLGGGO_____',
    '____OGLRRGGGO____',
    '___OGLRYRGGGO___',
    '___OGLGGGGGO___',
    '____OOOOOOO____',
    '_____NNNNN_____',
    '____NNNNNNN____',
    '___NNNNNNNNN___',
    '__NNNNNNNNNNN__',
    '________________',
    '________________',
    '________________',
    '________________',
  ],
  ufo: [
    '________________',
    '_______TTT_______',
    '______TLLT______',
    '_____TLLLLT_____',
    '____TTTTTTTT____',
    '___SSSSSSSSSS___',
    '___SGGGGGGGGS___',
    '___SGGBBBGGS___',
    '___SGGBBBGGS___',
    '___SSSSSSSSSS___',
    '_____YYYYY_____',
    '____YYYYYYY____',
    '________________',
    '________________',
    '________________',
    '________________',
  ],
  lightning: [
    '________________',
    '_______YY_______',
    '______YYY______',
    '_____YYYYY_____',
    '____YYYYYY_____',
    '___YYYY_K_______',
    '___YY__K_______',
    '______KKK_______',
    '_____KKKK______',
    '____KKKK_______',
    '___KKKK________',
    '__KKKK_________',
    '________________',
    '________________',
    '________________',
    '________________',
  ],
  rainbow: [
    '________________',
    '____RRRRRR_____',
    '___ROOOOOR_____',
    '__ROYYYYOR____',
    '__OYYYYYO_____',
    '_OYYGGYYO_____',
    '_OYGTTGYO_____',
    '_OYGTBTYO_____',
    '__OYGBYO______',
    '___OGBO_______',
    '____OOO_______',
    '________________',
    '________________',
    '________________',
    '________________',
    '________________',
  ],
  skull: [
    '________________',
    '_____WWWWW_____',
    '____WWWWWWW____',
    '___WWWKKWWW____',
    '___WWWKKWWW____',
    '___WWWWWWW_____',
    '____WWWWWWW____',
    '_____WWWWW_____',
    '_____W_W_W_____',
    '_____W_W_W_____',
    '____WW_W_WW____',
    '_____WWWWW_____',
    '________________',
    '________________',
    '________________',
    '________________',
  ],
  rocket: [
    '________________',
    '_______RR_______',
    '______RRRR______',
    '______RRRR______',
    '______SSSS______',
    '_____SSSSSS_____',
    '_____SSBBSS_____',
    '_____SSBBSS_____',
    '_____SSSSSS_____',
    '_____OOOOOO_____',
    '_____ORRRRO_____',
    '_____ORRRRO_____',
    '____OOORRROO____',
    '________________',
    '________________',
    '________________',
  ],
  pizza: [
    '________________',
    '_______OOO_______',
    '_____OOOOOOO_____',
    '____OOORROOO____',
    '___OOORRROOOO___',
    '___OOOGGOOOO___',
    '___OOOGGOOOO___',
    '____OOOOOOO____',
    '_____OOOOO_____',
    '______OOO_______',
    '________________',
    '________________',
    '________________',
    '________________',
    '________________',
    '________________',
  ],
  ghost: [
    '________________',
    '_____WWWWW_____',
    '____WWWWWWW____',
    '___WWWWWWWWW___',
    '___WWWKKWWW___',
    '___WWWKKWWW___',
    '___WWWWWWWWW___',
    '___WWWWWWWWW___',
    '___WWWWWWWWW___',
    '___WW_WW_WW___',
    '___W_WW_WW_W___',
    '________________',
    '________________',
    '________________',
    '________________',
    '________________',
  ],
  alien: [
    '________________',
    '_____GGGGG_____',
    '____GGGGGGG____',
    '___GGGBBGGG___',
    '___GGBBBBGG___',
    '___GGGBBGGG___',
    '____GGGGGGG____',
    '_____GGGGG_____',
    '_____G_G_G_____',
    '____GGGGGGG____',
    '____G_G_G_G____',
    '_____GGGGG_____',
    '________________',
    '________________',
    '________________',
    '________________',
  ],
  flame: [
    '________________',
    '_______YY_______',
    '______YOOY______',
    '_____YOORYO_____',
    '_____YORRYO_____',
    '____YOORRYO____',
    '____YORRRYO____',
    '_____ORRRO_____',
    '_____ORRRO_____',
    '_____OOOOO_____',
    '_____ORRRO_____',
    '________________',
    '________________',
    '________________',
    '________________',
    '________________',
  ],
  star: [
    '________________',
    '_______YY_______',
    '_______YY_______',
    '______YYYY______',
    '______YYYY______',
    'YYYYYYYYYYYYYYYY',
    '__YYYYYYYYYYYY__',
    '___YYYYYYYYYY___',
    '____YYYYYYYY____',
    '_____YYYYYY_____',
    '______YYYY______',
    '_______YY_______',
    '________________',
    '________________',
    '________________',
    '________________',
  ],
  heart: [
    '________________',
    '_____RR__RR_____',
    '____RRRRRRRR____',
    '____RRRRRRRR____',
    '_____RRRRRR_____',
    '______RRRR______',
    '_______RR_______',
    '________R_______',
    '________________',
    '________________',
    '________________',
    '________________',
    '________________',
    '________________',
    '________________',
    '________________',
  ],
  mushroom: [
    '________________',
    '_____RRRRR_____',
    '____RRRRRRR____',
    '___RRRWRRRRR___',
    '___RRRRRRRRR___',
    '____RRRRRRR____',
    '_____FFFFF_____',
    '_____FFFFF_____',
    '_____FFFFF_____',
    '_____FFFFF_____',
    '_____FFFFF_____',
    '________________',
    '________________',
    '________________',
    '________________',
    '________________',
  ],
  robot: [
    '________________',
    '_____SSSSS_____',
    '____SSSSSSS____',
    '___SSBSSBSS___',
    '___SSSSSSSS___',
    '____SSSSSSS____',
    '_____SSSSS_____',
    '_____SSSSS_____',
    '____SS_S_SS____',
    '____SS_S_SS____',
    '____SSSSSSS____',
    '________________',
    '________________',
    '________________',
    '________________',
    '________________',
  ],
  frog: [
    '________________',
    '_____GGGGG_____',
    '____GGGGGGG____',
    '___GGBBBBGG___',
    '___GGBBBBGG___',
    '___GGGGGGGG___',
    '____GGGGGGG____',
    '_____GGGGG_____',
    '____GG___GG____',
    '____GG___GG____',
    '________________',
    '________________',
    '________________',
    '________________',
    '________________',
    '________________',
  ],
  eye: [
    '________________',
    '_____WWWWW_____',
    '____WWWWWWW____',
    '___WWBBBBBWW___',
    '___WWBKKKBWW___',
    '___WWBKKKBWW___',
    '___WWBBBBBWW___',
    '____WWWWWWW____',
    '_____WWWWW_____',
    '________________',
    '________________',
    '________________',
    '________________',
    '________________',
    '________________',
    '________________',
  ],
  gem: [
    '________________',
    '_______TT_______',
    '______TTTT______',
    '_____TBBBBT_____',
    '____TBBBBBBT____',
    '___TBBBBBBBBT___',
    '____TBBBBBBT____',
    '_____TBBBBT_____',
    '______TTTT______',
    '_______TT_______',
    '________________',
    '________________',
    '________________',
    '________________',
    '________________',
    '________________',
  ],
  bomb: [
    '________________',
    '_______OO_______',
    '______OOO_______',
    '_____OOOOO_____',
    '_____OOOOO_____',
    '_____OOOOO_____',
    '_____OOOOO_____',
    '_____OOOOO_____',
    '_____OOOOO_____',
    '_____NNNNN_____',
    '_____YYYYY_____',
    '________________',
    '________________',
    '________________',
    '________________',
    '________________',
  ],
  donut: [
    '________________',
    '_____PPPPP_____',
    '____PPPPPPP____',
    '___PPPKKPPP___',
    '___PPPKKPPP___',
    '___PPPPPPPP___',
    '____PPPPPPP____',
    '_____PPPPP_____',
    '________________',
    '________________',
    '________________',
    '________________',
    '________________',
    '________________',
    '________________',
    '________________',
  ],
  crown: [
    '________________',
    '____Y___Y___Y____',
    '____YYYYYYYY____',
    '____YYYYYYYY____',
    '____YYYYYYYY____',
    '____YYYYYYYY____',
    '____OOOOOOOO____',
    '____OOOOOOOO____',
    '________________',
    '________________',
    '________________',
    '________________',
    '________________',
    '________________',
    '________________',
    '________________',
  ],
  wizard: [
    '________________',
    '_______MM_______',
    '______MMMM______',
    '_____MMMMMM_____',
    '____MMMMMMM_____',
    '___MMMMMMMM____',
    '__MMMMMMMMM____',
    '_____FFFFF_____',
    '_____FFFFF_____',
    '_____FFFFF_____',
    '_____FFFFF_____',
    '________________',
    '________________',
    '________________',
    '________________',
    '________________',
  ],
  banana: [
    '________________',
    '___________YY__',
    '__________YYY__',
    '_________YYY___',
    '________YYY____',
    '_______YYY_____',
    '______YYY______',
    '_____YYY_______',
    '____YYY________',
    '___YYY_________',
    '__YYY__________',
    '_YYY___________',
    '________________',
    '________________',
    '________________',
    '________________',
  ],
  watermelon: [
    '________________',
    '_____GGGGG_____',
    '____GGGGGGG____',
    '___GGRRGRRG___',
    '___GGRRGRRG___',
    '___GGGRGGGG___',
    '____GGGGGGG____',
    '_____GGGGG_____',
    '________________',
    '________________',
    '________________',
    '________________',
    '________________',
    '________________',
    '________________',
    '________________',
  ],
  hotdog: [
    '________________',
    '________________',
    '_____OOOOO_____',
    '____OOOOOOO____',
    '___ORRRRRRO___',
    '___ORRYYRRO___',
    '___ORRRRRRO___',
    '____OOOOOOO____',
    '_____OOOOO_____',
    '________________',
    '________________',
    '________________',
    '________________',
    '________________',
    '________________',
    '________________',
  ],
  pretzel: [
    '________________',
    '_____OOOOO_____',
    '____OO___OO____',
    '___OO_____OO___',
    '___OO____OO____',
    '____OO___OO____',
    '_____OOOOO_____',
    '____OO___OO____',
    '___OO____OO____',
    '___OO_____OO___',
    '____OO___OO____',
    '_____OOOOO_____',
    '________________',
    '________________',
    '________________',
    '________________',
  ],
  cat: [
    '________________',
    '____N_____N_____',
    '___NN_____NN____',
    '___NNNNNNNNN____',
    '___NNBNNBNN____',
    '___NNNNNNNN____',
    '____NNNNNNN_____',
    '_____NNNNN_____',
    '_____N_N_N_____',
    '____NN___NN____',
    '________________',
    '________________',
    '________________',
    '________________',
    '________________',
    '________________',
  ],
  sparkle: [
    '________________',
    '_______WW_______',
    '_______WW_______',
    '_______WW_______',
    'WWWWWWWWWWWWWWWW',
    '_______WW_______',
    '_______WW_______',
    '_______WW_______',
    '____WW____WW____',
    '_____WW__WW_____',
    '______WWWW______',
    '________________',
    '________________',
    '________________',
    '________________',
    '________________',
  ],
}

function normalizeRow(row) {
  let r = row
  while (r.length > 16 && (r.startsWith('_') || r.endsWith('_'))) {
    if (r.startsWith('_')) r = r.slice(1)
    else if (r.endsWith('_')) r = r.slice(0, -1)
    else break
  }
  if (r.length > 16) r = r.slice(0, 16)
  if (r.length < 16) {
    const left = Math.floor((16 - r.length) / 2)
    r = '_'.repeat(left) + r + '_'.repeat(16 - r.length - left)
  }
  return r
}

function rowToPixels(row) {
  const normalized = normalizeRow(row)
  return [...normalized].map((ch) => (ch === '_' ? null : px(ch)))
}

function encodeBmp16(pixelsTopFirst) {
  const w = 16
  const h = 16
  const rowBytes = w * 3
  const pixelDataSize = rowBytes * h
  const fileSize = 14 + 40 + pixelDataSize
  const buf = Buffer.alloc(fileSize)

  // BITMAPFILEHEADER
  buf.write('BM', 0)
  buf.writeUInt32LE(fileSize, 2)
  buf.writeUInt32LE(0, 6)
  buf.writeUInt32LE(14 + 40, 10)

  // BITMAPINFOHEADER
  buf.writeUInt32LE(40, 14)
  buf.writeInt32LE(w, 18)
  buf.writeInt32LE(h, 22)
  buf.writeUInt16LE(1, 26)
  buf.writeUInt16LE(24, 28)
  buf.writeUInt32LE(0, 30)
  buf.writeUInt32LE(pixelDataSize, 34)
  buf.writeInt32LE(2835, 38)
  buf.writeInt32LE(2835, 42)
  buf.writeUInt32LE(0, 46)
  buf.writeUInt32LE(0, 50)

  let offset = 54
  for (let y = h - 1; y >= 0; y -= 1) {
    const row = pixelsTopFirst[y]
    for (let x = 0; x < w; x += 1) {
      const rgb = row[x] ?? P.K
      buf[offset++] = rgb[2]
      buf[offset++] = rgb[1]
      buf[offset++] = rgb[0]
    }
  }

  return buf
}

await fs.mkdir(outDir, { recursive: true })

const names = Object.keys(icons)
for (const name of names) {
  const rows = icons[name]
  if (rows.length !== 16) throw new Error(`${name}: expected 16 rows`)
  const pixels = rows.map(rowToPixels)
  const bmp = encodeBmp16(pixels)
  await fs.writeFile(path.join(outDir, `${name}.bmp`), bmp)
}

const manifest = names.map((name) => ({
  name,
  file: `${name}.bmp`,
  size: 16,
}))

await fs.writeFile(
  path.join(outDir, 'manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`
)

console.log(`Wrote ${names.length} BMP icons to ${outDir}`)
console.log(names.join(', '))
