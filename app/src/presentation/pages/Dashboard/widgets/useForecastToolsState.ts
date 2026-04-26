import { useState } from 'react'
import type { DashboardWidgetContext } from './DashboardWidgetContext'
import {
  deriveBaseValues,
  salesSliderRange,
  goalSalesSliderRange,
  computeTool1,
  computeTool2,
  getObsWarning,
  stepPercent,
  type ForecastBaseValues,
  type SliderRange,
  type Tool1Results,
  type Tool2Results,
} from './forecastToolsLogic'

// ─── Return type ────────────────────────────────────────

export interface ForecastToolsState {
  // Base values
  readonly base: ForecastBaseValues
  readonly obsWarning: string | null

  // Tool 1 slider state
  readonly salesLanding: number
  readonly setSalesLanding: (v: number) => void
  readonly salesRange: SliderRange
  readonly remainGPRate: number
  readonly setRemainGPRate: (v: number) => void
  readonly resetSalesLanding: () => void
  readonly resetRemainGPRate: () => void
  readonly stepSalesLanding: (direction: -1 | 1) => void
  readonly stepRemainGPRate: (direction: -1 | 1) => void
  readonly tool1: Tool1Results

  // Tool 2 slider state
  readonly targetMonthlySales: number
  readonly setTargetMonthlySales: (v: number) => void
  readonly goalSalesRange: SliderRange
  readonly targetGPRate: number
  readonly setTargetGPRate: (v: number) => void
  readonly resetTargetMonthlySales: () => void
  readonly resetTargetGPRate: () => void
  readonly stepTargetMonthlySales: (direction: -1 | 1) => void
  readonly stepTargetGPRate: (direction: -1 | 1) => void
  readonly tool2: Tool2Results
}

// ─── Hook ───────────────────────────────────────────────

/**
 * SP-B ADR-B-002: useForecastToolsState は ctx の subset (result / prevYear /
 * observationStatus) のみ参照するため Pick で narrow。ForecastToolsWidget も
 * 同じ subset を受け取るため整合する。
 */
export type ForecastToolsCtx = Pick<
  DashboardWidgetContext,
  'result' | 'prevYear' | 'observationStatus'
>

export function useForecastToolsState(ctx: ForecastToolsCtx): ForecastToolsState {
  const { result: r, prevYear } = ctx
  const base = deriveBaseValues(r, prevYear)

  const salesRange = salesSliderRange(base.actualSales, base.defaultSalesLanding)

  const [salesLanding, setSalesLanding] = useState(base.defaultSalesLanding)
  const [remainGPRate, setRemainGPRate] = useState(Math.round(base.defaultRemainGPRate * 1000) / 10)

  const remainGPRateDecimal = remainGPRate / 100
  const tool1 = computeTool1(salesLanding, remainGPRateDecimal, base)

  // Tool 2
  const defaultTargetMonthlySales = Math.round(r.projectedSales)
  const goalSalesRange = goalSalesSliderRange(base.actualSales, defaultTargetMonthlySales)

  const [targetMonthlySales, setTargetMonthlySales] = useState(defaultTargetMonthlySales)
  const [targetGPRate, setTargetGPRate] = useState(Math.round(base.defaultTargetGPRate * 1000) / 10)

  const targetGPRateDecimal = targetGPRate / 100
  const tool2 = computeTool2(
    targetMonthlySales,
    targetGPRateDecimal,
    defaultTargetMonthlySales,
    r,
    base,
  )

  const obsWarning = getObsWarning(ctx.observationStatus)

  return {
    base,
    obsWarning,

    // Tool 1
    salesLanding,
    setSalesLanding,
    salesRange,
    remainGPRate,
    setRemainGPRate,
    resetSalesLanding: () => setSalesLanding(base.defaultSalesLanding),
    resetRemainGPRate: () => setRemainGPRate(Math.round(base.defaultRemainGPRate * 1000) / 10),
    stepSalesLanding: (dir) =>
      setSalesLanding(
        Math.max(salesRange.min, Math.min(salesRange.max, salesLanding + dir * salesRange.step)),
      ),
    stepRemainGPRate: (dir) => setRemainGPRate(stepPercent(remainGPRate, dir * 0.1, 10, 40)),
    tool1,

    // Tool 2
    targetMonthlySales,
    setTargetMonthlySales,
    goalSalesRange,
    targetGPRate,
    setTargetGPRate,
    resetTargetMonthlySales: () => setTargetMonthlySales(defaultTargetMonthlySales),
    resetTargetGPRate: () => setTargetGPRate(Math.round(base.defaultTargetGPRate * 1000) / 10),
    stepTargetMonthlySales: (dir) =>
      setTargetMonthlySales(
        Math.max(
          goalSalesRange.min,
          Math.min(goalSalesRange.max, targetMonthlySales + dir * goalSalesRange.step),
        ),
      ),
    stepTargetGPRate: (dir) => setTargetGPRate(stepPercent(targetGPRate, dir * 0.1, 10, 40)),
    tool2,
  }
}
