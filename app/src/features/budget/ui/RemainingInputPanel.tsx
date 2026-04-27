/**
 * RemainingInputPanel — 残期間シミュレーションの入力パネル
 *
 * プロトタイプ c-sim-input-body / c-dow-body 相当。
 * - yoy/ach: 数値入力 + range (50-150) + 4 プリセットボタン
 * - dow: 基準トグル + プリセット + 7 曜日 grid + DayCalendar (親が追加)
 *
 * @responsibility R:unclassified
 */
import { useMemo, useState } from 'react'
import type {
  DowBase,
  DowFactors,
  SimulatorMode,
  SimulatorScenario,
} from '@/domain/calculations/budgetSimulator'
import { dowOf } from '@/domain/calculations/budgetSimulator'
import type { UnifiedWidgetContext } from '@/presentation/components/widgets'
import {
  DowBaseLabel,
  DowBaseRow,
  DowCol,
  DowColCount,
  DowColMoney,
  DowColName,
  DowColValInput,
  DowColValRow,
  DowGridCols,
  DowGridPanel,
  DowPresetBtn,
  NumInputField,
  NumInputGroup,
  NumRangeSlider,
  PresetBtn,
  PresetsRow,
  SimInputBody,
} from './BudgetSimulatorWidget.styles'

type Fmt = UnifiedWidgetContext['fmtCurrency']

const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const
// プロトタイプ準拠: 月火水木金土日 の順で表示
const DOW_ORDER: readonly number[] = [1, 2, 3, 4, 5, 6, 0]

interface Props {
  readonly scenario: SimulatorScenario
  readonly currentDay: number
  readonly mode: SimulatorMode
  readonly yoyInput: number
  readonly achInput: number
  readonly dowInputs: DowFactors
  readonly dowBase: DowBase
  readonly dayOverrides: Readonly<Record<number, number>>
  readonly fmtCurrency: Fmt
  readonly onYoyChange: (n: number) => void
  readonly onAchChange: (n: number) => void
  readonly onDowChange: (inputs: DowFactors) => void
  readonly onDowBaseChange: (b: DowBase) => void
}

// 仕様書準拠: yoy/ach 共通で 95/100/105/110 の 4 プリセット
const PRESETS = [
  { lbl: '95%', v: 95 },
  { lbl: '100%', v: 100 },
  { lbl: '105%', v: 105 },
  { lbl: '110%', v: 110 },
] as const

/**
 * % 入力の raw string 管理 (仕様書 §07 「0 入力の扱い」)。
 *
 * - フォーカス中は「空文字」「0」「3.」「-」等の中間状態を保持
 * - onBlur 時に Number() → 正規化 (NaN → 0、上下限 clamp)
 * - 外部から value prop が変わったら同期 (プリセットボタン / プリセット適用時)
 *
 * 「バックスペースで 0 にしたい」「3.2 を 3. まで消して打ち直し」が自然に動く。
 */
function useRawNumericInput(
  value: number,
  onChange: (n: number) => void,
  options?: { readonly min?: number; readonly max?: number },
) {
  // focus 中は raw を保持、blur/非 focus 時は value を表示に derive。
  // これにより useEffect による cascading render を回避する。
  const [draft, setDraft] = useState<string | null>(null)
  const raw = draft ?? String(value)

  const handleChange = (next: string) => {
    setDraft(next)
    if (next === '' || next === '-' || next.endsWith('.')) return
    const n = Number(next)
    if (Number.isFinite(n)) onChange(n)
  }

  const handleBlur = () => {
    let n = Number(draft ?? value)
    if (!Number.isFinite(n) || draft === '') n = 0
    if (options?.min != null && n < options.min) n = options.min
    if (options?.max != null && n > options.max) n = options.max
    setDraft(null)
    onChange(n)
  }

  const handleFocus = () => setDraft(String(value))

  return { raw, handleChange, handleBlur, handleFocus }
}

export function RemainingInputPanel(props: Props) {
  const {
    scenario,
    currentDay,
    mode,
    yoyInput,
    achInput,
    dowInputs,
    dowBase,
    dayOverrides,
    fmtCurrency,
    onYoyChange,
    onAchChange,
    onDowChange,
    onDowBaseChange,
  } = props

  if (mode !== 'dow') {
    return (
      <SingleModeInput
        mode={mode}
        yoyInput={yoyInput}
        achInput={achInput}
        onYoyChange={onYoyChange}
        onAchChange={onAchChange}
      />
    )
  }
  // dow mode fallthrough handled below

  // dow mode
  return (
    <DowInputGrid
      scenario={scenario}
      currentDay={currentDay}
      dowInputs={dowInputs}
      dowBase={dowBase}
      dayOverrides={dayOverrides}
      fmtCurrency={fmtCurrency}
      onDowChange={onDowChange}
      onDowBaseChange={onDowBaseChange}
    />
  )
}

// ── 単一モード (yoy / ach) の入力 ──
// 仕様書 §07 「0 入力の扱い」準拠: raw string を focus 中に保持し、
// blur で正規化 (0〜200 に clamp)。
function SingleModeInput({
  mode,
  yoyInput,
  achInput,
  onYoyChange,
  onAchChange,
}: {
  readonly mode: 'yoy' | 'ach'
  readonly yoyInput: number
  readonly achInput: number
  readonly onYoyChange: (n: number) => void
  readonly onAchChange: (n: number) => void
}) {
  const curInput = mode === 'yoy' ? yoyInput : achInput
  const setCur = mode === 'yoy' ? onYoyChange : onAchChange

  const { raw, handleChange, handleBlur, handleFocus } = useRawNumericInput(curInput, setCur, {
    min: 0,
    max: 200,
  })

  return (
    <SimInputBody>
      <NumInputGroup>
        <NumInputField
          type="number"
          min={0}
          max={200}
          step={0.1}
          value={raw}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        <span className="u">%</span>
      </NumInputGroup>
      <NumRangeSlider
        type="range"
        min={0}
        max={200}
        step={0.1}
        value={curInput}
        onChange={(e) => setCur(Number(e.target.value))}
      />
      <PresetsRow>
        {PRESETS.map((p) => (
          <PresetBtn
            key={p.v}
            type="button"
            $active={Math.abs(curInput - p.v) < 0.1}
            onClick={() => setCur(p.v)}
          >
            <span className="pl">{p.lbl}</span>
            <span className="pv">{p.v}%</span>
          </PresetBtn>
        ))}
      </PresetsRow>
    </SimInputBody>
  )
}

interface DowInputGridProps {
  readonly scenario: SimulatorScenario
  readonly currentDay: number
  readonly dowInputs: DowFactors
  readonly dowBase: DowBase
  readonly dayOverrides: Readonly<Record<number, number>>
  readonly fmtCurrency: Fmt
  readonly onDowChange: (inputs: DowFactors) => void
  readonly onDowBaseChange: (b: DowBase) => void
}

function DowInputGrid({
  scenario,
  currentDay,
  dowInputs,
  dowBase,
  dayOverrides,
  fmtCurrency,
  onDowChange,
  onDowBaseChange,
}: DowInputGridProps) {
  const baseSeries = dowBase === 'yoy' ? scenario.lyDaily : scenario.dailyBudget

  // 各曜日の残期間 baseSum / effectiveSum / override count を計算
  const dowStats = useMemo(() => {
    const stats: Record<
      number,
      { count: number; overCount: number; baseSum: number; effectiveSum: number }
    > = {}
    for (let dw = 0; dw < 7; dw++) {
      stats[dw] = { count: 0, overCount: 0, baseSum: 0, effectiveSum: 0 }
    }
    for (let d = currentDay; d < scenario.daysInMonth; d++) {
      const dayNum = d + 1
      const dw = dowOf(scenario.year, scenario.month, dayNum)
      const override = dayOverrides[dayNum]
      const pct = override != null ? override : dowInputs[dw]
      stats[dw].count++
      stats[dw].baseSum += baseSeries[d] ?? 0
      stats[dw].effectiveSum += (baseSeries[d] ?? 0) * (pct / 100)
      if (override != null) stats[dw].overCount++
    }
    return stats
  }, [scenario, currentDay, dowInputs, dayOverrides, baseSeries])

  /**
   * 実績曜日平均から dow% を自動入力する。
   *
   * @param source どの基準で自動入力するか
   *   - 'yoy': 実績 / 前年 × 100 (前年比ベース)
   *   - 'ach': 実績 / 予算 × 100 (達成率ベース)
   *   - 'amount': 現在の dowBase (= baseSeries) に対する実績比率。
   *     表示上の「¥base → ¥effective」の effective が実績平均額と一致する
   */
  const autoFromActual = (source: 'yoy' | 'ach' | 'amount') => {
    const actual = scenario.actualDaily
    const compareSeries =
      source === 'yoy' ? scenario.lyDaily : source === 'ach' ? scenario.dailyBudget : baseSeries
    const next: [number, number, number, number, number, number, number] = [
      100, 100, 100, 100, 100, 100, 100,
    ]
    for (let dw = 0; dw < 7; dw++) {
      let actualSum = 0
      let baseSum = 0
      for (let d = 0; d < currentDay; d++) {
        if (dowOf(scenario.year, scenario.month, d + 1) === dw) {
          actualSum += actual[d] ?? 0
          baseSum += compareSeries[d] ?? 0
        }
      }
      if (baseSum > 0) next[dw] = (actualSum / baseSum) * 100
    }
    onDowChange(next)
  }

  const resetAll = () => onDowChange([100, 100, 100, 100, 100, 100, 100])

  const setDow = (dw: number, v: number) => {
    const next = [...dowInputs] as [number, number, number, number, number, number, number]
    next[dw] = v
    onDowChange(next)
  }

  return (
    <DowGridPanel>
      <DowBaseRow>
        <DowBaseLabel>基準:</DowBaseLabel>
        <PresetsRow>
          <PresetBtn
            type="button"
            $active={dowBase === 'yoy'}
            onClick={() => onDowBaseChange('yoy')}
          >
            <span className="pl">前年</span>
          </PresetBtn>
          <PresetBtn
            type="button"
            $active={dowBase === 'ach'}
            onClick={() => onDowBaseChange('ach')}
          >
            <span className="pl">予算</span>
          </PresetBtn>
        </PresetsRow>
        <DowPresetBtn type="button" onClick={resetAll}>
          100% リセット
        </DowPresetBtn>
        <DowBaseLabel>実績曜日平均:</DowBaseLabel>
        <DowPresetBtn
          type="button"
          title="各曜日の 実績 / 前年 を dow% に設定"
          onClick={() => autoFromActual('yoy')}
        >
          前年比
        </DowPresetBtn>
        <DowPresetBtn
          type="button"
          title="各曜日の 実績 / 予算 を dow% に設定"
          onClick={() => autoFromActual('ach')}
        >
          達成率
        </DowPresetBtn>
        <DowPresetBtn
          type="button"
          title="現在の基準 (前年/予算) に対する実績平均額の比率を dow% に設定"
          onClick={() => autoFromActual('amount')}
        >
          額
        </DowPresetBtn>
      </DowBaseRow>

      <DowGridCols>
        {DOW_ORDER.map((dw) => {
          const isWE = dw === 0 || dw === 6
          const s = dowStats[dw]
          return (
            <DowCol key={dw} $weekend={isWE}>
              <DowColName>{DOW_LABELS[dw]}</DowColName>
              <DowColCount>
                {s.count}日{s.overCount > 0 && <span className="ov"> (上書 {s.overCount})</span>}
              </DowColCount>
              <DowColValRow>
                <DowColValInput
                  type="number"
                  step={1}
                  value={Math.round(dowInputs[dw] * 100) / 100}
                  onChange={(e) => setDow(dw, Number(e.target.value) || 0)}
                />
                <span className="u">%</span>
              </DowColValRow>
              <NumRangeSlider
                type="range"
                min={0}
                max={200}
                step={0.1}
                value={dowInputs[dw]}
                onChange={(e) => setDow(dw, Number(e.target.value))}
              />
              <DowColMoney>
                ¥{fmtCurrency(s.baseSum)} <span className="arrow">→</span>
                <strong>¥{fmtCurrency(s.effectiveSum)}</strong>
              </DowColMoney>
            </DowCol>
          )
        })}
      </DowGridCols>
    </DowGridPanel>
  )
}
