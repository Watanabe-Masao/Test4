import { useState, useCallback, memo } from 'react'
import type { StoreResult } from '@/domain/models/storeTypes'
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
import {
  Wrapper,
  Title,
  StepContainer,
  StepCard,
  StepHeader,
  StepNum,
  StepTitle,
  StepBody,
  FactorBar,
  Factor,
  FactorLabel,
  FactorValue,
  Arrow,
  InsightBox,
  DrillLink,
} from './CausalChainExplorer.styles'

/** ColorHint → 実際の CUD 安全色に変換  * @responsibility R:chart-view
 */
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
