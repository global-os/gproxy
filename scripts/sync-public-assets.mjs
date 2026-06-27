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

// Do not copy index.html to public/ — it would be served for every hostname
// (including *.app.onetrueos.com) and shadow instance iframes.
for (const file of ['vite.svg']) {
  const source = path.join(distDir, file)
  if (fs.existsSync(source)) {
    fs.copyFileSync(source, path.join(publicDir, file))
  }
}

const storybookDist = path.join(process.cwd(), 'src/frontend/storybook-static')
const publicStorybook = path.join(publicDir, 'storybook')

if (fs.existsSync(storybookDist)) {
  fs.rmSync(publicStorybook, { recursive: true, force: true })
  fs.cpSync(storybookDist, publicStorybook, { recursive: true })
  console.log('Synced storybook to public/storybook/')
}

console.log('Synced browser assets to public/')