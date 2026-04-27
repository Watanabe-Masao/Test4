/**
 * @responsibility R:unclassified
 */

import { memo, useState, useMemo } from 'react'
import { formatPercent } from '@/domain/formatting'
import type { DashboardWidgetContext } from './DashboardWidgetContext'
import {
  buildGpRatesFromReadModels,
  buildHeatmapFromStoreResults,
  type StoreHeatRow,
} from './GrossProfitHeatmap.vm'
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

export function rateToColor(
  rate: number,
  target: number,
  warning: number,
): { bg: string; text: string } {
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
export function deviationToColor(dev: number): { bg: string; text: string } {
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

/** SP-B ADR-B-002: full ctx passthrough を絞り込み props 化 */
export type GrossProfitHeatmapWidgetProps = Pick<
  DashboardWidgetContext,
  'allStoreResults' | 'stores' | 'daysInMonth' | 'targetRate' | 'warningRate' | 'readModels'
>

function buildStoreHeatRows(
  allStoreResults: GrossProfitHeatmapWidgetProps['allStoreResults'],
  stores: GrossProfitHeatmapWidgetProps['stores'],
  daysInMonth: number,
  readModels: GrossProfitHeatmapWidgetProps['readModels'],
): readonly StoreHeatRow[] {
  if (!allStoreResults) return []

  if (readModels?.salesFact?.status === 'ready' && readModels?.purchaseCost?.status === 'ready') {
    const gpRows = buildGpRatesFromReadModels(
      readModels.salesFact.data,
      readModels.purchaseCost.data,
      stores,
      daysInMonth,
    )
    const budgetRows = buildHeatmapFromStoreResults(allStoreResults, stores, daysInMonth)
    const budgetMap = new Map(budgetRows.map((r) => [r.id, r.dailyBudgetDev]))
    return gpRows.map((r) => ({
      ...r,
      dailyBudgetDev: budgetMap.get(r.id) ?? new Map(),
    }))
  }

  return buildHeatmapFromStoreResults(allStoreResults, stores, daysInMonth)
}

export const GrossProfitHeatmapWidget = memo(function GrossProfitHeatmapWidget({
  allStoreResults,
  stores,
  daysInMonth,
  targetRate,
  warningRate,
  readModels,
}: GrossProfitHeatmapWidgetProps) {
  const [mode, setMode] = useState<HeatMode>('gpRate')

  // readModels から粗利率を構築（available 時）、StoreResult をフォールバック
  const storeRows: readonly StoreHeatRow[] = useMemo(
    () => buildStoreHeatRows(allStoreResults, stores, daysInMonth, readModels),
    [allStoreResults, stores, daysInMonth, readModels],
  )

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
