import { useState, useMemo } from 'react'
import { MainContent } from '@/presentation/components/Layout'
import { Card, CardTitle, Chip, ChipGroup } from '@/presentation/components/common'
import { DailySalesChart, GrossProfitRateChart } from '@/presentation/components/charts'
import type { DailyChartMode } from '@/presentation/components/charts'
import { useCalculation, useStoreSelection, usePrevYearData } from '@/application/hooks'
import { useAppState } from '@/application/context'
import { formatCurrency } from '@/domain/calculations/utils'
import type { DailyRecord, TransferBreakdownEntry, CostPricePair } from '@/domain/models'
import {
  ChartToggle, ChartGrid, TableWrapper, Table, Th, SubTh, Td, SubTd, Tr,
  PrevYearTd, EmptyState, ToggleIcon,
} from './DailyPage.styles'

type ExpandableColumn = 'purchase' | 'interStoreIn' | 'interStoreOut' | 'interDepartmentIn' | 'interDepartmentOut'

/** 取引先別の内訳キーを全日から収集 */
function collectSupplierKeys(
  days: [number, DailyRecord][],
  suppliers: ReadonlyMap<string, { code: string; name: string }>,
): { code: string; name: string }[] {
  const seen = new Map<string, string>()
  for (const [, rec] of days) {
    for (const [code] of rec.supplierBreakdown) {
      if (!seen.has(code)) {
        seen.set(code, suppliers.get(code)?.name ?? code)
      }
    }
  }
  return Array.from(seen.entries()).map(([code, name]) => ({ code, name }))
}

/** 移動明細のfrom→toキーを収集 */
function collectTransferKeys(
  days: [number, DailyRecord][],
  field: keyof DailyRecord['transferBreakdown'],
  stores: ReadonlyMap<string, { id: string; name: string }>,
): { key: string; from: string; to: string; label: string }[] {
  const seen = new Map<string, { from: string; to: string }>()
  for (const [, rec] of days) {
    const entries = rec.transferBreakdown[field]
    for (const e of entries) {
      const key = `${e.fromStoreId}->${e.toStoreId}`
      if (!seen.has(key)) {
        seen.set(key, { from: e.fromStoreId, to: e.toStoreId })
      }
    }
  }
  return Array.from(seen.entries()).map(([key, { from, to }]) => {
    const fromName = stores.get(from)?.name ?? from
    const toName = stores.get(to)?.name ?? to
    // コンパクトな店番号表示を試行
    const fromLabel = from.length <= 3 ? from.padStart(2, '0') : fromName
    const toLabel = to.length <= 3 ? to.padStart(2, '0') : toName
    return { key, from, to, label: `${fromLabel}→${toLabel}` }
  })
}

/** 移動明細の特定キーの合計を取得 */
function getTransferAmount(
  entries: readonly TransferBreakdownEntry[],
  from: string,
  to: string,
): number {
  let total = 0
  for (const e of entries) {
    if (e.fromStoreId === from && e.toStoreId === to) total += e.cost
  }
  return total
}

const EMPTY_SUPPLIER_KEYS: { code: string; name: string }[] = []
const EMPTY_TRANSFER_KEYS: { key: string; from: string; to: string; label: string }[] = []

export function DailyPage() {
  const { isCalculated, daysInMonth } = useCalculation()
  const { currentResult, storeName, stores } = useStoreSelection()
  const appState = useAppState()
  const { settings } = appState
  const prevYear = usePrevYearData()

  const [expanded, setExpanded] = useState<Set<ExpandableColumn>>(new Set())
  const [chartMode, setChartMode] = useState<DailyChartMode>('sales')

  const isPurchaseExpanded = expanded.has('purchase')
  const isInterStoreInExpanded = expanded.has('interStoreIn')
  const isInterStoreOutExpanded = expanded.has('interStoreOut')
  const isInterDeptInExpanded = expanded.has('interDepartmentIn')
  const isInterDeptOutExpanded = expanded.has('interDepartmentOut')

  const days = useMemo(
    () => currentResult ? Array.from(currentResult.daily.entries()).sort(([a], [b]) => a - b) : [],
    [currentResult],
  )

  const supplierKeys = useMemo(
    () => isPurchaseExpanded && days.length > 0 ? collectSupplierKeys(days, appState.data.suppliers) : EMPTY_SUPPLIER_KEYS,
    [isPurchaseExpanded, days, appState.data.suppliers],
  )

  const interStoreInKeys = useMemo(
    () => isInterStoreInExpanded && days.length > 0 ? collectTransferKeys(days, 'interStoreIn', stores) : EMPTY_TRANSFER_KEYS,
    [isInterStoreInExpanded, days, stores],
  )
  const interStoreOutKeys = useMemo(
    () => isInterStoreOutExpanded && days.length > 0 ? collectTransferKeys(days, 'interStoreOut', stores) : EMPTY_TRANSFER_KEYS,
    [isInterStoreOutExpanded, days, stores],
  )
  const interDeptInKeys = useMemo(
    () => isInterDeptInExpanded && days.length > 0 ? collectTransferKeys(days, 'interDepartmentIn', stores) : EMPTY_TRANSFER_KEYS,
    [isInterDeptInExpanded, days, stores],
  )
  const interDeptOutKeys = useMemo(
    () => isInterDeptOutExpanded && days.length > 0 ? collectTransferKeys(days, 'interDepartmentOut', stores) : EMPTY_TRANSFER_KEYS,
    [isInterDeptOutExpanded, days, stores],
  )

  const toggleExpand = (col: ExpandableColumn) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(col)) next.delete(col)
      else next.add(col)
      return next
    })
  }

  if (!isCalculated || !currentResult) {
    return (
      <MainContent title="日別トレンド" storeName={storeName}>
        <EmptyState>計算を実行してください</EmptyState>
      </MainContent>
    )
  }

  const renderExpandIcon = (col: ExpandableColumn) => (
    <ToggleIcon $expanded={expanded.has(col)}>&#9654;</ToggleIcon>
  )

  const fmtOrDash = (val: number) => val !== 0 ? formatCurrency(val) : '-'
  const fmtOrDashPositive = (val: number) => val > 0 ? formatCurrency(val) : '-'

  return (
    <MainContent title="日別トレンド" storeName={storeName}>
      <ChartToggle>
        <ChipGroup>
          <Chip $active={chartMode === 'sales'} onClick={() => setChartMode('sales')}>売上</Chip>
          <Chip $active={chartMode === 'discount'} onClick={() => setChartMode('discount')}>売変</Chip>
          <Chip $active={chartMode === 'all'} onClick={() => setChartMode('all')}>全表示</Chip>
        </ChipGroup>
      </ChartToggle>
      <ChartGrid>
        <DailySalesChart daily={currentResult.daily} daysInMonth={daysInMonth} prevYearDaily={prevYear.hasPrevYear ? prevYear.daily : undefined} mode={chartMode} />
        <GrossProfitRateChart
          daily={currentResult.daily}
          daysInMonth={daysInMonth}
          targetRate={settings.targetGrossProfitRate}
          warningRate={settings.warningThreshold}
        />
      </ChartGrid>

      <Card>
        <CardTitle>日別明細</CardTitle>
        <TableWrapper>
          <Table>
            <thead>
              <tr>
                <Th>日</Th>
                <Th>売上</Th>
                {prevYear.hasPrevYear && <Th>前年同曜日</Th>}
                {prevYear.hasPrevYear && <Th>前年比</Th>}
                <Th
                  $clickable
                  $expanded={isPurchaseExpanded}
                  onClick={() => toggleExpand('purchase')}
                >
                  仕入原価{renderExpandIcon('purchase')}
                </Th>
                {isPurchaseExpanded && supplierKeys.map(s => (
                  <SubTh key={`sup-cost-${s.code}`}>{s.name}</SubTh>
                ))}
                <Th
                  $clickable
                  $expanded={isPurchaseExpanded}
                  onClick={() => toggleExpand('purchase')}
                >
                  仕入売価{renderExpandIcon('purchase')}
                </Th>
                {isPurchaseExpanded && supplierKeys.map(s => (
                  <SubTh key={`sup-price-${s.code}`}>{s.name}</SubTh>
                ))}
                <Th
                  $clickable
                  $expanded={isInterStoreInExpanded}
                  onClick={() => toggleExpand('interStoreIn')}
                >
                  店間入{renderExpandIcon('interStoreIn')}
                </Th>
                {isInterStoreInExpanded && interStoreInKeys.map(k => (
                  <SubTh key={`si-${k.key}`}>{k.label}</SubTh>
                ))}
                <Th
                  $clickable
                  $expanded={isInterStoreOutExpanded}
                  onClick={() => toggleExpand('interStoreOut')}
                >
                  店間出{renderExpandIcon('interStoreOut')}
                </Th>
                {isInterStoreOutExpanded && interStoreOutKeys.map(k => (
                  <SubTh key={`so-${k.key}`}>{k.label}</SubTh>
                ))}
                <Th
                  $clickable
                  $expanded={isInterDeptInExpanded}
                  onClick={() => toggleExpand('interDepartmentIn')}
                >
                  部門間入{renderExpandIcon('interDepartmentIn')}
                </Th>
                {isInterDeptInExpanded && interDeptInKeys.map(k => (
                  <SubTh key={`di-${k.key}`}>{k.label}</SubTh>
                ))}
                <Th
                  $clickable
                  $expanded={isInterDeptOutExpanded}
                  onClick={() => toggleExpand('interDepartmentOut')}
                >
                  部門間出{renderExpandIcon('interDepartmentOut')}
                </Th>
                {isInterDeptOutExpanded && interDeptOutKeys.map(k => (
                  <SubTh key={`do-${k.key}`}>{k.label}</SubTh>
                ))}
                <Th>花</Th>
                <Th>産直</Th>
                <Th>売変額</Th>
                <Th>消耗品</Th>
              </tr>
            </thead>
            <tbody>
              {days.map(([day, rec]) => (
                <Tr key={day}>
                  <Td>{day}</Td>
                  <Td>{formatCurrency(rec.sales)}</Td>
                  {prevYear.hasPrevYear && (() => {
                    const ps = prevYear.daily.get(day)?.sales ?? 0
                    return <PrevYearTd>{ps > 0 ? formatCurrency(ps) : '-'}</PrevYearTd>
                  })()}
                  {prevYear.hasPrevYear && (() => {
                    const ps = prevYear.daily.get(day)?.sales
                    if (!ps || ps === 0) return <PrevYearTd>-</PrevYearTd>
                    const ratio = (rec.sales / ps) * 100
                    return <PrevYearTd $positive={ratio >= 100}>{ratio.toFixed(1)}%</PrevYearTd>
                  })()}
                  {/* 仕入原価 + 詳細 */}
                  <Td>{formatCurrency(rec.purchase.cost)}</Td>
                  {isPurchaseExpanded && supplierKeys.map(s => {
                    const pair: CostPricePair | undefined = rec.supplierBreakdown.get(s.code)
                    return <SubTd key={`sup-cost-${s.code}`}>{pair ? fmtOrDash(pair.cost) : '-'}</SubTd>
                  })}
                  {/* 仕入売価 + 詳細 */}
                  <Td>{formatCurrency(rec.purchase.price)}</Td>
                  {isPurchaseExpanded && supplierKeys.map(s => {
                    const pair: CostPricePair | undefined = rec.supplierBreakdown.get(s.code)
                    return <SubTd key={`sup-price-${s.code}`}>{pair ? fmtOrDash(pair.price) : '-'}</SubTd>
                  })}
                  {/* 店間入 + 詳細 */}
                  <Td>{fmtOrDash(rec.interStoreIn.cost)}</Td>
                  {isInterStoreInExpanded && interStoreInKeys.map(k => {
                    const amt = getTransferAmount(rec.transferBreakdown.interStoreIn, k.from, k.to)
                    return <SubTd key={`si-${k.key}`}>{fmtOrDash(amt)}</SubTd>
                  })}
                  {/* 店間出 + 詳細 */}
                  <Td $negative={rec.interStoreOut.cost < 0}>
                    {fmtOrDash(rec.interStoreOut.cost)}
                  </Td>
                  {isInterStoreOutExpanded && interStoreOutKeys.map(k => {
                    const amt = getTransferAmount(rec.transferBreakdown.interStoreOut, k.from, k.to)
                    return <SubTd key={`so-${k.key}`} $negative={amt < 0}>{fmtOrDash(amt)}</SubTd>
                  })}
                  {/* 部門間入 + 詳細 */}
                  <Td>{fmtOrDash(rec.interDepartmentIn.cost)}</Td>
                  {isInterDeptInExpanded && interDeptInKeys.map(k => {
                    const amt = getTransferAmount(rec.transferBreakdown.interDepartmentIn, k.from, k.to)
                    return <SubTd key={`di-${k.key}`}>{fmtOrDash(amt)}</SubTd>
                  })}
                  {/* 部門間出 + 詳細 */}
                  <Td $negative={rec.interDepartmentOut.cost < 0}>
                    {fmtOrDash(rec.interDepartmentOut.cost)}
                  </Td>
                  {isInterDeptOutExpanded && interDeptOutKeys.map(k => {
                    const amt = getTransferAmount(rec.transferBreakdown.interDepartmentOut, k.from, k.to)
                    return <SubTd key={`do-${k.key}`} $negative={amt < 0}>{fmtOrDash(amt)}</SubTd>
                  })}
                  <Td>{fmtOrDashPositive(rec.flowers.price)}</Td>
                  <Td>{fmtOrDashPositive(rec.directProduce.price)}</Td>
                  <Td $negative={rec.discountAbsolute > 0}>
                    {rec.discountAbsolute > 0 ? formatCurrency(rec.discountAbsolute) : '-'}
                  </Td>
                  <Td>{rec.consumable.cost > 0 ? formatCurrency(rec.consumable.cost) : '-'}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableWrapper>
      </Card>
    </MainContent>
  )
}
