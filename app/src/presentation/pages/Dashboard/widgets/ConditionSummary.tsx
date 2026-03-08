import { useState, useCallback, useMemo, memo } from 'react'
import { formatPercent, formatCurrency, safeDivide } from '@/domain/calculations/utils'
import type { MetricId } from '@/domain/models'
import type { ConditionSummaryConfig } from '@/domain/models/ConditionConfig'
import {
  resolveThresholds,
  evaluateSignal,
  isMetricEnabled,
} from '@/domain/calculations/conditionResolver'
import { useSettingsStore } from '@/application/stores/settingsStore'
import type { WidgetContext } from './types'
import { ConditionMatrixTable } from './ConditionMatrixTable'
import {
  type SignalLevel,
  type ConditionItem,
  type DisplayMode,
  SIGNAL_COLORS,
  metricSignal,
  computeGpBeforeConsumable,
  computeGpAfterConsumable,
  computeGpAfterConsumableAmount,
} from './conditionSummaryUtils'
import {
  Wrapper,
  TitleRow,
  Title,
  SettingsChip,
  Grid,
  Card,
  Signal,
  CardContent,
  CardLabel,
  CardValue,
  CardSub,
  ChipRow,
  EvidenceChip,
  Overlay,
  DetailPanel,
  CloseBtn,
} from './ConditionSummary.styles'
import { ConditionSettingsPanelWidget } from './ConditionSettingsPanel'
import {
  GpRateDetailTable,
  DiscountRateDetailTable,
  MarkupRateDetailTable,
  CostInclusionDetailTable,
  SalesYoYDetailTable,
  CustomerYoYDetailTable,
  TxValueDetailTable,
  DailySalesDetailTable,
  SimpleBreakdown,
} from './ConditionDetailPanels'

// ─── Component ──────────────────────────────────────────

export const ConditionSummaryWidget = memo(function ConditionSummaryWidget({
  ctx,
}: {
  ctx: WidgetContext
}) {
  const r = ctx.result
  const { onExplain, allStoreResults, stores } = ctx
  const settings = useSettingsStore((s) => s.settings)

  const [breakdownItem, setBreakdownItem] = useState<ConditionItem | null>(null)
  const [displayMode, setDisplayMode] = useState<DisplayMode>('rate')
  const [expandedMarkupStore, setExpandedMarkupStore] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  const hasMultipleStores = allStoreResults.size > 1

  // 旧設定との後方互換: gpDiff/discount の旧フィールドを conditionConfig にマッピング
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

  const handleCardClick = useCallback(
    (item: ConditionItem) => {
      if (hasMultipleStores && (item.storeValue || item.detailBreakdown)) {
        setBreakdownItem(item)
      }
    },
    [hasMultipleStores],
  )

  const handleEvidenceClick = useCallback(
    (e: React.MouseEvent, metricId: MetricId) => {
      e.stopPropagation()
      onExplain(metricId)
    },
    [onExplain],
  )

  // ─── Build condition items ───────────────────────────

  const gpBefore = computeGpBeforeConsumable(r)
  const gpAfter = computeGpAfterConsumable(r)
  const gpDiff = (gpAfter - r.grossProfitRateBudget) * 100

  const gpSignal = (diffPt: number, storeId?: string): SignalLevel => {
    const t = resolveThresholds(effectiveConfig, 'gpRate', storeId)
    return evaluateSignal(diffPt, t, 'higher_better')
  }

  const markupSignal = (rate: number): SignalLevel => {
    const t = resolveThresholds(effectiveConfig, 'markupRate')
    const diff = (rate - r.grossProfitRateBudget) * 100
    return evaluateSignal(diff, t, 'higher_better')
  }

  const items: ConditionItem[] = []

  // 1. Gross Profit Rate
  if (isMetricEnabled(effectiveConfig, 'gpRate')) {
    items.push({
      label: '粗利率',
      value: formatPercent(gpAfter),
      sub: `予算 ${formatPercent(r.grossProfitRateBudget)} / 原算前 ${formatPercent(gpBefore)} / 原価算入率 ${formatPercent(r.costInclusionRate)} / 差異 ${(gpAfter - r.grossProfitRateBudget >= 0 ? '+' : '') + gpDiff.toFixed(2)}pt`,
      signal: gpSignal(gpDiff),
      metricId:
        r.invMethodGrossProfitRate != null ? 'invMethodGrossProfitRate' : 'estMethodMarginRate',
      detailBreakdown: 'gpRate',
    })
  }

  // 2. Markup Rate
  if (isMetricEnabled(effectiveConfig, 'markupRate')) {
    items.push({
      label: '値入率',
      value: formatPercent(r.averageMarkupRate),
      sub: `コア値入率 ${formatPercent(r.coreMarkupRate)}`,
      signal: markupSignal(r.averageMarkupRate),
      metricId: 'averageMarkupRate',
      detailBreakdown: 'markupRate',
    })
  }

  // 3. Budget Progress Rate
  if (isMetricEnabled(effectiveConfig, 'budgetProgress')) {
    items.push({
      label: '予算消化率',
      value: formatPercent(r.budgetProgressRate),
      sub: `達成率 ${formatPercent(r.budgetAchievementRate)} / 残予算 ${formatCurrency(r.remainingBudget)}`,
      signal: metricSignal(r.budgetProgressRate, 'budgetProgress', effectiveConfig),
      metricId: 'budgetProgressRate',
      storeValue: (sr) => ({
        value: formatPercent(sr.budgetProgressRate),
        signal: metricSignal(sr.budgetProgressRate, 'budgetProgress', effectiveConfig, sr.storeId),
      }),
    })
  }

  // 4. Projected Achievement
  if (isMetricEnabled(effectiveConfig, 'projectedAchievement')) {
    items.push({
      label: '着地予測達成率',
      value: formatPercent(r.projectedAchievement),
      sub: `予測 ${formatCurrency(r.projectedSales)} / 予算 ${formatCurrency(r.budget)}`,
      signal: metricSignal(r.projectedAchievement, 'projectedAchievement', effectiveConfig),
      metricId: 'projectedSales',
      storeValue: (sr) => ({
        value: formatPercent(sr.projectedAchievement),
        signal: metricSignal(
          sr.projectedAchievement,
          'projectedAchievement',
          effectiveConfig,
          sr.storeId,
        ),
      }),
    })
  }

  // 5. Discount Rate
  if (isMetricEnabled(effectiveConfig, 'discountRate')) {
    items.push({
      label: '売変率',
      value: formatPercent(r.discountRate),
      sub: `売変額 ${formatCurrency(r.totalDiscount)} / 粗売上 ${formatCurrency(r.grossSales)}`,
      signal: metricSignal(r.discountRate, 'discountRate', effectiveConfig),
      metricId: 'discountRate',
      detailBreakdown: 'discountRate',
    })
  }

  // 6. Cost Inclusion Rate
  if (isMetricEnabled(effectiveConfig, 'costInclusion')) {
    items.push({
      label: '原価算入率',
      value: formatPercent(r.costInclusionRate),
      sub: `原価算入費 ${formatCurrency(r.totalCostInclusion)} / 売上 ${formatCurrency(r.totalSales)}`,
      signal: metricSignal(r.costInclusionRate, 'costInclusion', effectiveConfig),
      metricId: 'totalCostInclusion',
      detailBreakdown: 'costInclusion',
    })
  }

  // 7. Sales YoY
  const prevYear = ctx.prevYear
  if (
    isMetricEnabled(effectiveConfig, 'salesYoY') &&
    prevYear.hasPrevYear &&
    prevYear.totalSales > 0
  ) {
    const salesYoY = safeDivide(r.totalSales, prevYear.totalSales, 0)
    items.push({
      label: '売上前年比',
      value: formatPercent(salesYoY, 2),
      sub: `当年 ${formatCurrency(r.totalSales)} / 前年 ${formatCurrency(prevYear.totalSales)}`,
      signal: metricSignal(salesYoY, 'salesYoY', effectiveConfig),
      metricId: 'salesTotal',
      detailBreakdown: 'salesYoY',
    })
  }

  // 8. Customer YoY
  if (
    isMetricEnabled(effectiveConfig, 'customerYoY') &&
    prevYear.hasPrevYear &&
    prevYear.totalCustomers > 0 &&
    r.totalCustomers > 0
  ) {
    const custYoY = r.totalCustomers / prevYear.totalCustomers
    items.push({
      label: '客数前年比',
      value: formatPercent(custYoY, 2),
      sub: `${r.totalCustomers.toLocaleString()}人 / 前年${prevYear.totalCustomers.toLocaleString()}人`,
      signal: metricSignal(custYoY, 'customerYoY', effectiveConfig),
      metricId: 'totalCustomers',
      detailBreakdown: 'customerYoY',
    })
  }

  // 9. Transaction Value
  if (isMetricEnabled(effectiveConfig, 'txValue') && r.totalCustomers > 0) {
    const txValue = r.transactionValue
    const prevTxValue =
      prevYear.hasPrevYear && prevYear.totalCustomers > 0
        ? safeDivide(prevYear.totalSales, prevYear.totalCustomers, 0)
        : null
    const txYoY = prevTxValue != null && prevTxValue > 0 ? txValue / prevTxValue : null
    const fmtTx = (v: number) =>
      `${v.toLocaleString('ja-JP', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}円`
    items.push({
      label: '客単価',
      value: fmtTx(txValue),
      sub:
        prevTxValue != null
          ? `前年: ${fmtTx(prevTxValue)} (${formatPercent(txYoY!, 2)})`
          : `日平均客数: ${Math.round(r.averageCustomersPerDay)}人`,
      signal: txYoY != null ? metricSignal(txYoY, 'txValue', effectiveConfig) : 'blue',
      metricId: 'totalCustomers',
      detailBreakdown: 'txValue',
    })
  }

  // 10. GP Amount Budget Ratio (period-prorated)
  if (isMetricEnabled(effectiveConfig, 'gpAmount') && r.grossProfitBudget > 0) {
    const gpAmt = computeGpAfterConsumableAmount(r)
    const effectiveEndDay = ctx.elapsedDays ?? ctx.daysInMonth
    let periodBudgetSum = 0
    for (let d = 1; d <= effectiveEndDay; d++) periodBudgetSum += r.budgetDaily.get(d) ?? 0
    const isPartialPeriod = ctx.elapsedDays != null && ctx.elapsedDays < ctx.daysInMonth
    const periodBudget = isPartialPeriod ? periodBudgetSum : r.budget
    const periodGPBudget = r.budget > 0 ? r.grossProfitBudget * (periodBudget / r.budget) : 0
    const gpBudgetRatio = safeDivide(gpAmt, periodGPBudget, 0)
    items.push({
      label: '粗利額予算比',
      value: formatPercent(gpBudgetRatio, 2),
      sub: `粗利額 ${formatCurrency(gpAmt)} / 予算 ${formatCurrency(periodGPBudget)}`,
      signal: metricSignal(gpBudgetRatio, 'gpAmount', effectiveConfig),
    })
  }

  // 11. Daily Sales Achievement
  const budgetDailyAvg = ctx.daysInMonth > 0 ? r.budget / ctx.daysInMonth : 0
  if (isMetricEnabled(effectiveConfig, 'dailySales') && budgetDailyAvg > 0) {
    const dailyRatio = safeDivide(r.averageDailySales, budgetDailyAvg, 0)
    items.push({
      label: '売上予算達成率',
      value: formatPercent(dailyRatio, 2),
      sub: `日販 ${formatCurrency(r.averageDailySales)} / 予算日販 ${formatCurrency(budgetDailyAvg)}`,
      signal: metricSignal(dailyRatio, 'dailySales', effectiveConfig),
      detailBreakdown: 'dailySales',
    })
  }

  // 12. Required Pace Ratio
  if (
    isMetricEnabled(effectiveConfig, 'requiredPace') &&
    r.averageDailySales > 0 &&
    r.requiredDailySales > 0
  ) {
    const paceRatio = safeDivide(r.requiredDailySales, r.averageDailySales, 0)
    items.push({
      label: '必達ペース比',
      value: formatPercent(paceRatio, 2),
      sub: `必要日販 ${formatCurrency(r.requiredDailySales)} / 実績日販 ${formatCurrency(r.averageDailySales)}`,
      signal: metricSignal(paceRatio, 'requiredPace', effectiveConfig),
    })
  }

  // Sort store entries by code
  const sortedStoreEntries = useMemo(
    () =>
      [...allStoreResults.entries()].sort(([, a], [, b]) => {
        const sa = stores.get(a.storeId)
        const sb = stores.get(b.storeId)
        return (sa?.code ?? a.storeId).localeCompare(sb?.code ?? b.storeId)
      }),
    [allStoreResults, stores],
  )

  // ─── Render ─────────────────────────────────────────

  return (
    <Wrapper aria-label="コンディションサマリー">
      <TitleRow>
        <Title>コンディションサマリー</Title>
        <SettingsChip onClick={() => setShowSettings((p) => !p)}>⚙ 閾値設定</SettingsChip>
      </TitleRow>

      {showSettings && <ConditionSettingsPanelWidget stores={stores} />}

      <Grid>
        {items.map((item) => {
          const color = SIGNAL_COLORS[item.signal]
          const isClickable = hasMultipleStores && !!(item.storeValue || item.detailBreakdown)
          return (
            <Card
              key={item.label}
              $borderColor={color}
              $clickable={isClickable}
              onClick={isClickable ? () => handleCardClick(item) : undefined}
            >
              <ChipRow>
                {item.metricId && (
                  <EvidenceChip
                    onClick={(e) => handleEvidenceClick(e, item.metricId!)}
                    title="計算根拠を表示"
                  >
                    根拠
                  </EvidenceChip>
                )}
              </ChipRow>
              <Signal $color={color} />
              <CardContent>
                <CardLabel>{item.label}</CardLabel>
                <CardValue $color={color}>{item.value}</CardValue>
                {item.sub && <CardSub>{item.sub}</CardSub>}
              </CardContent>
            </Card>
          )
        })}
      </Grid>

      {/* Detail Overlay */}
      {breakdownItem && (
        <Overlay
          onClick={() => {
            setBreakdownItem(null)
            setExpandedMarkupStore(null)
          }}
        >
          <DetailPanel onClick={(e) => e.stopPropagation()}>
            {breakdownItem.detailBreakdown === 'gpRate' ? (
              <GpRateDetailTable
                sortedStoreEntries={sortedStoreEntries}
                stores={stores}
                result={r}
                effectiveConfig={effectiveConfig}
                displayMode={displayMode}
                onDisplayModeChange={setDisplayMode}
                settings={settings}
                elapsedDays={ctx.elapsedDays}
                daysInMonth={ctx.daysInMonth}
              />
            ) : breakdownItem.detailBreakdown === 'discountRate' ? (
              <DiscountRateDetailTable
                sortedStoreEntries={sortedStoreEntries}
                stores={stores}
                result={r}
                effectiveConfig={effectiveConfig}
                displayMode={displayMode}
                onDisplayModeChange={setDisplayMode}
                settings={settings}
              />
            ) : breakdownItem.detailBreakdown === 'markupRate' ? (
              <MarkupRateDetailTable
                sortedStoreEntries={sortedStoreEntries}
                stores={stores}
                result={r}
                effectiveConfig={effectiveConfig}
                displayMode={displayMode}
                onDisplayModeChange={setDisplayMode}
                settings={settings}
                expandedMarkupStore={expandedMarkupStore}
                onExpandToggle={(id) => setExpandedMarkupStore((prev) => (prev === id ? null : id))}
              />
            ) : breakdownItem.detailBreakdown === 'costInclusion' ? (
              <CostInclusionDetailTable
                sortedStoreEntries={sortedStoreEntries}
                stores={stores}
                result={r}
                effectiveConfig={effectiveConfig}
                displayMode={displayMode}
                onDisplayModeChange={setDisplayMode}
                settings={settings}
                expandedMarkupStore={expandedMarkupStore}
                onExpandToggle={(id) => setExpandedMarkupStore((prev) => (prev === id ? null : id))}
              />
            ) : breakdownItem.detailBreakdown === 'salesYoY' ? (
              <SalesYoYDetailTable
                sortedStoreEntries={sortedStoreEntries}
                stores={stores}
                result={r}
                effectiveConfig={effectiveConfig}
                displayMode={displayMode}
                onDisplayModeChange={setDisplayMode}
                settings={settings}
                prevYear={ctx.prevYear}
                prevYearMonthlyKpi={ctx.prevYearMonthlyKpi}
                expandedStore={expandedMarkupStore}
                onExpandToggle={(id) => setExpandedMarkupStore((prev) => (prev === id ? null : id))}
                dataMaxDay={ctx.dataMaxDay}
              />
            ) : breakdownItem.detailBreakdown === 'customerYoY' ? (
              <CustomerYoYDetailTable
                sortedStoreEntries={sortedStoreEntries}
                stores={stores}
                result={r}
                effectiveConfig={effectiveConfig}
                displayMode={displayMode}
                onDisplayModeChange={setDisplayMode}
                settings={settings}
                prevYear={ctx.prevYear}
                prevYearMonthlyKpi={ctx.prevYearMonthlyKpi}
                expandedStore={expandedMarkupStore}
                onExpandToggle={(id) => setExpandedMarkupStore((prev) => (prev === id ? null : id))}
                dataMaxDay={ctx.dataMaxDay}
              />
            ) : breakdownItem.detailBreakdown === 'txValue' ? (
              <TxValueDetailTable
                sortedStoreEntries={sortedStoreEntries}
                stores={stores}
                result={r}
                effectiveConfig={effectiveConfig}
                displayMode={displayMode}
                onDisplayModeChange={setDisplayMode}
                settings={settings}
                expandedStore={expandedMarkupStore}
                onExpandToggle={(id) => setExpandedMarkupStore((prev) => (prev === id ? null : id))}
              />
            ) : breakdownItem.detailBreakdown === 'dailySales' ? (
              <DailySalesDetailTable
                sortedStoreEntries={sortedStoreEntries}
                stores={stores}
                result={r}
                effectiveConfig={effectiveConfig}
                displayMode={displayMode}
                onDisplayModeChange={setDisplayMode}
                settings={settings}
                daysInMonth={ctx.daysInMonth}
                expandedStore={expandedMarkupStore}
                onExpandToggle={(id) => setExpandedMarkupStore((prev) => (prev === id ? null : id))}
              />
            ) : (
              <SimpleBreakdown
                breakdownItem={breakdownItem}
                sortedStoreEntries={sortedStoreEntries}
                stores={stores}
              />
            )}
            <CloseBtn
              onClick={() => {
                setBreakdownItem(null)
                setExpandedMarkupStore(null)
              }}
            >
              閉じる
            </CloseBtn>
          </DetailPanel>
        </Overlay>
      )}

      {/* Condition Matrix (DuckDB) */}
      <ConditionMatrixTable ctx={ctx} />
    </Wrapper>
  )
})
