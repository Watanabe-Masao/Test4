/**
 * 前年比（客数・販売点数）の日別モーダル
 *
 * 店舗行クリック → 日別詳細をテーブル or チャートで表示する。
 * conditionPanelYoY.tsx から分離（G6: 600行上限）。
 */
import { useState, useMemo, useCallback } from 'react'
import { formatPercent } from '@/domain/formatting'
import { calculateYoYRatio } from '@/domain/calculations/utils'
import type { DailyYoYRow, ItemsYoYDailyRow } from './conditionPanelYoY.vm'
import { ToggleGroup, ToggleBtn, BTr, BTd } from './ConditionSummary.styles'
import {
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

// ─── Daily YoY Rendering (shared) ─────────────────────

function renderDailyYoYRows(
  rows: readonly DailyYoYRow[],
  mode: 'cumulative' | 'daily',
): React.ReactNode[] {
  let cumCurrent = 0
  let cumPrev = 0

  return rows.map((row) => {
    const currentVal = row.currentCustomers
    const prevVal = row.prevCustomers
    cumCurrent += currentVal
    cumPrev += prevVal

    const displayCurrent = mode === 'cumulative' ? cumCurrent : currentVal
    const displayPrev = mode === 'cumulative' ? cumPrev : prevVal
    const yoy = calculateYoYRatio(displayCurrent, displayPrev)

    const fmtVal = (v: number) => `${v.toLocaleString()}人`

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

// ─── Chart Data ───────────────────────────────────────

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

// ─── Customer YoY Daily Modal ─────────────────────────

export function CustomerYoYDailyModal({
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

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onClose()
    },
    [onClose],
  )

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
              <tbody>{renderDailyYoYRows(dailyRows, dailyMode)}</tbody>
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

// ─── Items YoY Daily Modal ────────────────────────────

export function ItemsYoYDailyModal({
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
