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
  fmtValue,
  fmtAchievement,
  resultColor,
} from './ConditionSummaryEnhanced.vm'
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
  PeriodBadge,
  SectionLabel,
  SmallLabel,
  BigValue,
  SubValue,
  MainValue,
  AchValue,
  Arrow,
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
                    📅 前年比 {showYoY ? 'ON' : 'OFF'}
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
                <div style={{ display: 'flex', gap: 12, fontSize: 10, color: '#3e4a5e' }}>
                  {[
                    { color: '#10b981', label: '達成' },
                    { color: '#eab308', label: '微未達' },
                    { color: '#ef4444', label: '未達' },
                  ].map((item) => (
                    <span
                      key={item.label}
                      style={{ display: 'flex', alignItems: 'center', gap: 3 }}
                    >
                      <LegendDot $color={item.color} />
                      {item.label}
                    </span>
                  ))}
                </div>
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
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div>
          <SmallLabel>月間予算</SmallLabel>
          <BigValue>{fmtValue(total.budget, isRate)}</BigValue>
        </div>
        {showYoY && total.ly != null && total.yoy != null && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, opacity: 0.5, marginBottom: 4, fontWeight: 500 }}>
              📅 前年比
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <MonoSm>{fmtValue(total.ly, isRate)}</MonoSm>
              <Arrow>→</Arrow>
              <MonoMd $bold>{fmtValue(total.actual, isRate)}</MonoMd>
              <MonoLg $color={resultColor(total.yoy, isRate)} $bold>
                {fmtAchievement(total.yoy, isRate)}
              </MonoLg>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Elapsed Total (sub-component) ─────────────────────

function ElapsedTotalSection({ total, isRate, showYoY }: TotalSectionProps) {
  const achColor = resultColor(total.achievement, isRate)
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <div>
            <SmallLabel>経過予算</SmallLabel>
            <SubValue>{fmtValue(total.budget, isRate)}</SubValue>
          </div>
          <Arrow>→</Arrow>
          <div>
            <SmallLabel>実績</SmallLabel>
            <MainValue>{fmtValue(total.actual, isRate)}</MainValue>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <SmallLabel>{isRate ? '差異' : '達成率'}</SmallLabel>
          <AchValue $color={achColor}>{fmtAchievement(total.achievement, isRate)}</AchValue>
        </div>
      </div>
      {!isRate && (
        <div style={{ marginTop: 10 }}>
          <ProgressTrack>
            <ProgressFill $width={total.achievement} $color={achColor} />
          </ProgressTrack>
        </div>
      )}
      {showYoY && total.ly != null && total.yoy != null && (
        <YoYRow>
          <YoYLabel>📅 前年比</YoYLabel>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <MonoSm>{fmtValue(total.ly, isRate)}</MonoSm>
            <Arrow>→</Arrow>
            <MonoMd $bold>{fmtValue(total.actual, isRate)}</MonoMd>
            <MonoLg $color={resultColor(total.yoy, isRate)} $bold>
              {fmtAchievement(total.yoy, isRate)}
            </MonoLg>
          </div>
        </YoYRow>
      )}
    </div>
  )
}
