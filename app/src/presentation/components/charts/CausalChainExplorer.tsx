import { useState, useCallback, memo } from 'react'
import styled from 'styled-components'
import type { StoreResult } from '@/domain/models'
import {
  useCausalChain,
  type CausalChainPrevInput,
  type ColorHint,
} from '@/application/hooks/useCausalChain'
import { sc } from '@/presentation/theme/semanticColors'
import { palette } from '@/presentation/theme/tokens'
import { useCrossChartSelection } from './crossChartSelectionHooks'
import { ChartHelpButton } from './ChartHeader'
import { CHART_GUIDES } from './chartGuides'

/** ColorHint → 実際の CUD 安全色に変換 */
function resolveColor(hint: ColorHint): string {
  switch (hint) {
    case 'positive':
      return sc.positive
    case 'negative':
      return sc.negative
    case 'caution':
      return sc.caution
    case 'primary':
      return palette.primary
    case 'secondary':
      return '#8b5cf6'
    case 'info':
      return palette.blueDark
    case 'warning':
      return palette.warningDark
  }
}

const Wrapper = styled.div`
  width: 100%;
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]};
`

const Title = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

const StepContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`

const StepCard = styled.div<{ $active: boolean }>`
  border: 1px solid
    ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.border)};
  border-left: 4px solid
    ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99,102,241,0.08)'
        : 'rgba(99,102,241,0.04)'
      : theme.colors.bg2};
  cursor: pointer;
  transition: all 0.15s;
  &:hover {
    border-color: ${({ theme }) => theme.colors.palette.primary};
  }
`

const StepHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`

const StepNum = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  font-size: 0.6rem;
  font-weight: 700;
  color: #fff;
  background: ${({ $color }) => $color};
`

const StepTitle = styled.span`
  font-size: 0.7rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`

const StepBody = styled.div`
  font-size: 0.65rem;
  color: ${({ theme }) => theme.colors.text3};
  line-height: 1.5;
`

const FactorBar = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-top: ${({ theme }) => theme.spacing[2]};
  flex-wrap: wrap;
`

const Factor = styled.div<{ $color: string; $isMax: boolean }>`
  flex: 1;
  min-width: 100px;
  padding: ${({ theme }) => theme.spacing[2]};
  background: ${({ $color }) => $color}${({ $isMax }) => ($isMax ? '18' : '08')};
  border: 1px solid ${({ $color }) => $color}${({ $isMax }) => ($isMax ? '50' : '20')};
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: 0.6rem;
`

const FactorLabel = styled.div`
  color: ${({ theme }) => theme.colors.text4};
  margin-bottom: 2px;
`

const FactorValue = styled.div`
  font-weight: 700;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text};
`

const Arrow = styled.div`
  text-align: center;
  color: ${({ theme }) => theme.colors.text4};
  font-size: 0.7rem;
  padding: 2px 0;
`

const InsightBox = styled.div<{ $color: string }>`
  margin-top: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[3]};
  background: ${({ $color }) => $color}0a;
  border: 1px solid ${({ $color }) => $color}30;
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: 0.65rem;
  color: ${({ theme }) => theme.colors.text2};
  line-height: 1.6;
`

const DrillLink = styled.button`
  all: unset;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-top: ${({ theme }) => theme.spacing[1]};
  font-size: 0.55rem;
  color: ${({ theme }) => theme.colors.palette.primary};
  &:hover {
    text-decoration: underline;
  }
`

interface Props {
  result: StoreResult
  prevYearData?: CausalChainPrevInput
}

// ステップ→関連ウィジェットID のマッピング
const STEP_DRILL_TARGETS: Record<string, string> = {
  粗利率の状況: 'gross-profit-rate',
  粗利率変動の要因分解: 'analysis-causal-chain',
  売変種別内訳: 'discount-trend',
  成分サマリー: '',
}

export const CausalChainExplorer = memo(function CausalChainExplorer({
  result,
  prevYearData,
}: Props) {
  const [activeStep, setActiveStep] = useState(0)
  const { requestDrillThrough } = useCrossChartSelection()

  const steps = useCausalChain(result, prevYearData)

  const handleStepDrill = useCallback(
    (stepTitle: string) => {
      const target = STEP_DRILL_TARGETS[stepTitle]
      if (target) {
        requestDrillThrough({ widgetId: target })
      }
    },
    [requestDrillThrough],
  )

  const stepColors = [palette.primary, sc.negative, sc.caution, sc.positive]

  return (
    <Wrapper>
      <Title>
        因果チェーン分析 — 粗利率変動の要因ドリルダウン
        <ChartHelpButton guide={CHART_GUIDES['causal-chain']} />
      </Title>
      <StepContainer>
        {steps.map((step, i) => (
          <div key={i}>
            <StepCard $active={activeStep === i} onClick={() => setActiveStep(i)}>
              <StepHeader>
                <StepNum $color={stepColors[i % stepColors.length]}>{i + 1}</StepNum>
                <StepTitle>{step.title}</StepTitle>
              </StepHeader>
              <StepBody>{step.description}</StepBody>

              {activeStep === i && (
                <>
                  {step.factors.length > 0 && (
                    <FactorBar>
                      {step.factors.map((f, fi) => (
                        <Factor
                          key={fi}
                          $color={resolveColor(f.colorHint)}
                          $isMax={fi === step.maxFactorIndex}
                        >
                          <FactorLabel>{f.label}</FactorLabel>
                          <FactorValue>{f.formatted}</FactorValue>
                        </Factor>
                      ))}
                    </FactorBar>
                  )}
                  <InsightBox $color={stepColors[i % stepColors.length]}>
                    {step.insight.split('\n').map((line, li) => (
                      <div key={li}>{line}</div>
                    ))}
                    {STEP_DRILL_TARGETS[step.title] && (
                      <DrillLink
                        onClick={(e) => {
                          e.stopPropagation()
                          handleStepDrill(step.title)
                        }}
                      >
                        関連チャートを表示 &rarr;
                      </DrillLink>
                    )}
                  </InsightBox>
                </>
              )}
            </StepCard>
            {i < steps.length - 1 && <Arrow>↓</Arrow>}
          </div>
        ))}
      </StepContainer>
    </Wrapper>
  )
})
