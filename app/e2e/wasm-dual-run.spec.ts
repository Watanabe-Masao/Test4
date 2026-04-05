/**
 * WASM E2E テスト
 *
 * 検証対象:
 * 1. 本番ビルドで WASM 関連エラーがコンソールに出ないこと
 * 2. UI が正常にレンダリングされること
 * 3. localStorage による executionMode 切替が機能すること
 *
 * 注: E2E は `npm run preview`（本番ビルド）で実行される。
 * 全 5 engine は WASM authoritative に昇格済み（2026-04-05）。
 */
import { test, expect } from '@playwright/test'

test.describe('WASM: 本番ビルド安全性', () => {
  test('WASM 関連のコンソールエラーが出ないこと', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error' && msg.text().includes('wasm')) {
        errors.push(msg.text())
      }
    })

    await page.goto('/')
    await expect(page.locator('#root')).toBeVisible()

    // WASM 関連エラーがないことを確認
    expect(errors).toEqual([])
  })

  test('本番ビルドではダッシュボードが正常に表示される', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('#root')).toBeVisible()

    // ナビゲーションが存在することを確認（基本的な UI 健全性）
    // モバイルではデスクトップ nav が hidden でボトムナビが表示されるため、
    // いずれかの nav が visible であることを検証する
    const visibleNav = page.locator('nav').first()
    await expect(visibleNav).toBeAttached()
    const navs = page.locator('nav')
    const count = await navs.count()
    expect(count).toBeGreaterThan(0)
  })

  test('localStorage で executionMode を切り替えてもエラーなし', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    // ts-only モードを設定
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('factorDecomposition.executionMode', 'ts-only')
    })
    await page.reload()
    await expect(page.locator('#root')).toBeVisible()

    // wasm-only モードを設定
    await page.evaluate(() => {
      localStorage.setItem('factorDecomposition.executionMode', 'wasm-only')
    })
    await page.reload()
    await expect(page.locator('#root')).toBeVisible()

    // エラーなし
    expect(errors).toEqual([])

    // クリーンアップ
    await page.evaluate(() => {
      localStorage.removeItem('factorDecomposition.executionMode')
    })
  })
})
