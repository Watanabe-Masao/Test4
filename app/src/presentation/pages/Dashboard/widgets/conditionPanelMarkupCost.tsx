/**
 * 値入率・原価算入費の詳細パネル
 *
 * ConditionDetailPanels.tsx から分割 (Group 2: Markup & Cost)
 */
import type { StoreResult } from '@/domain/models'
import { formatPercent, formatCurrency } from '@/domain/formatting'
import { CATEGORY_ORDER } from '@/domain/constants/categories'
import { resolveThresholds, evaluateSignal } from '@/domain/calculations/rules/conditionResolver'
import {
  type SignalLevel,
  SIGNAL_COLORS,
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
  StoreBorderTr,
} from './ConditionSummary.styles'
import type { MarkupDetailProps, CostInclusionDetailProps } from './conditionDetailTypes'

// ─── Helpers ────────────────────────────────────────────

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

// ─── Markup Rate Detail ─────────────────────────────────

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
