import { MainContent } from '@/presentation/components/Layout'
import {
  Card,
  CardTitle,
  KpiCard,
  KpiGrid,
  Chip,
  ChipGroup,
} from '@/presentation/components/common'
import {
  BudgetVsActualChart,
  PrevYearComparisonChart,
  EstimatedInventoryDetailChart,
  CurrencyUnitToggle,
} from '@/presentation/components/charts'
import { sc } from '@/presentation/theme/semanticColors'
import { palette } from '@/presentation/theme/tokens'
import { ComparisonView } from '@/presentation/pages/Analysis/ComparisonView'
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
  TabBar,
  Tab,
  Section,
  SectionTitle,
  ChartSection,
  ChartGrid,
  ToggleSection,
  ModeToggleWrapper,
  TableWrapper,
  Table,
  Th,
  Td,
  Tr,
  EmptyState,
  CalcGrid,
  CalcRow,
  CalcLabel,
  CalcValue,
  CalcHighlight,
  Formula,
  ColorPickerRow,
  ColorPickerTitle,
  ColorPickerLabel,
  ColorInput,
  AnomalyBadge,
  FcTableWrapper,
  FcTable,
  FcTh,
  FcTd,
  FcTr,
  FcTrTotal,
} from './InsightPage.styles'
import { useInsightData } from './useInsightData'

export function InsightPage() {
  const d = useInsightData()

  if (!d.currentResult) {
    return (
      <MainContent title="インサイト" storeName={d.storeName}>
        <EmptyState>計算を実行してください</EmptyState>
      </MainContent>
    )
  }

  const r = d.currentResult

  return (
    <MainContent title="インサイト" storeName={d.storeName}>
      {/* タブバー */}
      <TabBar>
        <Tab $active={d.activeTab === 'budget'} onClick={() => d.setActiveTab('budget')}>
          予算分析
        </Tab>
        <Tab $active={d.activeTab === 'grossProfit'} onClick={() => d.setActiveTab('grossProfit')}>
          粗利計算
        </Tab>
        <Tab $active={d.activeTab === 'forecast'} onClick={() => d.setActiveTab('forecast')}>
          予測パターン
        </Tab>
        <Tab
          $active={d.activeTab === 'decomposition'}
          onClick={() => d.setActiveTab('decomposition')}
        >
          要因分解
        </Tab>
      </TabBar>

      {/* ═══ Tab 1: 予算分析 ═══ */}
      {d.activeTab === 'budget' && (
        <>
          {d.selectedResults.length > 1 && (
            <ToggleSection>
              <ChipGroup>
                <Chip $active={d.viewMode === 'total'} onClick={() => d.setViewMode('total')}>
                  合計モード
                </Chip>
                <Chip
                  $active={d.viewMode === 'comparison'}
                  onClick={() => d.setViewMode('comparison')}
                >
                  比較モード
                </Chip>
              </ChipGroup>
            </ToggleSection>
          )}

          {d.viewMode === 'comparison' && d.selectedResults.length > 1 ? (
            <ComparisonView results={d.selectedResults} />
          ) : (
            <>
              <KpiGrid>
                <KpiCard
                  label="予算達成率"
                  value={d.formatPercent(r.budgetProgressRate)}
                  subText={`経過日予算累計比: ${r.elapsedDays}日分`}
                  accent={palette.primary}
                />
                <KpiCard
                  label="予算消化率"
                  value={d.formatPercent(r.budgetAchievementRate)}
                  subText={`予算: ${d.formatCurrency(r.budget)}`}
                  accent={sc.positive}
                />
                <KpiCard
                  label="月末予測売上"
                  value={d.formatCurrency(r.projectedSales)}
                  accent={palette.infoDark}
                />
                <KpiCard
                  label="達成率予測"
                  value={d.formatPercent(r.projectedAchievement)}
                  subText={`残余予算: ${d.formatCurrency(r.remainingBudget)}`}
                  accent={sc.achievement(r.projectedAchievement)}
                />
                <KpiCard
                  label="粗利額予算"
                  value={d.formatCurrency(r.grossProfitBudget)}
                  subText={`実績: ${d.formatCurrency(d.actualGrossProfit)}`}
                  accent={palette.purpleDark}
                />
                <KpiCard
                  label="粗利率"
                  value={d.formatPercent(d.actualGrossProfitRate)}
                  subText={`予算: ${d.formatPercent(r.grossProfitRateBudget)}`}
                  accent={palette.pinkDark}
                />
                {d.prevYear.hasPrevYear && (
                  <KpiCard
                    label="前年同曜日売上"
                    value={d.formatCurrency(d.prevYear.totalSales)}
                    subText={`前年同曜日比: ${d.prevYear.totalSales > 0 ? d.formatPercent(r.totalSales / d.prevYear.totalSales) : '-'}`}
                    accent={palette.slate}
                  />
                )}
                {d.prevYear.hasPrevYear && d.prevYear.totalSales > 0 && (
                  <KpiCard
                    label="前年同曜日比"
                    value={d.formatPercent(r.totalSales / d.prevYear.totalSales)}
                    subText={`差額: ${d.formatCurrency(r.totalSales - d.prevYear.totalSales)}`}
                    accent={sc.cond(r.totalSales >= d.prevYear.totalSales)}
                  />
                )}
              </KpiGrid>

              {d.prevYear.hasPrevYear && (
                <ToggleSection>
                  <ChipGroup>
                    <Chip
                      $active={d.chartMode === 'budget-vs-actual'}
                      onClick={() => d.setChartMode('budget-vs-actual')}
                    >
                      予算 vs 実績
                    </Chip>
                    <Chip
                      $active={d.chartMode === 'prev-year'}
                      onClick={() => d.setChartMode('prev-year')}
                    >
                      当年 vs 前年同曜日
                    </Chip>
                    <Chip
                      $active={d.chartMode === 'all-three'}
                      onClick={() => d.setChartMode('all-three')}
                    >
                      予算 vs 実績 vs 前年
                    </Chip>
                  </ChipGroup>
                </ToggleSection>
              )}
              <ChartSection>
                {d.chartMode === 'budget-vs-actual' && (
                  <BudgetVsActualChart data={d.chartData} budget={r.budget} />
                )}
                {d.chartMode === 'prev-year' &&
                  d.prevYear.hasPrevYear &&
                  (() => {
                    const currentDaily = new Map<number, { sales: number }>()
                    for (const [day, s] of d.salesDaily) currentDaily.set(day, { sales: s })
                    return (
                      <PrevYearComparisonChart
                        currentDaily={currentDaily}
                        prevYearDaily={d.prevYear.daily}
                        daysInMonth={d.daysInMonth}
                      />
                    )
                  })()}
                {d.chartMode === 'all-three' && (
                  <BudgetVsActualChart data={d.chartData} budget={r.budget} showPrevYear />
                )}
                {d.chartMode !== 'budget-vs-actual' && !d.prevYear.hasPrevYear && (
                  <BudgetVsActualChart data={d.chartData} budget={r.budget} />
                )}
              </ChartSection>

              {/* 日別予算 vs 実績テーブル */}
              <Card>
                <CardTitle>日別予算 vs 実績</CardTitle>
                <TableWrapper>
                  <Table>
                    <thead>
                      <tr>
                        <Th>日</Th>
                        <Th>予算</Th>
                        <Th>実績</Th>
                        <Th>差異</Th>
                        <Th>売変額</Th>
                        <Th>累計予算</Th>
                        <Th>累計実績</Th>
                        <Th>予算差異</Th>
                        <Th>達成率</Th>
                        <Th>売変率</Th>
                        <Th>累計売変率</Th>
                        {d.prevYear.hasPrevYear && <Th>前年同曜日</Th>}
                        {d.prevYear.hasPrevYear && <Th>前年比</Th>}
                        {d.prevYear.hasPrevYear && <Th>前年同曜日累計</Th>}
                        {d.prevYear.hasPrevYear && <Th>累計前年比</Th>}
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        let cumDiscount = 0
                        let cumGrossSales = 0
                        let cumPrevYear = 0
                        return d.chartData
                          .filter((cd) => cd.actualCum > 0 || cd.budgetCum > 0)
                          .map((cd) => {
                            const dailyRec = r.daily.get(cd.day)
                            const daySales = d.salesDaily.get(cd.day) ?? 0
                            const dayBudget = r.budgetDaily.get(cd.day) ?? 0
                            const variance = daySales - dayBudget
                            const achievement = cd.budgetCum > 0 ? cd.actualCum / cd.budgetCum : 0
                            const dayDiscountAbsolute = dailyRec?.discountAbsolute ?? 0
                            cumDiscount += dayDiscountAbsolute
                            cumGrossSales += dailyRec?.grossSales ?? 0
                            const discountRateCum = d.safeDivide(cumDiscount, cumGrossSales, 0)
                            const cumDiscountRate = discountRateCum
                            const budgetVariance = cd.actualCum - cd.budgetCum
                            const pyDaySales = d.prevYear.daily.get(cd.day)?.sales ?? 0
                            cumPrevYear += pyDaySales
                            const pyDayRatio = pyDaySales > 0 ? daySales / pyDaySales : 0
                            const pyCumRatio = cumPrevYear > 0 ? cd.actualCum / cumPrevYear : 0
                            return (
                              <Tr key={cd.day}>
                                <Td>{cd.day}</Td>
                                <Td>{d.formatCurrency(dayBudget)}</Td>
                                <Td>{d.formatCurrency(daySales)}</Td>
                                <Td $positive={variance > 0} $negative={variance < 0}>
                                  {variance > 0 ? '+' : ''}
                                  {d.formatCurrency(variance)}
                                </Td>
                                <Td>{d.formatCurrency(dayDiscountAbsolute)}</Td>
                                <Td>{d.formatCurrency(cd.budgetCum)}</Td>
                                <Td>{d.formatCurrency(cd.actualCum)}</Td>
                                <Td $positive={budgetVariance > 0} $negative={budgetVariance < 0}>
                                  {budgetVariance > 0 ? '+' : ''}
                                  {d.formatCurrency(budgetVariance)}
                                </Td>
                                <Td $positive={achievement >= 1} $negative={achievement < 0.9}>
                                  {d.formatPercent(achievement)}
                                </Td>
                                <Td>{d.formatPercent(discountRateCum)}</Td>
                                <Td>{d.formatPercent(cumDiscountRate)}</Td>
                                {d.prevYear.hasPrevYear && (
                                  <Td>{pyDaySales > 0 ? d.formatCurrency(pyDaySales) : '-'}</Td>
                                )}
                                {d.prevYear.hasPrevYear && (
                                  <Td
                                    $positive={pyDayRatio >= 1}
                                    $negative={pyDayRatio > 0 && pyDayRatio < 1}
                                  >
                                    {pyDaySales > 0 ? d.formatPercent(pyDayRatio) : '-'}
                                  </Td>
                                )}
                                {d.prevYear.hasPrevYear && (
                                  <Td>{cumPrevYear > 0 ? d.formatCurrency(cumPrevYear) : '-'}</Td>
                                )}
                                {d.prevYear.hasPrevYear && (
                                  <Td
                                    $positive={pyCumRatio >= 1}
                                    $negative={pyCumRatio > 0 && pyCumRatio < 1}
                                  >
                                    {cumPrevYear > 0 ? d.formatPercent(pyCumRatio) : '-'}
                                  </Td>
                                )}
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
      {d.activeTab === 'grossProfit' && (
        <>
          <CalcGrid>
            <Card $accent={sc.positive}>
              <CardTitle>【在庫法】実績粗利</CardTitle>
              <Formula>売上原価 = 期首在庫 + 総仕入高 - 期末在庫</Formula>
              <CalcRow>
                <CalcLabel>期首在庫</CalcLabel>
                <CalcValue>
                  {r.openingInventory != null ? d.formatCurrency(r.openingInventory) : '未設定'}
                </CalcValue>
              </CalcRow>
              <CalcRow>
                <CalcLabel>＋ 総仕入原価</CalcLabel>
                <CalcValue>{d.formatCurrency(r.totalCost)}</CalcValue>
              </CalcRow>
              <CalcRow>
                <CalcLabel>－ 期末在庫</CalcLabel>
                <CalcValue>
                  {r.closingInventory != null ? d.formatCurrency(r.closingInventory) : '未設定'}
                </CalcValue>
              </CalcRow>
              <CalcRow>
                <CalcLabel>＝ 売上原価 (COGS)</CalcLabel>
                <CalcHighlight>
                  {r.invMethodCogs != null ? d.formatCurrency(r.invMethodCogs) : '-'}
                </CalcHighlight>
              </CalcRow>
              <CalcRow style={{ marginTop: 8 }}>
                <CalcLabel>総売上高</CalcLabel>
                <CalcValue>{d.formatCurrency(r.totalSales)}</CalcValue>
              </CalcRow>
              <CalcRow>
                <CalcLabel>粗利益</CalcLabel>
                <CalcHighlight $color={sc.positive}>
                  {r.invMethodGrossProfit != null ? d.formatCurrency(r.invMethodGrossProfit) : '-'}
                </CalcHighlight>
              </CalcRow>
              <CalcRow>
                <CalcLabel>粗利率</CalcLabel>
                <CalcHighlight $color={sc.positive}>
                  {r.invMethodGrossProfitRate != null
                    ? d.formatPercent(r.invMethodGrossProfitRate)
                    : '-'}
                </CalcHighlight>
              </CalcRow>
            </Card>

            <Card $accent={palette.infoDark}>
              <CardTitle>【推定法】在庫差異検知指標（※損益ではありません）</CardTitle>
              <Formula>
                ※ この指標は在庫異常の検知用です。損益計算には上記の在庫法をご利用ください。
              </Formula>
              <Formula>推定原価 = 粗売上 × (1 - 値入率) + 消耗品費</Formula>
              <CalcRow>
                <CalcLabel>コア売上</CalcLabel>
                <CalcValue>{d.formatCurrency(r.totalCoreSales)}</CalcValue>
              </CalcRow>
              <CalcRow>
                <CalcLabel>粗売上（売変前）</CalcLabel>
                <CalcValue>{d.formatCurrency(r.grossSales)}</CalcValue>
              </CalcRow>
              <CalcRow>
                <CalcLabel>売変率</CalcLabel>
                <CalcValue>{d.formatPercent(r.discountRate)}</CalcValue>
              </CalcRow>
              <CalcRow>
                <CalcLabel>コア値入率</CalcLabel>
                <CalcValue>{d.formatPercent(r.coreMarkupRate)}</CalcValue>
              </CalcRow>
              <CalcRow>
                <CalcLabel>推定原価</CalcLabel>
                <CalcHighlight>{d.formatCurrency(r.estMethodCogs)}</CalcHighlight>
              </CalcRow>
              <CalcRow>
                <CalcLabel>推定在庫差分</CalcLabel>
                <CalcHighlight $color={palette.infoDark}>
                  {d.formatCurrency(r.estMethodMargin)}
                </CalcHighlight>
              </CalcRow>
              <CalcRow>
                <CalcLabel>推定在庫差分率</CalcLabel>
                <CalcHighlight $color={palette.infoDark}>
                  {d.formatPercent(r.estMethodMarginRate)}
                </CalcHighlight>
              </CalcRow>
              <CalcRow>
                <CalcLabel>推定期末在庫</CalcLabel>
                <CalcHighlight $color={palette.cyanDark}>
                  {r.estMethodClosingInventory != null
                    ? d.formatCurrency(r.estMethodClosingInventory)
                    : '-'}
                </CalcHighlight>
              </CalcRow>
            </Card>
          </CalcGrid>

          <Section>
            <EstimatedInventoryDetailChart
              daily={r.daily}
              daysInMonth={d.daysInMonth}
              openingInventory={r.openingInventory}
              closingInventory={r.closingInventory}
              markupRate={r.coreMarkupRate}
              discountRate={r.discountRate}
              comparisonResults={d.selectedResults}
              stores={d.stores}
            />
          </Section>

          <Section>
            <SectionTitle>移動集計</SectionTitle>
            <KpiGrid>
              <KpiCard
                label="店間入"
                value={d.formatCurrency(r.transferDetails.interStoreIn.cost)}
                subText={`売価: ${d.formatCurrency(r.transferDetails.interStoreIn.price)}`}
                accent={sc.positive}
              />
              <KpiCard
                label="店間出"
                value={d.formatCurrency(r.transferDetails.interStoreOut.cost)}
                subText={`売価: ${d.formatCurrency(r.transferDetails.interStoreOut.price)}`}
                accent={sc.negative}
              />
              <KpiCard
                label="部門間入"
                value={d.formatCurrency(r.transferDetails.interDepartmentIn.cost)}
                accent={palette.blueDark}
              />
              <KpiCard
                label="部門間出"
                value={d.formatCurrency(r.transferDetails.interDepartmentOut.cost)}
                accent={palette.purpleDeep}
              />
            </KpiGrid>
          </Section>
        </>
      )}

      {/* ═══ Tab 3: 予測パターン ═══ */}
      {d.activeTab === 'forecast' && d.forecastData && (
        <>
          <ModeToggleWrapper>
            <CurrencyUnitToggle />
          </ModeToggleWrapper>
          <KpiGrid>
            <KpiCard
              label="営業日数"
              value={`${r.salesDays}日`}
              subText={`経過: ${r.elapsedDays}日`}
              accent={palette.primary}
            />
            <KpiCard
              label="日平均売上"
              value={d.formatCurrency(r.averageDailySales)}
              accent={sc.positive}
            />
            <KpiCard
              label="月末予測売上"
              value={d.formatCurrency(r.projectedSales)}
              subText={`達成率予測: ${d.formatPercent(r.projectedAchievement)}`}
              accent={palette.infoDark}
            />
            <KpiCard
              label="異常値検出"
              value={`${d.forecastData.forecast.anomalies.length}件`}
              subText={d.forecastData.forecast.anomalies.length > 0 ? `Z-Score > 2.0` : '異常なし'}
              accent={d.forecastData.forecast.anomalies.length > 0 ? sc.caution : sc.positive}
            />
          </KpiGrid>

          {/* 客数 KPI */}
          {d.customerData?.hasCustomerData && (
            <KpiGrid>
              <KpiCard
                label="累計客数"
                value={`${d.totalCustomers.toLocaleString()}人`}
                subText={`日平均: ${Math.round(d.avgDailyCustomers).toLocaleString()}人`}
                accent={palette.cyanDark}
              />
              <KpiCard
                label="客単価"
                value={`${d.avgTxValue.toLocaleString()}円`}
                subText={
                  d.prevAvgTxValue > 0 ? `前年: ${d.prevAvgTxValue.toLocaleString()}円` : undefined
                }
                accent={palette.purpleDark}
              />
              {d.prevTotalCustomers > 0 && (
                <KpiCard
                  label="客数前年比"
                  value={d.formatPercent(d.customerYoY)}
                  subText={`前年: ${d.prevTotalCustomers.toLocaleString()}人`}
                  accent={d.customerYoY >= 1 ? sc.positive : sc.negative}
                />
              )}
              {d.prevAvgTxValue > 0 && (
                <KpiCard
                  label="客単価前年比"
                  value={d.formatPercent(d.txValueYoY)}
                  subText={`差額: ${d.avgTxValue - d.prevAvgTxValue >= 0 ? '+' : ''}${(d.avgTxValue - d.prevAvgTxValue).toLocaleString()}円`}
                  accent={d.txValueYoY >= 1 ? sc.positive : sc.negative}
                />
              )}
            </KpiGrid>
          )}

          {/* 曜日カラー設定 */}
          <ColorPickerRow>
            <ColorPickerTitle>曜日カラー設定:</ColorPickerTitle>
            {d.DOW_LABELS.map((label, i) => (
              <ColorPickerLabel key={label}>
                <ColorInput
                  type="color"
                  value={d.dowColors[i]}
                  onChange={(e) => d.handleDowColorChange(i, e.target.value)}
                />
                {label}
              </ColorPickerLabel>
            ))}
          </ColorPickerRow>

          <ChartGrid>
            <WeeklyChart data={d.forecastData.stackedData} dowColors={d.dowColors} />
            <DayOfWeekChart
              averages={d.forecastData.forecast.dayOfWeekAverages}
              dowColors={d.dowColors}
            />
          </ChartGrid>

          {/* 店舗間比較 */}
          {d.selectedResults.length > 1 && d.compareMode && d.storeForecasts.length > 0 && (
            <ChartGrid>
              <StoreComparisonRadarChart storeForecasts={d.storeForecasts} />
              <StoreComparisonBarChart storeForecasts={d.storeForecasts} />
            </ChartGrid>
          )}

          {/* 客数・客単価 多角分析 */}
          {d.customerData?.hasCustomerData && (
            <Section>
              <SectionTitle>客数・客単価 多角分析</SectionTitle>
              <ChartGrid>
                <CustomerSalesScatterChart data={d.customerData.customerEntries} />
                <DowCustomerChart
                  averages={d.customerData.dowCustomerAvg}
                  dowColors={d.dowColors}
                />
              </ChartGrid>
              {d.customerData.movingAvgData.length > 0 && (
                <ChartGrid>
                  <MovingAverageChart
                    data={d.customerData.movingAvgData}
                    hasPrev={d.customerData.hasPrevCustomers}
                  />
                  {d.customerData.hasPrevCustomers && d.forecastData && (
                    <SameDowComparisonChart
                      entries={d.customerData.customerEntries}
                      year={d.forecastData.year}
                      month={d.forecastData.month}
                      dowColors={d.dowColors}
                    />
                  )}
                </ChartGrid>
              )}
              {d.customerData.relationshipData.length > 0 && (
                <>
                  <ModeToggleWrapper>
                    <SectionTitle style={{ marginBottom: 0 }}>
                      売上・客数・客単価 関係性
                    </SectionTitle>
                    <ChipGroup>
                      <Chip
                        $active={d.relViewMode === 'current'}
                        onClick={() => d.setRelViewMode('current')}
                      >
                        今年
                      </Chip>
                      {d.customerData.hasPrevCustomers && (
                        <Chip
                          $active={d.relViewMode === 'prev'}
                          onClick={() => d.setRelViewMode('prev')}
                        >
                          前年
                        </Chip>
                      )}
                      {d.customerData.hasPrevCustomers && (
                        <Chip
                          $active={d.relViewMode === 'compare'}
                          onClick={() => d.setRelViewMode('compare')}
                        >
                          比較
                        </Chip>
                      )}
                    </ChipGroup>
                  </ModeToggleWrapper>
                  <RelationshipChart
                    data={d.customerData.relationshipData}
                    prevData={d.customerData.prevRelationshipData}
                    viewMode={d.relViewMode}
                  />
                </>
              )}
            </Section>
          )}

          {/* 週別サマリーテーブル */}
          <Section>
            <ModeToggleWrapper>
              <SectionTitle style={{ marginBottom: 0 }}>週別サマリー</SectionTitle>
              {d.selectedResults.length > 1 && (
                <ChipGroup>
                  <Chip $active={!d.compareMode} onClick={() => d.setCompareMode(false)}>
                    合計モード
                  </Chip>
                  <Chip $active={d.compareMode} onClick={() => d.setCompareMode(true)}>
                    比較モード
                  </Chip>
                </ChipGroup>
              )}
            </ModeToggleWrapper>
            {!d.compareMode ? (
              <FcTableWrapper>
                <FcTable>
                  <thead>
                    <tr>
                      <FcTh>週</FcTh>
                      <FcTh>期間</FcTh>
                      <FcTh>営業日数</FcTh>
                      <FcTh>売上合計</FcTh>
                      {d.customerData?.hasCustomerData && <FcTh>客数</FcTh>}
                      {d.customerData?.hasCustomerData && <FcTh>客単価</FcTh>}
                      <FcTh>粗利合計</FcTh>
                      <FcTh>粗利率</FcTh>
                    </tr>
                  </thead>
                  <tbody>
                    {d.forecastData.forecast.weeklySummaries.map((w) => {
                      let weekCustomers = 0
                      let weekSales = 0
                      for (let day = w.startDay; day <= w.endDay; day++) {
                        const rec = r.daily.get(day)
                        if (rec) {
                          weekCustomers += rec.customers ?? 0
                          weekSales += rec.sales
                        }
                      }
                      const weekTxValue = d.calculateTransactionValue(weekSales, weekCustomers)
                      return (
                        <FcTr key={w.weekNumber}>
                          <FcTd
                            $highlight={
                              w === d.forecastData!.bestWeek || w === d.forecastData!.worstWeek
                            }
                          >
                            第{w.weekNumber}週
                          </FcTd>
                          <FcTd>
                            {w.startDay}日〜{w.endDay}日
                          </FcTd>
                          <FcTd>{w.days}日</FcTd>
                          <FcTd>{d.formatCurrency(w.totalSales)}</FcTd>
                          {d.customerData?.hasCustomerData && (
                            <FcTd>
                              {weekCustomers > 0 ? `${weekCustomers.toLocaleString()}人` : '-'}
                            </FcTd>
                          )}
                          {d.customerData?.hasCustomerData && (
                            <FcTd>
                              {weekTxValue > 0 ? `${weekTxValue.toLocaleString()}円` : '-'}
                            </FcTd>
                          )}
                          <FcTd>{d.formatCurrency(w.totalGrossProfit)}</FcTd>
                          <FcTd>{d.formatPercent(w.grossProfitRate)}</FcTd>
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
                      <FcTh>週</FcTh>
                      <FcTh>期間</FcTh>
                      {d.storeForecasts.map((sf) => (
                        <FcTh key={`s-${sf.storeId}`}>{sf.storeName} 売上</FcTh>
                      ))}
                      {d.storeForecasts.map((sf) => (
                        <FcTh key={`g-${sf.storeId}`}>{sf.storeName} 粗利</FcTh>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {d.forecastData.forecast.weeklySummaries.map((w, wi) => (
                      <FcTr key={w.weekNumber}>
                        <FcTd>第{w.weekNumber}週</FcTd>
                        <FcTd>
                          {w.startDay}日〜{w.endDay}日
                        </FcTd>
                        {d.storeForecasts.map((sf) => {
                          const sw = sf.forecast.weeklySummaries[wi]
                          return (
                            <FcTd key={`s-${sf.storeId}`}>
                              {sw ? d.formatCurrency(sw.totalSales) : '-'}
                            </FcTd>
                          )
                        })}
                        {d.storeForecasts.map((sf) => {
                          const sw = sf.forecast.weeklySummaries[wi]
                          return (
                            <FcTd key={`g-${sf.storeId}`}>
                              {sw ? d.formatCurrency(sw.totalGrossProfit) : '-'}
                            </FcTd>
                          )
                        })}
                      </FcTr>
                    ))}
                  </tbody>
                </FcTable>
              </FcTableWrapper>
            )}
          </Section>

          {/* 異常値検出 */}
          {d.forecastData.forecast.anomalies.length > 0 && (
            <Section>
              <SectionTitle>異常値検出</SectionTitle>
              <Card>
                <CardTitle>統計的異常値（Z-Score &gt; 2.0）</CardTitle>
                <FcTableWrapper>
                  <FcTable>
                    <thead>
                      <tr>
                        <FcTh>日</FcTh>
                        <FcTh>売上</FcTh>
                        <FcTh>平均</FcTh>
                        <FcTh>Z-Score</FcTh>
                        <FcTh>判定</FcTh>
                      </tr>
                    </thead>
                    <tbody>
                      {d.forecastData.forecast.anomalies.map((a) => (
                        <FcTr key={a.day}>
                          <FcTd>{a.day}日</FcTd>
                          <FcTd>{d.formatCurrency(a.value)}</FcTd>
                          <FcTd>{d.formatCurrency(a.mean)}</FcTd>
                          <FcTd>{a.zScore.toFixed(2)}</FcTd>
                          <FcTd>
                            <AnomalyBadge $type={a.zScore > 0 ? 'high' : 'low'}>
                              {a.zScore > 0 ? '高売上' : '低売上'}
                            </AnomalyBadge>
                          </FcTd>
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
      {d.activeTab === 'decomposition' && d.customerData && d.forecastData && (
        <>
          {d.customerData.hasDecompData ? (
            <>
              <Section>
                <SectionTitle>売上要因分解（客数×客単価 / 前年比）</SectionTitle>
                <ChartGrid>
                  <DecompTrendChart data={d.customerData.dailyDecomp} />
                  <DecompDailyBarChart data={d.customerData.dailyDecomp} />
                </ChartGrid>
                <ChartGrid>
                  <DecompDowChart data={d.customerData.dowDecomp} dowColors={d.dowColors} />
                </ChartGrid>

                {/* 週別要因分解テーブル */}
                {d.customerData.weeklyDecomp.length > 0 && (
                  <FcTableWrapper>
                    <FcTable>
                      <thead>
                        <tr>
                          <FcTh>週</FcTh>
                          <FcTh>期間</FcTh>
                          <FcTh>売上差</FcTh>
                          <FcTh>客数効果</FcTh>
                          <FcTh>客単価効果</FcTh>
                          <FcTh>客数寄与率</FcTh>
                        </tr>
                      </thead>
                      <tbody>
                        {d.customerData.weeklyDecomp.map((w) => {
                          const total = Math.abs(w.custEffect) + Math.abs(w.ticketEffect)
                          const custPct =
                            total > 0 ? w.custEffect / (w.custEffect + w.ticketEffect) : 0
                          return (
                            <FcTr key={w.weekNumber}>
                              <FcTd>第{w.weekNumber}週</FcTd>
                              <FcTd>
                                {w.startDay}日〜{w.endDay}日
                              </FcTd>
                              <FcTd $highlight={w.salesDiff < 0}>
                                {d.formatCurrency(w.salesDiff)}
                              </FcTd>
                              <FcTd $highlight={w.custEffect < 0}>
                                {d.formatCurrency(w.custEffect)}
                              </FcTd>
                              <FcTd $highlight={w.ticketEffect < 0}>
                                {d.formatCurrency(w.ticketEffect)}
                              </FcTd>
                              <FcTd>{d.formatPercent(custPct)}</FcTd>
                            </FcTr>
                          )
                        })}
                        {(() => {
                          const totals = d.customerData!.weeklyDecomp.reduce(
                            (acc, w) => ({
                              salesDiff: acc.salesDiff + w.salesDiff,
                              custEffect: acc.custEffect + w.custEffect,
                              ticketEffect: acc.ticketEffect + w.ticketEffect,
                            }),
                            { salesDiff: 0, custEffect: 0, ticketEffect: 0 },
                          )
                          const totalAbs =
                            Math.abs(totals.custEffect) + Math.abs(totals.ticketEffect)
                          const totalCustPct =
                            totalAbs > 0
                              ? totals.custEffect / (totals.custEffect + totals.ticketEffect)
                              : 0
                          return (
                            <FcTrTotal>
                              <FcTd>合計</FcTd>
                              <FcTd></FcTd>
                              <FcTd>{d.formatCurrency(totals.salesDiff)}</FcTd>
                              <FcTd>{d.formatCurrency(totals.custEffect)}</FcTd>
                              <FcTd>{d.formatCurrency(totals.ticketEffect)}</FcTd>
                              <FcTd>{d.formatPercent(totalCustPct)}</FcTd>
                            </FcTrTotal>
                          )
                        })()}
                      </tbody>
                    </FcTable>
                  </FcTableWrapper>
                )}
              </Section>

              {/* 曜日別客数・客単価テーブル */}
              {d.customerData.hasCustomerData && (
                <Section>
                  <SectionTitle>曜日別 客数・客単価 詳細</SectionTitle>
                  <FcTableWrapper>
                    <FcTable>
                      <thead>
                        <tr>
                          <FcTh>曜日</FcTh>
                          <FcTh>日数</FcTh>
                          <FcTh>平均客数</FcTh>
                          <FcTh>平均客単価</FcTh>
                          {d.customerData.hasPrevCustomers && <FcTh>前年客数</FcTh>}
                          {d.customerData.hasPrevCustomers && <FcTh>前年客単価</FcTh>}
                          {d.customerData.hasPrevCustomers && <FcTh>客数前年比</FcTh>}
                          {d.customerData.hasPrevCustomers && <FcTh>客単価前年比</FcTh>}
                        </tr>
                      </thead>
                      <tbody>
                        {d.customerData.dowCustomerAvg.map((a) => {
                          const custRatio =
                            a.prevAvgCustomers > 0 ? a.avgCustomers / a.prevAvgCustomers : 0
                          const txRatio = a.prevAvgTxValue > 0 ? a.avgTxValue / a.prevAvgTxValue : 0
                          return (
                            <FcTr key={a.dow}>
                              <FcTd>{a.dow}</FcTd>
                              <FcTd>{a.count}日</FcTd>
                              <FcTd>{a.avgCustomers > 0 ? `${a.avgCustomers}人` : '-'}</FcTd>
                              <FcTd>
                                {a.avgTxValue > 0 ? `${a.avgTxValue.toLocaleString()}円` : '-'}
                              </FcTd>
                              {d.customerData!.hasPrevCustomers && (
                                <FcTd>
                                  {a.prevAvgCustomers > 0 ? `${a.prevAvgCustomers}人` : '-'}
                                </FcTd>
                              )}
                              {d.customerData!.hasPrevCustomers && (
                                <FcTd>
                                  {a.prevAvgTxValue > 0
                                    ? `${a.prevAvgTxValue.toLocaleString()}円`
                                    : '-'}
                                </FcTd>
                              )}
                              {d.customerData!.hasPrevCustomers && (
                                <FcTd $highlight={custRatio > 0 && custRatio < 1}>
                                  {custRatio > 0 ? d.formatPercent(custRatio) : '-'}
                                </FcTd>
                              )}
                              {d.customerData!.hasPrevCustomers && (
                                <FcTd $highlight={txRatio > 0 && txRatio < 1}>
                                  {txRatio > 0 ? d.formatPercent(txRatio) : '-'}
                                </FcTd>
                              )}
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
