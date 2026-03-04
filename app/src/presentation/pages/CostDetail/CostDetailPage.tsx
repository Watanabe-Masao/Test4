import { Fragment, useState, useCallback } from 'react'
import { MainContent } from '@/presentation/components/Layout'
import {
  Card,
  CardTitle,
  Chip,
  ChipGroup,
  KpiCard,
  KpiGrid,
  ChartErrorBoundary,
  MetricBreakdownPanel,
  PageSkeleton,
} from '@/presentation/components/common'
import { useCalculation, useExplanations } from '@/application/hooks'
import { useDataStore } from '@/application/stores/dataStore'
import type { MetricId } from '@/domain/models'
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
  CostInclusionTd,
  PivotGroupTh,
  PivotSubTh,
  PivotTd,
  PivotTableWrapper,
  PurchasePivotGroupTh,
} from './CostDetailPage.styles'
import { useCostDetailData } from './useCostDetailData'

const fmtOrDash = (val: number) => (val !== 0 ? formatCurrency(val) : '-')

export function CostDetailPage() {
  const { isComputing } = useCalculation()
  const d = useCostDetailData()
  const explanations = useExplanations()
  const dataStores = useDataStore((s) => s.data.stores)
  const [explainMetric, setExplainMetric] = useState<MetricId | null>(null)
  const handleExplain = useCallback((metricId: MetricId) => {
    setExplainMetric(metricId)
  }, [])

  if (isComputing && !d.currentResult) {
    return (
      <MainContent title="原価明細" storeName={d.storeName}>
        <PageSkeleton />
      </MainContent>
    )
  }

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
          label="原価算入費合計"
          value={formatCurrency(d.totalCostInclusionAmount)}
          accent={palette.orange}
          onClick={() => handleExplain('totalCostInclusion')}
        />
        <KpiCard
          label="原価算入率"
          value={formatPercent(d.costInclusionRate)}
          subText={`売上高: ${formatCurrency(d.totalSales)}`}
          accent={palette.orangeDark}
          onClick={() => handleExplain('totalCostInclusion')}
        />
      </KpiGrid>

      {/* タブバー */}
      <TabBar>
        <Tab $active={d.activeTab === 'purchase'} onClick={() => d.setActiveTab('purchase')}>
          仕入
        </Tab>
        <Tab $active={d.activeTab === 'transfer'} onClick={() => d.setActiveTab('transfer')}>
          移動
        </Tab>
        <Tab
          $active={d.activeTab === 'costInclusion'}
          onClick={() => d.setActiveTab('costInclusion')}
        >
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
                <PivotTableWrapper>
                  <Table>
                    <thead>
                      <tr>
                        <Th rowSpan={2}>日付</Th>
                        {d.transferPivot.stores.map((store) => (
                          <PivotGroupTh key={store.storeId} colSpan={2}>
                            {store.storeName}（{store.storeId}）
                          </PivotGroupTh>
                        ))}
                        <PivotGroupTh colSpan={3}>合計</PivotGroupTh>
                      </tr>
                      <tr>
                        {d.transferPivot.stores.map((store) => (
                          <Fragment key={store.storeId}>
                            <PivotSubTh className="group-start">原価</PivotSubTh>
                            <PivotSubTh>売価</PivotSubTh>
                          </Fragment>
                        ))}
                        <PivotSubTh className="group-start">入原価</PivotSubTh>
                        <PivotSubTh>出原価</PivotSubTh>
                        <PivotSubTh>差引</PivotSubTh>
                      </tr>
                    </thead>
                    <tbody>
                      {d.transferPivot.rows.map((row) => (
                        <Tr key={row.day}>
                          <Td>{row.day}日</Td>
                          {d.transferPivot.stores.map((store) => {
                            const cell = row.cells[store.storeId]
                            return (
                              <Fragment key={store.storeId}>
                                <PivotTd
                                  $groupStart
                                  $negative={cell.cost < 0}
                                  $positive={cell.cost > 0}
                                >
                                  {fmtOrDash(cell.cost)}
                                </PivotTd>
                                <PivotTd $negative={cell.price < 0} $positive={cell.price > 0}>
                                  {fmtOrDash(cell.price)}
                                </PivotTd>
                              </Fragment>
                            )
                          })}
                          <PivotTd $groupStart>{fmtOrDash(row.inCost)}</PivotTd>
                          <PivotTd $negative={row.outCost < 0}>{fmtOrDash(row.outCost)}</PivotTd>
                          <PivotTd $negative={row.net < 0} $positive={row.net > 0}>
                            {fmtOrDash(row.net)}
                          </PivotTd>
                        </Tr>
                      ))}
                      <TrTotal>
                        <Td>合計</Td>
                        {d.transferPivot.stores.map((store) => {
                          const cell = d.transferPivot.totals.byStore[store.storeId]
                          return (
                            <Fragment key={store.storeId}>
                              <PivotTd
                                $groupStart
                                $negative={cell.cost < 0}
                                $positive={cell.cost > 0}
                              >
                                {formatCurrency(cell.cost)}
                              </PivotTd>
                              <PivotTd $negative={cell.price < 0} $positive={cell.price > 0}>
                                {formatCurrency(cell.price)}
                              </PivotTd>
                            </Fragment>
                          )
                        })}
                        <PivotTd $groupStart>
                          {formatCurrency(d.transferPivot.totals.inCost)}
                        </PivotTd>
                        <PivotTd $negative={d.transferPivot.totals.outCost < 0}>
                          {formatCurrency(d.transferPivot.totals.outCost)}
                        </PivotTd>
                        <PivotTd
                          $negative={d.transferPivot.totals.net < 0}
                          $positive={d.transferPivot.totals.net > 0}
                        >
                          {formatCurrency(d.transferPivot.totals.net)}
                        </PivotTd>
                      </TrTotal>
                    </tbody>
                  </Table>
                </PivotTableWrapper>
              </Card>
            </ChartErrorBoundary>
          )}
        </>
      )}

      {/* ═══ 消耗品タブ ═══ */}
      {d.activeTab === 'costInclusion' && (
        <>
          <KpiGrid>
            <KpiCard
              label="原価算入費合計"
              value={formatCurrency(d.totalCostInclusionAmount)}
              accent={palette.orange}
              onClick={() => handleExplain('totalCostInclusion')}
            />
            <KpiCard
              label="原価算入率"
              value={formatPercent(d.costInclusionRate)}
              subText={`売上高: ${formatCurrency(d.totalSales)}`}
              accent={palette.orangeDark}
              onClick={() => handleExplain('totalCostInclusion')}
            />
            <KpiCard
              label="品目数"
              value={`${d.itemAggregates.length}品目`}
              subText={`勘定科目: ${d.accountAggregates.length}科目`}
              accent={palette.purpleDark}
            />
            <KpiCard
              label="計上日数"
              value={`${d.dailyCostInclusionData.length}日`}
              subText={`日平均: ${d.dailyCostInclusionData.length > 0 ? formatCurrency(d.totalCostInclusionAmount / d.dailyCostInclusionData.length) : '-'}`}
              accent={palette.blueDark}
            />
          </KpiGrid>

          {!d.hasCostInclusionData ? (
            <EmptyState>消耗品データがありません</EmptyState>
          ) : (
            <>
              <Section>
                <ChipGroup>
                  <Chip
                    $active={d.costInclusionView === 'item'}
                    onClick={() => d.handleCostInclusionViewChange('item')}
                  >
                    品目別
                  </Chip>
                  <Chip
                    $active={d.costInclusionView === 'account'}
                    onClick={() => d.handleCostInclusionViewChange('account')}
                  >
                    勘定科目別
                  </Chip>
                  <Chip
                    $active={d.costInclusionView === 'daily'}
                    onClick={() => d.handleCostInclusionViewChange('daily')}
                  >
                    日別明細
                  </Chip>
                </ChipGroup>
              </Section>

              {d.costInclusionView === 'item' && (
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
                              d.totalCostInclusionAmount > 0
                                ? item.totalCost / d.totalCostInclusionAmount
                                : 0
                            const isExpanded = d.selectedItem === item.itemCode
                            const details = isExpanded ? d.itemDetailData : null
                            return (
                              <Fragment key={item.itemCode}>
                                <Tr
                                  $clickable
                                  $selected={isExpanded}
                                  onClick={() => d.handleItemClick(item.itemCode)}
                                >
                                  <CostInclusionTd>
                                    <RankBadge $rank={idx + 1}>{idx + 1}</RankBadge>
                                  </CostInclusionTd>
                                  <CostInclusionTd>
                                    <ToggleIcon $expanded={isExpanded}>&#9654;</ToggleIcon>
                                    {item.itemName}
                                  </CostInclusionTd>
                                  <CostInclusionTd $muted>{item.itemCode}</CostInclusionTd>
                                  <CostInclusionTd $muted>{item.accountCode}</CostInclusionTd>
                                  <CostInclusionTd>
                                    {item.totalQuantity.toLocaleString()}
                                  </CostInclusionTd>
                                  <CostInclusionTd>
                                    <Bar
                                      $width={(item.totalCost / d.maxItemCost) * 100}
                                      $color={palette.orange}
                                    />
                                    {formatCurrency(item.totalCost)}
                                  </CostInclusionTd>
                                  <CostInclusionTd>{formatPercent(ratio)}</CostInclusionTd>
                                  <CostInclusionTd>{item.dayCount}日</CostInclusionTd>
                                </Tr>
                                {isExpanded &&
                                  details &&
                                  details.length > 0 &&
                                  details.map((detail, i) => {
                                    const isLast = i === details.length - 1
                                    const TrRow = isLast ? TrDetailLast : TrDetail
                                    return (
                                      <TrRow key={`detail-${detail.day}-${detail.storeId}-${i}`}>
                                        <CostInclusionTd />
                                        <CostInclusionTd>
                                          {detail.day}日 {detail.storeName}
                                        </CostInclusionTd>
                                        <CostInclusionTd />
                                        <CostInclusionTd />
                                        <CostInclusionTd>
                                          {detail.quantity.toLocaleString()}
                                        </CostInclusionTd>
                                        <CostInclusionTd>
                                          {formatCurrency(detail.cost)}
                                        </CostInclusionTd>
                                        <CostInclusionTd />
                                        <CostInclusionTd />
                                      </TrRow>
                                    )
                                  })}
                              </Fragment>
                            )
                          })}
                          <TrTotal>
                            <CostInclusionTd />
                            <CostInclusionTd>合計</CostInclusionTd>
                            <CostInclusionTd />
                            <CostInclusionTd />
                            <CostInclusionTd>
                              {d.itemAggregates
                                .reduce((s, i) => s + i.totalQuantity, 0)
                                .toLocaleString()}
                            </CostInclusionTd>
                            <CostInclusionTd>
                              {formatCurrency(d.totalCostInclusionAmount)}
                            </CostInclusionTd>
                            <CostInclusionTd>100.0%</CostInclusionTd>
                            <CostInclusionTd />
                          </TrTotal>
                        </tbody>
                      </Table>
                    </TableWrapper>
                  </Card>
                </ChartErrorBoundary>
              )}

              {d.costInclusionView === 'account' && (
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
                                d.totalCostInclusionAmount > 0
                                  ? acc.totalCost / d.totalCostInclusionAmount
                                  : 0
                              return (
                                <Tr key={acc.accountCode}>
                                  <CostInclusionTd>{acc.accountCode}</CostInclusionTd>
                                  <CostInclusionTd>{acc.itemCount}品目</CostInclusionTd>
                                  <CostInclusionTd>
                                    <Bar
                                      $width={(acc.totalCost / d.maxAccountCost) * 100}
                                      $color={palette.purpleDark}
                                    />
                                    {formatCurrency(acc.totalCost)}
                                  </CostInclusionTd>
                                  <CostInclusionTd>{formatPercent(ratio)}</CostInclusionTd>
                                </Tr>
                              )
                            })}
                            <TrTotal>
                              <CostInclusionTd>合計</CostInclusionTd>
                              <CostInclusionTd>
                                {d.accountAggregates.reduce((s, a) => s + a.itemCount, 0)}品目
                              </CostInclusionTd>
                              <CostInclusionTd>
                                {formatCurrency(d.totalCostInclusionAmount)}
                              </CostInclusionTd>
                              <CostInclusionTd>100.0%</CostInclusionTd>
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
                                        <CostInclusionTd>{item.itemName}</CostInclusionTd>
                                        <CostInclusionTd>
                                          {item.totalQuantity.toLocaleString()}
                                        </CostInclusionTd>
                                        <CostInclusionTd>
                                          {formatCurrency(item.totalCost)}
                                        </CostInclusionTd>
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

              {d.costInclusionView === 'daily' && (
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
                          {d.dailyCostInclusionData.map((entry) => (
                            <Tr key={entry.day}>
                              <CostInclusionTd>{entry.day}日</CostInclusionTd>
                              <CostInclusionTd>{formatCurrency(entry.cost)}</CostInclusionTd>
                              <CostInclusionTd>{entry.itemCount}品目</CostInclusionTd>
                              <CostInclusionTd $muted>
                                {entry.items.slice(0, 5).map((item, i) => (
                                  <span key={i}>
                                    {i > 0 && ' / '}
                                    {item.itemName}({formatCurrency(item.cost)})
                                  </span>
                                ))}
                                {entry.items.length > 5 && ` 他${entry.items.length - 5}件`}
                              </CostInclusionTd>
                            </Tr>
                          ))}
                          <TrTotal>
                            <CostInclusionTd>合計</CostInclusionTd>
                            <CostInclusionTd>
                              {formatCurrency(d.totalCostInclusionAmount)}
                            </CostInclusionTd>
                            <CostInclusionTd>
                              {d.dailyCostInclusionData.reduce(
                                (s, entry) => s + entry.itemCount,
                                0,
                              )}
                              件
                            </CostInclusionTd>
                            <CostInclusionTd />
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

      {/* ═══ 仕入タブ ═══ */}
      {d.activeTab === 'purchase' && (
        <>
          {d.purchasePivot.columns.length === 0 ? (
            <EmptyState>仕入データがありません</EmptyState>
          ) : (
            <Section>
              <ChartErrorBoundary>
                <Card>
                  <CardTitle>仕入カテゴリ別日別明細（原価/売価）</CardTitle>
                  <PivotTableWrapper>
                    <Table>
                      <thead>
                        <tr>
                          <Th rowSpan={2}>日付</Th>
                          {d.purchasePivot.columns.map((col) => (
                            <PurchasePivotGroupTh key={col.key} colSpan={2} $color={col.color}>
                              {col.label}
                            </PurchasePivotGroupTh>
                          ))}
                          <PivotGroupTh colSpan={2}>合計</PivotGroupTh>
                        </tr>
                        <tr>
                          {d.purchasePivot.columns.map((col) => (
                            <Fragment key={col.key}>
                              <PivotSubTh className="group-start">原価</PivotSubTh>
                              <PivotSubTh>売価</PivotSubTh>
                            </Fragment>
                          ))}
                          <PivotSubTh className="group-start">原価</PivotSubTh>
                          <PivotSubTh>売価</PivotSubTh>
                        </tr>
                      </thead>
                      <tbody>
                        {d.purchasePivot.rows.map((row) => (
                          <Tr key={row.day}>
                            <Td>{row.day}日</Td>
                            {d.purchasePivot.columns.map((col) => {
                              const cell = row.cells[col.key]
                              return (
                                <Fragment key={col.key}>
                                  <PivotTd $groupStart $negative={cell.cost < 0}>
                                    {fmtOrDash(cell.cost)}
                                  </PivotTd>
                                  <PivotTd $negative={cell.price < 0}>
                                    {fmtOrDash(cell.price)}
                                  </PivotTd>
                                </Fragment>
                              )
                            })}
                            <PivotTd $groupStart>{fmtOrDash(row.totalCost)}</PivotTd>
                            <PivotTd>{fmtOrDash(row.totalPrice)}</PivotTd>
                          </Tr>
                        ))}
                        <TrTotal>
                          <Td>合計</Td>
                          {d.purchasePivot.columns.map((col) => {
                            const cell = d.purchasePivot.totals.byColumn[col.key]
                            return (
                              <Fragment key={col.key}>
                                <PivotTd $groupStart>{formatCurrency(cell.cost)}</PivotTd>
                                <PivotTd>{formatCurrency(cell.price)}</PivotTd>
                              </Fragment>
                            )
                          })}
                          <PivotTd $groupStart>
                            {formatCurrency(d.purchasePivot.totals.grandCost)}
                          </PivotTd>
                          <PivotTd>{formatCurrency(d.purchasePivot.totals.grandPrice)}</PivotTd>
                        </TrTotal>
                      </tbody>
                    </Table>
                  </PivotTableWrapper>
                </Card>
              </ChartErrorBoundary>
            </Section>
          )}
        </>
      )}

      {/* 指標説明パネル */}
      {explainMetric && explanations.has(explainMetric) && (
        <MetricBreakdownPanel
          explanation={explanations.get(explainMetric)!}
          allExplanations={explanations}
          stores={dataStores}
          onClose={() => setExplainMetric(null)}
        />
      )}
    </MainContent>
  )
}
