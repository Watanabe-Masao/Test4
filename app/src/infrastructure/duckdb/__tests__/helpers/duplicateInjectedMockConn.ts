/**
 * Duplicate-injected mock conn helper — read-path 重複耐性 spot audit の
 * FRAGILE 6 件回帰テスト用の共有基盤。
 *
 * **設計意図（重要）**
 *
 * 本 helper は read-path 重複耐性 spot audit
 * (`references/03-implementation/read-path-duplicate-audit.md`) で FRAGILE 判定された
 * 6 クエリに「ロード境界が壊れた場合に silent 倍化しない」回帰テストを
 * 横展開するために導入する。1 件ずつ個別に mock を組むと検出粒度が
 * 6 箇所でバラついて将来の保守コストが上がるため、先に共有 helper を
 * 1 つだけ用意し、テストはその上に薄く乗せる方針。
 *
 * **2 つのモード**
 *
 * 1. `createCapturingMockConn(rules?)`
 *    SQL を記録しつつ、ルールに従って rows を返す mock conn。
 *    既存テストの `makeMockConn` を一般化したもの。
 *
 * 2. `createDuplicateInjectingMockConn(rules)`
 *    各 rule の rows を 2 回返す（行重複をシミュレート）。
 *    JS 側で集計を行う query にしか直接効果がない点に注意。
 *
 * **構造的アサーション**
 *
 * 本 audit の FRAGILE 6 件は全て SQL 内で `SUM` を取るタイプであり、
 * mock conn が返す duplicated rows は `queryToObjects` を素通りして
 * そのまま戻ってくる（JS 側集計がない）。したがって duplicate-injection
 * 単独では FRAGILE → SAFE の昇格は検出できない。
 *
 * これを補うのが {@link expectSqlPreAggregatesSource}。
 * `store_day_summary` VIEW が採用している「source テーブルを subquery で
 * 事前集約してから外側で集約する」パターンが SQL 上に存在することを
 * 構造的に検証する。FRAGILE クエリが pre-aggregate refactor を受けると
 * このアサーションが green になり、refactor を入れる前は red のままになる。
 *
 * テストは以下の組み合わせで書くのが推奨パターン:
 *
 *   1. `createDuplicateInjectingMockConn` で重複行を返す conn を作る
 *   2. クエリ関数を呼んで SQL を発火させる
 *   3. `getCapturedSql()` で発火した SQL を取り出し、
 *      `expectSqlPreAggregatesSource(sql, 'special_sales')` 等で構造的に
 *      pre-aggregate 構造を持つことを assert する
 *
 * これにより「ロード境界が壊れたら倍化する」という抽象的なリスクが、
 * 「SQL に source 事前集約があるか」という機械的な検査に降りる。
 *
 * @see references/03-implementation/read-path-duplicate-audit.md
 * @see references/03-implementation/data-load-idempotency-plan.md §8 Done 定義
 */
import { vi } from 'vitest'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'

// ── 型定義 ───────────────────────────────────────────────────────────

/** snake_case 形式の row（DuckDB の result.toArray() が返す形式に揃える） */
export type SnakeCaseRow = Record<string, unknown>

/** SQL に対して返す rows をルール化したもの */
export interface MockConnRule {
  /** SQL に含まれていれば match。複数 rule がある場合は最初に match した rule を使う。 */
  readonly matches: (sql: string) => boolean
  /** 返す rows（snake_case） */
  readonly rows: readonly SnakeCaseRow[]
}

/** Capturing mock conn — SQL を全て記録する */
export interface CapturingMockConn extends AsyncDuckDBConnection {
  getCapturedSql(): readonly string[]
}

// ── ファクトリ ───────────────────────────────────────────────────────

/**
 * SQL を記録しつつ、ルールに従って rows を返す mock conn を作る。
 *
 * `vi.fn` でラップしているので呼び出し回数の検証もできる。
 * rules が空 / match なしの場合は空配列を返す（既存の `makeMockConn` と互換）。
 */
export function createCapturingMockConn(rules: readonly MockConnRule[] = []): CapturingMockConn {
  const captured: string[] = []
  const conn = {
    query: vi.fn(async (sql: string) => {
      captured.push(sql)
      const rule = rules.find((r) => r.matches(sql))
      return { toArray: () => rule?.rows ?? [] }
    }),
    getCapturedSql: () => captured as readonly string[],
  }
  return conn as unknown as CapturingMockConn
}

/**
 * 各 rule の rows を 2 回返す mock conn を作る（行重複をシミュレート）。
 *
 * source 行重複時にクエリ結果が倍化するかを観測したい場面で使う。
 * SQL 内で SUM するクエリには直接効果がないため、必ず
 * {@link expectSqlPreAggregatesSource} と組み合わせて構造的に検証すること。
 */
export function createDuplicateInjectingMockConn(
  rules: readonly MockConnRule[],
): CapturingMockConn {
  const doubled: MockConnRule[] = rules.map((r) => ({
    matches: r.matches,
    rows: [...r.rows, ...r.rows],
  }))
  return createCapturingMockConn(doubled)
}

// ── 構造的アサーション ──────────────────────────────────────────────

/**
 * SQL が指定 source テーブルを subquery で事前集約しているかを検査する。
 *
 * 「事前集約」と判定する条件:
 *
 * - SQL 内に `(SELECT ... FROM <sourceTable> ... GROUP BY ...)` の形が存在する
 * - もしくは SQL が `<sourceTable>` を直接参照しておらず、`store_day_summary` 等の
 *   既に SAFE な VIEW を経由している
 *
 * いずれにも該当しない場合は **FRAGILE** と判定し、ok = false を返す。
 * テスト側で `expect(result.ok).toBe(true)` する想定。
 *
 * @param sql 検査対象の SQL
 * @param sourceTable 検査対象の source テーブル
 *   （`'purchase' | 'special_sales' | 'transfers' | 'classified_sales'`）
 */
export function expectSqlPreAggregatesSource(
  sql: string,
  sourceTable: string,
): { readonly ok: boolean; readonly reason?: string } {
  const fromTable = new RegExp(`\\bFROM\\s+${sourceTable}\\b`, 'i')
  if (!fromTable.test(sql)) {
    // table が直接参照されていない → SAFE な VIEW 経由とみなす
    return { ok: true }
  }
  // subquery で事前集約しているか
  // (SELECT ... FROM <table> ... GROUP BY ...)
  const subqueryWithGroupBy = new RegExp(
    `\\(\\s*SELECT[\\s\\S]*?\\bFROM\\s+${sourceTable}\\b[\\s\\S]*?\\bGROUP\\s+BY\\b[\\s\\S]*?\\)`,
    'i',
  )
  if (subqueryWithGroupBy.test(sql)) {
    return { ok: true }
  }
  return {
    ok: false,
    reason: `SQL references "${sourceTable}" but does not wrap it in a subquery with GROUP BY (FRAGILE: source-row duplication will not be absorbed)`,
  }
}
