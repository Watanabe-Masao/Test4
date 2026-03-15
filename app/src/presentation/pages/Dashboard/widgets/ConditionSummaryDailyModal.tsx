import { memo, useState, useMemo, useCallback } from 'react'
import type { StoreResult } from '@/domain/models'
import type { PrevYearMonthlyKpi } from '@/application/hooks'
import type { MetricKey, DailyDetailRow, DailyYoYRow } from './ConditionSummaryEnhanced.vm'
import {
  METRIC_DEFS,
  buildDailyDetailRows,
  buildDailyYoYRows,
  fmtValue,
  fmtAchievement,
  resultColor,
} from './ConditionSummaryEnhanced.vm'
import {
  DrillOverlay,
  DailyModalPanel,
  DrillHeader,
  DrillTitle,
  DrillCloseBtn,
  DailyTableWrapper,
  DailyTable,
  DailyTh,
  DailyTd,
  DailyTr,
  Footer,
  FooterNote,
  YoYBtn,
} from './ConditionSummaryEnhanced.styles'

interface DailyModalProps {
  readonly sr: StoreResult
  readonly storeName: string
  readonly metric: MetricKey
  readonly elapsedDays: number
  readonly daysInMonth: number
  readonly prevYearMonthlyKpi: PrevYearMonthlyKpi
  readonly hasPrevYear: boolean
  readonly fmtCurrency: (n: number) => string
  readonly onClose: () => void
}

export const ConditionSummaryDailyModal = memo(function ConditionSummaryDailyModal({
  sr,
  storeName,
  metric,
  elapsedDays,
  daysInMonth,
  prevYearMonthlyKpi,
  hasPrevYear,
  fmtCurrency,
  onClose,
}: DailyModalProps) {
  const [showYoY, setShowYoY] = useState(false)
  const def = METRIC_DEFS[metric]
  const isRate = def.isRate
  const hasYoY = metric === 'sales' && hasPrevYear

  const rows = useMemo(
    () => buildDailyDetailRows(sr, metric, elapsedDays, daysInMonth),
    [sr, metric, elapsedDays, daysInMonth],
  )

  const yoyRows = useMemo(
    () =>
      hasYoY ? buildDailyYoYRows(sr, sr.storeId, prevYearMonthlyKpi, elapsedDays, daysInMonth) : [],
    [sr, hasYoY, prevYearMonthlyKpi, elapsedDays, daysInMonth],
  )

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onClose()
    },
    [onClose],
  )

  return (
    <DrillOverlay onClick={handleOverlayClick}>
      <DailyModalPanel onClick={(e) => e.stopPropagation()}>
        <DrillHeader>
          <DrillTitle>
            {storeName} — {def.label} 日別詳細
          </DrillTitle>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {hasYoY && (
              <YoYBtn $active={showYoY} onClick={() => setShowYoY((p) => !p)}>
                前年比 {showYoY ? 'ON' : 'OFF'}
              </YoYBtn>
            )}
            <DrillCloseBtn onClick={onClose} aria-label="閉じる">
              ✕
            </DrillCloseBtn>
          </div>
        </DrillHeader>

        <DailyTableWrapper>
          {showYoY && hasYoY ? (
            <YoYTable rows={yoyRows} fmtCurrency={fmtCurrency} />
          ) : isRate ? (
            <RateTable rows={rows} />
          ) : (
            <AmountTable rows={rows} fmtCurrency={fmtCurrency} />
          )}
        </DailyTableWrapper>

        <Footer>
          <FooterNote>
            {elapsedDays ?? daysInMonth}日経過 / {daysInMonth}日間
            {showYoY ? ' — 前年同曜日比' : ''}
          </FooterNote>
        </Footer>
      </DailyModalPanel>
    </DrillOverlay>
  )
})

// ─── Amount table (sales, gp) ────────────────────────────

function AmountTable({
  rows,
  fmtCurrency,
}: {
  readonly rows: readonly DailyDetailRow[]
  readonly fmtCurrency: (n: number) => string
}) {
  return (
    <DailyTable>
      <thead>
        <tr>
          <DailyTh $align="center">日</DailyTh>
          <DailyTh>予算</DailyTh>
          <DailyTh>実績</DailyTh>
          <DailyTh>差異</DailyTh>
          <DailyTh>達成率</DailyTh>
          <DailyTh>累計予算</DailyTh>
          <DailyTh>累計実績</DailyTh>
          <DailyTh>累計差</DailyTh>
          <DailyTh>累計達成</DailyTh>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const achColor = resultColor(r.achievement, false)
          const cumAchColor = resultColor(r.cumAchievement, false)
          return (
            <DailyTr key={r.day}>
              <DailyTd style={{ textAlign: 'center' }}>{r.day}</DailyTd>
              <DailyTd>{fmtCurrency(r.budget)}</DailyTd>
              <DailyTd $bold>{fmtCurrency(r.actual)}</DailyTd>
              <DailyTd $color={r.diff >= 0 ? '#10b981' : '#ef4444'}>
                {r.diff >= 0 ? '+' : ''}
                {fmtCurrency(r.diff)}
              </DailyTd>
              <DailyTd $color={achColor} $bold>
                {fmtAchievement(r.achievement, false)}
              </DailyTd>
              <DailyTd>{fmtCurrency(r.cumBudget)}</DailyTd>
              <DailyTd $bold>{fmtCurrency(r.cumActual)}</DailyTd>
              <DailyTd $color={r.cumDiff >= 0 ? '#10b981' : '#ef4444'}>
                {r.cumDiff >= 0 ? '+' : ''}
                {fmtCurrency(r.cumDiff)}
              </DailyTd>
              <DailyTd $color={cumAchColor} $bold>
                {fmtAchievement(r.cumAchievement, false)}
              </DailyTd>
            </DailyTr>
          )
        })}
      </tbody>
    </DailyTable>
  )
}

// ─── Rate table (gpRate, markupRate, discountRate) ────────

function RateTable({ rows }: { readonly rows: readonly DailyDetailRow[] }) {
  return (
    <DailyTable>
      <thead>
        <tr>
          <DailyTh $align="center">日</DailyTh>
          <DailyTh>当日値</DailyTh>
          <DailyTh>累計平均</DailyTh>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <DailyTr key={r.day}>
            <DailyTd style={{ textAlign: 'center' }}>{r.day}</DailyTd>
            <DailyTd $bold>{fmtValue(r.actual, true)}</DailyTd>
            <DailyTd>{r.day > 0 ? fmtValue(r.cumActual / r.day, true) : '—'}</DailyTd>
          </DailyTr>
        ))}
      </tbody>
    </DailyTable>
  )
}

// ─── YoY table ───────────────────────────────────────────

function YoYTable({
  rows,
  fmtCurrency,
}: {
  readonly rows: readonly DailyYoYRow[]
  readonly fmtCurrency: (n: number) => string
}) {
  return (
    <DailyTable>
      <thead>
        <tr>
          <DailyTh $align="center">日</DailyTh>
          <DailyTh>前年</DailyTh>
          <DailyTh>当年</DailyTh>
          <DailyTh>前年比</DailyTh>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const yoyColor = resultColor(r.yoy, false)
          return (
            <DailyTr key={r.day}>
              <DailyTd style={{ textAlign: 'center' }}>{r.day}</DailyTd>
              <DailyTd>{fmtCurrency(r.prevActual)}</DailyTd>
              <DailyTd $bold>{fmtCurrency(r.curActual)}</DailyTd>
              <DailyTd $color={yoyColor} $bold>
                {r.prevActual > 0 ? fmtAchievement(r.yoy, false) : '—'}
              </DailyTd>
            </DailyTr>
          )
        })}
      </tbody>
    </DailyTable>
  )
}
