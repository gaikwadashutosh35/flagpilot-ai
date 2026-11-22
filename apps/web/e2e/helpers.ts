import { expect, type Page } from '@playwright/test'

export function watchFlagsmith(page: Page) {
  const hits: string[] = []
  page.on('request', (r) => {
    if (/(^|\.)flagsmith\.com$/.test(new URL(r.url()).hostname)) hits.push(r.url())
  })
  return hits
}

// Tab until the named control has focus, asserting every stop shows a focus style.
export async function tabTo(page: Page, name: string | RegExp) {
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

export const noHScroll = async (page: Page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)
