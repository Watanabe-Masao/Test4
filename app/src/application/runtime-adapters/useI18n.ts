/**
 * i18n フックの application 層ブリッジ
 *
 * presentation 層から infrastructure/i18n への直接依存を避けるための re-export。
 *
 * @responsibility R:unclassified
 */
export { useI18n } from '@/infrastructure/i18n'
export type { I18nContextValue } from '@/infrastructure/i18n/i18nContextDef'
