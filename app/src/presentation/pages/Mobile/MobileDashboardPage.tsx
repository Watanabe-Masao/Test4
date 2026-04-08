/**
 * モバイル専用ダッシュボード
 *
 * /mobile ルートでレンダリングされるスマートフォン向け画面。
 * AppShell を使わず、モバイルファーストの独自レイアウトを持つ。
 */
import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCalculation } from '@/application/hooks/calculation'
import { useStoreSelection, useMonthSwitcher } from '@/application/hooks/ui'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { usePeriodSelectionStore } from '@/application/stores/periodSelectionStore'
import { useComparisonModule } from '@/application/hooks/useComparisonModule'
import { getDaysInMonth } from '@/domain/constants/defaults'
import { KpiTabContent } from './KpiTabContent'
import { ChartTabContent } from './ChartTabContent'
import { DailyTabContent } from './DailyTabContent'
import type { DailySalesEntry } from './ChartTabContent'
import {
  MobileShell,
  Header,
  HeaderTitle,
  HeaderSub,
  MonthNav,
  MonthArrow,
  DesktopLink,
  TabBar,
  Tab,
  ScrollContent,
  EmptyMessage,
  EmptyIcon,
} from './MobileDashboardPage.styles'

// ─── Types ─────────────────────────────────────────────────

type MobileTab = 'kpi' | 'chart' | 'daily'

// ─── Component ─────────────────────────────────────────────

export function MobileDashboardPage() {
  const [tab, setTab] = useState<MobileTab>('kpi')
  const navigate = useNavigate()

  const { isCalculated, daysInMonth } = useCalculation()
  const { currentResult, storeName } = useStoreSelection()
  const settings = useSettingsStore((s) => s.settings)
  const periodSelection = usePeriodSelectionStore((s) => s.selection)
  const comparison = useComparisonModule(
    periodSelection,
    currentResult?.elapsedDays,
    currentResult?.averageDailySales ?? 0,
  )
  const prevYear = comparison.daily

  const { isSwitching, goToPrevMonth, goToNextMonth } = useMonthSwitcher()
  const { targetYear, targetMonth } = settings
  const r = currentResult

  // 日別売上データ
  const dailySalesData = useMemo(() => {
    if (!r) return []
    const data: DailySalesEntry[] = []
    const firstDow = new Date(targetYear, targetMonth - 1, 1).getDay()
    const dim = getDaysInMonth(targetYear, targetMonth)
    for (let d = 1; d <= dim; d++) {
      const rec = r.daily.get(d)
      data.push({
        day: d,
        sales: rec?.sales ?? 0,
        budget: r.budgetDaily.get(d) ?? 0,
        dow: (firstDow + d - 1) % 7,
      })
    }
    return data
  }, [r, targetYear, targetMonth])

  const handleGoDesktop = useCallback(() => {
    navigate('/dashboard')
  }, [navigate])

  // ─── Empty / Loading ──

  if (!isCalculated || !r) {
    return (
      <MobileShell>
        <Header>
          <MonthNav>
            <MonthArrow onClick={goToPrevMonth} disabled={isSwitching}>
              ◀
            </MonthArrow>
            <div>
              <HeaderTitle>
                {targetYear}年{targetMonth}月
              </HeaderTitle>
              <HeaderSub>{isSwitching ? '切替中...' : 'モバイルダッシュボード'}</HeaderSub>
            </div>
            <MonthArrow onClick={goToNextMonth} disabled={isSwitching}>
              ▶
            </MonthArrow>
          </MonthNav>
          <DesktopLink onClick={handleGoDesktop}>PC版</DesktopLink>
        </Header>
        <EmptyMessage>
          <EmptyIcon>📊</EmptyIcon>
          <div>
            データを読み込んでください
            <br />
            <span style={{ fontSize: '12px' }}>PC版からファイルをインポートしてください</span>
          </div>
          <DesktopLink onClick={handleGoDesktop}>PC版を開く</DesktopLink>
        </EmptyMessage>
      </MobileShell>
    )
  }

  // ─── KPI values ──

  const elapsedBudget = r.dailyCumulative.get(r.elapsedDays)?.budget ?? 0

  // ─── Render ──

  return (
    <MobileShell>
      {/* ヘッダー */}
      <Header>
        <MonthNav>
          <MonthArrow onClick={goToPrevMonth} disabled={isSwitching}>
            ◀
          </MonthArrow>
          <div>
            <HeaderTitle>
              {targetYear}年{targetMonth}月 {storeName}
            </HeaderTitle>
            <HeaderSub>
              {isSwitching ? '切替中...' : `${r.elapsedDays}日経過 / ${daysInMonth}日`}
            </HeaderSub>
          </div>
          <MonthArrow onClick={goToNextMonth} disabled={isSwitching}>
            ▶
          </MonthArrow>
        </MonthNav>
        <DesktopLink onClick={handleGoDesktop}>PC版</DesktopLink>
      </Header>

      {/* タブバー */}
      <TabBar>
        <Tab $active={tab === 'kpi'} onClick={() => setTab('kpi')}>
          概要
        </Tab>
        <Tab $active={tab === 'chart'} onClick={() => setTab('chart')}>
          チャート
        </Tab>
        <Tab $active={tab === 'daily'} onClick={() => setTab('daily')}>
          日別
        </Tab>
      </TabBar>

      {/* コンテンツ */}
      <ScrollContent>
        {tab === 'kpi' && (
          <KpiTabContent
            r={r}
            elapsedBudget={elapsedBudget}
            prevYear={prevYear}
            settings={settings}
            curTotalCustomers={r.totalCustomers}
            prevTotalCustomers={prevYear.totalCustomers}
          />
        )}

        {tab === 'chart' && <ChartTabContent dailySalesData={dailySalesData} />}

        {tab === 'daily' && <DailyTabContent dailySalesData={dailySalesData} r={r} />}
      </ScrollContent>
    </MobileShell>
  )
}
