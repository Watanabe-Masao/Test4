/**
 * features/comparison — Ownership Manifest
 *
 * 比較サブシステムの所有権と依存関係を宣言する。
 */
export const COMPARISON_MANIFEST = {
  name: 'comparison',
  owner: 'comparison',
  description: '前年比較・曜日ギャップ・同曜日マッピング・KPI 投影',
  publicApi: 'features/comparison/index.ts',
  dependencies: ['shared'],
  internalLayers: ['application', 'domain'],
} as const
