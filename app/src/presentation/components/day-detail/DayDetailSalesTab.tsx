/**
 * 売上分析タブ — DayDetailModal の売上分析タブコンテンツ。
 * 比較モード切替・ウォーターフォール・カテゴリドリルダウン・累計情報を表示。
 *
 * @responsibility R:unclassified
 */
import { sc } from '@/presentation/theme/semanticColors'
import { formatPercent } from '@/domain/formatting'
import { useCurrencyFormat } from '@/presentation/components/charts/chartTheme'
import type { CategoryLeafDailyEntry } from '@/application/hooks/categoryLeafDaily/CategoryLeafDailyBundle.types'
import {
  DetailSection,
  DetailSectionTitle,
  DetailRow,
  DetailLabel,
  DetailValue,
  DetailColumns,
} from '@/presentation/pages/Dashboard/DashboardPage.styles'
import { ToggleGroup, ToggleBtn } from './DayDetailModal.styles'
import { DrilldownWaterfall } from '@/presentation/pages/Dashboard/widgets/DrilldownWaterfall'
import { CategoryDrilldown } from '@/presentation/pages/Dashboard/widgets/CategoryDrilldown'

export type CompMode = 'yoy' | 'wow'

interface DayDetailSalesTabProps {
  readonly compMode: CompMode
  readonly onCompModeChange: (mode: CompMode) => void
  readonly hasPrevYear: boolean
  readonly canWoW: boolean
  readonly compSales: number
  readonly compCust: number
  readonly curCompLabel: string
  readonly compLabel: string
  readonly actual: number
  readonly dayCust: number
  readonly dayRecords: readonly CategoryLeafDailyEntry[]
  readonly compDayRecords: readonly CategoryLeafDailyEntry[]
  readonly prevDayRecords: readonly CategoryLeafDailyEntry[]
  readonly wowPrevDayRecords: readonly CategoryLeafDailyEntry[]
  readonly budget: number
  readonly cumBudget: number
  readonly cumSales: number
  readonly cumAch: number
  readonly cumPrevYear: number
  readonly cumCustomers: number
  readonly cumTxVal: number
  readonly cumPrevTxVal: number
  readonly cumDiff: number
  readonly ach: number
  readonly pySales: number
  readonly wowPrevSales: number
  readonly day: number
  readonly month: number
  readonly year: number
  readonly cumCategoryRecords: readonly CategoryLeafDailyEntry[]
  readonly cumPrevCategoryRecords: readonly CategoryLeafDailyEntry[]
}

export function DayDetailSalesTab({
  compMode,
  onCompModeChange,
  hasPrevYear,
  canWoW,
  compSales,
  compCust,
  curCompLabel,
  compLabel,
  actual,
  dayCust,
  dayRecords,
  compDayRecords,
  prevDayRecords,
  wowPrevDayRecords,
  budget,
  cumBudget,
  cumSales,
  cumAch,
  cumPrevYear,
  cumCustomers,
  cumTxVal,
  cumPrevTxVal,
  cumDiff,
  ach,
  pySales,
  wowPrevSales,
  day,
  month,
  year,
  cumCategoryRecords,
  cumPrevCategoryRecords,
}: DayDetailSalesTabProps) {
  const { formatWithUnit: fmtCurrencyWithUnit } = useCurrencyFormat()

  return (
    <>
      {/* 比較モード切替: 比較期比 / 前週比 */}
      {(hasPrevYear || canWoW) && (
        <ToggleGroup style={{ marginBottom: '12px' }}>
          <ToggleBtn $active={compMode === 'yoy'} onClick={() => onCompModeChange('yoy')}>
            比較期比
          </ToggleBtn>
          <ToggleBtn
            $active={compMode === 'wow'}
            onClick={() => {
              if (canWoW) onCompModeChange('wow')
            }}
            style={canWoW ? undefined : { opacity: 0.4, cursor: 'not-allowed' }}
          >
            前週比
          </ToggleBtn>
        </ToggleGroup>
      )}
      {compSales > 0 && actual > 0 && (
        <DrilldownWaterfall
          actual={actual}
          pySales={compSales}
          dayCust={dayCust}
          pyCust={compCust}
          dayRecords={dayRecords}
          prevDayRecords={compDayRecords}
          curLabel={curCompLabel}
          prevLabel={compLabel}
        />
      )}
      {compSales > 0 && actual === 0 && (
        <div
          style={{
            padding: '16px',
            marginBottom: '12px',
            borderRadius: 8,
            border: '1px dashed rgba(255,255,255,0.18)',
            background: 'rgba(0,0,0,0.04)',
            fontSize: '0.82rem',
            color: 'var(--text2, #64748b)',
            textAlign: 'center',
          }}
          role="status"
        >
          当年の実績がまだありません — 前年比ウォーターフォールは分析できません
        </div>
      )}
      {dayRecords.length > 0 && (
        <CategoryDrilldown
          records={dayRecords}
          prevRecords={prevDayRecords}
          budget={budget}
          cumRecords={cumCategoryRecords}
          cumPrevRecords={cumPrevCategoryRecords}
          cumBudget={cumBudget}
          actual={actual}
          ach={ach}
          pySales={pySales}
          hasPrevYearSales={hasPrevYear}
          cumSales={cumSales}
          cumAch={cumAch}
          cumPrevYear={cumPrevYear}
          year={year}
          month={month}
          day={day}
          wowRecords={wowPrevDayRecords}
          wowPrevSales={wowPrevSales}
          canWoW={canWoW}
        />
      )}

      {/* Cumulative summary */}
      <DetailSection>
        <DetailSectionTitle>累計情報（1日〜{day}日）</DetailSectionTitle>
        <DetailColumns>
          <div>
            <DetailRow>
              <DetailLabel>予算累計</DetailLabel>
              <DetailValue>{fmtCurrencyWithUnit(cumBudget)}</DetailValue>
            </DetailRow>
            <DetailRow>
              <DetailLabel>実績累計</DetailLabel>
              <DetailValue>{fmtCurrencyWithUnit(cumSales)}</DetailValue>
            </DetailRow>
            <DetailRow>
              <DetailLabel>累計差異</DetailLabel>
              <DetailValue $color={sc.cond(cumDiff >= 0)}>
                {fmtCurrencyWithUnit(cumDiff)}
              </DetailValue>
            </DetailRow>
            <DetailRow>
              <DetailLabel>累計達成率</DetailLabel>
              <DetailValue $color={sc.cond(cumAch >= 1)}>{formatPercent(cumAch)}</DetailValue>
            </DetailRow>
          </div>
          <div>
            <DetailRow>
              <DetailLabel>累計客数</DetailLabel>
              <DetailValue>
                {cumCustomers > 0 ? `${cumCustomers.toLocaleString()}人` : '-'}
              </DetailValue>
            </DetailRow>
            <DetailRow>
              <DetailLabel>累計客単価</DetailLabel>
              <DetailValue>{cumTxVal > 0 ? fmtCurrencyWithUnit(cumTxVal) : '-'}</DetailValue>
            </DetailRow>
            {hasPrevYear && cumPrevYear > 0 && (
              <>
                <DetailRow>
                  <DetailLabel>前年累計</DetailLabel>
                  <DetailValue>{fmtCurrencyWithUnit(cumPrevYear)}</DetailValue>
                </DetailRow>
                <DetailRow>
                  <DetailLabel>前年累計客単価</DetailLabel>
                  <DetailValue>
                    {cumPrevTxVal > 0 ? fmtCurrencyWithUnit(cumPrevTxVal) : '-'}
                  </DetailValue>
                </DetailRow>
              </>
            )}
          </div>
        </DetailColumns>
      </DetailSection>
    </>
  )
}
