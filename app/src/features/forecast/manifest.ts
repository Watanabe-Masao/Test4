/**
 * features/forecast — Ownership Manifest
 *
 * 需要予測スライスの所有権と依存関係を宣言する。
 *
 * @responsibility R:unclassified
 */
export const FORECAST_MANIFEST = {
  name: 'forecast',
  owner: 'forecast',
  description: '需要予測・季節性分解・週次実績比較',
  publicApi: 'features/forecast/index.ts',
  dependencies: ['shared'],
  internalLayers: ['application', 'ui'],
} as const
