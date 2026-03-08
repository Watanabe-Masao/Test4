import { memo, useState } from 'react'
import { formatPercent } from '@/domain/formatting'
import type { WidgetContext } from './types'
import {
  Wrapper,
  TitleRow,
  Title,
  ToggleGroup,
  Toggle,
  HeatTable,
  HeatTh,
  HeatThStore,
  HeatTd,
  HeatTdStore,
  EmptyCell,
  Legend,
  LegendSwatch,
} from './GrossProfitHeatmap.styles'

// ─── Types ──────────────────────────────────────────────

type HeatMode = 'gpRate' | 'budgetDev'

// ─── Color Logic ────────────────────────────────────────

function rateToColor(rate: number, target: number, warning: number): { bg: string; text: string } {
  if (rate >= target) {
    const intensity = Math.min((rate - target) / 0.05, 1)
    const alpha = 0.25 + intensity * 0.35
    return { bg: `rgba(34, 197, 94, ${alpha})`, text: alpha > 0.4 ? '#fff' : '#166534' }
  }
  if (rate >= warning) {
    const intensity = (rate - warning) / (target - warning)
    const alpha = 0.2 + (1 - intensity) * 0.3
    return { bg: `rgba(234, 179, 8, ${alpha})`, text: '#854d0e' }
  }
  const intensity = Math.min((warning - rate) / 0.05, 1)
  const alpha = 0.25 + intensity * 0.35
  return { bg: `rgba(239, 68, 68, ${alpha})`, text: alpha > 0.4 ? '#fff' : '#991b1b' }
}

/** 予算乖離率 → 色。0%=白、+方向=青(良好)、-方向=赤(未達) */
function deviationToColor(dev: number): { bg: string; text: string } {
  if (dev >= 0) {
    // Over budget (good): blue
    const intensity = Math.min(dev / 0.15, 1)
    const alpha = 0.15 + intensity * 0.45
    return { bg: `rgba(59, 130, 246, ${alpha})`, text: alpha > 0.4 ? '#fff' : '#1e40af' }
  }
  // Under budget (bad): red
  const intensity = Math.min(Math.abs(dev) / 0.15, 1)
  const alpha = 0.15 + intensity * 0.45
  return { bg: `rgba(239, 68, 68, ${alpha})`, text: alpha > 0.4 ? '#fff' : '#991b1b' }
}

// ─── Component ──────────────────────────────────────────

export const GrossProfitHeatmapWidget = memo(function GrossProfitHeatmapWidget({
  ctx,
}: {
  ctx: WidgetContext
}) {
  const { allStoreResults, stores, daysInMonth, targetRate, warningRate } = ctx
  const [mode, setMode] = useState<HeatMode>('gpRate')

  // Build store data rows
  const storeRows: {
    id: string
    name: string
    dailyRates: Map<number, number>
    dailyBudgetDev: Map<number, number>
  }[] = []

  for (const [storeId, result] of allStoreResults) {
    const store = stores.get(storeId)
    const name = store?.name ?? storeId
    const dailyRates = new Map<number, number>()
    const dailyBudgetDev = new Map<number, number>()

    // Calculate cumulative GP rate up to each day
    let cumSales = 0
    let cumCost = 0
    for (let d = 1; d <= daysInMonth; d++) {
      const rec = result.daily.get(d)
      if (rec) {
        cumSales += rec.sales
        cumCost += rec.totalCost
        if (cumSales > 0) {
          dailyRates.set(d, (cumSales - cumCost) / cumSales)
        }
      }

      // Budget deviation: (cumSales - cumBudget) / cumBudget
      const cumEntry = result.dailyCumulative.get(d)
      if (cumEntry && cumEntry.budget > 0 && cumEntry.sales > 0) {
        dailyBudgetDev.set(d, (cumEntry.sales - cumEntry.budget) / cumEntry.budget)
      }
    }
    storeRows.push({ id: storeId, name, dailyRates, dailyBudgetDev })
  }

  if (storeRows.length === 0) return null

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  return (
    <Wrapper>
      <TitleRow>
        <Title>
          {mode === 'gpRate'
            ? '店舗別 粗利率ヒートマップ（累計）'
            : '店舗別 予算乖離ヒートマップ（累計）'}
        </Title>
        <ToggleGroup>
          <Toggle $active={mode === 'gpRate'} onClick={() => setMode('gpRate')}>
            粗利率
          </Toggle>
          <Toggle $active={mode === 'budgetDev'} onClick={() => setMode('budgetDev')}>
            予算乖離
          </Toggle>
        </ToggleGroup>
      </TitleRow>
      <HeatTable>
        <thead>
          <tr>
            <HeatThStore>店舗</HeatThStore>
            {days.map((d) => (
              <HeatTh key={d}>{d}</HeatTh>
            ))}
          </tr>
        </thead>
        <tbody>
          {storeRows.map((row) => (
            <tr key={row.id}>
              <HeatTdStore>{row.name}</HeatTdStore>
              {days.map((d) => {
                if (mode === 'gpRate') {
                  const rate = row.dailyRates.get(d)
                  if (rate == null) return <EmptyCell key={d} />
                  const { bg, text } = rateToColor(rate, targetRate, warningRate)
                  return (
                    <HeatTd
                      key={d}
                      $bg={bg}
                      $textColor={text}
                      title={`${row.name} ${d}日: ${formatPercent(rate)}`}
                    >
                      {formatPercent(rate).replace('%', '')}
                    </HeatTd>
                  )
                }
                // budgetDev mode
                const dev = row.dailyBudgetDev.get(d)
                if (dev == null) return <EmptyCell key={d} />
                const { bg, text } = deviationToColor(dev)
                const sign = dev >= 0 ? '+' : ''
                return (
                  <HeatTd
                    key={d}
                    $bg={bg}
                    $textColor={text}
                    title={`${row.name} ${d}日: ${sign}${formatPercent(Math.abs(dev), 1)}`}
                  >
                    {sign}
                    {formatPercent(Math.abs(dev), 1).replace('%', '')}
                  </HeatTd>
                )
              })}
            </tr>
          ))}
        </tbody>
      </HeatTable>
      {mode === 'gpRate' ? (
        <Legend>
          <LegendSwatch $bg="rgba(239, 68, 68, 0.5)" />
          <span>低 (&lt;{formatPercent(warningRate, 0)})</span>
          <LegendSwatch $bg="rgba(234, 179, 8, 0.4)" />
          <span>
            注意 ({formatPercent(warningRate, 0)}〜{formatPercent(targetRate, 0)})
          </span>
          <LegendSwatch $bg="rgba(34, 197, 94, 0.5)" />
          <span>良好 (&ge;{formatPercent(targetRate, 0)})</span>
        </Legend>
      ) : (
        <Legend>
          <LegendSwatch $bg="rgba(239, 68, 68, 0.5)" />
          <span>未達 (-15%以上)</span>
          <LegendSwatch $bg="rgba(239, 68, 68, 0.2)" />
          <span>やや未達</span>
          <LegendSwatch $bg="rgba(59, 130, 246, 0.2)" />
          <span>やや超過</span>
          <LegendSwatch $bg="rgba(59, 130, 246, 0.5)" />
          <span>超過 (+15%以上)</span>
        </Legend>
      )}
    </Wrapper>
  )
})
