/**
 * RemainingInputPanel — 残期間シミュレーションの入力パネル
 *
 * mode (yoy/ach/dow) に応じた入力 UI を提供する。
 * - yoy: 前年比 % の単一入力
 * - ach: 予算達成率 % の単一入力
 * - dow: 7 曜日係数 + 前年/予算の base 選択
 *
 * state 管理は親 (useSimulatorState) に閉じ、本コンポーネントは props で受けて描画のみ。
 *
 * @responsibility R:form
 */
import { Chip, ChipGroup } from '@/presentation/components/common/forms'
import { ToggleSection } from '@/presentation/pages/Insight/InsightPage.styles'
import type { DowBase, DowFactors, SimulatorMode } from '@/domain/calculations/budgetSimulator'
import {
  DayInputField,
  DayInputLabel,
  DayInputRow,
  DowInputCell,
  DowInputsGrid,
  ModeInputPanel,
} from './BudgetSimulatorWidget.styles'

const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const

interface Props {
  readonly mode: SimulatorMode
  readonly yoyInput: number
  readonly achInput: number
  readonly dowInputs: DowFactors
  readonly dowBase: DowBase
  readonly onYoyChange: (n: number) => void
  readonly onAchChange: (n: number) => void
  readonly onDowChange: (inputs: DowFactors) => void
  readonly onDowBaseChange: (b: DowBase) => void
}

export function RemainingInputPanel({
  mode,
  yoyInput,
  achInput,
  dowInputs,
  dowBase,
  onYoyChange,
  onAchChange,
  onDowChange,
  onDowBaseChange,
}: Props) {
  return (
    <ModeInputPanel>
      {mode === 'yoy' && (
        <DayInputRow>
          <DayInputLabel htmlFor="sim-yoy-input">残期間の前年比 (%)</DayInputLabel>
          <DayInputField
            id="sim-yoy-input"
            type="number"
            min={0}
            step={1}
            value={yoyInput}
            onChange={(e) => onYoyChange(Number(e.target.value))}
          />
        </DayInputRow>
      )}
      {mode === 'ach' && (
        <DayInputRow>
          <DayInputLabel htmlFor="sim-ach-input">残期間の予算達成率 (%)</DayInputLabel>
          <DayInputField
            id="sim-ach-input"
            type="number"
            min={0}
            step={1}
            value={achInput}
            onChange={(e) => onAchChange(Number(e.target.value))}
          />
        </DayInputRow>
      )}
      {mode === 'dow' && (
        <>
          <ToggleSection>
            <ChipGroup>
              <Chip $active={dowBase === 'yoy'} onClick={() => onDowBaseChange('yoy')}>
                基準: 前年
              </Chip>
              <Chip $active={dowBase === 'ach'} onClick={() => onDowBaseChange('ach')}>
                基準: 予算
              </Chip>
            </ChipGroup>
          </ToggleSection>
          <DowInputsGrid>
            {DOW_LABELS.map((label, idx) => (
              <DowInputCell key={label}>
                <label htmlFor={`sim-dow-${idx}`}>{label}</label>
                <DayInputField
                  id={`sim-dow-${idx}`}
                  type="number"
                  min={0}
                  step={1}
                  value={dowInputs[idx]}
                  onChange={(e) => {
                    const n = Number(e.target.value)
                    const next = [...dowInputs] as [
                      number,
                      number,
                      number,
                      number,
                      number,
                      number,
                      number,
                    ]
                    next[idx] = n
                    onDowChange(next)
                  }}
                />
              </DowInputCell>
            ))}
          </DowInputsGrid>
        </>
      )}
    </ModeInputPanel>
  )
}
