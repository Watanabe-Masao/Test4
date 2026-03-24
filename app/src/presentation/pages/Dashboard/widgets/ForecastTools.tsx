import { memo } from 'react'
import { sc } from '@/presentation/theme/semanticColors'
import { palette } from '@/presentation/theme/tokens'
import { formatPercent, formatPointDiff } from '@/domain/formatting'
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
import {
  SliderWrapper,
  SliderRow,
  SliderInput,
  SliderTicks,
  DiffBadge,
  StepBtn,
  ResetButton,
  ValidationBanner,
  SubLabel,
} from './ForecastTools.styles'
import { EditableCurrencyValue, EditablePercentValue } from './EditableSliderValue'
import { useForecastToolsState } from './useForecastToolsState'

// ─── Component ──────────────────────────────────────────

export const ForecastToolsWidget = memo(function ForecastToolsWidget({
  ctx,
}: {
  ctx: WidgetContext
}) {
  const { fmtCurrency } = ctx
  const s = useForecastToolsState(ctx)
  const { base, tool1, tool2 } = s

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
            <ExecRow>
              <ToolResultLabel>現在売上実績</ToolResultLabel>
              <ToolResultValue>{fmtCurrency(base.actualSales)}</ToolResultValue>
            </ExecRow>
            <ExecRow>
              <ToolResultLabel>
                残期間売上
                {base.hasRemainingBudget && (
                  <SubLabel>残予算比 {formatPercent(tool1.tool1RemainingBudgetRate)}</SubLabel>
                )}
              </ToolResultLabel>
              <ToolResultValue>{fmtCurrency(tool1.remainingSales1)}</ToolResultValue>
            </ExecRow>
            <ExecRow>
              <ToolResultLabel>現在粗利実績</ToolResultLabel>
              <ToolResultValue>{fmtCurrency(base.actualGP)}</ToolResultValue>
            </ExecRow>
            <ExecRow>
              <ToolResultLabel>残期間粗利見込み</ToolResultLabel>
              <ToolResultValue>{fmtCurrency(tool1.remainingGP1)}</ToolResultValue>
            </ExecRow>
            <ExecDividerLine />
            <ExecRow>
              <ToolResultLabel>最終売上着地</ToolResultLabel>
              <ToolResultValue $color={palette.primary}>
                {fmtCurrency(s.salesLanding)}
              </ToolResultValue>
            </ExecRow>

            {/* 予算達成率 */}
            {base.hasBudget && (
              <ExecRow>
                <ToolResultLabel style={{ fontWeight: 700 }}>予算達成率</ToolResultLabel>
                <ToolResultValue
                  style={{ fontWeight: 700 }}
                  $color={sc.cond(tool1.tool1BudgetAchievement >= 1)}
                >
                  {formatPercent(tool1.tool1BudgetAchievement)}
                </ToolResultValue>
              </ExecRow>
            )}

            {/* 前年比 */}
            {base.hasPrevYear && (
              <ExecRow>
                <ToolResultLabel style={{ fontWeight: 700 }}>前年比</ToolResultLabel>
                <ToolResultValue
                  style={{ fontWeight: 700 }}
                  $color={sc.cond(tool1.tool1YoyRate >= 1)}
                >
                  {formatPercent(tool1.tool1YoyRate)}
                  <SubLabel>(前年 {fmtCurrency(base.prevYearTotalSales)})</SubLabel>
                </ToolResultValue>
              </ExecRow>
            )}

            <ExecDividerLine />
            <ExecRow>
              <ToolResultLabel>最終粗利額着地</ToolResultLabel>
              <ToolResultValue $color={sc.positive}>{fmtCurrency(tool1.totalGP1)}</ToolResultValue>
            </ExecRow>
            <ExecRow>
              <ToolResultLabel>最終粗利率着地</ToolResultLabel>
              <ToolResultValue $color={sc.cond(tool1.landingGPRate1 >= ctx.targetRate)}>
                {formatPercent(tool1.landingGPRate1)}
              </ToolResultValue>
            </ExecRow>
            <ExecRow>
              <ToolResultLabel>粗利率予算比</ToolResultLabel>
              <ToolResultValue
                $color={sc.cond(tool1.landingGPRate1 >= ctx.result.grossProfitRateBudget)}
              >
                {formatPointDiff(tool1.landingGPRate1 - ctx.result.grossProfitRateBudget)}
              </ToolResultValue>
            </ExecRow>
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
            <ExecRow>
              <ToolResultLabel style={{ fontWeight: 700 }}>月間売上予算</ToolResultLabel>
              <ToolResultValue>{fmtCurrency(tool2.salesBudget)}</ToolResultValue>
            </ExecRow>
            <ExecRow>
              <ToolResultLabel>予測月末売上</ToolResultLabel>
              <ToolResultValue>
                {fmtCurrency(tool2.projectedTotalSales2)}
                {' / '}
                {formatPercent(tool2.projectedSalesAchievement)}
              </ToolResultValue>
            </ExecRow>
            <ExecRow>
              <ToolResultLabel style={{ fontWeight: 700 }}>目標月間売上</ToolResultLabel>
              <ToolResultValue
                style={{ fontWeight: 700 }}
                $color={sc.cond(tool2.targetSalesAchievement >= 1)}
              >
                {fmtCurrency(tool2.targetTotalSales2)}
                {' / '}
                {formatPercent(tool2.targetSalesAchievement)}
              </ToolResultValue>
            </ExecRow>

            {/* 前年比 */}
            {base.hasPrevYear && (
              <ExecRow>
                <ToolResultLabel>前年比</ToolResultLabel>
                <ToolResultValue $color={sc.cond(tool2.tool2YoyRate >= 1)}>
                  {formatPercent(tool2.tool2YoyRate)}
                  <SubLabel>(前年 {fmtCurrency(base.prevYearTotalSales)})</SubLabel>
                </ToolResultValue>
              </ExecRow>
            )}

            <ExecDividerLine />
            <ExecRow>
              <ToolResultLabel style={{ fontWeight: 700 }}>月間粗利額予算</ToolResultLabel>
              <ToolResultValue>{fmtCurrency(tool2.gpBudget)}</ToolResultValue>
            </ExecRow>
            <ExecRow>
              <ToolResultLabel>予測月間粗利額</ToolResultLabel>
              <ToolResultValue>
                {fmtCurrency(tool2.projectedTotalGP2)}
                {' / '}
                {formatPercent(tool2.projectedGPAchievement)}
              </ToolResultValue>
            </ExecRow>
            <ExecRow>
              <ToolResultLabel style={{ fontWeight: 700 }}>目標粗利総額</ToolResultLabel>
              <ToolResultValue
                style={{ fontWeight: 700 }}
                $color={sc.cond(tool2.targetGPAchievement >= 1)}
              >
                {fmtCurrency(tool2.targetTotalGP2)}
                {' / '}
                {formatPercent(tool2.targetGPAchievement)}
              </ToolResultValue>
            </ExecRow>
            <ExecDividerLine />
            <ExecRow>
              <ToolResultLabel>現在粗利実績</ToolResultLabel>
              <ToolResultValue>{fmtCurrency(base.actualGP)}</ToolResultValue>
            </ExecRow>
            <ExecRow>
              <ToolResultLabel>残期間必要粗利</ToolResultLabel>
              <ToolResultValue>{fmtCurrency(tool2.requiredRemainingGP2)}</ToolResultValue>
            </ExecRow>
            <ExecRow>
              <ToolResultLabel style={{ fontWeight: 700 }}>残期間売上目標</ToolResultLabel>
              <ToolResultValue style={{ fontWeight: 700 }}>
                {fmtCurrency(tool2.remainingSales2)}
                {/* 残予算達成率 */}
                {base.hasRemainingBudget && (
                  <SubLabel>
                    残予算比{' '}
                    <span style={{ color: sc.cond(tool2.tool2RemainingBudgetRate <= 1) }}>
                      {formatPercent(tool2.tool2RemainingBudgetRate)}
                    </span>
                  </SubLabel>
                )}
              </ToolResultValue>
            </ExecRow>
            <ExecRow>
              <ToolResultLabel style={{ fontWeight: 700 }}>残期間必要粗利率</ToolResultLabel>
              <ToolResultValue
                style={{ fontWeight: 700 }}
                $color={sc.cond(tool2.requiredRemainingGPRate2 <= base.actualGPRate)}
              >
                {formatPercent(tool2.requiredRemainingGPRate2)}
              </ToolResultValue>
            </ExecRow>
            <ExecRow>
              <ToolResultLabel style={{ fontWeight: 700 }}>現在粗利率との差</ToolResultLabel>
              <ToolResultValue
                style={{ fontWeight: 700 }}
                $color={sc.cond(tool2.requiredRemainingGPRate2 <= base.actualGPRate)}
              >
                {formatPointDiff(tool2.requiredRemainingGPRate2 - base.actualGPRate)}
              </ToolResultValue>
            </ExecRow>
          </ToolResultSection>
        )}
      </ToolCard>
    </ForecastToolsGrid>
  )
})
