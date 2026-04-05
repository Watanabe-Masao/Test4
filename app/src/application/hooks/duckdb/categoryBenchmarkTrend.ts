/**
 * カテゴリベンチマーク日別トレンド構築（純粋関数）
 *
 * categoryBenchmarkLogic.ts から分離。
 * 日別トレンドデータの構築を担う。
 *
 * @guard G5 hook ≤300行
 */
import type { CategoryBenchmarkTrendRow } from '@/infrastructure/duckdb/queries/advancedAnalytics'

/** 日別トレンドデータのポイント */
export interface CategoryTrendPoint {
  readonly dateKey: string
  readonly code: string
  readonly name: string
  readonly avgShare: number
  readonly cv: number
  readonly stability: number
  /** 複合スコア: avgShare × stability（ソート・プロット用の絶対値） */
  readonly compositeScore: number
}

/**
 * 日別トレンドデータ構築
 */
export function buildCategoryTrendData(
  rows: readonly CategoryBenchmarkTrendRow[],
  topCodes: readonly string[],
  totalStoreCount = 0,
): readonly CategoryTrendPoint[] {
  const topSet = new Set(topCodes)

  const grouped = new Map<string, { name: string; shares: number[]; sqlStoreCount: number }>()
  for (const row of rows) {
    if (!topSet.has(row.code)) continue
    const key = `${row.dateKey}|${row.code}`
    let entry = grouped.get(key)
    if (!entry) {
      entry = { name: row.name, shares: [], sqlStoreCount: 0 }
      grouped.set(key, entry)
    }
    entry.shares.push(row.share)
    entry.sqlStoreCount = entry.shares.length
  }

  const results: CategoryTrendPoint[] = []
  for (const [key, entry] of grouped) {
    const [dateKey, code] = key.split('|')
    const n =
      totalStoreCount > 0 ? Math.max(totalStoreCount, entry.sqlStoreCount) : entry.sqlStoreCount
    const allShares = [...entry.shares]
    const missingStores = n - entry.sqlStoreCount
    for (let i = 0; i < missingStores; i++) allShares.push(0)

    const avgShare = allShares.reduce((a, b) => a + b, 0) / n
    const stddev = Math.sqrt(
      allShares.reduce((s, v) => s + (v - avgShare) ** 2, 0) / Math.max(n - 1, 1),
    )
    const cv = avgShare > 0 ? stddev / avgShare : 0
    const stability = Math.max(0, 1 - cv / 2)

    results.push({
      dateKey,
      code,
      name: entry.name,
      avgShare,
      cv,
      stability,
      compositeScore: avgShare * stability * 10000,
    })
  }

  results.sort((a, b) => a.dateKey.localeCompare(b.dateKey) || a.code.localeCompare(b.code))
  return results
}
