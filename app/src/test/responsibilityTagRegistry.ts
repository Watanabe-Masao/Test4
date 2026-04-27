/**
 * 責務タグレジストリ — タグ定義 + ファイルスキャン
 *
 * タグはファイル内の JSDoc に `@responsibility R:tag1, R:tag2` として記述する。
 * このファイルはタグの型定義とスキャン関数のみを提供する。
 *
 * 原則:
 * - タグはコードと同じファイルに書く（二重管理しない）
 * - 未分類は未分類のまま。嘘の単一責務タグは付けない
 * - 複数タグ = AND = 分離候補
 * - 新規ファイルは @responsibility 必須（未記載なら CI 失敗）
 *
 * @see references/03-guides/responsibility-separation-catalog.md
 *
 * **v1/v2 並行運用 (taxonomy-v2 子 Phase 6a)**:
 * v2 vocabulary (responsibilityTaxonomyRegistryV2.ts) は本 v1 registry と
 * 並行運用される (Phase 7 v1 deprecation → Phase 8 retirement で v1 撤去予定)。
 * v1 guard が v2 タグを「不正タグ」として誤検出しないよう、本 registry の
 * VALID_TAGS に v2 vocabulary も登録する。
 *
 * v2 タグの thresholds 検証は v1 architectureRules に rule mapping が無いため
 * 自動 skip される (`getRuleByResponsibilityTag` が undefined を返す)。
 * 全実装契約は v2 側 (responsibilityTagGuardV2 + taxonomyInterlockGuard) で担う。
 */
import * as fs from 'fs'

// ─── 責務タグ定義 ─────────────────────────────────────

/** 責務タグ（R: プレフィックス） */
export type ResponsibilityTag =
  | 'R:query-plan'
  | 'R:query-exec'
  | 'R:calculation'
  | 'R:data-fetch'
  | 'R:state-machine'
  | 'R:transform'
  | 'R:orchestration'
  | 'R:chart-view'
  | 'R:chart-option'
  | 'R:page'
  | 'R:widget'
  | 'R:form'
  | 'R:navigation'
  | 'R:persistence'
  | 'R:context'
  | 'R:layout'
  | 'R:adapter'
  | 'R:utility'
  | 'R:reducer'
  | 'R:barrel'

/**
 * 有効な R: タグの一覧（検証用）。
 *
 * v1 vocabulary 20 件 + v2 vocabulary 10 件 = 30 件。
 * v2 タグは v1 guard 内では "分類済 + thresholds 検証 skip" として扱われる。
 * v1 タグの個別 thresholds は v1 architectureRules で従来通り検証される。
 */
const VALID_TAGS = new Set<string>([
  // v1 vocabulary (20)
  'R:query-plan',
  'R:query-exec',
  'R:calculation',
  'R:data-fetch',
  'R:state-machine',
  'R:transform',
  'R:orchestration',
  'R:chart-view',
  'R:chart-option',
  'R:page',
  'R:widget',
  'R:form',
  'R:navigation',
  'R:persistence',
  'R:context',
  'R:layout',
  'R:adapter',
  'R:utility',
  'R:reducer',
  'R:barrel',
  // v2 vocabulary (10) — taxonomy-v2 子 Phase 6a で v1 並行運用解除
  'R:bridge',
  'R:read-model',
  'R:guard',
  'R:presentation',
  'R:store',
  'R:hook',
  'R:registry',
  'R:unclassified',
  // ※ R:calculation / R:adapter は v1/v2 共通名（同名 = co-existence、Phase 7 deprecation で v1 側撤去）
])

// ─── ファイルスキャン ─────────────────────────────────

const RESPONSIBILITY_REGEX = /@responsibility\s+(.+)/

/**
 * ファイルから @responsibility タグを読み取る。
 * タグがなければ null（未分類）。
 */
export function readResponsibilityTags(filePath: string): readonly ResponsibilityTag[] | null {
  const content = fs.readFileSync(filePath, 'utf-8')
  const match = content.match(RESPONSIBILITY_REGEX)
  if (!match) return null

  const tags = match[1]
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0)

  if (tags.length === 0) return null
  return tags as ResponsibilityTag[]
}

/**
 * タグが有効な R: タグかどうかを検証する。
 */
export function validateTags(tags: readonly string[]): readonly string[] {
  return tags.filter((t) => !VALID_TAGS.has(t))
}
