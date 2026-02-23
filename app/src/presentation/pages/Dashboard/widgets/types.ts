import type { ReactNode } from 'react'
import type { StoreResult, CategoryTimeSalesData, DepartmentKpiData, StoreExplanations, MetricId } from '@/domain/models'
import type { Store } from '@/domain/models'
import type { PrevYearData, PrevYearCategoryTimeSalesData } from '@/application/hooks'

export type WidgetSize = 'kpi' | 'half' | 'full'

/** 比較モード: 前年比 (yoy) / 前週比 (wow) */
export type ComparisonMode = 'yoy' | 'wow'

/** 前週比の比較期間を算出する。dayStart-7日 ～ dayEnd-7日。 */
export function wowPrevRange(dayStart: number, dayEnd: number): {
  prevStart: number
  prevEnd: number
  isValid: boolean
} {
  const prevStart = dayStart - 7
  const prevEnd = dayEnd - 7
  return { prevStart, prevEnd, isValid: prevStart >= 1 }
}

/** 比較モードに応じたラベルを返す */
export function comparisonLabels(
  mode: ComparisonMode,
  year: number,
  dayStart: number,
  dayEnd: number,
): { curLabel: string; prevLabel: string } {
  if (mode === 'yoy') {
    return { curLabel: `${year}年`, prevLabel: `${year - 1}年` }
  }
  const { prevStart, prevEnd } = wowPrevRange(dayStart, dayEnd)
  const curRange = dayStart === dayEnd ? `${dayStart}日` : `${dayStart}-${dayEnd}日`
  const prevRange = prevStart === prevEnd ? `${prevStart}日` : `${prevStart}-${prevEnd}日`
  return { curLabel: curRange, prevLabel: prevRange }
}

export interface WidgetDef {
  readonly id: string
  readonly label: string
  readonly group: string
  readonly size: WidgetSize
  readonly render: (ctx: WidgetContext) => ReactNode
  /** データ有無による表示判定（未設定時は常に表示） */
  readonly isVisible?: (ctx: WidgetContext) => boolean
}

export interface WidgetContext {
  result: StoreResult
  daysInMonth: number
  targetRate: number
  warningRate: number
  year: number
  month: number
  budgetChartData: { day: number; actualCum: number; budgetCum: number; prevYearCum: number | null }[]
  storeKey: string
  prevYear: PrevYearData
  /** All individual store results for multi-store widgets */
  allStoreResults: ReadonlyMap<string, StoreResult>
  /** Store master data */
  stores: ReadonlyMap<string, Store>
  /** 分類別時間帯売上データ */
  categoryTimeSales: CategoryTimeSalesData
  /** 選択中の店舗ID（空 = 全店） */
  selectedStoreIds: ReadonlySet<string>
  /** 取込データ有効末日 (null = 月末) */
  dataEndDay: number | null
  /** 販売データが存在する最大日（0 = 未検出） */
  dataMaxDay: number
  /** 取込データ有効期間から算出された経過日数 */
  elapsedDays: number | undefined
  /** 部門別KPIデータ */
  departmentKpi: DepartmentKpiData
  /** 前年分類別時間帯売上データ（同曜日オフセット適用済み） */
  prevYearCategoryTimeSales: PrevYearCategoryTimeSalesData
  /** 指標説明マップ（MetricBreakdownPanel 用） */
  explanations: StoreExplanations
  /** 指標の説明パネルを開く */
  onExplain: (metricId: MetricId) => void
}
