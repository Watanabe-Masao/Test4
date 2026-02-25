import { useState } from 'react'
import { MainContent } from '@/presentation/components/Layout'
import { Card, CardTitle, KpiCard, KpiGrid, Chip, ChipGroup } from '@/presentation/components/common'
import { useCalculation, useStoreSelection, usePrevYearData } from '@/application/hooks'
import { CurrencyUnitToggle } from '@/presentation/components/charts'
import { calculateForecast } from '@/domain/calculations/forecast'
import { formatCurrency, formatPercent, safeDivide, calculateTransactionValue } from '@/domain/calculations/utils'
import {
  EmptyState,
  ChartGrid,
  ColorPickerRow,
  ColorPickerTitle,
  ColorPickerLabel,
  ColorInput,
  Section,
  SectionTitle,
  ModeToggleWrapper,
  TableWrapper,
  Table,
  Th,
  Td,
  Tr,
  TrTotal,
  AnomalyBadge,
} from './ForecastPage.styles'
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
} from './ForecastPage.helpers'
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
} from './ForecastCharts'
import { sc } from '@/presentation/theme/semanticColors'

export function ForecastPage() {
  useCalculation()
  const { currentResult, selectedResults, storeName, stores } = useStoreSelection()
  const prevYear = usePrevYearData()
  const [compareMode, setCompareMode] = useState(false)
  const [dowColors, setDowColors] = useState<string[]>([...DEFAULT_DOW_COLORS])
  const [relViewMode, setRelViewMode] = useState<'current' | 'prev' | 'compare'>('current')

  if (!currentResult) {
    return (
      <MainContent title="予測分析" storeName={storeName}>
        <EmptyState>計算を実行してください</EmptyState>
      </MainContent>
    )
  }

  const r = currentResult
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth() + 1

  // Build forecast input
  const forecastInput = buildForecastInput(r, year, month)
  const forecast = calculateForecast(forecastInput)

  // Find best/worst week
  const activeWeeks = forecast.weeklySummaries.filter((w) => w.totalSales > 0)
  const bestWeek = activeWeeks.length > 0
    ? activeWeeks.reduce((a, b) => a.totalSales > b.totalSales ? a : b)
    : null
  const worstWeek = activeWeeks.length > 0
    ? activeWeeks.reduce((a, b) => a.totalSales < b.totalSales ? a : b)
    : null

  // Compute stacked data for weekly chart
  const stackedData = computeStackedWeekData(
    forecast.weeklySummaries,
    forecastInput.dailySales,
    year,
    month,
  )

  // Build per-store forecasts for comparison mode
  const storeForecasts = compareMode
    ? selectedResults.map((sr) => {
        const input = buildForecastInput(sr, year, month)
        const fc = calculateForecast(input)
        const name = stores.get(sr.storeId)?.name ?? sr.storeId
        return { storeId: sr.storeId, storeName: name, forecast: fc }
      })
    : []

  // ─── 客数・客単価分析データ ────────────────────────────
  const customerEntries = buildDailyCustomerData(r.daily, prevYear)
  const hasCustomerData = customerEntries.some((e) => e.customers > 0)
  const dowCustomerAvg = buildDowCustomerAverages(customerEntries, year, month)
  const movingAvgData = buildMovingAverages(customerEntries, 5)
  const relationshipData = buildRelationshipData(customerEntries)
  const prevRelationshipData = buildRelationshipDataFromPrev(customerEntries)
  const hasPrevCustomers = customerEntries.some((e) => e.prevCustomers > 0)

  // ─── 要因分解分析データ ────────────────────────────
  const dailyDecomp = buildDailyDecomposition(customerEntries)
  const hasDecompData = dailyDecomp.length > 0
  const dowDecomp = hasDecompData ? buildDowDecomposition(dailyDecomp, year, month) : []
  const weeklyDecomp = hasDecompData ? buildWeeklyDecomposition(dailyDecomp, forecast.weeklySummaries) : []

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
    <MainContent title="予測分析" storeName={storeName}>
      <ModeToggleWrapper>
        <CurrencyUnitToggle />
      </ModeToggleWrapper>
      <KpiGrid>
        <KpiCard
          label="営業日数"
          value={`${r.salesDays}日`}
          subText={`経過: ${r.elapsedDays}日`}
          accent="#6366f1"
        />
        <KpiCard
          label="日平均売上"
          value={formatCurrency(r.averageDailySales)}
          accent={sc.positive}
        />
        <KpiCard
          label="月末予測売上"
          value={formatCurrency(r.projectedSales)}
          subText={`達成率予測: ${formatPercent(r.projectedAchievement)}`}
          accent="#0ea5e9"
        />
        <KpiCard
          label="異常値検出"
          value={`${forecast.anomalies.length}件`}
          subText={forecast.anomalies.length > 0 ? `Z-Score > 2.0` : '異常なし'}
          accent={forecast.anomalies.length > 0 ? sc.caution : sc.positive}
        />
      </KpiGrid>

      {/* 客数・客単価 KPI（客数データがある場合のみ） */}
      {hasCustomerData && (
        <KpiGrid>
          <KpiCard
            label="累計客数"
            value={`${totalCustomers.toLocaleString()}人`}
            subText={`日平均: ${Math.round(avgDailyCustomers).toLocaleString()}人`}
            accent="#06b6d4"
          />
          <KpiCard
            label="客単価"
            value={`${avgTxValue.toLocaleString()}円`}
            subText={prevAvgTxValue > 0 ? `前年: ${prevAvgTxValue.toLocaleString()}円` : undefined}
            accent="#8b5cf6"
          />
          {prevTotalCustomers > 0 && (
            <KpiCard
              label="客数前年比"
              value={formatPercent(customerYoY)}
              subText={`前年: ${prevTotalCustomers.toLocaleString()}人`}
              accent={customerYoY >= 1 ? sc.positive : sc.negative}
            />
          )}
          {prevAvgTxValue > 0 && (
            <KpiCard
              label="客単価前年比"
              value={formatPercent(txValueYoY)}
              subText={`差額: ${(avgTxValue - prevAvgTxValue >= 0 ? '+' : '')}${(avgTxValue - prevAvgTxValue).toLocaleString()}円`}
              accent={txValueYoY >= 1 ? sc.positive : sc.negative}
            />
          )}
        </KpiGrid>
      )}

      {/* 曜日カラー設定 */}
      <ColorPickerRow>
        <ColorPickerTitle>曜日カラー設定:</ColorPickerTitle>
        {DOW_LABELS.map((label, i) => (
          <ColorPickerLabel key={label}>
            <ColorInput
              type="color"
              value={dowColors[i]}
              onChange={(e) => handleDowColorChange(i, e.target.value)}
            />
            {label}
          </ColorPickerLabel>
        ))}
      </ColorPickerRow>

      <ChartGrid>
        <WeeklyChart data={stackedData} dowColors={dowColors} />
        <DayOfWeekChart averages={forecast.dayOfWeekAverages} dowColors={dowColors} />
      </ChartGrid>

      {/* 店舗間比較チャート */}
      {selectedResults.length > 1 && compareMode && storeForecasts.length > 0 && (
        <ChartGrid>
          <StoreComparisonRadarChart storeForecasts={storeForecasts} />
          <StoreComparisonBarChart storeForecasts={storeForecasts} />
        </ChartGrid>
      )}

      {/* ─── 客数・客単価多角分析 ────────────────────────── */}
      {hasCustomerData && (
        <>
          <Section>
            <SectionTitle>客数・客単価 多角分析</SectionTitle>

            {/* 日別 売上・客数・客単価推移 */}
            <ChartGrid>
              <CustomerSalesScatterChart data={customerEntries} />
              <DowCustomerChart averages={dowCustomerAvg} dowColors={dowColors} />
            </ChartGrid>

            {/* 移動平均 */}
            {movingAvgData.length > 0 && (
              <ChartGrid>
                <MovingAverageChart data={movingAvgData} hasPrev={hasPrevCustomers} />
                {hasPrevCustomers && (
                  <SameDowComparisonChart
                    entries={customerEntries}
                    year={year}
                    month={month}
                    dowColors={dowColors}
                  />
                )}
              </ChartGrid>
            )}

            {/* 売上・客数・客単価の関係性推移 */}
            {relationshipData.length > 0 && (
              <>
                <ModeToggleWrapper>
                  <SectionTitle style={{ marginBottom: 0 }}>売上・客数・客単価 関係性</SectionTitle>
                  <ChipGroup>
                    <Chip $active={relViewMode === 'current'} onClick={() => setRelViewMode('current')}>
                      今年
                    </Chip>
                    {hasPrevCustomers && (
                      <Chip $active={relViewMode === 'prev'} onClick={() => setRelViewMode('prev')}>
                        前年
                      </Chip>
                    )}
                    {hasPrevCustomers && (
                      <Chip $active={relViewMode === 'compare'} onClick={() => setRelViewMode('compare')}>
                        比較
                      </Chip>
                    )}
                  </ChipGroup>
                </ModeToggleWrapper>
                <RelationshipChart
                  data={relationshipData}
                  prevData={prevRelationshipData}
                  viewMode={relViewMode}
                />
              </>
            )}
          </Section>

          {/* 曜日別客数・客単価 詳細テーブル */}
          <Section>
            <SectionTitle>曜日別 客数・客単価 詳細</SectionTitle>
            <TableWrapper>
              <Table>
                <thead>
                  <tr>
                    <Th>曜日</Th>
                    <Th>日数</Th>
                    <Th>平均客数</Th>
                    <Th>平均客単価</Th>
                    {hasPrevCustomers && <Th>前年客数</Th>}
                    {hasPrevCustomers && <Th>前年客単価</Th>}
                    {hasPrevCustomers && <Th>客数前年比</Th>}
                    {hasPrevCustomers && <Th>客単価前年比</Th>}
                  </tr>
                </thead>
                <tbody>
                  {dowCustomerAvg.map((a) => {
                    const custRatio = a.prevAvgCustomers > 0 ? a.avgCustomers / a.prevAvgCustomers : 0
                    const txRatio = a.prevAvgTxValue > 0 ? a.avgTxValue / a.prevAvgTxValue : 0
                    return (
                      <Tr key={a.dow}>
                        <Td>{a.dow}</Td>
                        <Td>{a.count}日</Td>
                        <Td>{a.avgCustomers > 0 ? `${a.avgCustomers}人` : '-'}</Td>
                        <Td>{a.avgTxValue > 0 ? `${a.avgTxValue.toLocaleString()}円` : '-'}</Td>
                        {hasPrevCustomers && <Td>{a.prevAvgCustomers > 0 ? `${a.prevAvgCustomers}人` : '-'}</Td>}
                        {hasPrevCustomers && <Td>{a.prevAvgTxValue > 0 ? `${a.prevAvgTxValue.toLocaleString()}円` : '-'}</Td>}
                        {hasPrevCustomers && (
                          <Td $highlight={custRatio > 0 && custRatio < 1}>
                            {custRatio > 0 ? formatPercent(custRatio) : '-'}
                          </Td>
                        )}
                        {hasPrevCustomers && (
                          <Td $highlight={txRatio > 0 && txRatio < 1}>
                            {txRatio > 0 ? formatPercent(txRatio) : '-'}
                          </Td>
                        )}
                      </Tr>
                    )
                  })}
                </tbody>
              </Table>
            </TableWrapper>
          </Section>
        </>
      )}

      {/* ─── 売上要因分解分析 ────────────────────────── */}
      {hasDecompData && (
        <>
          <Section>
            <SectionTitle>売上要因分解（客数×客単価 / 前年比）</SectionTitle>

            <ChartGrid>
              <DecompTrendChart data={dailyDecomp} />
              <DecompDailyBarChart data={dailyDecomp} />
            </ChartGrid>

            <ChartGrid>
              <DecompDowChart data={dowDecomp} dowColors={dowColors} />
            </ChartGrid>

            {/* 週別要因分解テーブル */}
            {weeklyDecomp.length > 0 && (
              <TableWrapper>
                <Table>
                  <thead>
                    <tr>
                      <Th>週</Th>
                      <Th>期間</Th>
                      <Th>売上差</Th>
                      <Th>客数効果</Th>
                      <Th>客単価効果</Th>
                      <Th>客数寄与率</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeklyDecomp.map((w) => {
                      const total = Math.abs(w.custEffect) + Math.abs(w.ticketEffect)
                      const custPct = total > 0 ? w.custEffect / (w.custEffect + w.ticketEffect) : 0
                      return (
                        <Tr key={w.weekNumber}>
                          <Td>第{w.weekNumber}週</Td>
                          <Td>{w.startDay}日〜{w.endDay}日</Td>
                          <Td $highlight={w.salesDiff < 0}>{formatCurrency(w.salesDiff)}</Td>
                          <Td $highlight={w.custEffect < 0}>{formatCurrency(w.custEffect)}</Td>
                          <Td $highlight={w.ticketEffect < 0}>{formatCurrency(w.ticketEffect)}</Td>
                          <Td>{formatPercent(custPct)}</Td>
                        </Tr>
                      )
                    })}
                    {(() => {
                      const totals = weeklyDecomp.reduce(
                        (acc, w) => ({
                          salesDiff: acc.salesDiff + w.salesDiff,
                          custEffect: acc.custEffect + w.custEffect,
                          ticketEffect: acc.ticketEffect + w.ticketEffect,
                        }),
                        { salesDiff: 0, custEffect: 0, ticketEffect: 0 },
                      )
                      const totalAbs = Math.abs(totals.custEffect) + Math.abs(totals.ticketEffect)
                      const totalCustPct = totalAbs > 0 ? totals.custEffect / (totals.custEffect + totals.ticketEffect) : 0
                      return (
                        <TrTotal>
                          <Td>合計</Td>
                          <Td></Td>
                          <Td>{formatCurrency(totals.salesDiff)}</Td>
                          <Td>{formatCurrency(totals.custEffect)}</Td>
                          <Td>{formatCurrency(totals.ticketEffect)}</Td>
                          <Td>{formatPercent(totalCustPct)}</Td>
                        </TrTotal>
                      )
                    })()}
                  </tbody>
                </Table>
              </TableWrapper>
            )}
          </Section>
        </>
      )}

      <Section>
        <ModeToggleWrapper>
          <SectionTitle style={{ marginBottom: 0 }}>週別サマリー</SectionTitle>
          {selectedResults.length > 1 && (
            <ChipGroup>
              <Chip $active={!compareMode} onClick={() => setCompareMode(false)}>
                合計モード
              </Chip>
              <Chip $active={compareMode} onClick={() => setCompareMode(true)}>
                比較モード
              </Chip>
            </ChipGroup>
          )}
        </ModeToggleWrapper>

        {!compareMode ? (
          <TableWrapper>
            <Table>
              <thead>
                <tr>
                  <Th>週</Th>
                  <Th>期間</Th>
                  <Th>営業日数</Th>
                  <Th>売上合計</Th>
                  {hasCustomerData && <Th>客数</Th>}
                  {hasCustomerData && <Th>客単価</Th>}
                  <Th>粗利合計</Th>
                  <Th>粗利率</Th>
                </tr>
              </thead>
              <tbody>
                {forecast.weeklySummaries.map((w) => {
                  // Calculate weekly customer totals
                  let weekCustomers = 0
                  let weekSales = 0
                  for (let d = w.startDay; d <= w.endDay; d++) {
                    const rec = r.daily.get(d)
                    if (rec) {
                      weekCustomers += rec.customers ?? 0
                      weekSales += rec.sales
                    }
                  }
                  const weekTxValue = calculateTransactionValue(weekSales, weekCustomers)
                  return (
                    <Tr key={w.weekNumber}>
                      <Td $highlight={w === bestWeek || w === worstWeek}>
                        第{w.weekNumber}週
                      </Td>
                      <Td>{w.startDay}日〜{w.endDay}日</Td>
                      <Td>{w.days}日</Td>
                      <Td>{formatCurrency(w.totalSales)}</Td>
                      {hasCustomerData && <Td>{weekCustomers > 0 ? `${weekCustomers.toLocaleString()}人` : '-'}</Td>}
                      {hasCustomerData && <Td>{weekTxValue > 0 ? `${weekTxValue.toLocaleString()}円` : '-'}</Td>}
                      <Td>{formatCurrency(w.totalGrossProfit)}</Td>
                      <Td>{formatPercent(w.grossProfitRate)}</Td>
                    </Tr>
                  )
                })}
              </tbody>
            </Table>
          </TableWrapper>
        ) : (
          <TableWrapper>
            <Table>
              <thead>
                <tr>
                  <Th>週</Th>
                  <Th>期間</Th>
                  {storeForecasts.map((sf) => (
                    <Th key={`sales-${sf.storeId}`}>{sf.storeName} 売上</Th>
                  ))}
                  {storeForecasts.map((sf) => (
                    <Th key={`gp-${sf.storeId}`}>{sf.storeName} 粗利</Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {forecast.weeklySummaries.map((w, wi) => (
                  <Tr key={w.weekNumber}>
                    <Td>第{w.weekNumber}週</Td>
                    <Td>{w.startDay}日〜{w.endDay}日</Td>
                    {storeForecasts.map((sf) => {
                      const sw = sf.forecast.weeklySummaries[wi]
                      return (
                        <Td key={`sales-${sf.storeId}`}>
                          {sw ? formatCurrency(sw.totalSales) : '-'}
                        </Td>
                      )
                    })}
                    {storeForecasts.map((sf) => {
                      const sw = sf.forecast.weeklySummaries[wi]
                      return (
                        <Td key={`gp-${sf.storeId}`}>
                          {sw ? formatCurrency(sw.totalGrossProfit) : '-'}
                        </Td>
                      )
                    })}
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableWrapper>
        )}
      </Section>

      {forecast.anomalies.length > 0 && (
        <Section>
          <SectionTitle>異常値検出</SectionTitle>
          <Card>
            <CardTitle>統計的異常値（Z-Score &gt; 2.0）</CardTitle>
            <TableWrapper>
              <Table>
                <thead>
                  <tr>
                    <Th>日</Th>
                    <Th>売上</Th>
                    <Th>平均</Th>
                    <Th>Z-Score</Th>
                    <Th>判定</Th>
                  </tr>
                </thead>
                <tbody>
                  {forecast.anomalies.map((a) => (
                    <Tr key={a.day}>
                      <Td>{a.day}日</Td>
                      <Td>{formatCurrency(a.value)}</Td>
                      <Td>{formatCurrency(a.mean)}</Td>
                      <Td>{a.zScore.toFixed(2)}</Td>
                      <Td>
                        <AnomalyBadge $type={a.zScore > 0 ? 'high' : 'low'}>
                          {a.zScore > 0 ? '高売上' : '低売上'}
                        </AnomalyBadge>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </TableWrapper>
          </Card>
        </Section>
      )}
    </MainContent>
  )
}
