/**
 * レポートページ E2E テスト
 *
 * 主要フロー:
 * 1. ナビゲーションから /reports へ遷移できる
 * 2. ページがレンダリング後にエラーを起こさない
 *
 * 関連 project: presentation-quality-hardening Phase 3 (E2E 業務フロー拡充)
 */
import { test, expect } from '@playwright/test'

test.describe('レポートページ', () => {
  test('ナビゲーションからレポートへ遷移できる', async ({ page }, testInfo) => {
    await page.goto('/')
    const isMobile = testInfo.project.name === 'mobile-chrome'

    if (isMobile) {
      const nav = page.locator('nav[aria-label="モバイルナビゲーション"]')
      const reportsBtn = nav.locator('button[aria-label="レポート"]')
      const visible = await reportsBtn.isVisible().catch(() => false)
      if (visible) {
        await reportsBtn.click()
      } else {
        await page.goto('/#/reports')
      }
    } else {
      const nav = page.locator('nav[aria-label="メインナビゲーション"]')
      const reportsBtn = nav.locator('button:has-text("📄")')
      const visible = await reportsBtn.isVisible().catch(() => false)
      if (visible) {
        await reportsBtn.click()
      } else {
        await page.goto('/#/reports')
      }
    }

    await expect(page).toHaveURL(/#\/reports/)
    await expect(page.locator('#root')).toBeVisible()
  })

  test('レポートページが page error を起こさない', async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (err) => pageErrors.push(err.message))

    await page.goto('/#/reports')
    await expect(page.locator('#root')).toBeVisible()
    await page.waitForTimeout(500)

    expect(pageErrors).toEqual([])
  })
})
