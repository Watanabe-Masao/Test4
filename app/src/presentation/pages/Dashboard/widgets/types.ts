import type { CurrentCtsQuantity } from '@/application/hooks/useCtsQuantity'
import type { WidgetId } from './widgetOwnership'
import type { ReactNode } from 'react'
import type { ViewType } from '@/domain/models/storeTypes'
import type { DashboardWidgetContext } from './DashboardWidgetContext'

export type WidgetSize = 'kpi' | 'half' | 'full'

/** 比較モード: 前年比 (yoy) / 前週比 (wow) */
export type ComparisonMode = 'yoy' | 'wow'

/** 前週比の比較期間を算出する。dayStart-7日 ～ dayEnd-7日。 */
export function wowPrevRange(
  dayStart: number,
  dayEnd: number,
): {
  prevStart: number
  prevEnd: number
  isValid: boolean
} {
  const prevStart = dayStart - 7
  const prevEnd = dayEnd - 7
  return { prevStart, prevEnd, isValid: prevStart >= 1 }
}

/**
 * 比較モードに応じたラベルを返す。
 *
 * unify-period-analysis Phase 2: 前年ラベルの `year - 1` フォールバックを
 * 除去した。`prevYear` 未指定時は具体年を表示せず generic な「前年」ラベルを
 * 返す（presentation 層で比較先年を独自計算しないため）。caller は
 * `ctx.prevYearScope?.dateRange.from.year` を経由して domain で解決済みの
 * 値を渡すこと。
 */
export function comparisonLabels(
  mode: ComparisonMode,
  year: number,
  dayStart: number,
  dayEnd: number,
  prevYear?: number,
): { curLabel: string; prevLabel: string } {
  if (mode === 'yoy') {
    return {
      curLabel: `${year}年`,
      prevLabel: prevYear != null ? `${prevYear}年` : '前年',
    }
  }
  const { prevStart, prevEnd } = wowPrevRange(dayStart, dayEnd)
  const curRange = dayStart === dayEnd ? `${dayStart}日` : `${dayStart}-${dayEnd}日`
  const prevRange = prevStart === prevEnd ? `${prevStart}日` : `${prevStart}-${prevEnd}日`
  return { curLabel: curRange, prevLabel: prevRange }
}

/**
 * Dashboard ウィジェットコンテキスト
 *
 * @deprecated ADR-A-002 PR1 (2026-04-24): `DashboardWidgetContext` への
 * 後方互換 alias。新規コードは `./DashboardWidgetContext` から直接 import すること。
 * PR4 で本 alias は削除予定（LEG-004 sunsetCondition）。
 *
 * @sunsetCondition ADR-A-002 PR4 で本 alias を削除し、全 consumer が
 * DashboardWidgetContext を直接 import する状態に到達
 * @expiresAt 2026-05-31
 * @reason ADR-A-002: Dashboard 固有 20 field の集約と型レベル保証
 */
export type WidgetContext = DashboardWidgetContext

export interface WidgetDef {
  readonly id: WidgetId
  readonly label: string
  readonly group: string
  readonly size: WidgetSize
  readonly render: (ctx: WidgetContext) => ReactNode
  /** データ有無による表示判定（未設定時は常に表示） */
  readonly isVisible?: (ctx: WidgetContext) => boolean
  /** 関連ページへのリンク（「もっと詳しく」動線） */
  readonly linkTo?: { readonly view: ViewType; readonly tab?: string }
}

// re-export: CurrentCtsQuantity は Application 層で定義
export type { CurrentCtsQuantity }
