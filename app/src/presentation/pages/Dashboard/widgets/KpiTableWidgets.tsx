/**
 * KPIテーブルウィジェット（店舗別KPI・部門別KPI）
 *
 * render 関数のみをエクスポート。コンポーネントは StoreKpiTableInner.tsx に分離。
 */
import type { ReactNode } from 'react'
import { sc } from '@/presentation/theme/semanticColors'
import { palette } from '@/presentation/theme/tokens'
import type { DepartmentKpiRecord } from '@/domain/models/record'
import type { CurrencyFormatter } from '@/presentation/components/charts/chartTheme'
import type { DashboardWidgetContext } from './DashboardWidgetContext'
import { STableWrapper, STableTitle, STable, STd, ScrollWrapper } from '../DashboardPage.styles'
import { KpiGroupTh, KpiSubTh, BudgetTh, BudgetTd } from './KpiTableWidgets.styles'
import { fmtPct, fmtPtDiff } from './kpiTableUtils'
import { StoreKpiTableInner } from './StoreKpiTableInner'

function renderKpiRow(rec: DepartmentKpiRecord, fmtCurrency: CurrencyFormatter): ReactNode {
  const varColor = sc.cond(rec.gpRateVariance >= 0)
  const salesDiffColor = sc.cond(rec.salesVariance >= 0)
  const achColor = sc.achievement(
    Math.abs(rec.salesAchievement) <= 1 ? rec.salesAchievement : rec.salesAchievement / 100,
  )
  const discColor = sc.negative

  return (
    <tr key={rec.deptCode}>
      <STd style={{ fontWeight: 600 }}>{rec.deptCode}</STd>
      <STd>{rec.deptName || '-'}</STd>
      <BudgetTd>{fmtPct(rec.gpRateBudget)}</BudgetTd>
      <STd>{fmtPct(rec.gpRateActual)}</STd>
      <STd style={{ color: varColor }}>{fmtPtDiff(rec.gpRateVariance)}</STd>
      <BudgetTd>{fmtPct(rec.markupRate)}</BudgetTd>
      <STd style={{ color: discColor }}>{fmtPct(rec.discountRate)}</STd>
      <BudgetTd>{fmtCurrency(rec.salesBudget)}</BudgetTd>
      <STd>{fmtCurrency(rec.salesActual)}</STd>
      <STd style={{ color: salesDiffColor }}>{fmtCurrency(rec.salesVariance)}</STd>
      <STd style={{ color: achColor }}>{fmtPct(rec.salesAchievement)}</STd>
      <STd>{fmtCurrency(rec.openingInventory)}</STd>
      <STd>{fmtCurrency(rec.closingInventory)}</STd>
      <BudgetTd>{fmtPct(rec.gpRateLanding)}</BudgetTd>
      <STd>{rec.salesLanding ? fmtCurrency(rec.salesLanding) : '-'}</STd>
    </tr>
  )
}

export function renderStoreKpiTable(ctx: DashboardWidgetContext): ReactNode {
  return <StoreKpiTableInner ctx={ctx} />
}

export function renderDepartmentKpiTable(ctx: DashboardWidgetContext): ReactNode {
  const { departmentKpi, fmtCurrency } = ctx
  if (departmentKpi.records.length === 0) {
    return (
      <STableWrapper>
        <STableTitle>部門別KPI一覧</STableTitle>
        <div style={{ padding: '16px', fontSize: '0.7rem', color: palette.slate }}>
          部門別KPIデータが取り込まれていません。「部門別」を含むCSV/Excelファイルをドロップしてください。
        </div>
      </STableWrapper>
    )
  }

  const groupBorder = '2px solid rgba(99,102,241,0.25)'

  return (
    <STableWrapper>
      <STableTitle>部門別KPI一覧</STableTitle>
      <ScrollWrapper>
        <STable>
          <thead>
            <tr>
              <KpiGroupTh rowSpan={2}>部門</KpiGroupTh>
              <KpiGroupTh rowSpan={2}>名称</KpiGroupTh>
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
              <BudgetTh style={{ borderLeft: groupBorder }}>粗利率予算</BudgetTh>
              <KpiSubTh>粗利率実績</KpiSubTh>
              <KpiSubTh>予算差異</KpiSubTh>
              {/* 値入/売変 */}
              <BudgetTh style={{ borderLeft: groupBorder }}>値入</BudgetTh>
              <KpiSubTh>売変</KpiSubTh>
              {/* 売上 */}
              <BudgetTh style={{ borderLeft: groupBorder }}>予算</BudgetTh>
              <KpiSubTh>実績</KpiSubTh>
              <KpiSubTh>差異</KpiSubTh>
              <KpiSubTh>達成率</KpiSubTh>
              {/* 在庫 */}
              <KpiSubTh style={{ borderLeft: groupBorder }}>期首在庫</KpiSubTh>
              <KpiSubTh>期末在庫</KpiSubTh>
              {/* 着地 */}
              <BudgetTh style={{ borderLeft: groupBorder }}>最終粗利着地</BudgetTh>
              <KpiSubTh>最終売上着地</KpiSubTh>
            </tr>
          </thead>
          <tbody>{departmentKpi.records.map((rec) => renderKpiRow(rec, fmtCurrency))}</tbody>
        </STable>
      </ScrollWrapper>
    </STableWrapper>
  )
}
