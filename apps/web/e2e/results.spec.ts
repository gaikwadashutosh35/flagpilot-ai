import { expect, test } from '@playwright/test'
import { noHScroll, tabTo, watchFlagsmith } from './helpers'

test('results page shows the committed snapshot state', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  const hits = watchFlagsmith(page)

  await page.goto('/results')
  await expect(page.getByText('No experiment running yet.')).toBeVisible()
  await expect(page.getByText('Snapshot updated by the project owner via the Flagsmith CLI')).toBeVisible()

  // Keyboard-only: reach /results from the TopBar link.
  await page.goto('/')
  await tabTo(page, 'Results')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/results$/)
  await expect(page.getByText('No experiment running yet.')).toBeVisible()
  await noHScroll(page)
  expect(hits).toEqual([])
})
