/**
 * 仕入分析ページ
 *
 * 当期 vs 比較期の仕入データを取引先別・カテゴリ別に比較し、
 * 仕入動向を把握するためのダッシュボード。
 * period1/period2（日付範囲）ベースで同曜日比較にも対応。
 */
import { useMemo } from 'react'
import { MainContent } from '@/presentation/components/Layout'
import { KpiCard, KpiGrid, PageSkeleton } from '@/presentation/components/common'
import { palette } from '@/presentation/theme/tokens'
import { formatPercent, formatPointDiff } from '@/domain/formatting'
import { useCurrencyFormat } from '@/presentation/components/charts/chartTheme'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { useStoreSelection } from '@/application/hooks'
import { usePeriodSelection } from '@/application/hooks/usePeriodResolver'
import { useDuckDB } from '@/application/hooks/useDuckDB'
import { useDataStore } from '@/application/stores/dataStore'
import { useRepository } from '@/application/context/useRepository'
import { usePurchaseComparisonQuery } from '@/application/hooks/duckdb/usePurchaseComparisonQuery'
import { deriveDowOffset } from '@/domain/models/PeriodSelection'
import { ComparisonPresetToggle } from '@/presentation/components/Layout/ComparisonPresetToggle'
import type { PurchaseComparisonKpi } from '@/domain/models/PurchaseComparison'
import {
  Section,
  SectionTitle,
  SectionHeader,
  EmptyState,
  SubNote,
  ProgressSection,
  ProgressCard,
  ProgressLabel,
  ProgressValue,
  ProgressSub,
  ProgressBar,
  ProgressFill,
} from './PurchaseAnalysisPage.styles'
import { useSort, sortRows, periodLabel } from './purchaseAnalysisHelpers'
import { CategoryDetailTable, StoreComparisonTable } from './PurchaseTables'
import { PurchaseDailyPivotTable } from './PurchaseDailyPivot'
import { PurchaseVsSalesChart } from './PurchaseVsSalesChart'

// ── メインコンポーネント ──

export function PurchaseAnalysisPage() {
  const { format: fmtCurrency } = useCurrencyFormat()
  const settings = useSettingsStore((s) => s.settings)
  const data = useDataStore((s) => s.data)
  const repo = useRepository()
  const { selectedStoreIds, stores } = useStoreSelection()
  const { selection } = usePeriodSelection()

  const { targetYear, targetMonth } = settings

  const duck = useDuckDB(data, targetYear, targetMonth, repo)

  const userCategories = useMemo(() => {
    const map = new Map<string, string>()
    const labels = settings.userCategoryLabels ?? {}
    for (const [id, label] of Object.entries(labels)) {
      map.set(id, label)
    }
    return map
  }, [settings.userCategoryLabels])

  const storeNames = useMemo(() => {
    const map = new Map<string, string>()
    for (const [id, s] of stores) {
      map.set(id, s.name)
    }
    return map
  }, [stores])

  const dowOffset = useMemo(
    () => deriveDowOffset(selection.period1, selection.activePreset),
    [selection.period1, selection.activePreset],
  )

  // prevYearSameDow プリセットの場合、period2 は ±7日の候補取得窓であり
  // 実際の比較期間ではない。period1 + dowOffset から正確な比較期間を算出する。
  const effectivePeriod2 = useMemo(() => {
    if (selection.activePreset !== 'prevYearSameDow' || dowOffset === 0) {
      return selection.period2
    }
    const offsetMs = dowOffset * 86400000
    const fromDate = new Date(
      selection.period1.from.year,
      selection.period1.from.month - 1,
      selection.period1.from.day,
    )
    const toDate = new Date(
      selection.period1.to.year,
      selection.period1.to.month - 1,
      selection.period1.to.day,
    )
    // dowOffset は正値（前年の月初曜日を当年に合わせるオフセット）
    // 前年日付 = 当年日付 - 1年 + dowOffset日
    const prevFrom = new Date(fromDate.getTime() - 365 * 86400000 + offsetMs)
    const prevTo = new Date(toDate.getTime() - 365 * 86400000 + offsetMs)
    return {
      from: {
        year: prevFrom.getFullYear(),
        month: prevFrom.getMonth() + 1,
        day: prevFrom.getDate(),
      },
      to: {
        year: prevTo.getFullYear(),
        month: prevTo.getMonth() + 1,
        day: prevTo.getDate(),
      },
    }
  }, [selection.period1, selection.period2, selection.activePreset, dowOffset])

  const { data: result, isLoading } = usePurchaseComparisonQuery(
    duck.conn,
    duck.dataVersion,
    selection.period1,
    effectivePeriod2,
    selectedStoreIds,
    settings.supplierCategoryMap,
    userCategories,
    storeNames,
    dowOffset,
  )

  const categorySort = useSort('currentCost')

  // 初回ロード時のみスケルトン表示。以降はデータ保持したまま再読み込み
  if (!result) {
    return (
      <MainContent title="仕入分析">
        {isLoading ? <PageSkeleton /> : <EmptyState>データを読み込んでください</EmptyState>}
      </MainContent>
    )
  }

  const { kpi, byCategory, byStore, daily, dailyPivot, categorySuppliers, isDetailReady } = result

  const sortedCategories = sortRows(byCategory, categorySort.sortKey, categorySort.sortDir)

  // 期間ラベル
  const curLabel = periodLabel(selection.period1)
  const prevLabel = periodLabel(effectivePeriod2)

  return (
    <MainContent title="仕入分析">
      {/* 比較プリセット切り替え + ローディング */}
      <SectionHeader>
        <ComparisonPresetToggle />
        {isLoading && <SubNote>データ更新中...</SubNote>}
      </SectionHeader>

      {/* 前年対比進捗 */}
      <Section>
        <SectionTitle>前年対比進捗</SectionTitle>
        <YoyProgressCards kpi={kpi} />
      </Section>

      {/* KPI */}
      <Section>
        <SectionHeader>
          <SectionTitle>全体概要</SectionTitle>
          <SubNote>
            当期: {curLabel} / 比較: {prevLabel}
          </SubNote>
        </SectionHeader>
        <KpiGrid>
          <KpiCard
            label="仕入原価合計"
            value={fmtCurrency(kpi.currentTotalCost)}
            subText={`前年比: ${formatPercent(kpi.prevTotalCost > 0 ? kpi.currentTotalCost / kpi.prevTotalCost : 0)} / 前年: ${fmtCurrency(kpi.prevTotalCost)} / 差額: ${kpi.totalCostDiff >= 0 ? '+' : ''}${fmtCurrency(kpi.totalCostDiff)}`}
            accent={kpi.totalCostDiff >= 0 ? palette.negative : palette.positive}
          />
          <KpiCard
            label="仕入売価合計"
            value={fmtCurrency(kpi.currentTotalPrice)}
            subText={`前年比: ${formatPercent(kpi.prevTotalPrice > 0 ? kpi.currentTotalPrice / kpi.prevTotalPrice : 0)} / 前年: ${fmtCurrency(kpi.prevTotalPrice)} / 差額: ${kpi.totalPriceDiff >= 0 ? '+' : ''}${fmtCurrency(kpi.totalPriceDiff)}`}
            accent={kpi.totalPriceDiff >= 0 ? palette.negative : palette.positive}
          />
          <KpiCard
            label="値入率"
            value={formatPercent(kpi.currentMarkupRate)}
            subText={`前年: ${formatPercent(kpi.prevMarkupRate)} / ${formatPointDiff(kpi.markupRateDiff)}`}
            accent={kpi.markupRateDiff >= 0 ? palette.positive : palette.negative}
          />
          <KpiCard
            label="仕入対売上比率"
            value={formatPercent(kpi.currentCostToSalesRatio)}
            subText={`前年: ${formatPercent(kpi.prevCostToSalesRatio)} / 売上: ${fmtCurrency(kpi.currentSales)}`}
            accent={
              kpi.currentCostToSalesRatio <= kpi.prevCostToSalesRatio
                ? palette.positive
                : palette.negative
            }
          />
        </KpiGrid>
      </Section>

      {/* 詳細セクション: KPI先行表示後に詳細をロード */}
      {!isDetailReady ? (
        <Section>
          <PageSkeleton />
        </Section>
      ) : (
        <>
          {/* カテゴリ別日別明細 */}
          <Section>
            <SectionTitle>カテゴリ別日別明細（原価/売価）</SectionTitle>
            <PurchaseDailyPivotTable pivot={dailyPivot} />
          </Section>

          {/* カテゴリ明細（ドリルダウン付き） */}
          <Section>
            <SectionHeader>
              <SectionTitle>カテゴリ明細</SectionTitle>
              <SubNote>
                標準カテゴリ + カスタムカテゴリの統合集計 / 相乗積合計 = 全体値入率 / クリックで展開
              </SubNote>
            </SectionHeader>
            <CategoryDetailTable
              rows={sortedCategories}
              kpi={kpi}
              sort={categorySort}
              categorySuppliers={categorySuppliers}
            />
          </Section>

          {/* 売上 vs 仕入 チャート */}
          <Section>
            <SectionTitle>売上 vs 仕入原価（日別推移）</SectionTitle>
            <PurchaseVsSalesChart daily={daily} />
          </Section>

          {/* 店舗別比較（ドリルダウン付き） */}
          {byStore.length > 1 && (
            <Section>
              <SectionHeader>
                <SectionTitle>店舗別比較（{byStore.length}店舗）</SectionTitle>
                <SubNote>クリックで取引先別の内訳を表示</SubNote>
              </SectionHeader>
              <StoreComparisonTable rows={byStore} />
            </Section>
          )}
        </>
      )}
    </MainContent>
  )
}

// ── 前年対比進捗カード ──

function YoyProgressCards({ kpi }: { kpi: PurchaseComparisonKpi }) {
  const { format: fmtCurrency } = useCurrencyFormat()
  const salesRatio = kpi.prevSales > 0 ? kpi.currentSales / kpi.prevSales : 0
  const costRatio = kpi.prevTotalCost > 0 ? kpi.currentTotalCost / kpi.prevTotalCost : 0
  const priceRatio = kpi.prevTotalPrice > 0 ? kpi.currentTotalPrice / kpi.prevTotalPrice : 0

  const salesColor = salesRatio >= 1 ? palette.positive : palette.warning
  const costColor = costRatio <= 1 ? palette.positive : palette.negative
  const priceColor = priceRatio <= 1 ? palette.positive : palette.negative

  return (
    <ProgressSection>
      <ProgressCard>
        <ProgressLabel>売上 前年比</ProgressLabel>
        <ProgressValue $accent={salesColor}>{formatPercent(salesRatio)}</ProgressValue>
        <ProgressSub>
          当期: {fmtCurrency(kpi.currentSales)} / 前年: {fmtCurrency(kpi.prevSales)}
        </ProgressSub>
        <ProgressBar>
          <ProgressFill $width={salesRatio * 100} $color={salesColor} />
        </ProgressBar>
      </ProgressCard>
      <ProgressCard>
        <ProgressLabel>仕入原価 前年比</ProgressLabel>
        <ProgressValue $accent={costColor}>{formatPercent(costRatio)}</ProgressValue>
        <ProgressSub>
          当期: {fmtCurrency(kpi.currentTotalCost)} / 前年: {fmtCurrency(kpi.prevTotalCost)}
        </ProgressSub>
        <ProgressBar>
          <ProgressFill $width={costRatio * 100} $color={costColor} />
        </ProgressBar>
      </ProgressCard>
      <ProgressCard>
        <ProgressLabel>仕入売価 前年比</ProgressLabel>
        <ProgressValue $accent={priceColor}>{formatPercent(priceRatio)}</ProgressValue>
        <ProgressSub>
          当期: {fmtCurrency(kpi.currentTotalPrice)} / 前年: {fmtCurrency(kpi.prevTotalPrice)}
        </ProgressSub>
        <ProgressBar>
          <ProgressFill $width={priceRatio * 100} $color={priceColor} />
        </ProgressBar>
      </ProgressCard>
    </ProgressSection>
  )
}
