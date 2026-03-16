/**
 * コンディションサマリー（統一版）
 *
 * 予算達成メトリクス（売上・粗利額・粗利率・値入率・売変率）と
 * 前年比メトリクス（客数・販売点数・客単価・必要ベース比）を
 * 1つのウィジェットに統合。コンディションマトリクスも包含する。
 */
import { useState, useMemo, memo, useCallback } from 'react'
import type { WidgetContext } from './types'
import {
  type MetricKey,
  type YoYCardKey,
  buildCardSummaries,
  buildBudgetHeader,
  buildYoYCards,
} from './ConditionSummaryEnhanced.vm'
import { formatPercent } from '@/domain/formatting'
import type { ConditionSummaryConfig } from '@/domain/models/ConditionConfig'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { useDataStore } from '@/application/stores/dataStore'
import { ConditionSummaryBudgetDrill } from './ConditionSummaryBudgetDrill'
import { ConditionMatrixTable } from './ConditionMatrixTable'
import { ConditionSettingsPanelWidget } from './ConditionSettingsPanel'
import { CustomerYoYDetailTable } from './conditionPanelYoY'
import { TxValueDetailTable } from './conditionPanelSalesDetail'
import type { DisplayMode } from './conditionSummaryUtils'
import {
  DashWrapper,
  Header,
  HeaderMeta,
  HeaderTitle,
  CardGridRow,
  CondCard,
  CondSignal,
  CondCardContent,
  CondCardLabel,
  CondCardValue,
  CondCardSub,
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
} from './ConditionSummaryEnhanced.styles'

// ─── Component ──────────────────────────────────────────

export const ConditionSummaryEnhanced = memo(function ConditionSummaryEnhanced({
  ctx,
}: {
  readonly ctx: WidgetContext
}) {
  const [activeMetric, setActiveMetric] = useState<MetricKey | null>(null)
  const [yoyDrill, setYoYDrill] = useState<'customerYoY' | 'txValue' | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [displayMode, setDisplayMode] = useState<DisplayMode>('rate')
  const [expandedStore, setExpandedStore] = useState<string | null>(null)

  const { daysInMonth, elapsedDays } = ctx
  const prevYearMode = ctx.comparisonFrame.policy === 'sameDayOfWeek' ? 'sameDow' : 'sameDate'

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
    () => buildBudgetHeader(ctx.result, ctx.prevYearMonthlyKpi, ctx.dowGap),
    [ctx.result, ctx.prevYearMonthlyKpi, ctx.dowGap],
  )

  // Budget metric cards
  const budgetCards = useMemo(
    () => buildCardSummaries(ctx.result, elapsedDays, daysInMonth, ctx.fmtCurrency),
    [ctx.result, elapsedDays, daysInMonth, ctx.fmtCurrency],
  )

  // YoY/pace metric cards
  const yoyCards = useMemo(
    () =>
      buildYoYCards({
        result: ctx.result,
        prevYear: ctx.prevYear,
        config: effectiveConfig,
        ctsCurrentQty: ctsRecords.reduce((sum, rec) => sum + rec.totalQuantity, 0),
        ctsPrevQty: prevCtsRecords.reduce((sum, rec) => sum + rec.totalQuantity, 0),
        fmtCurrency: ctx.fmtCurrency,
      }),
    [ctx.result, ctx.prevYear, effectiveConfig, ctsRecords, prevCtsRecords, ctx.fmtCurrency],
  )

  const hasMultipleStores = ctx.allStoreResults.size > 1

  const handleBudgetClose = useCallback(() => setActiveMetric(null), [])

  const handleYoYCardClick = useCallback(
    (key: YoYCardKey) => {
      if (!hasMultipleStores) return
      if (key === 'customerYoY' || key === 'txValue') {
        setYoYDrill(key)
      }
    },
    [hasMultipleStores],
  )

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
      </BudgetHeaderRow>

      {/* Budget metric cards */}
      <CardGroupLabel>予算達成</CardGroupLabel>
      <CardGridRow>
        {budgetCards.map((card) => (
          <CondCard
            key={card.key}
            $borderColor={card.signalColor}
            onClick={() => setActiveMetric(card.key)}
          >
            <CondSignal $color={card.signalColor} />
            <CondCardContent>
              <CondCardLabel>{card.label}</CondCardLabel>
              <CondCardValue $color={card.signalColor}>{card.value}</CondCardValue>
              <CondCardSub>{card.sub}</CondCardSub>
            </CondCardContent>
          </CondCard>
        ))}
      </CardGridRow>

      {/* YoY / Pace metric cards */}
      {yoyCards.length > 0 && (
        <>
          <CardGroupLabel>前年比較</CardGroupLabel>
          <CardGridRow>
            {yoyCards.map((card) => {
              const isClickable = hasMultipleStores && card.detailBreakdown != null
              return (
                <CondCard
                  key={card.key}
                  $borderColor={card.signalColor}
                  $clickable={isClickable}
                  onClick={isClickable ? () => handleYoYCardClick(card.key) : undefined}
                >
                  <CondSignal $color={card.signalColor} />
                  <CondCardContent>
                    <CondCardLabel>{card.label}</CondCardLabel>
                    <CondCardValue $color={card.signalColor}>{card.value}</CondCardValue>
                    <CondCardSub>{card.sub}</CondCardSub>
                  </CondCardContent>
                </CondCard>
              )
            })}
          </CardGridRow>
        </>
      )}

      {/* Condition Matrix (DuckDB) */}
      <ConditionMatrixTable ctx={ctx} />

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
        <DrillOverlay
          onClick={() => {
            setYoYDrill(null)
            setExpandedStore(null)
          }}
        >
          <DrillPanel onClick={(e) => e.stopPropagation()}>
            <DrillHeader>
              <DrillTitle>
                {yoyDrill === 'customerYoY' ? '客数前年比' : '客単価前年比'} 店別詳細
              </DrillTitle>
              <DrillCloseBtn
                onClick={() => {
                  setYoYDrill(null)
                  setExpandedStore(null)
                }}
                aria-label="閉じる"
              >
                ✕
              </DrillCloseBtn>
            </DrillHeader>
            <DrillBody>
              {yoyDrill === 'customerYoY' ? (
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
              ) : (
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
            </DrillBody>
          </DrillPanel>
        </DrillOverlay>
      )}
    </DashWrapper>
  )
})
