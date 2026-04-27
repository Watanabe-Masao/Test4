/**
 * features/cost-detail — Ownership Manifest
 *
 * 原価明細スライスの所有権と依存関係を宣言する。
 *
 * @responsibility R:unclassified
 */
export const COST_DETAIL_MANIFEST = {
  name: 'cost-detail',
  owner: 'cost-detail',
  description: '仕入原価明細・移動原価・売上納品原価の表示',
  publicApi: 'features/cost-detail/index.ts',
  dependencies: ['shared'],
  internalLayers: ['application', 'ui'],
} as const
