import { Fragment } from 'react'
import { Card, CardTitle, ChartErrorBoundary } from '@/presentation/components/common'
import { formatCurrency } from '@/domain/formatting'
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
  PurchasePivotGroupTh,
} from './CostDetailPage.styles'
import type { CostDetailData } from './useCostDetailData'

const fmtOrDash = (val: number) => (val !== 0 ? formatCurrency(val) : '-')

interface PurchaseTabProps {
  readonly d: CostDetailData
}

export function PurchaseTab({ d }: PurchaseTabProps) {
  return (
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
                              <PivotTd $negative={cell.price < 0}>{fmtOrDash(cell.price)}</PivotTd>
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
  )
}
