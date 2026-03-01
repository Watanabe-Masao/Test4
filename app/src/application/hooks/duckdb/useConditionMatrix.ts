/**
 * コンディションマトリクスフック
 *
 * 当期・前年同期・前週同期の3期間分のメトリクスを DuckDB から取得し、
 * 自店/他店の比率マトリクスを構築する。
 */
import { useMemo } from 'react'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models'
import {
  queryConditionMatrix,
  type ConditionMatrixRow,
} from '@/infrastructure/duckdb/queries/conditionMatrix'
import { useAsyncQuery, type AsyncQueryResult } from './useAsyncQuery'

export type { ConditionMatrixRow }

/** マトリクスセル: 比率 + シグナル判定用の実値 */
export interface MatrixCell {
  /** 比率（1.0 = 変化なし、> 1 = 増加、< 1 = 減少）。比較不能時は null */
  readonly ratio: number | null
  readonly current: number
  readonly comparison: number
}

/** 1行分のマトリクスデータ（全指標列を持つ） */
export interface MatrixRowData {
  readonly label: string
  readonly customers: MatrixCell
  readonly sales: MatrixCell
  readonly txValue: MatrixCell
  readonly discountRate: MatrixCell
  readonly consumableRate: MatrixCell
}

/** 全体のマトリクス結果 */
export interface ConditionMatrixResult {
  /** 選択店舗の自店比較行 */
  readonly ownYoY: MatrixRowData
  readonly ownWoW: MatrixRowData
  /** 他店平均との比較行（全店 > 1 の場合のみ有効） */
  readonly crossYoY: MatrixRowData | null
  readonly crossWoW: MatrixRowData | null
  /** 自店の構成比変化（売上シェア変化率） */
  readonly ownCompositionChange: MatrixRowData | null
}

// ── ヘルパー ──

function cell(cur: number, prev: number): MatrixCell {
  return {
    ratio: prev > 0 ? cur / prev : null,
    current: cur,
    comparison: prev,
  }
}

function rateCell(curRate: number, prevRate: number): MatrixCell {
  return {
    ratio: prevRate > 0 ? curRate / prevRate : null,
    current: curRate,
    comparison: prevRate,
  }
}

function txValue(sales: number, customers: number): number {
  return customers > 0 ? sales / customers : 0
}

function buildRow(
  label: string,
  cur: { sales: number; customers: number; discountRate: number; consumableRate: number },
  prev: { sales: number; customers: number; discountRate: number; consumableRate: number },
): MatrixRowData {
  return {
    label,
    customers: cell(cur.customers, prev.customers),
    sales: cell(cur.sales, prev.sales),
    txValue: cell(txValue(cur.sales, cur.customers), txValue(prev.sales, prev.customers)),
    discountRate: rateCell(cur.discountRate, prev.discountRate),
    consumableRate: rateCell(cur.consumableRate, prev.consumableRate),
  }
}

function avgMetrics(
  rows: readonly ConditionMatrixRow[],
  period: 'cur' | 'py' | 'pw',
): { sales: number; customers: number; discountRate: number; consumableRate: number } {
  if (rows.length === 0) {
    return { sales: 0, customers: 0, discountRate: 0, consumableRate: 0 }
  }
  const totalSales = rows.reduce((s, r) => s + r[`${period}Sales`], 0)
  const totalCustomers = rows.reduce((s, r) => s + r[`${period}Customers`], 0)
  const totalDiscount = rows.reduce((s, r) => s + r[`${period}Discount`], 0)
  const grossSales = totalSales + totalDiscount
  const totalConsumable = rows.reduce((s, r) => s + r[`${period}Consumable`], 0)
  return {
    sales: totalSales,
    customers: totalCustomers,
    discountRate: grossSales > 0 ? totalDiscount / grossSales : 0,
    consumableRate: totalSales > 0 ? totalConsumable / totalSales : 0,
  }
}

function storeMetrics(
  row: ConditionMatrixRow,
  period: 'cur' | 'py' | 'pw',
): { sales: number; customers: number; discountRate: number; consumableRate: number } {
  return {
    sales: row[`${period}Sales`],
    customers: row[`${period}Customers`],
    discountRate: row[`${period}DiscountRate`],
    consumableRate: row[`${period}ConsumableRate`],
  }
}

/**
 * DuckDB からコンディションマトリクスデータを取得する
 */
export function useDuckDBConditionMatrix(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
): AsyncQueryResult<readonly ConditionMatrixRow[]> {
  const queryFn = useMemo(() => {
    if (!dateRange) return null
    return (c: AsyncDuckDBConnection) => queryConditionMatrix(c, dateRange, storeIds)
  }, [dateRange, storeIds])

  return useAsyncQuery(conn, dataVersion, queryFn)
}

/**
 * ConditionMatrixRow[] から表示用マトリクスを構築する
 *
 * @param rows     全店舗分のクエリ結果
 * @param storeId  表示対象の店舗ID（全店合算表示の場合は undefined）
 */
export function buildConditionMatrix(
  rows: readonly ConditionMatrixRow[],
  storeId: string | undefined,
): ConditionMatrixResult {
  // 対象店舗のデータ
  const targetRow = storeId ? rows.find((r) => r.storeId === storeId) : undefined
  const hasTarget = !!targetRow

  // 全店平均（対象店舗がある場合は除外して「他店」平均を出す）
  const otherRows = storeId ? rows.filter((r) => r.storeId !== storeId) : rows

  // 自店メトリクス（対象店舗がない場合は全店合算）
  const ownCur = hasTarget ? storeMetrics(targetRow, 'cur') : avgMetrics(rows, 'cur')
  const ownPy = hasTarget ? storeMetrics(targetRow, 'py') : avgMetrics(rows, 'py')
  const ownPw = hasTarget ? storeMetrics(targetRow, 'pw') : avgMetrics(rows, 'pw')

  // 自店の前年比・前週比
  const ownYoY = buildRow('自店前年比', ownCur, ownPy)
  const ownWoW = buildRow('自店前週比', ownCur, ownPw)

  // 他店比較（他店が存在する場合のみ）
  let crossYoY: MatrixRowData | null = null
  let crossWoW: MatrixRowData | null = null
  let ownCompositionChange: MatrixRowData | null = null

  if (otherRows.length > 0 && hasTarget) {
    const otherCur = avgMetrics(otherRows, 'cur')
    const otherPy = avgMetrics(otherRows, 'py')
    const otherPw = avgMetrics(otherRows, 'pw')

    // 他店の前年比
    const otherYoYRow = buildRow('他店平均前年比', otherCur, otherPy)
    // 他店の前週比
    const otherWoWRow = buildRow('他店平均前週比', otherCur, otherPw)

    // 自店 vs 他店: 自店比率 / 他店比率
    crossYoY = {
      label: '他店比較前年比',
      customers: crossCell(ownYoY.customers, otherYoYRow.customers),
      sales: crossCell(ownYoY.sales, otherYoYRow.sales),
      txValue: crossCell(ownYoY.txValue, otherYoYRow.txValue),
      discountRate: crossCell(ownYoY.discountRate, otherYoYRow.discountRate),
      consumableRate: crossCell(ownYoY.consumableRate, otherYoYRow.consumableRate),
    }
    crossWoW = {
      label: '他店比較前週比',
      customers: crossCell(ownWoW.customers, otherWoWRow.customers),
      sales: crossCell(ownWoW.sales, otherWoWRow.sales),
      txValue: crossCell(ownWoW.txValue, otherWoWRow.txValue),
      discountRate: crossCell(ownWoW.discountRate, otherWoWRow.discountRate),
      consumableRate: crossCell(ownWoW.consumableRate, otherWoWRow.consumableRate),
    }

    // 自店の販売構成比変化（全体売上に占めるシェアの変化）
    const allCur = avgMetrics(rows, 'cur')
    const allPy = avgMetrics(rows, 'py')
    const curShare = allCur.sales > 0 ? ownCur.sales / allCur.sales : 0
    const pyShare = allPy.sales > 0 ? ownPy.sales / allPy.sales : 0
    const curCustShare = allCur.customers > 0 ? ownCur.customers / allCur.customers : 0
    const pyCustShare = allPy.customers > 0 ? ownPy.customers / allPy.customers : 0
    ownCompositionChange = {
      label: '自店構成比変化',
      customers: {
        ratio: pyCustShare > 0 ? curCustShare / pyCustShare : null,
        current: curCustShare,
        comparison: pyCustShare,
      },
      sales: {
        ratio: pyShare > 0 ? curShare / pyShare : null,
        current: curShare,
        comparison: pyShare,
      },
      txValue: { ratio: null, current: 0, comparison: 0 },
      discountRate: { ratio: null, current: 0, comparison: 0 },
      consumableRate: { ratio: null, current: 0, comparison: 0 },
    }
  }

  return { ownYoY, ownWoW, crossYoY, crossWoW, ownCompositionChange }
}

/** 自店比率 / 他店比率 でクロス比較セルを作る */
function crossCell(own: MatrixCell, other: MatrixCell): MatrixCell {
  const ratio =
    own.ratio != null && other.ratio != null && other.ratio > 0 ? own.ratio / other.ratio : null
  return { ratio, current: own.ratio ?? 0, comparison: other.ratio ?? 0 }
}
