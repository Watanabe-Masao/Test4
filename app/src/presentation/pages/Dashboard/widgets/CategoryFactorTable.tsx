/**
 * カテゴリ別要因分解テーブル
 *
 * 要因分解の結果をテーブル形式で表示する。
 * ドリルダウン対応のカテゴリ名セルと合計行を含む。
 *
 * @responsibility R:unclassified
 */
import { useCurrencyFormat } from '@/presentation/components/charts/chartTheme'
import { Table, DrillIcon, NameCell, ValCell, valColor } from './CategoryFactorBreakdown.styles'
import type { DecompLevel, FactorItem, FactorTotals } from './categoryFactorBreakdown.types'

interface CategoryFactorTableProps {
  items: readonly FactorItem[]
  totals: FactorTotals
  activeLevel: DecompLevel
  hasCust: boolean
  levelLabel: string
  prevLabel: string
  curLabel: string
  onDrill: (item: FactorItem) => void
}

export function CategoryFactorTable({
  items,
  totals,
  activeLevel,
  hasCust,
  levelLabel,
  prevLabel,
  curLabel,
  onDrill,
}: CategoryFactorTableProps) {
  const { format: fmtCurrency } = useCurrencyFormat()
  return (
    <Table>
      <thead>
        <tr>
          <th>{levelLabel}</th>
          <th>{prevLabel}</th>
          <th>{curLabel}</th>
          <th>増減</th>
          {hasCust && <th>客数効果</th>}
          {activeLevel === 2 && <th>客単価効果</th>}
          {activeLevel >= 3 && <th>点数効果</th>}
          {activeLevel === 3 && <th>単価効果</th>}
          {activeLevel === 5 && <th>価格効果</th>}
          {activeLevel === 5 && <th>構成比変化</th>}
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.code}>
            <NameCell $clickable={item.hasChildren} onClick={() => onDrill(item)}>
              {item.name}
              {item.hasChildren && <DrillIcon>&#9656;</DrillIcon>}
            </NameCell>
            <ValCell>{fmtCurrency(item.prevAmount)}</ValCell>
            <ValCell>{fmtCurrency(item.curAmount)}</ValCell>
            <ValCell $color={valColor(item.totalChange)}>
              {item.totalChange >= 0 ? '+' : ''}
              {fmtCurrency(item.totalChange)}
            </ValCell>
            {hasCust && (
              <ValCell $color={valColor(item.custEffect)}>
                {item.custEffect >= 0 ? '+' : ''}
                {fmtCurrency(Math.round(item.custEffect))}
              </ValCell>
            )}
            {activeLevel === 2 && (
              <ValCell $color={valColor(item.ticketEffect)}>
                {item.ticketEffect >= 0 ? '+' : ''}
                {fmtCurrency(Math.round(item.ticketEffect))}
              </ValCell>
            )}
            {activeLevel >= 3 && (
              <ValCell $color={valColor(item.qtyEffect)}>
                {item.qtyEffect >= 0 ? '+' : ''}
                {fmtCurrency(Math.round(item.qtyEffect))}
              </ValCell>
            )}
            {activeLevel === 3 && (
              <ValCell $color={valColor(item.priceEffect)}>
                {item.priceEffect >= 0 ? '+' : ''}
                {fmtCurrency(Math.round(item.priceEffect))}
              </ValCell>
            )}
            {activeLevel === 5 && (
              <ValCell $color={valColor(item.pricePureEffect)}>
                {item.pricePureEffect >= 0 ? '+' : ''}
                {fmtCurrency(Math.round(item.pricePureEffect))}
              </ValCell>
            )}
            {activeLevel === 5 && (
              <ValCell $color={valColor(item.mixEffect)}>
                {item.mixEffect >= 0 ? '+' : ''}
                {fmtCurrency(Math.round(item.mixEffect))}
              </ValCell>
            )}
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <th style={{ textAlign: 'left' }}>合計</th>
          <ValCell as="th">{fmtCurrency(totals.prevAmount)}</ValCell>
          <ValCell as="th">{fmtCurrency(totals.curAmount)}</ValCell>
          <ValCell as="th" $color={valColor(totals.totalChange)}>
            {totals.totalChange >= 0 ? '+' : ''}
            {fmtCurrency(totals.totalChange)}
          </ValCell>
          {hasCust && (
            <ValCell as="th" $color={valColor(totals.custEffect)}>
              {totals.custEffect >= 0 ? '+' : ''}
              {fmtCurrency(Math.round(totals.custEffect))}
            </ValCell>
          )}
          {activeLevel === 2 && (
            <ValCell as="th" $color={valColor(totals.ticketEffect)}>
              {totals.ticketEffect >= 0 ? '+' : ''}
              {fmtCurrency(Math.round(totals.ticketEffect))}
            </ValCell>
          )}
          {activeLevel >= 3 && (
            <ValCell as="th" $color={valColor(totals.qtyEffect)}>
              {totals.qtyEffect >= 0 ? '+' : ''}
              {fmtCurrency(Math.round(totals.qtyEffect))}
            </ValCell>
          )}
          {activeLevel === 3 && (
            <ValCell as="th" $color={valColor(totals.priceEffect)}>
              {totals.priceEffect >= 0 ? '+' : ''}
              {fmtCurrency(Math.round(totals.priceEffect))}
            </ValCell>
          )}
          {activeLevel === 5 && (
            <ValCell as="th" $color={valColor(totals.pricePureEffect)}>
              {totals.pricePureEffect >= 0 ? '+' : ''}
              {fmtCurrency(Math.round(totals.pricePureEffect))}
            </ValCell>
          )}
          {activeLevel === 5 && (
            <ValCell as="th" $color={valColor(totals.mixEffect)}>
              {totals.mixEffect >= 0 ? '+' : ''}
              {fmtCurrency(Math.round(totals.mixEffect))}
            </ValCell>
          )}
        </tr>
      </tfoot>
    </Table>
  )
}
