/**
 * @responsibility R:unclassified
 */

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

// ADR-A-002 PR4 (2026-04-24): WidgetContext alias を削除完了 (LEG-004 sunsetCondition 達成)。
// 全 consumer は DashboardWidgetContext を直接 import すること。

/**
 * Dashboard ウィジェット render-time コンテキスト alias
 *
 * ADR-A-004 PR3 (2026-04-25): chokepoint narrowing パターンの命名統一。
 * `DashboardWidgetContext` は base を `RenderUnifiedWidgetContext` に変更済で
 * 既に render-time 型なので、本 alias は対称性のためのみ存在する。
 * 新規 consumer は `DashboardWidgetContext` をそのまま使ってよい。
 */
export type RenderDashboardWidgetContext = DashboardWidgetContext

/**
 * Dashboard ウィジェット定義
 *
 * ADR-A-003 PR2-PR4 (2026-04-24): WidgetDef の 2 ファイル並存を解消するため
 * DashboardWidgetDef に rename し、旧 alias を物理削除。LEG-006 sunsetCondition 達成。
 *
 * ADR-A-004 PR3 (2026-04-25): `DashboardWidgetContext` は render-time 型に
 * 切替済（base = RenderUnifiedWidgetContext）。signature 変更不要。
 */
export interface DashboardWidgetDef {
  readonly id: WidgetId
  readonly label: string
  readonly group: string
  readonly size: WidgetSize
  readonly render: (ctx: DashboardWidgetContext) => ReactNode
  /** データ有無による表示判定（未設定時は常に表示） */
  readonly isVisible?: (ctx: DashboardWidgetContext) => boolean
  /** 関連ページへのリンク（「もっと詳しく」動線） */
  readonly linkTo?: { readonly view: ViewType; readonly tab?: string }
}

// ADR-A-003 PR4 (2026-04-24): WidgetDef alias を削除完了 (LEG-006 sunsetCondition 達成)。
// 全 consumer は DashboardWidgetDef を直接 import すること。

// re-export: CurrentCtsQuantity は Application 層で定義
export type { CurrentCtsQuantity }
