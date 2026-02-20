import type { ReactNode } from 'react'
import type { StoreResult, CategoryTimeSalesData, DepartmentKpiData } from '@/domain/models'
import type { Store } from '@/domain/models'
import type { PrevYearData } from '@/application/hooks'

export type WidgetSize = 'kpi' | 'half' | 'full'

export interface WidgetDef {
  readonly id: string
  readonly label: string
  readonly group: string
  readonly size: WidgetSize
  readonly render: (ctx: WidgetContext) => ReactNode
}

export interface WidgetContext {
  result: StoreResult
  daysInMonth: number
  targetRate: number
  warningRate: number
  year: number
  month: number
  budgetChartData: { day: number; actualCum: number; budgetCum: number }[]
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
  /** 部門別KPIデータ */
  departmentKpi: DepartmentKpiData
}
