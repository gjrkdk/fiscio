const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')

const BASE_URL = 'http://localhost:3000'
const SCREENSHOTS_DIR = '/tmp/fiscio-screenshots'

fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })

async function screenshot(page, name) {
  const file = path.join(SCREENSHOTS_DIR, `${name}.png`)
  await page.screenshot({ path: file, fullPage: true })
  console.log(`📸 ${name}.png`)
  return file
}

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })

  try {
    // 1. Login pagina
    console.log('\n── Login pagina ──')
    await page.goto(`${BASE_URL}/login`)
    await page.waitForLoadState('networkidle')
    await screenshot(page, '1-login')

    // 2. Registreren
    console.log('\n── Registreren ──')
    await page.goto(`${BASE_URL}/register`)
    await page.waitForLoadState('networkidle')
    await screenshot(page, '2-register')

    // 3. Inloggen met test account (moet al bestaan in Supabase)
    console.log('\n── Inloggen ──')
    await page.goto(`${BASE_URL}/login`)
    await page.fill('input[name="email"]', 'test@fiscio.nl')
    await page.fill('input[name="password"]', 'testtest123')
    await screenshot(page, '3-login-filled')
    await page.click('button[type="submit"]')
    await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 8000 }).catch(() => {
      console.log('⚠️  Redirect naar dashboard mislukt (account bestaat mogelijk niet)')
    })

    const url = page.url()
    console.log('Huidige URL:', url)
    await screenshot(page, '4-na-login')

    if (url.includes('dashboard')) {
      // 4. Dashboard
      console.log('\n── Dashboard ──')
      await page.waitForLoadState('networkidle')
      await screenshot(page, '5-dashboard')

      // 5. Ritten pagina
      console.log('\n── Ritten ──')
      await page.goto(`${BASE_URL}/ritten`)
      await page.waitForLoadState('networkidle')
      await screenshot(page, '6-ritten-leeg')

      // 6. Rit toevoegen modal
      console.log('\n── Rit toevoegen ──')
      await page.click('button:has-text("Rit toevoegen")')
      await page.waitForSelector('text=Rit toevoegen', { state: 'visible' })
      await screenshot(page, '7-rit-modal')

      // Formulier invullen
      await page.fill('input[name="description"]', 'Klantbezoek Amsterdam')
      await page.fill('input[name="distanceKm"]', '42.5')
      await page.fill('input[name="startAddress"]', 'Thuis, Utrecht')
      await page.fill('input[name="endAddress"]', 'Klant BV, Amsterdam')
      await screenshot(page, '8-rit-form-ingevuld')

      // Opslaan
      await page.click('button:has-text("Opslaan")')
      await page.waitForLoadState('networkidle')
      await screenshot(page, '9-ritten-met-data')
      console.log('\n✅ Rit toegevoegd!')
    }

  } catch (err) {
    console.error('❌ Fout:', err.message)
    await screenshot(page, 'error')
  }

  await browser.close()
  console.log(`\nScreenshots in: ${SCREENSHOTS_DIR}`)
})()
