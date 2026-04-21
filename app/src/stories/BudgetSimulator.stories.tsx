/**
 * BudgetSimulator コンポーネント群の Storybook
 *
 * fixture scenario で ProjectionBarChart / StripChart / TimelineSlider /
 * RemainingInputPanel / DayCalendarInput を単体確認する。
 */
import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import type { DowFactors, SimulatorScenario } from '@/domain/calculations/budgetSimulator'
import { useCurrencyFormat } from '@/presentation/components/charts/chartTheme'
import {
  ProjectionBarChart,
  StripChart,
  TimelineSlider,
  RemainingInputPanel,
  DayCalendarInput,
} from '@/features/budget/ui'

const uniform = (n: number, v: number): number[] => Array.from({ length: n }, () => v)

const FIXTURE_SCENARIO: SimulatorScenario = {
  year: 2026,
  month: 4,
  daysInMonth: 30,
  monthlyBudget: 3_000_000,
  lyMonthly: 2_400_000,
  dailyBudget: uniform(30, 100_000),
  lyDaily: uniform(30, 80_000),
  actualDaily: uniform(15, 95_000).concat(uniform(15, 0)),
  lyCoverageDay: null,
}

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
