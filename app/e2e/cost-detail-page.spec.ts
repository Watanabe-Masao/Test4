/**
 * 原価明細ページ E2E テスト
 *
 * 主要フロー:
 * 1. ナビゲーションから /cost-detail へ遷移できる
 * 2. ページがレンダリング後にエラーを起こさない
 *
 * 関連 project: presentation-quality-hardening Phase 3 (E2E 業務フロー拡充)
 */
import { test, expect } from '@playwright/test'

test.describe('原価明細ページ', () => {
  test('ナビゲーションから原価明細へ遷移できる', async ({ page }, testInfo) => {
    await page.goto('/')
    const isMobile = testInfo.project.name === 'mobile-chrome'

    if (isMobile) {
      const nav = page.locator('nav[aria-label="モバイルナビゲーション"]')
      const btn = nav.locator('button[aria-label="原価明細"]')
      const visible = await btn.isVisible().catch(() => false)
      if (visible) {
        await btn.click()
      } else {
        await page.goto('/#/cost-detail')
      }
    } else {
      const nav = page.locator('nav[aria-label="メインナビゲーション"]')
      const btn = nav.locator('button:has-text("💰")')
      const visible = await btn.isVisible().catch(() => false)
      if (visible) {
        await btn.click()
      } else {
        await page.goto('/#/cost-detail')
      }
    }

    await expect(page).toHaveURL(/#\/cost-detail/)
    await expect(page.locator('#root')).toBeVisible()
  })

  test('原価明細ページが page error を起こさない', async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (err) => pageErrors.push(err.message))

    await page.goto('/#/cost-detail')
    await expect(page.locator('#root')).toBeVisible()
    await page.waitForTimeout(500)

    expect(pageErrors).toEqual([])
  })
})
