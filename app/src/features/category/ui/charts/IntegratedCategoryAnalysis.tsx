/**
 * IntegratedCategoryAnalysis — カテゴリ分析ユニットの正本コンテナ
 *
 * カテゴリ別売上推移（親）とカテゴリードリルダウン分析（子）を
 * 同じ分析文脈の下で束ねる包含型ウィジェット。
 *
 * 設計原則:
 * - 親が SalesAnalysisContext を構築し、子に配る
 * - 子は文脈を consume only（比較文脈の再計算禁止）
 * - IntegratedSalesChart と同じ ContainedAnalysisPanel で包含UIを統一
 *
 * 正本ユニット: 単なる新規コンポーネントではなく、カテゴリ分析の正本。
 * CategoryTrendChart / CategoryHierarchyExplorer の独立利用は縮退対象。
 */
import { memo, useMemo, useState } from 'react'
import type { DateRange, PrevYearScope } from '@/domain/models/calendar'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import { buildSalesAnalysisContext } from '@/application/models/SalesAnalysisContext'
import { buildRootNodeContext } from '@/application/models/AnalysisNodeContext'
import { CategoryTrendChart } from '@/features/category/ui/charts/CategoryTrendChart'
import { CategoryHierarchyExplorer } from '@/features/category/ui/charts/CategoryHierarchyExplorer'
import { ChartCard } from '@/presentation/components/charts/ChartCard'
import { TabGroup, Tab } from '@/presentation/components/charts/TimeSlotSalesChart.styles'

interface Props {
  readonly queryExecutor: QueryExecutor | null
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
  readonly prevYearScope?: PrevYearScope
  readonly totalCustomers?: number
}

export const IntegratedCategoryAnalysis = memo(function IntegratedCategoryAnalysis({
  queryExecutor,
  currentDateRange,
  selectedStoreIds,
  prevYearScope,
  totalCustomers,
}: Props) {
  // ── 分析文脈の構築 ──

  const parentContext = useMemo(
    () => buildSalesAnalysisContext(currentDateRange, selectedStoreIds, prevYearScope),
    [currentDateRange, selectedStoreIds, prevYearScope],
  )

  // AnalysisNodeContext（ノード階層モデル）
  const categoryTrendNode = useMemo(
    () => buildRootNodeContext(parentContext, 'category-trend'),
    [parentContext],
  )
  void categoryTrendNode // 将来の context 対応時に使用予定

  const [activeTab, setActiveTab] = useState<'trend' | 'drilldown'>('trend')

  if (!queryExecutor?.isReady) return null

  return (
    <ChartCard title="カテゴリ分析" subtitle="カテゴリ別売上推移 + 階層ドリルダウン">
      <div style={{ marginBottom: 8 }}>
        <TabGroup>
          <Tab $active={activeTab === 'trend'} onClick={() => setActiveTab('trend')}>
            カテゴリ別売上推移
          </Tab>
          <Tab $active={activeTab === 'drilldown'} onClick={() => setActiveTab('drilldown')}>
            ドリルダウン分析
          </Tab>
        </TabGroup>
      </div>

      {activeTab === 'trend' ? (
        <CategoryTrendChart
          queryExecutor={queryExecutor}
          currentDateRange={currentDateRange}
          selectedStoreIds={selectedStoreIds}
          prevYearScope={prevYearScope}
          embedded
        />
      ) : (
        <CategoryHierarchyExplorer
          queryExecutor={queryExecutor}
          currentDateRange={currentDateRange}
          prevYearScope={prevYearScope}
          selectedStoreIds={selectedStoreIds}
          totalCustomers={totalCustomers}
        />
      )}
    </ChartCard>
  )
})
