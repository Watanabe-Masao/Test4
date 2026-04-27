/**
 * features/reports — Ownership Manifest
 *
 * レポートスライスの所有権と依存関係を宣言する。
 *
 * @responsibility R:unclassified
 */
export const REPORTS_MANIFEST = {
  name: 'reports',
  owner: 'reports',
  description: 'サマリーグリッド・部門別レポート',
  publicApi: 'features/reports/index.ts',
  dependencies: ['shared'],
  internalLayers: ['ui'],
} as const
