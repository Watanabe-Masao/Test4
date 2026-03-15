import { memo } from 'react'
import type { EnhancedRow } from './ConditionSummaryEnhanced.vm'
import { fmtValue, fmtAchievement, resultColor } from './ConditionSummaryEnhanced.vm'
import {
  StoreRowWrapper,
  StoreRowGrid,
  StoreRowLeft,
  StoreRowCenter,
  StoreRowRight,
  RankBadge,
  StoreName,
  StoreAchValue,
  StoreBudgetValue,
  MonoSm,
  MonoMd,
  MonoLg,
  DiffSpan,
  ProgressTrack,
  ProgressFill,
  RateChip,
  YoYRow,
  YoYLabel,
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
  const c = resultColor(row.achievement, isRate)
  return (
    <StoreRowWrapper>
      <StoreRowGrid>
        <StoreRowLeft>
          <RankBadge $color="#3b82f6">{idx + 1}</RankBadge>
          <StoreName>{row.storeName}</StoreName>
        </StoreRowLeft>
        <StoreRowCenter>
          <MonoSm>予算</MonoSm>
          <StoreBudgetValue>{fmtValue(row.budget, isRate)}</StoreBudgetValue>
        </StoreRowCenter>
        <StoreRowRight>
          <MonoSm>実績</MonoSm>
          <StoreAchValue $color={c}>{fmtValue(row.actual, isRate)}</StoreAchValue>
        </StoreRowRight>
      </StoreRowGrid>
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
      <StoreRowGrid>
        <StoreRowLeft>
          <RankBadge $color={c}>{idx + 1}</RankBadge>
          <StoreName>{row.storeName}</StoreName>
        </StoreRowLeft>
        <StoreRowCenter>
          <MonoSm>{fmtValue(row.budget, isRate)}</MonoSm>
          <MonoMd $bold>{fmtValue(row.actual, isRate)}</MonoMd>
          {!isRate && (
            <DiffSpan $positive={row.diff >= 0}>
              {row.diff >= 0 ? '+' : ''}
              {fmtValue(row.diff, false)}
            </DiffSpan>
          )}
        </StoreRowCenter>
        <StoreRowRight>
          {!isRate ? (
            <>
              <StoreAchValue $color={c}>{fmtAchievement(row.achievement, isRate)}</StoreAchValue>
              <ProgressTrack $height={4}>
                <ProgressFill $width={row.achievement} $color={c} />
              </ProgressTrack>
            </>
          ) : (
            <RateChip $color={c}>
              {row.achievement >= 0 ? '▲' : '▼'} {Math.abs(row.achievement).toFixed(2)}pp
            </RateChip>
          )}
        </StoreRowRight>
      </StoreRowGrid>
      {showYoY && row.ly != null && <YoYInlineRow row={row} isRate={isRate} />}
    </StoreRowWrapper>
  )
})

// ─── Shared YoY Inline ─────────────────────────────────

function YoYInlineRow({ row, isRate }: { readonly row: EnhancedRow; readonly isRate: boolean }) {
  if (row.ly == null || row.yoy == null) return null
  const yoyColor = resultColor(row.yoy, isRate)
  return (
    <YoYRow>
      <YoYLabel>前年比</YoYLabel>
      <MonoSm>{fmtValue(row.ly, isRate)}</MonoSm>
      <MonoMd $bold>{fmtValue(row.actual, isRate)}</MonoMd>
      <MonoLg $color={yoyColor} $bold>
        {fmtAchievement(row.yoy, isRate)}
      </MonoLg>
    </YoYRow>
  )
}
