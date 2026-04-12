/**
 * Read-path 重複耐性 — FRAGILE 6 件の回帰テスト
 *
 * idempotent load contract Phase 3.c の追加防御 (Done 定義 step 1):
 * `references/03-guides/data-load-idempotency-plan.md` §8 を参照。
 *
 * **目的**
 *
 * Audit で FRAGILE 判定された 6 クエリ
 * (`references/03-guides/read-path-duplicate-audit.md` §FRAGILE) について、
 * source テーブルの行重複に対して silent に倍化しないことを構造的に保証する。
 *
 * **検証戦略**
 *
 * 各テストは:
 *   1. `createDuplicateInjectingMockConn` で source 行重複を表すコンテキストを作る
 *      （SQL passthrough のため発火する SQL を取り出す手段として使う）
 *   2. クエリ関数を呼んで SQL を発火させる
 *   3. 発火した SQL に対して `expectSqlPreAggregatesSource` で「source を
 *      subquery で事前集約しているか」を構造的に assert する
 *
 * **現在の状態（2026-04-12）**
 *
 * 6 件全て **`.fails` で expected failure** として固定する。これは Phase 3.b で
 * year-shift latent bug を `.fails` 固定したのと同じ運用パターン
 * (`data-load-idempotency-plan.md` §7 Phase 3.b 参照)。
 *
 * pre-aggregate refactor (推奨 PR 構成 D / E) が landed したら `.fails` を
 * 外して通常の `it` に戻し、回帰検出網として恒久化する。
 *
 * @see references/03-guides/read-path-duplicate-audit.md
 * @see references/03-guides/data-load-idempotency-plan.md §8 Done 定義
 */
import { describe, it, expect } from 'vitest'
import {
  queryStoreCostPrice,
  queryStoreDailyMarkupRate,
  querySpecialSalesDaily,
  queryTransfersDaily,
  querySalesTotal,
} from '@/infrastructure/duckdb/queries/purchaseComparison'
import { queryFreePeriodDaily } from '@/infrastructure/duckdb/queries/freePeriodFactQueries'
import {
  createDuplicateInjectingMockConn,
  expectSqlPreAggregatesSource,
  type MockConnRule,
} from './helpers/duplicateInjectedMockConn'

const dateFrom = '2026-02-01'
const dateTo = '2026-02-28'
const storeIds = ['S001', 'S002']

/** SQL を全て pass させる broad rule（snake_case で空 rows でも問題ない） */
const passAllRule: MockConnRule = {
  matches: () => true,
  rows: [],
}

/**
 * 「FRAGILE な query が source テーブル X を subquery で事前集約している」ことを
 * 検査するヘルパー。pre-aggregate されていなければ ok=false で失敗する。
 */
function assertSafeAgainstSource(sql: string, sourceTable: string): void {
  const result = expectSqlPreAggregatesSource(sql, sourceTable)
  expect(result.ok, result.reason).toBe(true)
}

// ── purchaseComparison.ts FRAGILE 5 件 ────────────────────────────────

describe('FRAGILE/1: queryStoreCostPrice — UNION ALL + 外側 SUM', () => {
  it.fails(
    'purchase / special_sales / transfers の全てを subquery で事前集約しているべき',
    async () => {
      const conn = createDuplicateInjectingMockConn([passAllRule])
      await queryStoreCostPrice(conn, dateFrom, dateTo, storeIds)
      const sql = conn.getCapturedSql()[0]
      assertSafeAgainstSource(sql, 'purchase')
      assertSafeAgainstSource(sql, 'special_sales')
      assertSafeAgainstSource(sql, 'transfers')
    },
  )
})

describe('FRAGILE/2: queryStoreDailyMarkupRate — daily 版 UNION ALL + 外側 SUM', () => {
  it.fails(
    'purchase / special_sales / transfers の全てを subquery で事前集約しているべき',
    async () => {
      const conn = createDuplicateInjectingMockConn([passAllRule])
      await queryStoreDailyMarkupRate(conn, dateFrom, dateTo, storeIds)
      const sql = conn.getCapturedSql()[0]
      assertSafeAgainstSource(sql, 'purchase')
      assertSafeAgainstSource(sql, 'special_sales')
      assertSafeAgainstSource(sql, 'transfers')
    },
  )
})

describe('FRAGILE/3: querySpecialSalesDaily — special_sales を直接 SUM', () => {
  it.fails('special_sales を subquery で事前集約しているべき', async () => {
    const conn = createDuplicateInjectingMockConn([passAllRule])
    await querySpecialSalesDaily(conn, dateFrom, dateTo, storeIds)
    const sql = conn.getCapturedSql()[0]
    assertSafeAgainstSource(sql, 'special_sales')
  })
})

describe('FRAGILE/4: queryTransfersDaily — transfers を直接 SUM', () => {
  it.fails('transfers を subquery で事前集約しているべき', async () => {
    const conn = createDuplicateInjectingMockConn([passAllRule])
    await queryTransfersDaily(conn, dateFrom, dateTo, storeIds)
    const sql = conn.getCapturedSql()[0]
    assertSafeAgainstSource(sql, 'transfers')
  })
})

describe('FRAGILE/5: querySalesTotal — classified_sales を直接 SUM', () => {
  it.fails('classified_sales を subquery で事前集約しているべき', async () => {
    const conn = createDuplicateInjectingMockConn([passAllRule])
    await querySalesTotal(conn, dateFrom, dateTo, storeIds)
    const sql = conn.getCapturedSql()[0]
    assertSafeAgainstSource(sql, 'classified_sales')
  })
})

// ── freePeriodFactQueries.ts FRAGILE 1 件 ─────────────────────────────

describe('FRAGILE/6: queryFreePeriodDaily — cs 側を事前集約していない', () => {
  it.fails('classified_sales (cs) 側を subquery で事前集約しているべき', async () => {
    const conn = createDuplicateInjectingMockConn([passAllRule])
    await queryFreePeriodDaily(conn, dateFrom, dateTo, storeIds)
    const sql = conn.getCapturedSql()[0]
    // purchase 側は既に subquery 集約済み、cs 側のみ FRAGILE
    assertSafeAgainstSource(sql, 'classified_sales')
  })
})
