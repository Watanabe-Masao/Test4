import { useState, useMemo, memo, useCallback } from 'react'
import type { WidgetContext } from './types'
import {
  type MetricKey,
  type PeriodTab,
  type EnhancedTotal,
  METRIC_DEFS,
  isBudgetMetric,
  buildRows,
  buildTotalFromResult,
  buildCardSummaries,
  buildBudgetHeader,
  fmtValue,
  fmtAchievement,
  resultColor,
} from './ConditionSummaryEnhanced.vm'
import { formatPercent } from '@/domain/formatting'
import { MonthlyStoreRow, ElapsedStoreRow } from './ConditionSummaryEnhancedRows'
import {
  DashWrapper,
  Header,
  HeaderMeta,
  HeaderTitle,
  TabGroup,
  TabBtn,
  YoYBtn,
  TotalSection,
  TotalGrid,
  TotalCell,
  PeriodBadge,
  SectionLabel,
  SmallLabel,
  BigValue,
  MainValue,
  AchValue,
  ProgressTrack,
  ProgressFill,
  YoYRow,
  YoYLabel,
  MonoSm,
  MonoMd,
  MonoLg,
  Footer,
  FooterNote,
  LegendDot,
  LegendGroup,
  LegendItem,
  CardGridRow,
  CondCard,
  CondSignal,
  CondCardContent,
  CondCardLabel,
  CondCardValue,
  CondCardSub,
  DrillOverlay,
  DrillPanel,
  DrillHeader,
  DrillTitle,
  DrillBody,
  DrillCloseBtn,
  BudgetHeaderRow,
  BudgetHeaderItem,
  BudgetHeaderLabel,
  BudgetHeaderValue,
  BudgetGrowthBadge,
} from './ConditionSummaryEnhanced.styles'

// ─── Component ──────────────────────────────────────────

export const ConditionSummaryEnhanced = memo(function ConditionSummaryEnhanced({
  ctx,
}: {
  readonly ctx: WidgetContext
}) {
  const [activeMetric, setActiveMetric] = useState<MetricKey | null>(null)
  const [tab, setTab] = useState<PeriodTab>('elapsed')
  const [showYoY, setShowYoY] = useState(false)

  const { daysInMonth, elapsedDays } = ctx
  const effectiveElapsed = elapsedDays ?? daysInMonth

  // ─── Budget header (monthly fixed context) ─────────────
  const budgetHeader = useMemo(
    () => buildBudgetHeader(ctx.result, ctx.prevYearMonthlyKpi, ctx.dowGap),
    [ctx.result, ctx.prevYearMonthlyKpi, ctx.dowGap],
  )

  // ─── Card summaries (surface) ─────────────────────────
  const cards = useMemo(
    () => buildCardSummaries(ctx.result, elapsedDays, daysInMonth, ctx.fmtCurrency),
    [ctx.result, elapsedDays, daysInMonth, ctx.fmtCurrency],
  )

  // ─── Drill-down data ─────────────────────────────────
  const isMonthly = tab === 'monthly'

  const rowInput = useMemo(
    () =>
      activeMetric
        ? {
            allStoreResults: ctx.allStoreResults,
            stores: ctx.stores,
            metric: activeMetric,
            tab,
            elapsedDays,
            daysInMonth,
            prevYear: ctx.prevYear,
            prevYearMonthlyKpi: ctx.prevYearMonthlyKpi,
          }
        : null,
    [
      activeMetric,
      ctx.allStoreResults,
      ctx.stores,
      tab,
      elapsedDays,
      daysInMonth,
      ctx.prevYear,
      ctx.prevYearMonthlyKpi,
    ],
  )

  // Store rows sorted by store code (vm.buildRows already sorts by code)
  const rows = useMemo(() => (rowInput ? buildRows(rowInput) : []), [rowInput])

  const total = useMemo(
    () => (rowInput ? buildTotalFromResult(ctx.result, rowInput) : null),
    [ctx.result, rowInput],
  )

  const activeDef = activeMetric ? METRIC_DEFS[activeMetric] : null
  const hasYoYData = activeMetric === 'sales' && ctx.prevYear.hasPrevYear
  const showBudgetTabs = activeMetric != null && isBudgetMetric(activeMetric)

  const handleClose = useCallback(() => setActiveMetric(null), [])

  return (
    <DashWrapper>
      {/* Header */}
      <Header>
        <HeaderMeta>CONDITION SUMMARY</HeaderMeta>
        <HeaderTitle>店別 予算達成状況</HeaderTitle>
      </Header>

      {/* Budget Header (月間固定の予算コンテキスト) — クリックで売上の店別詳細を表示 */}
      <BudgetHeaderRow
        onClick={() => setActiveMetric('sales')}
        style={{ cursor: 'pointer' }}
        role="button"
        tabIndex={0}
        aria-label="売上の店別詳細を表示"
      >
        <BudgetHeaderItem>
          <BudgetHeaderLabel>月間売上予算</BudgetHeaderLabel>
          <BudgetHeaderValue>{ctx.fmtCurrency(budgetHeader.monthlyBudget)}</BudgetHeaderValue>
        </BudgetHeaderItem>
        <BudgetHeaderItem>
          <BudgetHeaderLabel>粗利額予算</BudgetHeaderLabel>
          <BudgetHeaderValue>{ctx.fmtCurrency(budgetHeader.grossProfitBudget)}</BudgetHeaderValue>
        </BudgetHeaderItem>
        <BudgetHeaderItem>
          <BudgetHeaderLabel>粗利率予算</BudgetHeaderLabel>
          <BudgetHeaderValue>{formatPercent(budgetHeader.grossProfitRateBudget)}</BudgetHeaderValue>
        </BudgetHeaderItem>
        {budgetHeader.prevYearSales != null && (
          <BudgetHeaderItem>
            <BudgetHeaderLabel>前年売上(同月)</BudgetHeaderLabel>
            <BudgetHeaderValue>{ctx.fmtCurrency(budgetHeader.prevYearSales)}</BudgetHeaderValue>
          </BudgetHeaderItem>
        )}
        {budgetHeader.budgetVsPrevYear != null && (
          <BudgetHeaderItem>
            <BudgetHeaderLabel>予算前年比</BudgetHeaderLabel>
            <BudgetGrowthBadge $positive={budgetHeader.budgetVsPrevYear >= 1}>
              {formatPercent(budgetHeader.budgetVsPrevYear)}
            </BudgetGrowthBadge>
          </BudgetHeaderItem>
        )}
        {budgetHeader.dowGap && (
          <>
            <BudgetHeaderItem>
              <BudgetHeaderLabel>曜日GAP({budgetHeader.dowGap.label})</BudgetHeaderLabel>
              <BudgetHeaderValue>
                {ctx.fmtCurrency(budgetHeader.dowGap.avgImpact)}
              </BudgetHeaderValue>
              <BudgetHeaderLabel>平均</BudgetHeaderLabel>
            </BudgetHeaderItem>
            {budgetHeader.dowGap.actualImpact != null && (
              <BudgetHeaderItem>
                <BudgetHeaderLabel>曜日GAP(実日)</BudgetHeaderLabel>
                <BudgetHeaderValue>
                  {ctx.fmtCurrency(budgetHeader.dowGap.actualImpact)}
                </BudgetHeaderValue>
              </BudgetHeaderItem>
            )}
          </>
        )}
      </BudgetHeaderRow>

      {/* Card Grid (横一列) */}
      <CardGridRow>
        {cards.map((card) => (
          <CondCard
            key={card.key}
            $borderColor={card.signalColor}
            onClick={() => setActiveMetric(card.key)}
          >
            <CondSignal $color={card.signalColor} />
            <CondCardContent>
              <CondCardLabel>{card.label}</CondCardLabel>
              <CondCardValue $color={card.signalColor}>{card.value}</CondCardValue>
              <CondCardSub>{card.sub}</CondCardSub>
            </CondCardContent>
          </CondCard>
        ))}
      </CardGridRow>

      {/* Drill-down Overlay */}
      {activeMetric && activeDef && total && (
        <DrillOverlay onClick={handleClose}>
          <DrillPanel onClick={(e) => e.stopPropagation()}>
            <DrillHeader>
              <DrillTitle>
                {activeDef.icon} {activeDef.label} 店別詳細
              </DrillTitle>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {showBudgetTabs && (
                  <TabGroup>
                    {(
                      [
                        { key: 'monthly', label: '月間予算' },
                        { key: 'elapsed', label: '経過予算' },
                      ] as const
                    ).map((o) => (
                      <TabBtn key={o.key} $active={tab === o.key} onClick={() => setTab(o.key)}>
                        {o.label}
                      </TabBtn>
                    ))}
                  </TabGroup>
                )}
                {hasYoYData && (
                  <YoYBtn $active={showYoY} onClick={() => setShowYoY((p) => !p)}>
                    YoY 前年比 {showYoY ? 'ON' : 'OFF'}
                  </YoYBtn>
                )}
                <DrillCloseBtn onClick={handleClose} aria-label="閉じる">
                  ✕
                </DrillCloseBtn>
              </div>
            </DrillHeader>

            <DrillBody>
              {/* Total Summary */}
              <TotalSection>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <PeriodBadge $color={isMonthly ? '#3b82f6' : '#7c3aed'}>
                    {isMonthly ? `${daysInMonth}日間` : `${effectiveElapsed}日経過`}
                  </PeriodBadge>
                  <SectionLabel>全店合計</SectionLabel>
                </div>

                {isMonthly ? (
                  <MonthlyTotalSection
                    total={total}
                    isRate={activeDef.isRate}
                    showYoY={showYoY && hasYoYData}
                  />
                ) : (
                  <ElapsedTotalSection
                    total={total}
                    isRate={activeDef.isRate}
                    showYoY={showYoY && hasYoYData}
                  />
                )}
              </TotalSection>

              {/* Store Rows (店番順) */}
              <div>
                {rows.map((row, idx) =>
                  isMonthly ? (
                    <MonthlyStoreRow
                      key={row.storeId}
                      row={row}
                      idx={idx}
                      isRate={activeDef.isRate}
                      showYoY={showYoY && hasYoYData}
                    />
                  ) : (
                    <ElapsedStoreRow
                      key={row.storeId}
                      row={row}
                      idx={idx}
                      isRate={activeDef.isRate}
                      showYoY={showYoY && hasYoYData}
                    />
                  ),
                )}
              </div>
            </DrillBody>

            {/* Footer */}
            <Footer>
              <FooterNote>
                {isMonthly
                  ? `月間予算（${daysInMonth}日）`
                  : `経過予算達成（${effectiveElapsed}/${daysInMonth}日）`}
                {showYoY && hasYoYData ? ' + 前年同曜日比' : ''} •{' '}
                {activeDef.isRate
                  ? 'ポイント差'
                  : `単位：${ctx.fmtCurrency(10000).includes('万') ? '万円' : '円'}`}
              </FooterNote>
              {!isMonthly && (
                <LegendGroup>
                  {[
                    { color: '#10b981', label: '達成' },
                    { color: '#eab308', label: '微未達' },
                    { color: '#ef4444', label: '未達' },
                  ].map((item) => (
                    <LegendItem key={item.label}>
                      <LegendDot $color={item.color} />
                      {item.label}
                    </LegendItem>
                  ))}
                </LegendGroup>
              )}
            </Footer>
          </DrillPanel>
        </DrillOverlay>
      )}
    </DashWrapper>
  )
})

// ─── Monthly Total (sub-component) ─────────────────────

interface TotalSectionProps {
  readonly total: EnhancedTotal
  readonly isRate: boolean
  readonly showYoY: boolean
}

function MonthlyTotalSection({ total, isRate, showYoY }: TotalSectionProps) {
  return (
    <div>
      <TotalGrid>
        <TotalCell>
          <SmallLabel>月間予算</SmallLabel>
          <BigValue>{fmtValue(total.budget, isRate)}</BigValue>
        </TotalCell>
        <TotalCell $align="center">
          <SmallLabel>実績</SmallLabel>
          <MainValue>{fmtValue(total.actual, isRate)}</MainValue>
        </TotalCell>
        <TotalCell $align="right">
          <SmallLabel>{isRate ? '差異' : '達成率'}</SmallLabel>
          <AchValue $color={resultColor(total.achievement, isRate)}>
            {fmtAchievement(total.achievement, isRate)}
          </AchValue>
        </TotalCell>
      </TotalGrid>
      {showYoY && total.ly != null && total.yoy != null && (
        <YoYRow>
          <YoYLabel>前年比</YoYLabel>
          <MonoSm>{fmtValue(total.ly, isRate)}</MonoSm>
          <MonoMd $bold>{fmtValue(total.actual, isRate)}</MonoMd>
          <MonoLg $color={resultColor(total.yoy, isRate)} $bold>
            {fmtAchievement(total.yoy, isRate)}
          </MonoLg>
        </YoYRow>
      )}
    </div>
  )
}

// ─── Elapsed Total (sub-component) ─────────────────────

function ElapsedTotalSection({ total, isRate, showYoY }: TotalSectionProps) {
  const achColor = resultColor(total.achievement, isRate)
  return (
    <div>
      <TotalGrid>
        <TotalCell>
          <SmallLabel>経過予算</SmallLabel>
          <BigValue>{fmtValue(total.budget, isRate)}</BigValue>
        </TotalCell>
        <TotalCell $align="center">
          <SmallLabel>実績</SmallLabel>
          <MainValue>{fmtValue(total.actual, isRate)}</MainValue>
        </TotalCell>
        <TotalCell $align="right">
          <SmallLabel>{isRate ? '差異' : '達成率'}</SmallLabel>
          <AchValue $color={achColor}>{fmtAchievement(total.achievement, isRate)}</AchValue>
        </TotalCell>
      </TotalGrid>
      {!isRate && (
        <ProgressTrack>
          <ProgressFill $width={total.achievement} $color={achColor} />
        </ProgressTrack>
      )}
      {showYoY && total.ly != null && total.yoy != null && (
        <YoYRow>
          <YoYLabel>前年比</YoYLabel>
          <MonoSm>{fmtValue(total.ly, isRate)}</MonoSm>
          <MonoMd $bold>{fmtValue(total.actual, isRate)}</MonoMd>
          <MonoLg $color={resultColor(total.yoy, isRate)} $bold>
            {fmtAchievement(total.yoy, isRate)}
          </MonoLg>
        </YoYRow>
      )}
    </div>
  )
}
