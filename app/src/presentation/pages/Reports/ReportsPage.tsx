import { useState, useCallback } from 'react'
import { MainContent } from '@/presentation/components/Layout'
import {
  Card,
  CardTitle,
  KpiCard,
  KpiGrid,
  MetricBreakdownPanel,
  PageSkeleton,
} from '@/presentation/components/common'
import { useCalculation, useStoreSelection, useExplanations } from '@/application/hooks'
import { useDataStore } from '@/application/stores/dataStore'
import type { MetricId } from '@/domain/models'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { formatCurrency, formatPercent, safeDivide } from '@/domain/calculations/utils'
import { CATEGORY_LABELS, CATEGORY_ORDER } from '@/domain/constants/categories'
import { useDeptKpiView } from '@/application/hooks/useDeptKpiView'
import { useExport } from '@/application/hooks/useExport'
import { sc } from '@/presentation/theme/semanticColors'
import { palette } from '@/presentation/theme/tokens'
import {
  Section,
  SectionTitle,
  ReportHeader,
  ReportDate,
  SummaryGrid,
  TableWrapper,
  Table,
  Th,
  Td,
  Tr,
  TotalRow,
  CalcRow,
  CalcLabel,
  CalcValue,
  CalcHighlight,
  DisclaimerNote,
  EmptyState,
  ExportBar,
  ExportButton,
  DeptTd,
  DeptTableWrapper,
} from './ReportsPage.styles'

export function ReportsPage() {
  const { isComputing, daysInMonth } = useCalculation()
  const { currentResult, selectedResults, storeName, stores, isAllStores, selectedStoreIds } =
    useStoreSelection()
  const settings = useSettingsStore((s) => s.settings)
  const { exportDailySalesReport, exportMonthlyPLReport, exportStoreKpiReport } = useExport()

  // 部門KPIインデックス（Application層フック経由）
  const deptKpiIndex = useDeptKpiView()

  // 指標説明
  const explanations = useExplanations()
  const dataStores = useDataStore((s) => s.data.stores)
  const [explainMetric, setExplainMetric] = useState<MetricId | null>(null)
  const handleExplain = useCallback((metricId: MetricId) => {
    setExplainMetric(metricId)
  }, [])

  // CSV エクスポートハンドラ
  const handleExportDaily = useCallback(() => {
    if (!currentResult) return
    const storeId =
      !isAllStores && selectedStoreIds.size === 1 ? Array.from(selectedStoreIds)[0] : null
    const store = storeId ? (stores.get(storeId) ?? null) : null
    exportDailySalesReport(currentResult, store, settings.targetYear, settings.targetMonth)
  }, [
    currentResult,
    isAllStores,
    selectedStoreIds,
    stores,
    settings.targetYear,
    settings.targetMonth,
    exportDailySalesReport,
  ])

  const handleExportPL = useCallback(() => {
    if (!currentResult) return
    const storeId =
      !isAllStores && selectedStoreIds.size === 1 ? Array.from(selectedStoreIds)[0] : null
    const store = storeId ? (stores.get(storeId) ?? null) : null
    exportMonthlyPLReport(currentResult, store, settings.targetYear, settings.targetMonth)
  }, [
    currentResult,
    isAllStores,
    selectedStoreIds,
    stores,
    settings.targetYear,
    settings.targetMonth,
    exportMonthlyPLReport,
  ])

  const handleExportStoreKpi = useCallback(() => {
    const storeResults = new Map<string, (typeof selectedResults)[number]>()
    for (const r of selectedResults) {
      storeResults.set(r.storeId, r)
    }
    exportStoreKpiReport(storeResults, stores, settings.targetYear, settings.targetMonth)
  }, [selectedResults, stores, settings.targetYear, settings.targetMonth, exportStoreKpiReport])

  if (isComputing && !currentResult) {
    return (
      <MainContent title="月次レポート" storeName={storeName}>
        <PageSkeleton />
      </MainContent>
    )
  }

  if (!currentResult) {
    return (
      <MainContent title="月次レポート" storeName={storeName}>
        <EmptyState>計算を実行してください</EmptyState>
      </MainContent>
    )
  }

  const r = currentResult
  const today = new Date()
  const reportDate = `${settings.targetYear}年${settings.targetMonth}月${today.getDate()}日`

  // Category data
  const categoryData = CATEGORY_ORDER.flatMap((cat) => {
    const pair = r.categoryTotals.get(cat)
    if (!pair) return []
    return [
      {
        category: cat,
        label: CATEGORY_LABELS[cat],
        cost: pair.cost,
        price: pair.price,
        markup: safeDivide(pair.price - pair.cost, pair.price, 0),
      },
    ]
  })

  const totalCategoryCost = categoryData.reduce((s, c) => s + Math.abs(c.cost), 0)

  return (
    <MainContent title="月次レポート" storeName={storeName}>
      <ReportHeader>
        <div />
        <ReportDate>{reportDate} 現在</ReportDate>
      </ReportHeader>

      {/* 1. 概況サマリー ─「全体はどうなってる？」 */}
      <Section>
        <SectionTitle>概況サマリー</SectionTitle>
        <KpiGrid>
          <KpiCard
            label="総売上高"
            value={formatCurrency(r.totalSales)}
            accent={palette.primary}
            onClick={() => handleExplain('salesTotal')}
          />
          <KpiCard
            label="【在庫法】粗利益"
            value={r.invMethodGrossProfit != null ? formatCurrency(r.invMethodGrossProfit) : '-'}
            subText={
              r.invMethodGrossProfitRate != null
                ? `粗利率: ${formatPercent(r.invMethodGrossProfitRate)}`
                : '在庫設定なし'
            }
            accent={sc.positive}
            onClick={
              r.invMethodGrossProfit != null
                ? () => handleExplain('invMethodGrossProfit')
                : undefined
            }
          />
          <KpiCard
            label="予算達成率"
            value={formatPercent(r.budgetAchievementRate)}
            subText={`予算: ${formatCurrency(r.budget)}`}
            accent={palette.infoDark}
            onClick={() => handleExplain('budgetAchievementRate')}
          />
          <KpiCard
            label="月末予測達成率"
            value={formatPercent(r.projectedAchievement)}
            subText={`予測売上: ${formatCurrency(r.projectedSales)}`}
            accent={sc.achievement(r.projectedAchievement)}
            onClick={() => handleExplain('projectedSales')}
          />
        </KpiGrid>
      </Section>

      {/* 2. 目標対実績 ─「計画通りに進んでる？」 */}
      <Section>
        <SectionTitle>目標対実績</SectionTitle>
        <TableWrapper>
          <Table>
            <thead>
              <tr>
                <Th>指標</Th>
                <Th>目標</Th>
                <Th>実績</Th>
                <Th>差異</Th>
                <Th>評価</Th>
              </tr>
            </thead>
            <tbody>
              <Tr
                onClick={() => handleExplain('invMethodGrossProfitRate')}
                style={{ cursor: 'pointer' }}
              >
                <Td>粗利率</Td>
                <Td>{formatPercent(settings.targetGrossProfitRate)}</Td>
                <Td>
                  {r.invMethodGrossProfitRate != null
                    ? formatPercent(r.invMethodGrossProfitRate)
                    : '-'}
                </Td>
                <Td
                  $accent={
                    r.invMethodGrossProfitRate != null &&
                    r.invMethodGrossProfitRate >= settings.targetGrossProfitRate
                  }
                >
                  {r.invMethodGrossProfitRate != null
                    ? `${r.invMethodGrossProfitRate >= settings.targetGrossProfitRate ? '+' : ''}${formatPercent(r.invMethodGrossProfitRate - settings.targetGrossProfitRate)}`
                    : '-'}
                </Td>
                <Td>
                  {r.invMethodGrossProfitRate != null
                    ? r.invMethodGrossProfitRate >= settings.targetGrossProfitRate
                      ? '達成'
                      : r.invMethodGrossProfitRate >= settings.warningThreshold
                        ? '注意'
                        : '未達'
                    : '-'}
                </Td>
              </Tr>
              <Tr
                onClick={() => handleExplain('budgetAchievementRate')}
                style={{ cursor: 'pointer' }}
              >
                <Td>予算達成</Td>
                <Td>{formatCurrency(r.budget)}</Td>
                <Td>{formatCurrency(r.totalSales)}</Td>
                <Td $accent={r.totalSales >= r.budget}>
                  {r.totalSales >= r.budget ? '+' : ''}
                  {formatCurrency(r.totalSales - r.budget)}
                </Td>
                <Td>
                  {r.budgetAchievementRate >= 1
                    ? '達成'
                    : r.budgetAchievementRate >= 0.9
                      ? '進行中'
                      : '要注意'}
                </Td>
              </Tr>
              <Tr onClick={() => handleExplain('averageMarkupRate')} style={{ cursor: 'pointer' }}>
                <Td>値入率</Td>
                <Td>{formatPercent(settings.defaultMarkupRate)}</Td>
                <Td>{formatPercent(r.averageMarkupRate)}</Td>
                <Td $accent={r.averageMarkupRate >= settings.defaultMarkupRate}>
                  {r.averageMarkupRate >= settings.defaultMarkupRate ? '+' : ''}
                  {formatPercent(r.averageMarkupRate - settings.defaultMarkupRate)}
                </Td>
                <Td>{r.averageMarkupRate >= settings.defaultMarkupRate ? '達成' : '未達'}</Td>
              </Tr>
            </tbody>
          </Table>
        </TableWrapper>
        <KpiGrid>
          <KpiCard
            label="月間予算"
            value={formatCurrency(r.budget)}
            accent={palette.primary}
            onClick={() => handleExplain('budget')}
          />
          <KpiCard
            label="予算達成率"
            value={formatPercent(r.budgetAchievementRate)}
            accent={sc.positive}
            onClick={() => handleExplain('budgetAchievementRate')}
          />
          <KpiCard
            label="予算消化率"
            value={formatPercent(r.budgetProgressRate)}
            subText={`経過: ${r.elapsedDays}/${daysInMonth}日`}
            accent={palette.infoDark}
            onClick={() => handleExplain('budgetProgressRate')}
          />
          <KpiCard
            label="残余予算"
            value={formatCurrency(r.remainingBudget)}
            accent={sc.cond(r.remainingBudget <= 0)}
            onClick={() => handleExplain('remainingBudget')}
          />
        </KpiGrid>
      </Section>

      {/* 3. 損益構造 ─「利益の構造は？」 */}
      <SummaryGrid>
        <Card $accent={sc.positive}>
          <CardTitle>【在庫法】実績粗利</CardTitle>
          <CalcRow $clickable onClick={() => handleExplain('salesTotal')}>
            <CalcLabel>総売上高</CalcLabel>
            <CalcValue>{formatCurrency(r.totalSales)}</CalcValue>
          </CalcRow>
          <CalcRow $clickable onClick={() => handleExplain('purchaseCost')}>
            <CalcLabel>総仕入原価</CalcLabel>
            <CalcValue>{formatCurrency(r.totalCost)}</CalcValue>
          </CalcRow>
          <CalcRow>
            <CalcLabel>期首在庫</CalcLabel>
            <CalcValue>
              {r.openingInventory != null ? formatCurrency(r.openingInventory) : '未設定'}
            </CalcValue>
          </CalcRow>
          <CalcRow>
            <CalcLabel>期末在庫</CalcLabel>
            <CalcValue>
              {r.closingInventory != null ? formatCurrency(r.closingInventory) : '未設定'}
            </CalcValue>
          </CalcRow>
          <CalcRow
            $clickable={r.invMethodCogs != null}
            onClick={r.invMethodCogs != null ? () => handleExplain('invMethodCogs') : undefined}
          >
            <CalcLabel>売上原価 (COGS)</CalcLabel>
            <CalcHighlight>
              {r.invMethodCogs != null ? formatCurrency(r.invMethodCogs) : '-'}
            </CalcHighlight>
          </CalcRow>
          <CalcRow
            $clickable={r.invMethodGrossProfit != null}
            onClick={
              r.invMethodGrossProfit != null
                ? () => handleExplain('invMethodGrossProfit')
                : undefined
            }
          >
            <CalcLabel>粗利益</CalcLabel>
            <CalcHighlight $color={sc.positive}>
              {r.invMethodGrossProfit != null ? formatCurrency(r.invMethodGrossProfit) : '-'}
            </CalcHighlight>
          </CalcRow>
          <CalcRow
            $clickable={r.invMethodGrossProfitRate != null}
            onClick={
              r.invMethodGrossProfitRate != null
                ? () => handleExplain('invMethodGrossProfitRate')
                : undefined
            }
          >
            <CalcLabel>粗利率</CalcLabel>
            <CalcHighlight $color={sc.positive}>
              {r.invMethodGrossProfitRate != null ? formatPercent(r.invMethodGrossProfitRate) : '-'}
            </CalcHighlight>
          </CalcRow>
        </Card>

        <Card $accent={palette.infoDark}>
          <CardTitle>【推定法】在庫差異検知指標（※損益ではありません）</CardTitle>
          <DisclaimerNote>
            ※ この指標は在庫異常の検知用です。損益計算には在庫法をご利用ください。
          </DisclaimerNote>
          <CalcRow $clickable onClick={() => handleExplain('coreSales')}>
            <CalcLabel>コア売上</CalcLabel>
            <CalcValue>{formatCurrency(r.totalCoreSales)}</CalcValue>
          </CalcRow>
          <CalcRow $clickable onClick={() => handleExplain('coreMarkupRate')}>
            <CalcLabel>コア値入率</CalcLabel>
            <CalcValue>{formatPercent(r.coreMarkupRate)}</CalcValue>
          </CalcRow>
          <CalcRow $clickable onClick={() => handleExplain('discountRate')}>
            <CalcLabel>売変率</CalcLabel>
            <CalcValue>{formatPercent(r.discountRate)}</CalcValue>
          </CalcRow>
          <CalcRow $clickable onClick={() => handleExplain('estMethodCogs')}>
            <CalcLabel>推定原価</CalcLabel>
            <CalcHighlight>{formatCurrency(r.estMethodCogs)}</CalcHighlight>
          </CalcRow>
          <CalcRow $clickable onClick={() => handleExplain('estMethodMargin')}>
            <CalcLabel>推定在庫差分</CalcLabel>
            <CalcHighlight $color={palette.infoDark}>
              {formatCurrency(r.estMethodMargin)}
            </CalcHighlight>
          </CalcRow>
          <CalcRow $clickable onClick={() => handleExplain('estMethodMarginRate')}>
            <CalcLabel>推定在庫差分率</CalcLabel>
            <CalcHighlight $color={palette.infoDark}>
              {formatPercent(r.estMethodMarginRate)}
            </CalcHighlight>
          </CalcRow>
          <CalcRow
            $clickable={r.estMethodClosingInventory != null}
            onClick={
              r.estMethodClosingInventory != null
                ? () => handleExplain('estMethodClosingInventory')
                : undefined
            }
          >
            <CalcLabel>推定期末在庫</CalcLabel>
            <CalcHighlight $color={palette.cyanDark}>
              {r.estMethodClosingInventory != null
                ? formatCurrency(r.estMethodClosingInventory)
                : '-'}
            </CalcHighlight>
          </CalcRow>
        </Card>
      </SummaryGrid>

      {/* 4. 仕入・売変・移動 ─「コストの内訳は？」 */}
      <Section>
        <SectionTitle>仕入・売変詳細</SectionTitle>
        <KpiGrid>
          <KpiCard
            label="在庫仕入原価"
            value={formatCurrency(r.inventoryCost)}
            accent={palette.warningDark}
            onClick={() => handleExplain('inventoryCost')}
          />
          <KpiCard
            label="売上納品原価"
            value={formatCurrency(r.deliverySalesCost)}
            subText={`売価: ${formatCurrency(r.deliverySalesPrice)}`}
            accent={palette.pinkDark}
            onClick={() => handleExplain('deliverySalesCost')}
          />
          <KpiCard
            label="消耗品費"
            value={formatCurrency(r.totalConsumable)}
            subText={`消耗品率: ${formatPercent(r.consumableRate)}`}
            accent={palette.orange}
            onClick={() => handleExplain('totalConsumable')}
          />
          <KpiCard
            label="売変ロス原価"
            value={formatCurrency(r.discountLossCost)}
            subText={`売変額: ${formatCurrency(r.totalDiscount)}`}
            accent={sc.negative}
            onClick={() => handleExplain('discountLossCost')}
          />
        </KpiGrid>
      </Section>

      <Section>
        <SectionTitle>移動集計</SectionTitle>
        <KpiGrid>
          <KpiCard
            label="店間入"
            value={formatCurrency(r.transferDetails.interStoreIn.cost)}
            accent={sc.positive}
          />
          <KpiCard
            label="店間出"
            value={formatCurrency(r.transferDetails.interStoreOut.cost)}
            accent={sc.negative}
          />
          <KpiCard
            label="部門間入"
            value={formatCurrency(r.transferDetails.interDepartmentIn.cost)}
            accent={palette.blueDark}
          />
          <KpiCard
            label="部門間出"
            value={formatCurrency(r.transferDetails.interDepartmentOut.cost)}
            accent={palette.purpleDeep}
          />
        </KpiGrid>
      </Section>

      {/* 5. カテゴリ構造 ─「内訳は？」 */}
      {categoryData.length > 0 && (
        <Section>
          <SectionTitle>カテゴリ別集計</SectionTitle>
          <TableWrapper>
            <Table>
              <thead>
                <tr>
                  <Th>カテゴリ</Th>
                  <Th>原価</Th>
                  <Th>売価</Th>
                  <Th>値入率</Th>
                  <Th>構成比</Th>
                </tr>
              </thead>
              <tbody>
                {categoryData.map((d) => {
                  const share = safeDivide(Math.abs(d.cost), totalCategoryCost, 0)
                  return (
                    <Tr key={d.category}>
                      <Td>{d.label}</Td>
                      <Td>{formatCurrency(d.cost)}</Td>
                      <Td>{formatCurrency(d.price)}</Td>
                      <Td>{formatPercent(d.markup)}</Td>
                      <Td>{formatPercent(share)}</Td>
                    </Tr>
                  )
                })}
                <TotalRow>
                  <Td>合計</Td>
                  <Td $accent>{formatCurrency(categoryData.reduce((s, d) => s + d.cost, 0))}</Td>
                  <Td $accent>{formatCurrency(categoryData.reduce((s, d) => s + d.price, 0))}</Td>
                  <Td $accent>
                    {formatPercent(
                      safeDivide(
                        categoryData.reduce((s, d) => s + d.price, 0) -
                          categoryData.reduce((s, d) => s + d.cost, 0),
                        categoryData.reduce((s, d) => s + d.price, 0),
                        0,
                      ),
                    )}
                  </Td>
                  <Td $accent>100.0%</Td>
                </TotalRow>
              </tbody>
            </Table>
          </TableWrapper>
        </Section>
      )}

      {/* 6. 部門別KPI ─「各部門は？」 */}
      {deptKpiIndex.records.length > 0 && (
        <Section>
          <SectionTitle>部門別KPI</SectionTitle>
          <KpiGrid>
            <KpiCard
              label="部門数"
              value={`${deptKpiIndex.summary.deptCount}部門`}
              accent={palette.primary}
            />
            <KpiCard
              label="売上達成率（全体）"
              value={formatPercent(deptKpiIndex.summary.overallSalesAchievement)}
              subText={`予算: ${formatCurrency(deptKpiIndex.summary.totalSalesBudget)} / 実績: ${formatCurrency(deptKpiIndex.summary.totalSalesActual)}`}
              accent={sc.achievement(deptKpiIndex.summary.overallSalesAchievement)}
              onClick={() => handleExplain('budgetAchievementRate')}
            />
            <KpiCard
              label="加重平均粗利率"
              value={formatPercent(deptKpiIndex.summary.weightedGpRateActual)}
              subText={`予算: ${formatPercent(deptKpiIndex.summary.weightedGpRateBudget)}`}
              accent={sc.positive}
              onClick={() => handleExplain('invMethodGrossProfitRate')}
            />
            <KpiCard
              label="加重平均値入率"
              value={formatPercent(deptKpiIndex.summary.weightedMarkupRate)}
              subText={`売変率: ${formatPercent(deptKpiIndex.summary.weightedDiscountRate)}`}
              accent={palette.infoDark}
              onClick={() => handleExplain('averageMarkupRate')}
            />
          </KpiGrid>
          <DeptTableWrapper>
            <Table>
              <thead>
                <tr>
                  <Th>部門</Th>
                  <Th>粗利率(予算)</Th>
                  <Th>粗利率(実績)</Th>
                  <Th>差異(pt)</Th>
                  <Th>値入率</Th>
                  <Th>売変率</Th>
                  <Th>売上予算</Th>
                  <Th>売上実績</Th>
                  <Th>達成率</Th>
                </tr>
              </thead>
              <tbody>
                {deptKpiIndex.records.map((dept) => (
                  <Tr key={dept.deptCode}>
                    <DeptTd>{dept.deptName || dept.deptCode}</DeptTd>
                    <DeptTd>{formatPercent(dept.gpRateBudget)}</DeptTd>
                    <DeptTd
                      $good={dept.gpRateActual >= dept.gpRateBudget}
                      $warn={dept.gpRateActual < dept.gpRateBudget}
                    >
                      {formatPercent(dept.gpRateActual)}
                    </DeptTd>
                    <DeptTd $good={dept.gpRateVariance >= 0} $warn={dept.gpRateVariance < 0}>
                      {dept.gpRateVariance >= 0 ? '+' : ''}
                      {(dept.gpRateVariance * 100).toFixed(1)}
                    </DeptTd>
                    <DeptTd>{formatPercent(dept.markupRate)}</DeptTd>
                    <DeptTd>{formatPercent(dept.discountRate)}</DeptTd>
                    <DeptTd>{formatCurrency(dept.salesBudget)}</DeptTd>
                    <DeptTd>{formatCurrency(dept.salesActual)}</DeptTd>
                    <DeptTd $good={dept.salesAchievement >= 1} $warn={dept.salesAchievement < 0.9}>
                      {formatPercent(dept.salesAchievement)}
                    </DeptTd>
                  </Tr>
                ))}
                <TotalRow>
                  <Td>全部門（加重平均）</Td>
                  <Td>{formatPercent(deptKpiIndex.summary.weightedGpRateBudget)}</Td>
                  <Td $accent>{formatPercent(deptKpiIndex.summary.weightedGpRateActual)}</Td>
                  <Td $accent>
                    {deptKpiIndex.summary.weightedGpRateActual -
                      deptKpiIndex.summary.weightedGpRateBudget >=
                    0
                      ? '+'
                      : ''}
                    {(
                      (deptKpiIndex.summary.weightedGpRateActual -
                        deptKpiIndex.summary.weightedGpRateBudget) *
                      100
                    ).toFixed(1)}
                  </Td>
                  <Td $accent>{formatPercent(deptKpiIndex.summary.weightedMarkupRate)}</Td>
                  <Td $accent>{formatPercent(deptKpiIndex.summary.weightedDiscountRate)}</Td>
                  <Td $accent>{formatCurrency(deptKpiIndex.summary.totalSalesBudget)}</Td>
                  <Td $accent>{formatCurrency(deptKpiIndex.summary.totalSalesActual)}</Td>
                  <Td $accent>{formatPercent(deptKpiIndex.summary.overallSalesAchievement)}</Td>
                </TotalRow>
              </tbody>
            </Table>
          </DeptTableWrapper>
        </Section>
      )}

      {/* 7. CSVエクスポート */}
      <ExportBar>
        <ExportButton onClick={handleExportDaily}>&#128196; 日別売上CSV</ExportButton>
        <ExportButton onClick={handleExportPL}>&#128200; 月次P&amp;L CSV</ExportButton>
        {selectedResults.length > 1 && (
          <ExportButton onClick={handleExportStoreKpi}>&#127970; 店舗別KPI CSV</ExportButton>
        )}
      </ExportBar>

      {/* 指標説明パネル */}
      {explainMetric && explanations.has(explainMetric) && (
        <MetricBreakdownPanel
          explanation={explanations.get(explainMetric)!}
          allExplanations={explanations}
          stores={dataStores}
          onClose={() => setExplainMetric(null)}
        />
      )}
    </MainContent>
  )
}
