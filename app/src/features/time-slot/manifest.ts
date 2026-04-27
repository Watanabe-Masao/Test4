/**
 * features/time-slot — Ownership Manifest
 *
 * 時間帯分析サブシステムの所有権と依存関係を宣言する。
 *
 * @responsibility R:unclassified
 */
export const TIME_SLOT_MANIFEST = {
  name: 'time-slot',
  owner: 'time-slot',
  description: '時間帯売上分析・コアタイム検出・天気相関・WASM bridge',
  publicApi: 'features/time-slot/index.ts',
  dependencies: ['shared', 'weather'],
  internalLayers: ['application', 'domain'],
} as const
