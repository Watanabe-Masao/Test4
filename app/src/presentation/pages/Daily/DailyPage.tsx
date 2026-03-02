import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { MainContent } from '@/presentation/components/Layout'
import {
  Card,
  CardTitle,
  Chip,
  ChipGroup,
  KpiCard,
  KpiGrid,
  MetricBreakdownPanel,
  PageSkeleton,
} from '@/presentation/components/common'
import { DailySalesChart, GrossProfitRateChart } from '@/presentation/components/charts'
import type { DailyChartMode } from '@/presentation/components/charts'
import {
  useCalculation,
  useStoreSelection,
  usePrevYearData,
  useExplanations,
} from '@/application/hooks'
import { useDataStore } from '@/application/stores/dataStore'
import type { MetricId } from '@/domain/models'
import { useUiStore } from '@/application/stores/uiStore'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { formatCurrency, formatPercent, safeDivide } from '@/domain/calculations/utils'
import type { DailyRecord, TransferBreakdownEntry, CostPricePair } from '@/domain/models'
import {
  ChartToggle,
  ChartGrid,
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

/** 取引先別の内訳キーを全日から収集 */
function collectSupplierKeys(
  days: [number, DailyRecord][],
  suppliers: ReadonlyMap<string, { code: string; name: string }>,
): { code: string; name: string }[] {
  const seen = new Map<string, string>()
  for (const [, rec] of days) {
    for (const [code] of rec.supplierBreakdown) {
      if (!seen.has(code)) {
        seen.set(code, suppliers.get(code)?.name ?? code)
      }
    }
  }
  return Array.from(seen.entries()).map(([code, name]) => ({ code, name }))
}

/** 移動明細のfrom→toキーを収集 */
function collectTransferKeys(
  days: [number, DailyRecord][],
  field: keyof DailyRecord['transferBreakdown'],
  stores: ReadonlyMap<string, { id: string; name: string }>,
): { key: string; from: string; to: string; label: string }[] {
  const seen = new Map<string, { from: string; to: string }>()
  for (const [, rec] of days) {
    const entries = rec.transferBreakdown[field]
    for (const e of entries) {
      const key = `${e.fromStoreId}->${e.toStoreId}`
      if (!seen.has(key)) {
        seen.set(key, { from: e.fromStoreId, to: e.toStoreId })
      }
    }
  }
  return Array.from(seen.entries()).map(([key, { from, to }]) => {
    const fromName = stores.get(from)?.name ?? from
    const toName = stores.get(to)?.name ?? to
    // コンパクトな店番号表示を試行
    const fromLabel = from.length <= 3 ? from.padStart(2, '0') : fromName
    const toLabel = to.length <= 3 ? to.padStart(2, '0') : toName
    return { key, from, to, label: `${fromLabel}→${toLabel}` }
  })
}

/** 移動明細の特定キーの合計を取得 */
function getTransferAmount(
  entries: readonly TransferBreakdownEntry[],
  from: string,
  to: string,
): number {
  let total = 0
  for (const e of entries) {
    if (e.fromStoreId === from && e.toStoreId === to) total += e.cost
  }
  return total
}

const EMPTY_SUPPLIER_KEYS: { code: string; name: string }[] = []
const EMPTY_TRANSFER_KEYS: { key: string; from: string; to: string; label: string }[] = []

export function DailyPage() {
  const nav = useNavigate()
  const { isComputing, daysInMonth } = useCalculation()
  const { currentResult, storeName, stores } = useStoreSelection()
  const suppliers = useDataStore((s) => s.data.suppliers)
  const dataStores = useDataStore((s) => s.data.stores)
  const settings = useSettingsStore((s) => s.settings)
  const prevYear = usePrevYearData()

  // 指標説明
  const explanations = useExplanations()
  const [explainMetric, setExplainMetric] = useState<MetricId | null>(null)
  const handleExplain = useCallback((metricId: MetricId) => {
    setExplainMetric(metricId)
  }, [])

  const [expanded, setExpanded] = useState<Set<ExpandableColumn>>(new Set())
  const [chartMode, setChartMode] = useState<DailyChartMode>('sales')

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

  // 累計粗利率 & 累計売変率の事前計算
  const cumulativeData = useMemo(() => {
    const map = new Map<number, { grossProfitRate: number; discountRate: number }>()
    let cumSales = 0
    let cumCost = 0
    let cumDiscount = 0
    let cumGrossSales = 0

    for (const [day, rec] of days) {
      cumSales += rec.sales
      cumCost += rec.totalCost
      cumDiscount += rec.discountAbsolute
      cumGrossSales += rec.grossSales

      map.set(day, {
        grossProfitRate: safeDivide(cumSales - cumCost, cumSales, 0),
        discountRate: safeDivide(cumDiscount, cumGrossSales, 0),
      })
    }
    return map
  }, [days])

  const toggleExpand = (col: ExpandableColumn) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(col)) next.delete(col)
      else next.add(col)
      return next
    })
  }

  if (isComputing && !currentResult) {
    return (
      <MainContent title="日別トレンド" storeName={storeName}>
        <PageSkeleton />
      </MainContent>
    )
  }

  if (!currentResult) {
    return (
      <MainContent title="日別トレンド" storeName={storeName}>
        <EmptyState>計算を実行してください</EmptyState>
      </MainContent>
    )
  }

  const renderExpandIcon = (col: ExpandableColumn) => (
    <ToggleIcon $expanded={expanded.has(col)}>&#9654;</ToggleIcon>
  )

  const fmtOrDash = (val: number) => (val !== 0 ? formatCurrency(val) : '-')
  const fmtOrDashPositive = (val: number) => (val > 0 ? formatCurrency(val) : '-')

  return (
    <MainContent title="日別トレンド" storeName={storeName}>
      <ChartToggle>
        <ChipGroup>
          <Chip $active={chartMode === 'sales'} onClick={() => setChartMode('sales')}>
            売上
          </Chip>
          <Chip $active={chartMode === 'discount'} onClick={() => setChartMode('discount')}>
            売変
          </Chip>
          <Chip $active={chartMode === 'all'} onClick={() => setChartMode('all')}>
            全表示
          </Chip>
        </ChipGroup>
      </ChartToggle>
      <ChartGrid>
        <DailySalesChart
          daily={currentResult.daily}
          daysInMonth={daysInMonth}
          year={settings.targetYear}
          month={settings.targetMonth}
          prevYearDaily={prevYear.hasPrevYear ? prevYear.daily : undefined}
          mode={chartMode}
        />
        <GrossProfitRateChart
          daily={currentResult.daily}
          daysInMonth={daysInMonth}
          targetRate={settings.targetGrossProfitRate}
          warningRate={settings.warningThreshold}
        />
      </ChartGrid>

      <KpiGrid>
        <KpiCard
          label="総売上高"
          value={formatCurrency(currentResult.totalSales)}
          onClick={() => handleExplain('salesTotal')}
          trend={
            prevYear.hasPrevYear && prevYear.totalSales > 0
              ? {
                  direction:
                    currentResult.totalSales > prevYear.totalSales
                      ? 'up'
                      : currentResult.totalSales < prevYear.totalSales
                        ? 'down'
                        : 'flat',
                  label: `前年比 ${formatPercent(currentResult.totalSales / prevYear.totalSales)}`,
                }
              : undefined
          }
        />
        <KpiCard
          label="総仕入原価"
          value={formatCurrency(currentResult.totalCost)}
          onClick={() => handleExplain('purchaseCost')}
        />
        <KpiCard
          label="売変額"
          value={formatCurrency(currentResult.totalDiscount)}
          onClick={() => handleExplain('discountTotal')}
        />
        <KpiCard
          label={currentResult.invMethodGrossProfitRate != null ? '実績粗利率' : '推定マージン率'}
          value={
            currentResult.invMethodGrossProfitRate != null
              ? formatPercent(currentResult.invMethodGrossProfitRate)
              : formatPercent(currentResult.estMethodMarginRate)
          }
          subText={
            currentResult.invMethodGrossProfit != null
              ? `実績粗利: ${formatCurrency(currentResult.invMethodGrossProfit)}`
              : undefined
          }
          badge={currentResult.invMethodGrossProfitRate != null ? 'actual' : 'estimated'}
          formulaSummary={
            currentResult.invMethodGrossProfitRate != null
              ? '粗利益 ÷ 総売上'
              : '推定マージン ÷ コア売上（理論値）'
          }
          onClick={() =>
            handleExplain(
              currentResult.invMethodGrossProfitRate != null
                ? 'invMethodGrossProfitRate'
                : 'estMethodMarginRate',
            )
          }
        />
        <KpiCard
          label="値入率"
          value={formatPercent(currentResult.averageMarkupRate)}
          subText={`コア値入率: ${formatPercent(currentResult.coreMarkupRate)}`}
          onClick={() => handleExplain('averageMarkupRate')}
        />
        <KpiCard
          label="消耗品費"
          value={formatCurrency(currentResult.totalConsumable)}
          onClick={() => handleExplain('totalConsumable')}
        />
      </KpiGrid>

      <Card>
        <CardTitle>日別明細</CardTitle>
        <TableWrapper>
          <Table>
            <thead>
              <tr>
                <Th>日</Th>
                <Th>売上</Th>
                {prevYear.hasPrevYear && <Th>前年同曜日</Th>}
                {prevYear.hasPrevYear && <Th>前年比</Th>}
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
                            useUiStore.getState().setCurrentView('insight')
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
                    <Td>{formatCurrency(rec.sales)}</Td>
                    {prevYear.hasPrevYear && (
                      <PrevYearTd>{prevSales > 0 ? formatCurrency(prevSales) : '-'}</PrevYearTd>
                    )}
                    {prevYear.hasPrevYear &&
                      (() => {
                        if (!prevSales || prevSales === 0) return <PrevYearTd>-</PrevYearTd>
                        const ratio = (rec.sales / prevSales) * 100
                        return <PrevYearTd $positive={ratio >= 100}>{ratio.toFixed(1)}%</PrevYearTd>
                      })()}
                    {/* 仕入原価 + 詳細 */}
                    <Td>{formatCurrency(rec.purchase.cost)}</Td>
                    {isPurchaseExpanded &&
                      supplierKeys.map((s) => {
                        const pair: CostPricePair | undefined = rec.supplierBreakdown.get(s.code)
                        return (
                          <SubTd key={`sup-cost-${s.code}`}>
                            {pair ? fmtOrDash(pair.cost) : '-'}
                          </SubTd>
                        )
                      })}
                    {/* 仕入売価 + 詳細 */}
                    <Td>{formatCurrency(rec.purchase.price)}</Td>
                    {isPurchaseExpanded &&
                      supplierKeys.map((s) => {
                        const pair: CostPricePair | undefined = rec.supplierBreakdown.get(s.code)
                        return (
                          <SubTd key={`sup-price-${s.code}`}>
                            {pair ? fmtOrDash(pair.price) : '-'}
                          </SubTd>
                        )
                      })}
                    {/* 店間入 + 詳細 */}
                    <Td>{fmtOrDash(rec.interStoreIn.cost)}</Td>
                    {isInterStoreInExpanded &&
                      interStoreInKeys.map((k) => {
                        const amt = getTransferAmount(
                          rec.transferBreakdown.interStoreIn,
                          k.from,
                          k.to,
                        )
                        return <SubTd key={`si-${k.key}`}>{fmtOrDash(amt)}</SubTd>
                      })}
                    {/* 店間出 + 詳細 */}
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
                    {/* 部門間入 + 詳細 */}
                    <Td>{fmtOrDash(rec.interDepartmentIn.cost)}</Td>
                    {isInterDeptInExpanded &&
                      interDeptInKeys.map((k) => {
                        const amt = getTransferAmount(
                          rec.transferBreakdown.interDepartmentIn,
                          k.from,
                          k.to,
                        )
                        return <SubTd key={`di-${k.key}`}>{fmtOrDash(amt)}</SubTd>
                      })}
                    {/* 部門間出 + 詳細 */}
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
                      {rec.discountAbsolute > 0 ? formatCurrency(rec.discountAbsolute) : '-'}
                    </Td>
                    <Td>{rec.consumable.cost > 0 ? formatCurrency(rec.consumable.cost) : '-'}</Td>
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
                        <RateTd $status={rec.sales > 0 ? gprStatus : undefined}>
                          {rec.sales > 0 ? formatPercent(gpr, 1) : '-'}
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
                        >
                          {rec.grossSales > 0 ? formatPercent(dr, 1) : '-'}
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
