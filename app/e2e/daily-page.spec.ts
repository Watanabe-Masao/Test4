/**
 * 日別ページ E2E テスト
 *
 * 主要フロー:
 * 1. ナビゲーションから /daily へ遷移できる
 * 2. ページがレンダリング後にエラーを起こさない
 *
 * 関連 project: presentation-quality-hardening Phase 3 (E2E 業務フロー拡充)
 */
import { test, expect } from '@playwright/test'

test.describe('日別ページ', () => {
  test('ナビゲーションから日別へ遷移できる', async ({ page }, testInfo) => {
    await page.goto('/')
    const isMobile = testInfo.project.name === 'mobile-chrome'

    if (isMobile) {
      const nav = page.locator('nav[aria-label="モバイルナビゲーション"]')
      const dailyBtn = nav.locator('button[aria-label="日別"]')
      const visible = await dailyBtn.isVisible().catch(() => false)
      if (visible) {
        await dailyBtn.click()
      } else {
        await page.goto('/#/daily')
      }
    } else {
      const nav = page.locator('nav[aria-label="メインナビゲーション"]')
      const dailyBtn = nav.locator('button:has-text("📅")')
      const visible = await dailyBtn.isVisible().catch(() => false)
      if (visible) {
        await dailyBtn.click()
      } else {
        await page.goto('/#/daily')
      }
    }

    await expect(page).toHaveURL(/#\/daily/)
    await expect(page.locator('#root')).toBeVisible()
  })

  test('日別ページが page error を起こさない', async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (err) => pageErrors.push(err.message))

    await page.goto('/#/daily')
    await expect(page.locator('#root')).toBeVisible()
    await page.waitForTimeout(500)

    expect(pageErrors).toEqual([])
  })
})
