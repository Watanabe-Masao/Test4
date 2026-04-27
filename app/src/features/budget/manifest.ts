/**
 * features/budget — Ownership Manifest
 *
 * 予算分析スライスの所有権と依存関係を宣言する。
 *
 * @responsibility R:unclassified
 */
export const BUDGET_MANIFEST = {
  name: 'budget',
  owner: 'budget',
  description: '予算分析・予実比較チャート・粗利タブ',
  publicApi: 'features/budget/index.ts',
  dependencies: ['shared'],
  internalLayers: ['application', 'ui'],
} as const
