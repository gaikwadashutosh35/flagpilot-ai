import { expect, test, type Page } from '@playwright/test'

function watchFlagsmith(page: Page) {
  const hits: string[] = []
  page.on('request', (r) => {
    if (/(^|\.)flagsmith\.com$/.test(new URL(r.url()).hostname)) hits.push(r.url())
  })
  return hits
}

test('visitor completes the demo without Flagsmith', async ({ page }) => {
  const hits = watchFlagsmith(page)
  await page.goto('/')
  await page.getByRole('button', { name: 'Create your first experiment' }).click()
  await expect(page).toHaveURL(/\/copilot$/)
  await page.getByRole('button', { name: /benefit-oriented/i }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByLabel('Flag key')).toHaveValue('flagpilot_onboarding_cta')
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('checkbox', { name: 'I reviewed this plan' }).check()
  await page.getByRole('button', { name: 'Approve plan' }).click()
  await expect(page.getByText('Plan approved')).toBeVisible()
  await expect(page.getByText('Flagsmith unavailable')).toBeVisible()
  expect(hits).toEqual([])
})

test('keyboard-only at phone width', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  const hits = watchFlagsmith(page)

  // Tab until the named control has focus, asserting every stop shows a focus style.
  async function tabTo(name: string | RegExp) {
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab')
      const info = await page.evaluate(() => {
        const n = document.activeElement as HTMLElement
        if (n === document.body) return null // focus wrapped through the browser chrome
        const s = getComputedStyle(n)
        const ring = /(rgb|oklab|oklch|lab|lch|color)\(/.test(s.boxShadow.replaceAll('rgba(0, 0, 0, 0)', ''))
        const visible = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || ring
        const label = n.getAttribute('aria-label') ?? n.innerText ?? ''
        const labelled = (n as HTMLInputElement).labels?.[0]?.textContent ?? document.getElementById(n.getAttribute('aria-labelledby') ?? '')?.textContent ?? ''
        return { visible, label: label.trim(), labelled: labelled.trim() }
      })
      if (!info) continue
      expect(info.visible, `focus style visible on "${info.label || info.labelled}"`).toBe(true)
      const match = (t: string) => (typeof name === 'string' ? t === name : name.test(t))
      if (match(info.label) || match(info.labelled)) return
    }
    throw new Error(`could not Tab to ${name}`)
  }
  const noHScroll = async () =>
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)

  await page.goto('/')
  await noHScroll()
  await tabTo('Create your first experiment')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/copilot$/)
  await noHScroll()
  await tabTo(/benefit-oriented/i)
  await page.keyboard.press('Enter')
  await tabTo('Next')
  await page.keyboard.press('Enter')
  await expect(page.getByLabel('Flag key')).toHaveValue('flagpilot_onboarding_cta')
  await noHScroll()
  await tabTo('Next')
  await page.keyboard.press('Enter')
  await tabTo('I reviewed this plan')
  await page.keyboard.press('Space')
  await tabTo('Approve plan')
  await page.keyboard.press('Enter')
  await expect(page.getByText('Plan approved')).toBeVisible()
  await expect(page.getByText('Flagsmith unavailable')).toBeVisible()
  await noHScroll()
  expect(hits).toEqual([])
})
