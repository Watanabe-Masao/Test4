/**
 * Comparison / Alignment 層 — 比較先を確定した canonical rows を生成する
 *
 * ADR-003 で新設された層。DuckDB Data Provider と JS Analysis の間に位置する。
 *
 * ## 責務
 *
 * - current / previous の生データ行を受け取る
 * - 比較モード（sameDate / sameDayOfWeek）と dowOffset に応じて比較先日付を解決する
 * - 整列済み canonical rows を出力する
 *
 * ## 設計原則
 *
 * - 純粋関数（副作用なし、同じ入力に同じ出力）
 * - 比較ルールをここに集約し、downstream は整列済みデータを消費するだけ
 * - マージキーの生成ロジックが分散しない（SQL JOIN 条件や hook のマージキーに埋め込まない）
 *
 * ## 整列モデル: current row 起点の date pair 解決
 *
 * 旧設計では current / previous を month|day で箱分けして merge していたが、
 * これでは sameDate と sameDayOfWeek を区別できず、月跨ぎで破綻する。
 *
 * 新設計では:
 * 1. previous 行を storeId|dateKey でインデックス化
 * 2. current 行ごとに compareMode + dowOffset から比較先 dateKey を算出
 * 3. previous インデックスから比較先を O(1) ルックアップ
 *
 * これにより alignmentKey が「確定済み日付ペア + 比較モード」になり、
 * 月跨ぎ・2月末・leap year を自然に吸収する。
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
  /** 整列キー（storeId|currentDateKey|compareDateKey|compareMode） */
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

// ── previous 行のインデックス化 ──

interface AggregatedEntry {
  dateKey: string
  sales: number
  customers: number
}

/**
 * previous 行を storeId|dateKey でインデックス化する。
 * 同一キーの複数行は合算する。
 */
function buildPreviousIndex(rows: readonly AlignableRow[]): Map<string, AggregatedEntry> {
  const map = new Map<string, AggregatedEntry>()
  for (const r of rows) {
    const key = `${r.storeId}|${r.dateKey}`
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

/**
 * current 行を storeId|dateKey でグループ化する。
 * 同一キーの複数行は合算する。
 */
function aggregateCurrentRows(rows: readonly AlignableRow[]): {
  storeId: string
  dateKey: string
  year: number
  month: number
  day: number
  sales: number
  customers: number
}[] {
  const map = new Map<
    string,
    {
      storeId: string
      dateKey: string
      year: number
      month: number
      day: number
      sales: number
      customers: number
    }
  >()
  for (const r of rows) {
    const key = `${r.storeId}|${r.dateKey}`
    const existing = map.get(key)
    if (existing) {
      existing.sales += r.sales
      existing.customers += r.customers
    } else {
      map.set(key, {
        storeId: r.storeId,
        dateKey: r.dateKey,
        year: r.year,
        month: r.month,
        day: r.day,
        sales: r.sales,
        customers: r.customers,
      })
    }
  }
  return Array.from(map.values())
}

// ── 比較先日付の解決 ──

/**
 * current 行から比較先の dateKey を算出する。
 *
 * sameDate:      前年同月同日（例: 2026-03-01 → 2025-03-01）
 * sameDayOfWeek: 前年同月 (day + dowOffset) 日（月跨ぎは Date 演算で吸収）
 *
 * Date コンストラクタが 2月末、月跨ぎ、leap year を自動処理する。
 */
function resolveCompareDateKey(
  year: number,
  month: number,
  day: number,
  compareMode: CompareMode,
  dowOffset: number,
): string {
  if (compareMode === 'sameDate') {
    const d = new Date(year - 1, month - 1, day)
    return formatDateKey(d)
  }
  // sameDayOfWeek: 前年の (day + dowOffset) 日
  const d = new Date(year - 1, month - 1, day + dowOffset)
  return formatDateKey(d)
}

function formatDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ── ソート ──

function sortAlignedRows(rows: AlignedRow[]): AlignedRow[] {
  return rows.sort((a, b) => {
    if (a.storeId < b.storeId) return -1
    if (a.storeId > b.storeId) return 1
    const aKey = a.currentDateKey ?? a.compareDateKey ?? ''
    const bKey = b.currentDateKey ?? b.compareDateKey ?? ''
    return aKey < bKey ? -1 : aKey > bKey ? 1 : 0
  })
}

// ── メイン関数 ──

/**
 * current / previous の生データ行から整列済み canonical rows を生成する。
 *
 * current 行ごとに compareMode + dowOffset から比較先 dateKey を算出し、
 * previous インデックスから O(1) でルックアップする。
 *
 * ## 整列キー
 *
 * alignmentKey = `storeId|currentDateKey|compareDateKey|compareMode`
 * 確定済み日付ペアがキーに含まれるため:
 * - sameDate と sameDayOfWeek で異なる対応関係を正しく区別
 * - 月跨ぎ時も比較先が中間表現に明示的に残る
 *
 * @param currentRows 当期の生データ行
 * @param previousRows 比較期の生データ行
 * @param compareMode 比較モード（'sameDate' | 'sameDayOfWeek'）
 * @param dowOffset 同曜日オフセット（sameDate なら 0）
 * @returns 整列済み canonical rows（storeId → dateKey 昇順）
 */
export function alignRows(
  currentRows: readonly AlignableRow[],
  previousRows: readonly AlignableRow[],
  compareMode: CompareMode = 'sameDate',
  dowOffset: number = 0,
): AlignedRow[] {
  const prevIndex = buildPreviousIndex(previousRows)
  const aggregatedCurrent = aggregateCurrentRows(currentRows)

  // current 行が参照した previous キーを追跡
  const matchedPrevKeys = new Set<string>()

  const result: AlignedRow[] = []

  for (const cur of aggregatedCurrent) {
    const compareDateKey = resolveCompareDateKey(
      cur.year,
      cur.month,
      cur.day,
      compareMode,
      dowOffset,
    )
    const prevKey = `${cur.storeId}|${compareDateKey}`
    const prev = prevIndex.get(prevKey)

    if (prev) {
      matchedPrevKeys.add(prevKey)
    }

    result.push({
      alignmentKey: `${cur.storeId}|${cur.dateKey}|${compareDateKey}|${compareMode}`,
      currentDateKey: cur.dateKey,
      compareDateKey: prev ? prev.dateKey : compareDateKey,
      storeId: cur.storeId,
      currentSales: cur.sales,
      compareSales: prev?.sales ?? null,
      currentCustomers: cur.customers,
      compareCustomers: prev?.customers ?? null,
    })
  }

  // previous にのみ存在する行（current に対応行がない）を追加
  for (const [key, entry] of prevIndex) {
    if (!matchedPrevKeys.has(key)) {
      const storeId = key.split('|')[0]
      result.push({
        alignmentKey: `${storeId}|_|${entry.dateKey}|${compareMode}`,
        currentDateKey: null,
        compareDateKey: entry.dateKey,
        storeId,
        currentSales: 0,
        compareSales: entry.sales,
        currentCustomers: 0,
        compareCustomers: entry.customers,
      })
    }
  }

  return sortAlignedRows(result)
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
