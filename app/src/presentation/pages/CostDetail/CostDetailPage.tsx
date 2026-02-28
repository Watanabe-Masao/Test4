import { Fragment } from 'react'
import { MainContent } from '@/presentation/components/Layout'
import {
  Card,
  CardTitle,
  Chip,
  ChipGroup,
  KpiCard,
  KpiGrid,
} from '@/presentation/components/common'
import { formatCurrency, formatPercent } from '@/domain/calculations/utils'
import { sc } from '@/presentation/theme/semanticColors'
import { palette } from '@/presentation/theme/tokens'
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
import { useCostDetailData } from './useCostDetailData'

// ─── Main Component ───────────────────────────────────

export function CostDetailPage() {
  const {
    currentResult,
    storeName,
    activeTab,
    setActiveTab,
    transferType,
    selectedPair,
    setSelectedPair,
    flows,
    groupedFlows,
    maxFlowCost,
    pairDailyData,
    dailyTotals,
    dailyTransferRows,
    typeIn,
    typeOut,
    typeNet,
    typeLabel,
    selectedFlow,
    consumableView,
    selectedItem,
    itemAggregates,
    accountAggregates,
    itemDetailData,
    totalConsumableCost,
    consumableRate,
    totalSales,
    maxItemCost,
    maxAccountCost,
    dailyConsumableData,
    hasConsumableData,
    handleTransferTypeChange,
    handleDayClick,
    handleItemClick,
    handleConsumableViewChange,
  } = useCostDetailData()

  if (!currentResult || !typeIn || !typeOut || !typeNet) {
    return (
      <MainContent title="原価明細" storeName={storeName}>
        <EmptyState>計算を実行してください</EmptyState>
      </MainContent>
    )
  }

  const fmtOrDash = (val: number) => (val !== 0 ? formatCurrency(val) : '-')

  return (
    <MainContent title="原価明細" storeName={storeName}>
      {/* サマリーKPI（常に表示） */}
      <KpiGrid>
        <KpiCard
          label={`${typeLabel}入`}
          value={formatCurrency(typeIn.cost)}
          subText={`売価: ${formatCurrency(typeIn.price)}`}
          accent={palette.blueDark}
        />
        <KpiCard
          label={`${typeLabel}出`}
          value={formatCurrency(typeOut.cost)}
          subText={`売価: ${formatCurrency(typeOut.price)}`}
          accent={palette.dangerDark}
        />
        <KpiCard
          label="消耗品費合計"
          value={formatCurrency(totalConsumableCost)}
          accent={palette.orange}
        />
        <KpiCard
          label="消耗品率"
          value={formatPercent(consumableRate)}
          subText={`売上高: ${formatCurrency(totalSales)}`}
          accent={palette.orangeDark}
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
              accent={palette.blueDark}
            />
            <KpiCard
              label={`${typeLabel}出`}
              value={formatCurrency(typeOut.cost)}
              subText={`売価: ${formatCurrency(typeOut.price)}`}
              accent={palette.dangerDark}
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
                    {dailyTransferRows.map((row) => (
                      <Fragment key={row.day}>
                        <Tr
                          $clickable={row.hasBreakdown}
                          $expanded={row.isExpanded}
                          onClick={() => row.hasBreakdown && handleDayClick(row.day)}
                        >
                          <Td>
                            <ToggleIcon $expanded={row.isExpanded}>&#9654;</ToggleIcon>
                            {row.day}日
                          </Td>
                          <Td>{fmtOrDash(row.inCost)}</Td>
                          <Td>{fmtOrDash(row.inPrice)}</Td>
                          <Td $negative={row.outCost < 0}>{fmtOrDash(row.outCost)}</Td>
                          <Td $negative={row.outPrice < 0}>{fmtOrDash(row.outPrice)}</Td>
                          <Td $negative={row.net < 0} $positive={row.net > 0}>
                            {fmtOrDash(row.net)}
                          </Td>
                        </Tr>
                        {row.isExpanded &&
                          row.detailRows.map((detail, idx) => {
                            const isLast = idx === row.detailRows.length - 1
                            const TrRow = isLast ? TrDetailLast : TrDetail
                            const detailNet = detail.inCost + detail.outCost
                            return (
                              <TrRow key={`${row.day}-${detail.key}`}>
                                <Td>{detail.label}</Td>
                                <Td>{detail.inCost !== 0 ? formatCurrency(detail.inCost) : '-'}</Td>
                                <Td>
                                  {detail.inPrice !== 0 ? formatCurrency(detail.inPrice) : '-'}
                                </Td>
                                <Td $negative={detail.outCost < 0}>
                                  {detail.outCost !== 0 ? formatCurrency(detail.outCost) : '-'}
                                </Td>
                                <Td $negative={detail.outPrice < 0}>
                                  {detail.outPrice !== 0 ? formatCurrency(detail.outPrice) : '-'}
                                </Td>
                                <Td $negative={detailNet < 0} $positive={detailNet > 0}>
                                  {detailNet !== 0 ? formatCurrency(detailNet) : '-'}
                                </Td>
                              </TrRow>
                            )
                          })}
                      </Fragment>
                    ))}
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
              accent={palette.orange}
            />
            <KpiCard
              label="消耗品率"
              value={formatPercent(consumableRate)}
              subText={`売上高: ${formatCurrency(totalSales)}`}
              accent={palette.orangeDark}
            />
            <KpiCard
              label="品目数"
              value={`${itemAggregates.length}品目`}
              subText={`勘定科目: ${accountAggregates.length}科目`}
              accent={palette.purpleDark}
            />
            <KpiCard
              label="計上日数"
              value={`${dailyConsumableData.length}日`}
              subText={`日平均: ${dailyConsumableData.length > 0 ? formatCurrency(totalConsumableCost / dailyConsumableData.length) : '-'}`}
              accent={palette.blueDark}
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
                    onClick={() => handleConsumableViewChange('item')}
                  >
                    品目別
                  </Chip>
                  <Chip
                    $active={consumableView === 'account'}
                    onClick={() => handleConsumableViewChange('account')}
                  >
                    勘定科目別
                  </Chip>
                  <Chip
                    $active={consumableView === 'daily'}
                    onClick={() => handleConsumableViewChange('daily')}
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
                                    $color={palette.orange}
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
                                    $color={palette.purpleDark}
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
