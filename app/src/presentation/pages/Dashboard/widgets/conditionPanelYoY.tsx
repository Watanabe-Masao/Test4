/**
 * 前年比（売上・客数・点数・総仕入）の詳細パネル
 *
 * VM (conditionPanelYoY.vm.ts) で計算済みデータを受け取り、
 * レンダリングのみに専念する。
 *
 * 店舗行をクリック → 日別モーダル（テーブル/チャート切替）を表示。
 */
import { useState, useMemo, useCallback } from 'react'
import { formatPercent } from '@/domain/formatting'
import { calculateYoYRatio } from '@/domain/calculations/utils'
import {
  useCurrencyFormat,
  type CurrencyFormatter,
} from '@/presentation/components/charts/chartTheme'
import {
  type DailyYoYRow,
  type ItemsYoYDailyRow,
  buildDailyYoYRows,
  buildSalesYoYDetailVm,
  buildCustomerYoYDetailVm,
  buildItemsYoYDetailVm,
  buildTotalCostYoYDetailVm,
  buildDayMapping,
  buildItemsYoYStoreDailyRows,
} from './conditionPanelYoY.vm'
import type { PrevYearMonthlyKpi } from '@/application/comparison/comparisonTypes'
import type { CategoryTimeSalesRecord } from '@/domain/models/DataTypes'
import type { StoreResult } from '@/domain/models/storeTypes'
import type { Store } from '@/domain/models/record'
import type { ConditionSummaryConfig } from '@/domain/models/ConditionConfig'
import {
  DetailHeader,
  DetailTitle,
  ToggleGroup,
  ToggleBtn,
  BTable,
  BTh,
  BTd,
  BTr,
  BSignalDot,
} from './ConditionSummary.styles'
import {
  TotalSection,
  TotalGrid,
  TotalCell,
  SmallLabel,
  BigValue,
  AchValue,
  DrillOverlay,
  DailyModalPanel,
  DrillHeader,
  DrillTitle,
  DrillCloseBtn,
  DailyTableWrapper,
  DailyTable,
  DailyGroupTh,
  DailyTh,
  Footer,
  FooterNote,
  YoYBtn,
} from './ConditionSummaryEnhanced.styles'
import type { SalesYoYDetailProps, CustomerYoYDetailProps } from './conditionDetailTypes'

// ─── Daily YoY Rendering ──────────────────────────────

function renderDailyYoYRows(
  rows: readonly DailyYoYRow[],
  mode: 'cumulative' | 'daily',
  metric: 'sales' | 'customers',
  fmtCurrency: CurrencyFormatter,
): React.ReactNode[] {
  let cumCurrent = 0
  let cumPrev = 0

  return rows.map((row) => {
    const currentVal = metric === 'sales' ? row.currentSales : row.currentCustomers
    const prevVal = metric === 'sales' ? row.prevSales : row.prevCustomers
    cumCurrent += currentVal
    cumPrev += prevVal

    const displayCurrent = mode === 'cumulative' ? cumCurrent : currentVal
    const displayPrev = mode === 'cumulative' ? cumPrev : prevVal
    const yoy = calculateYoYRatio(displayCurrent, displayPrev)

    const fmtVal =
      metric === 'sales' ? (v: number) => fmtCurrency(v) : (v: number) => `${v.toLocaleString()}人`

    return (
      <BTr key={row.day}>
        <BTd>{row.day}日</BTd>
        <BTd>{fmtVal(displayCurrent)}</BTd>
        <BTd>{displayPrev > 0 ? fmtVal(displayPrev) : '—'}</BTd>
        <BTd>{displayPrev > 0 ? formatPercent(yoy, 2) : '—'}</BTd>
      </BTr>
    )
  })
}

// ─── Sales YoY Detail ──────────────────────────────────

export function SalesYoYDetailTable({
  sortedStoreEntries,
  stores,
  result,
  effectiveConfig,
  prevYear,
  prevYearMonthlyKpi,
  dataMaxDay,
}: SalesYoYDetailProps) {
  const [dailyMode, setDailyMode] = useState<'cumulative' | 'daily'>('cumulative')
  const { format: fmtCurrency } = useCurrencyFormat()

  const vm = useMemo(
    () =>
      buildSalesYoYDetailVm(
        sortedStoreEntries,
        stores,
        result,
        effectiveConfig,
        prevYear,
        prevYearMonthlyKpi,
        dataMaxDay,
        fmtCurrency,
      ),
    [
      sortedStoreEntries,
      stores,
      result,
      effectiveConfig,
      prevYear,
      prevYearMonthlyKpi,
      dataMaxDay,
      fmtCurrency,
    ],
  )

  return (
    <>
      <TotalSection>
        <TotalGrid>
          <TotalCell>
            <SmallLabel>当年売上</SmallLabel>
            <BigValue>{vm.totalCurrentStr}</BigValue>
          </TotalCell>
          <TotalCell $align="center">
            <SmallLabel>前年売上</SmallLabel>
            <BigValue>{vm.totalPrevStr}</BigValue>
          </TotalCell>
          <TotalCell $align="right">
            <SmallLabel>前年比</SmallLabel>
            <AchValue $color={vm.totalColor}>{vm.totalYoYStr}</AchValue>
          </TotalCell>
        </TotalGrid>
      </TotalSection>

      <DetailHeader style={{ padding: '12px 16px 0' }}>
        <DetailTitle>店舗内訳</DetailTitle>
      </DetailHeader>
      <BTable>
        <thead>
          <tr>
            <BTh>店舗名</BTh>
            <BTh>当年売上</BTh>
            <BTh>前年売上</BTh>
            <BTh>前年比</BTh>
          </tr>
        </thead>
        <tbody>
          {vm.storeRows.map((row) => (
            <BTr key={row.storeId}>
              <BTd>
                <BSignalDot $color={row.sigColor} />
                {row.storeName}
              </BTd>
              <BTd>{row.currentSalesStr}</BTd>
              <BTd>{row.prevSalesStr}</BTd>
              <BTd $color={row.sigColor}>{row.yoyStr}</BTd>
            </BTr>
          ))}
        </tbody>
      </BTable>

      {vm.hasDailyRows && (
        <>
          <DetailHeader style={{ marginTop: '16px', padding: '0 16px' }}>
            <DetailTitle>全店 日別推移</DetailTitle>
            <ToggleGroup>
              <ToggleBtn
                $active={dailyMode === 'cumulative'}
                onClick={() => setDailyMode('cumulative')}
              >
                累計
              </ToggleBtn>
              <ToggleBtn $active={dailyMode === 'daily'} onClick={() => setDailyMode('daily')}>
                日別
              </ToggleBtn>
            </ToggleGroup>
          </DetailHeader>
          <BTable>
            <thead>
              <tr>
                <BTh>日</BTh>
                <BTh>当年</BTh>
                <BTh>前年</BTh>
                <BTh>前年比</BTh>
              </tr>
            </thead>
            <tbody>{renderDailyYoYRows(vm.dailyRows, dailyMode, 'sales', fmtCurrency)}</tbody>
          </BTable>
        </>
      )}
    </>
  )
}

// ─── Customer YoY Detail ───────────────────────────────

export function CustomerYoYDetailTable({
  sortedStoreEntries,
  stores,
  result,
  effectiveConfig,
  prevYear,
  prevYearMonthlyKpi,
  dataMaxDay,
}: CustomerYoYDetailProps) {
  const [dailyStoreId, setDailyStoreId] = useState<string | null>(null)
  const [dailyMode, setDailyMode] = useState<'cumulative' | 'daily'>('cumulative')
  const { format: fmtCurrency } = useCurrencyFormat()

  const vm = useMemo(
    () =>
      buildCustomerYoYDetailVm(
        sortedStoreEntries,
        stores,
        result,
        effectiveConfig,
        prevYear,
        prevYearMonthlyKpi,
        dataMaxDay,
      ),
    [sortedStoreEntries, stores, result, effectiveConfig, prevYear, prevYearMonthlyKpi, dataMaxDay],
  )

  const handleStoreClick = useCallback((storeId: string) => {
    setDailyStoreId(storeId)
  }, [])

  const handleCloseModal = useCallback(() => {
    setDailyStoreId(null)
  }, [])

  // Per-store daily rows for modal
  const modalDailyRows = useMemo(() => {
    if (!dailyStoreId) return []
    const sr = sortedStoreEntries.find(([id]) => id === dailyStoreId)?.[1]
    if (!sr) return []
    return buildDailyYoYRows(sr, prevYearMonthlyKpi)
  }, [dailyStoreId, sortedStoreEntries, prevYearMonthlyKpi])

  const modalStoreName = dailyStoreId ? (stores.get(dailyStoreId)?.name ?? dailyStoreId) : ''

  return (
    <>
      <TotalSection>
        <TotalGrid>
          <TotalCell>
            <SmallLabel>当年客数</SmallLabel>
            <BigValue>{vm.totalCurrentStr}</BigValue>
          </TotalCell>
          <TotalCell $align="center">
            <SmallLabel>前年客数</SmallLabel>
            <BigValue>{vm.totalPrevStr}</BigValue>
          </TotalCell>
          <TotalCell $align="right">
            <SmallLabel>前年比</SmallLabel>
            <AchValue $color={vm.totalColor}>{vm.totalYoYStr}</AchValue>
          </TotalCell>
        </TotalGrid>
      </TotalSection>

      {vm.storeRows.length > 1 && (
        <>
          <DetailHeader style={{ padding: '12px 16px 0' }}>
            <DetailTitle>店舗内訳</DetailTitle>
          </DetailHeader>
          <BTable>
            <thead>
              <tr>
                <BTh>店舗名</BTh>
                <BTh>当年客数</BTh>
                <BTh>前年客数</BTh>
                <BTh>前年比</BTh>
              </tr>
            </thead>
            <tbody>
              {vm.storeRows.map((row) => (
                <BTr
                  key={row.storeId}
                  onClick={() => handleStoreClick(row.storeId)}
                  style={{ cursor: 'pointer' }}
                >
                  <BTd>
                    <BSignalDot $color={row.sigColor} />
                    {row.storeName}
                  </BTd>
                  <BTd>{row.currentCustomersStr}</BTd>
                  <BTd>{row.prevCustomersStr}</BTd>
                  <BTd $color={row.sigColor}>{row.yoyStr}</BTd>
                </BTr>
              ))}
            </tbody>
          </BTable>
        </>
      )}

      {vm.hasDailyRows && (
        <>
          <DetailHeader style={{ marginTop: '16px', padding: '0 16px' }}>
            <DetailTitle>全店 日別推移</DetailTitle>
            <ToggleGroup>
              <ToggleBtn
                $active={dailyMode === 'cumulative'}
                onClick={() => setDailyMode('cumulative')}
              >
                累計
              </ToggleBtn>
              <ToggleBtn $active={dailyMode === 'daily'} onClick={() => setDailyMode('daily')}>
                日別
              </ToggleBtn>
            </ToggleGroup>
          </DetailHeader>
          <BTable>
            <thead>
              <tr>
                <BTh>日</BTh>
                <BTh>当年</BTh>
                <BTh>前年</BTh>
                <BTh>前年比</BTh>
              </tr>
            </thead>
            <tbody>{renderDailyYoYRows(vm.dailyRows, dailyMode, 'customers', fmtCurrency)}</tbody>
          </BTable>
        </>
      )}

      {dailyStoreId != null && modalDailyRows.length > 0 && (
        <CustomerYoYDailyModal
          storeName={modalStoreName}
          dailyRows={modalDailyRows}
          onClose={handleCloseModal}
        />
      )}
    </>
  )
}

// ─── Customer YoY Daily Modal ─────────────────────────

function CustomerYoYDailyModal({
  storeName,
  dailyRows,
  onClose,
}: {
  readonly storeName: string
  readonly dailyRows: readonly DailyYoYRow[]
  readonly onClose: () => void
}) {
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table')
  const [dailyMode, setDailyMode] = useState<'cumulative' | 'daily'>('cumulative')
  const { format: fmtCurrency } = useCurrencyFormat()

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onClose()
    },
    [onClose],
  )

  // Build cumulative data for chart
  const cumulativeData = useMemo(
    () =>
      buildCumulativeYoYData(
        dailyRows,
        (r) => r.currentCustomers,
        (r) => r.prevCustomers,
      ),
    [dailyRows],
  )

  return (
    <DrillOverlay onClick={handleOverlayClick}>
      <DailyModalPanel onClick={(e) => e.stopPropagation()}>
        <DrillHeader>
          <DrillTitle>{storeName} — 客数 日別詳細</DrillTitle>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <YoYBtn
              $active={viewMode === 'chart'}
              onClick={() => setViewMode((p) => (p === 'table' ? 'chart' : 'table'))}
            >
              {viewMode === 'chart' ? '表' : 'グラフ'}
            </YoYBtn>
            <ToggleGroup>
              <ToggleBtn
                $active={dailyMode === 'cumulative'}
                onClick={() => setDailyMode('cumulative')}
              >
                累計
              </ToggleBtn>
              <ToggleBtn $active={dailyMode === 'daily'} onClick={() => setDailyMode('daily')}>
                日別
              </ToggleBtn>
            </ToggleGroup>
            <DrillCloseBtn onClick={onClose} aria-label="閉じる">
              ✕
            </DrillCloseBtn>
          </div>
        </DrillHeader>

        <DailyTableWrapper>
          {viewMode === 'chart' ? (
            <YoYDailyChart
              data={cumulativeData}
              unit="人"
              labelCurrent="当年累計"
              labelPrev="前年累計"
            />
          ) : (
            <DailyTable>
              <thead>
                <tr>
                  <DailyGroupTh $align="center">日</DailyGroupTh>
                  <DailyTh>当年</DailyTh>
                  <DailyTh>前年</DailyTh>
                  <DailyTh>前年比</DailyTh>
                </tr>
              </thead>
              <tbody>{renderDailyYoYRows(dailyRows, dailyMode, 'customers', fmtCurrency)}</tbody>
            </DailyTable>
          )}
        </DailyTableWrapper>

        <Footer>
          <FooterNote>前年同曜日比 / 単位：人</FooterNote>
        </Footer>
      </DailyModalPanel>
    </DrillOverlay>
  )
}

// ─── Items YoY Detail ─────────────────────────────────

export interface ItemsYoYDetailProps {
  readonly sortedStoreEntries: readonly [string, StoreResult][]
  readonly stores: ReadonlyMap<string, Store>
  readonly effectiveConfig: ConditionSummaryConfig
  readonly ctsRecords: readonly CategoryTimeSalesRecord[]
  readonly prevCtsRecords: readonly CategoryTimeSalesRecord[]
  readonly effectiveDay: number
  readonly prevYearMonthlyKpi: PrevYearMonthlyKpi
}

export function ItemsYoYDetailTable({
  sortedStoreEntries,
  stores,
  effectiveConfig,
  ctsRecords,
  prevCtsRecords,
  effectiveDay,
  prevYearMonthlyKpi,
}: ItemsYoYDetailProps) {
  const [dailyMode, setDailyMode] = useState<'cumulative' | 'daily'>('cumulative')
  const [dailyStoreId, setDailyStoreId] = useState<string | null>(null)

  const dayMapping = useMemo(
    () => buildDayMapping(prevYearMonthlyKpi.sameDow.dailyMapping),
    [prevYearMonthlyKpi],
  )

  const vm = useMemo(
    () =>
      buildItemsYoYDetailVm(
        sortedStoreEntries,
        stores,
        effectiveConfig,
        ctsRecords,
        prevCtsRecords,
        effectiveDay,
        dayMapping,
      ),
    [
      sortedStoreEntries,
      stores,
      effectiveConfig,
      ctsRecords,
      prevCtsRecords,
      effectiveDay,
      dayMapping,
    ],
  )

  const handleStoreClick = useCallback((storeId: string) => {
    setDailyStoreId(storeId)
  }, [])

  const handleCloseModal = useCallback(() => {
    setDailyStoreId(null)
  }, [])

  // Per-store daily rows for modal
  const modalDailyRows = useMemo(() => {
    if (!dailyStoreId) return []
    return buildItemsYoYStoreDailyRows(
      ctsRecords,
      prevCtsRecords,
      effectiveDay,
      dailyStoreId,
      dayMapping,
    )
  }, [dailyStoreId, ctsRecords, prevCtsRecords, effectiveDay, dayMapping])

  const modalStoreName = dailyStoreId ? (stores.get(dailyStoreId)?.name ?? dailyStoreId) : ''

  return (
    <>
      <TotalSection>
        <TotalGrid>
          <TotalCell>
            <SmallLabel>当年点数</SmallLabel>
            <BigValue>{vm.totalCurrentStr}</BigValue>
          </TotalCell>
          <TotalCell $align="center">
            <SmallLabel>前年点数</SmallLabel>
            <BigValue>{vm.totalPrevStr}</BigValue>
          </TotalCell>
          <TotalCell $align="right">
            <SmallLabel>前年比</SmallLabel>
            <AchValue $color={vm.totalColor}>{vm.totalYoYStr}</AchValue>
          </TotalCell>
        </TotalGrid>
      </TotalSection>

      {vm.storeRows.length > 1 && (
        <>
          <DetailHeader style={{ padding: '12px 16px 0' }}>
            <DetailTitle>店舗内訳</DetailTitle>
          </DetailHeader>
          <BTable>
            <thead>
              <tr>
                <BTh>店舗名</BTh>
                <BTh>当年点数</BTh>
                <BTh>前年点数</BTh>
                <BTh>前年比</BTh>
              </tr>
            </thead>
            <tbody>
              {vm.storeRows.map((row) => (
                <BTr
                  key={row.storeId}
                  onClick={() => handleStoreClick(row.storeId)}
                  style={{ cursor: 'pointer' }}
                >
                  <BTd>
                    <BSignalDot $color={row.sigColor} />
                    {row.storeName}
                  </BTd>
                  <BTd>{row.currentQtyStr}</BTd>
                  <BTd>{row.prevQtyStr}</BTd>
                  <BTd $color={row.sigColor}>{row.yoyStr}</BTd>
                </BTr>
              ))}
            </tbody>
          </BTable>
        </>
      )}

      {vm.hasDailyRows && (
        <>
          <DetailHeader style={{ marginTop: '16px', padding: '0 16px' }}>
            <DetailTitle>全店 日別推移</DetailTitle>
            <ToggleGroup>
              <ToggleBtn
                $active={dailyMode === 'cumulative'}
                onClick={() => setDailyMode('cumulative')}
              >
                累計
              </ToggleBtn>
              <ToggleBtn $active={dailyMode === 'daily'} onClick={() => setDailyMode('daily')}>
                日別
              </ToggleBtn>
            </ToggleGroup>
          </DetailHeader>
          <BTable>
            <thead>
              <tr>
                <BTh>日</BTh>
                <BTh>当年</BTh>
                <BTh>前年</BTh>
                <BTh>前年比</BTh>
              </tr>
            </thead>
            <tbody>{renderItemsDailyRows(vm.dailyRows, dailyMode)}</tbody>
          </BTable>
        </>
      )}

      {dailyStoreId != null && modalDailyRows.length > 0 && (
        <ItemsYoYDailyModal
          storeName={modalStoreName}
          dailyRows={modalDailyRows}
          onClose={handleCloseModal}
        />
      )}
    </>
  )
}

// ─── Items YoY Daily Row Renderer ─────────────────────

function renderItemsDailyRows(
  rows: readonly ItemsYoYDailyRow[],
  mode: 'cumulative' | 'daily',
): React.ReactNode[] {
  let cumCur = 0
  let cumPrev = 0

  return rows.map((row) => {
    cumCur += row.currentQty
    cumPrev += row.prevQty
    const cur = mode === 'cumulative' ? cumCur : row.currentQty
    const prev = mode === 'cumulative' ? cumPrev : row.prevQty
    const yoy = calculateYoYRatio(cur, prev)

    return (
      <BTr key={row.day}>
        <BTd>{row.day}日</BTd>
        <BTd>{cur.toLocaleString()}点</BTd>
        <BTd>{prev > 0 ? `${prev.toLocaleString()}点` : '—'}</BTd>
        <BTd>{prev > 0 ? formatPercent(yoy, 2) : '—'}</BTd>
      </BTr>
    )
  })
}

// ─── Items YoY Daily Modal ────────────────────────────

function ItemsYoYDailyModal({
  storeName,
  dailyRows,
  onClose,
}: {
  readonly storeName: string
  readonly dailyRows: readonly ItemsYoYDailyRow[]
  readonly onClose: () => void
}) {
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table')
  const [dailyMode, setDailyMode] = useState<'cumulative' | 'daily'>('cumulative')

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onClose()
    },
    [onClose],
  )

  // Build cumulative data for chart
  const cumulativeData = useMemo(
    () =>
      buildCumulativeYoYData(
        dailyRows,
        (r) => r.currentQty,
        (r) => r.prevQty,
      ),
    [dailyRows],
  )

  return (
    <DrillOverlay onClick={handleOverlayClick}>
      <DailyModalPanel onClick={(e) => e.stopPropagation()}>
        <DrillHeader>
          <DrillTitle>{storeName} — 販売点数 日別詳細</DrillTitle>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <YoYBtn
              $active={viewMode === 'chart'}
              onClick={() => setViewMode((p) => (p === 'table' ? 'chart' : 'table'))}
            >
              {viewMode === 'chart' ? '表' : 'グラフ'}
            </YoYBtn>
            <ToggleGroup>
              <ToggleBtn
                $active={dailyMode === 'cumulative'}
                onClick={() => setDailyMode('cumulative')}
              >
                累計
              </ToggleBtn>
              <ToggleBtn $active={dailyMode === 'daily'} onClick={() => setDailyMode('daily')}>
                日別
              </ToggleBtn>
            </ToggleGroup>
            <DrillCloseBtn onClick={onClose} aria-label="閉じる">
              ✕
            </DrillCloseBtn>
          </div>
        </DrillHeader>

        <DailyTableWrapper>
          {viewMode === 'chart' ? (
            <YoYDailyChart
              data={cumulativeData}
              unit="点"
              labelCurrent="当年累計"
              labelPrev="前年累計"
            />
          ) : (
            <DailyTable>
              <thead>
                <tr>
                  <DailyGroupTh $align="center">日</DailyGroupTh>
                  <DailyTh>当年</DailyTh>
                  <DailyTh>前年</DailyTh>
                  <DailyTh>前年比</DailyTh>
                </tr>
              </thead>
              <tbody>{renderItemsDailyRows(dailyRows, dailyMode)}</tbody>
            </DailyTable>
          )}
        </DailyTableWrapper>

        <Footer>
          <FooterNote>前年同曜日比 / 単位：点</FooterNote>
        </Footer>
      </DailyModalPanel>
    </DrillOverlay>
  )
}

// ─── Shared YoY Daily SVG Chart ───────────────────────

interface YoYDailyChartData {
  readonly day: number
  readonly cumCurrent: number
  readonly cumPrev: number
}

/** Build cumulative chart data from daily rows without mutable reassignment */
function buildCumulativeYoYData<T extends { readonly day: number }>(
  rows: readonly T[],
  getCurrent: (row: T) => number,
  getPrev: (row: T) => number,
): readonly YoYDailyChartData[] {
  const result: YoYDailyChartData[] = []
  let cumCur = 0
  let cumPrev = 0
  for (const row of rows) {
    cumCur += getCurrent(row)
    cumPrev += getPrev(row)
    result.push({ day: row.day, cumCurrent: cumCur, cumPrev })
  }
  return result
}

function YoYDailyChart({
  data,
  unit,
  labelCurrent,
  labelPrev,
}: {
  readonly data: readonly YoYDailyChartData[]
  readonly unit: string
  readonly labelCurrent: string
  readonly labelPrev: string
}) {
  if (data.length === 0) return null

  const W = 800
  const H = 300
  const PL = 70
  const PR = 16
  const PT = 16
  const PB = 40
  const chartW = W - PL - PR
  const chartH = H - PT - PB

  const maxCur = Math.max(...data.map((d) => d.cumCurrent))
  const maxPrev = Math.max(...data.map((d) => d.cumPrev))
  const maxVal = Math.max(maxCur, maxPrev) || 1

  const xScale = (i: number) => PL + (i / (data.length - 1 || 1)) * chartW
  const yScale = (v: number) => PT + chartH - (v / maxVal) * chartH

  const currentPath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${xScale(i)},${yScale(d.cumCurrent)}`)
    .join('')
  const prevPath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${xScale(i)},${yScale(d.cumPrev)}`)
    .join('')

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((r) => Math.round(maxVal * r))

  const fmtLabel = (v: number) => `${v.toLocaleString()}${unit}`

  return (
    <div style={{ padding: '8px 16px', overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W, height: 'auto' }}>
        {/* Y gridlines & labels */}
        {yTicks.map((v) => (
          <g key={v}>
            <line
              x1={PL}
              x2={W - PR}
              y1={yScale(v)}
              y2={yScale(v)}
              stroke="#e5e7eb"
              strokeWidth={0.5}
            />
            <text x={PL - 4} y={yScale(v) + 4} textAnchor="end" fontSize={10} fill="#9ca3af">
              {fmtLabel(v)}
            </text>
          </g>
        ))}
        {/* X labels */}
        {data
          .filter(
            (_, i) => i % Math.max(1, Math.floor(data.length / 10)) === 0 || i === data.length - 1,
          )
          .map((d) => {
            const i = data.indexOf(d)
            return (
              <text
                key={d.day}
                x={xScale(i)}
                y={H - 4}
                textAnchor="middle"
                fontSize={10}
                fill="#6b7280"
              >
                {d.day}日
              </text>
            )
          })}
        {/* Current year line (solid blue) */}
        <path d={currentPath} fill="none" stroke="#3b82f6" strokeWidth={2} />
        {/* Prev year line (dashed amber) */}
        <path d={prevPath} fill="none" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="6 3" />
        {/* Last point markers */}
        {data.length > 0 && (
          <>
            <circle
              cx={xScale(data.length - 1)}
              cy={yScale(data[data.length - 1].cumCurrent)}
              r={4}
              fill="#3b82f6"
            />
            <circle
              cx={xScale(data.length - 1)}
              cy={yScale(data[data.length - 1].cumPrev)}
              r={3}
              fill="#f59e0b"
            />
          </>
        )}
      </svg>
      <div
        style={{
          display: 'flex',
          gap: 16,
          justifyContent: 'center',
          fontSize: '0.75rem',
          color: '#6b7280',
        }}
      >
        <span>
          <span style={{ color: '#3b82f6' }}>━</span> {labelCurrent}
        </span>
        <span>
          <span style={{ color: '#f59e0b' }}>╌</span> {labelPrev}
        </span>
      </div>
    </div>
  )
}

// ─── TotalCost YoY Detail ─────────────────────────────

export interface TotalCostYoYDetailProps {
  readonly sortedStoreEntries: readonly [string, StoreResult][]
  readonly stores: ReadonlyMap<string, Store>
  readonly effectiveConfig: ConditionSummaryConfig
  readonly prevYearStoreCostPrice?: ReadonlyMap<string, { cost: number; price: number }>
  readonly fmtCurrency: (n: number) => string
}

export function TotalCostYoYDetailTable({
  sortedStoreEntries,
  stores,
  effectiveConfig,
  prevYearStoreCostPrice,
}: TotalCostYoYDetailProps) {
  const { format: fmtCurrency } = useCurrencyFormat()

  const vm = useMemo(
    () =>
      buildTotalCostYoYDetailVm(
        sortedStoreEntries,
        stores,
        effectiveConfig,
        prevYearStoreCostPrice,
        fmtCurrency,
      ),
    [sortedStoreEntries, stores, effectiveConfig, prevYearStoreCostPrice, fmtCurrency],
  )

  return (
    <>
      <TotalSection>
        <TotalGrid>
          <TotalCell>
            <SmallLabel>当年総仕入</SmallLabel>
            <BigValue>{vm.totalCurrentStr}</BigValue>
          </TotalCell>
          <TotalCell $align="center">
            <SmallLabel>前年総仕入</SmallLabel>
            <BigValue>{vm.totalPrevStr}</BigValue>
          </TotalCell>
          <TotalCell $align="right">
            <SmallLabel>前年比</SmallLabel>
            <AchValue $color={vm.totalColor}>{vm.totalYoYStr}</AchValue>
          </TotalCell>
        </TotalGrid>
      </TotalSection>

      {vm.storeRows.length > 1 && (
        <>
          <DetailHeader style={{ padding: '12px 16px 0' }}>
            <DetailTitle>店舗内訳</DetailTitle>
          </DetailHeader>
          <BTable>
            <thead>
              <tr>
                <BTh>店舗名</BTh>
                <BTh>当年仕入</BTh>
                <BTh>前年仕入</BTh>
                <BTh>前年比</BTh>
              </tr>
            </thead>
            <tbody>
              {vm.storeRows.map((row) => (
                <BTr key={row.storeId}>
                  <BTd>
                    <BSignalDot $color={row.sigColor} />
                    {row.storeName}
                  </BTd>
                  <BTd>{row.currentCostStr}</BTd>
                  <BTd>{row.prevCostStr}</BTd>
                  <BTd $color={row.sigColor}>{row.yoyStr}</BTd>
                </BTr>
              ))}
            </tbody>
          </BTable>
        </>
      )}
    </>
  )
}
