import type { DepartmentKpiIndex } from '@/application/usecases/departmentKpi/indexBuilder'
import type { MetricId } from '@/domain/models'
import { KpiCard, KpiGrid } from '@/presentation/components/common'
import { formatCurrency, formatPercent } from '@/domain/calculations/utils'
import { sc } from '@/presentation/theme/semanticColors'
import { palette } from '@/presentation/theme/tokens'
import {
  Section,
  SectionTitle,
  Table,
  Th,
  Td,
  Tr,
  TotalRow,
  DeptTd,
  DeptTableWrapper,
} from './ReportsPage.styles'

interface ReportDeptTableProps {
  readonly deptKpiIndex: DepartmentKpiIndex
  readonly onExplain: (metricId: MetricId) => void
}

export function ReportDeptTable({ deptKpiIndex, onExplain }: ReportDeptTableProps) {
  if (deptKpiIndex.records.length === 0) return null

  return (
    <Section>
      <SectionTitle>部門別KPI</SectionTitle>
      <KpiGrid>
        <KpiCard
          label="部門数"
          value={`${deptKpiIndex.summary.deptCount}部門`}
          accent={palette.primary}
        />
        <KpiCard
          label="売上達成率（全体）"
          value={formatPercent(deptKpiIndex.summary.overallSalesAchievement)}
          subText={`予算: ${formatCurrency(deptKpiIndex.summary.totalSalesBudget)} / 実績: ${formatCurrency(deptKpiIndex.summary.totalSalesActual)}`}
          accent={sc.achievement(deptKpiIndex.summary.overallSalesAchievement)}
          onClick={() => onExplain('budgetAchievementRate')}
        />
        <KpiCard
          label="加重平均粗利率"
          value={formatPercent(deptKpiIndex.summary.weightedGpRateActual)}
          subText={`予算: ${formatPercent(deptKpiIndex.summary.weightedGpRateBudget)}`}
          accent={sc.positive}
          onClick={() => onExplain('invMethodGrossProfitRate')}
        />
        <KpiCard
          label="加重平均値入率"
          value={formatPercent(deptKpiIndex.summary.weightedMarkupRate)}
          subText={`売変率: ${formatPercent(deptKpiIndex.summary.weightedDiscountRate)}`}
          accent={palette.infoDark}
          onClick={() => onExplain('averageMarkupRate')}
        />
      </KpiGrid>
      <DeptTableWrapper>
        <Table>
          <thead>
            <tr>
              <Th>部門</Th>
              <Th>粗利率(予算)</Th>
              <Th>粗利率(実績)</Th>
              <Th>差異(pt)</Th>
              <Th>値入率</Th>
              <Th>売変率</Th>
              <Th>売上予算</Th>
              <Th>売上実績</Th>
              <Th>達成率</Th>
            </tr>
          </thead>
          <tbody>
            {deptKpiIndex.records.map((dept) => (
              <Tr key={dept.deptCode}>
                <DeptTd>{dept.deptName || dept.deptCode}</DeptTd>
                <DeptTd>{formatPercent(dept.gpRateBudget)}</DeptTd>
                <DeptTd
                  $good={dept.gpRateActual >= dept.gpRateBudget}
                  $warn={dept.gpRateActual < dept.gpRateBudget}
                >
                  {formatPercent(dept.gpRateActual)}
                </DeptTd>
                <DeptTd $good={dept.gpRateVariance >= 0} $warn={dept.gpRateVariance < 0}>
                  {dept.gpRateVariance >= 0 ? '+' : ''}
                  {(dept.gpRateVariance * 100).toFixed(1)}
                </DeptTd>
                <DeptTd>{formatPercent(dept.markupRate)}</DeptTd>
                <DeptTd>{formatPercent(dept.discountRate)}</DeptTd>
                <DeptTd>{formatCurrency(dept.salesBudget)}</DeptTd>
                <DeptTd>{formatCurrency(dept.salesActual)}</DeptTd>
                <DeptTd $good={dept.salesAchievement >= 1} $warn={dept.salesAchievement < 0.9}>
                  {formatPercent(dept.salesAchievement)}
                </DeptTd>
              </Tr>
            ))}
            <TotalRow>
              <Td>全部門（加重平均）</Td>
              <Td>{formatPercent(deptKpiIndex.summary.weightedGpRateBudget)}</Td>
              <Td $accent>{formatPercent(deptKpiIndex.summary.weightedGpRateActual)}</Td>
              <Td $accent>
                {deptKpiIndex.summary.weightedGpRateActual -
                  deptKpiIndex.summary.weightedGpRateBudget >=
                0
                  ? '+'
                  : ''}
                {(
                  (deptKpiIndex.summary.weightedGpRateActual -
                    deptKpiIndex.summary.weightedGpRateBudget) *
                  100
                ).toFixed(1)}
              </Td>
              <Td $accent>{formatPercent(deptKpiIndex.summary.weightedMarkupRate)}</Td>
              <Td $accent>{formatPercent(deptKpiIndex.summary.weightedDiscountRate)}</Td>
              <Td $accent>{formatCurrency(deptKpiIndex.summary.totalSalesBudget)}</Td>
              <Td $accent>{formatCurrency(deptKpiIndex.summary.totalSalesActual)}</Td>
              <Td $accent>{formatPercent(deptKpiIndex.summary.overallSalesAchievement)}</Td>
            </TotalRow>
          </tbody>
        </Table>
      </DeptTableWrapper>
    </Section>
  )
}
