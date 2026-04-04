/**
 * features/purchase — Ownership Manifest
 *
 * 仕入分析スライスの所有権と依存関係を宣言する。
 */
export const PURCHASE_MANIFEST = {
  name: 'purchase',
  owner: 'purchase',
  description: '仕入日次ピボット・カテゴリ明細・店舗比較・仕入対売上チャート',
  publicApi: 'features/purchase/index.ts',
  dependencies: ['shared'],
  internalLayers: ['application', 'ui'],
} as const
