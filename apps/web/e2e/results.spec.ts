import { expect, test } from '@playwright/test'
import { noHScroll, tabTo, watchFlagsmith } from './helpers'

test('results page shows the committed snapshot state', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  const hits = watchFlagsmith(page)

  await page.goto('/results')
  await expect(page.getByText(/^From Flagsmith/)).toBeVisible()
  await expect(page.getByText('Snapshot unreadable')).toHaveCount(0)
  await expect(page.getByText('Snapshot updated by the project owner via the Flagsmith CLI')).toBeVisible()

  // Keyboard-only: reach /results from the TopBar link.
  await page.goto('/')
  await tabTo(page, 'Results')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/results$/)
  await expect(page.getByText(/^From Flagsmith/)).toBeVisible()
  await expect(page.getByText('Snapshot unreadable')).toHaveCount(0)
  await noHScroll(page)
  // The table scrolls sideways at 375 px; its wrapper must be reachable by keyboard.
  await tabTo(page, 'Demo completed (metric 319)')
  await expect(page.getByRole('region', { name: 'Demo completed (metric 319)' })).toBeFocused()
  await noHScroll(page)
  expect(hits).toEqual([])
})
