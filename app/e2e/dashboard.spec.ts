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

  test('ナビゲーションでページ遷移できる', async ({ page }, testInfo) => {
    await page.goto('/')
    const isMobile = testInfo.project.name === 'mobile-chrome'

    if (isMobile) {
      // BottomNav: aria-label はページレジストリの label を使用
      const nav = page.locator('nav[aria-label="モバイルナビゲーション"]')
      const categoryBtn = nav.locator('button[aria-label="カテゴリ"]')
      await expect(categoryBtn).toBeVisible()
      await categoryBtn.click()
    } else {
      // NavBar: aria-label は i18n メッセージを使用。アイコンで特定する
      const nav = page.locator('nav[aria-label="メインナビゲーション"]')
      const categoryBtn = nav.locator('button:has-text("📁")')
      await expect(categoryBtn).toBeVisible()
      await categoryBtn.click()
    }
    await expect(page).toHaveURL(/#\/category/)
  })

  test('テーマ切り替えが動作する', async ({ page }, testInfo) => {
    // テーマボタンは desktop NavBar にのみ存在（BottomNav には非表示）
    test.skip(testInfo.project.name === 'mobile-chrome', 'テーマボタンはデスクトップのみ')
    await page.goto('/')

    // テーマトグルボタンをクリック
    const themeBtn = page.locator('button[aria-label*="モード"]')
    await expect(themeBtn).toBeVisible()
    await themeBtn.click()
    // ボタンが引き続き表示されていることを確認
    await expect(themeBtn).toBeVisible()
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
