import type { StoreResult, Store } from '@/domain/models'
import type { ConditionSummaryConfig } from '@/domain/models/ConditionConfig'
import type { AppSettings } from '@/domain/models'
import type { DisplayMode } from './conditionSummaryUtils'
import type { PrevYearData } from '@/application/hooks/usePrevYearData'
import type { PrevYearMonthlyKpi } from '@/application/hooks/usePrevYearMonthlyKpi'
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
  readonly expandedStore: string | null
  readonly onExpandToggle: (storeId: string) => void
}

export interface CustomerYoYDetailProps extends DetailPanelProps {
  readonly prevYear: PrevYearData
  readonly prevYearMonthlyKpi: PrevYearMonthlyKpi
  readonly expandedStore: string | null
  readonly onExpandToggle: (storeId: string) => void
}

export interface TxValueDetailProps extends DetailPanelProps {
  readonly expandedStore: string | null
  readonly onExpandToggle: (storeId: string) => void
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
