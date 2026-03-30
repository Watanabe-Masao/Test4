/**
 * YoYドリルダウンオーバーレイ — ConditionSummaryEnhanced から抽出
 *
 * 客数前年比・客単価前年比・販売点数前年比・総仕入前年比・残予算必要達成率の
 * 店別詳細パネルを統一的に表示する。
 */
import type { WidgetContext, CurrentCtsQuantity } from './types'
import type { StoreResult, AppSettings } from '@/domain/models/storeTypes'
import type { ConditionSummaryConfig } from '@/domain/models/ConditionConfig'
import { formatPercent } from '@/domain/formatting'
import {
  CustomerYoYDetailTable,
  ItemsYoYDetailTable,
  TotalCostYoYDetailTable,
} from './conditionPanelYoY'
import { TxValueDetailTable } from './conditionPanelSalesDetail'
import { CustomerGapDetailTable } from './conditionPanelCustomerGap'
import type { DisplayMode } from './conditionSummaryUtils'
import {
  DrillOverlay,
  DrillPanel,
  DrillCloseBtn,
  DrillHeader,
  DrillTitle,
  DrillBody,
  Footer,
  FooterNote,
  LegendDot,
  LegendGroup,
  LegendItem,
  TotalSection,
  TotalGrid,
  TotalCell,
  SmallLabel,
  BigValue,
  AchValue,
} from './ConditionSummaryEnhanced.styles'
import { calculateRemainingBudgetRate } from '@/domain/calculations/remainingBudgetRate'
import type { RemainingBudgetRateInput } from '@/domain/calculations/remainingBudgetRate'

// ─── Constants ──────────────────────────────────────────

const YOY_DRILL_LABELS: Record<string, string> = {
  customerYoY: '客数前年比',
  txValue: '客単価前年比',
  itemsYoY: '販売点数前年比',
  totalCost: '総仕入前年比',
  requiredPace: '残予算必要達成率',
  qtyCustomerGap: '点数客数GAP',
  amtCustomerGap: '金額客数GAP',
}

const YOY_DRILL_FOOTER: Record<string, string> = {
  customerYoY: '前年同曜日比 • 単位：人',
  txValue: '客単価 = 売上 ÷ 客数 • 単位：円',
  itemsYoY: '前年同曜日比 • 単位：点',
  totalCost: '前年同月比 • 単位：円',
  requiredPace: '残予算必要達成率 = (予算 - 累計実績) ÷ 残期間予算',
  qtyCustomerGap: '点数客数GAP = 点数前年比 − 客数前年比',
  amtCustomerGap: '金額客数GAP = 金額前年比 − 客数前年比',
}

// ─── YoY Drill Overlay ──────────────────────────────────

export type YoYDrillType =
  | 'customerYoY'
  | 'txValue'
  | 'itemsYoY'
  | 'requiredPace'
  | 'totalCost'
  | 'qtyCustomerGap'
  | 'amtCustomerGap'

interface YoYDrillOverlayProps {
  readonly yoyDrill: YoYDrillType
  readonly ctx: WidgetContext
  readonly sortedStoreEntries: readonly [string, StoreResult][]
  readonly effectiveConfig: ConditionSummaryConfig
  readonly displayMode: DisplayMode
  readonly setDisplayMode: (m: DisplayMode) => void
  readonly settings: AppSettings
  readonly expandedStore: string | null
  readonly setExpandedStore: React.Dispatch<React.SetStateAction<string | null>>
  readonly currentCtsQuantity: CurrentCtsQuantity
  readonly effectiveDay: number
  readonly onClose: () => void
}

export function YoYDrillOverlay({
  yoyDrill,
  ctx,
  sortedStoreEntries,
  effectiveConfig,
  displayMode,
  setDisplayMode,
  settings,
  expandedStore,
  setExpandedStore,
  currentCtsQuantity,
  effectiveDay,
  onClose,
}: YoYDrillOverlayProps) {
  return (
    <DrillOverlay onClick={onClose}>
      <DrillPanel onClick={(e) => e.stopPropagation()}>
        <DrillHeader>
          <DrillTitle>{YOY_DRILL_LABELS[yoyDrill]} 店別詳細</DrillTitle>
          <DrillCloseBtn onClick={onClose} aria-label="閉じる">
            ✕
          </DrillCloseBtn>
        </DrillHeader>
        <DrillBody>
          {yoyDrill === 'customerYoY' && (
            <CustomerYoYDetailTable
              sortedStoreEntries={sortedStoreEntries}
              stores={ctx.stores}
              result={ctx.result}
              effectiveConfig={effectiveConfig}
              displayMode={displayMode}
              onDisplayModeChange={setDisplayMode}
              settings={settings}
              prevYear={ctx.prevYear}
              prevYearMonthlyKpi={ctx.prevYearMonthlyKpi}
              dataMaxDay={ctx.dataMaxDay}
            />
          )}
          {yoyDrill === 'txValue' && (
            <TxValueDetailTable
              sortedStoreEntries={sortedStoreEntries}
              stores={ctx.stores}
              result={ctx.result}
              effectiveConfig={effectiveConfig}
              displayMode={displayMode}
              onDisplayModeChange={setDisplayMode}
              settings={settings}
              expandedStore={expandedStore}
              onExpandToggle={(id) => setExpandedStore((prev) => (prev === id ? null : id))}
            />
          )}
          {yoyDrill === 'itemsYoY' && (
            <ItemsYoYDetailTable
              sortedStoreEntries={sortedStoreEntries}
              stores={ctx.stores}
              effectiveConfig={effectiveConfig}
              currentCtsQuantity={currentCtsQuantity}
              effectiveDay={effectiveDay}
              prevYearMonthlyKpi={ctx.prevYearMonthlyKpi}
            />
          )}
          {yoyDrill === 'totalCost' && (
            <TotalCostYoYDetailTable
              sortedStoreEntries={sortedStoreEntries}
              stores={ctx.stores}
              effectiveConfig={effectiveConfig}
              prevYearStoreCostPrice={ctx.prevYearStoreCostPrice}
              fmtCurrency={ctx.fmtCurrency}
            />
          )}
          {(yoyDrill === 'qtyCustomerGap' || yoyDrill === 'amtCustomerGap') && (
            <CustomerGapDetailTable
              gapType={yoyDrill === 'qtyCustomerGap' ? 'quantity' : 'amount'}
              sortedStoreEntries={sortedStoreEntries}
              stores={ctx.stores}
              result={ctx.result}
              prevYear={ctx.prevYear}
              currentCtsQuantity={currentCtsQuantity}
              prevYearMonthlyKpi={ctx.prevYearMonthlyKpi}
              effectiveDay={effectiveDay}
            />
          )}
          {yoyDrill === 'requiredPace' && (
            <RequiredPaceContent
              ctx={ctx}
              sortedStoreEntries={sortedStoreEntries}
              elapsedDays={effectiveDay}
              daysInMonth={new Date(ctx.year, ctx.month, 0).getDate()}
            />
          )}
        </DrillBody>
        <Footer>
          <FooterNote>{YOY_DRILL_FOOTER[yoyDrill]}</FooterNote>
          <LegendGroup>
            {[
              { color: '#10b981', label: '達成' },
              { color: '#eab308', label: '微未達' },
              { color: '#ef4444', label: '未達' },
            ].map((item) => (
              <LegendItem key={item.label}>
                <LegendDot $color={item.color} />
                {item.label}
              </LegendItem>
            ))}
          </LegendGroup>
        </Footer>
      </DrillPanel>
    </DrillOverlay>
  )
}

// ─── Required Pace Content ──────────────────────────────

function RequiredPaceContent({
  ctx,
  sortedStoreEntries,
  elapsedDays,
  daysInMonth,
}: {
  readonly ctx: WidgetContext
  readonly sortedStoreEntries: readonly [string, StoreResult][]
  readonly elapsedDays: number
  readonly daysInMonth: number
}) {
  const rateInput: RemainingBudgetRateInput = {
    budget: ctx.result.budget,
    totalSales: ctx.result.totalSales,
    budgetDaily: ctx.result.budgetDaily,
    elapsedDays,
    daysInMonth,
  }
  const rate = calculateRemainingBudgetRate(rateInput)
  const rateColor = rate <= 100 ? '#10b981' : rate <= 105 ? '#eab308' : '#ef4444'
  const remaining = ctx.result.budget - ctx.result.totalSales
  // 残期間予算
  let remainingBudget = 0
  for (let d = elapsedDays + 1; d <= daysInMonth; d++) {
    remainingBudget += ctx.result.budgetDaily.get(d) ?? 0
  }

  return (
    <>
      <TotalSection>
        <TotalGrid>
          <TotalCell>
            <SmallLabel>残予算額</SmallLabel>
            <BigValue>{ctx.fmtCurrency(remaining)}</BigValue>
          </TotalCell>
          <TotalCell $align="center">
            <SmallLabel>残期間予算</SmallLabel>
            <BigValue>{ctx.fmtCurrency(remainingBudget)}</BigValue>
          </TotalCell>
          <TotalCell $align="right">
            <SmallLabel>必要達成率</SmallLabel>
            <AchValue $color={rateColor}>{formatPercent(rate / 100)}</AchValue>
          </TotalCell>
        </TotalGrid>
      </TotalSection>

      {sortedStoreEntries.length > 1 && (
        <div style={{ padding: '8px 16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: 'left',
                    padding: '4px 8px',
                    borderBottom: '2px solid #e5e7eb',
                  }}
                >
                  店舗名
                </th>
                <th
                  style={{
                    textAlign: 'right',
                    padding: '4px 8px',
                    borderBottom: '2px solid #e5e7eb',
                  }}
                >
                  残予算額
                </th>
                <th
                  style={{
                    textAlign: 'right',
                    padding: '4px 8px',
                    borderBottom: '2px solid #e5e7eb',
                  }}
                >
                  残期間予算
                </th>
                <th
                  style={{
                    textAlign: 'right',
                    padding: '4px 8px',
                    borderBottom: '2px solid #e5e7eb',
                  }}
                >
                  必要達成率
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedStoreEntries.map(([storeId, sr]) => {
                const storeName = ctx.stores.get(storeId)?.name ?? storeId
                const storeRate = calculateRemainingBudgetRate({
                  budget: sr.budget,
                  totalSales: sr.totalSales,
                  budgetDaily: sr.budgetDaily,
                  elapsedDays,
                  daysInMonth,
                })
                const color =
                  storeRate <= 100 ? '#10b981' : storeRate <= 105 ? '#eab308' : '#ef4444'
                const storeRemaining = sr.budget - sr.totalSales
                let storeRemainingBudget = 0
                for (let d = elapsedDays + 1; d <= daysInMonth; d++) {
                  storeRemainingBudget += sr.budgetDaily.get(d) ?? 0
                }
                return (
                  <tr key={storeId} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '4px 8px' }}>{storeName}</td>
                    <td style={{ textAlign: 'right', padding: '4px 8px', fontFamily: 'monospace' }}>
                      {ctx.fmtCurrency(storeRemaining)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '4px 8px', fontFamily: 'monospace' }}>
                      {ctx.fmtCurrency(storeRemainingBudget)}
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        padding: '4px 8px',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        color,
                      }}
                    >
                      {storeRemainingBudget > 0 ? formatPercent(storeRate / 100) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
