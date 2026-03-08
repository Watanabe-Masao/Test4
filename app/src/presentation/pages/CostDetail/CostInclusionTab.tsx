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
import { formatCurrency, formatPercent } from '@/domain/formatting'
import { palette } from '@/presentation/theme/tokens'
import type { MetricId } from '@/domain/models'
import {
  Section,
  TableWrapper,
  Table,
  Th,
  Tr,
  TrTotal,
  TrDetail,
  TrDetailLast,
  ToggleIcon,
  EmptyState,
  Bar,
  RankBadge,
  PairGrid,
  CostInclusionTd,
} from './CostDetailPage.styles'
import type { CostDetailData } from './useCostDetailData'

interface CostInclusionTabProps {
  readonly d: CostDetailData
  readonly onExplain: (metricId: MetricId) => void
}

export function CostInclusionTab({ d, onExplain }: CostInclusionTabProps) {
  return (
    <>
      <KpiGrid>
        <KpiCard
          label="原価算入費合計"
          value={formatCurrency(d.totalCostInclusionAmount)}
          accent={palette.orange}
          onClick={() => onExplain('totalCostInclusion')}
        />
        <KpiCard
          label="原価算入率"
          value={formatPercent(d.costInclusionRate)}
          subText={`売上高: ${formatCurrency(d.totalSales)}`}
          accent={palette.orangeDark}
          onClick={() => onExplain('totalCostInclusion')}
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
                                    <CostInclusionTd>{formatCurrency(detail.cost)}</CostInclusionTd>
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
                          {d.dailyCostInclusionData.reduce((s, entry) => s + entry.itemCount, 0)}件
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
  )
}
