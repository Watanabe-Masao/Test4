import { useState, useMemo, memo, useCallback } from 'react'
import type { WidgetContext } from './types'
import {
  type MetricKey,
  type EnhancedTotal,
  METRIC_DEFS,
  buildRows,
  buildTotalFromResult,
  buildCardSummaries,
  buildBudgetHeader,
  buildDailyMarkupRateYoYRows,
  fmtValue,
  fmtAchievement,
  resultColor,
} from './ConditionSummaryEnhanced.vm'
import { formatPercent } from '@/domain/formatting'
import { StoreRow, StoreTableHeader } from './ConditionSummaryEnhancedRows'
import { ConditionSummaryDailyModal } from './ConditionSummaryDailyModal'
import { useStoreDailyMarkupRateQuery } from '@/application/hooks/duckdb/useStoreDailyMarkupRateQuery'
import {
  DashWrapper,
  Header,
  HeaderMeta,
  HeaderTitle,
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
  const [showYoY, setShowYoY] = useState(false)
  const [dailyStoreId, setDailyStoreId] = useState<string | null>(null)

  const { daysInMonth, elapsedDays } = ctx
  const effectiveElapsed = elapsedDays ?? daysInMonth

  // 共通ヘッダの比較プリセットに連動（同曜日 or 同日）
  const prevYearMode = ctx.comparisonFrame.policy === 'sameDayOfWeek' ? 'sameDow' : 'sameDate'

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

  // ─── Drill-down data (always elapsed mode) ────────────
  const rowInput = useMemo(
    () =>
      activeMetric
        ? {
            allStoreResults: ctx.allStoreResults,
            stores: ctx.stores,
            metric: activeMetric,
            tab: 'elapsed' as const,
            elapsedDays,
            daysInMonth,
            prevYear: ctx.prevYear,
            prevYearMonthlyKpi: ctx.prevYearMonthlyKpi,
            prevYearStoreCostPrice: ctx.prevYearStoreCostPrice,
          }
        : null,
    [
      activeMetric,
      ctx.allStoreResults,
      ctx.stores,
      elapsedDays,
      daysInMonth,
      ctx.prevYear,
      ctx.prevYearMonthlyKpi,
      ctx.prevYearStoreCostPrice,
    ],
  )

  const rows = useMemo(() => (rowInput ? buildRows(rowInput) : []), [rowInput])

  const total = useMemo(
    () => (rowInput ? buildTotalFromResult(ctx.result, rowInput) : null),
    [ctx.result, rowInput],
  )

  const activeDef = activeMetric ? METRIC_DEFS[activeMetric] : null
  const hasYoYData =
    ((activeMetric === 'sales' || activeMetric === 'discountRate') && ctx.prevYear.hasPrevYear) ||
    (activeMetric === 'markupRate' &&
      ctx.prevYearStoreCostPrice != null &&
      ctx.prevYearStoreCostPrice.size > 0)

  const handleClose = useCallback(() => {
    setActiveMetric(null)
    setDailyStoreId(null)
  }, [])

  const handleStoreClick = useCallback((storeId: string) => {
    setDailyStoreId(storeId)
  }, [])

  const handleDailyClose = useCallback(() => {
    setDailyStoreId(null)
  }, [])

  // Daily modal store data
  const dailySr = dailyStoreId ? ctx.allStoreResults.get(dailyStoreId) : null
  const dailyStoreName = dailyStoreId ? (ctx.stores.get(dailyStoreId)?.name ?? dailyStoreId) : ''

  // ── 値入率日別前年比（application hook 経由、daily modal 用） ──
  const markupQueryStoreId =
    dailyStoreId != null && activeMetric === 'markupRate' ? dailyStoreId : null
  const markupDailyQuery = useStoreDailyMarkupRateQuery(
    ctx.duckConn,
    ctx.duckDataVersion ?? 0,
    ctx.prevYearDateRange ?? null,
    markupQueryStoreId,
  )

  const effectiveMarkupYoYRows = useMemo(() => {
    if (markupDailyQuery.queryStoreId !== dailyStoreId || !dailySr) return []
    return buildDailyMarkupRateYoYRows(
      dailySr,
      markupDailyQuery.data,
      effectiveElapsed,
      daysInMonth,
    )
  }, [
    markupDailyQuery.queryStoreId,
    markupDailyQuery.data,
    dailyStoreId,
    dailySr,
    effectiveElapsed,
    daysInMonth,
  ])

  return (
    <DashWrapper>
      {/* Header */}
      <Header>
        <HeaderMeta>CONDITION SUMMARY</HeaderMeta>
        <HeaderTitle>店別 予算達成状況</HeaderTitle>
      </Header>

      {/* Budget Header — click items to drill-down */}
      <BudgetHeaderRow>
        <BudgetHeaderItem
          onClick={() => setActiveMetric('sales')}
          style={{ cursor: 'pointer' }}
          role="button"
          tabIndex={0}
        >
          <BudgetHeaderLabel>月間売上予算</BudgetHeaderLabel>
          <BudgetHeaderValue>{ctx.fmtCurrency(budgetHeader.monthlyBudget)}</BudgetHeaderValue>
        </BudgetHeaderItem>
        <BudgetHeaderItem
          onClick={() => setActiveMetric('gp')}
          style={{ cursor: 'pointer' }}
          role="button"
          tabIndex={0}
        >
          <BudgetHeaderLabel>月間粗利額予算</BudgetHeaderLabel>
          <BudgetHeaderValue>{ctx.fmtCurrency(budgetHeader.grossProfitBudget)}</BudgetHeaderValue>
        </BudgetHeaderItem>
        <BudgetHeaderItem
          onClick={() => setActiveMetric('gpRate')}
          style={{ cursor: 'pointer' }}
          role="button"
          tabIndex={0}
        >
          <BudgetHeaderLabel>月間粗利率予算</BudgetHeaderLabel>
          <BudgetHeaderValue>{formatPercent(budgetHeader.grossProfitRateBudget)}</BudgetHeaderValue>
        </BudgetHeaderItem>
        {budgetHeader.prevYearMonthlySales != null && (
          <BudgetHeaderItem
            onClick={() => {
              setActiveMetric('sales')
              setShowYoY(true)
            }}
            style={{ cursor: 'pointer' }}
            role="button"
            tabIndex={0}
          >
            <BudgetHeaderLabel>月間前年売上</BudgetHeaderLabel>
            <BudgetHeaderValue>
              {ctx.fmtCurrency(budgetHeader.prevYearMonthlySales)}
            </BudgetHeaderValue>
          </BudgetHeaderItem>
        )}
        {budgetHeader.budgetVsPrevYear != null && (
          <BudgetHeaderItem
            onClick={() => {
              setActiveMetric('sales')
              setShowYoY(true)
            }}
            style={{ cursor: 'pointer' }}
            role="button"
            tabIndex={0}
          >
            <BudgetHeaderLabel>予算前年比</BudgetHeaderLabel>
            <BudgetGrowthBadge $positive={budgetHeader.budgetVsPrevYear >= 1}>
              {formatPercent(budgetHeader.budgetVsPrevYear)}
            </BudgetGrowthBadge>
          </BudgetHeaderItem>
        )}
        {/* 曜日GAPは同日比較時のみ表示（同曜日比較では曜日が揃うためGAPなし） */}
        {prevYearMode === 'sameDate' && budgetHeader.dowGap && (
          <>
            <BudgetHeaderItem
              onClick={() => ctx.onPrevYearDetail('sameDate')}
              style={{ cursor: 'pointer' }}
              role="button"
              tabIndex={0}
            >
              <BudgetHeaderLabel>曜日GAP({budgetHeader.dowGap.label})</BudgetHeaderLabel>
              <BudgetHeaderValue>
                {ctx.fmtCurrency(budgetHeader.dowGap.avgImpact)}
              </BudgetHeaderValue>
              <BudgetHeaderLabel>平均</BudgetHeaderLabel>
            </BudgetHeaderItem>
            {budgetHeader.dowGap.actualImpact != null && (
              <BudgetHeaderItem
                onClick={() => ctx.onPrevYearDetail('sameDate')}
                style={{ cursor: 'pointer' }}
                role="button"
                tabIndex={0}
              >
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
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {hasYoYData && (
                  <YoYBtn $active={showYoY} onClick={() => setShowYoY((p) => !p)}>
                    前年比 {showYoY ? 'ON' : 'OFF'}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <PeriodBadge $color="#7c3aed">{effectiveElapsed}日経過</PeriodBadge>
                  <SectionLabel>全店合計</SectionLabel>
                </div>
                <ElapsedTotalSection
                  total={total}
                  isRate={activeDef.isRate}
                  showYoY={showYoY && hasYoYData}
                />
              </TotalSection>

              {/* Table Header */}
              <StoreTableHeader metric={activeMetric} showYoY={showYoY && hasYoYData} />

              {/* Store Rows (店番順) */}
              <div>
                {rows.map((row) => (
                  <StoreRow
                    key={row.storeId}
                    row={row}
                    metric={activeMetric}
                    isRate={activeDef.isRate}
                    showYoY={showYoY && hasYoYData}
                    onStoreClick={handleStoreClick}
                  />
                ))}
              </div>
            </DrillBody>

            {/* Footer */}
            <Footer>
              <FooterNote>
                経過予算達成（{effectiveElapsed}/{daysInMonth}日）
                {showYoY && hasYoYData ? ' + 前年同曜日比' : ''} •{' '}
                {activeDef.isRate
                  ? 'ポイント差'
                  : `単位：${ctx.fmtCurrency(10000).includes('万') ? '万円' : '円'}`}
              </FooterNote>
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
            </Footer>
          </DrillPanel>

          {/* Daily Detail Modal (store click) */}
          {dailyStoreId && dailySr && activeMetric && (
            <ConditionSummaryDailyModal
              sr={dailySr}
              storeName={dailyStoreName}
              metric={activeMetric}
              elapsedDays={effectiveElapsed}
              daysInMonth={daysInMonth}
              prevYearMonthlyKpi={ctx.prevYearMonthlyKpi}
              hasPrevYear={ctx.prevYear.hasPrevYear}
              fmtCurrency={ctx.fmtCurrency}
              markupRateYoYRows={effectiveMarkupYoYRows}
              onClose={handleDailyClose}
            />
          )}
        </DrillOverlay>
      )}
    </DashWrapper>
  )
})

// ─── Elapsed Total (sub-component) ─────────────────────

interface TotalSectionProps {
  readonly total: EnhancedTotal
  readonly isRate: boolean
  readonly showYoY: boolean
}

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
