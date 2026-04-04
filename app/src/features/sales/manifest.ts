/**
 * features/sales — Ownership Manifest
 *
 * 売上分析スライスの所有権と依存関係を宣言する。
 */
export const SALES_MANIFEST = {
  name: 'sales',
  owner: 'sales',
  description: '日別売上・粗利分析・要因分解・予算達成・前年比較',
  publicApi: 'features/sales/index.ts',
  dependencies: ['shared'],
  internalLayers: ['application', 'domain', 'ui'],
} as const
