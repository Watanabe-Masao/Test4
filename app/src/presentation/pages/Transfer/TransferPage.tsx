import { useState, useMemo } from 'react'
import { MainContent } from '@/presentation/components/Layout'
import { Card, CardTitle, Chip, ChipGroup, KpiCard, KpiGrid } from '@/presentation/components/common'
import { useCalculation, useStoreSelection } from '@/application/hooks'
import { formatCurrency } from '@/domain/calculations/utils'
import type { DailyRecord, TransferBreakdownEntry } from '@/domain/models'
import {
  Section, TableWrapper, Table, Th, Td, Tr, TrTotal, TrDetail, TrDetailLast, DetailLabel, ToggleIcon, EmptyState,
} from './TransferPage.styles'

type TransferType = 'interStore' | 'interDepartment'

/** from→to ペアの月間集計 */
interface FlowEntry {
  from: string
  to: string
  fromName: string
  toName: string
  cost: number
  price: number
}

/** 全日からfrom→toペアを集計 */
function aggregateFlows(
  days: [number, DailyRecord][],
  inField: 'interStoreIn' | 'interDepartmentIn',
  outField: 'interStoreOut' | 'interDepartmentOut',
  stores: ReadonlyMap<string, { id: string; name: string }>,
): FlowEntry[] {
  const map = new Map<string, FlowEntry>()

  for (const [, rec] of days) {
    for (const e of rec.transferBreakdown[inField]) {
      addEntry(map, e, stores)
    }
    for (const e of rec.transferBreakdown[outField]) {
      addEntry(map, e, stores)
    }
  }

  return Array.from(map.values()).sort((a, b) => Math.abs(b.cost) - Math.abs(a.cost))
}

function addEntry(
  map: Map<string, FlowEntry>,
  e: TransferBreakdownEntry,
  stores: ReadonlyMap<string, { id: string; name: string }>,
) {
  const key = `${e.fromStoreId}->${e.toStoreId}`
  const existing = map.get(key)
  if (existing) {
    map.set(key, { ...existing, cost: existing.cost + e.cost, price: existing.price + e.price })
  } else {
    map.set(key, {
      from: e.fromStoreId,
      to: e.toStoreId,
      fromName: stores.get(e.fromStoreId)?.name ?? e.fromStoreId,
      toName: stores.get(e.toStoreId)?.name ?? e.toStoreId,
      cost: e.cost,
      price: e.price,
    })
  }
}

export function TransferPage() {
  const { isCalculated } = useCalculation()
  const { currentResult, storeName, stores } = useStoreSelection()
  const [transferType, setTransferType] = useState<TransferType>('interStore')
  const [selectedPair, setSelectedPair] = useState<string | null>(null)
  const [expandedDay, setExpandedDay] = useState<number | null>(null)

  const days = useMemo(
    () => currentResult ? Array.from(currentResult.daily.entries()).sort(([a], [b]) => a - b) : [],
    [currentResult],
  )

  const isInterStore = transferType === 'interStore'
  const inField = isInterStore ? 'interStoreIn' as const : 'interDepartmentIn' as const
  const outField = isInterStore ? 'interStoreOut' as const : 'interDepartmentOut' as const

  const flows = useMemo(
    () => days.length > 0 ? aggregateFlows(days, inField, outField, stores) : [],
    [days, inField, outField, stores],
  )

  // ペア別日別データ（ペア選択時）
  const pairDailyData = useMemo(() => {
    if (!selectedPair) return null
    return days
      .map(([day, rec]) => {
        const entries = [
          ...rec.transferBreakdown[inField],
          ...rec.transferBreakdown[outField],
        ].filter(e => `${e.fromStoreId}->${e.toStoreId}` === selectedPair)
        const cost = entries.reduce((s, e) => s + e.cost, 0)
        const price = entries.reduce((s, e) => s + e.price, 0)
        return { day, cost, price }
      })
      .filter(d => d.cost !== 0 || d.price !== 0)
  }, [selectedPair, days, inField, outField])

  // 全体の日別合計
  const dailyTotals = useMemo(() => days.reduce(
    (acc, [, rec]) => {
      const inRec = rec[inField]
      const outRec = rec[outField]
      return {
        inCost: acc.inCost + inRec.cost,
        inPrice: acc.inPrice + inRec.price,
        outCost: acc.outCost + outRec.cost,
        outPrice: acc.outPrice + outRec.price,
      }
    },
    { inCost: 0, inPrice: 0, outCost: 0, outPrice: 0 },
  ), [days, inField, outField])

  const handleTypeChange = (type: TransferType) => {
    setTransferType(type)
    setSelectedPair(null)
    setExpandedDay(null)
  }

  const handleDayClick = (day: number) => {
    setExpandedDay(expandedDay === day ? null : day)
  }

  if (!isCalculated || !currentResult) {
    return (
      <MainContent title="店間・部門間移動" storeName={storeName}>
        <EmptyState>計算を実行してください</EmptyState>
      </MainContent>
    )
  }

  const td = currentResult.transferDetails
  const fmtOrDash = (val: number) => val !== 0 ? formatCurrency(val) : '-'

  const typeIn = isInterStore ? td.interStoreIn : td.interDepartmentIn
  const typeOut = isInterStore ? td.interStoreOut : td.interDepartmentOut
  const typeNet = { cost: typeIn.cost + typeOut.cost, price: typeIn.price + typeOut.price }
  const typeLabel = isInterStore ? '店間' : '部門間'

  const selectedFlow = selectedPair ? flows.find(f => `${f.from}->${f.to}` === selectedPair) : null

  return (
    <MainContent title="店間・部門間移動" storeName={storeName}>
      {/* タイプ切替 */}
      <Section>
        <ChipGroup>
          <Chip $active={transferType === 'interStore'} onClick={() => handleTypeChange('interStore')}>店間移動</Chip>
          <Chip $active={transferType === 'interDepartment'} onClick={() => handleTypeChange('interDepartment')}>部門間移動</Chip>
        </ChipGroup>
      </Section>

      {/* KPI（選択タイプの入/出/純増減） */}
      <KpiGrid>
        <KpiCard label={`${typeLabel}入`} value={formatCurrency(typeIn.cost)} subText={`売価: ${formatCurrency(typeIn.price)}`} accent="#3b82f6" />
        <KpiCard label={`${typeLabel}出`} value={formatCurrency(typeOut.cost)} subText={`売価: ${formatCurrency(typeOut.price)}`} accent="#f43f5e" />
        <KpiCard
          label="純増減"
          value={formatCurrency(typeNet.cost)}
          subText={`売価: ${formatCurrency(typeNet.price)}`}
          accent={typeNet.cost >= 0 ? '#22c55e' : '#ef4444'}
        />
      </KpiGrid>

      {/* ペアチップ */}
      {flows.length > 0 && (
        <Section>
          <ChipGroup>
            <Chip $active={selectedPair === null} onClick={() => setSelectedPair(null)}>全て</Chip>
            {flows.map(f => {
              const key = `${f.from}->${f.to}`
              return (
                <Chip
                  key={key}
                  $active={selectedPair === key}
                  onClick={() => setSelectedPair(selectedPair === key ? null : key)}
                >
                  {f.from}→{f.to}
                </Chip>
              )
            })}
          </ChipGroup>
        </Section>
      )}

      {/* データ */}
      {flows.length === 0 ? (
        <EmptyState>{typeLabel}移動データがありません</EmptyState>
      ) : selectedPair && pairDailyData ? (
        <Card>
          <CardTitle>{selectedFlow?.fromName ?? ''} → {selectedFlow?.toName ?? ''}</CardTitle>
          <TableWrapper>
            <Table>
              <thead>
                <tr>
                  <Th>日</Th>
                  <Th>原価</Th>
                  <Th>売価</Th>
                </tr>
              </thead>
              <tbody>
                {pairDailyData.map(d => (
                  <Tr key={d.day}>
                    <Td>{d.day}日</Td>
                    <Td $negative={d.cost < 0}>{formatCurrency(d.cost)}</Td>
                    <Td $negative={d.price < 0}>{formatCurrency(d.price)}</Td>
                  </Tr>
                ))}
                <TrTotal>
                  <Td>合計</Td>
                  <Td>{formatCurrency(pairDailyData.reduce((s, d) => s + d.cost, 0))}</Td>
                  <Td>{formatCurrency(pairDailyData.reduce((s, d) => s + d.price, 0))}</Td>
                </TrTotal>
              </tbody>
            </Table>
          </TableWrapper>
        </Card>
      ) : (
        <Card>
          <CardTitle>{typeLabel}移動 日別明細</CardTitle>
          <TableWrapper>
            <Table>
              <thead>
                <tr>
                  <Th>日</Th>
                  <Th>入（原価）</Th>
                  <Th>入（売価）</Th>
                  <Th>出（原価）</Th>
                  <Th>出（売価）</Th>
                  <Th>差引</Th>
                </tr>
              </thead>
              <tbody>
                {days.map(([day, rec]) => {
                  const inRec = rec[inField]
                  const outRec = rec[outField]
                  const net = inRec.cost + outRec.cost
                  const hasData = inRec.cost !== 0 || outRec.cost !== 0
                  if (!hasData) return null
                  const inEntries = rec.transferBreakdown[inField]
                  const outEntries = rec.transferBreakdown[outField]
                  const hasBreakdown = inEntries.length > 0 || outEntries.length > 0
                  const isExpanded = expandedDay === day
                  // 展開行を構築: IN(←)エントリ → IN小計 → OUT(→)エントリ → OUT小計
                  const detailRows: { key: string; label: string; isSub: boolean; inCost: number; inPrice: number; outCost: number; outPrice: number }[] = []
                  if (isExpanded) {
                    // IN entries: XX←YY
                    for (const e of inEntries) {
                      const partner = stores.get(e.fromStoreId)?.name ?? e.fromStoreId
                      detailRows.push({
                        key: `in-${e.fromStoreId}-${e.toStoreId}`,
                        label: `${e.toStoreId}←${e.fromStoreId}  ${partner}`,
                        isSub: false,
                        inCost: e.cost, inPrice: e.price, outCost: 0, outPrice: 0,
                      })
                    }
                    if (inEntries.length > 1) {
                      const toId = inEntries[0]?.toStoreId ?? ''
                      detailRows.push({
                        key: 'in-sub',
                        label: `${toId}← 小計`,
                        isSub: true,
                        inCost: inRec.cost, inPrice: inRec.price, outCost: 0, outPrice: 0,
                      })
                    }
                    // OUT entries: XX→YY
                    for (const e of outEntries) {
                      const partner = stores.get(e.toStoreId)?.name ?? e.toStoreId
                      detailRows.push({
                        key: `out-${e.fromStoreId}-${e.toStoreId}`,
                        label: `${e.fromStoreId}→${e.toStoreId}  ${partner}`,
                        isSub: false,
                        inCost: 0, inPrice: 0, outCost: e.cost, outPrice: e.price,
                      })
                    }
                    if (outEntries.length > 1) {
                      const fromId = outEntries[0]?.fromStoreId ?? ''
                      detailRows.push({
                        key: 'out-sub',
                        label: `${fromId}→ 小計`,
                        isSub: true,
                        inCost: 0, inPrice: 0, outCost: outRec.cost, outPrice: outRec.price,
                      })
                    }
                  }
                  return (
                    <>{/* Fragment for day + detail rows */}
                      <Tr key={day} $clickable={hasBreakdown} $expanded={isExpanded} onClick={() => hasBreakdown && handleDayClick(day)}>
                        <Td>
                          {hasBreakdown && <ToggleIcon $expanded={isExpanded}>&#9654;</ToggleIcon>}
                          {day}日
                        </Td>
                        <Td>{fmtOrDash(inRec.cost)}</Td>
                        <Td>{fmtOrDash(inRec.price)}</Td>
                        <Td $negative={outRec.cost < 0}>{fmtOrDash(outRec.cost)}</Td>
                        <Td $negative={outRec.price < 0}>{fmtOrDash(outRec.price)}</Td>
                        <Td $negative={net < 0} $positive={net > 0}>{fmtOrDash(net)}</Td>
                      </Tr>
                      {isExpanded && detailRows.map((row, idx) => {
                        const isLast = idx === detailRows.length - 1
                        const TrRow = isLast ? TrDetailLast : TrDetail
                        const rowNet = row.inCost + row.outCost
                        return (
                          <TrRow key={`${day}-${row.key}`}>
                            <Td><DetailLabel $sub={row.isSub}>{row.label}</DetailLabel></Td>
                            <Td>{row.inCost !== 0 ? formatCurrency(row.inCost) : '-'}</Td>
                            <Td>{row.inPrice !== 0 ? formatCurrency(row.inPrice) : '-'}</Td>
                            <Td $negative={row.outCost < 0}>{row.outCost !== 0 ? formatCurrency(row.outCost) : '-'}</Td>
                            <Td $negative={row.outPrice < 0}>{row.outPrice !== 0 ? formatCurrency(row.outPrice) : '-'}</Td>
                            <Td $negative={rowNet < 0} $positive={rowNet > 0}>{rowNet !== 0 ? formatCurrency(rowNet) : '-'}</Td>
                          </TrRow>
                        )
                      })}
                    </>
                  )
                })}
                <TrTotal>
                  <Td>合計</Td>
                  <Td>{formatCurrency(dailyTotals.inCost)}</Td>
                  <Td>{formatCurrency(dailyTotals.inPrice)}</Td>
                  <Td $negative={dailyTotals.outCost < 0}>{formatCurrency(dailyTotals.outCost)}</Td>
                  <Td $negative={dailyTotals.outPrice < 0}>{formatCurrency(dailyTotals.outPrice)}</Td>
                  <Td $negative={dailyTotals.inCost + dailyTotals.outCost < 0} $positive={dailyTotals.inCost + dailyTotals.outCost > 0}>
                    {formatCurrency(dailyTotals.inCost + dailyTotals.outCost)}
                  </Td>
                </TrTotal>
              </tbody>
            </Table>
          </TableWrapper>
        </Card>
      )}
    </MainContent>
  )
}
