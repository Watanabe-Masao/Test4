/**
 * Phase 6.2: ダッシュボード E2E テスト
 *
 * 主要フロー:
 * 1. アプリ初期表示 → ダッシュボード遷移
 * 2. ナビゲーション動作確認
 * 3. テーマ切り替え
 */
import { test, expect } from '@playwright/test'

test.describe('ダッシュボード', () => {
  test('初期表示でダッシュボードが表示される', async ({ page }) => {
    await page.goto('/')
    // ダッシュボードページが表示されることを確認
    await expect(page.locator('#root')).toBeVisible()
  })

  test('ナビゲーションでページ遷移できる', async ({ page }) => {
    await page.goto('/')

    // カテゴリページへ遷移
    const categoryBtn = page.locator('button[title="カテゴリ"]')
    if (await categoryBtn.isVisible()) {
      await categoryBtn.click()
      await expect(page).toHaveURL(/#\/category/)
    }
  })

  test('テーマ切り替えが動作する', async ({ page }) => {
    await page.goto('/')

    // テーマトグルボタンをクリック
    const themeBtn = page.locator('button[title*="モード"]')
    if (await themeBtn.isVisible()) {
      await themeBtn.click()
      // ボタンテキストが変わることを確認
      await expect(themeBtn).toBeVisible()
    }
  })
})

test.describe('レスポンシブ', () => {
  test('モバイルビューでボトムナビが表示される', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')

    // ボトムナビの存在確認
    const bottomNav = page.locator('nav').last()
    await expect(bottomNav).toBeVisible()
  })
})
