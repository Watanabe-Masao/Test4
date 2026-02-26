import { useMemo, useState } from 'react'
import styled from 'styled-components'
import { toPct, toComma } from './chartTheme'
import { safeDivide } from '@/domain/calculations/utils'
import type { StoreResult, DiscountEntry } from '@/domain/models'

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
  border: 1px solid ${({ $active, theme }) => $active ? theme.colors.palette.primary : theme.colors.border};
  border-left: 4px solid ${({ $active, theme }) => $active ? theme.colors.palette.primary : theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  background: ${({ $active, theme }) => $active ? (theme.mode === 'dark' ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.04)') : theme.colors.bg2};
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
  background: ${({ $color }) => $color}${({ $isMax }) => $isMax ? '18' : '08'};
  border: 1px solid ${({ $color }) => $color}${({ $isMax }) => $isMax ? '50' : '20'};
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

interface Props {
  result: StoreResult
  prevYearResult?: StoreResult
}

interface CausalStep {
  title: string
  description: string
  factors: { label: string; value: number; formatted: string; color: string }[]
  maxFactorIndex: number
  insight: string
}

export function CausalChainExplorer({ result, prevYearResult }: Props) {
  const [activeStep, setActiveStep] = useState(0)

  const steps = useMemo((): CausalStep[] => {
    const r = result
    const prev = prevYearResult
    const stepsArr: CausalStep[] = []

    // Step 1: 粗利率の変動（メイン指標の把握）
    const currentGPRate = r.invMethodGrossProfitRate ?? r.estMethodMarginRate
    const prevGPRate = prev ? (prev.invMethodGrossProfitRate ?? prev.estMethodMarginRate) : null
    const gpRateDelta = prevGPRate != null ? currentGPRate - prevGPRate : 0

    const budgetGPRate = r.grossProfitRateBudget
    const budgetDelta = budgetGPRate > 0 ? currentGPRate - budgetGPRate : 0

    const deltaDesc = prevGPRate != null
      ? `前年 ${toPct(prevGPRate)} → 今年 ${toPct(currentGPRate)}（${gpRateDelta >= 0 ? '+' : ''}${toPct(gpRateDelta)}）`
      : `今年 ${toPct(currentGPRate)}`

    stepsArr.push({
      title: '粗利率の状況',
      description: deltaDesc,
      factors: [
        ...(prevGPRate != null ? [{ label: '前年比変動', value: Math.abs(gpRateDelta), formatted: `${gpRateDelta >= 0 ? '+' : ''}${toPct(gpRateDelta)}`, color: gpRateDelta >= 0 ? '#22c55e' : '#ef4444' }] : []),
        ...(budgetGPRate > 0 ? [{ label: '予算比変動', value: Math.abs(budgetDelta), formatted: `${budgetDelta >= 0 ? '+' : ''}${toPct(budgetDelta)}`, color: budgetDelta >= 0 ? '#22c55e' : '#ef4444' }] : []),
        { label: '現在の粗利率', value: currentGPRate, formatted: toPct(currentGPRate), color: '#6366f1' },
      ],
      maxFactorIndex: 0,
      insight: gpRateDelta < -0.01
        ? '粗利率が前年比で1pt以上低下しています。要因をStep 2で深堀りします。'
        : gpRateDelta > 0.01
        ? '粗利率が前年比で改善しています。どの要因が寄与したかを確認します。'
        : '粗利率は前年と同等水準です。構造的な変化がないか確認します。',
    })

    // Step 2: 要因分解（原価・売変・消耗品のどれが主因か）
    const costRate = safeDivide(r.inventoryCost + r.deliverySalesCost, r.grossSales, 0)
    const discountRate = r.discountRate
    const consumableRate = r.consumableRate

    const prevCostRate = prev ? safeDivide(prev.inventoryCost + prev.deliverySalesCost, prev.grossSales, 0) : null
    const prevDiscountRate = prev ? prev.discountRate : null
    const prevConsumableRate = prev ? prev.consumableRate : null

    const costDelta = prevCostRate != null ? costRate - prevCostRate : 0
    const discountDelta = prevDiscountRate != null ? discountRate - prevDiscountRate : 0
    const consumableDelta = prevConsumableRate != null ? consumableRate - prevConsumableRate : 0

    const factors2 = [
      { label: '原価率変動', value: Math.abs(costDelta), formatted: `${costDelta >= 0 ? '+' : ''}${toPct(costDelta)}`, color: '#ef4444' },
      { label: '売変率変動', value: Math.abs(discountDelta), formatted: `${discountDelta >= 0 ? '+' : ''}${toPct(discountDelta)}`, color: '#f59e0b' },
      { label: '消耗品率変動', value: Math.abs(consumableDelta), formatted: `${consumableDelta >= 0 ? '+' : ''}${toPct(consumableDelta)}`, color: '#f97316' },
    ]

    const maxIdx2 = factors2.reduce((max, f, i) => f.value > factors2[max].value ? i : max, 0)
    const maxFactor = factors2[maxIdx2].label.replace('変動', '')

    stepsArr.push({
      title: '粗利率変動の要因分解',
      description: `原価率 ${toPct(costRate)} / 売変率 ${toPct(discountRate)} / 消耗品率 ${toPct(consumableRate)}`,
      factors: factors2,
      maxFactorIndex: maxIdx2,
      insight: prev
        ? `最大の変動要因は「${maxFactor}」です（${factors2[maxIdx2].formatted}）。Step 3で詳細を確認します。`
        : '前年データがないため差分分析は行えません。現在の構成比を表示しています。',
    })

    // Step 3: 売変種別内訳（売変が主因の場合に詳細表示）
    const entries = r.discountEntries
    const prevEntries = prev?.discountEntries

    if (entries.length > 0) {
      const entryFactors = entries.map((e: DiscountEntry) => {
        const prevEntry = prevEntries?.find((pe: DiscountEntry) => pe.type === e.type)
        const delta = prevEntry ? e.amount - prevEntry.amount : 0
        return {
          label: e.label,
          value: Math.abs(delta),
          formatted: `${toComma(e.amount)}円${prevEntry ? `（差: ${delta >= 0 ? '+' : ''}${toComma(delta)}円）` : ''}`,
          color: e.type === '71' ? '#ef4444' : e.type === '72' ? '#f59e0b' : e.type === '73' ? '#3b82f6' : '#8b5cf6',
        }
      })

      const maxIdx3 = entryFactors.length > 0
        ? entryFactors.reduce((max, f, i) => f.value > entryFactors[max].value ? i : max, 0)
        : 0

      stepsArr.push({
        title: '売変種別内訳',
        description: `売変合計: ${toComma(r.totalDiscount)}円（${toPct(r.discountRate)}）`,
        factors: entryFactors,
        maxFactorIndex: maxIdx3,
        insight: entryFactors.length > 0 && prevEntries
          ? `最も変動が大きい種別は「${entryFactors[maxIdx3].label}」です。`
          : '売変の種別内訳を表示しています。',
      })
    }

    // Step 4: アクション提案
    const actions: string[] = []
    if (discountDelta > 0.005) actions.push('売変率が上昇しています。見切りタイミングの見直しを検討してください。')
    if (costDelta > 0.005) actions.push('原価率が上昇しています。仕入先や発注ロットの見直しを検討してください。')
    if (consumableDelta > 0.003) actions.push('消耗品率が上昇しています。消耗品の管理を確認してください。')
    if (gpRateDelta > 0.01) actions.push('粗利率が改善しています。成功要因を維持する施策を継続してください。')
    if (actions.length === 0) actions.push('現時点で大きな変動は見られません。引き続きモニタリングを継続してください。')

    stepsArr.push({
      title: '推奨アクション',
      description: '分析結果に基づく次のステップ',
      factors: [],
      maxFactorIndex: 0,
      insight: actions.join('\n'),
    })

    return stepsArr
  }, [result, prevYearResult])

  const stepColors = ['#6366f1', '#ef4444', '#f59e0b', '#22c55e']

  return (
    <Wrapper>
      <Title>因果チェーン分析 — 粗利率変動の要因ドリルダウン</Title>
      <StepContainer>
        {steps.map((step, i) => (
          <div key={i}>
            <StepCard $active={activeStep === i} onClick={() => setActiveStep(i)}>
              <StepHeader>
                <StepNum $color={stepColors[i % stepColors.length]}>
                  {i + 1}
                </StepNum>
                <StepTitle>{step.title}</StepTitle>
              </StepHeader>
              <StepBody>{step.description}</StepBody>

              {activeStep === i && (
                <>
                  {step.factors.length > 0 && (
                    <FactorBar>
                      {step.factors.map((f, fi) => (
                        <Factor key={fi} $color={f.color} $isMax={fi === step.maxFactorIndex}>
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
}
