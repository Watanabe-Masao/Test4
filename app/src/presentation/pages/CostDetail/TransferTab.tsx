import { Fragment } from 'react'
import {
  Card,
  CardTitle,
  Chip,
  ChipGroup,
  KpiCard,
  KpiGrid,
  ChartErrorBoundary,
} from '@/presentation/components/common'
import { formatCurrency } from '@/domain/calculations/utils'
import { sc } from '@/presentation/theme/semanticColors'
import { palette } from '@/presentation/theme/tokens'
import {
  Section,
  TableWrapper,
  Table,
  Th,
  Td,
  Tr,
  TrTotal,
  EmptyState,
  FlowTable,
  FlowTh,
  FlowTd,
  FlowTr,
  FlowGroupHeader,
  FlowBar,
  PivotGroupTh,
  PivotSubTh,
  PivotTd,
  PivotTableWrapper,
} from './CostDetailPage.styles'
import type { CostDetailData } from './useCostDetailData'

const fmtOrDash = (val: number) => (val !== 0 ? formatCurrency(val) : '-')

interface TransferTabProps {
  readonly d: CostDetailData
}

export function TransferTab({ d }: TransferTabProps) {
  return (
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
          value={formatCurrency(d.typeIn!.cost)}
          subText={`売価: ${formatCurrency(d.typeIn!.price)}`}
          accent={palette.blueDark}
        />
        <KpiCard
          label={`${d.typeLabel}出`}
          value={formatCurrency(d.typeOut!.cost)}
          subText={`売価: ${formatCurrency(d.typeOut!.price)}`}
          accent={palette.dangerDark}
        />
        <KpiCard
          label="純増減"
          value={formatCurrency(d.typeNet!.cost)}
          subText={`売価: ${formatCurrency(d.typeNet!.price)}`}
          accent={sc.cond(d.typeNet!.cost >= 0)}
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
                              onClick={() => d.setSelectedPair(d.selectedPair === key ? null : key)}
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
                          <PivotTd $groupStart $negative={cell.cost < 0} $positive={cell.cost > 0}>
                            {formatCurrency(cell.cost)}
                          </PivotTd>
                          <PivotTd $negative={cell.price < 0} $positive={cell.price > 0}>
                            {formatCurrency(cell.price)}
                          </PivotTd>
                        </Fragment>
                      )
                    })}
                    <PivotTd $groupStart>{formatCurrency(d.transferPivot.totals.inCost)}</PivotTd>
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
  )
}
