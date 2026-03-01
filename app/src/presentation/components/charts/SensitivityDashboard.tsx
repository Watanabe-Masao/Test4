import { useState, useCallback } from 'react'
import styled from 'styled-components'
import { toPct } from './chartTheme'
import { sc } from '@/presentation/theme/semanticColors'
import { palette } from '@/presentation/theme/tokens'
import { ChartHelpButton } from './ChartHeader'
import { CHART_GUIDES } from './chartGuides'
import {
  useSensitivityBase,
  useSensitivityAnalysis,
  useElasticity,
} from '@/application/hooks/useSensitivity'
import type { SensitivityDeltas } from '@/application/hooks/useSensitivity'
import type { StoreResult } from '@/domain/models'

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

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing[4]};

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`

const SliderSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`

const SliderCard = styled.div`
  padding: ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
`

const SliderHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`

const SliderLabel = styled.div`
  font-size: 0.65rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text2};
`

const SliderValue = styled.div<{ $positive: boolean; $isZero: boolean }>`
  font-size: 0.7rem;
  font-weight: 700;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ $isZero, $positive }) => ($isZero ? '#94a3b8' : sc.cond($positive))};
`

const StyledSlider = styled.input`
  width: 100%;
  height: 4px;
  border-radius: 2px;
  appearance: none;
  background: ${({ theme }) => theme.colors.border};
  outline: none;

  &::-webkit-slider-thumb {
    appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.palette.primary};
    cursor: pointer;
  }
`

const ElasticityBadge = styled.div`
  font-size: 0.5rem;
  color: ${({ theme }) => theme.colors.text4};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  margin-top: 2px;
`

const ResultSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`

const ResultCard = styled.div<{ $color: string }>`
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-left: 4px solid ${({ $color }) => $color};
  border-radius: ${({ theme }) => theme.radii.md};
`

const ResultLabel = styled.div`
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.text4};
  margin-bottom: 2px;
`

const ResultRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: ${({ theme }) => theme.spacing[2]};
`

const ResultValue = styled.div`
  font-size: 0.9rem;
  font-weight: 700;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text};
`

const ResultDelta = styled.div<{ $positive: boolean; $isZero: boolean }>`
  font-size: 0.65rem;
  font-weight: 600;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ $isZero, $positive }) => ($isZero ? '#94a3b8' : sc.cond($positive))};
`

const ResetBtn = styled.button`
  all: unset;
  cursor: pointer;
  font-size: 0.6rem;
  padding: 4px 10px;
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ theme }) => theme.colors.text3};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  &:hover {
    opacity: 0.8;
  }
`

interface Props {
  result: StoreResult
}

interface SliderConfig {
  key: keyof SensitivityDeltas
  label: string
  min: number
  max: number
  step: number
  format: (v: number) => string
  elasticityLabel: string
}

const SLIDER_CONFIGS: SliderConfig[] = [
  {
    key: 'discountRateDelta',
    label: '売変率',
    min: -0.05,
    max: 0.05,
    step: 0.001,
    format: (v) => `${v >= 0 ? '+' : ''}${toPct(v)}`,
    elasticityLabel: '1pt改善→粗利',
  },
  {
    key: 'customersDelta',
    label: '客数',
    min: -0.2,
    max: 0.2,
    step: 0.01,
    format: (v) => `${v >= 0 ? '+' : ''}${toPct(v)}`,
    elasticityLabel: '1%増→粗利',
  },
  {
    key: 'transactionValueDelta',
    label: '客単価',
    min: -0.2,
    max: 0.2,
    step: 0.01,
    format: (v) => `${v >= 0 ? '+' : ''}${toPct(v)}`,
    elasticityLabel: '1%増→粗利',
  },
  {
    key: 'costRateDelta',
    label: '原価率',
    min: -0.05,
    max: 0.05,
    step: 0.001,
    format: (v) => `${v >= 0 ? '+' : ''}${toPct(v)}`,
    elasticityLabel: '1pt改善→粗利',
  },
]

export function SensitivityDashboard({ result }: Props) {
  const [deltas, setDeltas] = useState<SensitivityDeltas>({
    discountRateDelta: 0,
    customersDelta: 0,
    transactionValueDelta: 0,
    costRateDelta: 0,
  })

  const base = useSensitivityBase(result)
  const sensitivity = useSensitivityAnalysis(base, deltas)
  const elasticity = useElasticity(base)

  const handleSliderChange = useCallback((key: keyof SensitivityDeltas, value: number) => {
    setDeltas((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleReset = useCallback(() => {
    setDeltas({
      discountRateDelta: 0,
      customersDelta: 0,
      transactionValueDelta: 0,
      costRateDelta: 0,
    })
  }, [])

  const fmtMan = (v: number) => `${Math.round(v / 10000).toLocaleString()}万`
  const fmtDelta = (v: number) => `${v >= 0 ? '+' : ''}${Math.round(v / 10000).toLocaleString()}万`
  const isAllZero = Object.values(deltas).every((d) => d === 0)

  const elasticityMap: Record<keyof SensitivityDeltas, number> = {
    discountRateDelta: elasticity.discountRateElasticity,
    customersDelta: elasticity.customersElasticity,
    transactionValueDelta: elasticity.transactionValueElasticity,
    costRateDelta: elasticity.costRateElasticity,
  }

  return (
    <Wrapper>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
        }}
      >
        <Title style={{ marginBottom: 0 }}>
          感度分析ダッシュボード — What-if シミュレーション
          <ChartHelpButton guide={CHART_GUIDES['sensitivity-dashboard']} />
        </Title>
        {!isAllZero && <ResetBtn onClick={handleReset}>リセット</ResetBtn>}
      </div>

      <Grid>
        <SliderSection>
          {SLIDER_CONFIGS.map((cfg) => (
            <SliderCard key={cfg.key}>
              <SliderHeader>
                <SliderLabel>{cfg.label}</SliderLabel>
                <SliderValue $positive={deltas[cfg.key] >= 0} $isZero={deltas[cfg.key] === 0}>
                  {cfg.format(deltas[cfg.key])}
                </SliderValue>
              </SliderHeader>
              <StyledSlider
                type="range"
                min={cfg.min}
                max={cfg.max}
                step={cfg.step}
                value={deltas[cfg.key]}
                onChange={(e) => handleSliderChange(cfg.key, parseFloat(e.target.value))}
              />
              <ElasticityBadge>
                弾性値: {cfg.elasticityLabel} {fmtDelta(elasticityMap[cfg.key])}円
              </ElasticityBadge>
            </SliderCard>
          ))}
        </SliderSection>

        <ResultSection>
          <ResultCard $color={sc.positive}>
            <ResultLabel>粗利額</ResultLabel>
            <ResultRow>
              <ResultValue>{fmtMan(sensitivity.simulatedGrossProfit)}</ResultValue>
              <ResultDelta
                $positive={sensitivity.grossProfitDelta >= 0}
                $isZero={sensitivity.grossProfitDelta === 0}
              >
                {fmtDelta(sensitivity.grossProfitDelta)}
              </ResultDelta>
            </ResultRow>
          </ResultCard>

          <ResultCard $color={palette.primary}>
            <ResultLabel>粗利率</ResultLabel>
            <ResultRow>
              <ResultValue>{toPct(sensitivity.simulatedGrossProfitRate)}</ResultValue>
              <ResultDelta
                $positive={sensitivity.simulatedGrossProfitRate >= sensitivity.baseGrossProfitRate}
                $isZero={sensitivity.simulatedGrossProfitRate === sensitivity.baseGrossProfitRate}
              >
                {sensitivity.simulatedGrossProfitRate - sensitivity.baseGrossProfitRate >= 0
                  ? '+'
                  : ''}
                {toPct(sensitivity.simulatedGrossProfitRate - sensitivity.baseGrossProfitRate)}
              </ResultDelta>
            </ResultRow>
          </ResultCard>

          <ResultCard $color={palette.blueDark}>
            <ResultLabel>月間売上</ResultLabel>
            <ResultRow>
              <ResultValue>{fmtMan(sensitivity.simulatedSales)}</ResultValue>
              <ResultDelta
                $positive={sensitivity.salesDelta >= 0}
                $isZero={sensitivity.salesDelta === 0}
              >
                {fmtDelta(sensitivity.salesDelta)}
              </ResultDelta>
            </ResultRow>
          </ResultCard>

          <ResultCard $color={palette.purpleDark}>
            <ResultLabel>着地予測</ResultLabel>
            <ResultRow>
              <ResultValue>{fmtMan(sensitivity.simulatedProjectedSales)}</ResultValue>
              <ResultDelta
                $positive={sensitivity.projectedSalesDelta >= 0}
                $isZero={sensitivity.projectedSalesDelta === 0}
              >
                {fmtDelta(sensitivity.projectedSalesDelta)}
              </ResultDelta>
            </ResultRow>
          </ResultCard>

          <ResultCard $color={palette.warningDark}>
            <ResultLabel>予算達成率変化</ResultLabel>
            <ResultRow>
              <ResultValue>
                {sensitivity.budgetAchievementDelta >= 0 ? '+' : ''}
                {toPct(sensitivity.budgetAchievementDelta)}
              </ResultValue>
              <ResultDelta
                $positive={sensitivity.budgetAchievementDelta >= 0}
                $isZero={sensitivity.budgetAchievementDelta === 0}
              >
                {sensitivity.budgetAchievementDelta >= 0 ? '改善' : '悪化'}
              </ResultDelta>
            </ResultRow>
          </ResultCard>
        </ResultSection>
      </Grid>
    </Wrapper>
  )
}
