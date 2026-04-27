/**
 * @responsibility R:unclassified
 */

import { memo, useMemo } from 'react'
import { sc } from '@/presentation/theme/semanticColors'
import { palette } from '@/presentation/theme/tokens'
import { formatPercent, formatPointDiff } from '@/domain/formatting'
import type { DashboardWidgetContext } from './DashboardWidgetContext'
import {
  ForecastToolsGrid,
  ToolCard,
  ToolCardTitle,
  ToolInputGroup,
  ToolResultSection,
  PinInputLabel,
} from '../DashboardPage.styles'
import {
  SliderWrapper,
  SliderRow,
  SliderInput,
  SliderTicks,
  DiffBadge,
  StepBtn,
  ResetButton,
  ValidationBanner,
} from './ForecastTools.styles'
import { EditableCurrencyValue, EditablePercentValue } from './EditableSliderValue'
import { useForecastToolsState } from './useForecastToolsState'
import { SimulationSummaryCard } from './SimulationSummaryCard'
import { SimulationInsightBanner } from './SimulationInsightBanner'
import { getTool1Insight, getTool2Insight } from './simulationInsight'

// ─── Component ──────────────────────────────────────────

/**
 * SP-B ADR-B-002: full ctx passthrough を絞り込み props 化。
 * useForecastToolsState が内部で ctx.X を参照するため、本 widget では ctx 全体を
 * 受け取る形を維持しつつ Pick で narrow する。registry 行は specific props を渡す。
 */
export type ForecastToolsWidgetProps = Pick<
  DashboardWidgetContext,
  'fmtCurrency' | 'result' | 'prevYear' | 'targetRate' | 'observationStatus'
>

export const ForecastToolsWidget = memo(function ForecastToolsWidget(
  props: ForecastToolsWidgetProps,
) {
  const ctx = props
  const { fmtCurrency } = ctx
  const s = useForecastToolsState(ctx)
  const { base, tool1, tool2 } = s

  const tool1Insight = useMemo(
    () =>
      getTool1Insight({
        tool1BudgetAchievement: tool1.tool1BudgetAchievement,
        landingGPRate1: tool1.landingGPRate1,
        actualGPRate: base.actualGPRate,
        tool1YoyRate: tool1.tool1YoyRate,
        hasBudget: base.hasBudget,
        hasPrevYear: base.hasPrevYear,
      }),
    [tool1, base],
  )

  const tool2Insight = useMemo(
    () =>
      getTool2Insight({
        requiredRemainingGPRate2: tool2.requiredRemainingGPRate2,
        actualGPRate: base.actualGPRate,
      }),
    [tool2, base],
  )

  return (
    <ForecastToolsGrid>
      {/* ═══ Tool 1: 着地見込みシミュレーション ═══ */}
      <ToolCard $accent={palette.primary}>
        <ToolCardTitle>着地見込みシミュレーション</ToolCardTitle>

        {/* バリデーション: 観測品質 */}
        {s.obsWarning && <ValidationBanner>{s.obsWarning}</ValidationBanner>}

        {/* バリデーション: 残予算がない場合 */}
        {base.hasBudget && !base.hasRemainingBudget && (
          <ValidationBanner>
            残予算がありません（予算 {fmtCurrency(base.budget)} に対し実績{' '}
            {fmtCurrency(base.actualSales)}）。シミュレーション結果は参考値です。
          </ValidationBanner>
        )}

        <ToolInputGroup>
          <PinInputLabel>
            売上着地見込み
            {tool1.salesDiff !== 0 && (
              <DiffBadge $color={sc.cond(tool1.salesDiff > 0)}>
                {' '}
                ({tool1.salesDiff > 0 ? '+' : ''}
                {fmtCurrency(tool1.salesDiff)})
              </DiffBadge>
            )}
          </PinInputLabel>
          <SliderWrapper>
            <SliderRow>
              <StepBtn
                disabled={s.salesLanding <= s.salesRange.min}
                onClick={() => s.stepSalesLanding(-1)}
              >
                ◀
              </StepBtn>
              <SliderInput
                type="range"
                min={s.salesRange.min}
                max={s.salesRange.max}
                step={s.salesRange.step}
                value={s.salesLanding}
                onChange={(e) => s.setSalesLanding(Number(e.target.value))}
              />
              <StepBtn
                disabled={s.salesLanding >= s.salesRange.max}
                onClick={() => s.stepSalesLanding(1)}
              >
                ▶
              </StepBtn>
              <EditableCurrencyValue
                value={s.salesLanding}
                min={s.salesRange.min}
                max={s.salesRange.max}
                onChange={s.setSalesLanding}
                format={fmtCurrency}
              />
            </SliderRow>
            <SliderTicks>
              <span>{fmtCurrency(s.salesRange.min)}</span>
              <ResetButton onClick={s.resetSalesLanding}>リセット</ResetButton>
              <span>{fmtCurrency(s.salesRange.max)}</span>
            </SliderTicks>
          </SliderWrapper>
        </ToolInputGroup>
        <ToolInputGroup>
          <PinInputLabel>
            残期間の粗利率予測
            {tool1.gpRateDiff !== 0 && (
              <DiffBadge $color={sc.cond(tool1.gpRateDiff > 0)}>
                {' '}
                ({formatPointDiff(tool1.gpRateDiff)})
              </DiffBadge>
            )}
          </PinInputLabel>
          <SliderWrapper>
            <SliderRow>
              <StepBtn disabled={s.remainGPRate <= 10} onClick={() => s.stepRemainGPRate(-1)}>
                ◀
              </StepBtn>
              <SliderInput
                type="range"
                min={10}
                max={40}
                step={0.1}
                value={s.remainGPRate}
                onChange={(e) => s.setRemainGPRate(Number(e.target.value))}
              />
              <StepBtn disabled={s.remainGPRate >= 40} onClick={() => s.stepRemainGPRate(1)}>
                ▶
              </StepBtn>
              <EditablePercentValue
                value={s.remainGPRate}
                min={10}
                max={40}
                onChange={s.setRemainGPRate}
              />
            </SliderRow>
            <SliderTicks>
              <span>10.0%</span>
              <ResetButton onClick={s.resetRemainGPRate}>リセット</ResetButton>
              <span>40.0%</span>
            </SliderTicks>
          </SliderWrapper>
        </ToolInputGroup>
        {tool1.tool1Valid && (
          <ToolResultSection>
            <SimulationInsightBanner {...tool1Insight} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <SimulationSummaryCard
                title="売上着地"
                primary={{
                  label: '最終売上着地',
                  value: fmtCurrency(s.salesLanding),
                  tone: 'primary',
                }}
                secondaries={[
                  ...(base.hasBudget
                    ? [
                        {
                          label: '予算達成率',
                          value: formatPercent(tool1.tool1BudgetAchievement),
                          tone:
                            tool1.tool1BudgetAchievement >= 1
                              ? ('positive' as const)
                              : ('negative' as const),
                        },
                      ]
                    : []),
                  ...(base.hasPrevYear
                    ? [
                        {
                          label: '前年比',
                          value: formatPercent(tool1.tool1YoyRate),
                          tone:
                            tool1.tool1YoyRate >= 1 ? ('positive' as const) : ('negative' as const),
                        },
                      ]
                    : []),
                ]}
                details={[
                  { label: '現在売上実績', value: fmtCurrency(base.actualSales) },
                  { label: '残期間売上', value: fmtCurrency(tool1.remainingSales1) },
                  ...(base.hasRemainingBudget
                    ? [{ label: '残予算比', value: formatPercent(tool1.tool1RemainingBudgetRate) }]
                    : []),
                ]}
              />
              <SimulationSummaryCard
                title="粗利見込み"
                primary={{
                  label: '最終粗利額着地',
                  value: fmtCurrency(tool1.totalGP1),
                  tone: 'positive',
                }}
                secondaries={[
                  {
                    label: '最終粗利率',
                    value: formatPercent(tool1.landingGPRate1),
                    tone: tool1.landingGPRate1 >= ctx.targetRate ? 'positive' : 'negative',
                  },
                  {
                    label: '粗利率予算比',
                    value: formatPointDiff(tool1.landingGPRate1 - ctx.result.grossProfitRateBudget),
                    tone:
                      tool1.landingGPRate1 >= ctx.result.grossProfitRateBudget
                        ? 'positive'
                        : 'negative',
                  },
                ]}
                details={[
                  { label: '現在粗利実績', value: fmtCurrency(base.actualGP) },
                  { label: '残期間粗利見込み', value: fmtCurrency(tool1.remainingGP1) },
                ]}
              />
            </div>
          </ToolResultSection>
        )}
      </ToolCard>

      {/* ═══ Tool 2: ゴールシーク ═══ */}
      <ToolCard $accent={palette.warningDark}>
        <ToolCardTitle>ゴールシーク（必要粗利率逆算）</ToolCardTitle>

        {/* バリデーション: 観測品質 */}
        {s.obsWarning && <ValidationBanner>{s.obsWarning}</ValidationBanner>}

        {/* バリデーション: 残予算がない場合 */}
        {base.hasBudget && !base.hasRemainingBudget && (
          <ValidationBanner>
            残予算がありません。目標値の現実性を判断できないため、残予算対比は表示されません。
          </ValidationBanner>
        )}

        <ToolInputGroup>
          <PinInputLabel>
            目標着地月間売上
            {tool2.goalSalesDiff !== 0 && (
              <DiffBadge $color={sc.cond(tool2.goalSalesDiff > 0)}>
                {' '}
                ({tool2.goalSalesDiff > 0 ? '+' : ''}
                {fmtCurrency(tool2.goalSalesDiff)})
              </DiffBadge>
            )}
          </PinInputLabel>
          <SliderWrapper>
            <SliderRow>
              <StepBtn
                disabled={s.targetMonthlySales <= s.goalSalesRange.min}
                onClick={() => s.stepTargetMonthlySales(-1)}
              >
                ◀
              </StepBtn>
              <SliderInput
                type="range"
                min={s.goalSalesRange.min}
                max={s.goalSalesRange.max}
                step={s.goalSalesRange.step}
                value={s.targetMonthlySales}
                onChange={(e) => s.setTargetMonthlySales(Number(e.target.value))}
              />
              <StepBtn
                disabled={s.targetMonthlySales >= s.goalSalesRange.max}
                onClick={() => s.stepTargetMonthlySales(1)}
              >
                ▶
              </StepBtn>
              <EditableCurrencyValue
                value={s.targetMonthlySales}
                min={s.goalSalesRange.min}
                max={s.goalSalesRange.max}
                onChange={s.setTargetMonthlySales}
                format={fmtCurrency}
              />
            </SliderRow>
            <SliderTicks>
              <span>{fmtCurrency(s.goalSalesRange.min)}</span>
              <ResetButton onClick={s.resetTargetMonthlySales}>リセット</ResetButton>
              <span>{fmtCurrency(s.goalSalesRange.max)}</span>
            </SliderTicks>
          </SliderWrapper>
        </ToolInputGroup>
        <ToolInputGroup>
          <PinInputLabel>
            目標着地粗利率
            {tool2.goalDiff !== 0 && (
              <DiffBadge $color={sc.cond(tool2.goalDiff > 0)}>
                {' '}
                ({formatPointDiff(tool2.goalDiff)})
              </DiffBadge>
            )}
          </PinInputLabel>
          <SliderWrapper>
            <SliderRow>
              <StepBtn disabled={s.targetGPRate <= 10} onClick={() => s.stepTargetGPRate(-1)}>
                ◀
              </StepBtn>
              <SliderInput
                type="range"
                min={10}
                max={40}
                step={0.1}
                value={s.targetGPRate}
                onChange={(e) => s.setTargetGPRate(Number(e.target.value))}
              />
              <StepBtn disabled={s.targetGPRate >= 40} onClick={() => s.stepTargetGPRate(1)}>
                ▶
              </StepBtn>
              <EditablePercentValue
                value={s.targetGPRate}
                min={10}
                max={40}
                onChange={s.setTargetGPRate}
              />
            </SliderRow>
            <SliderTicks>
              <span>10.0%</span>
              <ResetButton onClick={s.resetTargetGPRate}>リセット</ResetButton>
              <span>40.0%</span>
            </SliderTicks>
          </SliderWrapper>
        </ToolInputGroup>
        {tool2.tool2Valid && (
          <ToolResultSection>
            <SimulationInsightBanner {...tool2Insight} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <SimulationSummaryCard
                title="売上目標"
                primary={{
                  label: '目標月間売上',
                  value: fmtCurrency(tool2.targetTotalSales2),
                  tone: tool2.targetSalesAchievement >= 1 ? 'positive' : 'negative',
                  subLabel: `達成率 ${formatPercent(tool2.targetSalesAchievement)}`,
                }}
                secondaries={[
                  { label: '月間売上予算', value: fmtCurrency(tool2.salesBudget) },
                  ...(base.hasPrevYear
                    ? [
                        {
                          label: '前年比',
                          value: formatPercent(tool2.tool2YoyRate),
                          tone:
                            tool2.tool2YoyRate >= 1 ? ('positive' as const) : ('negative' as const),
                        },
                      ]
                    : []),
                ]}
                details={[
                  {
                    label: '予測月末売上',
                    value: `${fmtCurrency(tool2.projectedTotalSales2)} / ${formatPercent(tool2.projectedSalesAchievement)}`,
                  },
                ]}
              />
              <SimulationSummaryCard
                title="粗利目標"
                primary={{
                  label: '目標粗利総額',
                  value: fmtCurrency(tool2.targetTotalGP2),
                  tone: tool2.targetGPAchievement >= 1 ? 'positive' : 'negative',
                  subLabel: `達成率 ${formatPercent(tool2.targetGPAchievement)}`,
                }}
                secondaries={[
                  {
                    label: '月間粗利額予算',
                    value: tool2.gpBudget > 0 ? fmtCurrency(tool2.gpBudget) : '未設定',
                  },
                ]}
                details={[
                  {
                    label: '予測粗利額',
                    value: `${fmtCurrency(tool2.projectedTotalGP2)} / ${formatPercent(tool2.projectedGPAchievement)}`,
                  },
                  { label: '現在粗利実績', value: fmtCurrency(base.actualGP) },
                ]}
              />
              <SimulationSummaryCard
                title="必要アクション"
                primary={{
                  label: '残期間必要粗利率',
                  value: formatPercent(tool2.requiredRemainingGPRate2),
                  tone:
                    tool2.requiredRemainingGPRate2 <= base.actualGPRate ? 'positive' : 'negative',
                }}
                secondaries={[
                  {
                    label: '現在粗利率との差',
                    value: formatPointDiff(tool2.requiredRemainingGPRate2 - base.actualGPRate),
                    tone:
                      tool2.requiredRemainingGPRate2 <= base.actualGPRate ? 'positive' : 'negative',
                  },
                  {
                    label: '残期間売上目標',
                    value: fmtCurrency(tool2.remainingSales2),
                  },
                ]}
                details={[
                  { label: '残期間必要粗利', value: fmtCurrency(tool2.requiredRemainingGP2) },
                  ...(base.hasRemainingBudget
                    ? [
                        {
                          label: '残予算比',
                          value: formatPercent(tool2.tool2RemainingBudgetRate),
                          tone:
                            tool2.tool2RemainingBudgetRate <= 1
                              ? ('positive' as const)
                              : ('negative' as const),
                        },
                      ]
                    : []),
                ]}
              />
            </div>
          </ToolResultSection>
        )}
      </ToolCard>
    </ForecastToolsGrid>
  )
})
