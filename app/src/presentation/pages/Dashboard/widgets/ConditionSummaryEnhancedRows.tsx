import { memo } from 'react'
import { formatPercent } from '@/domain/formatting'
import type { MetricConfig, StoreRow } from './conditionSummaryEnhancedMock'
import { fmtValue, fmtResult, resultColor, GP_RATE_BUDGET } from './conditionSummaryEnhancedMock'
import {
  StoreRowWrapper,
  RankBadge,
  StoreName,
  StoreAchValue,
  StoreBudgetValue,
  GpRateNote,
  MonoSm,
  MonoMd,
  MonoLg,
  Arrow,
  DiffSpan,
  ProgressTrack,
  ProgressFill,
  RateChip,
} from './ConditionSummaryEnhanced.styles'

// ─── Monthly Row ────────────────────────────────────────

interface MonthlyRowProps {
  readonly row: StoreRow
  readonly idx: number
  readonly m: MetricConfig
  readonly showYoY: boolean
}

export const MonthlyStoreRow = memo(function MonthlyStoreRow({
  row,
  idx,
  m,
  showYoY,
}: MonthlyRowProps) {
  return (
    <StoreRowWrapper>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: showYoY ? 6 : 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <RankBadge $color="#3b82f6">{idx + 1}</RankBadge>
          <StoreName>{row.store}</StoreName>
          {!m.isRate && (
            <GpRateNote>(率 {formatPercent(GP_RATE_BUDGET[row.store] ?? 0, 0)})</GpRateNote>
          )}
        </div>
        <StoreBudgetValue>{fmtValue(row.budget, m.isRate)}</StoreBudgetValue>
      </div>
      {showYoY && <YoYInlineRow row={row} m={m} />}
    </StoreRowWrapper>
  )
})

// ─── Elapsed Row ────────────────────────────────────────

interface ElapsedRowProps {
  readonly row: StoreRow
  readonly idx: number
  readonly m: MetricConfig
  readonly showYoY: boolean
}

export const ElapsedStoreRow = memo(function ElapsedStoreRow({
  row,
  idx,
  m,
  showYoY,
}: ElapsedRowProps) {
  const c = resultColor(row.ach, m.isRate)
  return (
    <StoreRowWrapper>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <RankBadge $color={c}>{idx + 1}</RankBadge>
          <StoreName>{row.store}</StoreName>
        </div>
        <StoreAchValue $color={c}>{fmtResult(row.ach, m.isRate)}</StoreAchValue>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 200 }}>
          <MonoSm>{fmtValue(row.budget, m.isRate)}</MonoSm>
          <Arrow>→</Arrow>
          <MonoMd $bold>{fmtValue(row.actual, m.isRate)}</MonoMd>
          {!m.isRate && (
            <DiffSpan $positive={row.diff >= 0}>
              ({row.diff >= 0 ? '+' : ''}
              {fmtValue(row.diff, false)})
            </DiffSpan>
          )}
        </div>
        {!m.isRate ? (
          <div style={{ flex: 1 }}>
            <ProgressTrack $height={6}>
              <ProgressFill $width={row.ach} $color={c} />
            </ProgressTrack>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
            <RateChip $color={c}>
              {row.ach >= 0 ? '▲' : '▼'} {Math.abs(row.ach).toFixed(2)}
            </RateChip>
          </div>
        )}
      </div>
      {showYoY && <YoYInlineRow row={row} m={m} />}
    </StoreRowWrapper>
  )
})

// ─── Shared YoY Inline ─────────────────────────────────

function YoYInlineRow({ row, m }: { readonly row: StoreRow; readonly m: MetricConfig }) {
  const yoyColor = resultColor(row.yoy, m.isRate)
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 6,
        marginTop: 6,
      }}
    >
      <span style={{ fontSize: 10, opacity: 0.5 }}>📅</span>
      <MonoSm>{fmtValue(row.ly, m.isRate)}</MonoSm>
      <Arrow>→</Arrow>
      <MonoMd $bold>{fmtValue(row.actual, m.isRate)}</MonoMd>
      <MonoLg $color={yoyColor} $bold>
        {fmtResult(row.yoy, m.isRate)}
      </MonoLg>
    </div>
  )
}
