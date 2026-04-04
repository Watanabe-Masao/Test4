/**
 * features/category — Ownership Manifest
 *
 * カテゴリ分析スライスの所有権と依存関係を宣言する。
 */
export const CATEGORY_MANIFEST = {
  name: 'category',
  owner: 'category',
  description: 'カテゴリ階層分析・ランキング・ベンチマーク・ヒートマップ',
  publicApi: 'features/category/index.ts',
  dependencies: ['shared'],
  internalLayers: ['application', 'ui'],
} as const
