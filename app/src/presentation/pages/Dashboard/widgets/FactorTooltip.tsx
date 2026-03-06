/**
 * カテゴリ別要因分解チャートのツールチップ
 */
import { formatCurrency } from '@/domain/calculations/utils'
import { TipBox, TipTitle, TipRow, TipHint, valColor } from './CategoryFactorBreakdown.styles'
import type { DecompLevel, FactorItem } from './categoryFactorBreakdown.types'

export const FACTOR_COLORS = {
  cust: '#8b5cf6',
  ticket: '#6366f1',
  qty: '#3b82f6',
  price: '#f59e0b',
  mix: '#14b8a6',
} as const

interface FactorTooltipProps {
  active?: boolean
  payload?: { payload: FactorItem }[]
  prevLabel?: string
  curLabel?: string
}

export function FactorTooltip({ active, payload, prevLabel, curLabel }: FactorTooltipProps) {
  if (!active || !payload?.length) return null
  const item = payload[0]?.payload
  if (!item) return null
  const lvl: DecompLevel = item._level
  const pL = prevLabel ?? '前年'
  const cL = curLabel ?? '当年'
  return (
    <TipBox>
      <TipTitle>{item.name}</TipTitle>
      <TipRow>
        {pL}: {formatCurrency(item.prevAmount)}
      </TipRow>
      <TipRow>
        {cL}: {formatCurrency(item.curAmount)}
      </TipRow>
      <TipRow $color={valColor(item.totalChange)}>
        増減: {item.totalChange >= 0 ? '+' : ''}
        {formatCurrency(item.totalChange)}
      </TipRow>
      {item.custEffect !== 0 && (
        <TipRow $color={FACTOR_COLORS.cust}>
          客数効果: {item.custEffect >= 0 ? '+' : ''}
          {formatCurrency(Math.round(item.custEffect))}
        </TipRow>
      )}
      {lvl === 2 && (
        <TipRow $color={FACTOR_COLORS.ticket}>
          客単価効果: {item.ticketEffect >= 0 ? '+' : ''}
          {formatCurrency(Math.round(item.ticketEffect))}
        </TipRow>
      )}
      {lvl === 3 && (
        <>
          <TipRow $color={FACTOR_COLORS.qty}>
            点数効果: {item.qtyEffect >= 0 ? '+' : ''}
            {formatCurrency(Math.round(item.qtyEffect))}
          </TipRow>
          <TipRow $color={FACTOR_COLORS.price}>
            単価効果: {item.priceEffect >= 0 ? '+' : ''}
            {formatCurrency(Math.round(item.priceEffect))}
          </TipRow>
        </>
      )}
      {lvl === 5 && (
        <>
          <TipRow $color={FACTOR_COLORS.qty}>
            点数効果: {item.qtyEffect >= 0 ? '+' : ''}
            {formatCurrency(Math.round(item.qtyEffect))}
          </TipRow>
          <TipRow $color={FACTOR_COLORS.price}>
            価格効果: {item.pricePureEffect >= 0 ? '+' : ''}
            {formatCurrency(Math.round(item.pricePureEffect))}
          </TipRow>
          <TipRow $color={FACTOR_COLORS.mix}>
            構成比変化効果: {item.mixEffect >= 0 ? '+' : ''}
            {formatCurrency(Math.round(item.mixEffect))}
          </TipRow>
        </>
      )}
      {item.hasChildren && <TipHint>クリックでドリルダウン</TipHint>}
    </TipBox>
  )
}
