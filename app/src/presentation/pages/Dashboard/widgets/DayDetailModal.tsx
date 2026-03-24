/**
 * 日別詳細モーダル — カレンダー/テーブルから日を選択した際に表示。
 * 売上分析・時間帯分析・仕入内訳の3タブ構成。
 * 各タブの描画は専用コンポーネントに委譲し、本ファイルはモーダル外殻+タブルーティングに専念する。
 */
import { useState, useMemo, useCallback } from 'react'
import { sc } from '@/presentation/theme/semanticColors'
import { palette } from '@/presentation/theme/tokens'
import { formatPercent } from '@/domain/formatting'
import { useCurrencyFormat } from '@/presentation/components/charts/chartTheme'
import { CurrencyUnitToggle } from '@/presentation/components/charts'
import {
  calculateAchievementRate,
  calculateYoYRatio,
  calculateTransactionValue,
} from '@/domain/calculations/utils'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import type { ComparisonScope } from '@/domain/models/ComparisonScope'
import type { DailyRecord } from '@/domain/models/record'
import { toDateKeyFromParts } from '@/domain/models/CalendarDate'
import { useDayDetailData, type PrevYearData } from '@/application/hooks/analytics'
import { getPrevYearDailyValue } from '@/application/comparison/comparisonAccessors'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { useDataStore } from '@/application/stores/dataStore'
import {
  PinModalOverlay,
  DetailModalContent,
  DetailHeader,
  DetailTitle,
  DetailCloseBtn,
  DetailKpiGrid,
  DetailKpiCard,
  DetailKpiLabel,
  DetailKpiValue,
} from '../DashboardPage.styles'
import {
  TabBar,
  Tab,
  KpiGrid2,
  KpiMini,
  KpiMiniLabel,
  KpiMiniValue,
  KpiMiniSub,
} from './DayDetailModal.styles'
import { DayDetailSalesTab, type CompMode } from './DayDetailSalesTab'
import { DayDetailHourlyTab } from './DayDetailHourlyTab'
import { DayDetailBreakdownTab } from './DayDetailBreakdownTab'

export type { CompMode }

type ModalTab = 'sales' | 'hourly' | 'breakdown'

const EMPTY_STORE_IDS: ReadonlySet<string> = new Set()

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
  /** QueryExecutor（DuckDB クエリ用） */
  queryExecutor: QueryExecutor | null
  /** DuckDB データバージョン（useMemo 依存配列用、0 = 未ロード） */
  dataVersion: number
  /** 当年の全日別データ（前週比用） */
  dailyMap?: ReadonlyMap<number, DailyRecord>
  /** 選択中の店舗IDセット（空=全店舗） */
  selectedStoreIds?: ReadonlySet<string>
  /** 比較スコープ（前年期間を統一的に取得） */
  comparisonScope: ComparisonScope | null
  onClose: () => void
}

export function DayDetailModal({
  day,
  month,
  year,
  record,
  budget,
  cumBudget,
  cumSales,
  cumPrevYear,
  cumCustomers,
  cumPrevCustomers,
  prevYear,
  queryExecutor,
  dataVersion,
  dailyMap,
  selectedStoreIds,
  comparisonScope,
  onClose,
}: DayDetailModalProps) {
  const { formatWithUnit: fmtCurrencyWithUnit } = useCurrencyFormat()
  const [tab, setTab] = useState<ModalTab>('sales')
  const [compMode, setCompMode] = useState<CompMode>('yoy')
  const DOW_NAMES = ['日', '月', '火', '水', '木', '金', '土']

  // ── DuckDB データ取得（CTS + 天気 + 日別サマリーを一括） ──
  const storeIdsSet = selectedStoreIds ?? EMPTY_STORE_IDS

  // 天気店舗選択（UI操作 — ユーザーが店舗を切り替えられる）
  const storeLocations = useSettingsStore((s) => s.settings.storeLocations)
  const storeMap = useDataStore((s) => s.data.stores)
  const [weatherStoreOverride, setWeatherStoreOverride] = useState<string | null>(null)

  const weatherCandidates = useMemo(() => {
    const ids = storeIdsSet.size > 0 ? Array.from(storeIdsSet) : Object.keys(storeLocations)
    return ids
      .filter((id) => storeLocations[id])
      .map((id) => ({ id, name: storeMap.get(id)?.name ?? id }))
  }, [storeIdsSet, storeLocations, storeMap])

  const weatherStoreId = useMemo(() => {
    if (weatherStoreOverride && weatherCandidates.some((c) => c.id === weatherStoreOverride)) {
      return weatherStoreOverride
    }
    return weatherCandidates[0]?.id ?? ''
  }, [weatherStoreOverride, weatherCandidates])

  const weatherStoreName = useMemo(
    () => weatherCandidates.find((c) => c.id === weatherStoreId)?.name ?? '',
    [weatherCandidates, weatherStoreId],
  )

  const handleWeatherStoreChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setWeatherStoreOverride(e.target.value || null)
  }, [])
  const dateKey = useMemo(() => toDateKeyFromParts(year, month, day), [year, month, day])

  const dd = useDayDetailData({
    queryExecutor,
    dataVersion,
    year,
    month,
    day,
    comparisonScope,
    selectedStoreIds: storeIdsSet,
    weatherStoreId,
  })

  const dayRecords = dd.dayRecords
  const prevDayRecords = dd.prevDayRecords
  const wowPrevDayRecords = dd.wowPrevDayRecords
  const cumCategoryRecords = dd.cumRecords
  const cumPrevCategoryRecords = dd.cumPrevRecords
  const prevDateKey = dd.prevDateKey

  // WoW: 7日前と比較
  const wowPrevDay = day - 7
  const canWoW = wowPrevDay >= 1
  const activeCompMode: CompMode = compMode === 'wow' && !canWoW ? 'yoy' : compMode

  // ── Core metrics ──
  const actual = record?.sales ?? 0
  const diff = actual - budget
  const ach = calculateAchievementRate(actual, budget)
  const cumDiff = cumSales - cumBudget
  const cumAch = calculateAchievementRate(cumSales, cumBudget)
  const pyEntry = getPrevYearDailyValue(prevYear, year, month, day)
  // インメモリ(flowersIndex) → DuckDB(store_day_summary) の優先順でフォールバック
  const pySales = pyEntry?.sales || dd.prevDaySummary.sales
  const pyRatio = calculateYoYRatio(actual, pySales)
  const dayOfWeek = DOW_NAMES[new Date(year, month - 1, day).getDay()]

  // ── Customer metrics（DuckDB フォールバック付き） ──
  const dayCust = record?.customers || dd.daySummary.customers
  const dayTxVal = calculateTransactionValue(actual, dayCust)
  const pyCust = pyEntry?.customers || dd.prevDaySummary.customers
  const pyTxVal = calculateTransactionValue(pySales, pyCust)
  const cumTxVal = calculateTransactionValue(cumSales, cumCustomers)
  const cumPrevTxVal = calculateTransactionValue(cumPrevYear, cumPrevCustomers)
  const custRatio = calculateYoYRatio(dayCust, pyCust)
  const txValRatio = calculateYoYRatio(dayTxVal, pyTxVal)

  // ── WoW metrics (前週比) ──
  const wowDailyRecord = canWoW && dailyMap ? dailyMap.get(wowPrevDay) : undefined
  const wowPrevSales = wowDailyRecord?.sales ?? 0
  const wowPrevCust = wowDailyRecord?.customers ?? 0

  // ── 比較用メトリクス（モードに応じて切替） ──
  const compSales = activeCompMode === 'wow' ? wowPrevSales : pySales
  const compCust = activeCompMode === 'wow' ? wowPrevCust : pyCust
  const compLabel = activeCompMode === 'wow' ? `${wowPrevDay}日` : '前年'
  const curCompLabel = activeCompMode === 'wow' ? `${day}日` : '当年'

  // WoW用: 比較期間のカテゴリレコード
  const compDayRecords = useMemo(
    () => (activeCompMode === 'wow' ? wowPrevDayRecords : prevDayRecords),
    [activeCompMode, wowPrevDayRecords, prevDayRecords],
  )

  return (
    <PinModalOverlay onClick={onClose}>
      <DetailModalContent onClick={(e) => e.stopPropagation()}>
        <DetailHeader>
          <DetailTitle>
            {month}月{day}日（{dayOfWeek}）の詳細
          </DetailTitle>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CurrencyUnitToggle />
            <DetailCloseBtn onClick={onClose}>✕</DetailCloseBtn>
          </div>
        </DetailHeader>

        {/* ── KPI Row 1: Sales ── */}
        <DetailKpiGrid>
          <DetailKpiCard $accent={palette.primary}>
            <DetailKpiLabel>予算</DetailKpiLabel>
            <DetailKpiValue>{fmtCurrencyWithUnit(budget)}</DetailKpiValue>
          </DetailKpiCard>
          <DetailKpiCard $accent={sc.cond(actual >= budget)}>
            <DetailKpiLabel>実績</DetailKpiLabel>
            <DetailKpiValue>{fmtCurrencyWithUnit(actual)}</DetailKpiValue>
          </DetailKpiCard>
          <DetailKpiCard $accent={sc.cond(diff >= 0)}>
            <DetailKpiLabel>予算差異</DetailKpiLabel>
            <DetailKpiValue $color={sc.cond(diff >= 0)}>{fmtCurrencyWithUnit(diff)}</DetailKpiValue>
          </DetailKpiCard>
          <DetailKpiCard $accent={sc.achievement(ach)}>
            <DetailKpiLabel>達成率</DetailKpiLabel>
            <DetailKpiValue $color={sc.achievement(ach)}>{formatPercent(ach)}</DetailKpiValue>
          </DetailKpiCard>
        </DetailKpiGrid>

        {/* ── KPI Row 2: Customers & Comparison ── */}
        <KpiGrid2>
          <KpiMini $accent={palette.cyanDark}>
            <KpiMiniLabel>客数</KpiMiniLabel>
            <KpiMiniValue>
              {dayCust > 0 ? `${dayCust.toLocaleString()}人` : '-'}
              {prevYear.hasPrevYear && pyCust > 0 && custRatio > 0 && (
                <KpiMiniSub style={{ color: sc.cond(custRatio >= 1) }}>
                  (前年比{formatPercent(custRatio)})
                </KpiMiniSub>
              )}
            </KpiMiniValue>
          </KpiMini>
          <KpiMini $accent={palette.purpleDark}>
            <KpiMiniLabel>客単価</KpiMiniLabel>
            <KpiMiniValue>
              {dayTxVal > 0 ? fmtCurrencyWithUnit(dayTxVal) : '-'}
              {prevYear.hasPrevYear && pyTxVal > 0 && txValRatio > 0 && (
                <KpiMiniSub style={{ color: sc.cond(txValRatio >= 1) }}>
                  (比較期比{formatPercent(txValRatio)})
                </KpiMiniSub>
              )}
            </KpiMiniValue>
          </KpiMini>
          <KpiMini $accent={sc.cond(pyRatio >= 1)}>
            <KpiMiniLabel>比較期売上</KpiMiniLabel>
            <KpiMiniValue>
              {prevYear.hasPrevYear && pySales > 0 ? fmtCurrencyWithUnit(pySales) : '-'}
            </KpiMiniValue>
          </KpiMini>
          <KpiMini $accent={sc.cond(pyRatio >= 1)}>
            <KpiMiniLabel>比較期比</KpiMiniLabel>
            <KpiMiniValue $color={pyRatio > 0 ? sc.cond(pyRatio >= 1) : undefined}>
              {prevYear.hasPrevYear && pyRatio > 0 ? formatPercent(pyRatio) : '-'}
            </KpiMiniValue>
          </KpiMini>
        </KpiGrid2>

        {/* ── Tab Navigation ── */}
        <TabBar>
          <Tab $active={tab === 'sales'} onClick={() => setTab('sales')}>
            売上分析
          </Tab>
          <Tab $active={tab === 'hourly'} onClick={() => setTab('hourly')}>
            時間帯分析
          </Tab>
          <Tab $active={tab === 'breakdown'} onClick={() => setTab('breakdown')}>
            仕入内訳
          </Tab>
        </TabBar>

        {/* ── Tab: 売上分析 ── */}
        {tab === 'sales' && (
          <DayDetailSalesTab
            compMode={compMode}
            onCompModeChange={setCompMode}
            hasPrevYear={prevYear.hasPrevYear}
            canWoW={canWoW}
            compSales={compSales}
            compCust={compCust}
            curCompLabel={curCompLabel}
            compLabel={compLabel}
            actual={actual}
            dayCust={dayCust}
            dayRecords={dayRecords}
            compDayRecords={compDayRecords}
            prevDayRecords={prevDayRecords}
            wowPrevDayRecords={wowPrevDayRecords}
            budget={budget}
            cumBudget={cumBudget}
            cumSales={cumSales}
            cumAch={cumAch}
            cumPrevYear={cumPrevYear}
            cumCustomers={cumCustomers}
            cumTxVal={cumTxVal}
            cumPrevTxVal={cumPrevTxVal}
            cumDiff={cumDiff}
            ach={ach}
            pySales={pySales}
            wowPrevSales={wowPrevSales}
            day={day}
            month={month}
            year={year}
            cumCategoryRecords={cumCategoryRecords}
            cumPrevCategoryRecords={cumPrevCategoryRecords}
          />
        )}

        {/* ── Tab: 時間帯分析 ── */}
        {tab === 'hourly' && (
          <DayDetailHourlyTab
            dayRecords={dayRecords}
            prevDayRecords={prevDayRecords}
            weatherHourly={dd.weatherHourly}
            prevWeatherHourly={dd.prevWeatherHourly}
            prevDateKey={prevDateKey}
            curDateKey={dateKey}
            weatherCandidates={weatherCandidates}
            weatherStoreId={weatherStoreId}
            weatherStoreName={weatherStoreName}
            onWeatherStoreChange={handleWeatherStoreChange}
          />
        )}

        {/* ── Tab: 仕入内訳 ── */}
        {tab === 'breakdown' && <DayDetailBreakdownTab record={record} actual={actual} />}
      </DetailModalContent>
    </PinModalOverlay>
  )
}
