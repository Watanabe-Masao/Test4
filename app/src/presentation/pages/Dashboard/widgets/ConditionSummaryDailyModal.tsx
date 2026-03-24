import { memo, useState, useMemo, useCallback } from 'react'
import { DISCOUNT_TYPES } from '@/domain/models/record'
import type { StoreResult } from '@/domain/models/storeTypes'
import type { PrevYearMonthlyKpi } from '@/application/hooks/analytics'
import type {
  MetricKey,
  DailyDetailRow,
  DailyYoYRow,
  DailyDiscountRow,
  DailyDiscountRateYoYRow,
  DailyMarkupRateYoYRow,
} from './ConditionSummaryEnhanced.vm'
import {
  METRIC_DEFS,
  buildDailyDetailRows,
  buildDailyYoYRows,
  buildDailyDiscountRows,
  buildDailyDiscountRateYoYRows,
  fmtValue,
  fmtAchievement,
  resultColor,
  rateDiffColor,
} from './ConditionSummaryEnhanced.vm'
import {
  DrillOverlay,
  DailyModalPanel,
  DrillHeader,
  DrillTitle,
  DrillCloseBtn,
  DailyTableWrapper,
  DailyTable,
  DailyGroupTh,
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
  /** 値入率日別前年比行（親で DuckDB query 済み） */
  readonly markupRateYoYRows?: readonly DailyMarkupRateYoYRow[]
  /** 前年比較期間の表示文字列（例: "2025年3月"） */
  readonly prevYearLabel?: string
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
  markupRateYoYRows = [],
  prevYearLabel,
  onClose,
}: DailyModalProps) {
  const [showYoY, setShowYoY] = useState(false)
  const def = METRIC_DEFS[metric]
  const isRate = def.isRate
  const hasYoY =
    ((metric === 'sales' || metric === 'discountRate') && hasPrevYear) ||
    (metric === 'markupRate' && markupRateYoYRows.length > 0)

  const rows = useMemo(
    () => buildDailyDetailRows(sr, metric, elapsedDays, daysInMonth),
    [sr, metric, elapsedDays, daysInMonth],
  )

  const yoyRows = useMemo(
    () =>
      metric === 'sales' && hasPrevYear
        ? buildDailyYoYRows(sr, sr.storeId, prevYearMonthlyKpi, elapsedDays, daysInMonth)
        : [],
    [sr, metric, hasPrevYear, prevYearMonthlyKpi, elapsedDays, daysInMonth],
  )

  const discountRateYoYRows = useMemo(
    () =>
      metric === 'discountRate' && hasPrevYear
        ? buildDailyDiscountRateYoYRows(
            sr,
            sr.storeId,
            prevYearMonthlyKpi,
            elapsedDays,
            daysInMonth,
          )
        : [],
    [sr, metric, hasPrevYear, prevYearMonthlyKpi, elapsedDays, daysInMonth],
  )

  const discountRows = useMemo(
    () => (metric === 'discountRate' ? buildDailyDiscountRows(sr, elapsedDays, daysInMonth) : []),
    [sr, metric, elapsedDays, daysInMonth],
  )

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onClose()
    },
    [onClose],
  )

  const prevYearNote = prevYearLabel ? ` — 比較: ${prevYearLabel}（同曜日）` : ' — 前年同曜日比'

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
          {showYoY && metric === 'sales' ? (
            <YoYTable rows={yoyRows} fmtCurrency={fmtCurrency} />
          ) : showYoY && metric === 'discountRate' ? (
            <DiscountRateYoYTable rows={discountRateYoYRows} />
          ) : showYoY && metric === 'markupRate' ? (
            <MarkupRateYoYTable rows={markupRateYoYRows} />
          ) : metric === 'discountRate' ? (
            <DiscountTable rows={discountRows} fmtCurrency={fmtCurrency} />
          ) : isRate ? (
            <RateTable rows={rows} metric={metric} />
          ) : (
            <AmountTable rows={rows} fmtCurrency={fmtCurrency} />
          )}
        </DailyTableWrapper>

        <Footer>
          <FooterNote>
            {elapsedDays ?? daysInMonth}日経過 / {daysInMonth}日間
            {showYoY ? prevYearNote : ''}
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
          <DailyGroupTh rowSpan={2} $align="center">
            日
          </DailyGroupTh>
          <DailyGroupTh colSpan={4}>単日</DailyGroupTh>
          <DailyGroupTh colSpan={4} $group>
            累計
          </DailyGroupTh>
        </tr>
        <tr>
          <DailyTh>予算</DailyTh>
          <DailyTh>実績</DailyTh>
          <DailyTh>差異</DailyTh>
          <DailyTh>達成率</DailyTh>
          <DailyTh $group>予算</DailyTh>
          <DailyTh>実績</DailyTh>
          <DailyTh>差異</DailyTh>
          <DailyTh>達成率</DailyTh>
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
              <DailyTd $group>{fmtCurrency(r.cumBudget)}</DailyTd>
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

// ─── Rate table (gpRate, markupRate) ─────────────────────

function RateTable({
  rows,
  metric,
}: {
  readonly rows: readonly DailyDetailRow[]
  readonly metric: MetricKey
}) {
  const hasBudget = metric === 'gpRate' || metric === 'markupRate'
  return (
    <DailyTable>
      <thead>
        <tr>
          <DailyGroupTh rowSpan={2} $align="center">
            日
          </DailyGroupTh>
          <DailyGroupTh colSpan={hasBudget ? 3 : 1}>単日</DailyGroupTh>
          <DailyGroupTh colSpan={hasBudget ? 3 : 1} $group>
            累計
          </DailyGroupTh>
        </tr>
        <tr>
          {hasBudget && <DailyTh>予算</DailyTh>}
          <DailyTh>実績</DailyTh>
          {hasBudget && <DailyTh>差異</DailyTh>}
          {hasBudget && <DailyTh $group>予算</DailyTh>}
          {!hasBudget && <DailyTh $group>累計平均</DailyTh>}
          {hasBudget && <DailyTh>実績</DailyTh>}
          {hasBudget && <DailyTh>差異</DailyTh>}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const cumAvg = r.day > 0 ? r.cumActual / r.day : 0
          const diffColor = rateDiffColor(r.achievement)
          const cumDiffColor = rateDiffColor(r.cumAchievement)
          return (
            <DailyTr key={r.day}>
              <DailyTd style={{ textAlign: 'center' }}>{r.day}</DailyTd>
              {hasBudget && <DailyTd>{fmtValue(r.budget, true)}</DailyTd>}
              <DailyTd $bold>{fmtValue(r.actual, true)}</DailyTd>
              {hasBudget && (
                <DailyTd $color={diffColor} $bold>
                  {r.achievement >= 0 ? '+' : ''}
                  {r.achievement.toFixed(2)}pt
                </DailyTd>
              )}
              {hasBudget ? (
                <>
                  <DailyTd $group>{fmtValue(r.budget, true)}</DailyTd>
                  <DailyTd $bold>{r.day > 0 ? fmtValue(cumAvg, true) : '—'}</DailyTd>
                  <DailyTd $color={cumDiffColor} $bold>
                    {r.cumAchievement >= 0 ? '+' : ''}
                    {r.cumAchievement.toFixed(2)}pt
                  </DailyTd>
                </>
              ) : (
                <DailyTd $group>{r.day > 0 ? fmtValue(cumAvg, true) : '—'}</DailyTd>
              )}
            </DailyTr>
          )
        })}
      </tbody>
    </DailyTable>
  )
}

// ─── Discount breakdown table (71/72/73/74) ──────────────

function DiscountTable({
  rows,
  fmtCurrency,
}: {
  readonly rows: readonly DailyDiscountRow[]
  readonly fmtCurrency: (n: number) => string
}) {
  return (
    <DailyTable>
      <thead>
        <tr>
          <DailyGroupTh rowSpan={2} $align="center">
            日
          </DailyGroupTh>
          <DailyGroupTh colSpan={2 + DISCOUNT_TYPES.length}>単日 内訳</DailyGroupTh>
          <DailyGroupTh colSpan={2} $group>
            累計
          </DailyGroupTh>
        </tr>
        <tr>
          <DailyTh>売変率</DailyTh>
          <DailyTh>売変額</DailyTh>
          {DISCOUNT_TYPES.map((dt) => (
            <DailyTh key={dt.type}>{dt.label}</DailyTh>
          ))}
          <DailyTh $group>累計率</DailyTh>
          <DailyTh>累計額</DailyTh>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <DailyTr key={r.day}>
            <DailyTd style={{ textAlign: 'center' }}>{r.day}</DailyTd>
            <DailyTd $bold>{fmtValue(r.totalRate, true)}</DailyTd>
            <DailyTd>{fmtCurrency(r.totalAmount)}</DailyTd>
            {DISCOUNT_TYPES.map((dt) => {
              const entry = r.entries.find((e) => e.type === dt.type)
              return (
                <DailyTd key={dt.type}>
                  {entry && entry.amount > 0 ? fmtCurrency(entry.amount) : '—'}
                </DailyTd>
              )
            })}
            <DailyTd $group $bold>
              {fmtValue(r.cumTotalRate, true)}
            </DailyTd>
            <DailyTd>{fmtCurrency(r.cumTotalAmount)}</DailyTd>
          </DailyTr>
        ))}
      </tbody>
    </DailyTable>
  )
}

// ─── YoY table (sales) ──────────────────────────────────

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
          <DailyGroupTh rowSpan={2} $align="center">
            日
          </DailyGroupTh>
          <DailyGroupTh colSpan={4}>単日</DailyGroupTh>
          <DailyGroupTh colSpan={4} $group>
            累計
          </DailyGroupTh>
        </tr>
        <tr>
          <DailyTh>前年</DailyTh>
          <DailyTh>当年</DailyTh>
          <DailyTh>差異</DailyTh>
          <DailyTh>前年比</DailyTh>
          <DailyTh $group>前年</DailyTh>
          <DailyTh>当年</DailyTh>
          <DailyTh>差異</DailyTh>
          <DailyTh>前年比</DailyTh>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const yoyColor = resultColor(r.yoy, false)
          const cumYoYColor = resultColor(r.cumYoY, false)
          return (
            <DailyTr key={r.day}>
              <DailyTd style={{ textAlign: 'center' }}>{r.day}</DailyTd>
              <DailyTd>{fmtCurrency(r.prevActual)}</DailyTd>
              <DailyTd $bold>{fmtCurrency(r.curActual)}</DailyTd>
              <DailyTd $color={r.diff >= 0 ? '#10b981' : '#ef4444'}>
                {r.diff >= 0 ? '+' : ''}
                {fmtCurrency(r.diff)}
              </DailyTd>
              <DailyTd $color={yoyColor} $bold>
                {r.prevActual > 0 ? fmtAchievement(r.yoy, false) : '—'}
              </DailyTd>
              <DailyTd $group>{fmtCurrency(r.cumPrevActual)}</DailyTd>
              <DailyTd $bold>{fmtCurrency(r.cumCurActual)}</DailyTd>
              <DailyTd $color={r.cumDiff >= 0 ? '#10b981' : '#ef4444'}>
                {r.cumDiff >= 0 ? '+' : ''}
                {fmtCurrency(r.cumDiff)}
              </DailyTd>
              <DailyTd $color={cumYoYColor} $bold>
                {r.cumPrevActual > 0 ? fmtAchievement(r.cumYoY, false) : '—'}
              </DailyTd>
            </DailyTr>
          )
        })}
      </tbody>
    </DailyTable>
  )
}

// ─── Markup Rate YoY table ──────────────────────────────

function MarkupRateYoYTable({ rows }: { readonly rows: readonly DailyMarkupRateYoYRow[] }) {
  return (
    <DailyTable>
      <thead>
        <tr>
          <DailyGroupTh rowSpan={2} $align="center">
            日
          </DailyGroupTh>
          <DailyGroupTh colSpan={3}>単日</DailyGroupTh>
          <DailyGroupTh colSpan={3} $group>
            累計
          </DailyGroupTh>
        </tr>
        <tr>
          <DailyTh>前年</DailyTh>
          <DailyTh>当年</DailyTh>
          <DailyTh>差異</DailyTh>
          <DailyTh $group>前年</DailyTh>
          <DailyTh>当年</DailyTh>
          <DailyTh>差異</DailyTh>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const diffColor = rateDiffColor(r.diff)
          const cumDiffColor = rateDiffColor(r.cumDiff)
          return (
            <DailyTr key={r.day}>
              <DailyTd style={{ textAlign: 'center' }}>{r.day}</DailyTd>
              <DailyTd>{fmtValue(r.prevRate, true)}</DailyTd>
              <DailyTd $bold>{fmtValue(r.curRate, true)}</DailyTd>
              <DailyTd $color={diffColor} $bold>
                {r.diff >= 0 ? '+' : ''}
                {r.diff.toFixed(2)}pp
              </DailyTd>
              <DailyTd $group>{fmtValue(r.cumPrevRate, true)}</DailyTd>
              <DailyTd $bold>{fmtValue(r.cumCurRate, true)}</DailyTd>
              <DailyTd $color={cumDiffColor} $bold>
                {r.cumDiff >= 0 ? '+' : ''}
                {r.cumDiff.toFixed(2)}pp
              </DailyTd>
            </DailyTr>
          )
        })}
      </tbody>
    </DailyTable>
  )
}

// ─── Discount Rate YoY table ────────────────────────────

function DiscountRateYoYTable({ rows }: { readonly rows: readonly DailyDiscountRateYoYRow[] }) {
  return (
    <DailyTable>
      <thead>
        <tr>
          <DailyGroupTh rowSpan={2} $align="center">
            日
          </DailyGroupTh>
          <DailyGroupTh colSpan={3}>単日</DailyGroupTh>
          <DailyGroupTh colSpan={3} $group>
            累計
          </DailyGroupTh>
        </tr>
        <tr>
          <DailyTh>前年</DailyTh>
          <DailyTh>当年</DailyTh>
          <DailyTh>差異</DailyTh>
          <DailyTh $group>前年</DailyTh>
          <DailyTh>当年</DailyTh>
          <DailyTh>差異</DailyTh>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const diffColor = rateDiffColor(r.diff)
          const cumDiffColor = rateDiffColor(r.cumDiff)
          return (
            <DailyTr key={r.day}>
              <DailyTd style={{ textAlign: 'center' }}>{r.day}</DailyTd>
              <DailyTd>{fmtValue(r.prevRate, true)}</DailyTd>
              <DailyTd $bold>{fmtValue(r.curRate, true)}</DailyTd>
              <DailyTd $color={diffColor} $bold>
                {r.diff >= 0 ? '+' : ''}
                {r.diff.toFixed(2)}pp
              </DailyTd>
              <DailyTd $group>{fmtValue(r.cumPrevRate, true)}</DailyTd>
              <DailyTd $bold>{fmtValue(r.cumCurRate, true)}</DailyTd>
              <DailyTd $color={cumDiffColor} $bold>
                {r.cumDiff >= 0 ? '+' : ''}
                {r.cumDiff.toFixed(2)}pp
              </DailyTd>
            </DailyTr>
          )
        })}
      </tbody>
    </DailyTable>
  )
}
