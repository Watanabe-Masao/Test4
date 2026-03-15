import { memo } from 'react'
import type { EnhancedRow, MetricKey } from './ConditionSummaryEnhanced.vm'
import { fmtValue, fmtAchievement, resultColor } from './ConditionSummaryEnhanced.vm'
import {
  StoreRowWrapper,
  StoreRowGrid,
  StoreName,
  DiffSpan,
  ProgressTrack,
  ProgressFill,
  MonoSm,
  MonoMd,
  TableHeaderRow,
  TableHeaderCell,
} from './ConditionSummaryEnhanced.styles'

// ─── Table Header ────────────────────────────────────────

interface TableHeaderProps {
  readonly metric: MetricKey
  readonly showYoY: boolean
}

export const StoreTableHeader = memo(function StoreTableHeader({
  metric,
  showYoY,
}: TableHeaderProps) {
  if (metric === 'gpRate') {
    return (
      <TableHeaderRow style={{ gridTemplateColumns: '1.2fr 1fr 1fr 1fr 1fr' }}>
        <TableHeaderCell>店名</TableHeaderCell>
        <TableHeaderCell $align="right">予算</TableHeaderCell>
        <TableHeaderCell $align="right">原算前</TableHeaderCell>
        <TableHeaderCell $align="right">原算後</TableHeaderCell>
        <TableHeaderCell $align="right">差異</TableHeaderCell>
      </TableHeaderRow>
    )
  }

  const isRate = metric === 'markupRate' || metric === 'discountRate'
  if (isRate) {
    return (
      <TableHeaderRow style={{ gridTemplateColumns: '1.2fr 1fr 1fr 1fr' }}>
        <TableHeaderCell>店名</TableHeaderCell>
        <TableHeaderCell $align="right">予算</TableHeaderCell>
        <TableHeaderCell $align="right">実績</TableHeaderCell>
        <TableHeaderCell $align="right">差異</TableHeaderCell>
      </TableHeaderRow>
    )
  }

  return (
    <TableHeaderRow
      style={{
        gridTemplateColumns: showYoY
          ? '1.2fr 1fr 1fr 0.8fr 0.8fr 0.8fr'
          : '1.2fr 1fr 1fr 0.8fr 0.8fr',
      }}
    >
      <TableHeaderCell>店名</TableHeaderCell>
      <TableHeaderCell $align="right">経過予算</TableHeaderCell>
      <TableHeaderCell $align="right">実績</TableHeaderCell>
      <TableHeaderCell $align="right">差異</TableHeaderCell>
      <TableHeaderCell $align="right">達成率</TableHeaderCell>
      {showYoY && <TableHeaderCell $align="right">前年比</TableHeaderCell>}
    </TableHeaderRow>
  )
})

// ─── Store Row ───────────────────────────────────────────

interface StoreRowProps {
  readonly row: EnhancedRow
  readonly metric: MetricKey
  readonly isRate: boolean
  readonly showYoY: boolean
  readonly onStoreClick?: (storeId: string) => void
}

export const StoreRow = memo(function StoreRow({
  row,
  metric,
  isRate,
  showYoY,
  onStoreClick,
}: StoreRowProps) {
  const c = resultColor(row.achievement, isRate)

  if (metric === 'gpRate') {
    return (
      <StoreRowWrapper
        $clickable={!!onStoreClick}
        onClick={onStoreClick ? () => onStoreClick(row.storeId) : undefined}
      >
        <StoreRowGrid style={{ gridTemplateColumns: '1.2fr 1fr 1fr 1fr 1fr' }}>
          <StoreName>{row.storeName}</StoreName>
          <MonoSm style={{ textAlign: 'right' }}>{fmtValue(row.budget, true)}</MonoSm>
          <MonoSm style={{ textAlign: 'right' }}>
            {row.gpBeforeConsumable != null ? fmtValue(row.gpBeforeConsumable, true) : '—'}
          </MonoSm>
          <MonoMd $bold style={{ textAlign: 'right', color: c }}>
            {fmtValue(row.actual, true)}
          </MonoMd>
          <DiffSpan $positive={row.diff >= 0} style={{ textAlign: 'right', display: 'block' }}>
            {row.diff >= 0 ? '+' : ''}
            {row.diff.toFixed(2)}pp
          </DiffSpan>
        </StoreRowGrid>
      </StoreRowWrapper>
    )
  }

  if (isRate) {
    return (
      <StoreRowWrapper
        $clickable={!!onStoreClick}
        onClick={onStoreClick ? () => onStoreClick(row.storeId) : undefined}
      >
        <StoreRowGrid style={{ gridTemplateColumns: '1.2fr 1fr 1fr 1fr' }}>
          <StoreName>{row.storeName}</StoreName>
          <MonoSm style={{ textAlign: 'right' }}>{fmtValue(row.budget, true)}</MonoSm>
          <MonoMd $bold style={{ textAlign: 'right', color: c }}>
            {fmtValue(row.actual, true)}
          </MonoMd>
          <DiffSpan $positive={row.diff >= 0} style={{ textAlign: 'right', display: 'block' }}>
            {row.diff >= 0 ? '+' : ''}
            {row.diff.toFixed(2)}pp
          </DiffSpan>
        </StoreRowGrid>
      </StoreRowWrapper>
    )
  }

  // Amount metrics (sales, gp)
  return (
    <StoreRowWrapper
      $clickable={!!onStoreClick}
      onClick={onStoreClick ? () => onStoreClick(row.storeId) : undefined}
    >
      <StoreRowGrid
        style={{
          gridTemplateColumns: showYoY
            ? '1.2fr 1fr 1fr 0.8fr 0.8fr 0.8fr'
            : '1.2fr 1fr 1fr 0.8fr 0.8fr',
        }}
      >
        <StoreName>{row.storeName}</StoreName>
        <MonoSm style={{ textAlign: 'right' }}>{fmtValue(row.budget, false)}</MonoSm>
        <MonoMd $bold style={{ textAlign: 'right' }}>
          {fmtValue(row.actual, false)}
        </MonoMd>
        <DiffSpan $positive={row.diff >= 0} style={{ textAlign: 'right', display: 'block' }}>
          {row.diff >= 0 ? '+' : ''}
          {fmtValue(row.diff, false)}
        </DiffSpan>
        <div style={{ textAlign: 'right' }}>
          <MonoMd $bold $color={c}>
            {fmtAchievement(row.achievement, false)}
          </MonoMd>
          <ProgressTrack $height={3}>
            <ProgressFill $width={row.achievement} $color={c} />
          </ProgressTrack>
        </div>
        {showYoY && <YoYInlineCell row={row} />}
      </StoreRowGrid>
    </StoreRowWrapper>
  )
})

// ─── YoY Inline Cell ─────────────────────────────────────

function YoYInlineCell({ row }: { readonly row: EnhancedRow }) {
  if (row.ly == null || row.yoy == null) {
    return <MonoSm style={{ textAlign: 'right', color: '#94a3b8' }}>—</MonoSm>
  }
  const yoyColor = resultColor(row.yoy, false)
  return (
    <MonoMd $bold $color={yoyColor} style={{ textAlign: 'right' }}>
      {fmtAchievement(row.yoy, false)}
    </MonoMd>
  )
}

// ─── Legacy exports (backward compat) ────────────────────

/** @deprecated Use StoreRow instead */
export const MonthlyStoreRow = memo(function MonthlyStoreRow({
  row,
  showYoY,
}: {
  readonly row: EnhancedRow
  readonly idx: number
  readonly isRate: boolean
  readonly showYoY: boolean
}) {
  return <StoreRow row={row} metric="sales" isRate={false} showYoY={showYoY} />
})

/** @deprecated Use StoreRow instead */
export const ElapsedStoreRow = memo(function ElapsedStoreRow({
  row,
  showYoY,
}: {
  readonly row: EnhancedRow
  readonly idx: number
  readonly isRate: boolean
  readonly showYoY: boolean
}) {
  return <StoreRow row={row} metric="sales" isRate={false} showYoY={showYoY} />
})
