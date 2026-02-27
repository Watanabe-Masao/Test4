import { useState, useMemo, Fragment } from 'react'
import { MainContent } from '@/presentation/components/Layout'
import {
  Card,
  CardTitle,
  Chip,
  ChipGroup,
  KpiCard,
  KpiGrid,
} from '@/presentation/components/common'
import { useCalculation, useStoreSelection } from '@/application/hooks'
import { formatCurrency, formatPercent } from '@/domain/calculations/utils'
import type { DailyRecord, TransferBreakdownEntry } from '@/domain/models'
import { sc } from '@/presentation/theme/semanticColors'
import {
  TabBar,
  Tab,
  Section,
  TableWrapper,
  Table,
  Th,
  Td,
  Tr,
  TrTotal,
  TrDetail,
  TrDetailLast,
  ToggleIcon,
  EmptyState,
  FlowTable,
  FlowTh,
  FlowTd,
  FlowTr,
  FlowGroupHeader,
  FlowBar,
  Bar,
  RankBadge,
  PairGrid,
  ConsumTd,
} from './CostDetailPage.styles'

type ActiveTab = 'transfer' | 'consumable'
type TransferType = 'interStore' | 'interDepartment'
type ConsumableViewMode = 'item' | 'account' | 'daily'

// ─── Transfer helpers ─────────────────────────────────

interface FlowEntry {
  from: string
  to: string
  fromName: string
  toName: string
  cost: number
  price: number
}

function aggregateFlows(
  days: [number, DailyRecord][],
  inField: 'interStoreIn' | 'interDepartmentIn',
  outField: 'interStoreOut' | 'interDepartmentOut',
  stores: ReadonlyMap<string, { id: string; name: string }>,
): FlowEntry[] {
  const map = new Map<string, FlowEntry>()
  for (const [, rec] of days) {
    for (const e of rec.transferBreakdown[inField]) addEntry(map, e, stores)
    for (const e of rec.transferBreakdown[outField]) addEntry(map, e, stores)
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

// ─── Consumable helpers ───────────────────────────────

interface ItemAggregate {
  itemCode: string
  itemName: string
  accountCode: string
  totalQuantity: number
  totalCost: number
  dayCount: number
}
interface AccountAggregate {
  accountCode: string
  totalCost: number
  itemCount: number
}
interface ItemDetail {
  day: number
  storeId: string
  storeName: string
  quantity: number
  cost: number
}

function aggregateByItem(days: [number, DailyRecord][]): ItemAggregate[] {
  const map = new Map<string, ItemAggregate>()
  const daySeen = new Map<string, Set<number>>()
  for (const [day, rec] of days) {
    for (const item of rec.consumable.items) {
      const key = item.itemCode
      const existing = map.get(key)
      if (existing) {
        map.set(key, {
          ...existing,
          totalQuantity: existing.totalQuantity + item.quantity,
          totalCost: existing.totalCost + item.cost,
        })
      } else {
        map.set(key, {
          itemCode: item.itemCode,
          itemName: item.itemName,
          accountCode: item.accountCode,
          totalQuantity: item.quantity,
          totalCost: item.cost,
          dayCount: 0,
        })
        daySeen.set(key, new Set())
      }
      daySeen.get(key)?.add(day)
    }
  }
  for (const [key, entry] of map) map.set(key, { ...entry, dayCount: daySeen.get(key)?.size ?? 0 })
  return Array.from(map.values()).sort((a, b) => b.totalCost - a.totalCost)
}

function aggregateByAccount(items: ItemAggregate[]): AccountAggregate[] {
  const map = new Map<string, AccountAggregate>()
  for (const item of items) {
    const existing = map.get(item.accountCode)
    if (existing) {
      map.set(item.accountCode, {
        ...existing,
        totalCost: existing.totalCost + item.totalCost,
        itemCount: existing.itemCount + 1,
      })
    } else {
      map.set(item.accountCode, {
        accountCode: item.accountCode,
        totalCost: item.totalCost,
        itemCount: 1,
      })
    }
  }
  return Array.from(map.values()).sort((a, b) => b.totalCost - a.totalCost)
}

// ─── Main Component ───────────────────────────────────

export function CostDetailPage() {
  useCalculation()
  const { currentResult, selectedResults, storeName, stores } = useStoreSelection()
  const [activeTab, setActiveTab] = useState<ActiveTab>('transfer')

  // Transfer state
  const [transferType, setTransferType] = useState<TransferType>('interStore')
  const [selectedPair, setSelectedPair] = useState<string | null>(null)
  const [expandedDay, setExpandedDay] = useState<number | null>(null)

  // Consumable state
  const [consumableView, setConsumableView] = useState<ConsumableViewMode>('item')
  const [selectedItem, setSelectedItem] = useState<string | null>(null)

  const days = useMemo(
    () =>
      currentResult ? Array.from(currentResult.daily.entries()).sort(([a], [b]) => a - b) : [],
    [currentResult],
  )

  // ─── Transfer data ────────────────────────────────
  const isInterStore = transferType === 'interStore'
  const inField = isInterStore ? ('interStoreIn' as const) : ('interDepartmentIn' as const)
  const outField = isInterStore ? ('interStoreOut' as const) : ('interDepartmentOut' as const)

  const flows = useMemo(
    () => (days.length > 0 ? aggregateFlows(days, inField, outField, stores) : []),
    [days, inField, outField, stores],
  )

  const groupedFlows = useMemo(() => {
    if (flows.length === 0) return []
    const groups = new Map<
      string,
      {
        fromId: string
        fromName: string
        entries: FlowEntry[]
        totalCost: number
        totalPrice: number
      }
    >()
    for (const f of flows) {
      const existing = groups.get(f.from)
      if (existing) {
        existing.entries.push(f)
        existing.totalCost += f.cost
        existing.totalPrice += f.price
      } else {
        groups.set(f.from, {
          fromId: f.from,
          fromName: f.fromName,
          entries: [f],
          totalCost: f.cost,
          totalPrice: f.price,
        })
      }
    }
    return Array.from(groups.values()).sort((a, b) => Math.abs(b.totalCost) - Math.abs(a.totalCost))
  }, [flows])

  const maxFlowCost = useMemo(
    () => (flows.length === 0 ? 1 : Math.max(...flows.map((f) => Math.abs(f.cost)), 1)),
    [flows],
  )

  const pairDailyData = useMemo(() => {
    if (!selectedPair) return null
    return days
      .map(([day, rec]) => {
        const entries = [
          ...rec.transferBreakdown[inField],
          ...rec.transferBreakdown[outField],
        ].filter((e) => `${e.fromStoreId}->${e.toStoreId}` === selectedPair)
        const cost = entries.reduce((s, e) => s + e.cost, 0)
        const price = entries.reduce((s, e) => s + e.price, 0)
        return { day, cost, price }
      })
      .filter((d) => d.cost !== 0 || d.price !== 0)
  }, [selectedPair, days, inField, outField])

  const dailyTotals = useMemo(
    () =>
      days.reduce(
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
      ),
    [days, inField, outField],
  )

  // ─── Consumable data ──────────────────────────────
  const itemAggregates = useMemo(() => aggregateByItem(days), [days])
  const accountAggregates = useMemo(() => aggregateByAccount(itemAggregates), [itemAggregates])

  const itemDetailData = useMemo(() => {
    if (!selectedItem) return null
    const details: ItemDetail[] = []
    for (const result of selectedResults) {
      const stName = stores.get(result.storeId)?.name ?? result.storeId
      for (const [day, rec] of result.daily) {
        for (const item of rec.consumable.items) {
          if (item.itemCode === selectedItem)
            details.push({
              day,
              storeId: result.storeId,
              storeName: stName,
              quantity: item.quantity,
              cost: item.cost,
            })
        }
      }
    }
    return details.sort((a, b) => a.day - b.day || a.storeId.localeCompare(b.storeId))
  }, [selectedItem, selectedResults, stores])

  // ─── Handlers ─────────────────────────────────────
  const handleTransferTypeChange = (type: TransferType) => {
    setTransferType(type)
    setSelectedPair(null)
    setExpandedDay(null)
  }
  const handleDayClick = (day: number) => setExpandedDay(expandedDay === day ? null : day)
  const handleItemClick = (itemCode: string) =>
    setSelectedItem(selectedItem === itemCode ? null : itemCode)

  if (!currentResult) {
    return (
      <MainContent title="原価明細" storeName={storeName}>
        <EmptyState>計算を実行してください</EmptyState>
      </MainContent>
    )
  }

  const r = currentResult
  const td = r.transferDetails
  const typeIn = isInterStore ? td.interStoreIn : td.interDepartmentIn
  const typeOut = isInterStore ? td.interStoreOut : td.interDepartmentOut
  const typeNet = { cost: typeIn.cost + typeOut.cost, price: typeIn.price + typeOut.price }
  const typeLabel = isInterStore ? '店間' : '部門間'
  const selectedFlow = selectedPair
    ? flows.find((f) => `${f.from}->${f.to}` === selectedPair)
    : null
  const fmtOrDash = (val: number) => (val !== 0 ? formatCurrency(val) : '-')

  const totalConsumableCost = r.totalConsumable
  const maxItemCost = itemAggregates.length > 0 ? itemAggregates[0].totalCost : 1
  const maxAccountCost = accountAggregates.length > 0 ? accountAggregates[0].totalCost : 1
  const dailyConsumableData = days
    .filter(([, rec]) => rec.consumable.cost > 0 || rec.consumable.items.length > 0)
    .map(([day, rec]) => ({
      day,
      cost: rec.consumable.cost,
      itemCount: rec.consumable.items.length,
      items: rec.consumable.items,
    }))
  const hasConsumableData = totalConsumableCost > 0 || itemAggregates.length > 0

  return (
    <MainContent title="原価明細" storeName={storeName}>
      {/* サマリーKPI（常に表示） */}
      <KpiGrid>
        <KpiCard
          label={`${typeLabel}入`}
          value={formatCurrency(typeIn.cost)}
          subText={`売価: ${formatCurrency(typeIn.price)}`}
          accent="#3b82f6"
        />
        <KpiCard
          label={`${typeLabel}出`}
          value={formatCurrency(typeOut.cost)}
          subText={`売価: ${formatCurrency(typeOut.price)}`}
          accent="#f43f5e"
        />
        <KpiCard
          label="消耗品費合計"
          value={formatCurrency(totalConsumableCost)}
          accent="#f97316"
        />
        <KpiCard
          label="消耗品率"
          value={formatPercent(r.consumableRate)}
          subText={`売上高: ${formatCurrency(r.totalSales)}`}
          accent="#ea580c"
        />
      </KpiGrid>

      {/* タブバー */}
      <TabBar>
        <Tab $active={activeTab === 'transfer'} onClick={() => setActiveTab('transfer')}>
          移動
        </Tab>
        <Tab $active={activeTab === 'consumable'} onClick={() => setActiveTab('consumable')}>
          消耗品
        </Tab>
      </TabBar>

      {/* ═══ 移動タブ ═══ */}
      {activeTab === 'transfer' && (
        <>
          <Section>
            <ChipGroup>
              <Chip
                $active={transferType === 'interStore'}
                onClick={() => handleTransferTypeChange('interStore')}
              >
                店間移動
              </Chip>
              <Chip
                $active={transferType === 'interDepartment'}
                onClick={() => handleTransferTypeChange('interDepartment')}
              >
                部門間移動
              </Chip>
            </ChipGroup>
          </Section>

          <KpiGrid>
            <KpiCard
              label={`${typeLabel}入`}
              value={formatCurrency(typeIn.cost)}
              subText={`売価: ${formatCurrency(typeIn.price)}`}
              accent="#3b82f6"
            />
            <KpiCard
              label={`${typeLabel}出`}
              value={formatCurrency(typeOut.cost)}
              subText={`売価: ${formatCurrency(typeOut.price)}`}
              accent="#f43f5e"
            />
            <KpiCard
              label="純増減"
              value={formatCurrency(typeNet.cost)}
              subText={`売価: ${formatCurrency(typeNet.price)}`}
              accent={sc.cond(typeNet.cost >= 0)}
            />
          </KpiGrid>

          {groupedFlows.length > 0 && (
            <Section>
              <Card>
                <CardTitle>{typeLabel}移動 ペア一覧</CardTitle>
                <TableWrapper>
                  <FlowTable>
                    <thead>
                      <tr>
                        <FlowTh>移動元</FlowTh>
                        <FlowTh>移動先</FlowTh>
                        <FlowTh>原価</FlowTh>
                        <FlowTh>規模</FlowTh>
                      </tr>
                    </thead>
                    <tbody>
                      <FlowTr $active={selectedPair === null} onClick={() => setSelectedPair(null)}>
                        <FlowTd $label>全て表示</FlowTd>
                        <FlowTd $label>-</FlowTd>
                        <FlowTd>{formatCurrency(dailyTotals.inCost + dailyTotals.outCost)}</FlowTd>
                        <FlowTd>
                          <FlowBar $pct={100} $dir="neutral" />
                        </FlowTd>
                      </FlowTr>
                      {groupedFlows.map((group) => (
                        <Fragment key={`grp-${group.fromId}`}>
                          <FlowGroupHeader>
                            <FlowTd colSpan={4} $label>
                              {group.fromName}（{group.fromId}）から — {group.entries.length}件 /{' '}
                              {formatCurrency(group.totalCost)}
                            </FlowTd>
                          </FlowGroupHeader>
                          {group.entries.map((f) => {
                            const key = `${f.from}->${f.to}`
                            const pct = Math.round((Math.abs(f.cost) / maxFlowCost) * 100)
                            const dir =
                              f.cost > 0
                                ? ('in' as const)
                                : f.cost < 0
                                  ? ('out' as const)
                                  : ('neutral' as const)
                            return (
                              <FlowTr
                                key={key}
                                $active={selectedPair === key}
                                onClick={() => setSelectedPair(selectedPair === key ? null : key)}
                              >
                                <FlowTd $label>{f.fromName}</FlowTd>
                                <FlowTd $label>{f.toName}</FlowTd>
                                <FlowTd $negative={f.cost < 0}>{formatCurrency(f.cost)}</FlowTd>
                                <FlowTd>
                                  <FlowBar $pct={pct} $dir={dir} />
                                </FlowTd>
                              </FlowTr>
                            )
                          })}
                        </Fragment>
                      ))}
                    </tbody>
                  </FlowTable>
                </TableWrapper>
              </Card>
            </Section>
          )}

          {flows.length === 0 ? (
            <EmptyState>{typeLabel}移動データがありません</EmptyState>
          ) : selectedPair && pairDailyData ? (
            <Card>
              <CardTitle>
                {selectedFlow?.fromName ?? ''} → {selectedFlow?.toName ?? ''}
              </CardTitle>
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
                    {pairDailyData.map((d) => (
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
                      const detailRows: {
                        key: string
                        label: string
                        isSub: boolean
                        inCost: number
                        inPrice: number
                        outCost: number
                        outPrice: number
                      }[] = []
                      if (isExpanded) {
                        for (const e of inEntries) {
                          const partner = stores.get(e.fromStoreId)?.name ?? e.fromStoreId
                          detailRows.push({
                            key: `in-${e.fromStoreId}-${e.toStoreId}`,
                            label: `${e.toStoreId}←${e.fromStoreId}  ${partner}`,
                            isSub: false,
                            inCost: e.cost,
                            inPrice: e.price,
                            outCost: 0,
                            outPrice: 0,
                          })
                        }
                        if (inEntries.length > 1) {
                          const toId = inEntries[0]?.toStoreId ?? ''
                          detailRows.push({
                            key: 'in-sub',
                            label: `${toId}← 小計`,
                            isSub: true,
                            inCost: inRec.cost,
                            inPrice: inRec.price,
                            outCost: 0,
                            outPrice: 0,
                          })
                        }
                        for (const e of outEntries) {
                          const partner = stores.get(e.toStoreId)?.name ?? e.toStoreId
                          detailRows.push({
                            key: `out-${e.fromStoreId}-${e.toStoreId}`,
                            label: `${e.fromStoreId}→${e.toStoreId}  ${partner}`,
                            isSub: false,
                            inCost: 0,
                            inPrice: 0,
                            outCost: e.cost,
                            outPrice: e.price,
                          })
                        }
                        if (outEntries.length > 1) {
                          const fromId = outEntries[0]?.fromStoreId ?? ''
                          detailRows.push({
                            key: 'out-sub',
                            label: `${fromId}→ 小計`,
                            isSub: true,
                            inCost: 0,
                            inPrice: 0,
                            outCost: outRec.cost,
                            outPrice: outRec.price,
                          })
                        }
                      }
                      return (
                        <Fragment key={day}>
                          <Tr
                            $clickable={hasBreakdown}
                            $expanded={isExpanded}
                            onClick={() => hasBreakdown && handleDayClick(day)}
                          >
                            <Td>
                              <ToggleIcon $expanded={isExpanded}>&#9654;</ToggleIcon>
                              {day}日
                            </Td>
                            <Td>{fmtOrDash(inRec.cost)}</Td>
                            <Td>{fmtOrDash(inRec.price)}</Td>
                            <Td $negative={outRec.cost < 0}>{fmtOrDash(outRec.cost)}</Td>
                            <Td $negative={outRec.price < 0}>{fmtOrDash(outRec.price)}</Td>
                            <Td $negative={net < 0} $positive={net > 0}>
                              {fmtOrDash(net)}
                            </Td>
                          </Tr>
                          {isExpanded &&
                            detailRows.map((row, idx) => {
                              const isLast = idx === detailRows.length - 1
                              const TrRow = isLast ? TrDetailLast : TrDetail
                              const rowNet = row.inCost + row.outCost
                              return (
                                <TrRow key={`${day}-${row.key}`}>
                                  <Td>{row.label}</Td>
                                  <Td>{row.inCost !== 0 ? formatCurrency(row.inCost) : '-'}</Td>
                                  <Td>{row.inPrice !== 0 ? formatCurrency(row.inPrice) : '-'}</Td>
                                  <Td $negative={row.outCost < 0}>
                                    {row.outCost !== 0 ? formatCurrency(row.outCost) : '-'}
                                  </Td>
                                  <Td $negative={row.outPrice < 0}>
                                    {row.outPrice !== 0 ? formatCurrency(row.outPrice) : '-'}
                                  </Td>
                                  <Td $negative={rowNet < 0} $positive={rowNet > 0}>
                                    {rowNet !== 0 ? formatCurrency(rowNet) : '-'}
                                  </Td>
                                </TrRow>
                              )
                            })}
                        </Fragment>
                      )
                    })}
                    <TrTotal>
                      <Td>合計</Td>
                      <Td>{formatCurrency(dailyTotals.inCost)}</Td>
                      <Td>{formatCurrency(dailyTotals.inPrice)}</Td>
                      <Td $negative={dailyTotals.outCost < 0}>
                        {formatCurrency(dailyTotals.outCost)}
                      </Td>
                      <Td $negative={dailyTotals.outPrice < 0}>
                        {formatCurrency(dailyTotals.outPrice)}
                      </Td>
                      <Td
                        $negative={dailyTotals.inCost + dailyTotals.outCost < 0}
                        $positive={dailyTotals.inCost + dailyTotals.outCost > 0}
                      >
                        {formatCurrency(dailyTotals.inCost + dailyTotals.outCost)}
                      </Td>
                    </TrTotal>
                  </tbody>
                </Table>
              </TableWrapper>
            </Card>
          )}
        </>
      )}

      {/* ═══ 消耗品タブ ═══ */}
      {activeTab === 'consumable' && (
        <>
          <KpiGrid>
            <KpiCard
              label="消耗品費合計"
              value={formatCurrency(totalConsumableCost)}
              accent="#f97316"
            />
            <KpiCard
              label="消耗品率"
              value={formatPercent(r.consumableRate)}
              subText={`売上高: ${formatCurrency(r.totalSales)}`}
              accent="#ea580c"
            />
            <KpiCard
              label="品目数"
              value={`${itemAggregates.length}品目`}
              subText={`勘定科目: ${accountAggregates.length}科目`}
              accent="#8b5cf6"
            />
            <KpiCard
              label="計上日数"
              value={`${dailyConsumableData.length}日`}
              subText={`日平均: ${dailyConsumableData.length > 0 ? formatCurrency(totalConsumableCost / dailyConsumableData.length) : '-'}`}
              accent="#3b82f6"
            />
          </KpiGrid>

          {!hasConsumableData ? (
            <EmptyState>消耗品データがありません</EmptyState>
          ) : (
            <>
              <Section>
                <ChipGroup>
                  <Chip
                    $active={consumableView === 'item'}
                    onClick={() => {
                      setConsumableView('item')
                      setSelectedItem(null)
                    }}
                  >
                    品目別
                  </Chip>
                  <Chip
                    $active={consumableView === 'account'}
                    onClick={() => {
                      setConsumableView('account')
                      setSelectedItem(null)
                    }}
                  >
                    勘定科目別
                  </Chip>
                  <Chip
                    $active={consumableView === 'daily'}
                    onClick={() => {
                      setConsumableView('daily')
                      setSelectedItem(null)
                    }}
                  >
                    日別明細
                  </Chip>
                </ChipGroup>
              </Section>

              {consumableView === 'item' && (
                <Card>
                  <CardTitle>品目別消耗品集計</CardTitle>
                  <TableWrapper>
                    <Table>
                      <thead>
                        <tr>
                          <Th>#</Th>
                          <Th>品名</Th>
                          <Th>品目コード</Th>
                          <Th>勘定科目</Th>
                          <Th>数量</Th>
                          <Th>金額</Th>
                          <Th>構成比</Th>
                          <Th>計上日数</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {itemAggregates.map((item, idx) => {
                          const ratio =
                            totalConsumableCost > 0 ? item.totalCost / totalConsumableCost : 0
                          const isExpanded = selectedItem === item.itemCode
                          const details = isExpanded ? itemDetailData : null
                          return (
                            <Fragment key={item.itemCode}>
                              <Tr
                                $clickable
                                $selected={isExpanded}
                                onClick={() => handleItemClick(item.itemCode)}
                              >
                                <ConsumTd>
                                  <RankBadge $rank={idx + 1}>{idx + 1}</RankBadge>
                                </ConsumTd>
                                <ConsumTd>
                                  <ToggleIcon $expanded={isExpanded}>&#9654;</ToggleIcon>
                                  {item.itemName}
                                </ConsumTd>
                                <ConsumTd $muted>{item.itemCode}</ConsumTd>
                                <ConsumTd $muted>{item.accountCode}</ConsumTd>
                                <ConsumTd>{item.totalQuantity.toLocaleString()}</ConsumTd>
                                <ConsumTd>
                                  <Bar
                                    $width={(item.totalCost / maxItemCost) * 100}
                                    $color="#f97316"
                                  />
                                  {formatCurrency(item.totalCost)}
                                </ConsumTd>
                                <ConsumTd>{formatPercent(ratio)}</ConsumTd>
                                <ConsumTd>{item.dayCount}日</ConsumTd>
                              </Tr>
                              {isExpanded &&
                                details &&
                                details.length > 0 &&
                                details.map((d, i) => {
                                  const isLast = i === details.length - 1
                                  const TrRow = isLast ? TrDetailLast : TrDetail
                                  return (
                                    <TrRow key={`detail-${d.day}-${d.storeId}-${i}`}>
                                      <ConsumTd />
                                      <ConsumTd>
                                        {d.day}日 {d.storeName}
                                      </ConsumTd>
                                      <ConsumTd />
                                      <ConsumTd />
                                      <ConsumTd>{d.quantity.toLocaleString()}</ConsumTd>
                                      <ConsumTd>{formatCurrency(d.cost)}</ConsumTd>
                                      <ConsumTd />
                                      <ConsumTd />
                                    </TrRow>
                                  )
                                })}
                            </Fragment>
                          )
                        })}
                        <TrTotal>
                          <ConsumTd />
                          <ConsumTd>合計</ConsumTd>
                          <ConsumTd />
                          <ConsumTd />
                          <ConsumTd>
                            {itemAggregates
                              .reduce((s, i) => s + i.totalQuantity, 0)
                              .toLocaleString()}
                          </ConsumTd>
                          <ConsumTd>{formatCurrency(totalConsumableCost)}</ConsumTd>
                          <ConsumTd>100.0%</ConsumTd>
                          <ConsumTd />
                        </TrTotal>
                      </tbody>
                    </Table>
                  </TableWrapper>
                </Card>
              )}

              {consumableView === 'account' && (
                <Card>
                  <CardTitle>勘定科目別集計</CardTitle>
                  <PairGrid>
                    <TableWrapper>
                      <Table>
                        <thead>
                          <tr>
                            <Th>勘定科目コード</Th>
                            <Th>品目数</Th>
                            <Th>金額</Th>
                            <Th>構成比</Th>
                          </tr>
                        </thead>
                        <tbody>
                          {accountAggregates.map((acc) => {
                            const ratio =
                              totalConsumableCost > 0 ? acc.totalCost / totalConsumableCost : 0
                            return (
                              <Tr key={acc.accountCode}>
                                <ConsumTd>{acc.accountCode}</ConsumTd>
                                <ConsumTd>{acc.itemCount}品目</ConsumTd>
                                <ConsumTd>
                                  <Bar
                                    $width={(acc.totalCost / maxAccountCost) * 100}
                                    $color="#8b5cf6"
                                  />
                                  {formatCurrency(acc.totalCost)}
                                </ConsumTd>
                                <ConsumTd>{formatPercent(ratio)}</ConsumTd>
                              </Tr>
                            )
                          })}
                          <TrTotal>
                            <ConsumTd>合計</ConsumTd>
                            <ConsumTd>
                              {accountAggregates.reduce((s, a) => s + a.itemCount, 0)}品目
                            </ConsumTd>
                            <ConsumTd>{formatCurrency(totalConsumableCost)}</ConsumTd>
                            <ConsumTd>100.0%</ConsumTd>
                          </TrTotal>
                        </tbody>
                      </Table>
                    </TableWrapper>
                    <div>
                      {accountAggregates.map((acc) => {
                        const items = itemAggregates.filter(
                          (i) => i.accountCode === acc.accountCode,
                        )
                        return (
                          <Card key={acc.accountCode} style={{ marginBottom: '1rem' }}>
                            <CardTitle>
                              科目 {acc.accountCode}（{items.length}品目 /{' '}
                              {formatCurrency(acc.totalCost)}）
                            </CardTitle>
                            <TableWrapper>
                              <Table>
                                <thead>
                                  <tr>
                                    <Th>品名</Th>
                                    <Th>数量</Th>
                                    <Th>金額</Th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {items.map((item) => (
                                    <Tr key={item.itemCode}>
                                      <ConsumTd>{item.itemName}</ConsumTd>
                                      <ConsumTd>{item.totalQuantity.toLocaleString()}</ConsumTd>
                                      <ConsumTd>{formatCurrency(item.totalCost)}</ConsumTd>
                                    </Tr>
                                  ))}
                                </tbody>
                              </Table>
                            </TableWrapper>
                          </Card>
                        )
                      })}
                    </div>
                  </PairGrid>
                </Card>
              )}

              {consumableView === 'daily' && (
                <Card>
                  <CardTitle>消耗品 日別明細</CardTitle>
                  <TableWrapper>
                    <Table>
                      <thead>
                        <tr>
                          <Th>日</Th>
                          <Th>金額</Th>
                          <Th>品目数</Th>
                          <Th>品目内訳</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {dailyConsumableData.map((d) => (
                          <Tr key={d.day}>
                            <ConsumTd>{d.day}日</ConsumTd>
                            <ConsumTd>{formatCurrency(d.cost)}</ConsumTd>
                            <ConsumTd>{d.itemCount}品目</ConsumTd>
                            <ConsumTd $muted>
                              {d.items.slice(0, 5).map((item, i) => (
                                <span key={i}>
                                  {i > 0 && ' / '}
                                  {item.itemName}({formatCurrency(item.cost)})
                                </span>
                              ))}
                              {d.items.length > 5 && ` 他${d.items.length - 5}件`}
                            </ConsumTd>
                          </Tr>
                        ))}
                        <TrTotal>
                          <ConsumTd>合計</ConsumTd>
                          <ConsumTd>{formatCurrency(totalConsumableCost)}</ConsumTd>
                          <ConsumTd>
                            {dailyConsumableData.reduce((s, d) => s + d.itemCount, 0)}件
                          </ConsumTd>
                          <ConsumTd />
                        </TrTotal>
                      </tbody>
                    </Table>
                  </TableWrapper>
                </Card>
              )}
            </>
          )}
        </>
      )}
    </MainContent>
  )
}
