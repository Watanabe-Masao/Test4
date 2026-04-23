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
import { DayDetailModal, PeriodDetailModal } from '@/presentation/components/day-detail'
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

  // 詳細モーダルターゲット: day=単日 / period=期間集計 (カレンダーから起動)。
  // 単一 state で切り分けることで R:widget 上限 (≤3) を守る。
  type ModalTarget =
    | { readonly kind: 'day'; readonly day: number }
    | {
        readonly kind: 'period'
        readonly title: string
        readonly days: readonly number[]
      }
  const [modalTarget, setModalTarget] = useState<ModalTarget | null>(null)
  const modalProps =
    modalTarget?.kind === 'day'
      ? buildDayDetailModalProps(ctx, plan.scenario, modalTarget.day)
      : null

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
        onDayClick={(day) => setModalTarget({ kind: 'day', day })}
        onPeriodClick={(info) => setModalTarget({ kind: 'period', ...info })}
        weatherIcons={weatherIcons}
      />
      {modalProps != null && (
        <DayDetailModal {...modalProps} onClose={() => setModalTarget(null)} />
      )}
      {modalTarget?.kind === 'period' && (
        <PeriodDetailModal
          title={modalTarget.title}
          days={modalTarget.days}
          scenario={plan.scenario}
          currentDay={plan.vm.kpis.currentDay}
          onClose={() => setModalTarget(null)}
        />
      )}
    </>
  )
}
