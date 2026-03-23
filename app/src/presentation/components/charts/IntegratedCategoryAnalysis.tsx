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
import { memo, useMemo } from 'react'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange, PrevYearScope } from '@/domain/models/calendar'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import { buildSalesAnalysisContext } from '@/application/models/SalesAnalysisContext'
import { buildRootNodeContext } from '@/application/models/AnalysisNodeContext'
import { CategoryTrendChart } from './CategoryTrendChart'
import { CategoryHierarchyExplorer } from './CategoryHierarchyExplorer'
import { ContainedAnalysisPanel, type ContextTag } from './ContainedAnalysisPanel'
import { ChartCard } from './ChartCard'

interface Props {
  readonly queryExecutor: QueryExecutor | null
  readonly duckConn: AsyncDuckDBConnection | null
  readonly duckDataVersion: number
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
  readonly prevYearScope?: PrevYearScope
  readonly totalCustomers?: number
}

export const IntegratedCategoryAnalysis = memo(function IntegratedCategoryAnalysis({
  queryExecutor,
  duckConn,
  duckDataVersion,
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

  // 継承条件タグ
  const contextTags = useMemo<readonly ContextTag[]>(() => {
    const tags: ContextTag[] = []
    if (prevYearScope) {
      tags.push({ label: '比較', value: '前年同期間' })
    }
    if (selectedStoreIds.size > 0) {
      tags.push({ label: '対象店舗', value: `${selectedStoreIds.size}店` })
    }
    return tags
  }, [prevYearScope, selectedStoreIds])

  if (!duckConn || duckDataVersion === 0) return null

  return (
    <ChartCard title="カテゴリ分析" subtitle="カテゴリ別売上推移 + 階層ドリルダウン">
      {/* ── 親: カテゴリ別売上推移 ── */}
      <CategoryTrendChart
        queryExecutor={queryExecutor}
        currentDateRange={currentDateRange}
        selectedStoreIds={selectedStoreIds}
        embedded
      />

      {/* ── 子: カテゴリードリルダウン分析（包含表示） ── */}
      <ContainedAnalysisPanel
        title="カテゴリードリルダウン分析"
        subtitle="部門→ライン→クラスの階層ドリルダウン"
        inheritedContext={contextTags}
        drillLabel="カテゴリからドリルダウン"
        role="child"
      >
        <CategoryHierarchyExplorer
          duckConn={duckConn}
          duckDataVersion={duckDataVersion}
          currentDateRange={currentDateRange}
          prevYearScope={prevYearScope}
          selectedStoreIds={selectedStoreIds}
          totalCustomers={totalCustomers}
        />
      </ContainedAnalysisPanel>
    </ChartCard>
  )
})
