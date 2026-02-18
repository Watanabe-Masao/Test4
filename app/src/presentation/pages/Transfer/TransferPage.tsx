import { useState, useMemo } from 'react'
import { MainContent } from '@/presentation/components/Layout'
import { Card, CardTitle, Chip, ChipGroup, KpiCard, KpiGrid } from '@/presentation/components/common'
import { useCalculation, useStoreSelection } from '@/application/hooks'
import { formatCurrency } from '@/domain/calculations/utils'
import type { DailyRecord, TransferBreakdownEntry } from '@/domain/models'
import {
  Section, SectionTitle, TableWrapper, Table, Th, Td, Tr, TrTotal, EmptyState,
  FlowCard, FlowLabel, FlowValue, FlowSub, FlowGrid, PairGrid,
} from './TransferPage.styles'

type TransferType = 'interStore' | 'interDepartment'
type ViewMode = 'flow' | 'daily'

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
  const [viewMode, setViewMode] = useState<ViewMode>('flow')

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

  if (!isCalculated || !currentResult) {
    return (
      <MainContent title="店間・部門間移動" storeName={storeName}>
        <EmptyState>計算を実行してください</EmptyState>
      </MainContent>
    )
  }

  const r = currentResult
  const td = r.transferDetails
  const fmtOrDash = (val: number) => val !== 0 ? formatCurrency(val) : '-'

  // 日別合計行の計算
  const dailyTotals = days.reduce(
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
  )

  return (
    <MainContent title="店間・部門間移動" storeName={storeName}>
      {/* サマリーKPI */}
      <KpiGrid>
        <KpiCard label="店間入" value={formatCurrency(td.interStoreIn.cost)} subText={`売価: ${formatCurrency(td.interStoreIn.price)}`} accent="#3b82f6" />
        <KpiCard label="店間出" value={formatCurrency(td.interStoreOut.cost)} subText={`売価: ${formatCurrency(td.interStoreOut.price)}`} accent="#f43f5e" />
        <KpiCard label="部門間入" value={formatCurrency(td.interDepartmentIn.cost)} subText={`売価: ${formatCurrency(td.interDepartmentIn.price)}`} accent="#8b5cf6" />
        <KpiCard label="部門間出" value={formatCurrency(td.interDepartmentOut.cost)} subText={`売価: ${formatCurrency(td.interDepartmentOut.price)}`} accent="#f59e0b" />
        <KpiCard
          label="店間純増減"
          value={formatCurrency(td.netTransfer.cost)}
          subText={`売価: ${formatCurrency(td.netTransfer.price)}`}
          accent={td.netTransfer.cost >= 0 ? '#22c55e' : '#ef4444'}
        />
      </KpiGrid>

      {/* モード切替 */}
      <Section>
        <ChipGroup>
          <Chip $active={transferType === 'interStore'} onClick={() => setTransferType('interStore')}>店間移動</Chip>
          <Chip $active={transferType === 'interDepartment'} onClick={() => setTransferType('interDepartment')}>部門間移動</Chip>
        </ChipGroup>
      </Section>

      <Section>
        <ChipGroup>
          <Chip $active={viewMode === 'flow'} onClick={() => setViewMode('flow')}>フロー分析</Chip>
          <Chip $active={viewMode === 'daily'} onClick={() => setViewMode('daily')}>日別明細</Chip>
        </ChipGroup>
      </Section>

      {/* フロー分析 */}
      {viewMode === 'flow' && (
        <>
          <SectionTitle>{isInterStore ? '店間' : '部門間'}移動フロー（from → to ペア別集計）</SectionTitle>
          {flows.length === 0 ? (
            <EmptyState>{isInterStore ? '店間' : '部門間'}移動データがありません</EmptyState>
          ) : (
            <>
              <FlowGrid>
                {flows.map(f => (
                  <FlowCard key={`${f.from}->${f.to}`} $accent={f.cost >= 0 ? '#3b82f6' : '#f43f5e'}>
                    <FlowLabel>{f.fromName} → {f.toName}</FlowLabel>
                    <FlowValue>{formatCurrency(f.cost)}</FlowValue>
                    <FlowSub>売価: {formatCurrency(f.price)}</FlowSub>
                  </FlowCard>
                ))}
              </FlowGrid>

              <Card>
                <CardTitle>ペア別集計テーブル</CardTitle>
                <TableWrapper>
                  <Table>
                    <thead>
                      <tr>
                        <Th>From</Th>
                        <Th>To</Th>
                        <Th>原価</Th>
                        <Th>売価</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {flows.map(f => (
                        <Tr key={`${f.from}->${f.to}`}>
                          <Td>{f.fromName}</Td>
                          <Td>{f.toName}</Td>
                          <Td $negative={f.cost < 0}>{formatCurrency(f.cost)}</Td>
                          <Td $negative={f.price < 0}>{formatCurrency(f.price)}</Td>
                        </Tr>
                      ))}
                      <TrTotal>
                        <Td>合計</Td>
                        <Td />
                        <Td>{formatCurrency(flows.reduce((s, f) => s + f.cost, 0))}</Td>
                        <Td>{formatCurrency(flows.reduce((s, f) => s + f.price, 0))}</Td>
                      </TrTotal>
                    </tbody>
                  </Table>
                </TableWrapper>
              </Card>
            </>
          )}
        </>
      )}

      {/* 日別明細 */}
      {viewMode === 'daily' && (
        <Card>
          <CardTitle>{isInterStore ? '店間' : '部門間'}移動 日別明細</CardTitle>
          <TableWrapper>
            <Table>
              <thead>
                <tr>
                  <Th>日</Th>
                  <Th>{isInterStore ? '店間入' : '部門間入'}原価</Th>
                  <Th>{isInterStore ? '店間入' : '部門間入'}売価</Th>
                  <Th>{isInterStore ? '店間出' : '部門間出'}原価</Th>
                  <Th>{isInterStore ? '店間出' : '部門間出'}売価</Th>
                  <Th>差引（原価）</Th>
                </tr>
              </thead>
              <tbody>
                {days.map(([day, rec]) => {
                  const inRec = rec[inField]
                  const outRec = rec[outField]
                  const net = inRec.cost + outRec.cost
                  const hasData = inRec.cost !== 0 || outRec.cost !== 0
                  if (!hasData) return null
                  return (
                    <Tr key={day}>
                      <Td>{day}日</Td>
                      <Td>{fmtOrDash(inRec.cost)}</Td>
                      <Td>{fmtOrDash(inRec.price)}</Td>
                      <Td $negative={outRec.cost < 0}>{fmtOrDash(outRec.cost)}</Td>
                      <Td $negative={outRec.price < 0}>{fmtOrDash(outRec.price)}</Td>
                      <Td $negative={net < 0} $positive={net > 0}>{fmtOrDash(net)}</Td>
                    </Tr>
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
