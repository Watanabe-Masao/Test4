/**
 * カテゴリページ E2E テスト
 *
 * 主要フロー:
 * 1. ナビゲーションから /category へ遷移できる
 * 2. ページがレンダリング後にコンソール / page エラーを起こさない
 *
 * 関連 project: presentation-quality-hardening Phase 3 (E2E 業務フロー拡充)
 */
import { test, expect } from '@playwright/test'

test.describe('カテゴリページ', () => {
  test('ナビゲーションからカテゴリへ遷移できる', async ({ page }, testInfo) => {
    await page.goto('/')
    const isMobile = testInfo.project.name === 'mobile-chrome'

    if (isMobile) {
      const nav = page.locator('nav[aria-label="モバイルナビゲーション"]')
      const categoryBtn = nav.locator('button[aria-label="カテゴリ"]')
      await expect(categoryBtn).toBeVisible()
      await categoryBtn.click()
    } else {
      const nav = page.locator('nav[aria-label="メインナビゲーション"]')
      const categoryBtn = nav.locator('button:has-text("📁")')
      await expect(categoryBtn).toBeVisible()
      await categoryBtn.click()
    }

    await expect(page).toHaveURL(/#\/category/)
    await expect(page.locator('#root')).toBeVisible()
  })

  test('カテゴリページが page error / console error を起こさない', async ({ page }) => {
    const pageErrors: string[] = []
    const consoleErrors: string[] = []
    page.on('pageerror', (err) => pageErrors.push(err.message))
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    await page.goto('/#/category')
    await expect(page.locator('#root')).toBeVisible()
    await page.waitForTimeout(500)

    expect(pageErrors).toEqual([])
    // console.error は WASM 警告等で出る可能性があるため、致命的な undefined / null 系のみ検出
    const fatalErrors = consoleErrors.filter(
      (e) =>
        e.includes('Cannot read') || e.includes('undefined is not') || e.includes('null is not'),
    )
    expect(fatalErrors).toEqual([])
  })
})
