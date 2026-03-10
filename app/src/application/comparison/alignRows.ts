/**
 * Comparison / Alignment 層 — 比較先を確定した canonical rows を生成する
 *
 * ADR-003 で新設された層。DuckDB Data Provider と JS Analysis の間に位置する。
 *
 * ## 責務
 *
 * - current / previous の生データ行を受け取る
 * - 比較モード（sameDate / sameDayOfWeek）に応じた整列キーを生成する
 * - 整列済み canonical rows を出力する
 *
 * ## 設計原則
 *
 * - 純粋関数（副作用なし、同じ入力に同じ出力）
 * - 比較ルールをここに集約し、downstream は整列済みデータを消費するだけ
 * - マージキーの生成ロジックが分散しない（SQL JOIN 条件や hook のマージキーに埋め込まない）
 */

// ── 型定義 ──

/** 整列に必要な最小フィールド */
export interface AlignableRow {
  readonly dateKey: string
  readonly year: number
  readonly month: number
  readonly day: number
  readonly storeId: string
  readonly sales: number
  readonly customers: number
}

/** 整列済み canonical row — downstream が消費する中間表現 */
export interface AlignedRow {
  /** 整列キー（storeId + 比較モードに依存したキー） */
  readonly alignmentKey: string
  /** 当期の日付キー (YYYY-MM-DD)。前期のみの行は null */
  readonly currentDateKey: string | null
  /** 比較期の日付キー (YYYY-MM-DD)。当期のみの行は null */
  readonly compareDateKey: string | null
  /** 店舗ID */
  readonly storeId: string
  /** 当期売上 */
  readonly currentSales: number
  /** 比較期売上（null = 比較期にデータなし） */
  readonly compareSales: number | null
  /** 当期客数 */
  readonly currentCustomers: number
  /** 比較期客数（null = 比較期にデータなし） */
  readonly compareCustomers: number | null
}

/** 比較モード */
export type CompareMode = 'sameDate' | 'sameDayOfWeek'

// ── 整列キー生成 ──

/**
 * 比較モードに応じた整列キーを生成する。
 *
 * sameDate:      storeId|month|day — カレンダー日付で対応
 * sameDayOfWeek: storeId|month|day — 同じ（offset は DuckDB 取得範囲で調整済み）
 *
 * 現時点ではどちらのモードも同じキーを使用する。
 * offset による調整は上流（resolveComparisonFrame / applyPreset）で
 * 前年の取得範囲に焼き込まれているため、ここでは追加調整不要。
 */
function makeAlignmentKey(storeId: string, month: number, day: number): string {
  return `${storeId}|${month}|${day}`
}

// ── 行のグループ化 ──

interface GroupedEntry {
  dateKey: string
  sales: number
  customers: number
}

function groupByAlignmentKey(rows: readonly AlignableRow[]): Map<string, GroupedEntry> {
  const map = new Map<string, GroupedEntry>()
  for (const r of rows) {
    const key = makeAlignmentKey(r.storeId, r.month, r.day)
    const existing = map.get(key)
    if (existing) {
      existing.sales += r.sales
      existing.customers += r.customers
    } else {
      map.set(key, {
        dateKey: r.dateKey,
        sales: r.sales,
        customers: r.customers,
      })
    }
  }
  return map
}

// ── メイン関数 ──

/**
 * current / previous の生データ行から整列済み canonical rows を生成する。
 *
 * FULL OUTER JOIN 相当：当期のみ・比較期のみ・両方にある行すべてを出力する。
 *
 * @param currentRows 当期の生データ行
 * @param previousRows 比較期の生データ行
 * @returns 整列済み canonical rows（alignmentKey 昇順）
 */
export function alignRows(
  currentRows: readonly AlignableRow[],
  previousRows: readonly AlignableRow[],
): AlignedRow[] {
  const curMap = groupByAlignmentKey(currentRows)
  const prevMap = groupByAlignmentKey(previousRows)

  const allKeys = new Set([...curMap.keys(), ...prevMap.keys()])
  const result: AlignedRow[] = []

  for (const key of allKeys) {
    const parts = key.split('|')
    const storeId = parts[0]
    const cur = curMap.get(key)
    const prev = prevMap.get(key)

    result.push({
      alignmentKey: key,
      currentDateKey: cur?.dateKey ?? null,
      compareDateKey: prev?.dateKey ?? null,
      storeId,
      currentSales: cur?.sales ?? 0,
      compareSales: prev ? prev.sales : null,
      currentCustomers: cur?.customers ?? 0,
      compareCustomers: prev ? prev.customers : null,
    })
  }

  return result.sort((a, b) => {
    if (a.storeId < b.storeId) return -1
    if (a.storeId > b.storeId) return 1
    const aKey = a.currentDateKey ?? a.compareDateKey ?? ''
    const bKey = b.currentDateKey ?? b.compareDateKey ?? ''
    return aKey < bKey ? -1 : aKey > bKey ? 1 : 0
  })
}

// ── YoyDailyRow 互換変換 ──

/**
 * AlignedRow[] を YoyDailyRow[] 互換の shape に変換する。
 *
 * 既存チャートコンポーネント（YoYChart 等）が YoyDailyRow を期待するため、
 * 移行期間中の互換性を維持する Chart VM 変換。
 */
export function toYoyDailyRows(aligned: readonly AlignedRow[]): {
  readonly curDateKey: string | null
  readonly prevDateKey: string | null
  readonly storeId: string
  readonly curSales: number
  readonly prevSales: number | null
  readonly salesDiff: number
  readonly curCustomers: number
  readonly prevCustomers: number | null
}[] {
  return aligned.map((r) => ({
    curDateKey: r.currentDateKey,
    prevDateKey: r.compareDateKey,
    storeId: r.storeId,
    curSales: r.currentSales,
    prevSales: r.compareSales,
    salesDiff: r.currentSales - (r.compareSales ?? 0),
    curCustomers: r.currentCustomers,
    prevCustomers: r.compareCustomers,
  }))
}
