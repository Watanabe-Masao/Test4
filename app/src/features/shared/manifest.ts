/**
 * features/shared — Ownership Manifest
 *
 * 複数スライスが使う共通基盤の所有権と依存関係を宣言する。
 *
 * @responsibility R:unclassified
 */
export const SHARED_MANIFEST = {
  name: 'shared',
  owner: 'shared',
  description: '複数スライス共通の基盤・型定義・ユーティリティ',
  publicApi: 'features/shared/index.ts',
  dependencies: [],
  internalLayers: [],
} as const
