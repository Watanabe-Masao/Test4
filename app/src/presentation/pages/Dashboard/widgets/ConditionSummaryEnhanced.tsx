import { useState, useMemo, memo } from 'react'
import type { MetricKey } from './conditionSummaryEnhancedMock'
import {
  STORES,
  TOTAL_DAYS,
  ELAPSED_DAYS,
  MONTHLY,
  ELAPSED,
  METRICS,
  fmtValue,
  fmtResult,
  resultColor,
  computeRow,
  computeTotal,
} from './conditionSummaryEnhancedMock'
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

type TabKey = 'monthly' | 'elapsed'

export const ConditionSummaryEnhanced = memo(function ConditionSummaryEnhanced() {
  const [metric, setMetric] = useState<MetricKey>('sales')
  const [tab, setTab] = useState<TabKey>('elapsed')
  const [showYoY, setShowYoY] = useState(false)

  const m = METRICS[metric]
  const isMonthly = tab === 'monthly'
  const dataset = isMonthly ? MONTHLY : ELAPSED

  const rows = useMemo(() => STORES.map((store) => computeRow(store, dataset, m)), [dataset, m])

  const total = useMemo(() => computeTotal(dataset, m), [dataset, m])

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => (isMonthly ? b.budget - a.budget : b.ach - a.ach)),
    [rows, isMonthly],
  )

  return (
    <DashWrapper>
      {/* Header */}
      <Header>
        <HeaderMeta>CONDITION SUMMARY</HeaderMeta>
        <HeaderTitle>店別 予算達成状況</HeaderTitle>

        <HeaderControls>
          <TabGroup>
            {[
              { key: 'monthly' as const, label: '月間予算' },
              { key: 'elapsed' as const, label: '経過予算' },
            ].map((o) => (
              <TabBtn key={o.key} $active={tab === o.key} onClick={() => setTab(o.key)}>
                {o.label}
              </TabBtn>
            ))}
          </TabGroup>
          <YoYBtn $active={showYoY} onClick={() => setShowYoY((p) => !p)}>
            📅 前年比 {showYoY ? 'ON' : 'OFF'}
          </YoYBtn>
        </HeaderControls>

        <MetricRow>
          {(Object.entries(METRICS) as [MetricKey, typeof m][]).map(([key, val]) => (
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
          ))}
        </MetricRow>
      </Header>

      {/* Total Summary */}
      <TotalSection>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <PeriodBadge $color={isMonthly ? '#3b82f6' : '#7c3aed'}>
            {isMonthly ? `${TOTAL_DAYS}日間` : `${ELAPSED_DAYS}日経過`}
          </PeriodBadge>
          <SectionLabel>全店合計</SectionLabel>
        </div>

        {isMonthly ? (
          <MonthlyTotal total={total} m={m} showYoY={showYoY} />
        ) : (
          <ElapsedTotal total={total} m={m} showYoY={showYoY} />
        )}
      </TotalSection>

      {/* Store Rows */}
      <div>
        {sortedRows.map((row, idx) =>
          isMonthly ? (
            <MonthlyStoreRow key={row.store} row={row} idx={idx} m={m} showYoY={showYoY} />
          ) : (
            <ElapsedStoreRow key={row.store} row={row} idx={idx} m={m} showYoY={showYoY} />
          ),
        )}
      </div>

      {/* Footer */}
      <Footer>
        <FooterNote>
          {isMonthly
            ? `月間予算（${TOTAL_DAYS}日）`
            : `経過予算達成（${ELAPSED_DAYS}/${TOTAL_DAYS}日）`}
          {showYoY ? ' + 前年同曜日比' : ''} • {m.isRate ? 'ポイント差' : '単位：万円'}
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

interface TotalSummaryProps {
  readonly total: {
    budget: number
    actual: number
    ly: number
    ach: number
    diff: number
    yoy: number
  }
  readonly m: (typeof METRICS)[MetricKey]
  readonly showYoY: boolean
}

function MonthlyTotal({ total, m, showYoY }: TotalSummaryProps) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div>
          <SmallLabel>月間予算</SmallLabel>
          <BigValue>{fmtValue(total.budget, m.isRate)}</BigValue>
        </div>
        {showYoY && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, opacity: 0.5, marginBottom: 4, fontWeight: 500 }}>
              📅 前年比（{ELAPSED_DAYS}日経過）
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <MonoSm>{fmtValue(total.ly, m.isRate)}</MonoSm>
              <Arrow>→</Arrow>
              <MonoMd $bold>{fmtValue(total.actual, m.isRate)}</MonoMd>
              <MonoLg $color={resultColor(total.yoy, m.isRate)} $bold>
                {fmtResult(total.yoy, m.isRate)}
              </MonoLg>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Elapsed Total (sub-component) ─────────────────────

function ElapsedTotal({ total, m, showYoY }: TotalSummaryProps) {
  const achColor = resultColor(total.ach, m.isRate)
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <div>
            <SmallLabel>経過予算</SmallLabel>
            <SubValue>{fmtValue(total.budget, m.isRate)}</SubValue>
          </div>
          <Arrow>→</Arrow>
          <div>
            <SmallLabel>実績</SmallLabel>
            <MainValue>{fmtValue(total.actual, m.isRate)}</MainValue>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <SmallLabel>{m.isRate ? '差異' : '達成率'}</SmallLabel>
          <AchValue $color={achColor}>{fmtResult(total.ach, m.isRate)}</AchValue>
        </div>
      </div>
      {!m.isRate && (
        <div style={{ marginTop: 10 }}>
          <ProgressTrack>
            <ProgressFill $width={total.ach} $color={achColor} />
          </ProgressTrack>
        </div>
      )}
      {showYoY && (
        <YoYRow>
          <YoYLabel>📅 前年比</YoYLabel>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <MonoSm>{fmtValue(total.ly, m.isRate)}</MonoSm>
            <Arrow>→</Arrow>
            <MonoMd $bold>{fmtValue(total.actual, m.isRate)}</MonoMd>
            <MonoLg $color={resultColor(total.yoy, m.isRate)} $bold>
              {fmtResult(total.yoy, m.isRate)}
            </MonoLg>
          </div>
        </YoYRow>
      )}
    </div>
  )
}
