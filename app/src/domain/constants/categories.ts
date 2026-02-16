import type { CategoryType } from '../models'

/** カテゴリ表示名 */
export const CATEGORY_LABELS: Readonly<Record<CategoryType, string>> = {
  market: '市場',
  lfc: 'LFC',
  saladClub: 'サラダクラブ',
  processed: '加工品',
  directDelivery: '直伝',
  flowers: '花',
  directProduce: '産直',
  consumables: '消耗品',
  interStore: '店間移動',
  interDepartment: '部門間移動',
  other: 'その他',
} as const

/** カテゴリ表示順序 */
export const CATEGORY_ORDER: readonly CategoryType[] = [
  'market',
  'lfc',
  'saladClub',
  'processed',
  'directDelivery',
  'flowers',
  'directProduce',
  'consumables',
  'interStore',
  'interDepartment',
  'other',
] as const
