import { chromium } from 'patchright'

const USERNAME = process.env.X_LOGIN_USERNAME
const PASSWORD = process.env.X_LOGIN_PASSWORD
const SLUG = process.argv[2] || '1wwcn295'

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36'

if (!USERNAME || !PASSWORD) {
  console.error('Set X_LOGIN_USERNAME and X_LOGIN_PASSWORD before running login-test.mjs')
  process.exit(1)
}

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1280, height: 900 } })
const page = await ctx.newPage()

page.on('console', (m) => {
  if (m.type() === 'error' && !/Failed to load resource/.test(m.text()))
    console.log('[console.error]', m.text().slice(0, 250))
})
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 250)))
page.on('response', (r) => {
  const s = r.status()
  if (s >= 400 && !/\.(png|jpg|svg|woff2?|css)/.test(r.url()))
    console.log(`[${s}] ${r.request().method()} ${r.url().slice(0, 110)}`)
})

async function dump(label) {
  const info = await page.evaluate(() => ({
    url: location.href,
    text: (document.body ? document.body.innerText : '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 300),
    inputs: Array.from(document.querySelectorAll('input')).map((i) => ({
      name: i.name,
      type: i.type,
      autocomplete: i.autocomplete,
    })),
  }))
  console.log(`\n=== ${label} ===`)
  console.log('url:    ', info.url)
  console.log('text:   ', info.text)
  console.log('inputs: ', JSON.stringify(info.inputs))
}

async function fillFirst(name, value) {
  const el = page.locator(`input[name="${name}"]`).first()
  if (await el.count()) {
    await el.fill(value)
    console.log(`[fill] ${name} <- ${value}`)
    return true
  }
  console.log(`[fill] ${name}: not found`)
  return false
}

async function clickExact(text, label) {
  const el = page.getByText(text, { exact: true }).first()
  if (!(await el.count())) {
    console.log(`[click] ${label}: no "${text}"`)
    return false
  }
  try {
    await el.click({ force: true })
    console.log(`[click] ${label}`)
    return true
  } catch (e) {
    console.log(`[click] ${label} failed:`, e.message.slice(0, 100))
    return false
  }
}

await page.goto(
  `https://${SLUG}.app.onetrueos.com/i/jf/onboarding/web?mode=login&redirect_after_login=%2F`,
  { waitUntil: 'domcontentloaded', timeout: 60000 }
)
await page.waitForTimeout(6000)
await dump('login page')

if (!(await fillFirst('username_or_email', USERNAME))) {
  console.log('\nRESULT: no username input')
  await browser.close()
  process.exit(1)
}
if (!(await clickExact('Continue', 'continue'))) await page.keyboard.press('Enter')
await page.waitForTimeout(5000)
await dump('after username')

if (!(await fillFirst('password', PASSWORD))) {
  console.log('\nRESULT: no password input after username')
  await browser.close()
  process.exit(1)
}
if (!(await clickExact('Log in', 'log in'))) await page.keyboard.press('Enter')
await page.waitForTimeout(9000)
await dump('after password')

const result = await page.evaluate(() => ({
  text: (document.body ? document.body.innerText : '').replace(/\s+/g, ' ').trim().slice(0, 500),
  timeline: !!document.querySelector('[data-testid="primaryColumn"], [data-testid="tweet"]'),
  challenge: !!document.querySelector('[data-testid="ocfEnterTextTextInput"]'),
}))
console.log('\n=== RESULT ===')
console.log('timeline present:', result.timeline)
console.log('challenge present:', result.challenge)
console.log('final text:', result.text)

await browser.close()
