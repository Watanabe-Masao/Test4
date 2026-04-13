import { ChartErrorBoundary } from '@/presentation/components/common/feedback'
import { Chip, ChipGroup } from '@/presentation/components/common/forms'
import { Card, CardTitle } from '@/presentation/components/common/layout'
import { KpiCard, KpiGrid } from '@/presentation/components/common/tables'
import type { MetricId } from '@/domain/models/analysis'
import type { StoreResult } from '@/domain/models/storeTypes'
import { computeWeeklyActuals } from './InsightTabForecast.vm'
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
} from '@/presentation/pages/Forecast/ForecastCharts'
import type { InsightData } from '@/presentation/pages/Insight/useInsightData'
import {
  Section,
  SectionTitle,
  ChartGrid,
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
} from '@/presentation/pages/Insight/InsightPage.styles'

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
                  const wa = computeWeeklyActuals(w.startDay, w.endDay, r.daily)
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
                        <FcTd>{wa.customers > 0 ? `${wa.customers.toLocaleString()}人` : '-'}</FcTd>
                      )}
                      {d.customerData?.hasCustomerData && (
                        <FcTd>{wa.txValue > 0 ? `${wa.txValue.toLocaleString()}円` : '-'}</FcTd>
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
