/**
 * 店舗別KPI一覧テーブル内部コンポーネント
 *
 * KpiTableWidgets.tsx から分離（react-refresh/only-export-components 対応）。
 */
import { useState, useCallback, type ReactNode } from 'react'
import { sc } from '@/presentation/theme/semanticColors'
import { palette } from '@/presentation/theme/tokens'
import { formatPercent } from '@/domain/formatting'
import { calculateAchievementRate } from '@/domain/calculations/utils'
import { getEffectiveGrossProfitRate } from '@/application/readModels/grossProfit'
import { useDataStore } from '@/application/stores/dataStore'
import { useUiStore } from '@/application/stores/uiStore'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { calculationCache } from '@/application/services/calculationCache'
import type { InventoryConfig } from '@/domain/models/record'
import type { WidgetContext } from './types'

const EMPTY_SETTINGS: ReadonlyMap<string, InventoryConfig> = new Map()
import { Button } from '@/presentation/components/common/layout'
import { STableWrapper, STable, STd, ScrollWrapper } from '../DashboardPage.styles'
import {
  KpiGroupTh,
  KpiSubTh,
  BudgetTh,
  BudgetTd,
  KpiWarningBar,
  KpiTooltip,
  TipLabel,
  TipVal,
  TableHeader,
  TableTitleText,
} from './KpiTableWidgets.styles'
import { EditableNumberCell } from './EditableNumberCell'
import { fmtPct, fmtPtDiff } from './kpiTableUtils'

/* Landing cells with hover tooltip */
function EditableLandingCell({
  r,
  groupBorder,
  gpLandingTooltip,
  salesLandingTooltip,
  fmtCurrency,
}: {
  r: {
    estMethodMarginRate: number
    grossProfitRateBudget: number
    projectedSales: number
    budget: number
  }
  groupBorder: string
  gpLandingTooltip?: ReactNode
  salesLandingTooltip?: ReactNode
  fmtCurrency: (v: number | null) => string
}) {
  const [gpHover, setGpHover] = useState(false)
  const [slHover, setSlHover] = useState(false)
  const gpLanding = r.estMethodMarginRate
  const salesLanding = r.projectedSales - r.budget
  const salesLandingColor = sc.cond(salesLanding >= 0)

  return (
    <>
      <BudgetTd
        style={{ borderLeft: groupBorder, position: 'relative' }}
        onMouseEnter={() => setGpHover(true)}
        onMouseLeave={() => setGpHover(false)}
      >
        {fmtPct(gpLanding)}
        {gpHover && gpLandingTooltip && <KpiTooltip>{gpLandingTooltip}</KpiTooltip>}
      </BudgetTd>
      <STd
        style={{ color: salesLandingColor, position: 'relative' }}
        onMouseEnter={() => setSlHover(true)}
        onMouseLeave={() => setSlHover(false)}
      >
        {fmtCurrency(salesLanding)}
        {slHover && salesLandingTooltip && <KpiTooltip>{salesLandingTooltip}</KpiTooltip>}
      </STd>
    </>
  )
}

export function StoreKpiTableInner({ ctx }: { ctx: WidgetContext }) {
  const dataSettings = useDataStore((s) => s.currentMonthData?.settings ?? EMPTY_SETTINGS)
  const { result: agg, allStoreResults, stores, fmtCurrency } = ctx

  // 店舗をコード順でソート
  const storeEntries = [...allStoreResults.entries()]
    .sort(([, a], [, b]) => {
      const sa = stores.get(a.storeId)
      const sb = stores.get(b.storeId)
      return (sa?.code ?? a.storeId).localeCompare(sb?.code ?? b.storeId)
    })
    .map(([id, result]) => {
      const store = stores.get(id)
      return { id, label: store?.code ?? id, name: store?.name ?? id, result }
    })

  // 取込データ有効期間に合わせた予算計算
  const effectiveEndDay = ctx.elapsedDays ?? (ctx.dataMaxDay > 0 ? ctx.dataMaxDay : ctx.daysInMonth)
  const isPartialPeriod = effectiveEndDay < ctx.daysInMonth

  const handleInventoryChange = useCallback(
    (storeId: string, field: 'closingInventory' | 'openingInventory', val: number | null) => {
      useDataStore.getState().updateInventory(storeId, { [field]: val })
      calculationCache.clear()
      useUiStore.getState().invalidateCalculation()
    },
    [],
  )

  const handleGPBudgetChange = useCallback((storeId: string, val: number | null) => {
    useDataStore.getState().updateInventory(storeId, { grossProfitBudget: val })
    calculationCache.clear()
    useUiStore.getState().invalidateCalculation()
  }, [])

  // 観測品質チェック
  const observationWarning =
    ctx.observationStatus === 'partial'
      ? '観測日数が少ないため、着地予測列の精度が低下しています'
      : ctx.observationStatus === 'invalid' || ctx.observationStatus === 'undefined'
        ? '観測期間が不十分なため、着地予測列は参考値です'
        : null
  // 仕入/売変データの完全性チェック（集約結果から判定）
  const purchaseShort = agg.purchaseMaxDay > 0 && agg.purchaseMaxDay < agg.elapsedDays
  const missingDiscount = !agg.hasDiscountData && agg.totalSales > 0

  const handleFilterToPurchase = useCallback(() => {
    if (agg.purchaseMaxDay > 0) {
      useSettingsStore.getState().updateSettings({ dataEndDay: agg.purchaseMaxDay })
      calculationCache.clear()
      useUiStore.getState().invalidateCalculation()
    }
  }, [agg.purchaseMaxDay])

  const handleExportCsv = useCallback(() => {
    const headers = [
      '店舗',
      '粗利予算額',
      '粗利率実績',
      '予算差異',
      '値入',
      '売変',
      isPartialPeriod ? '経過予算' : '予算',
      '売上実績',
      '売上差異',
      '達成率',
      '期首在庫',
      '期末在庫',
      '最終粗利着地',
      '最終売上着地',
    ]

    const buildRow = (r: typeof agg, label: string) => {
      const gpRateBudget = r.grossProfitRateBudget
      const gpRateActual = getEffectiveGrossProfitRate(r)
      const gpRateVariance = gpRateActual - gpRateBudget
      let periodBudgetSum = 0
      for (let d = 1; d <= effectiveEndDay; d++) periodBudgetSum += r.budgetDaily.get(d) ?? 0
      const periodBudget = isPartialPeriod ? periodBudgetSum : r.budget
      const salesVariance = r.totalSales - periodBudget
      const periodAchRate = calculateAchievementRate(r.totalSales, periodBudget)
      const gpLanding = r.estMethodMarginRate
      const salesLanding = r.projectedSales - r.budget

      return [
        label,
        fmtPct(gpRateBudget),
        fmtPct(gpRateActual),
        fmtPtDiff(gpRateVariance * 100),
        fmtPct(r.coreMarkupRate),
        formatPercent(-r.discountRate, 2),
        fmtCurrency(periodBudget),
        fmtCurrency(r.totalSales),
        fmtCurrency(salesVariance),
        formatPercent(periodAchRate),
        r.openingInventory != null ? fmtCurrency(r.openingInventory) : '-',
        r.closingInventory != null ? fmtCurrency(r.closingInventory) : '-',
        fmtPct(gpLanding),
        fmtCurrency(salesLanding),
      ]
    }

    const rows = storeEntries.map((s) => buildRow(s.result, s.label))
    if (storeEntries.length > 1) rows.push(buildRow(agg, '合計'))

    const bom = '\uFEFF'
    const csvContent =
      bom +
      [headers, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `店舗別KPI一覧_${ctx.year}年${ctx.month}月.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [storeEntries, agg, effectiveEndDay, isPartialPeriod, ctx.year, ctx.month, fmtCurrency])

  if (storeEntries.length === 0) {
    return (
      <STableWrapper>
        <TableHeader>
          <TableTitleText>店舗別KPI一覧</TableTitleText>
        </TableHeader>
        <div style={{ padding: '16px', fontSize: '0.7rem', color: palette.slate }}>
          店舗データがありません。
        </div>
      </STableWrapper>
    )
  }

  const groupBorder = '2px solid rgba(99,102,241,0.25)'

  const renderStoreRow = (r: typeof agg, label: string, storeId?: string, isSummary?: boolean) => {
    const gpRateBudget = r.grossProfitRateBudget
    const gpRateActual = getEffectiveGrossProfitRate(r)
    const gpRateVariance = gpRateActual - gpRateBudget
    // 有効期間の経過予算を算出
    let periodBudgetSum = 0
    for (let d = 1; d <= effectiveEndDay; d++) periodBudgetSum += r.budgetDaily.get(d) ?? 0
    const periodBudget = isPartialPeriod ? periodBudgetSum : r.budget
    const periodGPBudget = r.budget > 0 ? r.grossProfitBudget * (periodBudget / r.budget) : 0
    const salesVariance = r.totalSales - periodBudget
    const periodAchRate = calculateAchievementRate(r.totalSales, periodBudget)
    const gpLanding = r.estMethodMarginRate
    const salesLanding = r.projectedSales - r.budget

    const varColor = sc.cond(gpRateVariance >= 0)
    const salesDiffColor = sc.cond(salesVariance >= 0)
    const achColor = sc.achievement(periodAchRate)
    const salesLandingColor = sc.cond(salesLanding >= 0)

    const rowStyle = isSummary
      ? { fontWeight: 700 as const, borderTop: '2px solid rgba(99,102,241,0.3)' }
      : undefined

    // Editable values read from settings (not from calculated StoreResult)
    const invConfig = storeId ? dataSettings.get(storeId) : undefined

    // Tooltip content builders
    const closingInvTooltip =
      storeId && r.estMethodClosingInventory != null ? (
        <div>
          <div>
            <TipLabel>推定期末在庫:</TipLabel>
            <TipVal>{fmtCurrency(r.estMethodClosingInventory)}</TipVal>
          </div>
          {r.closingInventory != null && r.estMethodClosingInventory != null && (
            <div>
              <TipLabel>推定との差:</TipLabel>
              <TipVal $color={sc.cond(r.closingInventory - r.estMethodClosingInventory <= 0)}>
                {fmtCurrency(r.closingInventory - r.estMethodClosingInventory)}
              </TipVal>
            </div>
          )}
        </div>
      ) : undefined

    const gpBudgetTooltip =
      storeId && gpRateBudget > 0 ? (
        <div>
          <div>
            <TipLabel>粗利率予算:</TipLabel>
            <TipVal>{fmtPct(gpRateBudget)}</TipVal>
          </div>
          <div>
            <TipLabel>粗利率実績:</TipLabel>
            <TipVal>{fmtPct(gpRateActual)}</TipVal>
          </div>
          <div>
            <TipLabel>予実差異:</TipLabel>
            <TipVal $color={varColor}>{fmtPtDiff(gpRateVariance * 100)}</TipVal>
          </div>
          {r.grossProfitBudget > 0 && (
            <div>
              <TipLabel>粗利予算額(月間):</TipLabel>
              <TipVal>{fmtCurrency(r.grossProfitBudget)}</TipVal>
            </div>
          )}
          {isPartialPeriod && periodGPBudget > 0 && (
            <div>
              <TipLabel>経過粗利予算(〜{effectiveEndDay}日):</TipLabel>
              <TipVal>{fmtCurrency(periodGPBudget)}</TipVal>
            </div>
          )}
        </div>
      ) : undefined

    const salesLandingTooltip = storeId ? (
      <div>
        <div>
          <TipLabel>月間予算:</TipLabel>
          <TipVal>{fmtCurrency(r.budget)}</TipVal>
        </div>
        {isPartialPeriod && (
          <div>
            <TipLabel>経過予算(〜{effectiveEndDay}日):</TipLabel>
            <TipVal>{fmtCurrency(periodBudget)}</TipVal>
          </div>
        )}
        <div>
          <TipLabel>売上実績:</TipLabel>
          <TipVal>{fmtCurrency(r.totalSales)}</TipVal>
        </div>
        <div>
          <TipLabel>着地予測:</TipLabel>
          <TipVal>{fmtCurrency(r.projectedSales)}</TipVal>
        </div>
        <div>
          <TipLabel>予算差異(着地):</TipLabel>
          <TipVal $color={salesLandingColor}>{fmtCurrency(salesLanding)}</TipVal>
        </div>
        <div>
          <TipLabel>達成率予測:</TipLabel>
          <TipVal $color={sc.achievement(r.projectedAchievement)}>
            {formatPercent(r.projectedAchievement)}
          </TipVal>
        </div>
      </div>
    ) : undefined

    const gpLandingTooltip = storeId ? (
      <div>
        <div>
          <TipLabel>推定マージン率:</TipLabel>
          <TipVal>{fmtPct(r.estMethodMarginRate)}</TipVal>
        </div>
        {r.invMethodGrossProfitRate != null && (
          <div>
            <TipLabel>在庫法粗利率:</TipLabel>
            <TipVal>{fmtPct(r.invMethodGrossProfitRate)}</TipVal>
          </div>
        )}
        <div>
          <TipLabel>予算差異:</TipLabel>
          <TipVal $color={sc.cond(gpLanding - gpRateBudget >= 0)}>
            {fmtPtDiff((gpLanding - gpRateBudget) * 100)}
          </TipVal>
        </div>
      </div>
    ) : undefined

    return (
      <tr key={label} style={rowStyle}>
        <STd style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</STd>
        {/* 粗利 */}
        {storeId && !isSummary ? (
          <EditableNumberCell
            value={invConfig?.grossProfitBudget ?? null}
            placeholder="粗利予算"
            format="currency"
            onChange={(v) => handleGPBudgetChange(storeId, v)}
            tooltip={gpBudgetTooltip}
            style={{ borderLeft: groupBorder, background: 'rgba(234,179,8,0.08)' }}
          />
        ) : (
          <BudgetTd style={{ borderLeft: groupBorder }}>{fmtPct(gpRateBudget)}</BudgetTd>
        )}
        <STd>{fmtPct(gpRateActual)}</STd>
        <STd style={{ color: varColor }}>{fmtPtDiff(gpRateVariance * 100)}</STd>
        {/* 値入/売変 */}
        <BudgetTd style={{ borderLeft: groupBorder }}>{fmtPct(r.coreMarkupRate)}</BudgetTd>
        <STd style={{ color: sc.negative }}>{formatPercent(-r.discountRate, 2)}</STd>
        {/* 売上 */}
        <BudgetTd style={{ borderLeft: groupBorder }}>{fmtCurrency(periodBudget)}</BudgetTd>
        <STd>{fmtCurrency(r.totalSales)}</STd>
        <STd style={{ color: salesDiffColor }}>{fmtCurrency(salesVariance)}</STd>
        <STd style={{ color: achColor }}>{formatPercent(periodAchRate)}</STd>
        {/* 在庫 */}
        <STd style={{ borderLeft: groupBorder }}>
          {r.openingInventory != null ? fmtCurrency(r.openingInventory) : '-'}
        </STd>
        {storeId && !isSummary ? (
          <EditableNumberCell
            value={invConfig?.closingInventory ?? null}
            placeholder="期末在庫"
            format="currency"
            onChange={(v) => handleInventoryChange(storeId, 'closingInventory', v)}
            tooltip={closingInvTooltip}
          />
        ) : (
          <STd>{r.closingInventory != null ? fmtCurrency(r.closingInventory) : '-'}</STd>
        )}
        {/* 着地 */}
        <EditableLandingCell
          r={r}
          groupBorder={groupBorder}
          fmtCurrency={fmtCurrency}
          gpLandingTooltip={gpLandingTooltip}
          salesLandingTooltip={salesLandingTooltip}
        />
      </tr>
    )
  }

  return (
    <STableWrapper>
      <TableHeader>
        <TableTitleText>
          店舗別KPI一覧{isPartialPeriod ? `（〜${effectiveEndDay}日）` : ''}
        </TableTitleText>
        <Button
          $variant="outline"
          onClick={handleExportCsv}
          style={{ fontSize: '0.65rem', padding: '4px 10px' }}
        >
          CSV出力
        </Button>
      </TableHeader>
      {observationWarning && <KpiWarningBar>{observationWarning}</KpiWarningBar>}
      {purchaseShort && (
        <KpiWarningBar $clickable onClick={handleFilterToPurchase}>
          仕入データ: {agg.purchaseMaxDay}日まで（売上: {agg.elapsedDays}日まで） —{' '}
          {agg.purchaseMaxDay + 1}
          日以降の粗利は仕入原価ゼロで算出されています。クリックで仕入有効期間に絞り込み
        </KpiWarningBar>
      )}
      {missingDiscount && (
        <KpiWarningBar>
          売変データなし — 推定法（推定在庫・推定マージン率）の精度が低下しています
        </KpiWarningBar>
      )}
      <ScrollWrapper>
        <STable>
          <thead>
            <tr>
              <KpiGroupTh rowSpan={2}>店舗</KpiGroupTh>
              <KpiGroupTh colSpan={3} style={{ borderLeft: groupBorder }}>
                粗利
              </KpiGroupTh>
              <KpiGroupTh colSpan={2} style={{ borderLeft: groupBorder }}>
                値入/売変
              </KpiGroupTh>
              <KpiGroupTh colSpan={4} style={{ borderLeft: groupBorder }}>
                売上
              </KpiGroupTh>
              <KpiGroupTh colSpan={2} style={{ borderLeft: groupBorder }}>
                在庫
              </KpiGroupTh>
              <KpiGroupTh colSpan={2} style={{ borderLeft: groupBorder }}>
                着地
              </KpiGroupTh>
            </tr>
            <tr>
              {/* 粗利 */}
              <BudgetTh style={{ borderLeft: groupBorder }}>粗利予算額</BudgetTh>
              <KpiSubTh>粗利率実績</KpiSubTh>
              <KpiSubTh>予算差異</KpiSubTh>
              {/* 値入/売変 */}
              <BudgetTh style={{ borderLeft: groupBorder }}>値入</BudgetTh>
              <KpiSubTh>売変</KpiSubTh>
              {/* 売上 */}
              <BudgetTh style={{ borderLeft: groupBorder }}>
                {isPartialPeriod ? '経過予算' : '予算'}
              </BudgetTh>
              <KpiSubTh>実績</KpiSubTh>
              <KpiSubTh>差異</KpiSubTh>
              <KpiSubTh>達成率</KpiSubTh>
              {/* 在庫 */}
              <KpiSubTh style={{ borderLeft: groupBorder }}>期首在庫</KpiSubTh>
              <KpiSubTh>期末在庫 ✎</KpiSubTh>
              {/* 着地 */}
              <BudgetTh style={{ borderLeft: groupBorder }}>最終粗利着地</BudgetTh>
              <KpiSubTh>最終売上着地</KpiSubTh>
            </tr>
          </thead>
          <tbody>
            {storeEntries.map((s) => renderStoreRow(s.result, s.label, s.id))}
            {storeEntries.length > 1 && renderStoreRow(agg, '合計', undefined, true)}
          </tbody>
        </STable>
      </ScrollWrapper>
    </STableWrapper>
  )
}
