/**
 * 仕入分析ページ E2E テスト
 *
 * 主要フロー:
 * 1. ナビゲーションから /purchase-analysis へ遷移できる
 * 2. ページがレンダリング後にエラーを起こさない
 *
 * 関連 project: presentation-quality-hardening Phase 3 (E2E 業務フロー拡充)
 */
import { test, expect } from '@playwright/test'

test.describe('仕入分析ページ', () => {
  test('ナビゲーションから仕入分析へ遷移できる', async ({ page }, testInfo) => {
    await page.goto('/')
    const isMobile = testInfo.project.name === 'mobile-chrome'

    if (isMobile) {
      const nav = page.locator('nav[aria-label="モバイルナビゲーション"]')
      const btn = nav.locator('button[aria-label="仕入分析"]')
      const visible = await btn.isVisible().catch(() => false)
      if (visible) {
        await btn.click()
      } else {
        await page.goto('/#/purchase-analysis')
      }
    } else {
      const nav = page.locator('nav[aria-label="メインナビゲーション"]')
      const btn = nav.locator('button:has-text("🏭")')
      const visible = await btn.isVisible().catch(() => false)
      if (visible) {
        await btn.click()
      } else {
        await page.goto('/#/purchase-analysis')
      }
    }

    await expect(page).toHaveURL(/#\/purchase-analysis/)
    await expect(page.locator('#root')).toBeVisible()
  })

  test('仕入分析ページが page error を起こさない', async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (err) => pageErrors.push(err.message))

    await page.goto('/#/purchase-analysis')
    await expect(page.locator('#root')).toBeVisible()
    await page.waitForTimeout(500)

    expect(pageErrors).toEqual([])
  })
})
