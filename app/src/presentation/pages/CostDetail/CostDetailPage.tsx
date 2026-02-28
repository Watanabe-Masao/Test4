import { Fragment } from 'react'
import { MainContent } from '@/presentation/components/Layout'
import {
  Card,
  CardTitle,
  Chip,
  ChipGroup,
  KpiCard,
  KpiGrid,
  ChartErrorBoundary,
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

const fmtOrDash = (val: number) => (val !== 0 ? formatCurrency(val) : '-')

export function CostDetailPage() {
  const d = useCostDetailData()

  if (!d.currentResult || !d.typeIn || !d.typeOut || !d.typeNet) {
    return (
      <MainContent title="原価明細" storeName={d.storeName}>
        <EmptyState>計算を実行してください</EmptyState>
      </MainContent>
    )
  }

  return (
    <MainContent title="原価明細" storeName={d.storeName}>
      {/* サマリーKPI（常に表示） */}
      <KpiGrid>
        <KpiCard
          label={`${d.typeLabel}入`}
          value={formatCurrency(d.typeIn.cost)}
          subText={`売価: ${formatCurrency(d.typeIn.price)}`}
          accent={palette.blueDark}
        />
        <KpiCard
          label={`${d.typeLabel}出`}
          value={formatCurrency(d.typeOut.cost)}
          subText={`売価: ${formatCurrency(d.typeOut.price)}`}
          accent={palette.dangerDark}
        />
        <KpiCard
          label="消耗品費合計"
          value={formatCurrency(d.totalConsumableCost)}
          accent={palette.orange}
        />
        <KpiCard
          label="消耗品率"
          value={formatPercent(d.consumableRate)}
          subText={`売上高: ${formatCurrency(d.totalSales)}`}
          accent={palette.orangeDark}
        />
      </KpiGrid>

      {/* タブバー */}
      <TabBar>
        <Tab $active={d.activeTab === 'transfer'} onClick={() => d.setActiveTab('transfer')}>
          移動
        </Tab>
        <Tab $active={d.activeTab === 'consumable'} onClick={() => d.setActiveTab('consumable')}>
          消耗品
        </Tab>
      </TabBar>

      {/* ═══ 移動タブ ═══ */}
      {d.activeTab === 'transfer' && (
        <>
          <Section>
            <ChipGroup>
              <Chip
                $active={d.transferType === 'interStore'}
                onClick={() => d.handleTransferTypeChange('interStore')}
              >
                店間移動
              </Chip>
              <Chip
                $active={d.transferType === 'interDepartment'}
                onClick={() => d.handleTransferTypeChange('interDepartment')}
              >
                部門間移動
              </Chip>
            </ChipGroup>
          </Section>

          <KpiGrid>
            <KpiCard
              label={`${d.typeLabel}入`}
              value={formatCurrency(d.typeIn.cost)}
              subText={`売価: ${formatCurrency(d.typeIn.price)}`}
              accent={palette.blueDark}
            />
            <KpiCard
              label={`${d.typeLabel}出`}
              value={formatCurrency(d.typeOut.cost)}
              subText={`売価: ${formatCurrency(d.typeOut.price)}`}
              accent={palette.dangerDark}
            />
            <KpiCard
              label="純増減"
              value={formatCurrency(d.typeNet.cost)}
              subText={`売価: ${formatCurrency(d.typeNet.price)}`}
              accent={sc.cond(d.typeNet.cost >= 0)}
            />
          </KpiGrid>

          {d.groupedFlows.length > 0 && (
            <Section>
              <Card>
                <CardTitle>{d.typeLabel}移動 ペア一覧</CardTitle>
                <ChartErrorBoundary>
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
                        <FlowTr
                          $active={d.selectedPair === null}
                          onClick={() => d.setSelectedPair(null)}
                        >
                          <FlowTd $label>全て表示</FlowTd>
                          <FlowTd $label>-</FlowTd>
                          <FlowTd>
                            {formatCurrency(d.dailyTotals.inCost + d.dailyTotals.outCost)}
                          </FlowTd>
                          <FlowTd>
                            <FlowBar $pct={100} $dir="neutral" />
                          </FlowTd>
                        </FlowTr>
                        {d.groupedFlows.map((group) => (
                          <Fragment key={`grp-${group.fromId}`}>
                            <FlowGroupHeader>
                              <FlowTd colSpan={4} $label>
                                {group.fromName}（{group.fromId}）から — {group.entries.length}件 /{' '}
                                {formatCurrency(group.totalCost)}
                              </FlowTd>
                            </FlowGroupHeader>
                            {group.entries.map((f) => {
                              const key = `${f.from}->${f.to}`
                              const pct = Math.round((Math.abs(f.cost) / d.maxFlowCost) * 100)
                              const dir =
                                f.cost > 0
                                  ? ('in' as const)
                                  : f.cost < 0
                                    ? ('out' as const)
                                    : ('neutral' as const)
                              return (
                                <FlowTr
                                  key={key}
                                  $active={d.selectedPair === key}
                                  onClick={() =>
                                    d.setSelectedPair(d.selectedPair === key ? null : key)
                                  }
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
                </ChartErrorBoundary>
              </Card>
            </Section>
          )}

          {d.flows.length === 0 ? (
            <EmptyState>{d.typeLabel}移動データがありません</EmptyState>
          ) : d.selectedPair && d.pairDailyData ? (
            <ChartErrorBoundary>
              <Card>
                <CardTitle>
                  {d.selectedFlow?.fromName ?? ''} → {d.selectedFlow?.toName ?? ''}
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
                      {d.pairDailyData.map((entry) => (
                        <Tr key={entry.day}>
                          <Td>{entry.day}日</Td>
                          <Td $negative={entry.cost < 0}>{formatCurrency(entry.cost)}</Td>
                          <Td $negative={entry.price < 0}>{formatCurrency(entry.price)}</Td>
                        </Tr>
                      ))}
                      <TrTotal>
                        <Td>合計</Td>
                        <Td>{formatCurrency(d.pairDailyData.reduce((s, e) => s + e.cost, 0))}</Td>
                        <Td>{formatCurrency(d.pairDailyData.reduce((s, e) => s + e.price, 0))}</Td>
                      </TrTotal>
                    </tbody>
                  </Table>
                </TableWrapper>
              </Card>
            </ChartErrorBoundary>
          ) : (
            <ChartErrorBoundary>
              <Card>
                <CardTitle>{d.typeLabel}移動 日別明細</CardTitle>
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
                      {d.dailyTransferRows.map((row) => (
                        <Fragment key={row.day}>
                          <Tr
                            $clickable={row.hasBreakdown}
                            $expanded={row.isExpanded}
                            onClick={() => row.hasBreakdown && d.handleDayClick(row.day)}
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
                                  <Td>
                                    {detail.inCost !== 0 ? formatCurrency(detail.inCost) : '-'}
                                  </Td>
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
                        <Td>{formatCurrency(d.dailyTotals.inCost)}</Td>
                        <Td>{formatCurrency(d.dailyTotals.inPrice)}</Td>
                        <Td $negative={d.dailyTotals.outCost < 0}>
                          {formatCurrency(d.dailyTotals.outCost)}
                        </Td>
                        <Td $negative={d.dailyTotals.outPrice < 0}>
                          {formatCurrency(d.dailyTotals.outPrice)}
                        </Td>
                        <Td
                          $negative={d.dailyTotals.inCost + d.dailyTotals.outCost < 0}
                          $positive={d.dailyTotals.inCost + d.dailyTotals.outCost > 0}
                        >
                          {formatCurrency(d.dailyTotals.inCost + d.dailyTotals.outCost)}
                        </Td>
                      </TrTotal>
                    </tbody>
                  </Table>
                </TableWrapper>
              </Card>
            </ChartErrorBoundary>
          )}
        </>
      )}

      {/* ═══ 消耗品タブ ═══ */}
      {d.activeTab === 'consumable' && (
        <>
          <KpiGrid>
            <KpiCard
              label="消耗品費合計"
              value={formatCurrency(d.totalConsumableCost)}
              accent={palette.orange}
            />
            <KpiCard
              label="消耗品率"
              value={formatPercent(d.consumableRate)}
              subText={`売上高: ${formatCurrency(d.totalSales)}`}
              accent={palette.orangeDark}
            />
            <KpiCard
              label="品目数"
              value={`${d.itemAggregates.length}品目`}
              subText={`勘定科目: ${d.accountAggregates.length}科目`}
              accent={palette.purpleDark}
            />
            <KpiCard
              label="計上日数"
              value={`${d.dailyConsumableData.length}日`}
              subText={`日平均: ${d.dailyConsumableData.length > 0 ? formatCurrency(d.totalConsumableCost / d.dailyConsumableData.length) : '-'}`}
              accent={palette.blueDark}
            />
          </KpiGrid>

          {!d.hasConsumableData ? (
            <EmptyState>消耗品データがありません</EmptyState>
          ) : (
            <>
              <Section>
                <ChipGroup>
                  <Chip
                    $active={d.consumableView === 'item'}
                    onClick={() => d.handleConsumableViewChange('item')}
                  >
                    品目別
                  </Chip>
                  <Chip
                    $active={d.consumableView === 'account'}
                    onClick={() => d.handleConsumableViewChange('account')}
                  >
                    勘定科目別
                  </Chip>
                  <Chip
                    $active={d.consumableView === 'daily'}
                    onClick={() => d.handleConsumableViewChange('daily')}
                  >
                    日別明細
                  </Chip>
                </ChipGroup>
              </Section>

              {d.consumableView === 'item' && (
                <ChartErrorBoundary>
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
                          {d.itemAggregates.map((item, idx) => {
                            const ratio =
                              d.totalConsumableCost > 0 ? item.totalCost / d.totalConsumableCost : 0
                            const isExpanded = d.selectedItem === item.itemCode
                            const details = isExpanded ? d.itemDetailData : null
                            return (
                              <Fragment key={item.itemCode}>
                                <Tr
                                  $clickable
                                  $selected={isExpanded}
                                  onClick={() => d.handleItemClick(item.itemCode)}
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
                                      $width={(item.totalCost / d.maxItemCost) * 100}
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
                                  details.map((detail, i) => {
                                    const isLast = i === details.length - 1
                                    const TrRow = isLast ? TrDetailLast : TrDetail
                                    return (
                                      <TrRow key={`detail-${detail.day}-${detail.storeId}-${i}`}>
                                        <ConsumTd />
                                        <ConsumTd>
                                          {detail.day}日 {detail.storeName}
                                        </ConsumTd>
                                        <ConsumTd />
                                        <ConsumTd />
                                        <ConsumTd>{detail.quantity.toLocaleString()}</ConsumTd>
                                        <ConsumTd>{formatCurrency(detail.cost)}</ConsumTd>
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
                              {d.itemAggregates
                                .reduce((s, i) => s + i.totalQuantity, 0)
                                .toLocaleString()}
                            </ConsumTd>
                            <ConsumTd>{formatCurrency(d.totalConsumableCost)}</ConsumTd>
                            <ConsumTd>100.0%</ConsumTd>
                            <ConsumTd />
                          </TrTotal>
                        </tbody>
                      </Table>
                    </TableWrapper>
                  </Card>
                </ChartErrorBoundary>
              )}

              {d.consumableView === 'account' && (
                <ChartErrorBoundary>
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
                            {d.accountAggregates.map((acc) => {
                              const ratio =
                                d.totalConsumableCost > 0
                                  ? acc.totalCost / d.totalConsumableCost
                                  : 0
                              return (
                                <Tr key={acc.accountCode}>
                                  <ConsumTd>{acc.accountCode}</ConsumTd>
                                  <ConsumTd>{acc.itemCount}品目</ConsumTd>
                                  <ConsumTd>
                                    <Bar
                                      $width={(acc.totalCost / d.maxAccountCost) * 100}
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
                                {d.accountAggregates.reduce((s, a) => s + a.itemCount, 0)}品目
                              </ConsumTd>
                              <ConsumTd>{formatCurrency(d.totalConsumableCost)}</ConsumTd>
                              <ConsumTd>100.0%</ConsumTd>
                            </TrTotal>
                          </tbody>
                        </Table>
                      </TableWrapper>
                      <div>
                        {d.accountAggregates.map((acc) => {
                          const items = d.itemAggregates.filter(
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
                </ChartErrorBoundary>
              )}

              {d.consumableView === 'daily' && (
                <ChartErrorBoundary>
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
                          {d.dailyConsumableData.map((entry) => (
                            <Tr key={entry.day}>
                              <ConsumTd>{entry.day}日</ConsumTd>
                              <ConsumTd>{formatCurrency(entry.cost)}</ConsumTd>
                              <ConsumTd>{entry.itemCount}品目</ConsumTd>
                              <ConsumTd $muted>
                                {entry.items.slice(0, 5).map((item, i) => (
                                  <span key={i}>
                                    {i > 0 && ' / '}
                                    {item.itemName}({formatCurrency(item.cost)})
                                  </span>
                                ))}
                                {entry.items.length > 5 && ` 他${entry.items.length - 5}件`}
                              </ConsumTd>
                            </Tr>
                          ))}
                          <TrTotal>
                            <ConsumTd>合計</ConsumTd>
                            <ConsumTd>{formatCurrency(d.totalConsumableCost)}</ConsumTd>
                            <ConsumTd>
                              {d.dailyConsumableData.reduce((s, entry) => s + entry.itemCount, 0)}件
                            </ConsumTd>
                            <ConsumTd />
                          </TrTotal>
                        </tbody>
                      </Table>
                    </TableWrapper>
                  </Card>
                </ChartErrorBoundary>
              )}
            </>
          )}
        </>
      )}
    </MainContent>
  )
}
