import { useState, useMemo, memo } from 'react'
import type { WidgetContext } from './types'
import {
  type MetricKey,
  type PeriodTab,
  type EnhancedTotal,
  METRIC_DEFS,
  buildRows,
  buildTotalFromResult,
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
  HeaderControls,
  TabGroup,
  TabBtn,
  YoYBtn,
  MetricRow,
  MetricBtn,
  MetricIcon,
  MetricLabel,
  TotalSection,
  PeriodBadge,
  SectionLabel,
  BigValue,
  SubValue,
  MainValue,
  AchValue,
  SmallLabel,
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
} from './ConditionSummaryEnhanced.styles'

// ─── Component ──────────────────────────────────────────

export const ConditionSummaryEnhanced = memo(function ConditionSummaryEnhanced({
  ctx,
}: {
  readonly ctx: WidgetContext
}) {
  const [metric, setMetric] = useState<MetricKey>('sales')
  const [tab, setTab] = useState<PeriodTab>('elapsed')
  const [showYoY, setShowYoY] = useState(false)

  const def = METRIC_DEFS[metric]
  const isMonthly = tab === 'monthly'
  const { daysInMonth, elapsedDays } = ctx
  const effectiveElapsed = elapsedDays ?? daysInMonth

  const rowInput = useMemo(
    () => ({
      allStoreResults: ctx.allStoreResults,
      stores: ctx.stores,
      metric,
      tab,
      elapsedDays,
      daysInMonth,
      prevYear: ctx.prevYear,
      prevYearMonthlyKpi: ctx.prevYearMonthlyKpi,
    }),
    [
      ctx.allStoreResults,
      ctx.stores,
      metric,
      tab,
      elapsedDays,
      daysInMonth,
      ctx.prevYear,
      ctx.prevYearMonthlyKpi,
    ],
  )

  const rows = useMemo(() => buildRows(rowInput), [rowInput])

  const total = useMemo(() => buildTotalFromResult(ctx.result, rowInput), [ctx.result, rowInput])

  const sortedRows = useMemo(
    () =>
      [...rows].sort((a, b) => (isMonthly ? b.budget - a.budget : b.achievement - a.achievement)),
    [rows, isMonthly],
  )

  const hasYoYData = metric === 'sales' && ctx.prevYear.hasPrevYear

  return (
    <DashWrapper>
      {/* Header */}
      <Header>
        <HeaderMeta>CONDITION SUMMARY</HeaderMeta>
        <HeaderTitle>店別 予算達成状況</HeaderTitle>

        <HeaderControls>
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
          {hasYoYData && (
            <YoYBtn $active={showYoY} onClick={() => setShowYoY((p) => !p)}>
              📅 前年比 {showYoY ? 'ON' : 'OFF'}
            </YoYBtn>
          )}
        </HeaderControls>

        <MetricRow>
          {(Object.entries(METRIC_DEFS) as [MetricKey, (typeof METRIC_DEFS)[MetricKey]][]).map(
            ([key, val]) => (
              <MetricBtn
                key={key}
                $active={metric === key}
                $color={val.color}
                onClick={() => setMetric(key)}
              >
                <MetricIcon>{val.icon}</MetricIcon>
                <MetricLabel $active={metric === key} $color={val.color}>
                  {val.label}
                </MetricLabel>
              </MetricBtn>
            ),
          )}
        </MetricRow>
      </Header>

      {/* Total Summary */}
      <TotalSection>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <PeriodBadge $color={isMonthly ? '#3b82f6' : '#7c3aed'}>
            {isMonthly ? `${daysInMonth}日間` : `${effectiveElapsed}日経過`}
          </PeriodBadge>
          <SectionLabel>全店合計</SectionLabel>
        </div>

        {isMonthly ? (
          <MonthlyTotalSection total={total} isRate={def.isRate} showYoY={showYoY && hasYoYData} />
        ) : (
          <ElapsedTotalSection total={total} isRate={def.isRate} showYoY={showYoY && hasYoYData} />
        )}
      </TotalSection>

      {/* Store Rows */}
      <div>
        {sortedRows.map((row, idx) =>
          isMonthly ? (
            <MonthlyStoreRow
              key={row.storeId}
              row={row}
              idx={idx}
              isRate={def.isRate}
              showYoY={showYoY && hasYoYData}
            />
          ) : (
            <ElapsedStoreRow
              key={row.storeId}
              row={row}
              idx={idx}
              isRate={def.isRate}
              showYoY={showYoY && hasYoYData}
            />
          ),
        )}
      </div>

      {/* Footer */}
      <Footer>
        <FooterNote>
          {isMonthly
            ? `月間予算（${daysInMonth}日）`
            : `経過予算達成（${effectiveElapsed}/${daysInMonth}日）`}
          {showYoY && hasYoYData ? ' + 前年同曜日比' : ''} •{' '}
          {def.isRate
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
              <span key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <LegendDot $color={item.color} />
                {item.label}
              </span>
            ))}
          </div>
        )}
      </Footer>
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
