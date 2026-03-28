/**
 * IntegratedSalesSubTabs — カテゴリ分析サブタブのコンテンツレンダリング
 *
 * IntegratedSalesChart から分離。600行制限対応。
 * AnimatePresence による切替フェードを含む。
 */
import { memo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { DateRange, PrevYearScope } from '@/domain/models/calendar'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import type { DailyRecord, DailyWeatherSummary, DiscountEntry } from '@/domain/models/record'
import { SubAnalysisPanel } from './SubAnalysisPanel'
import { CategoryBarChart } from './CategoryBarChart'
import { CategoryHierarchyExplorer } from './CategoryHierarchyExplorer'

export type SubTabKey = 'trend' | 'bar' | 'drilldown'

interface Props {
  subTab: SubTabKey
  queryExecutor: QueryExecutor | null
  dateRange: DateRange
  selectedStoreIds: ReadonlySet<string>
  comparisonScope?: PrevYearScope
  weatherDaily?: readonly DailyWeatherSummary[]
  daily?: ReadonlyMap<number, DailyRecord>
  daysInMonth?: number
  year?: number
  month?: number
  prevYearDaily?: ReadonlyMap<
    string,
    { sales: number; discount: number; discountEntries?: Record<string, number> }
  >
  discountEntries?: readonly DiscountEntry[]
  totalGrossSales?: number
}

const fadeVariants = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
}

export const SubTabContent = memo(function SubTabContent(props: Props) {
  return (
    <AnimatePresence mode="wait">
      {props.subTab === 'trend' && (
        <motion.div key="sub-trend" {...fadeVariants} transition={{ duration: 0.15 }}>
          <SubAnalysisPanel
            mode="quantity"
            queryExecutor={props.queryExecutor}
            currentDateRange={props.dateRange}
            selectedStoreIds={props.selectedStoreIds}
            prevYearScope={props.comparisonScope}
            weatherDaily={props.weatherDaily}
            daily={props.daily}
            daysInMonth={props.daysInMonth}
            year={props.year}
            month={props.month}
            prevYearDaily={props.prevYearDaily}
            discountEntries={props.discountEntries}
            totalGrossSales={props.totalGrossSales}
          />
        </motion.div>
      )}
      {props.subTab === 'bar' && (
        <motion.div key="sub-bar" {...fadeVariants} transition={{ duration: 0.15 }}>
          <CategoryBarChart
            queryExecutor={props.queryExecutor}
            currentDateRange={props.dateRange}
            selectedStoreIds={props.selectedStoreIds}
            prevYearScope={props.comparisonScope}
            embedded
          />
        </motion.div>
      )}
      {props.subTab === 'drilldown' && (
        <motion.div key="sub-drilldown" {...fadeVariants} transition={{ duration: 0.15 }}>
          <CategoryHierarchyExplorer
            queryExecutor={props.queryExecutor}
            currentDateRange={props.dateRange}
            prevYearScope={props.comparisonScope}
            selectedStoreIds={props.selectedStoreIds}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
})
