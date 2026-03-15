import { memo } from 'react'
import type { EnhancedRow } from './ConditionSummaryEnhanced.vm'
import { fmtValue, fmtAchievement, resultColor } from './ConditionSummaryEnhanced.vm'
import {
  StoreRowWrapper,
  RankBadge,
  StoreName,
  StoreAchValue,
  StoreBudgetValue,
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
  readonly row: EnhancedRow
  readonly idx: number
  readonly isRate: boolean
  readonly showYoY: boolean
}

export const MonthlyStoreRow = memo(function MonthlyStoreRow({
  row,
  idx,
  isRate,
  showYoY,
}: MonthlyRowProps) {
  return (
    <StoreRowWrapper>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: showYoY && row.ly != null ? 6 : 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <RankBadge $color="#3b82f6">{idx + 1}</RankBadge>
          <StoreName>{row.storeName}</StoreName>
        </div>
        <StoreBudgetValue>{fmtValue(row.budget, isRate)}</StoreBudgetValue>
      </div>
      {showYoY && row.ly != null && <YoYInlineRow row={row} isRate={isRate} />}
    </StoreRowWrapper>
  )
})

// ─── Elapsed Row ────────────────────────────────────────

interface ElapsedRowProps {
  readonly row: EnhancedRow
  readonly idx: number
  readonly isRate: boolean
  readonly showYoY: boolean
}

export const ElapsedStoreRow = memo(function ElapsedStoreRow({
  row,
  idx,
  isRate,
  showYoY,
}: ElapsedRowProps) {
  const c = resultColor(row.achievement, isRate)
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
          <StoreName>{row.storeName}</StoreName>
        </div>
        <StoreAchValue $color={c}>{fmtAchievement(row.achievement, isRate)}</StoreAchValue>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 200 }}>
          <MonoSm>{fmtValue(row.budget, isRate)}</MonoSm>
          <Arrow>→</Arrow>
          <MonoMd $bold>{fmtValue(row.actual, isRate)}</MonoMd>
          {!isRate && (
            <DiffSpan $positive={row.diff >= 0}>
              ({row.diff >= 0 ? '+' : ''}
              {fmtValue(row.diff, false)})
            </DiffSpan>
          )}
        </div>
        {!isRate ? (
          <div style={{ flex: 1 }}>
            <ProgressTrack $height={6}>
              <ProgressFill $width={row.achievement} $color={c} />
            </ProgressTrack>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
            <RateChip $color={c}>
              {row.achievement >= 0 ? '▲' : '▼'} {Math.abs(row.achievement).toFixed(2)}
            </RateChip>
          </div>
        )}
      </div>
      {showYoY && row.ly != null && <YoYInlineRow row={row} isRate={isRate} />}
    </StoreRowWrapper>
  )
})

// ─── Shared YoY Inline ─────────────────────────────────

function YoYInlineRow({ row, isRate }: { readonly row: EnhancedRow; readonly isRate: boolean }) {
  if (row.ly == null || row.yoy == null) return null
  const yoyColor = resultColor(row.yoy, isRate)
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
      <MonoSm>{fmtValue(row.ly, isRate)}</MonoSm>
      <Arrow>→</Arrow>
      <MonoMd $bold>{fmtValue(row.actual, isRate)}</MonoMd>
      <MonoLg $color={yoyColor} $bold>
        {fmtAchievement(row.yoy, isRate)}
      </MonoLg>
    </div>
  )
}
