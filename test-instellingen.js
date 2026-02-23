const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')

const BASE_URL = 'http://localhost:3000'
const DIR = '/tmp/fiscio-screenshots'
fs.mkdirSync(DIR, { recursive: true })

const ss = (page, name) => page.screenshot({ path: path.join(DIR, `${name}.png`), fullPage: true }).then(() => console.log(`📸 ${name}.png`))

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })

  try {
    // Inloggen
    await page.goto(`${BASE_URL}/login`)
    await page.fill('input[name="email"]', 'test@fiscio.nl')
    await page.fill('input[name="password"]', 'testtest123')
    await page.click('button[type="submit"]')
    await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 8000 })

    // Instellingen pagina
    console.log('\n── Instellingen ──')
    await page.goto(`${BASE_URL}/instellingen`)
    await page.waitForLoadState('networkidle')
    await ss(page, 'instellingen-leeg')

    // Formulier invullen
    await page.fill('input[name="fullName"]', 'Robin Konijnendijk')
    await page.fill('input[name="companyName"]', 'RK Development')
    await page.fill('input[name="kvkNumber"]', '12345678')
    await page.fill('input[name="btwNumber"]', 'NL123456789B01')
    await page.fill('input[name="iban"]', 'NL91 ABNA 0417 1643 00')
    await page.fill('input[name="address"]', 'Hoofdstraat 1')
    await page.fill('input[name="zipCode"]', '1234 AB')
    await page.fill('input[name="city"]', 'Utrecht')
    await ss(page, 'instellingen-ingevuld')

    // Opslaan
    await page.click('button[type="submit"]')
    await page.waitForSelector('text=Opgeslagen', { timeout: 5000 })
    await ss(page, 'instellingen-opgeslagen')
    console.log('✅ Instellingen opgeslagen!')

    // Check sidebar heeft Instellingen
    const navLinks = await page.$$eval('nav a', links => links.map(l => l.textContent))
    console.log('Sidebar nav:', navLinks)

  } catch (err) {
    console.error('❌ Fout:', err.message)
    await ss(page, 'error-instellingen')
  }

  await browser.close()
})()
