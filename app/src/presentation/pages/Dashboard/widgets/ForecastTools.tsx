import { useState } from 'react'
import styled from 'styled-components'
import { sc } from '@/presentation/theme/semanticColors'
import { formatCurrency, formatPercent, formatPointDiff } from '@/domain/calculations/utils'
import type { WidgetContext } from './types'
import {
  ExecRow, ExecDividerLine,
  ForecastToolsGrid, ToolCard, ToolCardTitle, ToolInputGroup,
  ToolResultSection, ToolResultValue, ToolResultLabel,
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

const SliderValue = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  min-width: 80px;
  text-align: right;
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

// ─── Component ──────────────────────────────────────────

export function ForecastToolsWidget({ ctx }: { ctx: WidgetContext }) {
  const r = ctx.result

  const actualSales = r.totalSales
  const actualGP = r.invMethodGrossProfit ?? r.estMethodMargin
  const actualGPRate = r.invMethodGrossProfitRate ?? r.estMethodMarginRate

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

  // Tool 1: Landing Forecast
  const tool1Valid = salesLanding > 0 && remainGPRateDecimal > 0
  const remainingSales1 = salesLanding - actualSales
  const remainingGP1 = remainingSales1 * remainGPRateDecimal
  const totalGP1 = actualGP + remainingGP1
  const landingGPRate1 = salesLanding > 0 ? totalGP1 / salesLanding : 0

  const salesDiff = salesLanding - defaultSalesLanding
  const gpRateDiff = remainGPRateDecimal - defaultRemainGPRate

  // Tool 2: Goal Seek
  const tool2Valid = targetGPRateDecimal > 0
  const projectedTotalSales2 = r.projectedSales
  const targetTotalGP2 = targetGPRateDecimal * projectedTotalSales2
  const requiredRemainingGP2 = targetTotalGP2 - actualGP
  const remainingSales2 = projectedTotalSales2 - actualSales
  const requiredRemainingGPRate2 = remainingSales2 > 0 ? requiredRemainingGP2 / remainingSales2 : 0
  const goalDiff = targetGPRateDecimal - defaultTargetGPRate

  return (
    <ForecastToolsGrid>
      <ToolCard $accent="#6366f1">
        <ToolCardTitle>着地見込みシミュレーション</ToolCardTitle>
        <ToolInputGroup>
          <PinInputLabel>
            売上着地見込み
            {salesDiff !== 0 && (
              <DiffBadge $color={sc.cond(salesDiff > 0)}>
                {' '}({salesDiff > 0 ? '+' : ''}{formatCurrency(salesDiff)})
              </DiffBadge>
            )}
          </PinInputLabel>
          <SliderWrapper>
            <SliderRow>
              <SliderInput
                type="range"
                min={salesMin}
                max={salesMax}
                step={salesStep}
                value={salesLanding}
                onChange={(e) => setSalesLanding(Number(e.target.value))}
              />
              <SliderValue>{formatCurrency(salesLanding)}</SliderValue>
            </SliderRow>
            <SliderTicks>
              <span>{formatCurrency(salesMin)}</span>
              <ResetButton onClick={() => setSalesLanding(defaultSalesLanding)}>リセット</ResetButton>
              <span>{formatCurrency(salesMax)}</span>
            </SliderTicks>
          </SliderWrapper>
        </ToolInputGroup>
        <ToolInputGroup>
          <PinInputLabel>
            残期間の粗利率予測
            {gpRateDiff !== 0 && (
              <DiffBadge $color={sc.cond(gpRateDiff > 0)}>
                {' '}({formatPointDiff(gpRateDiff)})
              </DiffBadge>
            )}
          </PinInputLabel>
          <SliderWrapper>
            <SliderRow>
              <SliderInput
                type="range"
                min={10}
                max={40}
                step={0.1}
                value={remainGPRate}
                onChange={(e) => setRemainGPRate(Number(e.target.value))}
              />
              <SliderValue>{remainGPRate.toFixed(1)}%</SliderValue>
            </SliderRow>
            <SliderTicks>
              <span>10.0%</span>
              <ResetButton onClick={() => setRemainGPRate(Math.round(defaultRemainGPRate * 1000) / 10)}>リセット</ResetButton>
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
              <ToolResultLabel>残期間売上</ToolResultLabel>
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
              <ToolResultValue $color="#6366f1">{formatCurrency(salesLanding)}</ToolResultValue>
            </ExecRow>
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

      <ToolCard $accent="#f59e0b">
        <ToolCardTitle>ゴールシーク（必要粗利率逆算）</ToolCardTitle>
        <ToolInputGroup>
          <PinInputLabel>
            目標着地粗利率
            {goalDiff !== 0 && (
              <DiffBadge $color={sc.cond(goalDiff > 0)}>
                {' '}({formatPointDiff(goalDiff)})
              </DiffBadge>
            )}
          </PinInputLabel>
          <SliderWrapper>
            <SliderRow>
              <SliderInput
                type="range"
                min={10}
                max={40}
                step={0.1}
                value={targetGPRate}
                onChange={(e) => setTargetGPRate(Number(e.target.value))}
              />
              <SliderValue>{targetGPRate.toFixed(1)}%</SliderValue>
            </SliderRow>
            <SliderTicks>
              <span>10.0%</span>
              <ResetButton onClick={() => setTargetGPRate(Math.round(defaultTargetGPRate * 1000) / 10)}>リセット</ResetButton>
              <span>40.0%</span>
            </SliderTicks>
          </SliderWrapper>
        </ToolInputGroup>
        {tool2Valid && (
          <ToolResultSection>
            <ExecRow>
              <ToolResultLabel>予測月末売上</ToolResultLabel>
              <ToolResultValue>{formatCurrency(projectedTotalSales2)}</ToolResultValue>
            </ExecRow>
            <ExecRow>
              <ToolResultLabel>目標粗利総額</ToolResultLabel>
              <ToolResultValue>{formatCurrency(targetTotalGP2)}</ToolResultValue>
            </ExecRow>
            <ExecRow>
              <ToolResultLabel>現在粗利実績</ToolResultLabel>
              <ToolResultValue>{formatCurrency(actualGP)}</ToolResultValue>
            </ExecRow>
            <ExecRow>
              <ToolResultLabel>残期間必要粗利</ToolResultLabel>
              <ToolResultValue>{formatCurrency(requiredRemainingGP2)}</ToolResultValue>
            </ExecRow>
            <ExecRow>
              <ToolResultLabel>残期間売上見込み</ToolResultLabel>
              <ToolResultValue>{formatCurrency(remainingSales2)}</ToolResultValue>
            </ExecRow>
            <ExecDividerLine />
            <ExecRow>
              <ToolResultLabel>残期間必要粗利率</ToolResultLabel>
              <ToolResultValue $color={sc.cond(requiredRemainingGPRate2 <= actualGPRate)}>
                {formatPercent(requiredRemainingGPRate2)}
              </ToolResultValue>
            </ExecRow>
            <ExecRow>
              <ToolResultLabel>現在粗利率との差</ToolResultLabel>
              <ToolResultValue $color={sc.cond(requiredRemainingGPRate2 <= actualGPRate)}>
                {formatPointDiff(requiredRemainingGPRate2 - actualGPRate)}
              </ToolResultValue>
            </ExecRow>
          </ToolResultSection>
        )}
      </ToolCard>
    </ForecastToolsGrid>
  )
}
