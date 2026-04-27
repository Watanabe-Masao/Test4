/**
 * 予算達成 店別ドリルダウンパネル
 *
 * ConditionSummaryEnhanced から抽出。
 * 予算達成メトリクス（売上・粗利額・粗利率・値入率・売変率）の
 * 店別詳細と全店合計を表示する。
 *
 * @responsibility R:unclassified
 */
import { useState, useMemo, useCallback, memo } from 'react'
import type { DashboardWidgetContext } from './DashboardWidgetContext'
import {
  type MetricKey,
  type EnhancedTotal,
  METRIC_DEFS,
  buildRows,
  buildTotalFromResult,
  buildDailyMarkupRateYoYRows,
  fmtValue,
  fmtAchievement,
  resultColor,
} from './ConditionSummaryEnhanced.vm'
import { StoreRow, StoreTableHeader } from './ConditionSummaryEnhancedRows'
import { ConditionSummaryDailyModal } from './ConditionSummaryDailyModal'
import {
  useConditionBudgetDrillPlan,
  type StoreDailyMarkupRateInput,
} from '@/application/hooks/plans/useConditionBudgetDrillPlan'
import { dateRangeToKeys } from '@/domain/models/calendar'
import {
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
  YoYBtn,
  Footer,
  FooterNote,
  LegendDot,
  LegendGroup,
  LegendItem,
  DrillOverlay,
  DrillPanel,
  DrillHeader,
  DrillTitle,
  DrillBody,
  DrillCloseBtn,
} from './ConditionSummaryEnhanced.styles'

/** SP-B ADR-B-002: ctx を Pick で narrow（ConditionSummaryEnhancedProps と同じ subset） */
type BudgetDrillCtx = Pick<
  DashboardWidgetContext,
  | 'fmtCurrency'
  | 'prevYearScope'
  | 'prevYear'
  | 'month'
  | 'prevYearMonthlyKpi'
  | 'year'
  | 'allStoreResults'
  | 'result'
  | 'stores'
  | 'readModels'
  | 'dowGap'
  | 'daysInMonth'
  | 'elapsedDays'
  | 'currentCtsQuantity'
  | 'prevYearStoreCostPrice'
  | 'comparisonScope'
  | 'onPrevYearDetail'
  | 'dataMaxDay'
  | 'queryExecutor'
>

interface BudgetDrillProps {
  readonly ctx: BudgetDrillCtx
  readonly activeMetric: MetricKey
  readonly onClose: () => void
}

export const ConditionSummaryBudgetDrill = memo(function ConditionSummaryBudgetDrill({
  ctx,
  activeMetric,
  onClose,
}: BudgetDrillProps) {
  const [showYoY, setShowYoY] = useState(false)
  const [dailyStoreId, setDailyStoreId] = useState<string | null>(null)

  const { elapsedDays } = ctx
  // ctx.daysInMonth は effectiveEndDay（elapsedDays でキャップ済み）のため、
  // 予算按分には暦上の月日数を使用する（ConditionSummaryEnhanced.tsx と同様）
  const calendarDaysInMonth = new Date(ctx.year, ctx.month, 0).getDate()
  const effectiveElapsed = elapsedDays ?? calendarDaysInMonth
  const activeDef = METRIC_DEFS[activeMetric]

  const hasYoYData =
    ((activeMetric === 'sales' || activeMetric === 'discountRate') && ctx.prevYear.hasPrevYear) ||
    (activeMetric === 'markupRate' &&
      ctx.prevYearStoreCostPrice != null &&
      ctx.prevYearStoreCostPrice.size > 0)

  const rowInput = useMemo(
    () => ({
      allStoreResults: ctx.allStoreResults,
      stores: ctx.stores,
      metric: activeMetric,
      tab: 'elapsed' as const,
      elapsedDays,
      daysInMonth: calendarDaysInMonth,
      prevYear: ctx.prevYear,
      prevYearMonthlyKpi: ctx.prevYearMonthlyKpi,
      prevYearStoreCostPrice: ctx.prevYearStoreCostPrice,
    }),
    [
      ctx.allStoreResults,
      ctx.stores,
      activeMetric,
      elapsedDays,
      calendarDaysInMonth,
      ctx.prevYear,
      ctx.prevYearMonthlyKpi,
      ctx.prevYearStoreCostPrice,
    ],
  )

  const rows = useMemo(() => buildRows(rowInput), [rowInput])
  const total = useMemo(() => buildTotalFromResult(ctx.result, rowInput), [ctx.result, rowInput])

  const handleStoreClick = useCallback((storeId: string) => setDailyStoreId(storeId), [])
  const handleDailyClose = useCallback(() => setDailyStoreId(null), [])

  const dailySr = dailyStoreId ? ctx.allStoreResults.get(dailyStoreId) : null
  const dailyStoreName = dailyStoreId ? (ctx.stores.get(dailyStoreId)?.name ?? dailyStoreId) : ''

  // 値入率日別前年比 — QueryHandler 経由
  const markupInput = useMemo<StoreDailyMarkupRateInput | null>(() => {
    const pyRange = ctx.prevYearScope?.dateRange
    if (!dailyStoreId || activeMetric !== 'markupRate' || !pyRange) return null
    const { fromKey, toKey } = dateRangeToKeys(pyRange)
    return { dateFrom: fromKey, dateTo: toKey, storeId: dailyStoreId }
  }, [dailyStoreId, activeMetric, ctx.prevYearScope])

  const { data: markupOutput } = useConditionBudgetDrillPlan(ctx.queryExecutor, markupInput)

  const effectiveMarkupYoYRows = useMemo(() => {
    const markupData = markupOutput?.data
    if (!dailySr || !dailyStoreId || !markupData || markupData.size === 0) return []
    return buildDailyMarkupRateYoYRows(dailySr, markupData, effectiveElapsed, calendarDaysInMonth)
  }, [markupOutput, dailyStoreId, dailySr, effectiveElapsed, calendarDaysInMonth])

  return (
    <DrillOverlay onClick={onClose}>
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
            <DrillCloseBtn onClick={onClose} aria-label="閉じる">
              ✕
            </DrillCloseBtn>
          </div>
        </DrillHeader>

        <DrillBody>
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

          <StoreTableHeader metric={activeMetric} showYoY={showYoY && hasYoYData} />
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

        <Footer>
          <FooterNote>
            経過予算達成（{effectiveElapsed}/{calendarDaysInMonth}日）
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

      {dailyStoreId && dailySr && (
        <ConditionSummaryDailyModal
          sr={dailySr}
          storeName={dailyStoreName}
          metric={activeMetric}
          elapsedDays={effectiveElapsed}
          daysInMonth={calendarDaysInMonth}
          year={ctx.year}
          month={ctx.month}
          prevYearMonthlyKpi={ctx.prevYearMonthlyKpi}
          hasPrevYear={ctx.prevYear.hasPrevYear}
          fmtCurrency={ctx.fmtCurrency}
          markupRateYoYRows={effectiveMarkupYoYRows}
          prevYearLabel={
            ctx.prevYearScope?.dateRange
              ? `${ctx.prevYearScope.dateRange.from.year}年${ctx.prevYearScope.dateRange.from.month}月`
              : undefined
          }
          onClose={handleDailyClose}
        />
      )}
    </DrillOverlay>
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
