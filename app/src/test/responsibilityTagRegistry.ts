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

/** 有効な R: タグの一覧（検証用） */
const VALID_TAGS = new Set<string>([
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
