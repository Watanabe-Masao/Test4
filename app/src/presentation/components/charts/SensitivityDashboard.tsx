import { useState, useCallback, useMemo, memo } from 'react'
import { toPct, toComma, toManYen } from './chartTheme'
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
import {
  Wrapper,
  Title,
  Grid,
  SliderSection,
  SliderCard,
  SliderHeader,
  SliderLabel,
  SliderValue,
  BaseValueRow,
  BaseLabel,
  SimLabel,
  StyledSlider,
  ElasticityBadge,
  ResultSection,
  ResultCard,
  ResultLabel,
  ResultRow,
  ResultValue,
  ResultDelta,
  Formula,
  ResetBtn,
  ActionBtn,
  ScenarioSection,
  ScenarioTable,
  ScenarioTh,
  ScenarioTd,
  ScenarioName,
  DeleteBtn,
  LoadBtn,
} from './SensitivityDashboard.styles'

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

  const fmtDelta = (v: number) => `${v >= 0 ? '+' : ''}${toManYen(v)}`
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
              <ResultValue>{toManYen(sensitivity.simulatedGrossProfit)}</ResultValue>
              <ResultDelta
                $positive={sensitivity.grossProfitDelta >= 0}
                $isZero={sensitivity.grossProfitDelta === 0}
              >
                {fmtDelta(sensitivity.grossProfitDelta)}
              </ResultDelta>
            </ResultRow>
            {!isAllZero && (
              <Formula>
                粗売上 {toManYen(simValues.simGrossSales)} − 原価 {toManYen(simValues.simCost)} −
                売変 {toManYen(simValues.simDiscount)} − 消耗品 {toManYen(simValues.simConsumable)}
                <br />= {toManYen(sensitivity.simulatedGrossProfit)}（現在{' '}
                {toManYen(sensitivity.baseGrossProfit)} → 差{' '}
                {fmtDelta(sensitivity.grossProfitDelta)}）
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
                粗利 {toManYen(sensitivity.simulatedGrossProfit)} ÷ 売上{' '}
                {toManYen(sensitivity.simulatedSales)}（現在{' '}
                {toPct(sensitivity.baseGrossProfitRate)}）
              </Formula>
            )}
          </ResultCard>

          <ResultCard $color={palette.blueDark}>
            <ResultLabel>月間売上</ResultLabel>
            <ResultRow>
              <ResultValue>{toManYen(sensitivity.simulatedSales)}</ResultValue>
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
                {toComma(Math.round(simValues.simTxValue))}円（現在 {toManYen(base.totalSales)}）
              </Formula>
            )}
          </ResultCard>

          <ResultCard $color={palette.purpleDark}>
            <ResultLabel>着地予測</ResultLabel>
            <ResultRow>
              <ResultValue>{toManYen(sensitivity.simulatedProjectedSales)}</ResultValue>
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
                <ScenarioTd $highlight>{toManYen(sensitivity.baseGrossProfit)}</ScenarioTd>
                <ScenarioTd $highlight>{toPct(sensitivity.baseGrossProfitRate)}</ScenarioTd>
                <ScenarioTd>{toManYen(base.totalSales)}</ScenarioTd>
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
                  <ScenarioTd $highlight>{toManYen(s.grossProfit)}</ScenarioTd>
                  <ScenarioTd $highlight>{toPct(s.grossProfitRate)}</ScenarioTd>
                  <ScenarioTd>{toManYen(s.sales)}</ScenarioTd>
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
