import { useState, useMemo } from 'react'
import { MainContent } from '@/presentation/components/Layout'
import { Card, CardTitle, KpiCard, KpiGrid, Chip, ChipGroup } from '@/presentation/components/common'
import { BudgetVsActualChart, PrevYearComparisonChart, EstimatedInventoryDetailChart, CurrencyUnitToggle } from '@/presentation/components/charts'
import { useCalculation, useStoreSelection, usePrevYearData } from '@/application/hooks'
import { formatCurrency, formatPercent, safeDivide, calculateTransactionValue } from '@/domain/calculations/utils'
import { calculateForecast } from '@/domain/calculations/forecast'
import { sc } from '@/presentation/theme/semanticColors'
import { ComparisonView } from '@/presentation/pages/Analysis/ComparisonView'
import {
  DOW_LABELS,
  DEFAULT_DOW_COLORS,
  buildForecastInput,
  computeStackedWeekData,
  buildDailyCustomerData,
  buildDowCustomerAverages,
  buildMovingAverages,
  buildRelationshipData,
  buildRelationshipDataFromPrev,
  buildDailyDecomposition,
  buildDowDecomposition,
  buildWeeklyDecomposition,
} from '@/presentation/pages/Forecast/ForecastPage.helpers'
import {
  WeeklyChart,
  DayOfWeekChart,
  StoreComparisonRadarChart,
  StoreComparisonBarChart,
  DowCustomerChart,
  MovingAverageChart,
  RelationshipChart,
  CustomerSalesScatterChart,
  SameDowComparisonChart,
  DecompTrendChart,
  DecompDailyBarChart,
  DecompDowChart,
} from '@/presentation/pages/Forecast/ForecastCharts'
import {
  TabBar, Tab,
  Section, SectionTitle, ChartSection, ChartGrid, ToggleSection, ModeToggleWrapper,
  TableWrapper, Table, Th, Td, Tr,
  EmptyState,
  CalcGrid, CalcRow, CalcLabel, CalcValue, CalcHighlight, Formula,
  ColorPickerRow, ColorPickerTitle, ColorPickerLabel, ColorInput,
  AnomalyBadge,
  FcTableWrapper, FcTable, FcTh, FcTd, FcTr, FcTrTotal,
} from './InsightPage.styles'

type InsightTab = 'budget' | 'grossProfit' | 'forecast' | 'decomposition'
type ChartMode = 'budget-vs-actual' | 'prev-year' | 'all-three'
type ViewMode = 'total' | 'comparison'

export function InsightPage() {
  const { daysInMonth } = useCalculation()
  const { currentResult, selectedResults, storeName, stores } = useStoreSelection()
  const prevYear = usePrevYearData(currentResult?.elapsedDays)

  const [activeTab, setActiveTab] = useState<InsightTab>('budget')
  const [viewMode, setViewMode] = useState<ViewMode>('total')
  const [chartMode, setChartMode] = useState<ChartMode>('budget-vs-actual')
  const [compareMode, setCompareMode] = useState(false)
  const [dowColors, setDowColors] = useState<string[]>([...DEFAULT_DOW_COLORS])
  const [relViewMode, setRelViewMode] = useState<'current' | 'prev' | 'compare'>('current')

  // ─── 予算分析データ ─────────────────────────────────────
  const salesDaily = useMemo(() => {
    if (!currentResult) return new Map<number, number>()
    const m = new Map<number, number>()
    for (const [d, rec] of currentResult.daily) m.set(d, rec.sales)
    return m
  }, [currentResult])

  const chartData = useMemo(() => {
    if (!currentResult) return []
    const data = []
    let cumActual = 0
    let cumBudget = 0
    let cumPy = 0
    for (let d = 1; d <= daysInMonth; d++) {
      cumActual += salesDaily.get(d) ?? 0
      cumBudget += currentResult.budgetDaily.get(d) ?? 0
      cumPy += prevYear.daily.get(d)?.sales ?? 0
      data.push({
        day: d,
        actualCum: cumActual,
        budgetCum: cumBudget,
        prevYearCum: prevYear.hasPrevYear ? cumPy : null,
      })
    }
    return data
  }, [currentResult, salesDaily, prevYear, daysInMonth])

  // ─── 予測データ ─────────────────────────────────────────
  const forecastData = useMemo(() => {
    if (!currentResult) return null
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth() + 1
    const forecastInput = buildForecastInput(currentResult, year, month)
    const forecast = calculateForecast(forecastInput)
    const stackedData = computeStackedWeekData(forecast.weeklySummaries, forecastInput.dailySales, year, month)
    const activeWeeks = forecast.weeklySummaries.filter((w) => w.totalSales > 0)
    const bestWeek = activeWeeks.length > 0 ? activeWeeks.reduce((a, b) => a.totalSales > b.totalSales ? a : b) : null
    const worstWeek = activeWeeks.length > 0 ? activeWeeks.reduce((a, b) => a.totalSales < b.totalSales ? a : b) : null
    return { forecast, stackedData, bestWeek, worstWeek, year, month }
  }, [currentResult])

  // ─── 客数・要因分解データ ───────────────────────────────
  const customerData = useMemo(() => {
    if (!currentResult || !forecastData) return null
    const customerEntries = buildDailyCustomerData(currentResult.daily, prevYear)
    const hasCustomerData = customerEntries.some((e) => e.customers > 0)
    const { year, month } = forecastData
    const dowCustomerAvg = buildDowCustomerAverages(customerEntries, year, month)
    const movingAvgData = buildMovingAverages(customerEntries, 5)
    const relationshipData = buildRelationshipData(customerEntries)
    const prevRelationshipData = buildRelationshipDataFromPrev(customerEntries)
    const hasPrevCustomers = customerEntries.some((e) => e.prevCustomers > 0)

    const dailyDecomp = buildDailyDecomposition(customerEntries)
    const hasDecompData = dailyDecomp.length > 0
    const dowDecomp = hasDecompData ? buildDowDecomposition(dailyDecomp, year, month) : []
    const weeklyDecomp = hasDecompData ? buildWeeklyDecomposition(dailyDecomp, forecastData.forecast.weeklySummaries) : []

    return {
      customerEntries, hasCustomerData, dowCustomerAvg, movingAvgData,
      relationshipData, prevRelationshipData, hasPrevCustomers,
      dailyDecomp, hasDecompData, dowDecomp, weeklyDecomp,
    }
  }, [currentResult, prevYear, forecastData])

  const storeForecasts = useMemo(() => {
    if (!compareMode || !forecastData) return []
    const { year, month } = forecastData
    return selectedResults.map((sr) => {
      const input = buildForecastInput(sr, year, month)
      const fc = calculateForecast(input)
      const name = stores.get(sr.storeId)?.name ?? sr.storeId
      return { storeId: sr.storeId, storeName: name, forecast: fc }
    })
  }, [compareMode, forecastData, selectedResults, stores])

  if (!currentResult) {
    return (
      <MainContent title="インサイト" storeName={storeName}>
        <EmptyState>計算を実行してください</EmptyState>
      </MainContent>
    )
  }

  const r = currentResult
  const actualGrossProfit = r.invMethodGrossProfit ?? r.estMethodMargin
  const actualGrossProfitRate = r.invMethodGrossProfitRate ?? r.estMethodMarginRate

  // 客数 KPI
  const totalCustomers = r.totalCustomers
  const avgDailyCustomers = r.averageCustomersPerDay
  const avgTxValue = calculateTransactionValue(r.totalSales, totalCustomers)
  const prevTotalCustomers = prevYear.totalCustomers
  const customerYoY = prevTotalCustomers > 0 ? safeDivide(totalCustomers, prevTotalCustomers) : 0
  const prevAvgTxValue = calculateTransactionValue(prevYear.totalSales, prevTotalCustomers)
  const txValueYoY = prevAvgTxValue > 0 ? safeDivide(avgTxValue, prevAvgTxValue) : 0

  const handleDowColorChange = (index: number, color: string) => {
    setDowColors((prev) => {
      const next = [...prev]
      next[index] = color
      return next
    })
  }

  return (
    <MainContent title="インサイト" storeName={storeName}>
      {/* タブバー */}
      <TabBar>
        <Tab $active={activeTab === 'budget'} onClick={() => setActiveTab('budget')}>予算分析</Tab>
        <Tab $active={activeTab === 'grossProfit'} onClick={() => setActiveTab('grossProfit')}>粗利計算</Tab>
        <Tab $active={activeTab === 'forecast'} onClick={() => setActiveTab('forecast')}>予測パターン</Tab>
        <Tab $active={activeTab === 'decomposition'} onClick={() => setActiveTab('decomposition')}>要因分解</Tab>
      </TabBar>

      {/* ═══ Tab 1: 予算分析 ═══ */}
      {activeTab === 'budget' && (
        <>
          {selectedResults.length > 1 && (
            <ToggleSection>
              <ChipGroup>
                <Chip $active={viewMode === 'total'} onClick={() => setViewMode('total')}>合計モード</Chip>
                <Chip $active={viewMode === 'comparison'} onClick={() => setViewMode('comparison')}>比較モード</Chip>
              </ChipGroup>
            </ToggleSection>
          )}

          {viewMode === 'comparison' && selectedResults.length > 1 ? (
            <ComparisonView results={selectedResults} />
          ) : (
            <>
              <KpiGrid>
                <KpiCard label="予算達成率" value={formatPercent(r.budgetProgressRate)} subText={`経過日予算累計比: ${r.elapsedDays}日分`} accent="#6366f1" />
                <KpiCard label="予算消化率" value={formatPercent(r.budgetAchievementRate)} subText={`予算: ${formatCurrency(r.budget)}`} accent={sc.positive} />
                <KpiCard label="月末予測売上" value={formatCurrency(r.projectedSales)} accent="#0ea5e9" />
                <KpiCard label="達成率予測" value={formatPercent(r.projectedAchievement)} subText={`残余予算: ${formatCurrency(r.remainingBudget)}`} accent={sc.achievement(r.projectedAchievement)} />
                <KpiCard label="粗利額予算" value={formatCurrency(r.grossProfitBudget)} subText={`実績: ${formatCurrency(actualGrossProfit)}`} accent="#8b5cf6" />
                <KpiCard label="粗利率" value={formatPercent(actualGrossProfitRate)} subText={`予算: ${formatPercent(r.grossProfitRateBudget)}`} accent="#ec4899" />
                {prevYear.hasPrevYear && (
                  <KpiCard label="前年同曜日売上" value={formatCurrency(prevYear.totalSales)} subText={`前年同曜日比: ${prevYear.totalSales > 0 ? formatPercent(r.totalSales / prevYear.totalSales) : '-'}`} accent="#9ca3af" />
                )}
                {prevYear.hasPrevYear && prevYear.totalSales > 0 && (
                  <KpiCard label="前年同曜日比" value={formatPercent(r.totalSales / prevYear.totalSales)} subText={`差額: ${formatCurrency(r.totalSales - prevYear.totalSales)}`} accent={sc.cond(r.totalSales >= prevYear.totalSales)} />
                )}
              </KpiGrid>

              {prevYear.hasPrevYear && (
                <ToggleSection>
                  <ChipGroup>
                    <Chip $active={chartMode === 'budget-vs-actual'} onClick={() => setChartMode('budget-vs-actual')}>予算 vs 実績</Chip>
                    <Chip $active={chartMode === 'prev-year'} onClick={() => setChartMode('prev-year')}>当年 vs 前年同曜日</Chip>
                    <Chip $active={chartMode === 'all-three'} onClick={() => setChartMode('all-three')}>予算 vs 実績 vs 前年</Chip>
                  </ChipGroup>
                </ToggleSection>
              )}
              <ChartSection>
                {chartMode === 'budget-vs-actual' && (
                  <BudgetVsActualChart data={chartData} budget={r.budget} />
                )}
                {chartMode === 'prev-year' && prevYear.hasPrevYear && (() => {
                  const currentDaily = new Map<number, { sales: number }>()
                  for (const [d, s] of salesDaily) currentDaily.set(d, { sales: s })
                  return (
                    <PrevYearComparisonChart currentDaily={currentDaily} prevYearDaily={prevYear.daily} daysInMonth={daysInMonth} />
                  )
                })()}
                {chartMode === 'all-three' && (
                  <BudgetVsActualChart data={chartData} budget={r.budget} showPrevYear />
                )}
                {chartMode !== 'budget-vs-actual' && !prevYear.hasPrevYear && (
                  <BudgetVsActualChart data={chartData} budget={r.budget} />
                )}
              </ChartSection>

              {/* 日別予算 vs 実績テーブル */}
              <Card>
                <CardTitle>日別予算 vs 実績</CardTitle>
                <TableWrapper>
                  <Table>
                    <thead>
                      <tr>
                        <Th>日</Th><Th>予算</Th><Th>実績</Th><Th>差異</Th><Th>売変額</Th>
                        <Th>累計予算</Th><Th>累計実績</Th><Th>予算差異</Th><Th>達成率</Th>
                        <Th>売変率</Th><Th>累計売変率</Th>
                        {prevYear.hasPrevYear && <Th>前年同曜日</Th>}
                        {prevYear.hasPrevYear && <Th>前年比</Th>}
                        {prevYear.hasPrevYear && <Th>前年同曜日累計</Th>}
                        {prevYear.hasPrevYear && <Th>累計前年比</Th>}
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        let cumDiscount = 0
                        let cumGrossSales = 0
                        let cumPrevYear = 0
                        return chartData.filter((d) => d.actualCum > 0 || d.budgetCum > 0).map((d) => {
                          const dailyRec = r.daily.get(d.day)
                          const daySales = salesDaily.get(d.day) ?? 0
                          const dayBudget = r.budgetDaily.get(d.day) ?? 0
                          const variance = daySales - dayBudget
                          const achievement = d.budgetCum > 0 ? d.actualCum / d.budgetCum : 0
                          const dayDiscountAbsolute = dailyRec?.discountAbsolute ?? 0
                          cumDiscount += dayDiscountAbsolute
                          cumGrossSales += dailyRec?.grossSales ?? 0
                          const discountRateCum = safeDivide(cumDiscount, cumGrossSales, 0)
                          const cumDiscountRate = discountRateCum
                          const budgetVariance = d.actualCum - d.budgetCum
                          const pyDaySales = prevYear.daily.get(d.day)?.sales ?? 0
                          cumPrevYear += pyDaySales
                          const pyDayRatio = pyDaySales > 0 ? daySales / pyDaySales : 0
                          const pyCumRatio = cumPrevYear > 0 ? d.actualCum / cumPrevYear : 0
                          return (
                            <Tr key={d.day}>
                              <Td>{d.day}</Td>
                              <Td>{formatCurrency(dayBudget)}</Td>
                              <Td>{formatCurrency(daySales)}</Td>
                              <Td $positive={variance > 0} $negative={variance < 0}>{variance > 0 ? '+' : ''}{formatCurrency(variance)}</Td>
                              <Td>{formatCurrency(dayDiscountAbsolute)}</Td>
                              <Td>{formatCurrency(d.budgetCum)}</Td>
                              <Td>{formatCurrency(d.actualCum)}</Td>
                              <Td $positive={budgetVariance > 0} $negative={budgetVariance < 0}>{budgetVariance > 0 ? '+' : ''}{formatCurrency(budgetVariance)}</Td>
                              <Td $positive={achievement >= 1} $negative={achievement < 0.9}>{formatPercent(achievement)}</Td>
                              <Td>{formatPercent(discountRateCum)}</Td>
                              <Td>{formatPercent(cumDiscountRate)}</Td>
                              {prevYear.hasPrevYear && <Td>{pyDaySales > 0 ? formatCurrency(pyDaySales) : '-'}</Td>}
                              {prevYear.hasPrevYear && <Td $positive={pyDayRatio >= 1} $negative={pyDayRatio > 0 && pyDayRatio < 1}>{pyDaySales > 0 ? formatPercent(pyDayRatio) : '-'}</Td>}
                              {prevYear.hasPrevYear && <Td>{cumPrevYear > 0 ? formatCurrency(cumPrevYear) : '-'}</Td>}
                              {prevYear.hasPrevYear && <Td $positive={pyCumRatio >= 1} $negative={pyCumRatio > 0 && pyCumRatio < 1}>{cumPrevYear > 0 ? formatPercent(pyCumRatio) : '-'}</Td>}
                            </Tr>
                          )
                        })
                      })()}
                    </tbody>
                  </Table>
                </TableWrapper>
              </Card>
            </>
          )}
        </>
      )}

      {/* ═══ Tab 2: 粗利計算 ═══ */}
      {activeTab === 'grossProfit' && (
        <>
          <CalcGrid>
            <Card $accent={sc.positive}>
              <CardTitle>【在庫法】実績粗利</CardTitle>
              <Formula>売上原価 = 期首在庫 + 総仕入高 - 期末在庫</Formula>
              <CalcRow><CalcLabel>期首在庫</CalcLabel><CalcValue>{r.openingInventory != null ? formatCurrency(r.openingInventory) : '未設定'}</CalcValue></CalcRow>
              <CalcRow><CalcLabel>＋ 総仕入原価</CalcLabel><CalcValue>{formatCurrency(r.totalCost)}</CalcValue></CalcRow>
              <CalcRow><CalcLabel>－ 期末在庫</CalcLabel><CalcValue>{r.closingInventory != null ? formatCurrency(r.closingInventory) : '未設定'}</CalcValue></CalcRow>
              <CalcRow><CalcLabel>＝ 売上原価 (COGS)</CalcLabel><CalcHighlight>{r.invMethodCogs != null ? formatCurrency(r.invMethodCogs) : '-'}</CalcHighlight></CalcRow>
              <CalcRow style={{ marginTop: 8 }}><CalcLabel>総売上高</CalcLabel><CalcValue>{formatCurrency(r.totalSales)}</CalcValue></CalcRow>
              <CalcRow><CalcLabel>粗利益</CalcLabel><CalcHighlight $color={sc.positive}>{r.invMethodGrossProfit != null ? formatCurrency(r.invMethodGrossProfit) : '-'}</CalcHighlight></CalcRow>
              <CalcRow><CalcLabel>粗利率</CalcLabel><CalcHighlight $color={sc.positive}>{r.invMethodGrossProfitRate != null ? formatPercent(r.invMethodGrossProfitRate) : '-'}</CalcHighlight></CalcRow>
            </Card>

            <Card $accent="#0ea5e9">
              <CardTitle>【推定法】在庫推定指標</CardTitle>
              <Formula>推定原価 = 粗売上 × (1 - 値入率) + 消耗品費</Formula>
              <CalcRow><CalcLabel>コア売上</CalcLabel><CalcValue>{formatCurrency(r.totalCoreSales)}</CalcValue></CalcRow>
              <CalcRow><CalcLabel>粗売上（売変前）</CalcLabel><CalcValue>{formatCurrency(r.grossSales)}</CalcValue></CalcRow>
              <CalcRow><CalcLabel>売変率</CalcLabel><CalcValue>{formatPercent(r.discountRate)}</CalcValue></CalcRow>
              <CalcRow><CalcLabel>コア値入率</CalcLabel><CalcValue>{formatPercent(r.coreMarkupRate)}</CalcValue></CalcRow>
              <CalcRow><CalcLabel>推定原価</CalcLabel><CalcHighlight>{formatCurrency(r.estMethodCogs)}</CalcHighlight></CalcRow>
              <CalcRow><CalcLabel>推定マージン</CalcLabel><CalcHighlight $color="#0ea5e9">{formatCurrency(r.estMethodMargin)}</CalcHighlight></CalcRow>
              <CalcRow><CalcLabel>推定マージン率</CalcLabel><CalcHighlight $color="#0ea5e9">{formatPercent(r.estMethodMarginRate)}</CalcHighlight></CalcRow>
              <CalcRow><CalcLabel>推定期末在庫</CalcLabel><CalcHighlight $color="#06b6d4">{r.estMethodClosingInventory != null ? formatCurrency(r.estMethodClosingInventory) : '-'}</CalcHighlight></CalcRow>
            </Card>
          </CalcGrid>

          <Section>
            <EstimatedInventoryDetailChart
              daily={r.daily}
              daysInMonth={daysInMonth}
              openingInventory={r.openingInventory}
              closingInventory={r.closingInventory}
              markupRate={r.coreMarkupRate}
              discountRate={r.discountRate}
              comparisonResults={selectedResults}
              stores={stores}
            />
          </Section>

          <Section>
            <SectionTitle>移動集計</SectionTitle>
            <KpiGrid>
              <KpiCard label="店間入" value={formatCurrency(r.transferDetails.interStoreIn.cost)} subText={`売価: ${formatCurrency(r.transferDetails.interStoreIn.price)}`} accent={sc.positive} />
              <KpiCard label="店間出" value={formatCurrency(r.transferDetails.interStoreOut.cost)} subText={`売価: ${formatCurrency(r.transferDetails.interStoreOut.price)}`} accent={sc.negative} />
              <KpiCard label="部門間入" value={formatCurrency(r.transferDetails.interDepartmentIn.cost)} accent="#3b82f6" />
              <KpiCard label="部門間出" value={formatCurrency(r.transferDetails.interDepartmentOut.cost)} accent="#a855f7" />
            </KpiGrid>
          </Section>
        </>
      )}

      {/* ═══ Tab 3: 予測パターン ═══ */}
      {activeTab === 'forecast' && forecastData && (
        <>
          <ModeToggleWrapper>
            <CurrencyUnitToggle />
          </ModeToggleWrapper>
          <KpiGrid>
            <KpiCard label="営業日数" value={`${r.salesDays}日`} subText={`経過: ${r.elapsedDays}日`} accent="#6366f1" />
            <KpiCard label="日平均売上" value={formatCurrency(r.averageDailySales)} accent={sc.positive} />
            <KpiCard label="月末予測売上" value={formatCurrency(r.projectedSales)} subText={`達成率予測: ${formatPercent(r.projectedAchievement)}`} accent="#0ea5e9" />
            <KpiCard label="異常値検出" value={`${forecastData.forecast.anomalies.length}件`} subText={forecastData.forecast.anomalies.length > 0 ? `Z-Score > 2.0` : '異常なし'} accent={forecastData.forecast.anomalies.length > 0 ? sc.caution : sc.positive} />
          </KpiGrid>

          {/* 客数 KPI */}
          {customerData?.hasCustomerData && (
            <KpiGrid>
              <KpiCard label="累計客数" value={`${totalCustomers.toLocaleString()}人`} subText={`日平均: ${Math.round(avgDailyCustomers).toLocaleString()}人`} accent="#06b6d4" />
              <KpiCard label="客単価" value={`${avgTxValue.toLocaleString()}円`} subText={prevAvgTxValue > 0 ? `前年: ${prevAvgTxValue.toLocaleString()}円` : undefined} accent="#8b5cf6" />
              {prevTotalCustomers > 0 && (
                <KpiCard label="客数前年比" value={formatPercent(customerYoY)} subText={`前年: ${prevTotalCustomers.toLocaleString()}人`} accent={customerYoY >= 1 ? sc.positive : sc.negative} />
              )}
              {prevAvgTxValue > 0 && (
                <KpiCard label="客単価前年比" value={formatPercent(txValueYoY)} subText={`差額: ${(avgTxValue - prevAvgTxValue >= 0 ? '+' : '')}${(avgTxValue - prevAvgTxValue).toLocaleString()}円`} accent={txValueYoY >= 1 ? sc.positive : sc.negative} />
              )}
            </KpiGrid>
          )}

          {/* 曜日カラー設定 */}
          <ColorPickerRow>
            <ColorPickerTitle>曜日カラー設定:</ColorPickerTitle>
            {DOW_LABELS.map((label, i) => (
              <ColorPickerLabel key={label}>
                <ColorInput type="color" value={dowColors[i]} onChange={(e) => handleDowColorChange(i, e.target.value)} />
                {label}
              </ColorPickerLabel>
            ))}
          </ColorPickerRow>

          <ChartGrid>
            <WeeklyChart data={forecastData.stackedData} dowColors={dowColors} />
            <DayOfWeekChart averages={forecastData.forecast.dayOfWeekAverages} dowColors={dowColors} />
          </ChartGrid>

          {/* 店舗間比較 */}
          {selectedResults.length > 1 && compareMode && storeForecasts.length > 0 && (
            <ChartGrid>
              <StoreComparisonRadarChart storeForecasts={storeForecasts} />
              <StoreComparisonBarChart storeForecasts={storeForecasts} />
            </ChartGrid>
          )}

          {/* 客数・客単価 多角分析 */}
          {customerData?.hasCustomerData && (
            <Section>
              <SectionTitle>客数・客単価 多角分析</SectionTitle>
              <ChartGrid>
                <CustomerSalesScatterChart data={customerData.customerEntries} />
                <DowCustomerChart averages={customerData.dowCustomerAvg} dowColors={dowColors} />
              </ChartGrid>
              {customerData.movingAvgData.length > 0 && (
                <ChartGrid>
                  <MovingAverageChart data={customerData.movingAvgData} hasPrev={customerData.hasPrevCustomers} />
                  {customerData.hasPrevCustomers && forecastData && (
                    <SameDowComparisonChart entries={customerData.customerEntries} year={forecastData.year} month={forecastData.month} dowColors={dowColors} />
                  )}
                </ChartGrid>
              )}
              {customerData.relationshipData.length > 0 && (
                <>
                  <ModeToggleWrapper>
                    <SectionTitle style={{ marginBottom: 0 }}>売上・客数・客単価 関係性</SectionTitle>
                    <ChipGroup>
                      <Chip $active={relViewMode === 'current'} onClick={() => setRelViewMode('current')}>今年</Chip>
                      {customerData.hasPrevCustomers && <Chip $active={relViewMode === 'prev'} onClick={() => setRelViewMode('prev')}>前年</Chip>}
                      {customerData.hasPrevCustomers && <Chip $active={relViewMode === 'compare'} onClick={() => setRelViewMode('compare')}>比較</Chip>}
                    </ChipGroup>
                  </ModeToggleWrapper>
                  <RelationshipChart data={customerData.relationshipData} prevData={customerData.prevRelationshipData} viewMode={relViewMode} />
                </>
              )}
            </Section>
          )}

          {/* 週別サマリーテーブル */}
          <Section>
            <ModeToggleWrapper>
              <SectionTitle style={{ marginBottom: 0 }}>週別サマリー</SectionTitle>
              {selectedResults.length > 1 && (
                <ChipGroup>
                  <Chip $active={!compareMode} onClick={() => setCompareMode(false)}>合計モード</Chip>
                  <Chip $active={compareMode} onClick={() => setCompareMode(true)}>比較モード</Chip>
                </ChipGroup>
              )}
            </ModeToggleWrapper>
            {!compareMode ? (
              <FcTableWrapper>
                <FcTable>
                  <thead>
                    <tr>
                      <FcTh>週</FcTh><FcTh>期間</FcTh><FcTh>営業日数</FcTh><FcTh>売上合計</FcTh>
                      {customerData?.hasCustomerData && <FcTh>客数</FcTh>}
                      {customerData?.hasCustomerData && <FcTh>客単価</FcTh>}
                      <FcTh>粗利合計</FcTh><FcTh>粗利率</FcTh>
                    </tr>
                  </thead>
                  <tbody>
                    {forecastData.forecast.weeklySummaries.map((w) => {
                      let weekCustomers = 0
                      let weekSales = 0
                      for (let d = w.startDay; d <= w.endDay; d++) {
                        const rec = r.daily.get(d)
                        if (rec) { weekCustomers += rec.customers ?? 0; weekSales += rec.sales }
                      }
                      const weekTxValue = calculateTransactionValue(weekSales, weekCustomers)
                      return (
                        <FcTr key={w.weekNumber}>
                          <FcTd $highlight={w === forecastData.bestWeek || w === forecastData.worstWeek}>第{w.weekNumber}週</FcTd>
                          <FcTd>{w.startDay}日〜{w.endDay}日</FcTd>
                          <FcTd>{w.days}日</FcTd>
                          <FcTd>{formatCurrency(w.totalSales)}</FcTd>
                          {customerData?.hasCustomerData && <FcTd>{weekCustomers > 0 ? `${weekCustomers.toLocaleString()}人` : '-'}</FcTd>}
                          {customerData?.hasCustomerData && <FcTd>{weekTxValue > 0 ? `${weekTxValue.toLocaleString()}円` : '-'}</FcTd>}
                          <FcTd>{formatCurrency(w.totalGrossProfit)}</FcTd>
                          <FcTd>{formatPercent(w.grossProfitRate)}</FcTd>
                        </FcTr>
                      )
                    })}
                  </tbody>
                </FcTable>
              </FcTableWrapper>
            ) : (
              <FcTableWrapper>
                <FcTable>
                  <thead>
                    <tr>
                      <FcTh>週</FcTh><FcTh>期間</FcTh>
                      {storeForecasts.map((sf) => <FcTh key={`s-${sf.storeId}`}>{sf.storeName} 売上</FcTh>)}
                      {storeForecasts.map((sf) => <FcTh key={`g-${sf.storeId}`}>{sf.storeName} 粗利</FcTh>)}
                    </tr>
                  </thead>
                  <tbody>
                    {forecastData.forecast.weeklySummaries.map((w, wi) => (
                      <FcTr key={w.weekNumber}>
                        <FcTd>第{w.weekNumber}週</FcTd>
                        <FcTd>{w.startDay}日〜{w.endDay}日</FcTd>
                        {storeForecasts.map((sf) => { const sw = sf.forecast.weeklySummaries[wi]; return <FcTd key={`s-${sf.storeId}`}>{sw ? formatCurrency(sw.totalSales) : '-'}</FcTd> })}
                        {storeForecasts.map((sf) => { const sw = sf.forecast.weeklySummaries[wi]; return <FcTd key={`g-${sf.storeId}`}>{sw ? formatCurrency(sw.totalGrossProfit) : '-'}</FcTd> })}
                      </FcTr>
                    ))}
                  </tbody>
                </FcTable>
              </FcTableWrapper>
            )}
          </Section>

          {/* 異常値検出 */}
          {forecastData.forecast.anomalies.length > 0 && (
            <Section>
              <SectionTitle>異常値検出</SectionTitle>
              <Card>
                <CardTitle>統計的異常値（Z-Score &gt; 2.0）</CardTitle>
                <FcTableWrapper>
                  <FcTable>
                    <thead><tr><FcTh>日</FcTh><FcTh>売上</FcTh><FcTh>平均</FcTh><FcTh>Z-Score</FcTh><FcTh>判定</FcTh></tr></thead>
                    <tbody>
                      {forecastData.forecast.anomalies.map((a) => (
                        <FcTr key={a.day}>
                          <FcTd>{a.day}日</FcTd>
                          <FcTd>{formatCurrency(a.value)}</FcTd>
                          <FcTd>{formatCurrency(a.mean)}</FcTd>
                          <FcTd>{a.zScore.toFixed(2)}</FcTd>
                          <FcTd><AnomalyBadge $type={a.zScore > 0 ? 'high' : 'low'}>{a.zScore > 0 ? '高売上' : '低売上'}</AnomalyBadge></FcTd>
                        </FcTr>
                      ))}
                    </tbody>
                  </FcTable>
                </FcTableWrapper>
              </Card>
            </Section>
          )}
        </>
      )}

      {/* ═══ Tab 4: 要因分解 ═══ */}
      {activeTab === 'decomposition' && customerData && forecastData && (
        <>
          {customerData.hasDecompData ? (
            <>
              <Section>
                <SectionTitle>売上要因分解（客数×客単価 / 前年比）</SectionTitle>
                <ChartGrid>
                  <DecompTrendChart data={customerData.dailyDecomp} />
                  <DecompDailyBarChart data={customerData.dailyDecomp} />
                </ChartGrid>
                <ChartGrid>
                  <DecompDowChart data={customerData.dowDecomp} dowColors={dowColors} />
                </ChartGrid>

                {/* 週別要因分解テーブル */}
                {customerData.weeklyDecomp.length > 0 && (
                  <FcTableWrapper>
                    <FcTable>
                      <thead>
                        <tr>
                          <FcTh>週</FcTh><FcTh>期間</FcTh><FcTh>売上差</FcTh>
                          <FcTh>客数効果</FcTh><FcTh>客単価効果</FcTh><FcTh>客数寄与率</FcTh>
                        </tr>
                      </thead>
                      <tbody>
                        {customerData.weeklyDecomp.map((w) => {
                          const total = Math.abs(w.custEffect) + Math.abs(w.ticketEffect)
                          const custPct = total > 0 ? w.custEffect / (w.custEffect + w.ticketEffect) : 0
                          return (
                            <FcTr key={w.weekNumber}>
                              <FcTd>第{w.weekNumber}週</FcTd>
                              <FcTd>{w.startDay}日〜{w.endDay}日</FcTd>
                              <FcTd $highlight={w.salesDiff < 0}>{formatCurrency(w.salesDiff)}</FcTd>
                              <FcTd $highlight={w.custEffect < 0}>{formatCurrency(w.custEffect)}</FcTd>
                              <FcTd $highlight={w.ticketEffect < 0}>{formatCurrency(w.ticketEffect)}</FcTd>
                              <FcTd>{formatPercent(custPct)}</FcTd>
                            </FcTr>
                          )
                        })}
                        {(() => {
                          const totals = customerData.weeklyDecomp.reduce(
                            (acc, w) => ({ salesDiff: acc.salesDiff + w.salesDiff, custEffect: acc.custEffect + w.custEffect, ticketEffect: acc.ticketEffect + w.ticketEffect }),
                            { salesDiff: 0, custEffect: 0, ticketEffect: 0 },
                          )
                          const totalAbs = Math.abs(totals.custEffect) + Math.abs(totals.ticketEffect)
                          const totalCustPct = totalAbs > 0 ? totals.custEffect / (totals.custEffect + totals.ticketEffect) : 0
                          return (
                            <FcTrTotal>
                              <FcTd>合計</FcTd><FcTd></FcTd>
                              <FcTd>{formatCurrency(totals.salesDiff)}</FcTd>
                              <FcTd>{formatCurrency(totals.custEffect)}</FcTd>
                              <FcTd>{formatCurrency(totals.ticketEffect)}</FcTd>
                              <FcTd>{formatPercent(totalCustPct)}</FcTd>
                            </FcTrTotal>
                          )
                        })()}
                      </tbody>
                    </FcTable>
                  </FcTableWrapper>
                )}
              </Section>

              {/* 曜日別客数・客単価テーブル */}
              {customerData.hasCustomerData && (
                <Section>
                  <SectionTitle>曜日別 客数・客単価 詳細</SectionTitle>
                  <FcTableWrapper>
                    <FcTable>
                      <thead>
                        <tr>
                          <FcTh>曜日</FcTh><FcTh>日数</FcTh><FcTh>平均客数</FcTh><FcTh>平均客単価</FcTh>
                          {customerData.hasPrevCustomers && <FcTh>前年客数</FcTh>}
                          {customerData.hasPrevCustomers && <FcTh>前年客単価</FcTh>}
                          {customerData.hasPrevCustomers && <FcTh>客数前年比</FcTh>}
                          {customerData.hasPrevCustomers && <FcTh>客単価前年比</FcTh>}
                        </tr>
                      </thead>
                      <tbody>
                        {customerData.dowCustomerAvg.map((a) => {
                          const custRatio = a.prevAvgCustomers > 0 ? a.avgCustomers / a.prevAvgCustomers : 0
                          const txRatio = a.prevAvgTxValue > 0 ? a.avgTxValue / a.prevAvgTxValue : 0
                          return (
                            <FcTr key={a.dow}>
                              <FcTd>{a.dow}</FcTd><FcTd>{a.count}日</FcTd>
                              <FcTd>{a.avgCustomers > 0 ? `${a.avgCustomers}人` : '-'}</FcTd>
                              <FcTd>{a.avgTxValue > 0 ? `${a.avgTxValue.toLocaleString()}円` : '-'}</FcTd>
                              {customerData.hasPrevCustomers && <FcTd>{a.prevAvgCustomers > 0 ? `${a.prevAvgCustomers}人` : '-'}</FcTd>}
                              {customerData.hasPrevCustomers && <FcTd>{a.prevAvgTxValue > 0 ? `${a.prevAvgTxValue.toLocaleString()}円` : '-'}</FcTd>}
                              {customerData.hasPrevCustomers && <FcTd $highlight={custRatio > 0 && custRatio < 1}>{custRatio > 0 ? formatPercent(custRatio) : '-'}</FcTd>}
                              {customerData.hasPrevCustomers && <FcTd $highlight={txRatio > 0 && txRatio < 1}>{txRatio > 0 ? formatPercent(txRatio) : '-'}</FcTd>}
                            </FcTr>
                          )
                        })}
                      </tbody>
                    </FcTable>
                  </FcTableWrapper>
                </Section>
              )}
            </>
          ) : (
            <EmptyState>前年データがないため要因分解を表示できません</EmptyState>
          )}
        </>
      )}
    </MainContent>
  )
}
