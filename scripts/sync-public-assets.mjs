import fs from 'node:fs'
import path from 'node:path'

// Browser bundles must be served as static files from `public/`.
// If they are listed in `includeFiles`, Vercel compiles them to CommonJS
// for the Node.js function, which breaks them in the browser.
const publicDir = path.join(process.cwd(), 'public')
const distDir = path.join(process.cwd(), 'src/frontend/dist')
const distAssetsDir = path.join(distDir, 'assets')
const publicAssetsDir = path.join(publicDir, 'assets')

fs.mkdirSync(publicDir, { recursive: true })

if (fs.existsSync(distAssetsDir)) {
  fs.rmSync(publicAssetsDir, { recursive: true, force: true })
  fs.cpSync(distAssetsDir, publicAssetsDir, { recursive: true })
}

for (const file of ['index.html', 'vite.svg']) {
  const source = path.join(distDir, file)
  if (fs.existsSync(source)) {
    fs.copyFileSync(source, path.join(publicDir, file))
  }
}

console.log('Synced browser assets to public/')