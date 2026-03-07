import { useState, useCallback, useMemo, memo } from 'react'
import styled from 'styled-components'
import { toPct, toComma } from './chartTheme'
import { sc } from '@/presentation/theme/semanticColors'
import { palette } from '@/presentation/theme/tokens'
import { ChartHelpButton } from './ChartHeader'
import { CHART_GUIDES } from './chartGuides'
import { safeDivide } from '@/domain/calculations/utils'
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
  margin-bottom: 4px;
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

const BaseValueRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
  font-size: 0.55rem;
  color: ${({ theme }) => theme.colors.text4};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

const BaseLabel = styled.span`
  color: ${({ theme }) => theme.colors.text3};
`

const SimLabel = styled.span<{ $changed: boolean }>`
  color: ${({ $changed }) => ($changed ? palette.primary : 'inherit')};
  font-weight: ${({ $changed }) => ($changed ? 600 : 400)};
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

const Formula = styled.div`
  font-size: 0.5rem;
  color: ${({ theme }) => theme.colors.text4};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  margin-top: 4px;
  line-height: 1.5;
  padding: 4px 6px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'};
  border-radius: ${({ theme }) => theme.radii.sm};
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
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.radii.sm};
  }
`

const ActionBtn = styled.button<{ $variant?: 'primary' | 'default' }>`
  all: unset;
  cursor: pointer;
  font-size: 0.6rem;
  padding: 4px 10px;
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ $variant, theme }) =>
    $variant === 'primary' ? theme.colors.palette.primary : theme.colors.text3};
  background: ${({ $variant, theme }) =>
    $variant === 'primary'
      ? theme.mode === 'dark'
        ? 'rgba(99,102,241,0.15)'
        : 'rgba(99,102,241,0.08)'
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.06)'
        : 'rgba(0,0,0,0.04)'};
  border: 1px solid
    ${({ $variant }) => ($variant === 'primary' ? 'rgba(99,102,241,0.3)' : 'transparent')};
  &:hover {
    opacity: 0.8;
  }
`

// ── シナリオ比較 ──

const ScenarioSection = styled.div`
  margin-top: ${({ theme }) => theme.spacing[4]};
  padding-top: ${({ theme }) => theme.spacing[3]};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`

const ScenarioTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.55rem;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

const ScenarioTh = styled.th`
  text-align: center;
  padding: 4px 6px;
  border-bottom: 2px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text3};
  font-weight: 600;
  white-space: nowrap;
`

const ScenarioTd = styled.td<{ $highlight?: boolean }>`
  text-align: center;
  padding: 4px 6px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme, $highlight }) => ($highlight ? theme.colors.text : theme.colors.text3)};
  font-weight: ${({ $highlight }) => ($highlight ? 600 : 400)};
  white-space: nowrap;
`

const ScenarioName = styled.td`
  text-align: left;
  padding: 4px 6px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text2};
  font-weight: 600;
`

const DeleteBtn = styled.button`
  all: unset;
  cursor: pointer;
  font-size: 0.5rem;
  color: ${({ theme }) => theme.colors.text4};
  padding: 1px 4px;
  border-radius: 2px;
  &:hover {
    color: ${({ theme }) => theme.colors.text};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'};
  }
`

const LoadBtn = styled.button`
  all: unset;
  cursor: pointer;
  font-size: 0.5rem;
  color: ${({ theme }) => theme.colors.palette.primary};
  padding: 1px 4px;
  border-radius: 2px;
  &:hover {
    text-decoration: underline;
  }
`

// ── Types ──

interface SavedScenario {
  readonly name: string
  readonly deltas: SensitivityDeltas
  readonly grossProfit: number
  readonly grossProfitRate: number
  readonly sales: number
}

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
  getBaseValue: (base: BaseValues) => number
  formatBase: (v: number) => string
  getSimValue: (base: BaseValues, delta: number) => number
}

interface BaseValues {
  discountRate: number
  customers: number
  txValue: number
  costRate: number
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
    getBaseValue: (b) => b.discountRate,
    formatBase: (v) => toPct(v),
    getSimValue: (b, d) => b.discountRate + d,
  },
  {
    key: 'customersDelta',
    label: '客数',
    min: -0.2,
    max: 0.2,
    step: 0.01,
    format: (v) => `${v >= 0 ? '+' : ''}${toPct(v)}`,
    elasticityLabel: '1%増→粗利',
    getBaseValue: (b) => b.customers,
    formatBase: (v) => `${toComma(Math.round(v))}人`,
    getSimValue: (b, d) => b.customers * (1 + d),
  },
  {
    key: 'transactionValueDelta',
    label: '客単価',
    min: -0.2,
    max: 0.2,
    step: 0.01,
    format: (v) => `${v >= 0 ? '+' : ''}${toPct(v)}`,
    elasticityLabel: '1%増→粗利',
    getBaseValue: (b) => b.txValue,
    formatBase: (v) => `${toComma(Math.round(v))}円`,
    getSimValue: (b, d) => b.txValue * (1 + d),
  },
  {
    key: 'costRateDelta',
    label: '原価率',
    min: -0.05,
    max: 0.05,
    step: 0.001,
    format: (v) => `${v >= 0 ? '+' : ''}${toPct(v)}`,
    elasticityLabel: '1pt改善→粗利',
    getBaseValue: (b) => b.costRate,
    formatBase: (v) => toPct(v),
    getSimValue: (b, d) => b.costRate + d,
  },
]

export const SensitivityDashboard = memo(function SensitivityDashboard({ result }: Props) {
  const [deltas, setDeltas] = useState<SensitivityDeltas>({
    discountRateDelta: 0,
    customersDelta: 0,
    transactionValueDelta: 0,
    costRateDelta: 0,
  })
  const [scenarios, setScenarios] = useState<SavedScenario[]>([])

  const base = useSensitivityBase(result)
  const sensitivity = useSensitivityAnalysis(base, deltas)
  const elasticity = useElasticity(base)

  // ベース値
  const baseValues: BaseValues = useMemo(
    () => ({
      discountRate: safeDivide(base.totalDiscount, base.grossSales, 0),
      customers: base.totalCustomers,
      txValue: safeDivide(base.totalSales, base.totalCustomers, 0),
      costRate: safeDivide(base.totalCost, base.grossSales, 0),
    }),
    [base],
  )

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

  const handleSaveScenario = useCallback(() => {
    const name = `シナリオ ${scenarios.length + 1}`
    setScenarios((prev) => [
      ...prev,
      {
        name,
        deltas: { ...deltas },
        grossProfit: sensitivity.simulatedGrossProfit,
        grossProfitRate: sensitivity.simulatedGrossProfitRate,
        sales: sensitivity.simulatedSales,
      },
    ])
  }, [deltas, sensitivity, scenarios.length])

  const handleLoadScenario = useCallback((s: SavedScenario) => {
    setDeltas({ ...s.deltas })
  }, [])

  const handleDeleteScenario = useCallback((idx: number) => {
    setScenarios((prev) => prev.filter((_, i) => i !== idx))
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

  // 計算根拠用の中間値
  const simValues = useMemo(() => {
    const simCustomers = base.totalCustomers * (1 + deltas.customersDelta)
    const simTxValue =
      safeDivide(base.totalSales, base.totalCustomers, 0) * (1 + deltas.transactionValueDelta)
    const simSales = simCustomers * simTxValue
    const baseDiscountRate = safeDivide(base.totalDiscount, base.grossSales, 0)
    const simDiscountRate = baseDiscountRate + deltas.discountRateDelta
    const simGrossSales = safeDivide(simSales, 1 - simDiscountRate, simSales)
    const baseCostRate = safeDivide(base.totalCost, base.grossSales, 0)
    const simCostRate = baseCostRate + deltas.costRateDelta
    const simCost = simGrossSales * simCostRate
    const simDiscount = simGrossSales * Math.max(0, simDiscountRate)
    const costInclusionRate = safeDivide(base.totalCostInclusion, base.totalSales, 0)
    const simConsumable = simSales * costInclusionRate
    return {
      simCustomers,
      simTxValue,
      simSales,
      simGrossSales,
      simCost,
      simDiscount,
      simConsumable,
      simCostRate,
      simDiscountRate,
    }
  }, [base, deltas])

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
        <div style={{ display: 'flex', gap: 6 }}>
          {!isAllZero && (
            <ActionBtn $variant="primary" onClick={handleSaveScenario}>
              シナリオ保存
            </ActionBtn>
          )}
          {!isAllZero && <ResetBtn onClick={handleReset}>リセット</ResetBtn>}
        </div>
      </div>

      <Grid>
        <SliderSection>
          {SLIDER_CONFIGS.map((cfg) => {
            const baseVal = cfg.getBaseValue(baseValues)
            const simVal = cfg.getSimValue(baseValues, deltas[cfg.key])
            const changed = deltas[cfg.key] !== 0
            return (
              <SliderCard key={cfg.key}>
                <SliderHeader>
                  <SliderLabel>{cfg.label}</SliderLabel>
                  <SliderValue $positive={deltas[cfg.key] >= 0} $isZero={deltas[cfg.key] === 0}>
                    {cfg.format(deltas[cfg.key])}
                  </SliderValue>
                </SliderHeader>
                <BaseValueRow>
                  <BaseLabel>現在: {cfg.formatBase(baseVal)}</BaseLabel>
                  <SimLabel $changed={changed}>
                    {changed ? `→ ${cfg.formatBase(simVal)}` : ''}
                  </SimLabel>
                </BaseValueRow>
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
            )
          })}
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
            {!isAllZero && (
              <Formula>
                粗売上 {fmtMan(simValues.simGrossSales)} − 原価 {fmtMan(simValues.simCost)} − 売変{' '}
                {fmtMan(simValues.simDiscount)} − 消耗品 {fmtMan(simValues.simConsumable)}
                <br />= {fmtMan(sensitivity.simulatedGrossProfit)}（現在{' '}
                {fmtMan(sensitivity.baseGrossProfit)} → 差 {fmtDelta(sensitivity.grossProfitDelta)}
                ）
              </Formula>
            )}
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
            {!isAllZero && (
              <Formula>
                粗利 {fmtMan(sensitivity.simulatedGrossProfit)} ÷ 売上{' '}
                {fmtMan(sensitivity.simulatedSales)}（現在 {toPct(sensitivity.baseGrossProfitRate)}
                ）
              </Formula>
            )}
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
            {!isAllZero && (
              <Formula>
                客数 {toComma(Math.round(simValues.simCustomers))}人 × 客単価{' '}
                {toComma(Math.round(simValues.simTxValue))}円（現在 {fmtMan(base.totalSales)}）
              </Formula>
            )}
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

      {/* シナリオ比較テーブル */}
      {scenarios.length > 0 && (
        <ScenarioSection>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            <div style={{ fontSize: '0.65rem', fontWeight: 600 }}>シナリオ比較</div>
            {scenarios.length > 1 && <ActionBtn onClick={() => setScenarios([])}>全削除</ActionBtn>}
          </div>
          <ScenarioTable>
            <thead>
              <tr>
                <ScenarioTh style={{ textAlign: 'left' }}>シナリオ</ScenarioTh>
                <ScenarioTh>売変率</ScenarioTh>
                <ScenarioTh>客数</ScenarioTh>
                <ScenarioTh>客単価</ScenarioTh>
                <ScenarioTh>原価率</ScenarioTh>
                <ScenarioTh>粗利額</ScenarioTh>
                <ScenarioTh>粗利率</ScenarioTh>
                <ScenarioTh>売上</ScenarioTh>
                <ScenarioTh></ScenarioTh>
              </tr>
            </thead>
            <tbody>
              {/* ベースライン行 */}
              <tr>
                <ScenarioName style={{ color: palette.primary }}>現在値</ScenarioName>
                <ScenarioTd>{toPct(baseValues.discountRate)}</ScenarioTd>
                <ScenarioTd>{toComma(Math.round(baseValues.customers))}人</ScenarioTd>
                <ScenarioTd>{toComma(Math.round(baseValues.txValue))}円</ScenarioTd>
                <ScenarioTd>{toPct(baseValues.costRate)}</ScenarioTd>
                <ScenarioTd $highlight>{fmtMan(sensitivity.baseGrossProfit)}</ScenarioTd>
                <ScenarioTd $highlight>{toPct(sensitivity.baseGrossProfitRate)}</ScenarioTd>
                <ScenarioTd>{fmtMan(base.totalSales)}</ScenarioTd>
                <ScenarioTd></ScenarioTd>
              </tr>
              {scenarios.map((s, i) => (
                <tr key={i}>
                  <ScenarioName>{s.name}</ScenarioName>
                  <ScenarioTd>
                    {s.deltas.discountRateDelta !== 0
                      ? `${s.deltas.discountRateDelta >= 0 ? '+' : ''}${toPct(s.deltas.discountRateDelta)}`
                      : '-'}
                  </ScenarioTd>
                  <ScenarioTd>
                    {s.deltas.customersDelta !== 0
                      ? `${s.deltas.customersDelta >= 0 ? '+' : ''}${toPct(s.deltas.customersDelta)}`
                      : '-'}
                  </ScenarioTd>
                  <ScenarioTd>
                    {s.deltas.transactionValueDelta !== 0
                      ? `${s.deltas.transactionValueDelta >= 0 ? '+' : ''}${toPct(s.deltas.transactionValueDelta)}`
                      : '-'}
                  </ScenarioTd>
                  <ScenarioTd>
                    {s.deltas.costRateDelta !== 0
                      ? `${s.deltas.costRateDelta >= 0 ? '+' : ''}${toPct(s.deltas.costRateDelta)}`
                      : '-'}
                  </ScenarioTd>
                  <ScenarioTd $highlight>{fmtMan(s.grossProfit)}</ScenarioTd>
                  <ScenarioTd $highlight>{toPct(s.grossProfitRate)}</ScenarioTd>
                  <ScenarioTd>{fmtMan(s.sales)}</ScenarioTd>
                  <ScenarioTd>
                    <LoadBtn onClick={() => handleLoadScenario(s)}>読込</LoadBtn>
                    <DeleteBtn onClick={() => handleDeleteScenario(i)}>✕</DeleteBtn>
                  </ScenarioTd>
                </tr>
              ))}
            </tbody>
          </ScenarioTable>
        </ScenarioSection>
      )}
    </Wrapper>
  )
})
