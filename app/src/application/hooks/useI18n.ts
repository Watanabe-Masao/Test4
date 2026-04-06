/**
 * i18n フックの後方互換 re-export
 *
 * 実体は application/runtime-adapters/useI18n.ts に移動済み。
 * presentation/ の多数のファイルがこのパスから import しているため、
 * re-export を維持する。
 * @responsibility R:adapter
 */
export { useI18n } from '@/application/runtime-adapters/useI18n'
export type { I18nContextValue } from '@/application/runtime-adapters/useI18n'
