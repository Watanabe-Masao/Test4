/**
 * Visual Regression テスト基盤
 *
 * Storybook ストーリーを Playwright で自動スクリーンショット撮影し、
 * ベースラインとの差分を検出する仕組みの設定ファイル。
 *
 * 使い方:
 *   1. `npm run storybook` でStorybookを起動 (port 6006)
 *   2. `npm run test:visual` でスクリーンショット比較テストを実行
 *
 * 初回実行時は --update-snapshots でベースライン画像を生成:
 *   npx playwright test visual-regression --update-snapshots
 */

import { describe, it, expect } from 'vitest'

// ─── ストーリー一覧 ─────────────────────────────────
const VISUAL_STORIES = [
  'common-button--all-variants',
  'common-card--multiple-cards',
  'common-kpicard--dashboard-grid',
  'common-skeleton--full-page-loading',
  'common-chip--store-selector',
  'common-datagrid--default',
  'common-datagrid--compact',
  'common-datagrid--with-pagination',
  'foundation-theme--color-palette',
  'foundation-theme--semantic-colors',
  'foundation-theme--typography',
  'foundation-theme--spacing',
]

describe('Visual Regression ストーリー一覧', () => {
  it('全ストーリーが登録されている', () => {
    expect(VISUAL_STORIES.length).toBeGreaterThanOrEqual(10)
  })

  it('各ストーリーIDがkebab-case形式', () => {
    for (const id of VISUAL_STORIES) {
      expect(id).toMatch(/^[a-z0-9-]+$/)
    }
  })

  it('重複するストーリーIDがない', () => {
    const unique = new Set(VISUAL_STORIES)
    expect(unique.size).toBe(VISUAL_STORIES.length)
  })
})

// ─── Playwright Visual Regression テスト設定 ──────────
export const STORYBOOK_URL = 'http://localhost:6006'

export function getStoryUrl(storyId: string): string {
  return `${STORYBOOK_URL}/iframe.html?id=${storyId}&viewMode=story`
}

export { VISUAL_STORIES }
