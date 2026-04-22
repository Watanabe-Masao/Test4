/**
 * BudgetSimulator コンポーネント群の Storybook
 *
 * fixture scenario で ProjectionBarChart / StripChart / TimelineSlider /
 * RemainingInputPanel / DayCalendarInput を単体確認する。
 */
import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import type { DowBase, DowFactors, SimulatorMode } from '@/domain/calculations/budgetSimulator'
import { useCurrencyFormat } from '@/presentation/components/charts/chartTheme'
import {
  BudgetSimulatorView,
  ProjectionBarChart,
  StripChart,
  TimelineSlider,
  RemainingInputPanel,
  DayCalendarInput,
  buildSimulatorWidgetVm,
  type DrillKey,
} from '@/features/budget/ui'
import {
  DEFAULT_MOCK_SCENARIO,
  MONTH_START_MOCK_SCENARIO,
  MONTH_END_MOCK_SCENARIO,
  NO_PREV_YEAR_MOCK_SCENARIO,
} from '@/features/budget/application/mockBudgetSimulatorScenario'
import type { SimulatorStateApi } from '@/features/budget/application/useSimulatorState'
import type { SimulatorScenario } from '@/domain/calculations/budgetSimulator'

const uniform = (n: number, v: number): number[] => Array.from({ length: n }, () => v)

// reboot plan Phase B: mock scenario は共通 fixture に切り替え。
const FIXTURE_SCENARIO = DEFAULT_MOCK_SCENARIO

const meta: Meta = {
  title: 'Features/Budget/Simulator',
  parameters: { layout: 'padded' },
}
export default meta

// ── ProjectionBarChart ──

export const ProjectionBarChart_RemainingDays: StoryObj = {
  render: () => (
    <div style={{ maxWidth: '900px' }}>
      <ProjectionBarChart
        scenario={FIXTURE_SCENARIO}
        dailyProjection={uniform(15, 110_000)}
        currentDay={15}
      />
    </div>
  ),
}

export const ProjectionBarChart_MonthEnd: StoryObj = {
  name: 'ProjectionBarChart (月末到達: 空状態)',
  render: () => (
    <div style={{ maxWidth: '900px' }}>
      <ProjectionBarChart scenario={FIXTURE_SCENARIO} dailyProjection={[]} currentDay={30} />
    </div>
  ),
}

// ── StripChart ──

export const StripChart_Budget: StoryObj = {
  name: 'StripChart (budget)',
  render: () => (
    <StripChart data={FIXTURE_SCENARIO.dailyBudget} currentDay={15} variant="budget" width={220} />
  ),
}

export const StripChart_Actual_ElapsedRange: StoryObj = {
  name: 'StripChart (actual, 経過範囲ハイライト)',
  render: () => (
    <StripChart
      data={FIXTURE_SCENARIO.actualDaily}
      highlightRange={[0, 15]}
      currentDay={15}
      variant="actual"
      width={220}
    />
  ),
}

export const StripChart_Projection: StoryObj = {
  name: 'StripChart (projection)',
  render: () => (
    <StripChart data={uniform(15, 110_000)} currentDay={15} variant="projection" width={220} />
  ),
}

// ── TimelineSlider ──

export const TimelineSlider_Interactive: StoryObj = {
  name: 'TimelineSlider (interactive)',
  render: () => {
    const Demo = () => {
      const [day, setDay] = useState(15)
      return (
        <div style={{ maxWidth: '640px' }}>
          <TimelineSlider currentDay={day} daysInMonth={30} onChange={setDay} />
        </div>
      )
    }
    return <Demo />
  },
}

// ── RemainingInputPanel ──

export const RemainingInputPanel_YoY: StoryObj = {
  name: 'RemainingInputPanel (yoy)',
  render: () => {
    const Demo = () => {
      const { format: fmtCurrency } = useCurrencyFormat()
      const [yoy, setYoy] = useState(100)
      return (
        <div style={{ maxWidth: '720px' }}>
          <RemainingInputPanel
            scenario={FIXTURE_SCENARIO}
            currentDay={15}
            mode="yoy"
            yoyInput={yoy}
            achInput={100}
            dowInputs={[100, 100, 100, 100, 100, 100, 100]}
            dowBase="yoy"
            dayOverrides={{}}
            fmtCurrency={fmtCurrency}
            onYoyChange={setYoy}
            onAchChange={() => undefined}
            onDowChange={() => undefined}
            onDowBaseChange={() => undefined}
          />
        </div>
      )
    }
    return <Demo />
  },
}

export const RemainingInputPanel_Dow: StoryObj = {
  name: 'RemainingInputPanel (dow, 7 曜日係数)',
  render: () => {
    const Demo = () => {
      const { format: fmtCurrency } = useCurrencyFormat()
      const [dow, setDow] = useState<DowFactors>([110, 90, 95, 100, 105, 120, 130])
      return (
        <div style={{ maxWidth: '900px' }}>
          <RemainingInputPanel
            scenario={FIXTURE_SCENARIO}
            currentDay={15}
            mode="dow"
            yoyInput={100}
            achInput={100}
            dowInputs={dow}
            dowBase="yoy"
            dayOverrides={{}}
            fmtCurrency={fmtCurrency}
            onYoyChange={() => undefined}
            onAchChange={() => undefined}
            onDowChange={(next) => setDow(next)}
            onDowBaseChange={() => undefined}
          />
        </div>
      )
    }
    return <Demo />
  },
}

// ── DayCalendarInput ──

export const DayCalendarInput_NoOverrides: StoryObj = {
  name: 'DayCalendarInput (基本: 曜日別のみ)',
  render: () => {
    const Demo = () => {
      const [overrides, setOverrides] = useState<Record<number, number>>({})
      const { format: fmtCurrency } = useCurrencyFormat()
      return (
        <div style={{ maxWidth: '860px' }}>
          <DayCalendarInput
            scenario={FIXTURE_SCENARIO}
            currentDay={10}
            dowInputs={[110, 90, 95, 100, 105, 120, 130]}
            dowBase="yoy"
            dayOverrides={overrides}
            weekStart={1}
            fmtCurrency={fmtCurrency}
            onWeekStartChange={() => undefined}
            onOverrideChange={(day, pct) => setOverrides((p) => ({ ...p, [day]: pct }))}
            onOverrideClear={(day) =>
              setOverrides((p) => {
                if (!(day in p)) return p
                const rest = { ...p }
                delete rest[day]
                return rest
              })
            }
            onResetAll={() => setOverrides({})}
          />
        </div>
      )
    }
    return <Demo />
  },
}

// ── BudgetSimulatorView (Phase C: View を scenario + state で注入) ──

/** scenario の固定値から state / vm を組み立て View を描画する helper */
function ViewDemo({
  scenario,
  initialCurrentDay,
}: {
  readonly scenario: SimulatorScenario
  readonly initialCurrentDay: number
}) {
  const { format: fmtCurrency } = useCurrencyFormat()
  const [currentDay, setCurrentDay] = useState(initialCurrentDay)
  const [mode, setMode] = useState<SimulatorMode>('yoy')
  const [yoyInput, setYoyInput] = useState(100)
  const [achInput, setAchInput] = useState(100)
  const [dowInputs, setDowInputs] = useState<DowFactors>([100, 100, 100, 100, 100, 100, 100])
  const [dowBase, setDowBase] = useState<DowBase>('yoy')
  const [dayOverrides, setDayOverrides] = useState<Record<number, number>>({})
  const [weekStart, setWeekStart] = useState<0 | 1>(1)
  const [drill, setDrill] = useState<DrillKey | null>(null)

  const state: SimulatorStateApi = {
    currentDay,
    mode,
    yoyInput,
    achInput,
    dowInputs,
    dowBase,
    dayOverrides,
    weekStart,
    setCurrentDay,
    setMode,
    setYoyInput,
    setAchInput,
    setDowInputs,
    setDowBase,
    setDayOverride: (d, p) => setDayOverrides((prev) => ({ ...prev, [d]: p })),
    clearDayOverride: (d) =>
      setDayOverrides((prev) => {
        const next = { ...prev }
        delete next[d]
        return next
      }),
    resetDayOverrides: () => setDayOverrides({}),
    setWeekStart,
  }
  const vm = buildSimulatorWidgetVm({ scenario, state })

  return (
    <div style={{ maxWidth: '1200px' }}>
      <BudgetSimulatorView
        scenario={scenario}
        state={state}
        vm={vm}
        fmtCurrency={fmtCurrency}
        drill={drill}
        onToggleDrill={(k) => setDrill((prev) => (prev === k ? null : k))}
      />
    </div>
  )
}

export const View_MonthStart: StoryObj = {
  name: 'BudgetSimulatorView (月初 — actual なし)',
  render: () => <ViewDemo scenario={MONTH_START_MOCK_SCENARIO} initialCurrentDay={1} />,
}

export const View_MidMonth: StoryObj = {
  name: 'BudgetSimulatorView (月中 — 16 日経過)',
  render: () => <ViewDemo scenario={DEFAULT_MOCK_SCENARIO} initialCurrentDay={16} />,
}

export const View_MonthEnd: StoryObj = {
  name: 'BudgetSimulatorView (月末 — 全日経過済み)',
  render: () => <ViewDemo scenario={MONTH_END_MOCK_SCENARIO} initialCurrentDay={30} />,
}

export const View_NoPrevYear: StoryObj = {
  name: 'BudgetSimulatorView (前年データなし)',
  render: () => <ViewDemo scenario={NO_PREV_YEAR_MOCK_SCENARIO} initialCurrentDay={16} />,
}
