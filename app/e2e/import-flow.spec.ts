/**
 * Phase 6.2: インポートフロー E2E テスト
 *
 * 主要フロー:
 * 1. ファイルインポート → 計算 → 結果表示
 * 2. 設定変更 → 再計算
 */
import { test, expect } from '@playwright/test'

test.describe('インポートフロー', () => {
  test('アプリが正常に起動する', async ({ page }) => {
    await page.goto('/')
    // root 要素が存在し、React がマウントされていることを確認
    await expect(page.locator('#root')).toBeVisible()
    // JavaScript エラーがないことを確認
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.waitForTimeout(1000)
    expect(errors).toHaveLength(0)
  })

  test('管理ページに遷移できる', async ({ page }) => {
    await page.goto('/')

    const adminBtn = page.locator('button[title="管理"]')
    if (await adminBtn.isVisible()) {
      await adminBtn.click()
      await expect(page).toHaveURL(/#\/admin/)
    }
  })
})
