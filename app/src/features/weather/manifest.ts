/**
 * features/weather — Ownership Manifest
 *
 * 天気データ取得・永続化・フォールバック・相関分析の所有権と依存関係を宣言する。
 */
export const WEATHER_MANIFEST = {
  name: 'weather',
  owner: 'weather',
  description: '天気データ取得（ETRN）・永続化・フォールバック・相関分析',
  publicApi: 'features/weather/index.ts',
  dependencies: ['shared'],
  internalLayers: ['application', 'domain'],
} as const
