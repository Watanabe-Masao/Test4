/**
 * CustomCategory 定数レジストリ
 *
 * 日本語文字列リテラルを排除し、ID ベースのカテゴリ管理を実現する。
 * プリセット（削除不可）はリテラル型、ユーザー作成分は `user:xxx` プレフィックス付き。
 */

// ─── プリセットカテゴリ（削除不可） ────────────────────────

/** プリセットカテゴリID */
export type PresetCategoryId =
  | 'market_purchase'
  | 'lfc'
  | 'salad'
  | 'processed'
  | 'consumables'
  | 'direct_delivery'
  | 'other'
  | 'uncategorized'

/** ユーザー作成カテゴリID（user:xxx 形式） */
export type UserCategoryId = `user:${string}`

/** カスタムカテゴリID（プリセット or ユーザー作成） */
export type CustomCategoryId = PresetCategoryId | UserCategoryId

// ─── ガード関数 ─────────────────────────────────────────

export function isPresetCategory(id: string): id is PresetCategoryId {
  return PRESET_CATEGORY_IDS.has(id as PresetCategoryId)
}

export function isUserCategory(id: string): id is UserCategoryId {
  return id.startsWith('user:')
}

export function isCustomCategoryId(id: string): id is CustomCategoryId {
  return isPresetCategory(id) || isUserCategory(id)
}

// ─── プリセット定義 ──────────────────────────────────────

export interface CustomCategoryDef {
  readonly id: PresetCategoryId
  readonly label: string
}

export const PRESET_CATEGORY_DEFS: readonly CustomCategoryDef[] = [
  { id: 'market_purchase', label: '市場仕入' },
  { id: 'lfc', label: 'LFC' },
  { id: 'salad', label: 'サラダ' },
  { id: 'processed', label: '加工品' },
  { id: 'consumables', label: '消耗品' },
  { id: 'direct_delivery', label: '直伝' },
  { id: 'other', label: 'その他' },
  { id: 'uncategorized', label: '未分類' },
] as const

/** 未分類カテゴリID */
export const UNCATEGORIZED_CATEGORY_ID: PresetCategoryId = 'uncategorized'

const PRESET_CATEGORY_IDS = new Set<PresetCategoryId>(PRESET_CATEGORY_DEFS.map((d) => d.id))

/** ID → 表示名マップ（プリセット用） */
export const PRESET_CATEGORY_LABELS: Readonly<Record<PresetCategoryId, string>> =
  Object.fromEntries(PRESET_CATEGORY_DEFS.map((d) => [d.id, d.label])) as Record<
    PresetCategoryId,
    string
  >

/** 表示名 → ID 逆引き（既存データ移行用） */
export const LEGACY_LABEL_TO_ID: Readonly<Record<string, PresetCategoryId>> = Object.fromEntries(
  PRESET_CATEGORY_DEFS.map((d) => [d.label, d.id]),
) as Record<string, PresetCategoryId>

/** ユーザーカテゴリ作成ヘルパー */
export function createUserCategoryId(name: string): UserCategoryId {
  return `user:${name}` as UserCategoryId
}
