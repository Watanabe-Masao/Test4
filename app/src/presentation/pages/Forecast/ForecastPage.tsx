import { useState } from 'react'
import { MainContent } from '@/presentation/components/Layout'
import { Card, CardTitle, KpiCard, KpiGrid, Chip, ChipGroup } from '@/presentation/components/common'
import { useCalculation, useStoreSelection } from '@/application/hooks'
import { calculateForecast } from '@/domain/calculations/forecast'
import { formatCurrency, formatPercent } from '@/domain/calculations/utils'
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
  AnomalyBadge,
} from './ForecastPage.styles'
import { DOW_LABELS, DEFAULT_DOW_COLORS, buildForecastInput, computeStackedWeekData } from './ForecastPage.helpers'
import { WeeklyChart, DayOfWeekChart, StoreComparisonRadarChart, StoreComparisonBarChart } from './ForecastCharts'

export function ForecastPage() {
  const { isCalculated } = useCalculation()
  const { currentResult, selectedResults, storeName, stores } = useStoreSelection()
  const [compareMode, setCompareMode] = useState(false)
  const [dowColors, setDowColors] = useState<string[]>([...DEFAULT_DOW_COLORS])

  if (!isCalculated || !currentResult) {
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

  const handleDowColorChange = (index: number, color: string) => {
    setDowColors((prev) => {
      const next = [...prev]
      next[index] = color
      return next
    })
  }

  return (
    <MainContent title="予測分析" storeName={storeName}>
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
          accent="#22c55e"
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
          accent={forecast.anomalies.length > 0 ? '#f59e0b' : '#22c55e'}
        />
      </KpiGrid>

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
                  <Th>粗利合計</Th>
                  <Th>粗利率</Th>
                </tr>
              </thead>
              <tbody>
                {forecast.weeklySummaries.map((w) => (
                  <Tr key={w.weekNumber}>
                    <Td $highlight={w === bestWeek || w === worstWeek}>
                      第{w.weekNumber}週
                    </Td>
                    <Td>{w.startDay}日〜{w.endDay}日</Td>
                    <Td>{w.days}日</Td>
                    <Td>{formatCurrency(w.totalSales)}</Td>
                    <Td>{formatCurrency(w.totalGrossProfit)}</Td>
                    <Td>{formatPercent(w.grossProfitRate)}</Td>
                  </Tr>
                ))}
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
