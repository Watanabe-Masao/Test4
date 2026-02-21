import { test, expect } from '@playwright/test'

/**
 * Visual Regression テスト
 *
 * Storybook のストーリーに対してスクリーンショット比較を行い、
 * UI の意図しない変更を検出する。
 *
 * 前提: Storybook が localhost:6006 で起動していること
 *   npm run storybook
 *
 * 実行:
 *   npx playwright test visual-regression
 *
 * ベースライン更新:
 *   npx playwright test visual-regression --update-snapshots
 */

const STORYBOOK_URL = 'http://localhost:6006'

function storyUrl(storyId: string): string {
  return `${STORYBOOK_URL}/iframe.html?id=${storyId}&viewMode=story`
}

const STORIES = [
  { id: 'common-button--all-variants', name: 'Button - AllVariants' },
  { id: 'common-card--multiple-cards', name: 'Card - MultipleCards' },
  { id: 'common-kpicard--dashboard-grid', name: 'KpiCard - DashboardGrid' },
  { id: 'common-skeleton--full-page-loading', name: 'Skeleton - FullPageLoading' },
  { id: 'common-chip--store-selector', name: 'Chip - StoreSelector' },
  { id: 'common-datagrid--default', name: 'DataGrid - Default' },
  { id: 'common-datagrid--compact', name: 'DataGrid - Compact' },
  { id: 'common-datagrid--with-pagination', name: 'DataGrid - WithPagination' },
  { id: 'foundation-theme--color-palette', name: 'Theme - ColorPalette' },
  { id: 'foundation-theme--typography', name: 'Theme - Typography' },
]

for (const story of STORIES) {
  test(`Visual: ${story.name}`, async ({ page }) => {
    await page.goto(storyUrl(story.id))
    // ストーリーのレンダリング完了を待つ
    await page.waitForLoadState('networkidle')
    // アニメーション完了を待つ
    await page.waitForTimeout(500)
    // スクリーンショット比較
    await expect(page).toHaveScreenshot(`${story.id}.png`, {
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
    })
  })
}
