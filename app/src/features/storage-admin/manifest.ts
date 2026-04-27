/**
 * features/storage-admin — Ownership Manifest
 *
 * データ管理スライスの所有権と依存関係を宣言する。
 *
 * @responsibility R:unclassified
 */
export const STORAGE_ADMIN_MANIFEST = {
  name: 'storage-admin',
  owner: 'storage-admin',
  description: 'IndexedDB データ管理・バックアップ・デバイス同期・DuckDB キャッシュ',
  publicApi: 'features/storage-admin/index.ts',
  dependencies: ['shared'],
  internalLayers: ['application', 'ui'],
} as const
