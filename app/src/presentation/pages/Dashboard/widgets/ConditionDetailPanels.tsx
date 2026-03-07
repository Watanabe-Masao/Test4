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
} from './ConditionSummary.styles'

// ─── Shared Props ───────────────────────────────────────

interface DetailPanelProps {
  readonly sortedStoreEntries: readonly [string, StoreResult][]
  readonly stores: ReadonlyMap<string, Store>
  readonly result: StoreResult
  readonly effectiveConfig: ConditionSummaryConfig
  readonly displayMode: DisplayMode
  readonly onDisplayModeChange: (mode: DisplayMode) => void
  readonly settings: AppSettings
}

// ─── GP Rate Detail ─────────────────────────────────────

export function GpRateDetailTable({
  sortedStoreEntries,
  stores,
  result: r,
  effectiveConfig,
  displayMode,
  onDisplayModeChange,
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
            // amount mode
            const gpAmt = computeGpAmount(sr)
            const gpAfterAmt = computeGpAfterConsumableAmount(sr)
            const diffAmt = gpAfterAmt - sr.grossProfitBudget
            return (
              <BTr key={storeId}>
                <BTd>
                  <BSignalDot $color={sigColor} />
                  {storeName}
                </BTd>
                <BTd>{formatCurrency(sr.grossProfitBudget)}</BTd>
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
            const totalDiffAmt = totalAfterAmt - r.grossProfitBudget
            return (
              <BTr $highlight>
                <BTd $bold>合計</BTd>
                <BTd $bold>{formatCurrency(r.grossProfitBudget)}</BTd>
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
function aggregateCostInclusionItems(
  sr: StoreResult,
): { itemName: string; cost: number }[] {
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
            <BTh>構成比</BTh>
          </tr>
        </thead>
        <tbody>
          {sortedStoreEntries.flatMap(([storeId, sr]) => {
            const store = stores.get(storeId)
            const storeName = store?.name ?? storeId
            const isExpanded = expandedMarkupStore === storeId
            const sig = metricSignal(sr.costInclusionRate, 'costInclusion', effectiveConfig, sr.storeId)
            const sigColor = SIGNAL_COLORS[sig]
            const share = grandTotal > 0 ? sr.totalCostInclusion / grandTotal : 0

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
                <BTd>{formatCurrency(sr.totalCostInclusion)}</BTd>
                <BTd $color={sigColor}>{formatPercent(sr.costInclusionRate)}</BTd>
                <BTd>{formatPercent(share)}</BTd>
              </BTr>,
            ]

            if (isExpanded) {
              const storeItems = aggregateCostInclusionItems(sr)
              const storeTotal = sr.totalCostInclusion
              if (storeItems.length === 0) {
                rows.push(
                  <SubRow key={`${storeId}-empty`}>
                    <BTd colSpan={4} style={{ paddingLeft: '28px', fontSize: '0.7rem', color: '#999' }}>
                      品目データなし
                    </BTd>
                  </SubRow>,
                )
              } else {
                rows.push(
                  <SubRow key={`${storeId}-header`}>
                    <BTd style={{ paddingLeft: '28px', fontSize: '0.7rem', fontWeight: 600 }}>品目</BTd>
                    <BTd style={{ fontSize: '0.7rem', fontWeight: 600 }}>金額</BTd>
                    <BTd />
                    <BTd style={{ fontSize: '0.7rem', fontWeight: 600 }}>構成比</BTd>
                  </SubRow>,
                )
                for (const item of storeItems) {
                  const itemShare = storeTotal > 0 ? item.cost / storeTotal : 0
                  rows.push(
                    <SubRow key={`${storeId}-${item.itemName}`}>
                      <BTd style={{ paddingLeft: '28px' }}>{item.itemName}</BTd>
                      <BTd>{formatCurrency(item.cost)}</BTd>
                      <BTd />
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
            <BTd $bold>{formatPercent(1)}</BTd>
          </BTr>
          {/* Grand total item breakdown */}
          {totalItems.length > 0 && (
            <>
              <SubRow>
                <BTd style={{ paddingLeft: '12px', fontSize: '0.7rem', fontWeight: 600 }}>
                  全店 品目内訳
                </BTd>
                <BTd style={{ fontSize: '0.7rem', fontWeight: 600 }}>金額</BTd>
                <BTd />
                <BTd style={{ fontSize: '0.7rem', fontWeight: 600 }}>構成比</BTd>
              </SubRow>
              {totalItems.map((item) => {
                const itemShare = grandTotal > 0 ? item.cost / grandTotal : 0
                return (
                  <SubRow key={`total-${item.itemName}`}>
                    <BTd style={{ paddingLeft: '20px' }}>{item.itemName}</BTd>
                    <BTd>{formatCurrency(item.cost)}</BTd>
                    <BTd />
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
