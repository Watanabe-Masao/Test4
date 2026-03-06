/**
 * YoYWaterfallChart の型定義・定数データ・データ変換関数
 */
import { decompose2, decompose3, decompose5 } from '@/application/hooks/useFactorDecomposition'
import { recordsToCategoryQtyAmt } from './categoryFactorUtils'
import type { CategoryTimeSalesRecord } from '@/domain/models'

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

  if (p.prevCust > 0 && p.curCust > 0) {
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
        }
      }
    }
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

interface CategoryDataParams {
  readonly periodCTS: readonly CategoryTimeSalesRecord[]
  readonly periodPrevCTS: readonly CategoryTimeSalesRecord[]
  readonly hasComparison: boolean
  readonly prevSales: number
  readonly curSales: number
  readonly prevLabel: string
  readonly curLabel: string
}

export function buildCategoryData(p: CategoryDataParams): WaterfallItem[] {
  if (p.periodCTS.length === 0 || p.periodPrevCTS.length === 0) return []
  if (!p.hasComparison || p.prevSales <= 0) return []

  // アンカー: 日別データ由来の合計
  const anchorPrev = p.prevSales
  const anchorCur = p.curSales

  // Aggregate by department (CTS由来)
  const curDepts = new Map<string, { name: string; amount: number }>()
  for (const rec of p.periodCTS) {
    const code = rec.department.code
    const ex = curDepts.get(code) ?? { name: rec.department.name || code, amount: 0 }
    ex.amount += rec.totalAmount
    curDepts.set(code, ex)
  }

  const prevDepts = new Map<string, { name: string; amount: number }>()
  for (const rec of p.periodPrevCTS) {
    const code = rec.department.code
    const ex = prevDepts.get(code) ?? { name: rec.department.name || code, amount: 0 }
    ex.amount += rec.totalAmount
    prevDepts.set(code, ex)
  }

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

  // Start: 比較元売上（売上データにアンカー）
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

  // データソース差異の端数調整
  const residual = anchorCur - running
  if (Math.abs(residual) >= 1) {
    items.push({
      name: '端数調整',
      value: residual,
      base: residual >= 0 ? running : running + residual,
      bar: Math.abs(residual),
    })
  }

  // End: 当期売上（売上データにアンカー）
  items.push({
    name: `${p.curLabel}売上`,
    value: anchorCur,
    base: 0,
    bar: anchorCur,
    isTotal: true,
  })

  return items
}
