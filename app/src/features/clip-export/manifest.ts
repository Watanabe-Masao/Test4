/**
 * features/clip-export — Ownership Manifest
 *
 * クリップボード HTML エクスポート機能の所有権と依存関係を宣言する。
 *
 * @responsibility R:unclassified
 */
export const CLIP_EXPORT_MANIFEST = {
  name: 'clip-export',
  owner: 'clip-export',
  description: 'ダッシュボード画面の HTML クリップボードエクスポート',
  publicApi: 'features/clip-export/index.ts',
  dependencies: ['shared'],
  internalLayers: ['application'],
} as const
