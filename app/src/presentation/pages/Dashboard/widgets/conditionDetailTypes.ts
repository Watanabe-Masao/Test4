/**
 * @responsibility R:unclassified
 */

import type { Store } from '@/domain/models/record'
import type { StoreResult } from '@/domain/models/storeTypes'
import type { ConditionSummaryConfig } from '@/domain/models/ConditionConfig'
import type { AppSettings } from '@/domain/models/storeTypes'
import type { DisplayMode } from './conditionSummaryUtils'
import type { PrevYearData, PrevYearMonthlyKpi } from '@/application/comparison/comparisonTypes'
import type { ConditionItem } from './conditionSummaryUtils'

// ─── Shared Props ───────────────────────────────────────

export interface DetailPanelProps {
  readonly sortedStoreEntries: readonly [string, StoreResult][]
  readonly stores: ReadonlyMap<string, Store>
  readonly result: StoreResult
  readonly effectiveConfig: ConditionSummaryConfig
  readonly displayMode: DisplayMode
  readonly onDisplayModeChange: (mode: DisplayMode) => void
  readonly settings: AppSettings
  readonly elapsedDays?: number
  readonly daysInMonth?: number
  readonly dataMaxDay?: number
}

export interface MarkupDetailProps extends DetailPanelProps {
  readonly expandedMarkupStore: string | null
  readonly onExpandToggle: (storeId: string) => void
}

export interface CostInclusionDetailProps extends DetailPanelProps {
  readonly expandedMarkupStore: string | null
  readonly onExpandToggle: (storeId: string) => void
}

export interface SalesYoYDetailProps extends DetailPanelProps {
  readonly prevYear: PrevYearData
  readonly prevYearMonthlyKpi: PrevYearMonthlyKpi
}

export interface CustomerYoYDetailProps extends DetailPanelProps {
  readonly prevYear: PrevYearData
  readonly prevYearMonthlyKpi: PrevYearMonthlyKpi
  readonly curTotalCustomers: number
  readonly prevTotalCustomers: number
  readonly storeCustomerMap?: ReadonlyMap<string, number>
}

export interface TxValueDetailProps extends DetailPanelProps {
  readonly expandedStore: string | null
  readonly onExpandToggle: (storeId: string) => void
  readonly storeCustomerMap?: ReadonlyMap<string, number>
  readonly grandTotalCustomers?: number
}

export interface DailySalesDetailProps extends DetailPanelProps {
  readonly daysInMonth: number
  readonly expandedStore: string | null
  readonly onExpandToggle: (storeId: string) => void
}

export interface SimpleBreakdownProps {
  readonly breakdownItem: ConditionItem
  readonly sortedStoreEntries: readonly [string, StoreResult][]
  readonly stores: ReadonlyMap<string, Store>
}
