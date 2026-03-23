/**
 * StoragePort — 5層データモデルに対応したストレージポート
 *
 * RawDataPort は domain/ports/ に移動済み（A4: 取得対象の契約は Domain で定義）。
 * 後方互換のため re-export を維持する。
 */
export type { RawDataPort } from '@/domain/ports'
