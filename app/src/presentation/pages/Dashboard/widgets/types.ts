import type { ReactNode } from 'react'
import type { StoreResult } from '@/domain/models'
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
}
