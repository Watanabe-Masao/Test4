/**
 * 日別詳細モーダル（DayDetailModal）
 *
 * カレンダー/テーブルから日を選択した際に表示するモーダル。
 * 売上分析・時間帯分析・仕入内訳の3タブ構成。
 *
 * 分割構成:
 *   - DayDetailModal.styles.ts  … styled-components
 *   - drilldownUtils.ts         … 集計ロジック・型定義
 *   - HourlyChart.tsx           … 時間帯別チャート
 *   - CategoryDrilldown.tsx     … カテゴリドリルダウン
 */
import { useState, useMemo } from 'react'
import { sc } from '@/presentation/theme/semanticColors'
import { formatCurrency, formatPercent, calculateTransactionValue } from '@/domain/calculations/utils'
import { getDailyTotalCost } from '@/domain/models/DailyRecord'
import type { DailyRecord, CategoryTimeSalesRecord } from '@/domain/models'
import type { PrevYearData } from '@/application/hooks'
import {
  PinModalOverlay,
  DetailModalContent, DetailHeader, DetailTitle, DetailCloseBtn,
  DetailKpiGrid, DetailKpiCard, DetailKpiLabel, DetailKpiValue,
  DetailSection, DetailSectionTitle, DetailRow, DetailLabel, DetailValue,
  DetailColumns,
} from '../DashboardPage.styles'
import { TabBar, Tab, KpiGrid2, KpiMini, KpiMiniLabel, KpiMiniValue, KpiMiniSub } from './DayDetailModal.styles'
import { HourlyChart } from './HourlyChart'
import { CategoryDrilldown } from './CategoryDrilldown'

type ModalTab = 'sales' | 'hourly' | 'breakdown'

interface DayDetailModalProps {
  day: number
  month: number
  year: number
  record: DailyRecord | undefined
  budget: number
  cumBudget: number
  cumSales: number
  cumPrevYear: number
  cumCustomers: number
  cumPrevCustomers: number
  prevYear: PrevYearData
  categoryRecords: readonly CategoryTimeSalesRecord[]
  prevYearCategoryRecords: readonly CategoryTimeSalesRecord[]
  onClose: () => void
}

export function DayDetailModal({
  day, month, year, record, budget, cumBudget, cumSales, cumPrevYear,
  cumCustomers, cumPrevCustomers, prevYear,
  categoryRecords, prevYearCategoryRecords, onClose,
}: DayDetailModalProps) {
  const [tab, setTab] = useState<ModalTab>('sales')
  const DOW_NAMES = ['日', '月', '火', '水', '木', '金', '土']

  // ── Core metrics ──
  const actual = record?.sales ?? 0
  const diff = actual - budget
  const ach = budget > 0 ? actual / budget : 0
  const cumDiff = cumSales - cumBudget
  const cumAch = cumBudget > 0 ? cumSales / cumBudget : 0
  const pySales = prevYear.daily.get(day)?.sales ?? 0
  const pyRatio = pySales > 0 ? actual / pySales : 0
  const dayOfWeek = DOW_NAMES[new Date(year, month - 1, day).getDay()]

  // ── Customer metrics ──
  const dayCust = record?.customers ?? 0
  const dayTxVal = calculateTransactionValue(actual, dayCust)
  const pyCust = prevYear.daily.get(day)?.customers ?? 0
  const pyTxVal = calculateTransactionValue(pySales, pyCust)
  const cumTxVal = calculateTransactionValue(cumSales, cumCustomers)
  const cumPrevTxVal = calculateTransactionValue(cumPrevYear, cumPrevCustomers)
  const custRatio = pyCust > 0 ? dayCust / pyCust : 0
  const txValRatio = pyTxVal > 0 ? dayTxVal / pyTxVal : 0

  // ── Category records ──
  const dayRecords = useMemo(
    () => categoryRecords.filter((r) => r.day === day),
    [categoryRecords, day],
  )
  const prevDayRecords = useMemo(
    () => prevYearCategoryRecords.filter((r) => r.day === day),
    [prevYearCategoryRecords, day],
  )
  const cumCategoryRecords = useMemo(
    () => categoryRecords.filter((r) => r.day <= day),
    [categoryRecords, day],
  )
  const cumPrevCategoryRecords = useMemo(
    () => prevYearCategoryRecords.filter((r) => r.day <= day),
    [prevYearCategoryRecords, day],
  )

  return (
    <PinModalOverlay onClick={onClose}>
      <DetailModalContent onClick={(e) => e.stopPropagation()}>
        <DetailHeader>
          <DetailTitle>{month}月{day}日（{dayOfWeek}）の詳細</DetailTitle>
          <DetailCloseBtn onClick={onClose}>✕</DetailCloseBtn>
        </DetailHeader>

        {/* ── KPI Row 1: Sales ── */}
        <DetailKpiGrid>
          <DetailKpiCard $accent="#6366f1">
            <DetailKpiLabel>予算</DetailKpiLabel>
            <DetailKpiValue>{formatCurrency(budget)}</DetailKpiValue>
          </DetailKpiCard>
          <DetailKpiCard $accent={sc.cond(actual >= budget)}>
            <DetailKpiLabel>実績</DetailKpiLabel>
            <DetailKpiValue>{formatCurrency(actual)}</DetailKpiValue>
          </DetailKpiCard>
          <DetailKpiCard $accent={sc.cond(diff >= 0)}>
            <DetailKpiLabel>予算差異</DetailKpiLabel>
            <DetailKpiValue $color={sc.cond(diff >= 0)}>
              {formatCurrency(diff)}
            </DetailKpiValue>
          </DetailKpiCard>
          <DetailKpiCard $accent={sc.achievement(ach)}>
            <DetailKpiLabel>達成率</DetailKpiLabel>
            <DetailKpiValue $color={sc.achievement(ach)}>
              {formatPercent(ach)}
            </DetailKpiValue>
          </DetailKpiCard>
        </DetailKpiGrid>

        {/* ── KPI Row 2: Customers & Comparison ── */}
        <KpiGrid2>
          <KpiMini $accent="#06b6d4">
            <KpiMiniLabel>客数</KpiMiniLabel>
            <KpiMiniValue>
              {dayCust > 0 ? `${dayCust.toLocaleString()}人` : '-'}
              {prevYear.hasPrevYear && pyCust > 0 && custRatio > 0 && (
                <KpiMiniSub style={{ color: custRatio >= 1 ? '#22c55e' : '#ef4444' }}>
                  (前年比{formatPercent(custRatio)})
                </KpiMiniSub>
              )}
            </KpiMiniValue>
          </KpiMini>
          <KpiMini $accent="#8b5cf6">
            <KpiMiniLabel>客単価</KpiMiniLabel>
            <KpiMiniValue>
              {dayTxVal > 0 ? formatCurrency(dayTxVal) : '-'}
              {prevYear.hasPrevYear && pyTxVal > 0 && txValRatio > 0 && (
                <KpiMiniSub style={{ color: txValRatio >= 1 ? '#22c55e' : '#ef4444' }}>
                  (前年比{formatPercent(txValRatio)})
                </KpiMiniSub>
              )}
            </KpiMiniValue>
          </KpiMini>
          <KpiMini $accent={sc.cond(pyRatio >= 1)}>
            <KpiMiniLabel>前年売上</KpiMiniLabel>
            <KpiMiniValue>
              {prevYear.hasPrevYear && pySales > 0 ? formatCurrency(pySales) : '-'}
            </KpiMiniValue>
          </KpiMini>
          <KpiMini $accent={sc.cond(pyRatio >= 1)}>
            <KpiMiniLabel>前年比</KpiMiniLabel>
            <KpiMiniValue $color={pyRatio > 0 ? sc.cond(pyRatio >= 1) : undefined}>
              {prevYear.hasPrevYear && pyRatio > 0 ? formatPercent(pyRatio) : '-'}
            </KpiMiniValue>
          </KpiMini>
        </KpiGrid2>

        {/* ── Tab Navigation ── */}
        <TabBar>
          <Tab $active={tab === 'sales'} onClick={() => setTab('sales')}>売上分析</Tab>
          <Tab $active={tab === 'hourly'} onClick={() => setTab('hourly')}>時間帯分析</Tab>
          <Tab $active={tab === 'breakdown'} onClick={() => setTab('breakdown')}>仕入内訳</Tab>
        </TabBar>

        {/* ── Tab: 売上分析 ── */}
        {tab === 'sales' && (
          <>
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
                hasPrevYearSales={prevYear.hasPrevYear}
                cumSales={cumSales}
                cumAch={cumAch}
                cumPrevYear={cumPrevYear}
                year={year}
                month={month}
                day={day}
              />
            )}

            {/* Cumulative summary */}
            <DetailSection>
              <DetailSectionTitle>累計情報（1日〜{day}日）</DetailSectionTitle>
              <DetailColumns>
                <div>
                  <DetailRow>
                    <DetailLabel>予算累計</DetailLabel>
                    <DetailValue>{formatCurrency(cumBudget)}</DetailValue>
                  </DetailRow>
                  <DetailRow>
                    <DetailLabel>実績累計</DetailLabel>
                    <DetailValue>{formatCurrency(cumSales)}</DetailValue>
                  </DetailRow>
                  <DetailRow>
                    <DetailLabel>累計差異</DetailLabel>
                    <DetailValue $color={sc.cond(cumDiff >= 0)}>{formatCurrency(cumDiff)}</DetailValue>
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
                    <DetailValue>{cumTxVal > 0 ? formatCurrency(cumTxVal) : '-'}</DetailValue>
                  </DetailRow>
                  {prevYear.hasPrevYear && cumPrevYear > 0 && (
                    <>
                      <DetailRow>
                        <DetailLabel>前年累計</DetailLabel>
                        <DetailValue>{formatCurrency(cumPrevYear)}</DetailValue>
                      </DetailRow>
                      <DetailRow>
                        <DetailLabel>前年累計客単価</DetailLabel>
                        <DetailValue>{cumPrevTxVal > 0 ? formatCurrency(cumPrevTxVal) : '-'}</DetailValue>
                      </DetailRow>
                    </>
                  )}
                </div>
              </DetailColumns>
            </DetailSection>
          </>
        )}

        {/* ── Tab: 時間帯分析 ── */}
        {tab === 'hourly' && (
          <>
            <HourlyChart dayRecords={dayRecords} prevDayRecords={prevDayRecords} />
            {dayRecords.length === 0 && (
              <DetailSection>
                <DetailSectionTitle>時間帯別売上</DetailSectionTitle>
                <DetailRow><DetailLabel>データなし</DetailLabel><DetailValue>-</DetailValue></DetailRow>
              </DetailSection>
            )}
          </>
        )}

        {/* ── Tab: 仕入内訳 ── */}
        {tab === 'breakdown' && (
          <DetailSection>
            <DetailSectionTitle>仕入・コスト内訳</DetailSectionTitle>
            {record ? (() => {
              const totalCost = getDailyTotalCost(record)
              const costItems: { label: string; cost: number; price: number }[] = [
                { label: '仕入（在庫）', cost: record.purchase.cost, price: record.purchase.price },
                { label: '花', cost: record.flowers.cost, price: record.flowers.price },
                { label: '産直', cost: record.directProduce.cost, price: record.directProduce.price },
                { label: '店間入', cost: record.interStoreIn.cost, price: record.interStoreIn.price },
                { label: '店間出', cost: record.interStoreOut.cost, price: record.interStoreOut.price },
                { label: '部門間入', cost: record.interDepartmentIn.cost, price: record.interDepartmentIn.price },
                { label: '部門間出', cost: record.interDepartmentOut.cost, price: record.interDepartmentOut.price },
              ].filter(item => item.cost !== 0 || item.price !== 0)
              const totalPrice = costItems.reduce((sum, item) => sum + Math.abs(item.price), 0)

              return (
                <>
                  {costItems.map((item) => {
                    const ratio = totalPrice > 0 ? Math.abs(item.price) / totalPrice : 0
                    return (
                      <DetailRow key={item.label}>
                        <DetailLabel>{item.label}</DetailLabel>
                        <DetailValue>
                          {formatCurrency(item.price)} <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>(原 {formatCurrency(item.cost)})</span>
                          <span style={{ color: '#6366f1', fontSize: '0.75rem', marginLeft: '4px' }}>({formatPercent(ratio)})</span>
                        </DetailValue>
                      </DetailRow>
                    )
                  })}
                  <DetailRow>
                    <DetailLabel>総仕入原価</DetailLabel>
                    <DetailValue>{formatCurrency(totalCost)}</DetailValue>
                  </DetailRow>
                  {actual > 0 && totalCost > 0 && (
                    <DetailRow>
                      <DetailLabel>原価率</DetailLabel>
                      <DetailValue>{formatPercent(totalCost / actual)}</DetailValue>
                    </DetailRow>
                  )}
                  {record.consumable.cost > 0 && (
                    <DetailRow>
                      <DetailLabel>消耗品費</DetailLabel>
                      <DetailValue>{formatCurrency(record.consumable.cost)}</DetailValue>
                    </DetailRow>
                  )}
                  {record.discountAmount !== 0 && (
                    <>
                      <DetailRow>
                        <DetailLabel>売変額</DetailLabel>
                        <DetailValue $color={sc.negative}>{formatCurrency(record.discountAmount)}</DetailValue>
                      </DetailRow>
                      {record.grossSales > 0 && (
                        <DetailRow>
                          <DetailLabel>売変率</DetailLabel>
                          <DetailValue $color={sc.negative}>
                            {formatPercent(Math.abs(record.discountAmount) / record.grossSales)}
                          </DetailValue>
                        </DetailRow>
                      )}
                    </>
                  )}
                </>
              )
            })() : (
              <DetailRow>
                <DetailLabel>データなし</DetailLabel>
                <DetailValue>-</DetailValue>
              </DetailRow>
            )}
          </DetailSection>
        )}

      </DetailModalContent>
    </PinModalOverlay>
  )
}
