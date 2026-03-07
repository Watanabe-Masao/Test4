import { useState } from 'react'
import type { StoreResult, Store } from '@/domain/models'
import { DISCOUNT_TYPES } from '@/domain/models'
import {
  formatPercent,
  formatCurrency,
  formatPointDiff,
  safeDivide,
} from '@/domain/calculations/utils'
import { resolveThresholds, evaluateSignal } from '@/domain/calculations/conditionResolver'
import type { ConditionSummaryConfig } from '@/domain/models/ConditionConfig'
import { CATEGORY_ORDER } from '@/domain/constants/categories'
import type { AppSettings } from '@/domain/models'
import type { PrevYearData } from '@/application/hooks/usePrevYearData'
import type { PrevYearMonthlyKpi } from '@/application/hooks/usePrevYearMonthlyKpi'
import {
  type SignalLevel,
  type ConditionItem,
  type DisplayMode,
  SIGNAL_COLORS,
  computeGpBeforeConsumable,
  computeGpAfterConsumable,
  computeGpAmount,
  computeGpAfterConsumableAmount,
  metricSignal,
  buildCrossMult,
} from './conditionSummaryUtils'
import {
  DetailHeader,
  DetailTitle,
  ToggleGroup,
  ToggleBtn,
  BTable,
  BTh,
  BTd,
  BTr,
  BSignalDot,
  ExpandIcon,
  CategoryDot,
  SubRow,
  BarCell,
  BreakdownRow,
  BreakdownLabel,
  BreakdownValue,
  BreakdownSignal,
  StoreBorderTr,
} from './ConditionSummary.styles'

// ─── Helpers ────────────────────────────────────────────

/** Prorate grossProfitBudget to the elapsed period using budgetDaily distribution */
function prorateGpBudget(
  sr: StoreResult,
  elapsedDays: number | undefined,
  daysInMonth: number | undefined,
): number {
  const dim = daysInMonth ?? 31
  const effectiveEndDay = elapsedDays ?? dim
  const isPartial = elapsedDays != null && elapsedDays < dim
  if (!isPartial) return sr.grossProfitBudget
  let periodBudgetSum = 0
  for (let d = 1; d <= effectiveEndDay; d++) periodBudgetSum += sr.budgetDaily.get(d) ?? 0
  return sr.budget > 0 ? sr.grossProfitBudget * (periodBudgetSum / sr.budget) : 0
}

// ─── Shared Props ───────────────────────────────────────

interface DetailPanelProps {
  readonly sortedStoreEntries: readonly [string, StoreResult][]
  readonly stores: ReadonlyMap<string, Store>
  readonly result: StoreResult
  readonly effectiveConfig: ConditionSummaryConfig
  readonly displayMode: DisplayMode
  readonly onDisplayModeChange: (mode: DisplayMode) => void
  readonly settings: AppSettings
  readonly elapsedDays?: number
  readonly daysInMonth?: number
  readonly dataMaxDay?: number
}

// ─── GP Rate Detail ─────────────────────────────────────

export function GpRateDetailTable({
  sortedStoreEntries,
  stores,
  result: r,
  effectiveConfig,
  displayMode,
  onDisplayModeChange,
  elapsedDays,
  daysInMonth,
}: DetailPanelProps) {
  const gpBefore = computeGpBeforeConsumable(r)
  const gpAfter = computeGpAfterConsumable(r)
  const gpDiff = (gpAfter - r.grossProfitRateBudget) * 100

  const gpSignal = (diffPt: number, storeId?: string): SignalLevel => {
    const t = resolveThresholds(effectiveConfig, 'gpRate', storeId)
    return evaluateSignal(diffPt, t, 'higher_better')
  }

  return (
    <>
      <DetailHeader>
        <DetailTitle>粗利率 — 店舗内訳</DetailTitle>
        <ToggleGroup>
          <ToggleBtn $active={displayMode === 'rate'} onClick={() => onDisplayModeChange('rate')}>
            率
          </ToggleBtn>
          <ToggleBtn
            $active={displayMode === 'amount'}
            onClick={() => onDisplayModeChange('amount')}
          >
            金額
          </ToggleBtn>
        </ToggleGroup>
      </DetailHeader>
      <BTable>
        <thead>
          <tr>
            <BTh>店舗名</BTh>
            {displayMode === 'rate' ? (
              <>
                <BTh>粗利率予算</BTh>
                <BTh>原算前粗利率</BTh>
                <BTh>原価算後粗利率</BTh>
                <BTh>差異</BTh>
              </>
            ) : (
              <>
                <BTh>粗利予算額</BTh>
                <BTh>原算前粗利額</BTh>
                <BTh>原価算後粗利額</BTh>
                <BTh>差異</BTh>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {sortedStoreEntries.map(([storeId, sr]) => {
            const store = stores.get(storeId)
            const storeName = store?.name ?? storeId
            const before = computeGpBeforeConsumable(sr)
            const after = computeGpAfterConsumable(sr)
            const diff = (after - sr.grossProfitRateBudget) * 100
            const sig = gpSignal(diff, sr.storeId)
            const sigColor = SIGNAL_COLORS[sig]

            if (displayMode === 'rate') {
              return (
                <BTr key={storeId}>
                  <BTd>
                    <BSignalDot $color={sigColor} />
                    {storeName}
                  </BTd>
                  <BTd>{formatPercent(sr.grossProfitRateBudget)}</BTd>
                  <BTd>{formatPercent(before)}</BTd>
                  <BTd>
                    {formatPercent(after)} ({formatPercent(sr.costInclusionRate)})
                  </BTd>
                  <BTd $color={sigColor}>{formatPointDiff(after - sr.grossProfitRateBudget)}</BTd>
                </BTr>
              )
            }
            // amount mode (period-prorated GP budget)
            const gpAmt = computeGpAmount(sr)
            const gpAfterAmt = computeGpAfterConsumableAmount(sr)
            const storeGpBudget = prorateGpBudget(sr, elapsedDays, daysInMonth)
            const diffAmt = gpAfterAmt - storeGpBudget
            return (
              <BTr key={storeId}>
                <BTd>
                  <BSignalDot $color={sigColor} />
                  {storeName}
                </BTd>
                <BTd>{formatCurrency(storeGpBudget)}</BTd>
                <BTd>{formatCurrency(gpAmt)}</BTd>
                <BTd>{formatCurrency(gpAfterAmt)}</BTd>
                <BTd $color={sigColor}>
                  {diffAmt >= 0 ? '+' : ''}
                  {formatCurrency(diffAmt)}
                </BTd>
              </BTr>
            )
          })}
          {/* Total row */}
          {(() => {
            const totalSig = gpSignal(gpDiff)
            const totalColor = SIGNAL_COLORS[totalSig]
            if (displayMode === 'rate') {
              return (
                <BTr $highlight>
                  <BTd $bold>合計</BTd>
                  <BTd $bold>{formatPercent(r.grossProfitRateBudget)}</BTd>
                  <BTd $bold>{formatPercent(gpBefore)}</BTd>
                  <BTd $bold>
                    {formatPercent(gpAfter)} ({formatPercent(r.costInclusionRate)})
                  </BTd>
                  <BTd $bold $color={totalColor}>
                    {formatPointDiff(gpAfter - r.grossProfitRateBudget)}
                  </BTd>
                </BTr>
              )
            }
            const totalGpAmt = computeGpAmount(r)
            const totalAfterAmt = computeGpAfterConsumableAmount(r)
            const totalGpBudget = prorateGpBudget(r, elapsedDays, daysInMonth)
            const totalDiffAmt = totalAfterAmt - totalGpBudget
            return (
              <BTr $highlight>
                <BTd $bold>合計</BTd>
                <BTd $bold>{formatCurrency(totalGpBudget)}</BTd>
                <BTd $bold>{formatCurrency(totalGpAmt)}</BTd>
                <BTd $bold>{formatCurrency(totalAfterAmt)}</BTd>
                <BTd $bold $color={totalColor}>
                  {totalDiffAmt >= 0 ? '+' : ''}
                  {formatCurrency(totalDiffAmt)}
                </BTd>
              </BTr>
            )
          })()}
        </tbody>
      </BTable>
    </>
  )
}

// ─── Discount Rate Detail ───────────────────────────────

export function DiscountRateDetailTable({
  sortedStoreEntries,
  stores,
  result: r,
  effectiveConfig,
  displayMode,
  onDisplayModeChange,
}: DetailPanelProps) {
  return (
    <>
      <DetailHeader>
        <DetailTitle>売変率 — 店舗内訳</DetailTitle>
        <ToggleGroup>
          <ToggleBtn $active={displayMode === 'rate'} onClick={() => onDisplayModeChange('rate')}>
            率
          </ToggleBtn>
          <ToggleBtn
            $active={displayMode === 'amount'}
            onClick={() => onDisplayModeChange('amount')}
          >
            金額
          </ToggleBtn>
        </ToggleGroup>
      </DetailHeader>
      <BTable>
        <thead>
          <tr>
            <BTh>店舗名</BTh>
            <BTh>売変率</BTh>
            {DISCOUNT_TYPES.map((dt) => (
              <BTh key={dt.type}>
                {dt.label}({dt.type})
              </BTh>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedStoreEntries.map(([storeId, sr]) => {
            const store = stores.get(storeId)
            const storeName = store?.name ?? storeId
            const sig = metricSignal(sr.discountRate, 'discountRate', effectiveConfig, sr.storeId)
            const sigColor = SIGNAL_COLORS[sig]

            return (
              <BTr key={storeId}>
                <BTd>
                  <BSignalDot $color={sigColor} />
                  {storeName}
                </BTd>
                <BTd $color={sigColor}>
                  {displayMode === 'rate'
                    ? formatPercent(sr.discountRate)
                    : formatCurrency(sr.totalDiscount)}
                </BTd>
                {DISCOUNT_TYPES.map((dt) => {
                  const entry = sr.discountEntries.find((e) => e.type === dt.type)
                  const amt = entry?.amount ?? 0
                  const rate = sr.grossSales > 0 ? safeDivide(amt, sr.grossSales, 0) : 0
                  return (
                    <BTd key={dt.type}>
                      {displayMode === 'rate' ? formatPercent(rate) : formatCurrency(amt)}
                    </BTd>
                  )
                })}
              </BTr>
            )
          })}
          {/* Total row */}
          {(() => {
            const totalSig = metricSignal(r.discountRate, 'discountRate', effectiveConfig)
            const totalColor = SIGNAL_COLORS[totalSig]
            return (
              <BTr $highlight>
                <BTd $bold>合計</BTd>
                <BTd $bold $color={totalColor}>
                  {displayMode === 'rate'
                    ? formatPercent(r.discountRate)
                    : formatCurrency(r.totalDiscount)}
                </BTd>
                {DISCOUNT_TYPES.map((dt) => {
                  const entry = r.discountEntries.find((e) => e.type === dt.type)
                  const amt = entry?.amount ?? 0
                  const rate = r.grossSales > 0 ? safeDivide(amt, r.grossSales, 0) : 0
                  return (
                    <BTd key={dt.type} $bold>
                      {displayMode === 'rate' ? formatPercent(rate) : formatCurrency(amt)}
                    </BTd>
                  )
                })}
              </BTr>
            )
          })()}
        </tbody>
      </BTable>
    </>
  )
}

// ─── Markup Rate Detail ─────────────────────────────────

interface MarkupDetailProps extends DetailPanelProps {
  readonly expandedMarkupStore: string | null
  readonly onExpandToggle: (storeId: string) => void
}

export function MarkupRateDetailTable({
  sortedStoreEntries,
  stores,
  result: r,
  effectiveConfig,
  displayMode,
  onDisplayModeChange,
  settings,
  expandedMarkupStore,
  onExpandToggle,
}: MarkupDetailProps) {
  const markupSignal = (rate: number, storeId?: string): SignalLevel => {
    const t = resolveThresholds(effectiveConfig, 'markupRate', storeId)
    const diff = (rate - r.grossProfitRateBudget) * 100
    return evaluateSignal(diff, t, 'higher_better')
  }

  return (
    <>
      <DetailHeader>
        <DetailTitle>値入率 — 店舗内訳</DetailTitle>
        <ToggleGroup>
          <ToggleBtn $active={displayMode === 'rate'} onClick={() => onDisplayModeChange('rate')}>
            率
          </ToggleBtn>
          <ToggleBtn
            $active={displayMode === 'amount'}
            onClick={() => onDisplayModeChange('amount')}
          >
            金額
          </ToggleBtn>
        </ToggleGroup>
      </DetailHeader>
      <BTable>
        <thead>
          <tr>
            <BTh>店舗名</BTh>
            <BTh>平均値入率</BTh>
            <BTh>コア値入率</BTh>
            {displayMode === 'amount' && (
              <>
                <BTh>原価合計</BTh>
                <BTh>売価合計</BTh>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {sortedStoreEntries.flatMap(([storeId, sr]) => {
            const store = stores.get(storeId)
            const storeName = store?.name ?? storeId
            const isExpanded = expandedMarkupStore === storeId
            const crossRows = buildCrossMult(sr, settings.supplierCategoryMap)
            const sig = markupSignal(sr.averageMarkupRate, sr.storeId)
            const sigColor = SIGNAL_COLORS[sig]

            const rows: React.ReactNode[] = [
              <BTr
                key={storeId}
                onClick={() => onExpandToggle(storeId)}
                style={{ cursor: 'pointer' }}
              >
                <BTd>
                  <ExpandIcon $expanded={isExpanded}>▶</ExpandIcon>
                  <BSignalDot $color={sigColor} />
                  {storeName}
                </BTd>
                <BTd $color={sigColor}>{formatPercent(sr.averageMarkupRate)}</BTd>
                <BTd>{formatPercent(sr.coreMarkupRate)}</BTd>
                {displayMode === 'amount' && (
                  <>
                    <BTd>{formatCurrency(crossRows.reduce((sum, c) => sum + c.cost, 0))}</BTd>
                    <BTd>{formatCurrency(crossRows.reduce((sum, c) => sum + c.price, 0))}</BTd>
                  </>
                )}
              </BTr>,
            ]

            // Drill-down: 相乗積テーブル
            if (isExpanded) {
              rows.push(
                <SubRow key={`${storeId}-header`}>
                  <BTd
                    colSpan={displayMode === 'amount' ? 5 : 3}
                    style={{ padding: '4px 12px', fontSize: '0.7rem', fontWeight: 600 }}
                  >
                    相乗積内訳 （値入率 × 売価構成比 = 相乗積）
                  </BTd>
                </SubRow>,
              )

              const maxCross = Math.max(
                ...crossRows.map((c) => Math.abs(c.crossMultiplication)),
                0.001,
              )

              crossRows.forEach((cr) => {
                rows.push(
                  <SubRow key={`${storeId}-${cr.label}`}>
                    <BTd style={{ paddingLeft: '28px' }}>
                      <CategoryDot $color={cr.color} />
                      {cr.label}
                    </BTd>
                    <BTd>
                      <BarCell
                        $ratio={Math.abs(cr.crossMultiplication) / maxCross}
                        $color={cr.color}
                      >
                        {formatPercent(cr.crossMultiplication)}
                      </BarCell>
                    </BTd>
                    <BTd>
                      {formatPercent(cr.markupRate)} × {formatPercent(cr.priceShare)}
                    </BTd>
                    {displayMode === 'amount' && (
                      <>
                        <BTd>{formatCurrency(cr.cost)}</BTd>
                        <BTd>{formatCurrency(cr.price)}</BTd>
                      </>
                    )}
                  </SubRow>,
                )
              })

              // Sub total
              const totalCross = crossRows.reduce((s, c) => s + c.crossMultiplication, 0)
              rows.push(
                <SubRow key={`${storeId}-total`}>
                  <BTd style={{ paddingLeft: '28px', fontWeight: 700 }}>合計</BTd>
                  <BTd $bold>{formatPercent(totalCross)}</BTd>
                  <BTd $bold>= 平均値入率</BTd>
                  {displayMode === 'amount' && (
                    <>
                      <BTd />
                      <BTd />
                    </>
                  )}
                </SubRow>,
              )
            }

            return rows
          })}
          {/* Total row */}
          <BTr $highlight>
            <BTd $bold>合計</BTd>
            <BTd $bold>{formatPercent(r.averageMarkupRate)}</BTd>
            <BTd $bold>{formatPercent(r.coreMarkupRate)}</BTd>
            {displayMode === 'amount' && (
              <>
                <BTd $bold>
                  {formatCurrency(
                    CATEGORY_ORDER.reduce(
                      (sum, cat) => sum + (r.categoryTotals.get(cat)?.cost ?? 0),
                      0,
                    ),
                  )}
                </BTd>
                <BTd $bold>
                  {formatCurrency(
                    CATEGORY_ORDER.reduce(
                      (sum, cat) => sum + (r.categoryTotals.get(cat)?.price ?? 0),
                      0,
                    ),
                  )}
                </BTd>
              </>
            )}
          </BTr>
        </tbody>
      </BTable>
    </>
  )
}

// ─── Cost Inclusion Detail ──────────────────────────────

interface CostInclusionDetailProps extends DetailPanelProps {
  readonly expandedMarkupStore: string | null
  readonly onExpandToggle: (storeId: string) => void
}

/** 店舗の日別データから品目別に集約する */
function aggregateCostInclusionItems(sr: StoreResult): { itemName: string; cost: number }[] {
  const agg = new Map<string, number>()
  for (const [, dr] of sr.daily) {
    for (const item of dr.costInclusion.items) {
      agg.set(item.itemName, (agg.get(item.itemName) ?? 0) + item.cost)
    }
  }
  return [...agg.entries()]
    .map(([itemName, cost]) => ({ itemName, cost }))
    .sort((a, b) => b.cost - a.cost)
}

export function CostInclusionDetailTable({
  sortedStoreEntries,
  stores,
  result: r,
  effectiveConfig,
  expandedMarkupStore,
  onExpandToggle,
}: CostInclusionDetailProps) {
  const totalItems = aggregateCostInclusionItems(r)
  const grandTotal = r.totalCostInclusion
  const hasExpanded = expandedMarkupStore != null

  return (
    <>
      <DetailHeader>
        <DetailTitle>原価算入費 — 店舗別 品目内訳</DetailTitle>
      </DetailHeader>
      <BTable>
        <thead>
          <tr>
            <BTh>店舗名</BTh>
            <BTh>原価算入費</BTh>
            <BTh>原価算入率</BTh>
          </tr>
        </thead>
        <tbody>
          {sortedStoreEntries.flatMap(([storeId, sr], idx) => {
            const store = stores.get(storeId)
            const storeName = store?.name ?? storeId
            const isExpanded = expandedMarkupStore === storeId
            const sig = metricSignal(
              sr.costInclusionRate,
              'costInclusion',
              effectiveConfig,
              sr.storeId,
            )
            const sigColor = SIGNAL_COLORS[sig]

            const rows: React.ReactNode[] = []

            // Add store boundary separator when any store is expanded (except first)
            if (hasExpanded && idx > 0) {
              rows.push(
                <StoreBorderTr key={`${storeId}-border`}>
                  <td colSpan={3} />
                </StoreBorderTr>,
              )
            }

            rows.push(
              <BTr
                key={storeId}
                onClick={() => onExpandToggle(storeId)}
                style={{ cursor: 'pointer' }}
              >
                <BTd>
                  <ExpandIcon $expanded={isExpanded}>▶</ExpandIcon>
                  <BSignalDot $color={sigColor} />
                  {storeName}
                </BTd>
                <BTd>{formatCurrency(sr.totalCostInclusion)}</BTd>
                <BTd $color={sigColor}>{formatPercent(sr.costInclusionRate)}</BTd>
              </BTr>,
            )

            if (isExpanded) {
              const storeItems = aggregateCostInclusionItems(sr)
              const storeTotal = sr.totalCostInclusion
              if (storeItems.length === 0) {
                rows.push(
                  <SubRow key={`${storeId}-empty`}>
                    <BTd
                      colSpan={3}
                      style={{ paddingLeft: '28px', fontSize: '0.7rem', color: '#999' }}
                    >
                      品目データなし
                    </BTd>
                  </SubRow>,
                )
              } else {
                rows.push(
                  <SubRow key={`${storeId}-header`}>
                    <BTd style={{ paddingLeft: '28px', fontSize: '0.7rem', fontWeight: 600 }}>
                      品目
                    </BTd>
                    <BTd style={{ fontSize: '0.7rem', fontWeight: 600 }}>金額</BTd>
                    <BTd style={{ fontSize: '0.7rem', fontWeight: 600 }}>構成比</BTd>
                  </SubRow>,
                )
                for (const item of storeItems) {
                  const itemShare = storeTotal > 0 ? item.cost / storeTotal : 0
                  rows.push(
                    <SubRow key={`${storeId}-${item.itemName}`}>
                      <BTd style={{ paddingLeft: '28px' }}>{item.itemName}</BTd>
                      <BTd>{formatCurrency(item.cost)}</BTd>
                      <BTd>{formatPercent(itemShare)}</BTd>
                    </SubRow>,
                  )
                }
              }
            }

            return rows
          })}
          {/* Total row */}
          <BTr $highlight>
            <BTd $bold>合計</BTd>
            <BTd $bold>{formatCurrency(grandTotal)}</BTd>
            <BTd $bold>{formatPercent(r.costInclusionRate)}</BTd>
          </BTr>
          {/* Grand total item breakdown */}
          {totalItems.length > 0 && (
            <>
              <SubRow>
                <BTd style={{ paddingLeft: '12px', fontSize: '0.7rem', fontWeight: 600 }}>
                  全店 品目内訳
                </BTd>
                <BTd style={{ fontSize: '0.7rem', fontWeight: 600 }}>金額</BTd>
                <BTd style={{ fontSize: '0.7rem', fontWeight: 600 }}>構成比</BTd>
              </SubRow>
              {totalItems.map((item) => {
                const itemShare = grandTotal > 0 ? item.cost / grandTotal : 0
                return (
                  <SubRow key={`total-${item.itemName}`}>
                    <BTd style={{ paddingLeft: '20px' }}>{item.itemName}</BTd>
                    <BTd>{formatCurrency(item.cost)}</BTd>
                    <BTd>{formatPercent(itemShare)}</BTd>
                  </SubRow>
                )
              })}
            </>
          )}
        </tbody>
      </BTable>
    </>
  )
}

// ─── Sales YoY Detail ──────────────────────────────────

interface SalesYoYDetailProps extends DetailPanelProps {
  readonly prevYear: PrevYearData
  readonly prevYearMonthlyKpi: PrevYearMonthlyKpi
  readonly expandedStore: string | null
  readonly onExpandToggle: (storeId: string) => void
}

export function SalesYoYDetailTable({
  sortedStoreEntries,
  stores,
  result: r,
  effectiveConfig,
  prevYear,
  prevYearMonthlyKpi,
  dataMaxDay,
}: SalesYoYDetailProps) {
  const [dailyMode, setDailyMode] = useState<'cumulative' | 'daily'>('cumulative')
  const prevTotal = prevYear.totalSales
  const yoyTotal = safeDivide(r.totalSales, prevTotal, 0)
  const totalSig = metricSignal(yoyTotal, 'salesYoY', effectiveConfig)
  const totalColor = SIGNAL_COLORS[totalSig]

  // Build all-store daily data from prevYearMonthlyKpi (sameDow mapping) and current daily
  const dailyRows = buildDailyYoYRows(r, prevYearMonthlyKpi)

  return (
    <>
      <DetailHeader>
        <DetailTitle>売上前年比 — 店舗内訳</DetailTitle>
      </DetailHeader>
      <BTable>
        <thead>
          <tr>
            <BTh>店舗名</BTh>
            <BTh>当年売上</BTh>
            <BTh>前年売上</BTh>
            <BTh>前年比</BTh>
          </tr>
        </thead>
        <tbody>
          {sortedStoreEntries.map(([storeId, sr]) => {
            const store = stores.get(storeId)
            const storeName = store?.name ?? storeId
            const prevStoreSales = computeStorePrevSales(prevYearMonthlyKpi, storeId, dataMaxDay)
            const storeYoY = safeDivide(sr.totalSales, prevStoreSales, 0)
            const sig =
              prevStoreSales > 0
                ? metricSignal(storeYoY, 'salesYoY', effectiveConfig, sr.storeId)
                : 'blue'
            const sigColor = SIGNAL_COLORS[sig]

            return (
              <BTr key={storeId}>
                <BTd>
                  <BSignalDot $color={sigColor} />
                  {storeName}
                </BTd>
                <BTd>{formatCurrency(sr.totalSales)}</BTd>
                <BTd>{prevStoreSales > 0 ? formatCurrency(prevStoreSales) : '—'}</BTd>
                <BTd $color={sigColor}>{prevStoreSales > 0 ? formatPercent(storeYoY, 2) : '—'}</BTd>
              </BTr>
            )
          })}
          <BTr $highlight>
            <BTd $bold>合計</BTd>
            <BTd $bold>{formatCurrency(r.totalSales)}</BTd>
            <BTd $bold>{formatCurrency(prevTotal)}</BTd>
            <BTd $bold $color={totalColor}>
              {formatPercent(yoyTotal, 2)}
            </BTd>
          </BTr>
        </tbody>
      </BTable>

      {/* All-store daily breakdown */}
      {dailyRows.length > 0 && (
        <>
          <DetailHeader style={{ marginTop: '16px' }}>
            <DetailTitle>全店 日別推移</DetailTitle>
            <ToggleGroup>
              <ToggleBtn
                $active={dailyMode === 'cumulative'}
                onClick={() => setDailyMode('cumulative')}
              >
                累計
              </ToggleBtn>
              <ToggleBtn $active={dailyMode === 'daily'} onClick={() => setDailyMode('daily')}>
                日別
              </ToggleBtn>
            </ToggleGroup>
          </DetailHeader>
          <BTable>
            <thead>
              <tr>
                <BTh>日</BTh>
                <BTh>当年</BTh>
                <BTh>前年</BTh>
                <BTh>前年比</BTh>
              </tr>
            </thead>
            <tbody>{renderDailyYoYRows(dailyRows, dailyMode, 'sales')}</tbody>
          </BTable>
        </>
      )}
    </>
  )
}

// ─── Customer YoY Detail ───────────────────────────────

interface CustomerYoYDetailProps extends DetailPanelProps {
  readonly prevYear: PrevYearData
  readonly prevYearMonthlyKpi: PrevYearMonthlyKpi
  readonly expandedStore: string | null
  readonly onExpandToggle: (storeId: string) => void
}

export function CustomerYoYDetailTable({
  sortedStoreEntries,
  stores,
  result: r,
  effectiveConfig,
  prevYear,
  prevYearMonthlyKpi,
  dataMaxDay,
}: CustomerYoYDetailProps) {
  const [dailyMode, setDailyMode] = useState<'cumulative' | 'daily'>('cumulative')
  const prevTotal = prevYear.totalCustomers
  const yoyTotal = safeDivide(r.totalCustomers, prevTotal, 0)
  const totalSig = metricSignal(yoyTotal, 'customerYoY', effectiveConfig)
  const totalColor = SIGNAL_COLORS[totalSig]

  const dailyRows = buildDailyYoYRows(r, prevYearMonthlyKpi)

  return (
    <>
      <DetailHeader>
        <DetailTitle>客数前年比 — 店舗内訳</DetailTitle>
      </DetailHeader>
      <BTable>
        <thead>
          <tr>
            <BTh>店舗名</BTh>
            <BTh>当年客数</BTh>
            <BTh>前年客数</BTh>
            <BTh>前年比</BTh>
          </tr>
        </thead>
        <tbody>
          {sortedStoreEntries.map(([storeId, sr]) => {
            const store = stores.get(storeId)
            const storeName = store?.name ?? storeId
            const prevStoreCustomers = computeStorePrevCustomers(
              prevYearMonthlyKpi,
              storeId,
              dataMaxDay,
            )
            const storeYoY = safeDivide(sr.totalCustomers, prevStoreCustomers, 0)
            const sig =
              prevStoreCustomers > 0
                ? metricSignal(storeYoY, 'customerYoY', effectiveConfig, sr.storeId)
                : 'blue'
            const sigColor = SIGNAL_COLORS[sig]

            return (
              <BTr key={storeId}>
                <BTd>
                  <BSignalDot $color={sigColor} />
                  {storeName}
                </BTd>
                <BTd>{sr.totalCustomers.toLocaleString()}人</BTd>
                <BTd>
                  {prevStoreCustomers > 0 ? `${prevStoreCustomers.toLocaleString()}人` : '—'}
                </BTd>
                <BTd $color={sigColor}>
                  {prevStoreCustomers > 0 ? formatPercent(storeYoY, 2) : '—'}
                </BTd>
              </BTr>
            )
          })}
          <BTr $highlight>
            <BTd $bold>合計</BTd>
            <BTd $bold>{r.totalCustomers.toLocaleString()}人</BTd>
            <BTd $bold>{prevTotal.toLocaleString()}人</BTd>
            <BTd $bold $color={totalColor}>
              {formatPercent(yoyTotal, 2)}
            </BTd>
          </BTr>
        </tbody>
      </BTable>

      {dailyRows.length > 0 && (
        <>
          <DetailHeader style={{ marginTop: '16px' }}>
            <DetailTitle>全店 日別推移</DetailTitle>
            <ToggleGroup>
              <ToggleBtn
                $active={dailyMode === 'cumulative'}
                onClick={() => setDailyMode('cumulative')}
              >
                累計
              </ToggleBtn>
              <ToggleBtn $active={dailyMode === 'daily'} onClick={() => setDailyMode('daily')}>
                日別
              </ToggleBtn>
            </ToggleGroup>
          </DetailHeader>
          <BTable>
            <thead>
              <tr>
                <BTh>日</BTh>
                <BTh>当年</BTh>
                <BTh>前年</BTh>
                <BTh>前年比</BTh>
              </tr>
            </thead>
            <tbody>{renderDailyYoYRows(dailyRows, dailyMode, 'customers')}</tbody>
          </BTable>
        </>
      )}
    </>
  )
}

// ─── Tx Value Detail ───────────────────────────────────

interface TxValueDetailProps extends DetailPanelProps {
  readonly expandedStore: string | null
  readonly onExpandToggle: (storeId: string) => void
}

export function TxValueDetailTable({
  sortedStoreEntries,
  stores,
  result: r,
  expandedStore,
  onExpandToggle,
}: TxValueDetailProps) {
  const txTotal = safeDivide(r.totalSales, r.totalCustomers, 0)
  const fmtTx = (v: number) =>
    `${v.toLocaleString('ja-JP', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}円`
  const hasExpanded = expandedStore != null

  return (
    <>
      <DetailHeader>
        <DetailTitle>客単価 — 店舗内訳</DetailTitle>
      </DetailHeader>
      <BTable>
        <thead>
          <tr>
            <BTh>店舗名</BTh>
            <BTh>売上</BTh>
            <BTh>客数</BTh>
            <BTh>客単価</BTh>
          </tr>
        </thead>
        <tbody>
          {sortedStoreEntries.flatMap(([storeId, sr], idx) => {
            const store = stores.get(storeId)
            const storeName = store?.name ?? storeId
            const storeTx = safeDivide(sr.totalSales, sr.totalCustomers, 0)
            const isExpanded = expandedStore === storeId

            const rows: React.ReactNode[] = []

            // Store boundary separator when any store is expanded (except first)
            if (hasExpanded && idx > 0) {
              rows.push(
                <StoreBorderTr key={`${storeId}-border`}>
                  <td colSpan={4} />
                </StoreBorderTr>,
              )
            }

            rows.push(
              <BTr
                key={storeId}
                onClick={() => onExpandToggle(storeId)}
                style={{ cursor: 'pointer' }}
              >
                <BTd>
                  <ExpandIcon $expanded={isExpanded}>▶</ExpandIcon>
                  <BSignalDot $color={SIGNAL_COLORS.blue} />
                  {storeName}
                </BTd>
                <BTd>{formatCurrency(sr.totalSales)}</BTd>
                <BTd>{sr.totalCustomers.toLocaleString()}人</BTd>
                <BTd>{fmtTx(storeTx)}</BTd>
              </BTr>,
            )

            // Daily trend per store
            if (isExpanded) {
              rows.push(
                <SubRow key={`${storeId}-header`}>
                  <BTd style={{ paddingLeft: '28px', fontSize: '0.7rem', fontWeight: 600 }}>日</BTd>
                  <BTd style={{ fontSize: '0.7rem', fontWeight: 600 }}>売上</BTd>
                  <BTd style={{ fontSize: '0.7rem', fontWeight: 600 }}>客数</BTd>
                  <BTd style={{ fontSize: '0.7rem', fontWeight: 600 }}>客単価</BTd>
                </SubRow>,
              )
              const days = [...sr.daily.entries()].sort(([a], [b]) => a - b)
              for (const [day, dr] of days) {
                const customers = dr.customers ?? 0
                const dayTx = safeDivide(dr.sales, customers, 0)
                rows.push(
                  <SubRow key={`${storeId}-${day}`}>
                    <BTd style={{ paddingLeft: '28px' }}>{day}日</BTd>
                    <BTd>{formatCurrency(dr.sales)}</BTd>
                    <BTd>{customers.toLocaleString()}人</BTd>
                    <BTd>{fmtTx(dayTx)}</BTd>
                  </SubRow>,
                )
              }
            }

            return rows
          })}
          <BTr $highlight>
            <BTd $bold>合計</BTd>
            <BTd $bold>{formatCurrency(r.totalSales)}</BTd>
            <BTd $bold>{r.totalCustomers.toLocaleString()}人</BTd>
            <BTd $bold>{fmtTx(txTotal)}</BTd>
          </BTr>
        </tbody>
      </BTable>
    </>
  )
}

// ─── Daily Sales Achievement Detail ────────────────────

interface DailySalesDetailProps extends DetailPanelProps {
  readonly daysInMonth: number
  readonly expandedStore: string | null
  readonly onExpandToggle: (storeId: string) => void
}

export function DailySalesDetailTable({
  sortedStoreEntries,
  stores,
  result: r,
  effectiveConfig,
  daysInMonth,
  expandedStore,
  onExpandToggle,
}: DailySalesDetailProps) {
  const budgetDailyAvg = daysInMonth > 0 ? r.budget / daysInMonth : 0
  const dailyRatio = safeDivide(r.averageDailySales, budgetDailyAvg, 0)
  const totalSig = metricSignal(dailyRatio, 'dailySales', effectiveConfig)
  const totalColor = SIGNAL_COLORS[totalSig]

  return (
    <>
      <DetailHeader>
        <DetailTitle>売上予算達成率 — 店舗内訳</DetailTitle>
      </DetailHeader>
      <BTable>
        <thead>
          <tr>
            <BTh>店舗名</BTh>
            <BTh>実績売上</BTh>
            <BTh>予算</BTh>
            <BTh>達成率</BTh>
            <BTh>日販</BTh>
            <BTh>予算日販</BTh>
          </tr>
        </thead>
        <tbody>
          {sortedStoreEntries.flatMap(([storeId, sr]) => {
            const store = stores.get(storeId)
            const storeName = store?.name ?? storeId
            const storeBudgetDaily = daysInMonth > 0 ? sr.budget / daysInMonth : 0
            const storeRatio = safeDivide(sr.averageDailySales, storeBudgetDaily, 0)
            const achievementRate = safeDivide(sr.totalSales, sr.budget, 0)
            const sig =
              storeBudgetDaily > 0
                ? metricSignal(storeRatio, 'dailySales', effectiveConfig, sr.storeId)
                : 'blue'
            const sigColor = SIGNAL_COLORS[sig]
            const isExpanded = expandedStore === storeId

            const rows: React.ReactNode[] = [
              <BTr
                key={storeId}
                onClick={() => onExpandToggle(storeId)}
                style={{ cursor: 'pointer' }}
              >
                <BTd>
                  <ExpandIcon $expanded={isExpanded}>▶</ExpandIcon>
                  <BSignalDot $color={sigColor} />
                  {storeName}
                </BTd>
                <BTd>{formatCurrency(sr.totalSales)}</BTd>
                <BTd>{formatCurrency(sr.budget)}</BTd>
                <BTd $color={sigColor}>
                  {sr.budget > 0 ? formatPercent(achievementRate, 2) : '—'}
                </BTd>
                <BTd>{formatCurrency(sr.averageDailySales)}</BTd>
                <BTd>{formatCurrency(storeBudgetDaily)}</BTd>
              </BTr>,
            ]

            // Daily breakdown per store
            if (isExpanded) {
              rows.push(
                <SubRow key={`${storeId}-header`}>
                  <BTd style={{ paddingLeft: '28px', fontSize: '0.7rem', fontWeight: 600 }}>日</BTd>
                  <BTd style={{ fontSize: '0.7rem', fontWeight: 600 }}>売上</BTd>
                  <BTd style={{ fontSize: '0.7rem', fontWeight: 600 }}>予算</BTd>
                  <BTd style={{ fontSize: '0.7rem', fontWeight: 600 }}>達成率</BTd>
                  <BTd colSpan={2} />
                </SubRow>,
              )
              const days = [...sr.daily.entries()].sort(([a], [b]) => a - b)
              let cumSales = 0
              let cumBudget = 0
              for (const [day, dr] of days) {
                const dayBudget = sr.budgetDaily.get(day) ?? 0
                cumSales += dr.sales
                cumBudget += dayBudget
                const dayRate = safeDivide(cumSales, cumBudget, 0)
                rows.push(
                  <SubRow key={`${storeId}-${day}`}>
                    <BTd style={{ paddingLeft: '28px' }}>{day}日</BTd>
                    <BTd>{formatCurrency(dr.sales)}</BTd>
                    <BTd>{formatCurrency(dayBudget)}</BTd>
                    <BTd>{cumBudget > 0 ? formatPercent(dayRate, 2) : '—'}</BTd>
                    <BTd colSpan={2} />
                  </SubRow>,
                )
              }
            }

            return rows
          })}
          <BTr $highlight>
            <BTd $bold>合計</BTd>
            <BTd $bold>{formatCurrency(r.totalSales)}</BTd>
            <BTd $bold>{formatCurrency(r.budget)}</BTd>
            <BTd $bold $color={totalColor}>
              {r.budget > 0 ? formatPercent(safeDivide(r.totalSales, r.budget, 0), 2) : '—'}
            </BTd>
            <BTd $bold>{formatCurrency(r.averageDailySales)}</BTd>
            <BTd $bold>{formatCurrency(budgetDailyAvg)}</BTd>
          </BTr>
        </tbody>
      </BTable>
    </>
  )
}

// ─── YoY Helper Functions ──────────────────────────────

/** Store-level prev-year sales from storeContributions, filtered by maxDay */
function computeStorePrevSales(kpi: PrevYearMonthlyKpi, storeId: string, maxDay?: number): number {
  if (!kpi.hasPrevYear) return 0
  return kpi.sameDow.storeContributions
    .filter((c) => c.storeId === storeId && (maxDay == null || c.mappedDay <= maxDay))
    .reduce((sum, c) => sum + c.sales, 0)
}

/** Store-level prev-year customers from storeContributions, filtered by maxDay */
function computeStorePrevCustomers(
  kpi: PrevYearMonthlyKpi,
  storeId: string,
  maxDay?: number,
): number {
  if (!kpi.hasPrevYear) return 0
  return kpi.sameDow.storeContributions
    .filter((c) => c.storeId === storeId && (maxDay == null || c.mappedDay <= maxDay))
    .reduce((sum, c) => sum + c.customers, 0)
}

interface DailyYoYRow {
  readonly day: number
  readonly currentSales: number
  readonly prevSales: number
  readonly currentCustomers: number
  readonly prevCustomers: number
}

/** Build daily YoY comparison rows (all-store aggregate) */
function buildDailyYoYRows(r: StoreResult, kpi: PrevYearMonthlyKpi): DailyYoYRow[] {
  if (!kpi.hasPrevYear) return []

  const mapping = kpi.sameDow.dailyMapping
  const dayMap = new Map<number, { prevSales: number; prevCustomers: number }>()
  for (const row of mapping) {
    dayMap.set(row.currentDay, { prevSales: row.prevSales, prevCustomers: row.prevCustomers })
  }

  const rows: DailyYoYRow[] = []
  const days = [...r.daily.entries()].sort(([a], [b]) => a - b)
  for (const [day, dr] of days) {
    const prev = dayMap.get(day)
    rows.push({
      day,
      currentSales: dr.sales,
      prevSales: prev?.prevSales ?? 0,
      currentCustomers: dr.customers ?? 0,
      prevCustomers: prev?.prevCustomers ?? 0,
    })
  }
  return rows
}

/** Render daily YoY rows with cumulative/daily toggle */
function renderDailyYoYRows(
  rows: DailyYoYRow[],
  mode: 'cumulative' | 'daily',
  metric: 'sales' | 'customers',
): React.ReactNode[] {
  let cumCurrent = 0
  let cumPrev = 0

  return rows.map((row) => {
    const currentVal = metric === 'sales' ? row.currentSales : row.currentCustomers
    const prevVal = metric === 'sales' ? row.prevSales : row.prevCustomers
    cumCurrent += currentVal
    cumPrev += prevVal

    const displayCurrent = mode === 'cumulative' ? cumCurrent : currentVal
    const displayPrev = mode === 'cumulative' ? cumPrev : prevVal
    const yoy = safeDivide(displayCurrent, displayPrev, 0)

    const fmtVal =
      metric === 'sales'
        ? (v: number) => formatCurrency(v)
        : (v: number) => `${v.toLocaleString()}人`

    return (
      <BTr key={row.day}>
        <BTd>{row.day}日</BTd>
        <BTd>{fmtVal(displayCurrent)}</BTd>
        <BTd>{displayPrev > 0 ? fmtVal(displayPrev) : '—'}</BTd>
        <BTd>{displayPrev > 0 ? formatPercent(yoy, 2) : '—'}</BTd>
      </BTr>
    )
  })
}

// ─── Simple Breakdown ───────────────────────────────────

interface SimpleBreakdownProps {
  readonly breakdownItem: ConditionItem
  readonly sortedStoreEntries: readonly [string, StoreResult][]
  readonly stores: ReadonlyMap<string, Store>
}

export function SimpleBreakdown({
  breakdownItem,
  sortedStoreEntries,
  stores,
}: SimpleBreakdownProps) {
  if (!breakdownItem.storeValue) return null
  return (
    <>
      <DetailTitle style={{ marginBottom: '16px' }}>{breakdownItem.label} — 店舗内訳</DetailTitle>
      {sortedStoreEntries.map(([storeId, sr]) => {
        const store = stores.get(storeId)
        const storeName = store?.name ?? storeId
        const bv = breakdownItem.storeValue!(sr)
        const signalColor = SIGNAL_COLORS[bv.signal]
        return (
          <BreakdownRow key={storeId}>
            <BreakdownLabel>
              <BreakdownSignal $color={signalColor} />
              {storeName}
            </BreakdownLabel>
            <BreakdownValue $color={signalColor}>{bv.value}</BreakdownValue>
          </BreakdownRow>
        )
      })}
      <BreakdownRow $bold>
        <BreakdownLabel>合計</BreakdownLabel>
        <BreakdownValue $color={SIGNAL_COLORS[breakdownItem.signal]}>
          {breakdownItem.value}
        </BreakdownValue>
      </BreakdownRow>
    </>
  )
}
