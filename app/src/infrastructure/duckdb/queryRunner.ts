/**
 * DuckDB クエリ実行・結果変換ユーティリティ
 *
 * Arrow Table → JS Object[] 変換と snake_case → camelCase 変換を提供する。
 */
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { ZodType } from 'zod'
import { validateStoreId, validateDateKey, validateCode } from './queryParams'
import { structRowToObject } from './rowConversion'

/** queryToObjects の検証モード */
export type ValidationMode = 'off' | 'first-row' | 'all-rows'

/**
 * SQL を実行し、結果を camelCase 変換済みの JS Object 配列として返す。
 *
 * @param schema オプショナルの Zod スキーマ。指定時は DEV 環境で行を検証する。
 * @param options.validate 検証モード: 'first-row'（デフォルト）/ 'all-rows' / 'off'
 *   正本 ReadModel の検証は ReadModel 側で .parse() を使用すること（こちらは行レベルの補助検証）。
 */
export async function queryToObjects<T>(
  conn: AsyncDuckDBConnection,
  sql: string,
  schema?: ZodType<T>,
  options?: { readonly validate?: ValidationMode },
): Promise<readonly T[]> {
  const result = await conn.query(sql)
  const rows = result.toArray()
  const objects = rows.map((row) => structRowToObject(row as Record<string, unknown>) as T)

  const mode = options?.validate ?? 'first-row'
  if (schema && objects.length > 0 && import.meta.env.DEV && mode !== 'off') {
    if (mode === 'all-rows') {
      for (let i = 0; i < objects.length; i++) {
        const parsed = schema.safeParse(objects[i])
        if (!parsed.success) {
          console.warn(
            `[queryToObjects] Row ${i} schema validation failed:\n${parsed.error.message}\nSQL: ${sql.slice(0, 200)}`,
          )
          break // 最初の失敗で停止（ログ洪水を防ぐ）
        }
      }
    } else {
      const parsed = schema.safeParse(objects[0])
      if (!parsed.success) {
        console.warn(
          `[queryToObjects] Row schema validation failed:\n${parsed.error.message}\nSQL: ${sql.slice(0, 200)}`,
        )
      }
    }
  }

  return objects
}

/**
 * スカラー値（1行1列）を取得する。結果がなければ null。
 */
export async function queryScalar<T>(conn: AsyncDuckDBConnection, sql: string): Promise<T | null> {
  const result = await conn.query(sql)
  const rows = result.toArray()
  if (rows.length === 0) return null
  const row = rows[0] as Record<string, unknown>
  const keys = Object.keys(row)
  if (keys.length === 0) return null
  const val = row[keys[0]]
  if (typeof val === 'bigint') return Number(val) as T
  return val as T
}

/**
 * store_id IN (...) 条件を生成する。
 * storeIds が空または未指定なら null（条件なし）を返す。
 * 各 ID はバリデーション済みであることが保証される。
 */
export function storeIdFilter(storeIds: readonly string[] | undefined): string | null {
  if (!storeIds || storeIds.length === 0) return null
  const validated = storeIds.map(validateStoreId)
  const quoted = validated.map((id) => `'${id.replace(/'/g, "''")}'`).join(', ')
  return `store_id IN (${quoted})`
}

// ── 型安全 WHERE 句ビルダー ──

/**
 * WHERE 句の条件を型で表現する discriminated union。
 *
 * 文字列補間の代わりに構造化データとして条件を組み立てることで、
 * SQL インジェクションを型レベルで防止し、バリデーションを自動適用する。
 *
 * @example
 * ```typescript
 * const where = buildTypedWhere([
 *   { type: 'dateRange', column: 'date_key', from: '2026-01-01', to: '2026-01-31' },
 *   { type: 'boolean', column: 'is_prev_year', value: false },
 *   { type: 'storeIds', storeIds: ['S001', 'S002'] },
 * ])
 * // → "WHERE date_key BETWEEN '2026-01-01' AND '2026-01-31' AND is_prev_year = FALSE AND store_id IN ('S001', 'S002')"
 * ```
 */
export type WhereCondition =
  | {
      readonly type: 'dateRange'
      readonly column: string
      readonly from: string
      readonly to: string
      readonly alias?: string
    }
  | {
      readonly type: 'boolean'
      readonly column: string
      readonly value: boolean
      readonly alias?: string
    }
  | {
      readonly type: 'storeIds'
      readonly storeIds: readonly string[] | undefined
      readonly alias?: string
    }
  | {
      readonly type: 'code'
      readonly column: string
      readonly value: string
      readonly alias?: string
    }
  | {
      readonly type: 'in'
      readonly column: string
      readonly values: readonly (string | number)[]
      readonly alias?: string
    }
  | { readonly type: 'raw'; readonly sql: string }

/** WhereCondition を SQL 文字列に変換する */
function conditionToSql(cond: WhereCondition): string | null {
  const col = (c: WhereCondition & { column?: string; alias?: string }) =>
    c.alias ? `${c.alias}.${c.column}` : c.column

  switch (cond.type) {
    case 'dateRange': {
      const from = validateDateKey(cond.from)
      const to = validateDateKey(cond.to)
      return `${col(cond)} BETWEEN '${from}' AND '${to}'`
    }
    case 'boolean':
      return `${col(cond)} = ${cond.value ? 'TRUE' : 'FALSE'}`
    case 'storeIds': {
      if (!cond.storeIds || cond.storeIds.length === 0) return null
      return cond.alias
        ? storeIdFilterWithAlias(cond.storeIds, cond.alias)
        : storeIdFilter(cond.storeIds)
    }
    case 'code': {
      const validated = validateCode(cond.value)
      return `${col(cond)} = '${validated}'`
    }
    case 'in': {
      if (cond.values.length === 0) return null
      const items = cond.values
        .map((v) => (typeof v === 'number' ? String(v) : `'${validateCode(v)}'`))
        .join(', ')
      return `${col(cond)} IN (${items})`
    }
    case 'raw':
      return cond.sql
  }
}

/**
 * 型安全な WHERE 句を構築する。
 *
 * 各条件は WhereCondition 型で表現され、バリデーションが自動適用される。
 * null に評価される条件（空の storeIds 等）は自動でスキップされる。
 */
export function buildTypedWhere(conditions: readonly WhereCondition[]): string {
  const parts = conditions.map(conditionToSql).filter((s): s is string => s !== null)
  return parts.length > 0 ? `WHERE ${parts.join(' AND ')}` : ''
}

/**
 * テーブルエイリアス付き store_id IN (...) 条件を生成する。
 * 従来の `.replace('store_id', ...)` パターンを安全に置き換える。
 */
export function storeIdFilterWithAlias(
  storeIds: readonly string[] | undefined,
  alias: string,
): string | null {
  if (!storeIds || storeIds.length === 0) return null
  const validated = storeIds.map(validateStoreId)
  const quoted = validated.map((id) => `'${id.replace(/'/g, "''")}'`).join(', ')
  return `${alias}.store_id IN (${quoted})`
}
