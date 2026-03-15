/**
 * カテゴリ別日別ピボットテーブル（タブ切り替え・小計付き）
 */
import { Fragment, useState, useMemo, memo } from 'react'
import { formatPercent } from '@/domain/formatting'
import { useCurrencyFormat } from '@/presentation/components/charts/chartTheme'
import type {
  PurchaseDailyPivotData,
  PurchaseDailyPivotRow,
} from '@/domain/models/PurchaseComparison'
import {
  Table,
  Th,
  Td,
  DiffCell,
  TrTotal,
  EmptyState,
  PivotTableWrapper,
  PivotGroupTh,
  PivotSubTh,
  PivotTd,
  TabBar,
  TabButton,
  ToggleRow,
  TrSubtotal,
  DowCell,
} from './PurchaseAnalysisPage.styles'
import { DOW_LABELS, DOW_OPTIONS, diffColor } from './purchaseAnalysisHelpers'

// ── 小計計算 ──

interface WeekSubtotal {
  readonly afterDay: number
  readonly cells: Readonly<
    Record<string, { cost: number; price: number; prevCost: number; prevPrice: number }>
  >
  readonly totalCost: number
  readonly totalPrice: number
  readonly prevTotalCost: number
  readonly prevTotalPrice: number
}

function computeSubtotals(
  rows: readonly PurchaseDailyPivotRow[],
  columnKeys: readonly string[],
  startDow: number,
): WeekSubtotal[] {
  const result: WeekSubtotal[] = []
  const emptyAccum = () => ({ cost: 0, price: 0, prevCost: 0, prevPrice: 0 })
  let accum: Record<string, { cost: number; price: number; prevCost: number; prevPrice: number }> =
    {}
  for (const k of columnKeys) accum[k] = emptyAccum()
  let totalCost = 0
  let totalPrice = 0
  let prevTotalCost = 0
  let prevTotalPrice = 0
  let count = 0

  // 小計は「選択した曜日の前日」で締める（＝選択曜日が週の開始日）
  const endDow = (startDow + 6) % 7

  for (const row of rows) {
    for (const k of columnKeys) {
      const c = row.cells[k]
      accum[k].cost += c.cost
      accum[k].price += c.price
      accum[k].prevCost += c.prevCost
      accum[k].prevPrice += c.prevPrice
    }
    totalCost += row.totalCost
    totalPrice += row.totalPrice
    prevTotalCost += row.prevTotalCost
    prevTotalPrice += row.prevTotalPrice
    count++

    if (row.dayOfWeek === endDow && count > 0) {
      result.push({
        afterDay: row.day,
        cells: { ...accum },
        totalCost,
        totalPrice,
        prevTotalCost,
        prevTotalPrice,
      })
      accum = {}
      for (const k of columnKeys) accum[k] = emptyAccum()
      totalCost = 0
      totalPrice = 0
      prevTotalCost = 0
      prevTotalPrice = 0
      count = 0
    }
  }
  // 残りを最後の小計として追加
  if (count > 0) {
    result.push({
      afterDay: rows[rows.length - 1].day,
      cells: { ...accum },
      totalCost,
      totalPrice,
      prevTotalCost,
      prevTotalPrice,
    })
  }
  return result
}

// ── コンポーネント ──

export const PurchaseDailyPivotTable = memo(function PurchaseDailyPivotTable({
  pivot,
}: {
  pivot: PurchaseDailyPivotData
}) {
  const { format: fmtCurrency } = useCurrencyFormat()
  const fmtOrDash = (val: number) => (val !== 0 ? fmtCurrency(val) : '-')
  const [activeTab, setActiveTab] = useState<string>('__all__')
  const [showSubtotals, setShowSubtotals] = useState(true)
  const [subtotalStartDow, setSubtotalStartDow] = useState(1) // デフォルト: 月曜起点

  const columnKeys = useMemo(() => pivot.columns.map((c) => c.key), [pivot.columns])

  const subtotalMap = useMemo(() => {
    if (!showSubtotals) return new Map<number, WeekSubtotal>()
    const subs = computeSubtotals(pivot.rows, columnKeys, subtotalStartDow)
    return new Map(subs.map((s) => [s.afterDay, s]))
  }, [pivot.rows, columnKeys, subtotalStartDow, showSubtotals])

  const isAllTab = activeTab === '__all__'
  const activeCol = pivot.columns.find((c) => c.key === activeTab)

  // セルの値を取得するヘルパー
  const getCost = (row: PurchaseDailyPivotRow) =>
    isAllTab ? row.totalCost : (row.cells[activeTab]?.cost ?? 0)
  const getPrice = (row: PurchaseDailyPivotRow) =>
    isAllTab ? row.totalPrice : (row.cells[activeTab]?.price ?? 0)
  const getPrevCost = (row: PurchaseDailyPivotRow) =>
    isAllTab ? row.prevTotalCost : (row.cells[activeTab]?.prevCost ?? 0)
  const getPrevPrice = (row: PurchaseDailyPivotRow) =>
    isAllTab ? row.prevTotalPrice : (row.cells[activeTab]?.prevPrice ?? 0)

  const getSubCost = (sub: WeekSubtotal) =>
    isAllTab ? sub.totalCost : (sub.cells[activeTab]?.cost ?? 0)
  const getSubPrice = (sub: WeekSubtotal) =>
    isAllTab ? sub.totalPrice : (sub.cells[activeTab]?.price ?? 0)
  const getSubPrevCost = (sub: WeekSubtotal) =>
    isAllTab ? sub.prevTotalCost : (sub.cells[activeTab]?.prevCost ?? 0)
  const getSubPrevPrice = (sub: WeekSubtotal) =>
    isAllTab ? sub.prevTotalPrice : (sub.cells[activeTab]?.prevPrice ?? 0)

  // 累計を計算（hooks はすべて early return より前に配置）
  const cumulativeRows = useMemo(() => {
    interface CumRow {
      cumCost: number
      cumPrice: number
      cumPrevCost: number
      cumPrevPrice: number
    }
    const result: CumRow[] = []
    const acc = { cumCost: 0, cumPrice: 0, cumPrevCost: 0, cumPrevPrice: 0 }
    for (const row of pivot.rows) {
      acc.cumCost += isAllTab ? row.totalCost : (row.cells[activeTab]?.cost ?? 0)
      acc.cumPrice += isAllTab ? row.totalPrice : (row.cells[activeTab]?.price ?? 0)
      acc.cumPrevCost += isAllTab ? row.prevTotalCost : (row.cells[activeTab]?.prevCost ?? 0)
      acc.cumPrevPrice += isAllTab ? row.prevTotalPrice : (row.cells[activeTab]?.prevPrice ?? 0)
      result.push({ ...acc })
    }
    return result
  }, [pivot.rows, activeTab, isAllTab])

  if (pivot.columns.length === 0) {
    return <EmptyState>日別データがありません</EmptyState>
  }

  // 合計
  const totCost = isAllTab ? pivot.totals.grandCost : (pivot.totals.byColumn[activeTab]?.cost ?? 0)
  const totPrice = isAllTab
    ? pivot.totals.grandPrice
    : (pivot.totals.byColumn[activeTab]?.price ?? 0)
  const totPrevCost = isAllTab
    ? pivot.totals.prevGrandCost
    : (pivot.totals.byColumn[activeTab]?.prevCost ?? 0)
  const totPrevPrice = isAllTab
    ? pivot.totals.prevGrandPrice
    : (pivot.totals.byColumn[activeTab]?.prevPrice ?? 0)

  const markupRateVal = (cost: number, price: number) => (price > 0 ? 1 - cost / price : 0)
  const yoyRate = (cur: number, prev: number) =>
    prev !== 0 ? ((cur / prev) * 100).toFixed(1) + '%' : '-'

  return (
    <>
      {/* タブ */}
      <TabBar>
        <TabButton $active={isAllTab} $color="#3b82f6" onClick={() => setActiveTab('__all__')}>
          全カテゴリ
        </TabButton>
        {pivot.columns.map((col) => (
          <TabButton
            key={col.key}
            $active={activeTab === col.key}
            $color={col.color}
            onClick={() => setActiveTab(col.key)}
          >
            {col.label}
          </TabButton>
        ))}
      </TabBar>

      {/* 小計コントロール */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
        <ToggleRow>
          <input
            type="checkbox"
            checked={showSubtotals}
            onChange={(e) => setShowSubtotals(e.target.checked)}
          />
          小計を表示
        </ToggleRow>
        {showSubtotals && (
          <ToggleRow as="span">
            起点曜日:
            <select
              value={subtotalStartDow}
              onChange={(e) => setSubtotalStartDow(Number(e.target.value))}
              style={{ padding: '2px 4px', fontSize: '0.85rem' }}
            >
              {DOW_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </ToggleRow>
        )}
      </div>

      {/* テーブル */}
      <PivotTableWrapper>
        <Table>
          <thead>
            <tr>
              <Th rowSpan={2}>日付</Th>
              <Th rowSpan={2}>曜</Th>
              <PivotGroupTh colSpan={3}>
                当期{activeCol ? `（${activeCol.label}）` : ''}
              </PivotGroupTh>
              <PivotGroupTh colSpan={3}>前期</PivotGroupTh>
              <PivotGroupTh colSpan={2}>差異</PivotGroupTh>
              <PivotGroupTh colSpan={2}>前年比</PivotGroupTh>
              <PivotGroupTh colSpan={2}>累計（当期）</PivotGroupTh>
              <PivotGroupTh colSpan={2}>累計（前期）</PivotGroupTh>
            </tr>
            <tr>
              <PivotSubTh className="group-start">原価</PivotSubTh>
              <PivotSubTh>売価</PivotSubTh>
              <PivotSubTh>値入率</PivotSubTh>
              <PivotSubTh className="group-start">原価</PivotSubTh>
              <PivotSubTh>売価</PivotSubTh>
              <PivotSubTh>値入率</PivotSubTh>
              <PivotSubTh className="group-start">原価</PivotSubTh>
              <PivotSubTh>売価</PivotSubTh>
              <PivotSubTh className="group-start">原価</PivotSubTh>
              <PivotSubTh>売価</PivotSubTh>
              <PivotSubTh className="group-start">原価</PivotSubTh>
              <PivotSubTh>売価</PivotSubTh>
              <PivotSubTh className="group-start">原価</PivotSubTh>
              <PivotSubTh>売価</PivotSubTh>
            </tr>
          </thead>
          <tbody>
            {pivot.rows.map((row, idx) => {
              const cost = getCost(row)
              const price = getPrice(row)
              const prevCost = getPrevCost(row)
              const prevPrice = getPrevPrice(row)
              const sub = subtotalMap.get(row.day)
              const cum = cumulativeRows[idx]

              return (
                <Fragment key={row.day}>
                  <tr>
                    <Td>{row.day}日</Td>
                    <DowCell $dow={row.dayOfWeek}>{DOW_LABELS[row.dayOfWeek]}</DowCell>
                    <PivotTd $groupStart $negative={cost < 0}>
                      {fmtOrDash(cost)}
                    </PivotTd>
                    <PivotTd $negative={price < 0}>{fmtOrDash(price)}</PivotTd>
                    <PivotTd>{price > 0 ? formatPercent(markupRateVal(cost, price)) : '-'}</PivotTd>
                    <PivotTd $groupStart>{fmtOrDash(prevCost)}</PivotTd>
                    <PivotTd>{fmtOrDash(prevPrice)}</PivotTd>
                    <PivotTd>
                      {prevPrice > 0 ? formatPercent(markupRateVal(prevCost, prevPrice)) : '-'}
                    </PivotTd>
                    <DiffCell $groupStart $positive={diffColor(cost - prevCost)}>
                      {cost - prevCost !== 0 ? fmtOrDash(cost - prevCost) : '-'}
                    </DiffCell>
                    <DiffCell $positive={diffColor(price - prevPrice)}>
                      {price - prevPrice !== 0 ? fmtOrDash(price - prevPrice) : '-'}
                    </DiffCell>
                    <PivotTd $groupStart>{yoyRate(cost, prevCost)}</PivotTd>
                    <PivotTd>{yoyRate(price, prevPrice)}</PivotTd>
                    <PivotTd $groupStart>{fmtOrDash(cum.cumCost)}</PivotTd>
                    <PivotTd>{fmtOrDash(cum.cumPrice)}</PivotTd>
                    <PivotTd $groupStart>{fmtOrDash(cum.cumPrevCost)}</PivotTd>
                    <PivotTd>{fmtOrDash(cum.cumPrevPrice)}</PivotTd>
                  </tr>
                  {showSubtotals && sub && (
                    <TrSubtotal>
                      <Td $align="left" colSpan={2}>
                        小計
                      </Td>
                      <PivotTd $groupStart>{fmtCurrency(getSubCost(sub))}</PivotTd>
                      <PivotTd>{fmtCurrency(getSubPrice(sub))}</PivotTd>
                      <PivotTd>
                        {formatPercent(markupRateVal(getSubCost(sub), getSubPrice(sub)))}
                      </PivotTd>
                      <PivotTd $groupStart>{fmtCurrency(getSubPrevCost(sub))}</PivotTd>
                      <PivotTd>{fmtCurrency(getSubPrevPrice(sub))}</PivotTd>
                      <PivotTd>
                        {formatPercent(markupRateVal(getSubPrevCost(sub), getSubPrevPrice(sub)))}
                      </PivotTd>
                      <DiffCell
                        $groupStart
                        $positive={diffColor(getSubCost(sub) - getSubPrevCost(sub))}
                      >
                        {fmtCurrency(getSubCost(sub) - getSubPrevCost(sub))}
                      </DiffCell>
                      <DiffCell $positive={diffColor(getSubPrice(sub) - getSubPrevPrice(sub))}>
                        {fmtCurrency(getSubPrice(sub) - getSubPrevPrice(sub))}
                      </DiffCell>
                      <PivotTd $groupStart>{yoyRate(getSubCost(sub), getSubPrevCost(sub))}</PivotTd>
                      <PivotTd>{yoyRate(getSubPrice(sub), getSubPrevPrice(sub))}</PivotTd>
                      <PivotTd $groupStart colSpan={2} />
                      <PivotTd $groupStart colSpan={2} />
                    </TrSubtotal>
                  )}
                </Fragment>
              )
            })}
            <TrTotal>
              <Td $align="left" colSpan={2}>
                合計
              </Td>
              <PivotTd $groupStart>{fmtCurrency(totCost)}</PivotTd>
              <PivotTd>{fmtCurrency(totPrice)}</PivotTd>
              <PivotTd>{formatPercent(markupRateVal(totCost, totPrice))}</PivotTd>
              <PivotTd $groupStart>{fmtCurrency(totPrevCost)}</PivotTd>
              <PivotTd>{fmtCurrency(totPrevPrice)}</PivotTd>
              <PivotTd>{formatPercent(markupRateVal(totPrevCost, totPrevPrice))}</PivotTd>
              <DiffCell $groupStart $positive={diffColor(totCost - totPrevCost)}>
                {fmtCurrency(totCost - totPrevCost)}
              </DiffCell>
              <DiffCell $positive={diffColor(totPrice - totPrevPrice)}>
                {fmtCurrency(totPrice - totPrevPrice)}
              </DiffCell>
              <PivotTd $groupStart>{yoyRate(totCost, totPrevCost)}</PivotTd>
              <PivotTd>{yoyRate(totPrice, totPrevPrice)}</PivotTd>
              <PivotTd $groupStart>{fmtCurrency(totCost)}</PivotTd>
              <PivotTd>{fmtCurrency(totPrice)}</PivotTd>
              <PivotTd $groupStart>{fmtCurrency(totPrevCost)}</PivotTd>
              <PivotTd>{fmtCurrency(totPrevPrice)}</PivotTd>
            </TrTotal>
          </tbody>
        </Table>
      </PivotTableWrapper>
    </>
  )
})
