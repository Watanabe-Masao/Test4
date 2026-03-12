/**
 * 粗利率・売変率の詳細パネル
 *
 * ConditionDetailPanels.tsx から分割 (Group 1: Profitability)
 */
import type { StoreResult } from '@/domain/models'
import { DISCOUNT_TYPES } from '@/domain/models'
import { formatPercent, formatCurrency, formatPointDiff } from '@/domain/formatting'
import { safeDivide } from '@/domain/calculations/utils'
import { resolveThresholds, evaluateSignal } from '@/domain/calculations/rules/conditionResolver'
import {
  type SignalLevel,
  SIGNAL_COLORS,
  computeGpBeforeConsumable,
  computeGpAfterConsumable,
  computeGpAmount,
  computeGpAfterConsumableAmount,
  metricSignal,
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
} from './ConditionSummary.styles'
import type { DetailPanelProps } from './conditionDetailTypes'

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
