import {
  Card,
  CardTitle,
  KpiCard,
  KpiGrid,
  Chip,
  ChipGroup,
  ChartErrorBoundary,
} from '@/presentation/components/common'
import type { MetricId, StoreResult } from '@/domain/models'
import { CurrencyUnitToggle } from '@/presentation/components/charts'
import { useCurrencyFormat } from '@/presentation/components/charts/chartTheme'
import { sc } from '@/presentation/theme/semanticColors'
import { palette } from '@/presentation/theme/tokens'
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
import type { InsightData } from './useInsightData'
import {
  Section,
  SectionTitle,
  ChartGrid,
  EmptyState,
  ModeToggleWrapper,
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

interface ForecastTabProps {
  readonly d: InsightData
  readonly r: StoreResult
  readonly onExplain: (metricId: MetricId) => void
}

export function ForecastTabContent({ d, r, onExplain }: ForecastTabProps) {
  const { format: fmtCurrency } = useCurrencyFormat()
  if (!d.forecastData) return null

  return (
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
          onClick={() => onExplain('salesTotal')}
        />
        <KpiCard
          label="日平均売上"
          value={d.fmtCurrency(r.averageDailySales)}
          accent={sc.positive}
          onClick={() => onExplain('salesTotal')}
        />
        <KpiCard
          label="月末予測売上"
          value={d.fmtCurrency(r.projectedSales)}
          subText={`達成率予測: ${d.formatPercent(r.projectedAchievement)}`}
          accent={palette.infoDark}
          onClick={() => onExplain('projectedSales')}
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
            value={`${fmtCurrency(d.totalCustomers)}人`}
            subText={`日平均: ${fmtCurrency(d.avgDailyCustomers)}人`}
            accent={palette.cyanDark}
            onClick={() => onExplain('totalCustomers')}
          />
          <KpiCard
            label="客単価"
            value={`${d.avgTxValue.toLocaleString()}円`}
            subText={
              d.prevAvgTxValue > 0 ? `比較期: ${d.prevAvgTxValue.toLocaleString()}円` : undefined
            }
            accent={palette.purpleDark}
          />
          {d.prevTotalCustomers > 0 && (
            <KpiCard
              label="客数比較期比"
              value={d.formatPercent(d.customerYoY)}
              subText={`比較期: ${d.prevTotalCustomers.toLocaleString()}人`}
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

      <ChartErrorBoundary>
        <ChartGrid>
          <WeeklyChart data={d.forecastData.stackedData} dowColors={d.dowColors} />
          <DayOfWeekChart
            averages={d.forecastData.forecast.dayOfWeekAverages}
            dowColors={d.dowColors}
          />
        </ChartGrid>
      </ChartErrorBoundary>

      {/* 店舗間比較 */}
      {d.selectedResults.length > 1 && d.compareMode && d.storeForecasts.length > 0 && (
        <ChartErrorBoundary>
          <ChartGrid>
            <StoreComparisonRadarChart storeForecasts={d.storeForecasts} />
            <StoreComparisonBarChart storeForecasts={d.storeForecasts} />
          </ChartGrid>
        </ChartErrorBoundary>
      )}

      {/* 客数・客単価 多角分析 */}
      {d.customerData?.hasCustomerData && (
        <Section>
          <SectionTitle>客数・客単価 多角分析</SectionTitle>
          <ChartErrorBoundary>
            <ChartGrid>
              <CustomerSalesScatterChart data={d.customerData.customerEntries} />
              <DowCustomerChart averages={d.customerData.dowCustomerAvg} dowColors={d.dowColors} />
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
                  <SectionTitle style={{ marginBottom: 0 }}>売上・客数・客単価 関係性</SectionTitle>
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
          </ChartErrorBoundary>
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
                      <FcTd>{d.fmtCurrency(w.totalSales)}</FcTd>
                      {d.customerData?.hasCustomerData && (
                        <FcTd>
                          {weekCustomers > 0 ? `${weekCustomers.toLocaleString()}人` : '-'}
                        </FcTd>
                      )}
                      {d.customerData?.hasCustomerData && (
                        <FcTd>{weekTxValue > 0 ? `${weekTxValue.toLocaleString()}円` : '-'}</FcTd>
                      )}
                      <FcTd>{d.fmtCurrency(w.totalGrossProfit)}</FcTd>
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
                          {sw ? d.fmtCurrency(sw.totalSales) : '-'}
                        </FcTd>
                      )
                    })}
                    {d.storeForecasts.map((sf) => {
                      const sw = sf.forecast.weeklySummaries[wi]
                      return (
                        <FcTd key={`g-${sf.storeId}`}>
                          {sw ? d.fmtCurrency(sw.totalGrossProfit) : '-'}
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
                      <FcTd>{d.fmtCurrency(a.value)}</FcTd>
                      <FcTd>{d.fmtCurrency(a.mean)}</FcTd>
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
  )
}

export function DecompositionTabContent({ d }: Omit<ForecastTabProps, 'onExplain' | 'r'>) {
  if (!d.customerData || !d.forecastData) return null

  return (
    <>
      {d.customerData.hasDecompData ? (
        <>
          <Section>
            <SectionTitle>売上要因分解（客数×客単価 / 比較期比）</SectionTitle>
            <ChartErrorBoundary>
              <ChartGrid>
                <DecompTrendChart data={d.customerData.dailyDecomp} />
                <DecompDailyBarChart data={d.customerData.dailyDecomp} />
              </ChartGrid>
              <ChartGrid>
                <DecompDowChart data={d.customerData.dowDecomp} dowColors={d.dowColors} />
              </ChartGrid>
            </ChartErrorBoundary>

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
                      const custPct = total > 0 ? w.custEffect / (w.custEffect + w.ticketEffect) : 0
                      return (
                        <FcTr key={w.weekNumber}>
                          <FcTd>第{w.weekNumber}週</FcTd>
                          <FcTd>
                            {w.startDay}日〜{w.endDay}日
                          </FcTd>
                          <FcTd $highlight={w.salesDiff < 0}>{d.fmtCurrency(w.salesDiff)}</FcTd>
                          <FcTd $highlight={w.custEffect < 0}>{d.fmtCurrency(w.custEffect)}</FcTd>
                          <FcTd $highlight={w.ticketEffect < 0}>
                            {d.fmtCurrency(w.ticketEffect)}
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
                      const totalAbs = Math.abs(totals.custEffect) + Math.abs(totals.ticketEffect)
                      const totalCustPct =
                        totalAbs > 0
                          ? totals.custEffect / (totals.custEffect + totals.ticketEffect)
                          : 0
                      return (
                        <FcTrTotal>
                          <FcTd>合計</FcTd>
                          <FcTd></FcTd>
                          <FcTd>{d.fmtCurrency(totals.salesDiff)}</FcTd>
                          <FcTd>{d.fmtCurrency(totals.custEffect)}</FcTd>
                          <FcTd>{d.fmtCurrency(totals.ticketEffect)}</FcTd>
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
                      {d.customerData.hasPrevCustomers && <FcTh>比較期客数</FcTh>}
                      {d.customerData.hasPrevCustomers && <FcTh>比較期客単価</FcTh>}
                      {d.customerData.hasPrevCustomers && <FcTh>客数比較期比</FcTh>}
                      {d.customerData.hasPrevCustomers && <FcTh>客単価比較期比</FcTh>}
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
                            <FcTd>{a.prevAvgCustomers > 0 ? `${a.prevAvgCustomers}人` : '-'}</FcTd>
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
        <EmptyState>比較期データがないため要因分解を表示できません</EmptyState>
      )}
    </>
  )
}
