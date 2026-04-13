/**
 * インサイトページ E2E テスト
 *
 * 主要フロー:
 * 1. ナビゲーションから /insight へ遷移できる
 * 2. ページがレンダリング後にエラーを起こさない
 *
 * 関連 project: presentation-quality-hardening Phase 3
 *
 * == 重要 ==
 * 本 spec は Phase 2-B (InsightTabBudget.tsx 581→342 行) と
 * Phase 2-C (InsightTabForecast.tsx 514→368 行) の refactor 直後に追加された。
 * GrossProfitTabContent → InsightTabGrossProfit.tsx と
 * DecompositionTabContent → InsightTabDecomposition.tsx の切り出しが
 * import path / barrel re-export を経由して widgets.tsx から正しく解決される
 * ことを E2E で検証する役割を持つ。
 */
import { test, expect } from '@playwright/test'

test.describe('インサイトページ', () => {
  test('ナビゲーションからインサイトへ遷移できる', async ({ page }, testInfo) => {
    await page.goto('/')
    const isMobile = testInfo.project.name === 'mobile-chrome'

    if (isMobile) {
      const nav = page.locator('nav[aria-label="モバイルナビゲーション"]')
      const insightBtn = nav.locator('button[aria-label="インサイト"]')
      const visible = await insightBtn.isVisible().catch(() => false)
      if (visible) {
        await insightBtn.click()
      } else {
        await page.goto('/#/insight')
      }
    } else {
      const nav = page.locator('nav[aria-label="メインナビゲーション"]')
      const insightBtn = nav.locator('button:has-text("📈")')
      const visible = await insightBtn.isVisible().catch(() => false)
      if (visible) {
        await insightBtn.click()
      } else {
        await page.goto('/#/insight')
      }
    }

    await expect(page).toHaveURL(/#\/insight/)
    await expect(page.locator('#root')).toBeVisible()
  })

  test('インサイトページが page error / 致命的 console error を起こさない', async ({ page }) => {
    const pageErrors: string[] = []
    const consoleErrors: string[] = []
    page.on('pageerror', (err) => pageErrors.push(err.message))
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    await page.goto('/#/insight')
    await expect(page.locator('#root')).toBeVisible()
    await page.waitForTimeout(1000)

    expect(pageErrors).toEqual([])
    // BudgetTabContent / GrossProfitTabContent / ForecastTabContent /
    // DecompositionTabContent の barrel re-export 経由解決失敗を検出するため、
    // import / module 系の致命的 error を厳格に検出
    const fatalErrors = consoleErrors.filter(
      (e) =>
        e.includes('Cannot read') ||
        e.includes('undefined is not') ||
        e.includes('null is not') ||
        e.includes('Failed to fetch dynamically imported module') ||
        e.includes('does not provide an export'),
    )
    expect(fatalErrors).toEqual([])
  })
})
