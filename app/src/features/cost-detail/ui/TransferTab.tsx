/**
 * @responsibility R:unclassified
 */

import { Fragment } from 'react'
import { ChartErrorBoundary } from '@/presentation/components/common/feedback'
import { Chip, ChipGroup } from '@/presentation/components/common/forms'
import { Card, CardTitle } from '@/presentation/components/common/layout'
import { KpiCard, KpiGrid } from '@/presentation/components/common/tables'
import { useCurrencyFormat } from '@/presentation/components/charts/chartTheme'
import { sc } from '@/presentation/theme/semanticColors'
import { palette } from '@/presentation/theme/tokens'
import {
  Section,
  Table,
  Th,
  Td,
  Tr,
  TrTotal,
  EmptyState,
  PivotGroupTh,
  PivotSubTh,
  PivotTd,
  PivotTableWrapper,
} from './CostDetailPage.styles'
import type { CostDetailData } from '../application/useCostDetailData'

interface TransferTabProps {
  readonly d: CostDetailData
}

export function TransferTab({ d }: TransferTabProps) {
  const { format: fmtCurrency } = useCurrencyFormat()
  const fmtOrDash = (val: number) => (val !== 0 ? fmtCurrency(val) : '-')
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
          value={fmtCurrency(d.typeIn!.cost)}
          subText={`売価: ${fmtCurrency(d.typeIn!.price)}`}
          accent={palette.blueDark}
        />
        <KpiCard
          label={`${d.typeLabel}出`}
          value={fmtCurrency(d.typeOut!.cost)}
          subText={`売価: ${fmtCurrency(d.typeOut!.price)}`}
          accent={palette.dangerDark}
        />
        <KpiCard
          label="純増減"
          value={fmtCurrency(d.typeNet!.cost)}
          subText={`売価: ${fmtCurrency(d.typeNet!.price)}`}
          accent={sc.cond(d.typeNet!.cost >= 0)}
        />
      </KpiGrid>

      {d.flows.length === 0 ? (
        <EmptyState>{d.typeLabel}移動データがありません</EmptyState>
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
                            {fmtCurrency(cell.cost)}
                          </PivotTd>
                          <PivotTd $negative={cell.price < 0} $positive={cell.price > 0}>
                            {fmtCurrency(cell.price)}
                          </PivotTd>
                        </Fragment>
                      )
                    })}
                    <PivotTd $groupStart>{fmtCurrency(d.transferPivot.totals.inCost)}</PivotTd>
                    <PivotTd $negative={d.transferPivot.totals.outCost < 0}>
                      {fmtCurrency(d.transferPivot.totals.outCost)}
                    </PivotTd>
                    <PivotTd
                      $negative={d.transferPivot.totals.net < 0}
                      $positive={d.transferPivot.totals.net > 0}
                    >
                      {fmtCurrency(d.transferPivot.totals.net)}
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
