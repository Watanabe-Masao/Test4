/**
 * 後方互換 re-export
 *
 * hash ユーティリティの実体は domain/utilities/hash.ts に移動。
 * Infrastructure 層からも依存されるため Domain 層に配置する。
 */
export { murmurhash3, hashData } from '@/domain/utilities/hash'
