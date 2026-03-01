import { useState, useRef, useCallback, memo } from 'react'
import styled from 'styled-components'
import { sc } from '@/presentation/theme/semanticColors'
import { palette } from '@/presentation/theme/tokens'
import {
  formatCurrency,
  formatPercent,
  formatPointDiff,
  getEffectiveGrossProfitRate,
} from '@/domain/calculations/utils'
import type { WidgetContext } from './types'
import {
  ExecRow,
  ExecDividerLine,
  ForecastToolsGrid,
  ToolCard,
  ToolCardTitle,
  ToolInputGroup,
  ToolResultSection,
  ToolResultValue,
  ToolResultLabel,
  PinInputLabel,
} from '../DashboardPage.styles'

// ─── Slider Styled Components ───────────────────────────

const SliderWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
`

const SliderRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
`

const SliderInput = styled.input`
  flex: 1;
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  border-radius: 3px;
  background: ${({ theme }) => theme.colors.border};
  outline: none;
  cursor: pointer;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.palette.primary};
    border: 2px solid ${({ theme }) => theme.colors.bg2};
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
    cursor: pointer;
    transition: transform 0.15s;
  }
  &::-webkit-slider-thumb:hover {
    transform: scale(1.15);
  }

  &::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.palette.primary};
    border: 2px solid ${({ theme }) => theme.colors.bg2};
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
    cursor: pointer;
  }
`

const SliderValueInput = styled.input`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  min-width: 80px;
  width: 130px;
  text-align: right;
  background: transparent;
  border: 1px solid transparent;
  border-radius: ${({ theme }) => theme.radii.sm};
  padding: 2px 4px;
  outline: none;
  cursor: text;
  transition:
    border-color 0.15s,
    background 0.15s;

  &:hover {
    border-color: ${({ theme }) => theme.colors.border};
  }
  &:focus {
    border-color: ${({ theme }) => theme.colors.palette.primary};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)'};
  }
`

const SliderTicks = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text4};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  padding: 0 2px;
`

const DiffBadge = styled.span<{ $color: string }>`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ $color }) => $color};
  text-align: right;
`

const StepBtn = styled.button`
  all: unset;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  font-size: 0.6rem;
  line-height: 1;
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ theme }) => theme.colors.text3};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  flex-shrink: 0;
  &:hover {
    color: ${({ theme }) => theme.colors.text};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'};
  }
  &:disabled {
    opacity: 0.3;
    cursor: default;
  }
`

const ResetButton = styled.button`
  all: unset;
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text3};
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[3]}`};
  border-radius: ${({ theme }) => theme.radii.sm};
  &:hover {
    background: ${({ theme }) => theme.colors.bg4};
    color: ${({ theme }) => theme.colors.text};
  }
`

const ValidationBanner = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(249, 115, 22, 0.12)' : 'rgba(249, 115, 22, 0.08)'};
  border: 1px solid ${sc.negative};
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${sc.negative};
`

const SubLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text4};
  margin-left: ${({ theme }) => theme.spacing[1]};
`

// ─── Editable Slider Value ───────────────────────────────

interface EditableValueProps {
  value: number
  min: number
  max: number
  onChange: (v: number) => void
  format: (v: number) => string
  /** 入力文字列 → 数値。NaN を返すと無視 */
  parse?: (s: string) => number
}

function EditableCurrencyValue({ value, min, max, onChange, format, parse }: EditableValueProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFocus = useCallback(() => {
    setEditing(true)
    setDraft(String(value))
  }, [value])

  const commit = useCallback(() => {
    setEditing(false)
    const stripped = draft.replace(/[,、，\s%％]/g, '')
    const parsed = parse ? parse(stripped) : Number(stripped)
    if (!isNaN(parsed) && isFinite(parsed)) {
      onChange(Math.max(min, Math.min(max, Math.round(parsed))))
    }
  }, [draft, min, max, onChange, parse])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      inputRef.current?.blur()
    } else if (e.key === 'Escape') {
      setEditing(false)
      setDraft('')
      inputRef.current?.blur()
    }
  }, [])

  return (
    <SliderValueInput
      ref={inputRef}
      value={editing ? draft : format(value)}
      onFocus={handleFocus}
      onBlur={commit}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={handleKeyDown}
    />
  )
}

function EditablePercentValue({
  value,
  min,
  max,
  onChange,
}: Omit<EditableValueProps, 'format' | 'parse'>) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFocus = useCallback(() => {
    setEditing(true)
    setDraft(value.toFixed(1))
  }, [value])

  const commit = useCallback(() => {
    setEditing(false)
    const stripped = draft.replace(/[%％\s]/g, '')
    const parsed = Number(stripped)
    if (!isNaN(parsed) && isFinite(parsed)) {
      onChange(Math.max(min, Math.min(max, Math.round(parsed * 10) / 10)))
    }
  }, [draft, min, max, onChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      inputRef.current?.blur()
    } else if (e.key === 'Escape') {
      setEditing(false)
      setDraft('')
      inputRef.current?.blur()
    }
  }, [])

  return (
    <SliderValueInput
      ref={inputRef}
      value={editing ? draft : `${value.toFixed(1)}%`}
      onFocus={handleFocus}
      onBlur={commit}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={handleKeyDown}
    />
  )
}

// ─── Component ──────────────────────────────────────────

export const ForecastToolsWidget = memo(function ForecastToolsWidget({
  ctx,
}: {
  ctx: WidgetContext
}) {
  const r = ctx.result
  const prevYear = ctx.prevYear

  const actualSales = r.totalSales
  const actualGP = r.invMethodGrossProfit ?? r.estMethodMargin
  const actualGPRate = getEffectiveGrossProfitRate(r)

  // 残予算（売上）
  const remainingBudget = r.remainingBudget
  const hasBudget = r.budget > 0
  const hasRemainingBudget = remainingBudget > 0

  // 前年データ
  const hasPrevYear = prevYear.hasPrevYear && prevYear.totalSales > 0
  const prevYearTotalSales = prevYear.totalSales

  // デフォルト値（自動計算）
  const defaultSalesLanding = Math.round(r.projectedSales)
  const defaultRemainGPRate = actualGPRate
  const defaultTargetGPRate = r.grossProfitRateBudget

  // Slider ranges
  const salesMin = Math.round(actualSales)
  const salesMax = Math.round(defaultSalesLanding * 1.5)
  const salesStep = Math.round((salesMax - salesMin) / 100) || 1000

  const [salesLanding, setSalesLanding] = useState(defaultSalesLanding)
  const [remainGPRate, setRemainGPRate] = useState(Math.round(defaultRemainGPRate * 1000) / 10) // stored as %
  const [targetGPRate, setTargetGPRate] = useState(Math.round(defaultTargetGPRate * 1000) / 10) // stored as %

  const remainGPRateDecimal = remainGPRate / 100
  const targetGPRateDecimal = targetGPRate / 100

  // ─── Tool 1: 着地見込みシミュレーション ──────────────
  const tool1Valid = salesLanding > 0 && remainGPRateDecimal > 0
  const remainingSales1 = salesLanding - actualSales
  const remainingGP1 = remainingSales1 * remainGPRateDecimal
  const totalGP1 = actualGP + remainingGP1
  const landingGPRate1 = salesLanding > 0 ? totalGP1 / salesLanding : 0

  const salesDiff = salesLanding - defaultSalesLanding
  const gpRateDiff = remainGPRateDecimal - defaultRemainGPRate

  // Tool 1 新規: 残予算対比（残期間売上が残予算の何%か）
  const tool1RemainingBudgetRate = hasRemainingBudget ? remainingSales1 / remainingBudget : 0
  // Tool 1 新規: 売上着地予算達成率
  const tool1BudgetAchievement = hasBudget ? salesLanding / r.budget : 0
  // Tool 1 新規: 前年比
  const tool1YoyRate = hasPrevYear ? salesLanding / prevYearTotalSales : 0

  // ─── Tool 2: ゴールシーク ────────────────────────────
  const defaultTargetMonthlySales = Math.round(r.projectedSales)
  const goalSalesMin = Math.round(actualSales)
  const goalSalesMax = Math.round(defaultTargetMonthlySales * 1.5)
  const goalSalesStep = Math.round((goalSalesMax - goalSalesMin) / 100) || 1000
  const [targetMonthlySales, setTargetMonthlySales] = useState(defaultTargetMonthlySales)

  const tool2Valid = targetGPRateDecimal > 0
  const targetTotalSales2 = targetMonthlySales
  const targetTotalGP2 = targetGPRateDecimal * targetTotalSales2
  const requiredRemainingGP2 = targetTotalGP2 - actualGP
  const remainingSales2 = targetTotalSales2 - actualSales
  const requiredRemainingGPRate2 =
    remainingSales2 > 0 ? requiredRemainingGP2 / remainingSales2 : 0
  const goalDiff = targetGPRateDecimal - defaultTargetGPRate
  const goalSalesDiff = targetMonthlySales - defaultTargetMonthlySales

  // Tool 2 売上予算系
  const salesBudget = r.budget
  const projectedTotalSales2 = r.projectedSales
  const projectedSalesAchievement = salesBudget > 0 ? projectedTotalSales2 / salesBudget : 0
  const targetSalesAchievement = salesBudget > 0 ? targetTotalSales2 / salesBudget : 0

  // Tool 2 粗利予算系
  const gpBudget = r.grossProfitBudget
  const projectedTotalGP2 =
    actualGP + (remainingSales2 > 0 ? remainingSales2 * actualGPRate : 0)
  const projectedGPAchievement = gpBudget > 0 ? projectedTotalGP2 / gpBudget : 0
  const targetGPAchievement = gpBudget > 0 ? targetTotalGP2 / gpBudget : 0

  // Tool 2 新規: 残予算対比（残期間売上目標が残予算の何%か）
  const tool2RemainingBudgetRate = hasRemainingBudget ? remainingSales2 / remainingBudget : 0
  // Tool 2 新規: 前年比
  const tool2YoyRate = hasPrevYear ? targetTotalSales2 / prevYearTotalSales : 0

  return (
    <ForecastToolsGrid>
      {/* ═══ Tool 1: 着地見込みシミュレーション ═══ */}
      <ToolCard $accent={palette.primary}>
        <ToolCardTitle>着地見込みシミュレーション</ToolCardTitle>

        {/* バリデーション: 残予算がない場合 */}
        {hasBudget && !hasRemainingBudget && (
          <ValidationBanner>
            残予算がありません（予算 {formatCurrency(r.budget)} に対し実績{' '}
            {formatCurrency(actualSales)}）。シミュレーション結果は参考値です。
          </ValidationBanner>
        )}

        <ToolInputGroup>
          <PinInputLabel>
            売上着地見込み
            {salesDiff !== 0 && (
              <DiffBadge $color={sc.cond(salesDiff > 0)}>
                {' '}
                ({salesDiff > 0 ? '+' : ''}
                {formatCurrency(salesDiff)})
              </DiffBadge>
            )}
          </PinInputLabel>
          <SliderWrapper>
            <SliderRow>
              <StepBtn
                disabled={salesLanding <= salesMin}
                onClick={() => setSalesLanding(Math.max(salesMin, salesLanding - salesStep))}
              >
                ◀
              </StepBtn>
              <SliderInput
                type="range"
                min={salesMin}
                max={salesMax}
                step={salesStep}
                value={salesLanding}
                onChange={(e) => setSalesLanding(Number(e.target.value))}
              />
              <StepBtn
                disabled={salesLanding >= salesMax}
                onClick={() => setSalesLanding(Math.min(salesMax, salesLanding + salesStep))}
              >
                ▶
              </StepBtn>
              <EditableCurrencyValue
                value={salesLanding}
                min={salesMin}
                max={salesMax}
                onChange={setSalesLanding}
                format={formatCurrency}
              />
            </SliderRow>
            <SliderTicks>
              <span>{formatCurrency(salesMin)}</span>
              <ResetButton onClick={() => setSalesLanding(defaultSalesLanding)}>
                リセット
              </ResetButton>
              <span>{formatCurrency(salesMax)}</span>
            </SliderTicks>
          </SliderWrapper>
        </ToolInputGroup>
        <ToolInputGroup>
          <PinInputLabel>
            残期間の粗利率予測
            {gpRateDiff !== 0 && (
              <DiffBadge $color={sc.cond(gpRateDiff > 0)}>
                {' '}
                ({formatPointDiff(gpRateDiff)})
              </DiffBadge>
            )}
          </PinInputLabel>
          <SliderWrapper>
            <SliderRow>
              <StepBtn
                disabled={remainGPRate <= 10}
                onClick={() =>
                  setRemainGPRate(Math.max(10, Math.round((remainGPRate - 0.1) * 10) / 10))
                }
              >
                ◀
              </StepBtn>
              <SliderInput
                type="range"
                min={10}
                max={40}
                step={0.1}
                value={remainGPRate}
                onChange={(e) => setRemainGPRate(Number(e.target.value))}
              />
              <StepBtn
                disabled={remainGPRate >= 40}
                onClick={() =>
                  setRemainGPRate(Math.min(40, Math.round((remainGPRate + 0.1) * 10) / 10))
                }
              >
                ▶
              </StepBtn>
              <EditablePercentValue
                value={remainGPRate}
                min={10}
                max={40}
                onChange={setRemainGPRate}
              />
            </SliderRow>
            <SliderTicks>
              <span>10.0%</span>
              <ResetButton
                onClick={() => setRemainGPRate(Math.round(defaultRemainGPRate * 1000) / 10)}
              >
                リセット
              </ResetButton>
              <span>40.0%</span>
            </SliderTicks>
          </SliderWrapper>
        </ToolInputGroup>
        {tool1Valid && (
          <ToolResultSection>
            <ExecRow>
              <ToolResultLabel>現在売上実績</ToolResultLabel>
              <ToolResultValue>{formatCurrency(actualSales)}</ToolResultValue>
            </ExecRow>
            <ExecRow>
              <ToolResultLabel>
                残期間売上
                {hasRemainingBudget && (
                  <SubLabel>残予算比 {formatPercent(tool1RemainingBudgetRate)}</SubLabel>
                )}
              </ToolResultLabel>
              <ToolResultValue>{formatCurrency(remainingSales1)}</ToolResultValue>
            </ExecRow>
            <ExecRow>
              <ToolResultLabel>現在粗利実績</ToolResultLabel>
              <ToolResultValue>{formatCurrency(actualGP)}</ToolResultValue>
            </ExecRow>
            <ExecRow>
              <ToolResultLabel>残期間粗利見込み</ToolResultLabel>
              <ToolResultValue>{formatCurrency(remainingGP1)}</ToolResultValue>
            </ExecRow>
            <ExecDividerLine />
            <ExecRow>
              <ToolResultLabel>最終売上着地</ToolResultLabel>
              <ToolResultValue $color={palette.primary}>
                {formatCurrency(salesLanding)}
              </ToolResultValue>
            </ExecRow>

            {/* 新規: 予算達成率 */}
            {hasBudget && (
              <ExecRow>
                <ToolResultLabel style={{ fontWeight: 700 }}>予算達成率</ToolResultLabel>
                <ToolResultValue
                  style={{ fontWeight: 700 }}
                  $color={sc.cond(tool1BudgetAchievement >= 1)}
                >
                  {formatPercent(tool1BudgetAchievement)}
                </ToolResultValue>
              </ExecRow>
            )}

            {/* 新規: 前年比 */}
            {hasPrevYear && (
              <ExecRow>
                <ToolResultLabel style={{ fontWeight: 700 }}>前年比</ToolResultLabel>
                <ToolResultValue
                  style={{ fontWeight: 700 }}
                  $color={sc.cond(tool1YoyRate >= 1)}
                >
                  {formatPercent(tool1YoyRate)}
                  <SubLabel>
                    (前年 {formatCurrency(prevYearTotalSales)})
                  </SubLabel>
                </ToolResultValue>
              </ExecRow>
            )}

            <ExecDividerLine />
            <ExecRow>
              <ToolResultLabel>最終粗利額着地</ToolResultLabel>
              <ToolResultValue $color={sc.positive}>{formatCurrency(totalGP1)}</ToolResultValue>
            </ExecRow>
            <ExecRow>
              <ToolResultLabel>最終粗利率着地</ToolResultLabel>
              <ToolResultValue $color={sc.cond(landingGPRate1 >= ctx.targetRate)}>
                {formatPercent(landingGPRate1)}
              </ToolResultValue>
            </ExecRow>
            <ExecRow>
              <ToolResultLabel>粗利率予算比</ToolResultLabel>
              <ToolResultValue $color={sc.cond(landingGPRate1 >= r.grossProfitRateBudget)}>
                {formatPointDiff(landingGPRate1 - r.grossProfitRateBudget)}
              </ToolResultValue>
            </ExecRow>
          </ToolResultSection>
        )}
      </ToolCard>

      {/* ═══ Tool 2: ゴールシーク ═══ */}
      <ToolCard $accent={palette.warningDark}>
        <ToolCardTitle>ゴールシーク（必要粗利率逆算）</ToolCardTitle>

        {/* バリデーション: 残予算がない場合 */}
        {hasBudget && !hasRemainingBudget && (
          <ValidationBanner>
            残予算がありません。目標値の現実性を判断できないため、残予算対比は表示されません。
          </ValidationBanner>
        )}

        <ToolInputGroup>
          <PinInputLabel>
            目標着地月間売上
            {goalSalesDiff !== 0 && (
              <DiffBadge $color={sc.cond(goalSalesDiff > 0)}>
                {' '}
                ({goalSalesDiff > 0 ? '+' : ''}
                {formatCurrency(goalSalesDiff)})
              </DiffBadge>
            )}
          </PinInputLabel>
          <SliderWrapper>
            <SliderRow>
              <StepBtn
                disabled={targetMonthlySales <= goalSalesMin}
                onClick={() =>
                  setTargetMonthlySales(Math.max(goalSalesMin, targetMonthlySales - goalSalesStep))
                }
              >
                ◀
              </StepBtn>
              <SliderInput
                type="range"
                min={goalSalesMin}
                max={goalSalesMax}
                step={goalSalesStep}
                value={targetMonthlySales}
                onChange={(e) => setTargetMonthlySales(Number(e.target.value))}
              />
              <StepBtn
                disabled={targetMonthlySales >= goalSalesMax}
                onClick={() =>
                  setTargetMonthlySales(Math.min(goalSalesMax, targetMonthlySales + goalSalesStep))
                }
              >
                ▶
              </StepBtn>
              <EditableCurrencyValue
                value={targetMonthlySales}
                min={goalSalesMin}
                max={goalSalesMax}
                onChange={setTargetMonthlySales}
                format={formatCurrency}
              />
            </SliderRow>
            <SliderTicks>
              <span>{formatCurrency(goalSalesMin)}</span>
              <ResetButton onClick={() => setTargetMonthlySales(defaultTargetMonthlySales)}>
                リセット
              </ResetButton>
              <span>{formatCurrency(goalSalesMax)}</span>
            </SliderTicks>
          </SliderWrapper>
        </ToolInputGroup>
        <ToolInputGroup>
          <PinInputLabel>
            目標着地粗利率
            {goalDiff !== 0 && (
              <DiffBadge $color={sc.cond(goalDiff > 0)}> ({formatPointDiff(goalDiff)})</DiffBadge>
            )}
          </PinInputLabel>
          <SliderWrapper>
            <SliderRow>
              <StepBtn
                disabled={targetGPRate <= 10}
                onClick={() =>
                  setTargetGPRate(Math.max(10, Math.round((targetGPRate - 0.1) * 10) / 10))
                }
              >
                ◀
              </StepBtn>
              <SliderInput
                type="range"
                min={10}
                max={40}
                step={0.1}
                value={targetGPRate}
                onChange={(e) => setTargetGPRate(Number(e.target.value))}
              />
              <StepBtn
                disabled={targetGPRate >= 40}
                onClick={() =>
                  setTargetGPRate(Math.min(40, Math.round((targetGPRate + 0.1) * 10) / 10))
                }
              >
                ▶
              </StepBtn>
              <EditablePercentValue
                value={targetGPRate}
                min={10}
                max={40}
                onChange={setTargetGPRate}
              />
            </SliderRow>
            <SliderTicks>
              <span>10.0%</span>
              <ResetButton
                onClick={() => setTargetGPRate(Math.round(defaultTargetGPRate * 1000) / 10)}
              >
                リセット
              </ResetButton>
              <span>40.0%</span>
            </SliderTicks>
          </SliderWrapper>
        </ToolInputGroup>
        {tool2Valid && (
          <ToolResultSection>
            <ExecRow>
              <ToolResultLabel style={{ fontWeight: 700 }}>月間売上予算</ToolResultLabel>
              <ToolResultValue>{formatCurrency(salesBudget)}</ToolResultValue>
            </ExecRow>
            <ExecRow>
              <ToolResultLabel>予測月末売上</ToolResultLabel>
              <ToolResultValue>
                {formatCurrency(projectedTotalSales2)}
                {' / '}
                {formatPercent(projectedSalesAchievement)}
              </ToolResultValue>
            </ExecRow>
            <ExecRow>
              <ToolResultLabel style={{ fontWeight: 700 }}>目標月間売上</ToolResultLabel>
              <ToolResultValue
                style={{ fontWeight: 700 }}
                $color={sc.cond(targetSalesAchievement >= 1)}
              >
                {formatCurrency(targetTotalSales2)}
                {' / '}
                {formatPercent(targetSalesAchievement)}
              </ToolResultValue>
            </ExecRow>

            {/* 新規: 前年比 */}
            {hasPrevYear && (
              <ExecRow>
                <ToolResultLabel>前年比</ToolResultLabel>
                <ToolResultValue $color={sc.cond(tool2YoyRate >= 1)}>
                  {formatPercent(tool2YoyRate)}
                  <SubLabel>(前年 {formatCurrency(prevYearTotalSales)})</SubLabel>
                </ToolResultValue>
              </ExecRow>
            )}

            <ExecDividerLine />
            <ExecRow>
              <ToolResultLabel style={{ fontWeight: 700 }}>月間粗利額予算</ToolResultLabel>
              <ToolResultValue>{formatCurrency(gpBudget)}</ToolResultValue>
            </ExecRow>
            <ExecRow>
              <ToolResultLabel>予測月間粗利額</ToolResultLabel>
              <ToolResultValue>
                {formatCurrency(projectedTotalGP2)}
                {' / '}
                {formatPercent(projectedGPAchievement)}
              </ToolResultValue>
            </ExecRow>
            <ExecRow>
              <ToolResultLabel style={{ fontWeight: 700 }}>目標粗利総額</ToolResultLabel>
              <ToolResultValue
                style={{ fontWeight: 700 }}
                $color={sc.cond(targetGPAchievement >= 1)}
              >
                {formatCurrency(targetTotalGP2)}
                {' / '}
                {formatPercent(targetGPAchievement)}
              </ToolResultValue>
            </ExecRow>
            <ExecDividerLine />
            <ExecRow>
              <ToolResultLabel>現在粗利実績</ToolResultLabel>
              <ToolResultValue>{formatCurrency(actualGP)}</ToolResultValue>
            </ExecRow>
            <ExecRow>
              <ToolResultLabel>残期間必要粗利</ToolResultLabel>
              <ToolResultValue>{formatCurrency(requiredRemainingGP2)}</ToolResultValue>
            </ExecRow>
            <ExecRow>
              <ToolResultLabel style={{ fontWeight: 700 }}>残期間売上目標</ToolResultLabel>
              <ToolResultValue style={{ fontWeight: 700 }}>
                {formatCurrency(remainingSales2)}
                {/* 新規: 残予算達成率 */}
                {hasRemainingBudget && (
                  <SubLabel>
                    残予算比{' '}
                    <span style={{ color: sc.cond(tool2RemainingBudgetRate <= 1) }}>
                      {formatPercent(tool2RemainingBudgetRate)}
                    </span>
                  </SubLabel>
                )}
              </ToolResultValue>
            </ExecRow>
            <ExecRow>
              <ToolResultLabel style={{ fontWeight: 700 }}>残期間必要粗利率</ToolResultLabel>
              <ToolResultValue
                style={{ fontWeight: 700 }}
                $color={sc.cond(requiredRemainingGPRate2 <= actualGPRate)}
              >
                {formatPercent(requiredRemainingGPRate2)}
              </ToolResultValue>
            </ExecRow>
            <ExecRow>
              <ToolResultLabel style={{ fontWeight: 700 }}>現在粗利率との差</ToolResultLabel>
              <ToolResultValue
                style={{ fontWeight: 700 }}
                $color={sc.cond(requiredRemainingGPRate2 <= actualGPRate)}
              >
                {formatPointDiff(requiredRemainingGPRate2 - actualGPRate)}
              </ToolResultValue>
            </ExecRow>
          </ToolResultSection>
        )}
      </ToolCard>
    </ForecastToolsGrid>
  )
})
