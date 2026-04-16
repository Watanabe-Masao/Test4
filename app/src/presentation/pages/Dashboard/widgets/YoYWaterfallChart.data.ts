/**
 * YoYWaterfallChart の型定義・定数データ・データ変換関数
 */
import { decompose2, decompose3, decompose5 } from '@/application/hooks/calculation'
import { calculateShare } from '@/domain/calculations/utils'
import { recordsToCategoryQtyAmt } from './categoryFactorUtils'
import type { CategoryTimeSalesRecord } from '@/domain/models/record'
import type { CategoryDailySeries } from '@/application/hooks/categoryDaily/CategoryDailyBundle.types'

export interface WaterfallItem {
  name: string
  value: number
  base: number
  bar: number
  isTotal?: boolean
}

export type ViewMode = 'factor' | 'category' | 'categoryFactor'
export type DecompLevel = 2 | 3 | 5

export const DECOMP_HELP: Record<
  number,
  { title: string; items: { label: string; formula: string; desc: string }[] }
> = {
  2: {
    title: '2要素分解（シャープリー値）',
    items: [
      { label: '客数効果', formula: '(C₁-C₀)×(T₀+T₁)/2', desc: '来店客数の変化による売上変動' },
      {
        label: '客単価効果',
        formula: '(T₁-T₀)×(C₀+C₁)/2',
        desc: '1人あたり購入額の変化による売上変動',
      },
    ],
  },
  3: {
    title: '3要素分解（シャープリー値）',
    items: [
      { label: '客数効果', formula: '客数変化 × 平均(点数×単価)', desc: '来店客数の増減' },
      { label: '点数効果', formula: '点数変化 × 平均(客数×単価)', desc: '1人あたり購入点数の増減' },
      { label: '単価効果', formula: '単価変化 × 平均(客数×点数)', desc: '1点あたり平均単価の増減' },
    ],
  },
  5: {
    title: '5要素分解（4変数シャープリー値）',
    items: [
      { label: '客数効果', formula: '3要素と同一', desc: '来店客数の増減' },
      { label: '点数効果', formula: '3要素と同一', desc: '1人あたり購入点数の増減' },
      {
        label: '価格効果',
        formula: 'Σカテゴリ(単価変化×前年構成比)',
        desc: 'カテゴリ内での単価変動',
      },
      {
        label: '構成比変化効果',
        formula: 'Σカテゴリ(構成比変化×加重平均単価)',
        desc: '高単価/低単価カテゴリへのシフト',
      },
    ],
  },
}

/* ------------------------------------------------------------------ */
/*  buildFactorData — 要因分解ウォーターフォールデータ構築              */
/* ------------------------------------------------------------------ */

interface FactorDataParams {
  readonly hasComparison: boolean
  readonly prevSales: number
  readonly curSales: number
  readonly prevCust: number
  readonly curCust: number
  readonly hasQuantity: boolean
  readonly curTotalQty: number
  readonly prevTotalQty: number
  readonly priceMix: unknown
  readonly activeLevel: DecompLevel
  readonly periodCTS: readonly CategoryTimeSalesRecord[]
  readonly periodPrevCTS: readonly CategoryTimeSalesRecord[]
  readonly prevLabel: string
  readonly curLabel: string
}

export function buildFactorData(p: FactorDataParams): WaterfallItem[] {
  if (!p.hasComparison || p.prevSales <= 0) return []

  const items: WaterfallItem[] = []
  items.push({
    name: `${p.prevLabel}売上`,
    value: p.prevSales,
    base: 0,
    bar: p.prevSales,
    isTotal: true,
  })

  let running = p.prevSales
  const push = (name: string, value: number) => {
    items.push({
      name,
      value,
      base: value >= 0 ? running : running + value,
      bar: Math.abs(value),
    })
    running += value
  }

  const hasCust = p.prevCust > 0 && p.curCust > 0

  if (hasCust) {
    if (p.activeLevel === 2) {
      const d = decompose2(p.prevSales, p.curSales, p.prevCust, p.curCust)
      push('客数効果', d.custEffect)
      push('客単価効果', d.ticketEffect)
    } else if (p.activeLevel === 3 || !p.priceMix) {
      if (p.hasQuantity) {
        const d = decompose3(
          p.prevSales,
          p.curSales,
          p.prevCust,
          p.curCust,
          p.prevTotalQty,
          p.curTotalQty,
        )
        push('客数効果', d.custEffect)
        push('点数効果', d.qtyEffect)
        push('単価効果', d.pricePerItemEffect)
      } else {
        const d = decompose2(p.prevSales, p.curSales, p.prevCust, p.curCust)
        push('客数効果', d.custEffect)
        push('客単価効果', d.ticketEffect)
      }
    } else {
      // 5-factor: full 4-variable Shapley
      if (p.hasQuantity) {
        const d = decompose5(
          p.prevSales,
          p.curSales,
          p.prevCust,
          p.curCust,
          p.prevTotalQty,
          p.curTotalQty,
          recordsToCategoryQtyAmt(p.periodCTS),
          recordsToCategoryQtyAmt(p.periodPrevCTS),
        )
        if (d) {
          push('客数効果', d.custEffect)
          push('点数効果', d.qtyEffect)
          push('価格効果', d.priceEffect)
          push('構成比変化効果', d.mixEffect)
        } else {
          // priceMix 計算失敗時は 3要素分解にフォールバック
          const d3 = decompose3(
            p.prevSales,
            p.curSales,
            p.prevCust,
            p.curCust,
            p.prevTotalQty,
            p.curTotalQty,
          )
          push('客数効果', d3.custEffect)
          push('点数効果', d3.qtyEffect)
          push('単価効果', d3.pricePerItemEffect)
        }
      }
    }
  } else if (p.hasQuantity) {
    // 客数データ不在時: 点数ベースの2要素分解（数量効果 + 点単価効果）
    const d = decompose2(p.prevSales, p.curSales, p.prevTotalQty, p.curTotalQty)
    push('数量効果', d.custEffect)
    push('点単価効果', d.ticketEffect)
  } else {
    push('増減', p.curSales - p.prevSales)
  }

  items.push({
    name: `${p.curLabel}売上`,
    value: p.curSales,
    base: 0,
    bar: p.curSales,
    isTotal: true,
  })
  return items
}

/* ------------------------------------------------------------------ */
/*  buildCategoryData — 部門別増減ウォーターフォールデータ構築          */
/* ------------------------------------------------------------------ */

/**
 * Phase 6.5-5b: `buildCategoryData` の入力を `CategoryDailySeries` (dept-grain
 * projection) に切替。従来の `periodCTS[]` による dept 単位集約は projection
 * 側で完了しているため、entries を直接消費する形に簡素化される。
 *
 * Shapley 5-factor (leaf-grain) ではなく dept-only ウォーターフォールなので、
 * 本関数は `CategoryDailySeries` の範囲で完結する。
 */
interface CategoryDataParams {
  readonly categoryDailySeries: CategoryDailySeries | null
  readonly categoryDailyPrevSeries: CategoryDailySeries | null
  readonly hasComparison: boolean
  readonly prevSales: number
  readonly curSales: number
  readonly prevLabel: string
  readonly curLabel: string
}

/** 部門別増減の構築結果 */
export interface CategoryDataResult {
  readonly items: readonly WaterfallItem[]
  /** CTS合計と部門内訳の残差（0に近いほど正常） */
  readonly residual: number
  /** 残差率（anchorCur 基準、AMOUNT_RECONCILIATION_TOLERANCE 超で警告） */
  readonly residualPct: number
}

export function buildCategoryData(p: CategoryDataParams): CategoryDataResult {
  const EMPTY: CategoryDataResult = { items: [], residual: 0, residualPct: 0 }
  const cur = p.categoryDailySeries
  const prev = p.categoryDailyPrevSeries
  if (!cur || !prev || cur.entries.length === 0 || prev.entries.length === 0) return EMPTY
  if (!p.hasComparison || p.prevSales <= 0) return EMPTY

  // Phase 6.5-5b: projection が既に dept 単位で totals を持つので直接 Map 化
  const curDepts = new Map<string, { name: string; amount: number }>()
  for (const entry of cur.entries) {
    curDepts.set(entry.deptCode, {
      name: entry.deptName || entry.deptCode,
      amount: entry.totals.sales,
    })
  }

  const prevDepts = new Map<string, { name: string; amount: number }>()
  for (const entry of prev.entries) {
    prevDepts.set(entry.deptCode, {
      name: entry.deptName || entry.deptCode,
      amount: entry.totals.sales,
    })
  }

  // lane grandTotals をアンカーに使う (projection で事前計算済み)
  const ctsPrevTotal = prev.grandTotals.sales
  const ctsCurTotal = cur.grandTotals.sales

  // lane データが空に近い場合は r.daily ベースの prevSales/curSales にフォールバック
  const anchorPrev = ctsPrevTotal > 0 ? ctsPrevTotal : p.prevSales
  const anchorCur = ctsCurTotal > 0 ? ctsCurTotal : p.curSales

  // Build items sorted by absolute difference (largest impact first)
  const allCodes = new Set([...curDepts.keys(), ...prevDepts.keys()])
  const diffs: { code: string; name: string; diff: number }[] = []
  for (const code of allCodes) {
    const cur = curDepts.get(code)?.amount ?? 0
    const prev = prevDepts.get(code)?.amount ?? 0
    const name = curDepts.get(code)?.name ?? prevDepts.get(code)?.name ?? code
    if (Math.abs(cur - prev) > 0) {
      diffs.push({ code, name, diff: cur - prev })
    }
  }
  diffs.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))

  const items: WaterfallItem[] = []

  // Start: 比較元売上（CTS合計にアンカー）
  items.push({
    name: `${p.prevLabel}売上`,
    value: anchorPrev,
    base: 0,
    bar: anchorPrev,
    isTotal: true,
  })

  // Department differences
  let running = anchorPrev
  for (const d of diffs.slice(0, 8)) {
    items.push({
      name: d.name,
      value: d.diff,
      base: d.diff >= 0 ? running : running + d.diff,
      bar: Math.abs(d.diff),
    })
    running += d.diff
  }

  // If there are remaining depts, group as "その他"
  const remainingDiffs = diffs.slice(8)
  if (remainingDiffs.length > 0) {
    const otherDiff = remainingDiffs.reduce((s, d) => s + d.diff, 0)
    if (Math.abs(otherDiff) > 0) {
      items.push({
        name: `その他(${remainingDiffs.length}部門)`,
        value: otherDiff,
        base: otherDiff >= 0 ? running : running + otherDiff,
        bar: Math.abs(otherDiff),
      })
      running += otherDiff
    }
  }

  // 残差計算（同一データソースなら 0 に近い。大きければデータ不整合）
  const residual = anchorCur - running
  const residualPct = calculateShare(Math.abs(residual), anchorCur)

  if (Math.abs(residual) >= 1) {
    items.push({
      name: '調整',
      value: residual,
      base: residual >= 0 ? running : running + residual,
      bar: Math.abs(residual),
    })
  }

  // End: 当期売上（CTS合計にアンカー）
  items.push({
    name: `${p.curLabel}売上`,
    value: anchorCur,
    base: 0,
    bar: anchorCur,
    isTotal: true,
  })

  return { items, residual, residualPct }
}
