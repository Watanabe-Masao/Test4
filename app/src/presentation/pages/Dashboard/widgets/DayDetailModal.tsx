/**
 * 日別詳細モーダル — カレンダー/テーブルから日を選択した際に表示。
 * 売上分析・時間帯分析・仕入内訳の3タブ構成。
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
  calculateShare,
  calculateTransactionValue,
} from '@/domain/calculations/utils'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange, ComparisonFrame } from '@/domain/models/calendar'
import type { DailyRecord, CategoryTimeSalesRecord } from '@/domain/models/record'
import { toDateKeyFromParts } from '@/domain/models/CalendarDate'
import { useDuckDBCategoryTimeRecords, useDuckDBWeatherHourly } from '@/application/hooks/duckdb'
import type { PrevYearData } from '@/application/hooks/analytics'
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
  DetailSection,
  DetailSectionTitle,
  DetailRow,
  DetailLabel,
  DetailValue,
  DetailColumns,
} from '../DashboardPage.styles'
import {
  TabBar,
  Tab,
  KpiGrid2,
  KpiMini,
  KpiMiniLabel,
  KpiMiniValue,
  KpiMiniSub,
  ToggleGroup,
  ToggleBtn,
} from './DayDetailModal.styles'
import { HourlyChart } from './HourlyChart'
import { CategoryDrilldown } from './CategoryDrilldown'
import { DrilldownWaterfall } from './DrilldownWaterfall'

type ModalTab = 'sales' | 'hourly' | 'breakdown'
type CompMode = 'yoy' | 'wow'

const EMPTY_RECORDS: readonly CategoryTimeSalesRecord[] = []
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
  /** DuckDB コネクション */
  duckConn: AsyncDuckDBConnection | null
  /** DuckDB データバージョン（0 = 未ロード） */
  duckDataVersion: number
  /** 当年の全日別データ（前週比用） */
  dailyMap?: ReadonlyMap<number, DailyRecord>
  /** 選択中の店舗IDセット（空=全店舗） */
  selectedStoreIds?: ReadonlySet<string>
  /** 比較フレーム（前年期間を統一的に取得） */
  comparisonFrame: ComparisonFrame
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
  duckConn,
  duckDataVersion,
  dailyMap,
  selectedStoreIds,
  comparisonFrame,
  onClose,
}: DayDetailModalProps) {
  const { formatWithUnit: fmtCurrencyWithUnit } = useCurrencyFormat()
  const [tab, setTab] = useState<ModalTab>('sales')
  const [compMode, setCompMode] = useState<CompMode>('yoy')
  const DOW_NAMES = ['日', '月', '火', '水', '木', '金', '土']

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
  const pySales = prevYear.daily.get(toDateKeyFromParts(year, month, day))?.sales ?? 0
  const pyRatio = calculateYoYRatio(actual, pySales)
  const dayOfWeek = DOW_NAMES[new Date(year, month - 1, day).getDay()]

  // ── Customer metrics ──
  const dayCust = record?.customers ?? 0
  const dayTxVal = calculateTransactionValue(actual, dayCust)
  const pyCust = prevYear.daily.get(toDateKeyFromParts(year, month, day))?.customers ?? 0
  const pyTxVal = calculateTransactionValue(pySales, pyCust)
  const cumTxVal = calculateTransactionValue(cumSales, cumCustomers)
  const cumPrevTxVal = calculateTransactionValue(cumPrevYear, cumPrevCustomers)
  const custRatio = calculateYoYRatio(dayCust, pyCust)
  const txValRatio = calculateYoYRatio(dayTxVal, pyTxVal)

  // ── WoW metrics (前週比) ──
  const wowDailyRecord = canWoW && dailyMap ? dailyMap.get(wowPrevDay) : undefined
  const wowPrevSales = wowDailyRecord?.sales ?? 0
  const wowPrevCust = wowDailyRecord?.customers ?? 0
  // ── Category records（DuckDB から取得） ──
  const storeIdsSet = selectedStoreIds ?? EMPTY_STORE_IDS

  // ── 天気データ（DuckDB weather_hourly から取得） ──
  const storeLocations = useSettingsStore((s) => s.settings.storeLocations)
  const storeMap = useDataStore((s) => s.data.stores)
  const [weatherStoreOverride, setWeatherStoreOverride] = useState<string | null>(null)

  // 天気取得可能な店舗リスト（位置情報あり）
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
  const weatherResult = useDuckDBWeatherHourly(duckConn, duckDataVersion, weatherStoreId, dateKey)

  // 前年天気データ
  const prevDateKey = useMemo(() => {
    const curDate = new Date(year, month - 1, day)
    const prevDate = new Date(curDate.getTime() + comparisonFrame.dowOffset * 86400000)
    const py = prevDate.getFullYear()
    const pm = String(prevDate.getMonth() + 1).padStart(2, '0')
    const pd = String(prevDate.getDate()).padStart(2, '0')
    return `${py}-${pm}-${pd}`
  }, [year, month, day, comparisonFrame.dowOffset])
  const prevWeatherResult = useDuckDBWeatherHourly(
    duckConn,
    duckDataVersion,
    weatherStoreId,
    prevDateKey,
  )

  const singleDayRange: DateRange = useMemo(
    () => ({
      from: { year, month, day },
      to: { year, month, day },
    }),
    [year, month, day],
  )

  const dayResult = useDuckDBCategoryTimeRecords(
    duckConn,
    duckDataVersion,
    singleDayRange,
    storeIdsSet,
  )
  const dayRecords = dayResult.data ?? EMPTY_RECORDS

  const prevDayRange: DateRange = useMemo(() => {
    // dowOffset を使って正確な比較日を計算（同曜日モードでも正しい1日を特定）
    const curDate = new Date(year, month - 1, day)
    const prevDate = new Date(curDate.getTime() + comparisonFrame.dowOffset * 86400000)
    const py = prevDate.getFullYear()
    const pm = prevDate.getMonth() + 1
    const pd = prevDate.getDate()
    return {
      from: { year: py, month: pm, day: pd },
      to: { year: py, month: pm, day: pd },
    }
  }, [year, month, day, comparisonFrame.dowOffset])

  const prevDayResult = useDuckDBCategoryTimeRecords(
    duckConn,
    duckDataVersion,
    prevDayRange,
    storeIdsSet,
    true,
  )
  // フォールバック: 前年データが is_prev_year=false で格納されている場合（前年運用時にインポート）
  const prevDayFallbackResult = useDuckDBCategoryTimeRecords(
    duckConn,
    duckDataVersion,
    prevDayRange,
    storeIdsSet,
  )
  const prevDayRecords =
    (prevDayResult.data ?? []).length > 0
      ? (prevDayResult.data ?? EMPTY_RECORDS)
      : (prevDayFallbackResult.data ?? EMPTY_RECORDS)

  // WoW用: 前週(day-7)のカテゴリレコード
  const wowPrevDayRange: DateRange | undefined = useMemo(
    () =>
      canWoW
        ? {
            from: { year, month, day: wowPrevDay },
            to: { year, month, day: wowPrevDay },
          }
        : undefined,
    [canWoW, year, month, wowPrevDay],
  )

  const wowResult = useDuckDBCategoryTimeRecords(
    duckConn,
    duckDataVersion,
    wowPrevDayRange,
    storeIdsSet,
  )
  const wowPrevDayRecords = wowResult.data ?? EMPTY_RECORDS

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

  // 累計カテゴリレコード（1日〜当日）
  const cumDateRange: DateRange = useMemo(
    () => ({
      from: { year, month, day: 1 },
      to: { year, month, day },
    }),
    [year, month, day],
  )

  const cumResult = useDuckDBCategoryTimeRecords(
    duckConn,
    duckDataVersion,
    cumDateRange,
    storeIdsSet,
  )
  const cumCategoryRecords = cumResult.data ?? EMPTY_RECORDS

  const cumPrevDateRange: DateRange = useMemo(() => {
    // dowOffset を使って正確な累計終了日を計算（同曜日モードでも正しい日を特定）
    const curDate = new Date(year, month - 1, day)
    const prevDate = new Date(curDate.getTime() + comparisonFrame.dowOffset * 86400000)
    const py = prevDate.getFullYear()
    const pm = prevDate.getMonth() + 1
    const pd = prevDate.getDate()
    return {
      from: { year: py, month: pm, day: 1 },
      to: { year: py, month: pm, day: pd },
    }
  }, [year, month, day, comparisonFrame.dowOffset])

  const cumPrevResult = useDuckDBCategoryTimeRecords(
    duckConn,
    duckDataVersion,
    cumPrevDateRange,
    storeIdsSet,
    true,
  )
  const cumPrevFallbackResult = useDuckDBCategoryTimeRecords(
    duckConn,
    duckDataVersion,
    cumPrevDateRange,
    storeIdsSet,
  )
  const cumPrevCategoryRecords =
    (cumPrevResult.data ?? []).length > 0
      ? (cumPrevResult.data ?? EMPTY_RECORDS)
      : (cumPrevFallbackResult.data ?? EMPTY_RECORDS)

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
          <>
            {/* 比較モード切替: 比較期比 / 前週比 */}
            {(prevYear.hasPrevYear || canWoW) && (
              <ToggleGroup style={{ marginBottom: '12px' }}>
                <ToggleBtn $active={compMode === 'yoy'} onClick={() => setCompMode('yoy')}>
                  比較期比
                </ToggleBtn>
                <ToggleBtn
                  $active={compMode === 'wow'}
                  onClick={() => {
                    if (canWoW) setCompMode('wow')
                  }}
                  style={canWoW ? undefined : { opacity: 0.4, cursor: 'not-allowed' }}
                >
                  前週比
                </ToggleBtn>
              </ToggleGroup>
            )}
            {compSales > 0 && (
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
                  {prevYear.hasPrevYear && cumPrevYear > 0 && (
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
        )}

        {/* ── Tab: 時間帯分析 ── */}
        {tab === 'hourly' && (
          <>
            {/* 天気データ用店舗セレクタ */}
            {weatherCandidates.length > 1 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginBottom: 8,
                  fontSize: '0.65rem',
                }}
              >
                <span style={{ opacity: 0.6 }}>天気データ:</span>
                <select
                  value={weatherStoreId}
                  onChange={handleWeatherStoreChange}
                  style={{
                    fontSize: '0.65rem',
                    padding: '2px 6px',
                    borderRadius: 4,
                    border: `1px solid ${palette.slate}`,
                    background: 'transparent',
                    color: 'inherit',
                  }}
                >
                  {weatherCandidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {weatherCandidates.length === 1 && weatherStoreName && (
              <div style={{ fontSize: '0.6rem', opacity: 0.5, marginBottom: 4 }}>
                天気データ: {weatherStoreName}
              </div>
            )}
            <HourlyChart
              dayRecords={dayRecords}
              prevDayRecords={prevDayRecords}
              weatherHourly={weatherResult.data ?? undefined}
              prevWeatherHourly={prevWeatherResult.data ?? undefined}
              prevDateKey={prevDateKey}
              curDateKey={dateKey}
            />
            {dayRecords.length === 0 && (
              <DetailSection>
                <DetailSectionTitle>時間帯別売上</DetailSectionTitle>
                <DetailRow>
                  <DetailLabel>データなし</DetailLabel>
                  <DetailValue>-</DetailValue>
                </DetailRow>
              </DetailSection>
            )}
          </>
        )}

        {/* ── Tab: 仕入内訳 ── */}
        {tab === 'breakdown' && (
          <DetailSection>
            <DetailSectionTitle>仕入・コスト内訳</DetailSectionTitle>
            {record ? (
              (() => {
                const totalCost = record.totalCost
                const costItems: { label: string; cost: number; price: number }[] = [
                  {
                    label: '仕入（在庫）',
                    cost: record.purchase.cost,
                    price: record.purchase.price,
                  },
                  { label: '花', cost: record.flowers.cost, price: record.flowers.price },
                  {
                    label: '産直',
                    cost: record.directProduce.cost,
                    price: record.directProduce.price,
                  },
                  {
                    label: '店間入',
                    cost: record.interStoreIn.cost,
                    price: record.interStoreIn.price,
                  },
                  {
                    label: '店間出',
                    cost: record.interStoreOut.cost,
                    price: record.interStoreOut.price,
                  },
                  {
                    label: '部門間入',
                    cost: record.interDepartmentIn.cost,
                    price: record.interDepartmentIn.price,
                  },
                  {
                    label: '部門間出',
                    cost: record.interDepartmentOut.cost,
                    price: record.interDepartmentOut.price,
                  },
                ].filter((item) => item.cost !== 0 || item.price !== 0)
                const totalPrice = costItems.reduce((sum, item) => sum + Math.abs(item.price), 0)

                return (
                  <>
                    {costItems.map((item) => {
                      const ratio = calculateShare(Math.abs(item.price), totalPrice)
                      return (
                        <DetailRow key={item.label}>
                          <DetailLabel>{item.label}</DetailLabel>
                          <DetailValue>
                            {fmtCurrencyWithUnit(item.price)}{' '}
                            <span style={{ color: palette.slate, fontSize: '0.75rem' }}>
                              (原 {fmtCurrencyWithUnit(item.cost)})
                            </span>
                            <span
                              style={{
                                color: palette.primary,
                                fontSize: '0.75rem',
                                marginLeft: '4px',
                              }}
                            >
                              ({formatPercent(ratio)})
                            </span>
                          </DetailValue>
                        </DetailRow>
                      )
                    })}
                    <DetailRow>
                      <DetailLabel>総仕入原価</DetailLabel>
                      <DetailValue>{fmtCurrencyWithUnit(totalCost)}</DetailValue>
                    </DetailRow>
                    {actual > 0 && totalCost > 0 && (
                      <DetailRow>
                        <DetailLabel>原価率</DetailLabel>
                        <DetailValue>{formatPercent(totalCost / actual)}</DetailValue>
                      </DetailRow>
                    )}
                    {record.costInclusion.cost > 0 && (
                      <DetailRow>
                        <DetailLabel>原価算入費</DetailLabel>
                        <DetailValue>{fmtCurrencyWithUnit(record.costInclusion.cost)}</DetailValue>
                      </DetailRow>
                    )}
                    {record.discountAmount !== 0 && (
                      <>
                        <DetailRow>
                          <DetailLabel>売変額</DetailLabel>
                          <DetailValue $color={sc.negative}>
                            {fmtCurrencyWithUnit(record.discountAmount)}
                          </DetailValue>
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
              })()
            ) : (
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
