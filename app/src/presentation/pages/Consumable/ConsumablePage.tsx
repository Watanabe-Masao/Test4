import { useState, useMemo } from 'react'
import { MainContent } from '@/presentation/components/Layout'
import { Card, CardTitle, Chip, ChipGroup, KpiCard, KpiGrid } from '@/presentation/components/common'
import { useCalculation, useStoreSelection } from '@/application/hooks'
import { formatCurrency, formatPercent } from '@/domain/calculations/utils'
import type { DailyRecord } from '@/domain/models'
import {
  Section, TableWrapper, Table, Th, Td, Tr, TrTotal, EmptyState,
  Bar, RankBadge, PairGrid,
} from './ConsumablePage.styles'

type ViewMode = 'item' | 'account' | 'daily'

/** 品目別集計行 */
interface ItemAggregate {
  itemCode: string
  itemName: string
  accountCode: string
  totalQuantity: number
  totalCost: number
  dayCount: number
}

/** 勘定科目別集計行 */
interface AccountAggregate {
  accountCode: string
  totalCost: number
  itemCount: number
}

/** 全日から品目別集計を構築 */
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
      daySeen.get(key)!.add(day)
    }
  }

  for (const [key, entry] of map) {
    map.set(key, { ...entry, dayCount: daySeen.get(key)!.size })
  }

  return Array.from(map.values()).sort((a, b) => b.totalCost - a.totalCost)
}

/** 勘定科目別集計 */
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

export function ConsumablePage() {
  const { isCalculated } = useCalculation()
  const { currentResult, storeName } = useStoreSelection()
  const [viewMode, setViewMode] = useState<ViewMode>('item')

  const days = useMemo(
    () => currentResult ? Array.from(currentResult.daily.entries()).sort(([a], [b]) => a - b) : [],
    [currentResult],
  )

  const itemAggregates = useMemo(() => aggregateByItem(days), [days])
  const accountAggregates = useMemo(() => aggregateByAccount(itemAggregates), [itemAggregates])

  if (!isCalculated || !currentResult) {
    return (
      <MainContent title="消耗品分析" storeName={storeName}>
        <EmptyState>計算を実行してください</EmptyState>
      </MainContent>
    )
  }

  const r = currentResult
  const totalCost = r.totalConsumable
  const maxItemCost = itemAggregates.length > 0 ? itemAggregates[0].totalCost : 1
  const maxAccountCost = accountAggregates.length > 0 ? accountAggregates[0].totalCost : 1

  // 日別集計
  const dailyData = days
    .filter(([, rec]) => rec.consumable.cost > 0 || rec.consumable.items.length > 0)
    .map(([day, rec]) => ({
      day,
      cost: rec.consumable.cost,
      itemCount: rec.consumable.items.length,
      items: rec.consumable.items,
    }))

  const hasData = totalCost > 0 || itemAggregates.length > 0

  return (
    <MainContent title="消耗品分析" storeName={storeName}>
      {/* サマリーKPI */}
      <KpiGrid>
        <KpiCard label="消耗品費合計" value={formatCurrency(totalCost)} accent="#f97316" />
        <KpiCard label="消耗品率" value={formatPercent(r.consumableRate)} subText={`売上高: ${formatCurrency(r.totalSales)}`} accent="#ea580c" />
        <KpiCard label="品目数" value={`${itemAggregates.length}品目`} subText={`勘定科目: ${accountAggregates.length}科目`} accent="#8b5cf6" />
        <KpiCard label="計上日数" value={`${dailyData.length}日`} subText={`日平均: ${dailyData.length > 0 ? formatCurrency(totalCost / dailyData.length) : '-'}`} accent="#3b82f6" />
      </KpiGrid>

      {!hasData ? (
        <EmptyState>消耗品データがありません</EmptyState>
      ) : (
        <>
          {/* ビュー切替 */}
          <Section>
            <ChipGroup>
              <Chip $active={viewMode === 'item'} onClick={() => setViewMode('item')}>品目別</Chip>
              <Chip $active={viewMode === 'account'} onClick={() => setViewMode('account')}>勘定科目別</Chip>
              <Chip $active={viewMode === 'daily'} onClick={() => setViewMode('daily')}>日別明細</Chip>
            </ChipGroup>
          </Section>

          {/* 品目別 */}
          {viewMode === 'item' && (
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
                      const ratio = totalCost > 0 ? item.totalCost / totalCost : 0
                      return (
                        <Tr key={item.itemCode}>
                          <Td><RankBadge $rank={idx + 1}>{idx + 1}</RankBadge></Td>
                          <Td>{item.itemName}</Td>
                          <Td $muted>{item.itemCode}</Td>
                          <Td $muted>{item.accountCode}</Td>
                          <Td>{item.totalQuantity.toLocaleString()}</Td>
                          <Td>
                            <Bar $width={(item.totalCost / maxItemCost) * 100} $color="#f97316" />
                            {formatCurrency(item.totalCost)}
                          </Td>
                          <Td>{formatPercent(ratio)}</Td>
                          <Td>{item.dayCount}日</Td>
                        </Tr>
                      )
                    })}
                    <TrTotal>
                      <Td />
                      <Td>合計</Td>
                      <Td />
                      <Td />
                      <Td>{itemAggregates.reduce((s, i) => s + i.totalQuantity, 0).toLocaleString()}</Td>
                      <Td>{formatCurrency(totalCost)}</Td>
                      <Td>100.0%</Td>
                      <Td />
                    </TrTotal>
                  </tbody>
                </Table>
              </TableWrapper>
            </Card>
          )}

          {/* 勘定科目別 */}
          {viewMode === 'account' && (
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
                      {accountAggregates.map(acc => {
                        const ratio = totalCost > 0 ? acc.totalCost / totalCost : 0
                        return (
                          <Tr key={acc.accountCode}>
                            <Td>{acc.accountCode}</Td>
                            <Td>{acc.itemCount}品目</Td>
                            <Td>
                              <Bar $width={(acc.totalCost / maxAccountCost) * 100} $color="#8b5cf6" />
                              {formatCurrency(acc.totalCost)}
                            </Td>
                            <Td>{formatPercent(ratio)}</Td>
                          </Tr>
                        )
                      })}
                      <TrTotal>
                        <Td>合計</Td>
                        <Td>{accountAggregates.reduce((s, a) => s + a.itemCount, 0)}品目</Td>
                        <Td>{formatCurrency(totalCost)}</Td>
                        <Td>100.0%</Td>
                      </TrTotal>
                    </tbody>
                  </Table>
                </TableWrapper>

                {/* 勘定科目別の品目内訳 */}
                <div>
                  {accountAggregates.map(acc => {
                    const items = itemAggregates.filter(i => i.accountCode === acc.accountCode)
                    return (
                      <Card key={acc.accountCode} style={{ marginBottom: '1rem' }}>
                        <CardTitle>科目 {acc.accountCode}（{items.length}品目 / {formatCurrency(acc.totalCost)}）</CardTitle>
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
                              {items.map(item => (
                                <Tr key={item.itemCode}>
                                  <Td>{item.itemName}</Td>
                                  <Td>{item.totalQuantity.toLocaleString()}</Td>
                                  <Td>{formatCurrency(item.totalCost)}</Td>
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

          {/* 日別明細 */}
          {viewMode === 'daily' && (
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
                    {dailyData.map(d => (
                      <Tr key={d.day}>
                        <Td>{d.day}日</Td>
                        <Td>{formatCurrency(d.cost)}</Td>
                        <Td>{d.itemCount}品目</Td>
                        <Td $muted>
                          {d.items.slice(0, 5).map((item, i) => (
                            <span key={i}>
                              {i > 0 && ' / '}
                              {item.itemName}({formatCurrency(item.cost)})
                            </span>
                          ))}
                          {d.items.length > 5 && ` 他${d.items.length - 5}件`}
                        </Td>
                      </Tr>
                    ))}
                    <TrTotal>
                      <Td>合計</Td>
                      <Td>{formatCurrency(totalCost)}</Td>
                      <Td>{dailyData.reduce((s, d) => s + d.itemCount, 0)}件</Td>
                      <Td />
                    </TrTotal>
                  </tbody>
                </Table>
              </TableWrapper>
            </Card>
          )}
        </>
      )}
    </MainContent>
  )
}
