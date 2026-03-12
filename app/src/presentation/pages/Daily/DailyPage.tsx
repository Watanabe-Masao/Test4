import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { MainContent } from '@/presentation/components/Layout'
import {
  Card,
  CardTitle,
  MetricBreakdownPanel,
  PageSkeleton,
} from '@/presentation/components/common'
import { useDataStore } from '@/application/stores/dataStore'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { useStoreSelection } from '@/application/hooks'
import type { PrevYearData } from '@/application/comparison/comparisonTypes'
import { formatPercent } from '@/domain/formatting'
import type { CostPricePair } from '@/domain/models'
import { useCurrencyFormat } from '@/presentation/components/charts/chartTheme'
import {
  collectSupplierKeys,
  collectTransferKeys,
  getTransferAmount,
  useCumulativeRates,
} from '@/application/hooks/useDailyPageData'
import { PageWidgetContainer, UNIFIED_WIDGET_REGISTRY } from '@/presentation/components/widgets'
import type { PageWidgetConfig } from '@/presentation/components/widgets'
import { useUnifiedWidgetContext } from '@/presentation/hooks/useUnifiedWidgetContext'
import { DEFAULT_DAILY_WIDGET_IDS } from './widgets'
import {
  TableWrapper,
  Table,
  Th,
  SubTh,
  Td,
  SubTd,
  Tr,
  PrevYearTd,
  EmptyState,
  ToggleIcon,
  RateTd,
  AnomalyBadge,
} from './DailyPage.styles'

type ExpandableColumn =
  | 'purchase'
  | 'interStoreIn'
  | 'interStoreOut'
  | 'interDepartmentIn'
  | 'interDepartmentOut'

const EMPTY_PREV_YEAR: PrevYearData = {
  hasPrevYear: false,
  daily: new Map(),
  totalSales: 0,
  totalDiscount: 0,
  totalCustomers: 0,
  grossSales: 0,
  discountRate: 0,
  totalDiscountEntries: [],
}

const EMPTY_SUPPLIER_KEYS: { code: string; name: string }[] = []
const EMPTY_TRANSFER_KEYS: { key: string; from: string; to: string; label: string }[] = []

const DAILY_CONFIG: PageWidgetConfig = {
  pageKey: 'daily',
  registry: UNIFIED_WIDGET_REGISTRY,
  defaultWidgetIds: DEFAULT_DAILY_WIDGET_IDS,
  settingsTitle: '日別トレンドのカスタマイズ',
}

export function DailyPage() {
  const nav = useNavigate()
  const { currentResult, storeName, stores } = useStoreSelection()
  const suppliers = useDataStore((s) => s.data.suppliers)
  const dataStores = useDataStore((s) => s.data.stores)
  const settings = useSettingsStore((s) => s.settings)
  const { ctx, isComputing, explainMetric, setExplainMetric } = useUnifiedWidgetContext()
  const { format: fmtCurrency } = useCurrencyFormat()
  const prevYear: PrevYearData = ctx?.prevYear ?? EMPTY_PREV_YEAR

  const handleExplainClose = useCallback(() => setExplainMetric(null), [setExplainMetric])
  const handleExplain = useCallback(
    (metricId: Parameters<typeof setExplainMetric>[0]) => setExplainMetric(metricId),
    [setExplainMetric],
  )

  const [expanded, setExpanded] = useState<Set<ExpandableColumn>>(new Set())

  const isPurchaseExpanded = expanded.has('purchase')
  const isInterStoreInExpanded = expanded.has('interStoreIn')
  const isInterStoreOutExpanded = expanded.has('interStoreOut')
  const isInterDeptInExpanded = expanded.has('interDepartmentIn')
  const isInterDeptOutExpanded = expanded.has('interDepartmentOut')

  const days = useMemo(
    () =>
      currentResult ? Array.from(currentResult.daily.entries()).sort(([a], [b]) => a - b) : [],
    [currentResult],
  )

  const supplierKeys = useMemo(
    () =>
      isPurchaseExpanded && days.length > 0
        ? collectSupplierKeys(days, suppliers)
        : EMPTY_SUPPLIER_KEYS,
    [isPurchaseExpanded, days, suppliers],
  )

  const interStoreInKeys = useMemo(
    () =>
      isInterStoreInExpanded && days.length > 0
        ? collectTransferKeys(days, 'interStoreIn', stores)
        : EMPTY_TRANSFER_KEYS,
    [isInterStoreInExpanded, days, stores],
  )
  const interStoreOutKeys = useMemo(
    () =>
      isInterStoreOutExpanded && days.length > 0
        ? collectTransferKeys(days, 'interStoreOut', stores)
        : EMPTY_TRANSFER_KEYS,
    [isInterStoreOutExpanded, days, stores],
  )
  const interDeptInKeys = useMemo(
    () =>
      isInterDeptInExpanded && days.length > 0
        ? collectTransferKeys(days, 'interDepartmentIn', stores)
        : EMPTY_TRANSFER_KEYS,
    [isInterDeptInExpanded, days, stores],
  )
  const interDeptOutKeys = useMemo(
    () =>
      isInterDeptOutExpanded && days.length > 0
        ? collectTransferKeys(days, 'interDepartmentOut', stores)
        : EMPTY_TRANSFER_KEYS,
    [isInterDeptOutExpanded, days, stores],
  )

  const cumulativeData = useCumulativeRates(days)

  const toggleExpand = (col: ExpandableColumn) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(col)) next.delete(col)
      else next.add(col)
      return next
    })
  }

  if (isComputing && !ctx) {
    return (
      <MainContent title="日別トレンド" storeName={storeName}>
        <PageSkeleton />
      </MainContent>
    )
  }

  if (!ctx || !currentResult) {
    return (
      <MainContent title="日別トレンド" storeName={storeName}>
        <EmptyState>計算を実行してください</EmptyState>
      </MainContent>
    )
  }

  const renderExpandIcon = (col: ExpandableColumn) => (
    <ToggleIcon $expanded={expanded.has(col)}>&#9654;</ToggleIcon>
  )

  const fmtOrDash = (val: number) => (val !== 0 ? fmtCurrency(val) : '-')
  const fmtOrDashPositive = (val: number) => (val > 0 ? fmtCurrency(val) : '-')

  // 日別明細テーブル
  const dailyDetailTable = (
    <Card>
      <CardTitle>日別明細</CardTitle>
      <TableWrapper>
        <Table>
          <thead>
            <tr>
              <Th>日</Th>
              <Th>売上</Th>
              {prevYear.hasPrevYear && <Th>比較期</Th>}
              {prevYear.hasPrevYear && <Th>比較期比</Th>}
              <Th
                $clickable
                $expanded={isPurchaseExpanded}
                onClick={() => toggleExpand('purchase')}
              >
                仕入原価{renderExpandIcon('purchase')}
              </Th>
              {isPurchaseExpanded &&
                supplierKeys.map((s) => <SubTh key={`sup-cost-${s.code}`}>{s.name}</SubTh>)}
              <Th
                $clickable
                $expanded={isPurchaseExpanded}
                onClick={() => toggleExpand('purchase')}
              >
                仕入売価{renderExpandIcon('purchase')}
              </Th>
              {isPurchaseExpanded &&
                supplierKeys.map((s) => <SubTh key={`sup-price-${s.code}`}>{s.name}</SubTh>)}
              <Th
                $clickable
                $expanded={isInterStoreInExpanded}
                onClick={() => toggleExpand('interStoreIn')}
              >
                店間入{renderExpandIcon('interStoreIn')}
              </Th>
              {isInterStoreInExpanded &&
                interStoreInKeys.map((k) => <SubTh key={`si-${k.key}`}>{k.label}</SubTh>)}
              <Th
                $clickable
                $expanded={isInterStoreOutExpanded}
                onClick={() => toggleExpand('interStoreOut')}
              >
                店間出{renderExpandIcon('interStoreOut')}
              </Th>
              {isInterStoreOutExpanded &&
                interStoreOutKeys.map((k) => <SubTh key={`so-${k.key}`}>{k.label}</SubTh>)}
              <Th
                $clickable
                $expanded={isInterDeptInExpanded}
                onClick={() => toggleExpand('interDepartmentIn')}
              >
                部門間入{renderExpandIcon('interDepartmentIn')}
              </Th>
              {isInterDeptInExpanded &&
                interDeptInKeys.map((k) => <SubTh key={`di-${k.key}`}>{k.label}</SubTh>)}
              <Th
                $clickable
                $expanded={isInterDeptOutExpanded}
                onClick={() => toggleExpand('interDepartmentOut')}
              >
                部門間出{renderExpandIcon('interDepartmentOut')}
              </Th>
              {isInterDeptOutExpanded &&
                interDeptOutKeys.map((k) => <SubTh key={`do-${k.key}`}>{k.label}</SubTh>)}
              <Th>花</Th>
              <Th>産直</Th>
              <Th>売変額</Th>
              <Th>消耗品</Th>
              <Th>累計粗利率</Th>
              <Th>累計売変率</Th>
            </tr>
          </thead>
          <tbody>
            {days.map(([day, rec]) => {
              const prevSales = prevYear.hasPrevYear ? (prevYear.daily.get(day)?.sales ?? 0) : 0
              const yoyRatio = prevSales > 0 ? rec.sales / prevSales : null
              const anomaly: 'up' | 'down' | undefined =
                yoyRatio != null && yoyRatio >= 1.2
                  ? 'up'
                  : yoyRatio != null && yoyRatio <= 0.8
                    ? 'down'
                    : undefined
              return (
                <Tr key={day} $anomaly={anomaly}>
                  <Td>
                    {day}
                    {anomaly && (
                      <AnomalyBadge
                        $direction={anomaly}
                        onClick={(e) => {
                          e.stopPropagation()
                          nav('/insight?tab=decomposition')
                        }}
                        title="要因分析を見る"
                        style={{ cursor: 'pointer' }}
                      >
                        {anomaly === 'up' ? '↑' : '↓'}
                        {yoyRatio != null ? `${((yoyRatio - 1) * 100).toFixed(0)}%` : ''}
                      </AnomalyBadge>
                    )}
                  </Td>
                  <Td>{fmtCurrency(rec.sales)}</Td>
                  {prevYear.hasPrevYear && (
                    <PrevYearTd>{prevSales > 0 ? fmtCurrency(prevSales) : '-'}</PrevYearTd>
                  )}
                  {prevYear.hasPrevYear &&
                    (() => {
                      if (!prevSales || prevSales === 0) return <PrevYearTd>-</PrevYearTd>
                      const ratio = (rec.sales / prevSales) * 100
                      return <PrevYearTd $positive={ratio >= 100}>{ratio.toFixed(1)}%</PrevYearTd>
                    })()}
                  <Td>{fmtCurrency(rec.purchase.cost)}</Td>
                  {isPurchaseExpanded &&
                    supplierKeys.map((s) => {
                      const pair: CostPricePair | undefined = rec.supplierBreakdown.get(s.code)
                      return (
                        <SubTd key={`sup-cost-${s.code}`}>
                          {pair ? fmtOrDash(pair.cost) : '-'}
                        </SubTd>
                      )
                    })}
                  <Td>{fmtCurrency(rec.purchase.price)}</Td>
                  {isPurchaseExpanded &&
                    supplierKeys.map((s) => {
                      const pair: CostPricePair | undefined = rec.supplierBreakdown.get(s.code)
                      return (
                        <SubTd key={`sup-price-${s.code}`}>
                          {pair ? fmtOrDash(pair.price) : '-'}
                        </SubTd>
                      )
                    })}
                  <Td>{fmtOrDash(rec.interStoreIn.cost)}</Td>
                  {isInterStoreInExpanded &&
                    interStoreInKeys.map((k) => (
                      <SubTd key={`si-${k.key}`}>
                        {fmtOrDash(
                          getTransferAmount(rec.transferBreakdown.interStoreIn, k.from, k.to),
                        )}
                      </SubTd>
                    ))}
                  <Td $negative={rec.interStoreOut.cost < 0}>
                    {fmtOrDash(rec.interStoreOut.cost)}
                  </Td>
                  {isInterStoreOutExpanded &&
                    interStoreOutKeys.map((k) => {
                      const amt = getTransferAmount(
                        rec.transferBreakdown.interStoreOut,
                        k.from,
                        k.to,
                      )
                      return (
                        <SubTd key={`so-${k.key}`} $negative={amt < 0}>
                          {fmtOrDash(amt)}
                        </SubTd>
                      )
                    })}
                  <Td>{fmtOrDash(rec.interDepartmentIn.cost)}</Td>
                  {isInterDeptInExpanded &&
                    interDeptInKeys.map((k) => (
                      <SubTd key={`di-${k.key}`}>
                        {fmtOrDash(
                          getTransferAmount(rec.transferBreakdown.interDepartmentIn, k.from, k.to),
                        )}
                      </SubTd>
                    ))}
                  <Td $negative={rec.interDepartmentOut.cost < 0}>
                    {fmtOrDash(rec.interDepartmentOut.cost)}
                  </Td>
                  {isInterDeptOutExpanded &&
                    interDeptOutKeys.map((k) => {
                      const amt = getTransferAmount(
                        rec.transferBreakdown.interDepartmentOut,
                        k.from,
                        k.to,
                      )
                      return (
                        <SubTd key={`do-${k.key}`} $negative={amt < 0}>
                          {fmtOrDash(amt)}
                        </SubTd>
                      )
                    })}
                  <Td>{fmtOrDashPositive(rec.flowers.price)}</Td>
                  <Td>{fmtOrDashPositive(rec.directProduce.price)}</Td>
                  <Td $negative={rec.discountAbsolute > 0}>
                    {rec.discountAbsolute > 0 ? fmtCurrency(rec.discountAbsolute) : '-'}
                  </Td>
                  <Td>{rec.costInclusion.cost > 0 ? fmtCurrency(rec.costInclusion.cost) : '-'}</Td>
                  {(() => {
                    const cum = cumulativeData.get(day)
                    const gpr = cum?.grossProfitRate ?? 0
                    const gprStatus =
                      gpr >= settings.targetGrossProfitRate
                        ? ('good' as const)
                        : gpr >= settings.warningThreshold
                          ? ('warn' as const)
                          : ('bad' as const)
                    return (
                      <RateTd
                        $status={rec.sales > 0 ? gprStatus : undefined}
                        $clickable={rec.sales > 0}
                        onClick={
                          rec.sales > 0
                            ? () =>
                                handleExplain(
                                  currentResult.invMethodGrossProfitRate != null
                                    ? 'invMethodGrossProfitRate'
                                    : 'estMethodMarginRate',
                                )
                            : undefined
                        }
                        title={rec.sales > 0 ? '算出根拠を表示' : undefined}
                      >
                        {rec.sales > 0 ? formatPercent(gpr) : '-'}
                      </RateTd>
                    )
                  })()}
                  {(() => {
                    const cum = cumulativeData.get(day)
                    const dr = cum?.discountRate ?? 0
                    return (
                      <RateTd
                        $status={
                          dr > 0
                            ? dr > 0.05
                              ? ('bad' as const)
                              : dr > 0.03
                                ? ('warn' as const)
                                : ('good' as const)
                            : undefined
                        }
                        $clickable={rec.grossSales > 0}
                        onClick={
                          rec.grossSales > 0 ? () => handleExplain('discountRate') : undefined
                        }
                        title={rec.grossSales > 0 ? '算出根拠を表示' : undefined}
                      >
                        {rec.grossSales > 0 ? formatPercent(dr) : '-'}
                      </RateTd>
                    )
                  })()}
                </Tr>
              )
            })}
          </tbody>
        </Table>
      </TableWrapper>
    </Card>
  )

  return (
    <MainContent title="日別トレンド" storeName={storeName}>
      <PageWidgetContainer config={DAILY_CONFIG} context={ctx} headerContent={dailyDetailTable} />

      {explainMetric && ctx.explanations.has(explainMetric) && (
        <MetricBreakdownPanel
          explanation={ctx.explanations.get(explainMetric)!}
          allExplanations={ctx.explanations}
          stores={dataStores}
          onClose={handleExplainClose}
        />
      )}
    </MainContent>
  )
}
