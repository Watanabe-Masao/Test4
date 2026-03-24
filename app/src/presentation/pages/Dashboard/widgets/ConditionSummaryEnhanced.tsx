/**
 * コンディションサマリー（統一版）
 *
 * 予算達成メトリクス（売上・粗利額・粗利率・値入率・売変率）と
 * 前年比メトリクス（客数・販売点数・客単価・必要ベース比）を
 * 統一カードレジストリで管理。カードの並び替えは CONDITION_CARD_ORDER の変更で即反映。
 */
import { useState, useMemo, memo, useCallback } from 'react'
import type { WidgetContext } from './types'
import {
  type MetricKey,
  type ConditionCardId,
  buildCardSummaries,
  buildBudgetHeader,
  buildYoYCards,
  buildUnifiedCards,
  computeTrend,
} from './ConditionSummaryEnhanced.vm'
import { formatPercent } from '@/domain/formatting'
import type { StoreResult, AppSettings } from '@/domain/models/storeTypes'
import type { ConditionSummaryConfig } from '@/domain/models/ConditionConfig'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { useDataStore } from '@/application/stores/dataStore'
import { ConditionCardShell } from './ConditionCardShell'
import { ConditionSummaryBudgetDrill } from './ConditionSummaryBudgetDrill'
import { ConditionSettingsPanelWidget } from './ConditionSettingsPanel'
import { CustomerYoYDetailTable } from './conditionPanelYoY'
import { TxValueDetailTable } from './conditionPanelSalesDetail'
import { safeDivide } from '@/domain/calculations/utils'
import type { DisplayMode } from './conditionSummaryUtils'
import {
  DashWrapper,
  Header,
  HeaderMeta,
  HeaderTitle,
  CardGridRow,
  BudgetHeaderRow,
  BudgetHeaderItem,
  BudgetHeaderLabel,
  BudgetHeaderValue,
  BudgetGrowthBadge,
  CardGroupLabel,
  SettingsGear,
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

// ─── Card click handler type map ────────────────────────

const BUDGET_METRIC_IDS: ReadonlySet<string> = new Set([
  'sales',
  'gp',
  'gpRate',
  'markupRate',
  'discountRate',
])
const YOY_DRILL_IDS: ReadonlySet<string> = new Set([
  'customerYoY',
  'txValue',
  'itemsYoY',
  'requiredPace',
])

// ─── Component ──────────────────────────────────────────

export const ConditionSummaryEnhanced = memo(function ConditionSummaryEnhanced({
  ctx,
}: {
  readonly ctx: WidgetContext
}) {
  const [activeMetric, setActiveMetric] = useState<MetricKey | null>(null)
  const [yoyDrill, setYoYDrill] = useState<
    'customerYoY' | 'txValue' | 'itemsYoY' | 'requiredPace' | null
  >(null)
  const [showSettings, setShowSettings] = useState(false)
  const [displayMode, setDisplayMode] = useState<DisplayMode>('rate')
  const [expandedStore, setExpandedStore] = useState<string | null>(null)

  const { elapsedDays } = ctx
  // ctx.daysInMonth は effectiveEndDay（elapsedDays でキャップ済み）のため、
  // 予算按分には暦上の月日数を使用する
  const calendarDaysInMonth = new Date(ctx.year, ctx.month, 0).getDate()
  const prevYearMode =
    ctx.comparisonScope?.alignmentMode === 'sameDayOfWeek' ? 'sameDow' : 'sameDate'

  const settings = useSettingsStore((s) => s.settings)

  // 旧設定との後方互換
  const effectiveConfig = useMemo<ConditionSummaryConfig>(() => {
    const base = settings.conditionConfig ?? { global: {}, storeOverrides: {} }
    const hasLegacyGp = base.global.gpRate?.thresholds == null
    const hasLegacyDiscount = base.global.discountRate?.thresholds == null
    if (!hasLegacyGp && !hasLegacyDiscount) return base
    const migrated = { ...base, global: { ...base.global } }
    if (hasLegacyGp) {
      migrated.global = {
        ...migrated.global,
        gpRate: {
          ...migrated.global.gpRate,
          thresholds: {
            blue: settings.gpDiffBlueThreshold,
            yellow: settings.gpDiffYellowThreshold,
            red: settings.gpDiffRedThreshold,
          },
        },
      }
    }
    if (hasLegacyDiscount) {
      migrated.global = {
        ...migrated.global,
        discountRate: {
          ...migrated.global.discountRate,
          thresholds: {
            blue: settings.discountBlueThreshold,
            yellow: settings.discountYellowThreshold,
            red: settings.discountRedThreshold,
          },
        },
      }
    }
    return migrated
  }, [settings])

  // CTS data for items YoY
  const ctsRecords = useDataStore((s) => s.data.categoryTimeSales.records)
  const prevCtsRecords = useDataStore((s) => s.data.prevYearCategoryTimeSales.records)

  // Budget header
  const budgetHeader = useMemo(
    () =>
      buildBudgetHeader(
        ctx.result,
        ctx.prevYearMonthlyKpi,
        ctx.dowGap,
        prevYearMode === 'sameDow' ? 'sameDow' : 'sameDate',
      ),
    [ctx.result, ctx.prevYearMonthlyKpi, ctx.dowGap, prevYearMode],
  )

  const hasMultipleStores = ctx.allStoreResults.size > 1

  // Unified card array (order controlled by CONDITION_CARD_ORDER)
  const allCards = useMemo(() => {
    const budgetCards = buildCardSummaries(
      ctx.result,
      elapsedDays,
      calendarDaysInMonth,
      ctx.fmtCurrency,
    )
    // CTS レコードを経過日数でスコープ（販売点数前年比の整合性確保）
    const effectiveDay = elapsedDays ?? calendarDaysInMonth
    const scopedCurQty = ctsRecords
      .filter((rec) => rec.day <= effectiveDay)
      .reduce((sum, rec) => sum + rec.totalQuantity, 0)
    const scopedPrevQty = prevCtsRecords
      .filter((rec) => rec.day <= effectiveDay)
      .reduce((sum, rec) => sum + rec.totalQuantity, 0)
    const yoyCards = buildYoYCards({
      result: ctx.result,
      prevYear: ctx.prevYear,
      config: effectiveConfig,
      ctsCurrentQty: scopedCurQty,
      ctsPrevQty: scopedPrevQty,
      fmtCurrency: ctx.fmtCurrency,
    })
    // Trend computation (last 7 days vs previous 7 days)
    const trends = new Map<string, { direction: 'up' | 'down' | 'flat'; ratio: string }>()
    const salesTrend = computeTrend(ctx.result.daily, effectiveDay, (r) => r.sales)
    if (salesTrend) trends.set('sales', salesTrend)
    const custTrend = computeTrend(ctx.result.daily, effectiveDay, (r) => r.customers ?? 0)
    if (custTrend) trends.set('customerYoY', custTrend)
    const costTrend = computeTrend(ctx.result.daily, effectiveDay, (r) => r.totalCost)
    if (costTrend) trends.set('totalCost', costTrend)

    return buildUnifiedCards(budgetCards, yoyCards, hasMultipleStores, trends)
  }, [
    ctx.result,
    elapsedDays,
    calendarDaysInMonth,
    ctx.fmtCurrency,
    ctx.prevYear,
    effectiveConfig,
    ctsRecords,
    prevCtsRecords,
    hasMultipleStores,
  ])

  // Group cards by section for display
  const budgetGroup = useMemo(() => allCards.filter((c) => c.group === 'budget'), [allCards])
  const yoyGroup = useMemo(() => allCards.filter((c) => c.group === 'yoy'), [allCards])

  // Card click dispatch
  const handleCardClick = useCallback((id: ConditionCardId) => {
    if (BUDGET_METRIC_IDS.has(id)) {
      setActiveMetric(id as MetricKey)
    } else if (YOY_DRILL_IDS.has(id)) {
      setYoYDrill(id as 'customerYoY' | 'txValue' | 'itemsYoY' | 'requiredPace')
    }
  }, [])

  const handleBudgetClose = useCallback(() => setActiveMetric(null), [])

  const sortedStoreEntries = useMemo(
    () =>
      [...ctx.allStoreResults.entries()].sort(([, a], [, b]) => {
        const sa = ctx.stores.get(a.storeId)
        const sb = ctx.stores.get(b.storeId)
        return (sa?.code ?? a.storeId).localeCompare(sb?.code ?? b.storeId)
      }),
    [ctx.allStoreResults, ctx.stores],
  )

  return (
    <DashWrapper>
      {/* Header */}
      <Header>
        <div>
          <HeaderMeta>CONDITION SUMMARY</HeaderMeta>
          <HeaderTitle>コンディションサマリー</HeaderTitle>
        </div>
        <SettingsGear onClick={() => setShowSettings((p) => !p)} title="閾値設定">
          ⚙
        </SettingsGear>
      </Header>

      {showSettings && <ConditionSettingsPanelWidget stores={ctx.stores} />}

      {/* Budget context row */}
      <BudgetHeaderRow>
        <BudgetHeaderItem
          onClick={() => setActiveMetric('sales')}
          style={{ cursor: 'pointer' }}
          role="button"
          tabIndex={0}
        >
          <BudgetHeaderLabel>月間売上予算</BudgetHeaderLabel>
          <BudgetHeaderValue>{ctx.fmtCurrency(budgetHeader.monthlyBudget)}</BudgetHeaderValue>
        </BudgetHeaderItem>
        <BudgetHeaderItem
          onClick={() => setActiveMetric('gp')}
          style={{ cursor: 'pointer' }}
          role="button"
          tabIndex={0}
        >
          <BudgetHeaderLabel>月間粗利額予算</BudgetHeaderLabel>
          <BudgetHeaderValue>{ctx.fmtCurrency(budgetHeader.grossProfitBudget)}</BudgetHeaderValue>
        </BudgetHeaderItem>
        <BudgetHeaderItem
          onClick={() => setActiveMetric('gpRate')}
          style={{ cursor: 'pointer' }}
          role="button"
          tabIndex={0}
        >
          <BudgetHeaderLabel>月間粗利率予算</BudgetHeaderLabel>
          <BudgetHeaderValue>{formatPercent(budgetHeader.grossProfitRateBudget)}</BudgetHeaderValue>
        </BudgetHeaderItem>
        {budgetHeader.prevYearMonthlySales != null && (
          <BudgetHeaderItem>
            <BudgetHeaderLabel>月間前年売上</BudgetHeaderLabel>
            <BudgetHeaderValue>
              {ctx.fmtCurrency(budgetHeader.prevYearMonthlySales)}
            </BudgetHeaderValue>
          </BudgetHeaderItem>
        )}
        {budgetHeader.budgetVsPrevYear != null && (
          <BudgetHeaderItem>
            <BudgetHeaderLabel>予算前年比</BudgetHeaderLabel>
            <BudgetGrowthBadge $positive={budgetHeader.budgetVsPrevYear >= 1}>
              {formatPercent(budgetHeader.budgetVsPrevYear)}
            </BudgetGrowthBadge>
          </BudgetHeaderItem>
        )}
        {prevYearMode === 'sameDate' && budgetHeader.dowGap && (
          <>
            <BudgetHeaderItem
              onClick={() => ctx.onPrevYearDetail('sameDate')}
              style={{ cursor: 'pointer' }}
              role="button"
              tabIndex={0}
            >
              <BudgetHeaderLabel>曜日GAP({budgetHeader.dowGap.label})</BudgetHeaderLabel>
              <BudgetHeaderValue>
                {ctx.fmtCurrency(budgetHeader.dowGap.avgImpact)}
              </BudgetHeaderValue>
            </BudgetHeaderItem>
            {budgetHeader.dowGap.actualImpact != null && (
              <BudgetHeaderItem
                onClick={() => ctx.onPrevYearDetail('sameDate')}
                style={{ cursor: 'pointer' }}
                role="button"
                tabIndex={0}
              >
                <BudgetHeaderLabel>曜日GAP(実日)</BudgetHeaderLabel>
                <BudgetHeaderValue>
                  {ctx.fmtCurrency(budgetHeader.dowGap.actualImpact)}
                </BudgetHeaderValue>
              </BudgetHeaderItem>
            )}
          </>
        )}
        {prevYearMode === 'sameDow' && budgetHeader.dowGap?.actualImpact != null && (
          <BudgetHeaderItem
            onClick={() => ctx.onPrevYearDetail('sameDow')}
            style={{ cursor: 'pointer' }}
            role="button"
            tabIndex={0}
          >
            <BudgetHeaderLabel>境界日GAP</BudgetHeaderLabel>
            <BudgetHeaderValue>
              {ctx.fmtCurrency(budgetHeader.dowGap.actualImpact)}
            </BudgetHeaderValue>
          </BudgetHeaderItem>
        )}
      </BudgetHeaderRow>

      {/* Budget metric cards */}
      {budgetGroup.length > 0 && (
        <>
          <CardGroupLabel>予算達成</CardGroupLabel>
          <CardGridRow>
            {budgetGroup.map((card) => (
              <ConditionCardShell
                key={card.id}
                card={card}
                onClick={() => handleCardClick(card.id)}
              />
            ))}
          </CardGridRow>
        </>
      )}

      {/* YoY / Pace metric cards */}
      {yoyGroup.length > 0 && (
        <>
          <CardGroupLabel>前年比較</CardGroupLabel>
          <CardGridRow>
            {yoyGroup.map((card) => (
              <ConditionCardShell
                key={card.id}
                card={card}
                onClick={() => handleCardClick(card.id)}
              />
            ))}
          </CardGridRow>
        </>
      )}

      {/* Budget drill-down overlay */}
      {activeMetric && (
        <ConditionSummaryBudgetDrill
          ctx={ctx}
          activeMetric={activeMetric}
          onClose={handleBudgetClose}
        />
      )}

      {/* YoY drill-down overlay */}
      {yoyDrill && (
        <YoYDrillOverlay
          yoyDrill={yoyDrill}
          ctx={ctx}
          sortedStoreEntries={sortedStoreEntries}
          effectiveConfig={effectiveConfig}
          displayMode={displayMode}
          setDisplayMode={setDisplayMode}
          settings={settings}
          expandedStore={expandedStore}
          setExpandedStore={setExpandedStore}
          ctsCurrentQty={ctsRecords
            .filter((r) => r.day <= (elapsedDays ?? calendarDaysInMonth))
            .reduce((s, r) => s + r.totalQuantity, 0)}
          ctsPrevQty={prevCtsRecords
            .filter((r) => r.day <= (elapsedDays ?? calendarDaysInMonth))
            .reduce((s, r) => s + r.totalQuantity, 0)}
          onClose={() => {
            setYoYDrill(null)
            setExpandedStore(null)
          }}
        />
      )}
    </DashWrapper>
  )
})

// ─── YoY Drill Overlay (sub-component) ──────────────────

const YOY_DRILL_LABELS: Record<string, string> = {
  customerYoY: '客数前年比',
  txValue: '客単価前年比',
  itemsYoY: '販売点数前年比',
  requiredPace: '必要ベース比',
}

const YOY_DRILL_FOOTER: Record<string, string> = {
  customerYoY: '前年同曜日比 • 単位：人',
  txValue: '客単価 = 売上 ÷ 客数 • 単位：円',
  itemsYoY: '前年同曜日比 • 単位：点',
  requiredPace: '必要日販 = (予算 - 累計実績) ÷ 残日数',
}

function YoYDrillOverlay({
  yoyDrill,
  ctx,
  sortedStoreEntries,
  effectiveConfig,
  displayMode,
  setDisplayMode,
  settings,
  expandedStore,
  setExpandedStore,
  ctsCurrentQty,
  ctsPrevQty,
  onClose,
}: {
  readonly yoyDrill: 'customerYoY' | 'txValue' | 'itemsYoY' | 'requiredPace'
  readonly ctx: WidgetContext
  readonly sortedStoreEntries: readonly [string, StoreResult][]
  readonly effectiveConfig: ConditionSummaryConfig
  readonly displayMode: DisplayMode
  readonly setDisplayMode: (m: DisplayMode) => void
  readonly settings: AppSettings
  readonly expandedStore: string | null
  readonly setExpandedStore: React.Dispatch<React.SetStateAction<string | null>>
  readonly ctsCurrentQty: number
  readonly ctsPrevQty: number
  readonly onClose: () => void
}) {
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
              expandedStore={expandedStore}
              onExpandToggle={(id) => setExpandedStore((prev) => (prev === id ? null : id))}
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
            <ItemsYoYContent ctsCurrentQty={ctsCurrentQty} ctsPrevQty={ctsPrevQty} />
          )}
          {yoyDrill === 'requiredPace' && (
            <RequiredPaceContent ctx={ctx} sortedStoreEntries={sortedStoreEntries} />
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

// ─── Items YoY Content ──────────────────────────────────

function ItemsYoYContent({
  ctsCurrentQty,
  ctsPrevQty,
}: {
  readonly ctsCurrentQty: number
  readonly ctsPrevQty: number
}) {
  const yoy = ctsPrevQty > 0 ? ctsCurrentQty / ctsPrevQty : 0
  const yoyColor = yoy >= 1 ? '#10b981' : yoy >= 0.97 ? '#eab308' : '#ef4444'
  return (
    <TotalSection>
      <TotalGrid>
        <TotalCell>
          <SmallLabel>当年点数</SmallLabel>
          <BigValue>{ctsCurrentQty.toLocaleString()}点</BigValue>
        </TotalCell>
        <TotalCell $align="center">
          <SmallLabel>前年点数</SmallLabel>
          <BigValue>{ctsPrevQty > 0 ? `${ctsPrevQty.toLocaleString()}点` : '—'}</BigValue>
        </TotalCell>
        <TotalCell $align="right">
          <SmallLabel>前年比</SmallLabel>
          <AchValue $color={yoyColor}>{ctsPrevQty > 0 ? formatPercent(yoy) : '—'}</AchValue>
        </TotalCell>
      </TotalGrid>
    </TotalSection>
  )
}

// ─── Required Pace Content ──────────────────────────────

function RequiredPaceContent({
  ctx,
  sortedStoreEntries,
}: {
  readonly ctx: WidgetContext
  readonly sortedStoreEntries: readonly [string, StoreResult][]
}) {
  const paceRatio = safeDivide(ctx.result.requiredDailySales, ctx.result.averageDailySales, 0)
  const paceColor = paceRatio <= 1 ? '#10b981' : paceRatio <= 1.05 ? '#eab308' : '#ef4444'

  return (
    <>
      <TotalSection>
        <TotalGrid>
          <TotalCell>
            <SmallLabel>実績日販</SmallLabel>
            <BigValue>{ctx.fmtCurrency(ctx.result.averageDailySales)}</BigValue>
          </TotalCell>
          <TotalCell $align="center">
            <SmallLabel>必要日販</SmallLabel>
            <BigValue>{ctx.fmtCurrency(ctx.result.requiredDailySales)}</BigValue>
          </TotalCell>
          <TotalCell $align="right">
            <SmallLabel>必要ベース比</SmallLabel>
            <AchValue $color={paceColor}>{formatPercent(paceRatio)}</AchValue>
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
                  実績日販
                </th>
                <th
                  style={{
                    textAlign: 'right',
                    padding: '4px 8px',
                    borderBottom: '2px solid #e5e7eb',
                  }}
                >
                  必要日販
                </th>
                <th
                  style={{
                    textAlign: 'right',
                    padding: '4px 8px',
                    borderBottom: '2px solid #e5e7eb',
                  }}
                >
                  ベース比
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedStoreEntries.map(([storeId, sr]) => {
                const storeName = ctx.stores.get(storeId)?.name ?? storeId
                const storeRatio = safeDivide(sr.requiredDailySales, sr.averageDailySales, 0)
                const color =
                  storeRatio <= 1 ? '#10b981' : storeRatio <= 1.05 ? '#eab308' : '#ef4444'
                return (
                  <tr key={storeId} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '4px 8px' }}>{storeName}</td>
                    <td style={{ textAlign: 'right', padding: '4px 8px', fontFamily: 'monospace' }}>
                      {ctx.fmtCurrency(sr.averageDailySales)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '4px 8px', fontFamily: 'monospace' }}>
                      {ctx.fmtCurrency(sr.requiredDailySales)}
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
                      {sr.averageDailySales > 0 ? formatPercent(storeRatio) : '—'}
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
