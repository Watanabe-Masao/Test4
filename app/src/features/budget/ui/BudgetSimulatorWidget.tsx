/**
 * 予算達成シミュレーター Widget — entrypoint
 *
 * reboot plan Phase E 以降:
 *   widget は `useBudgetSimulatorWidgetPlan` に取得経路を委譲し、
 *   結果を `BudgetSimulatorView` に渡すだけの薄い connector に徹する。
 *   drill (UI 開閉) state / day detail modal state だけは widget 側で保持する。
 *
 * @responsibility R:widget
 */
import { useMemo, useState } from 'react'
import type { UnifiedWidgetContext } from '@/presentation/components/widgets'
import { DayDetailModal } from '@/presentation/components/day-detail'
import { useBudgetSimulatorWidgetPlan } from '../application/useBudgetSimulatorWidgetPlan'
import { buildDayDetailModalProps } from '../application/buildDayDetailModalProps'
import { buildWeatherIconMaps } from '../application/buildWeatherIconMaps'
import { BudgetSimulatorView } from './BudgetSimulatorView'
import type { DrillKey } from './BudgetSimulatorWidget.vm'

interface Props {
  readonly ctx: UnifiedWidgetContext
}

export function BudgetSimulatorWidget({ ctx }: Props) {
  const plan = useBudgetSimulatorWidgetPlan(ctx)
  const [drill, setDrill] = useState<DrillKey | null>(null)
  const toggleDrill = (key: DrillKey) => setDrill((prev) => (prev === key ? null : key))

  // 日別詳細モーダル (Dashboard 由来のモーダルを ①②③④ カレンダーから起動)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const modalProps =
    selectedDay != null ? buildDayDetailModalProps(ctx, plan.scenario, selectedDay) : null

  const weatherIcons = useMemo(
    () => buildWeatherIconMaps(ctx.weatherDaily, ctx.prevYearWeatherDaily),
    [ctx.weatherDaily, ctx.prevYearWeatherDaily],
  )

  return (
    <>
      <BudgetSimulatorView
        scenario={plan.scenario}
        state={plan.state}
        vm={plan.vm}
        fmtCurrency={plan.fmtCurrency}
        drill={drill}
        onToggleDrill={toggleDrill}
        onDayClick={setSelectedDay}
        weatherIcons={weatherIcons}
      />
      {modalProps != null && (
        <DayDetailModal {...modalProps} onClose={() => setSelectedDay(null)} />
      )}
    </>
  )
}
