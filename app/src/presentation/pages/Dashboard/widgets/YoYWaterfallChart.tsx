/**
 * 比較ウォーターフォールチャート（前年比 / 前週比 対応）
 *
 * 基準売上 → 客数効果 → 客単価効果 → 当期売上 の要因分解を表示。
 * 分類別時間帯データがある場合は部門別の増減も表示する。
 * 期間スライダーで分析対象期間を動的に変更可能。
 * 前週比モード: 選択期間の7日前と比較。
 */
import { useState, useMemo, memo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
  LabelList,
} from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from '@/presentation/components/charts/SafeResponsiveContainer'
import {
  useChartTheme,
  tooltipStyle,
  useCurrencyFormatter,
  DayRangeSlider,
  useDayRange,
} from '@/presentation/components/charts'
import {
  formatCurrency,
  formatPercent,
  safeDivide,
  calculateItemsPerCustomer,
  calculateAveragePricePerItem,
} from '@/domain/calculations/utils'
import { decompose2, decompose3, decompose5 } from '@/application/hooks/useFactorDecomposition'
import { useDuckDBCategoryTimeRecords } from '@/application/hooks/duckdb'
import type { DateRange, CategoryTimeSalesRecord } from '@/domain/models'
import { CategoryFactorBreakdown } from './CategoryFactorBreakdown'
import { decomposePriceMix, recordsToCategoryQtyAmt } from './categoryFactorUtils'
import type { WidgetContext, ComparisonMode } from './types'
import { wowPrevRange, comparisonLabels } from './types'
import { sc } from '@/presentation/theme/semanticColors'
import {
  Wrapper,
  Title,
  Subtitle,
  TabRow,
  TabBtn,
  SummaryRow,
  SummaryItem,
  SummaryLabel,
  SummaryValue,
  ModeRow,
  ModeBtn,
  DecompRow,
  DecompBtn,
  HelpToggle,
  HelpBox,
  HelpFormula,
} from './YoYWaterfallChart.styles'

interface WaterfallItem {
  name: string
  value: number
  base: number
  bar: number
  isTotal?: boolean
}

type ViewMode = 'factor' | 'category' | 'categoryFactor'
type DecompLevel = 2 | 3 | 5

const EMPTY_RECORDS: readonly CategoryTimeSalesRecord[] = []

const DECOMP_HELP: Record<
  number,
  { title: string; items: { label: string; formula: string; desc: string }[] }
> = {
  2: {
    title: '2要素分解（シャープリー値）',
    items: [
      { label: '客数効果', formula: '(C₁-C₀)×(T₀+T₁)/2', desc: '来店客数の変化による売上変動' },
      {
        label: '客単価効果',
        formula: '(T₁-T₀)×(C₀+C₁)/2',
        desc: '1人あたり購入額の変化による売上変動',
      },
    ],
  },
  3: {
    title: '3要素分解（シャープリー値）',
    items: [
      { label: '客数効果', formula: '客数変化 × 平均(点数×単価)', desc: '来店客数の増減' },
      { label: '点数効果', formula: '点数変化 × 平均(客数×単価)', desc: '1人あたり購入点数の増減' },
      { label: '単価効果', formula: '単価変化 × 平均(客数×点数)', desc: '1点あたり平均単価の増減' },
    ],
  },
  5: {
    title: '5要素分解（4変数シャープリー値）',
    items: [
      { label: '客数効果', formula: '3要素と同一', desc: '来店客数の増減' },
      { label: '点数効果', formula: '3要素と同一', desc: '1人あたり購入点数の増減' },
      {
        label: '価格効果',
        formula: 'Σカテゴリ(単価変化×前年構成比)',
        desc: 'カテゴリ内での単価変動',
      },
      {
        label: '構成比変化効果',
        formula: 'Σカテゴリ(構成比変化×加重平均単価)',
        desc: '高単価/低単価カテゴリへのシフト',
      },
    ],
  },
}

export const YoYWaterfallChartWidget = memo(function YoYWaterfallChartWidget({
  ctx,
}: {
  ctx: WidgetContext
}) {
  const r = ctx.result
  const prevYear = ctx.prevYear
  const ct = useChartTheme()
  const fmt = useCurrencyFormatter()
  const [viewMode, setViewMode] = useState<ViewMode>('factor')
  const [decompLevel, setDecompLevel] = useState<DecompLevel | null>(null)
  const [compMode, setCompMode] = useState<ComparisonMode>('yoy')
  const [showHelp, setShowHelp] = useState(false)

  // Period slider state
  const [dayStart, dayEnd, setDayRange] = useDayRange(ctx.daysInMonth)

  // WoW availability check — canWoW が false なら yoy にフォールバック（派生状態）
  const wowRange = wowPrevRange(dayStart, dayEnd)
  const canWoW = wowRange.isValid
  const activeCompMode: ComparisonMode = compMode === 'wow' && !canWoW ? 'yoy' : compMode
  const labels = comparisonLabels(
    activeCompMode,
    ctx.year,
    dayStart,
    dayEnd,
    ctx.comparisonFrame.previous.from.year,
  )

  // 期間指定に基づいて当年の売上・客数を日別データから再集計
  const periodCurSales = useMemo(() => {
    let sales = 0
    let customers = 0
    for (const [day, rec] of r.daily) {
      if (day >= dayStart && day <= dayEnd) {
        sales += rec.sales
        customers += rec.customers ?? 0
      }
    }
    return { sales, customers }
  }, [r.daily, dayStart, dayEnd])

  // 比較期間の売上・客数（前年比 or 前週比で切替）
  const periodPrevSales = useMemo(() => {
    let sales = 0
    let customers = 0
    if (activeCompMode === 'wow') {
      // 前週比: 同月の dayStart-7 ~ dayEnd-7
      for (const [day, rec] of r.daily) {
        if (day >= wowRange.prevStart && day <= wowRange.prevEnd) {
          sales += rec.sales
          customers += rec.customers ?? 0
        }
      }
    } else {
      // 前年比
      for (const [day, entry] of prevYear.daily) {
        if (day >= dayStart && day <= dayEnd) {
          sales += entry.sales
          customers += entry.customers
        }
      }
    }
    return { sales, customers }
  }, [
    activeCompMode,
    r.daily,
    prevYear.daily,
    dayStart,
    dayEnd,
    wowRange.prevStart,
    wowRange.prevEnd,
  ])

  // 期間指定でCTSレコードをDuckDBから取得
  const curDateRange: DateRange = useMemo(
    () => ({
      from: { year: ctx.year, month: ctx.month, day: dayStart },
      to: { year: ctx.year, month: ctx.month, day: dayEnd },
    }),
    [ctx.year, ctx.month, dayStart, dayEnd],
  )

  const curCtsResult = useDuckDBCategoryTimeRecords(
    ctx.duckConn,
    ctx.duckDataVersion,
    curDateRange,
    ctx.selectedStoreIds,
  )
  const periodCTS = curCtsResult.data ?? EMPTY_RECORDS

  // 比較期間のCTSレコード（前年比 or 前週比で切替）
  const prevCtsDateRange: DateRange | undefined = useMemo(() => {
    if (activeCompMode === 'wow') {
      if (!canWoW) return undefined
      return {
        from: { year: ctx.year, month: ctx.month, day: wowRange.prevStart },
        to: { year: ctx.year, month: ctx.month, day: wowRange.prevEnd },
      }
    }
    const prev = ctx.comparisonFrame.previous
    return {
      from: { year: prev.from.year, month: prev.from.month, day: dayStart },
      to: { year: prev.to.year, month: prev.to.month, day: dayEnd },
    }
  }, [
    activeCompMode,
    canWoW,
    ctx.year,
    ctx.month,
    ctx.comparisonFrame.previous,
    dayStart,
    dayEnd,
    wowRange.prevStart,
    wowRange.prevEnd,
  ])

  const prevIsPrevYear = activeCompMode !== 'wow'
  const prevCtsResult = useDuckDBCategoryTimeRecords(
    ctx.duckConn,
    ctx.duckDataVersion,
    prevCtsDateRange,
    ctx.selectedStoreIds,
    prevIsPrevYear,
  )
  const periodPrevCTS = prevCtsResult.data ?? EMPTY_RECORDS

  // Aggregate total quantity from filtered CTS records
  const curTotalQty = useMemo(
    () => periodCTS.reduce((s, rec) => s + rec.totalQuantity, 0),
    [periodCTS],
  )

  const prevTotalQty = useMemo(
    () => periodPrevCTS.reduce((s, rec) => s + rec.totalQuantity, 0),
    [periodPrevCTS],
  )

  const hasQuantity = curTotalQty > 0 && prevTotalQty > 0

  // Price/Mix decomposition of unit price change
  const priceMix = useMemo(() => {
    if (periodCTS.length === 0 || periodPrevCTS.length === 0) return null
    return decomposePriceMix(periodCTS, periodPrevCTS)
  }, [periodCTS, periodPrevCTS])

  // Available decomposition levels
  const maxLevel: DecompLevel = priceMix ? 5 : hasQuantity ? 3 : 2
  const activeLevel = decompLevel ?? maxLevel

  // Use period-specific aggregated values
  const curSales = periodCurSales.sales
  const curCust = periodCurSales.customers
  const prevSales = periodPrevSales.sales
  const prevCust = periodPrevSales.customers

  // Comparison availability
  const hasComparison = activeCompMode === 'yoy' ? prevYear.hasPrevYear : canWoW

  // Factor decomposition data (Shapley values)
  const factorData = useMemo((): WaterfallItem[] => {
    if (!hasComparison || prevSales <= 0) return []

    const items: WaterfallItem[] = []
    items.push({
      name: `${labels.prevLabel}売上`,
      value: prevSales,
      base: 0,
      bar: prevSales,
      isTotal: true,
    })

    let running = prevSales
    const push = (name: string, value: number) => {
      items.push({
        name,
        value,
        base: value >= 0 ? running : running + value,
        bar: Math.abs(value),
      })
      running += value
    }

    if (prevCust > 0 && curCust > 0) {
      if (activeLevel === 2) {
        const d = decompose2(prevSales, curSales, prevCust, curCust)
        push('客数効果', d.custEffect)
        push('客単価効果', d.ticketEffect)
      } else if (activeLevel === 3 || !priceMix) {
        if (hasQuantity) {
          const d = decompose3(prevSales, curSales, prevCust, curCust, prevTotalQty, curTotalQty)
          push('客数効果', d.custEffect)
          push('点数効果', d.qtyEffect)
          push('単価効果', d.pricePerItemEffect)
        } else {
          const d = decompose2(prevSales, curSales, prevCust, curCust)
          push('客数効果', d.custEffect)
          push('客単価効果', d.ticketEffect)
        }
      } else {
        // 5-factor: full 4-variable Shapley
        if (hasQuantity) {
          const d = decompose5(
            prevSales,
            curSales,
            prevCust,
            curCust,
            prevTotalQty,
            curTotalQty,
            recordsToCategoryQtyAmt(periodCTS),
            recordsToCategoryQtyAmt(periodPrevCTS),
          )
          if (d) {
            push('客数効果', d.custEffect)
            push('点数効果', d.qtyEffect)
            push('価格効果', d.priceEffect)
            push('構成比変化効果', d.mixEffect)
          }
        }
      }
    } else {
      push('増減', curSales - prevSales)
    }

    items.push({
      name: `${labels.curLabel}売上`,
      value: curSales,
      base: 0,
      bar: curSales,
      isTotal: true,
    })
    return items
  }, [
    hasComparison,
    prevSales,
    curSales,
    prevCust,
    curCust,
    hasQuantity,
    curTotalQty,
    prevTotalQty,
    priceMix,
    activeLevel,
    periodCTS,
    periodPrevCTS,
    labels.prevLabel,
    labels.curLabel,
  ])

  // Category-based decomposition data
  // 売上データ（periodPrevSales / periodCurSales）にアンカーし、
  // 部門差分はCTSから取得。データソース差異は端数調整バーで吸収。
  const categoryData = useMemo((): WaterfallItem[] => {
    if (periodCTS.length === 0 || periodPrevCTS.length === 0) return []
    if (!hasComparison || prevSales <= 0) return []

    // アンカー: 日別データ由来の合計
    const anchorPrev = prevSales
    const anchorCur = curSales

    // Aggregate by department (CTS由来)
    const curDepts = new Map<string, { name: string; amount: number }>()
    for (const rec of periodCTS) {
      const code = rec.department.code
      const ex = curDepts.get(code) ?? { name: rec.department.name || code, amount: 0 }
      ex.amount += rec.totalAmount
      curDepts.set(code, ex)
    }

    const prevDepts = new Map<string, { name: string; amount: number }>()
    for (const rec of periodPrevCTS) {
      const code = rec.department.code
      const ex = prevDepts.get(code) ?? { name: rec.department.name || code, amount: 0 }
      ex.amount += rec.totalAmount
      prevDepts.set(code, ex)
    }

    // Build items sorted by absolute difference (largest impact first)
    const allCodes = new Set([...curDepts.keys(), ...prevDepts.keys()])
    const diffs: { code: string; name: string; diff: number }[] = []
    for (const code of allCodes) {
      const cur = curDepts.get(code)?.amount ?? 0
      const prev = prevDepts.get(code)?.amount ?? 0
      const name = curDepts.get(code)?.name ?? prevDepts.get(code)?.name ?? code
      if (Math.abs(cur - prev) > 0) {
        diffs.push({ code, name, diff: cur - prev })
      }
    }
    diffs.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))

    const items: WaterfallItem[] = []

    // Start: 比較元売上（売上データにアンカー）
    items.push({
      name: `${labels.prevLabel}売上`,
      value: anchorPrev,
      base: 0,
      bar: anchorPrev,
      isTotal: true,
    })

    // Department differences
    let running = anchorPrev
    for (const d of diffs.slice(0, 8)) {
      items.push({
        name: d.name,
        value: d.diff,
        base: d.diff >= 0 ? running : running + d.diff,
        bar: Math.abs(d.diff),
      })
      running += d.diff
    }

    // If there are remaining depts, group as "その他"
    const remainingDiffs = diffs.slice(8)
    if (remainingDiffs.length > 0) {
      const otherDiff = remainingDiffs.reduce((s, d) => s + d.diff, 0)
      if (Math.abs(otherDiff) > 0) {
        items.push({
          name: `その他(${remainingDiffs.length}部門)`,
          value: otherDiff,
          base: otherDiff >= 0 ? running : running + otherDiff,
          bar: Math.abs(otherDiff),
        })
        running += otherDiff
      }
    }

    // データソース差異の端数調整
    // CTS合計と売上データ合計は別ファイル由来のため完全一致しない場合がある
    const residual = anchorCur - running
    if (Math.abs(residual) >= 1) {
      items.push({
        name: '端数調整',
        value: residual,
        base: residual >= 0 ? running : running + residual,
        bar: Math.abs(residual),
      })
      running += residual
    }

    // End: 当期売上（売上データにアンカー）
    items.push({
      name: `${labels.curLabel}売上`,
      value: anchorCur,
      base: 0,
      bar: anchorCur,
      isTotal: true,
    })

    return items
  }, [
    periodCTS,
    periodPrevCTS,
    hasComparison,
    prevSales,
    curSales,
    labels.prevLabel,
    labels.curLabel,
  ])

  // PI値・点単価（3要素以上の分解時に表示）
  const piSummary = useMemo(() => {
    if (activeLevel < 3 || !hasQuantity || prevCust <= 0 || curCust <= 0) return null
    const prevPI = calculateItemsPerCustomer(prevTotalQty, prevCust)
    const curPI = calculateItemsPerCustomer(curTotalQty, curCust)
    const prevPPI = calculateAveragePricePerItem(prevSales, prevTotalQty)
    const curPPI = calculateAveragePricePerItem(curSales, curTotalQty)
    return { prevPI, curPI, prevPPI, curPPI }
  }, [activeLevel, hasQuantity, prevCust, curCust, prevTotalQty, curTotalQty, prevSales, curSales])

  if (!hasComparison || prevSales <= 0) return null

  const hasCategoryView = categoryData.length > 0
  const hasCategoryFactorView = hasQuantity && hasCategoryView
  const data = viewMode === 'category' && hasCategoryView ? categoryData : factorData
  if (data.length === 0 && viewMode !== 'categoryFactor') return null

  const yoyRatio = safeDivide(curSales, prevSales, 0)
  const yoyDiff = curSales - prevSales

  const colors = {
    positive: sc.positive,
    negative: sc.negative,
    total: ct.colors.primary,
  }

  return (
    <Wrapper>
      <Title>
        {activeCompMode === 'yoy' ? '前年比較' : '前週比較'}ウォーターフォール（要因分解）
      </Title>
      <Subtitle>
        {labels.prevLabel}売上から{labels.curLabel}売上への変動要因を可視化
      </Subtitle>

      <ModeRow>
        <ModeBtn $active={compMode === 'yoy'} onClick={() => setCompMode('yoy')}>
          前年比
        </ModeBtn>
        <ModeBtn
          $active={compMode === 'wow'}
          onClick={() => canWoW && setCompMode('wow')}
          style={canWoW ? undefined : { opacity: 0.4, cursor: 'not-allowed' }}
        >
          前週比
        </ModeBtn>
      </ModeRow>

      <DayRangeSlider
        min={1}
        max={ctx.daysInMonth}
        start={dayStart}
        end={dayEnd}
        onChange={setDayRange}
        elapsedDays={ctx.elapsedDays}
      />

      {(hasCategoryView || hasCategoryFactorView) && (
        <TabRow>
          <TabBtn $active={viewMode === 'factor'} onClick={() => setViewMode('factor')}>
            要因分解
          </TabBtn>
          {hasCategoryView && (
            <TabBtn $active={viewMode === 'category'} onClick={() => setViewMode('category')}>
              部門別増減
            </TabBtn>
          )}
          {hasCategoryFactorView && (
            <TabBtn
              $active={viewMode === 'categoryFactor'}
              onClick={() => setViewMode('categoryFactor')}
            >
              部門別要因分解
            </TabBtn>
          )}
        </TabRow>
      )}

      {viewMode === 'factor' && maxLevel >= 3 && (
        <DecompRow>
          <DecompBtn $active={activeLevel === 2} onClick={() => setDecompLevel(2)}>
            客数・客単価
          </DecompBtn>
          <DecompBtn $active={activeLevel === 3} onClick={() => setDecompLevel(3)}>
            客数・点数・単価
          </DecompBtn>
          {maxLevel === 5 && (
            <DecompBtn $active={activeLevel === 5} onClick={() => setDecompLevel(5)}>
              5要素（価格+構成比）
            </DecompBtn>
          )}
        </DecompRow>
      )}

      {viewMode === 'factor' && (
        <>
          <HelpToggle onClick={() => setShowHelp(!showHelp)}>
            {showHelp ? '▼' : '▶'} 計算式の説明
          </HelpToggle>
          {showHelp &&
            (() => {
              const help = DECOMP_HELP[activeLevel]
              return help ? (
                <HelpBox>
                  <strong>{help.title}</strong>
                  <div style={{ marginTop: 4 }}>
                    不変条件: 全効果の合計 = 当期売上 - 前期売上（シャープリー効率性公理）
                  </div>
                  {help.items.map((item) => (
                    <div key={item.label} style={{ marginTop: 8 }}>
                      <strong>{item.label}</strong>: {item.desc}
                      <HelpFormula>{item.formula}</HelpFormula>
                    </div>
                  ))}
                </HelpBox>
              ) : null
            })()}
        </>
      )}

      <SummaryRow>
        <SummaryItem>
          <SummaryLabel>{labels.prevLabel}売上</SummaryLabel>
          <SummaryValue>{formatCurrency(prevSales)}</SummaryValue>
        </SummaryItem>
        <SummaryItem>
          <SummaryLabel>{labels.curLabel}売上</SummaryLabel>
          <SummaryValue>{formatCurrency(curSales)}</SummaryValue>
        </SummaryItem>
        <SummaryItem>
          <SummaryLabel>差額</SummaryLabel>
          <SummaryValue $color={sc.cond(yoyDiff >= 0)}>
            {yoyDiff >= 0 ? '+' : ''}
            {formatCurrency(yoyDiff)}
          </SummaryValue>
        </SummaryItem>
        <SummaryItem>
          <SummaryLabel>比率</SummaryLabel>
          <SummaryValue $color={sc.cond(yoyRatio >= 1)}>{formatPercent(yoyRatio)}</SummaryValue>
        </SummaryItem>
      </SummaryRow>

      {piSummary && (
        <SummaryRow>
          <SummaryItem>
            <SummaryLabel>PI値({labels.prevLabel})</SummaryLabel>
            <SummaryValue>{piSummary.prevPI.toFixed(1)}点</SummaryValue>
          </SummaryItem>
          <SummaryItem>
            <SummaryLabel>PI値({labels.curLabel})</SummaryLabel>
            <SummaryValue $color={sc.cond(piSummary.curPI >= piSummary.prevPI)}>
              {piSummary.curPI.toFixed(1)}点
            </SummaryValue>
          </SummaryItem>
          <SummaryItem>
            <SummaryLabel>点単価({labels.prevLabel})</SummaryLabel>
            <SummaryValue>{formatCurrency(Math.round(piSummary.prevPPI))}</SummaryValue>
          </SummaryItem>
          <SummaryItem>
            <SummaryLabel>点単価({labels.curLabel})</SummaryLabel>
            <SummaryValue $color={sc.cond(piSummary.curPPI >= piSummary.prevPPI)}>
              {formatCurrency(Math.round(piSummary.curPPI))}
            </SummaryValue>
          </SummaryItem>
        </SummaryRow>
      )}

      {viewMode === 'categoryFactor' ? (
        <CategoryFactorBreakdown
          curRecords={periodCTS}
          prevRecords={periodPrevCTS}
          curCustomers={curCust}
          prevCustomers={prevCust}
          curLabel={labels.curLabel}
          prevLabel={labels.prevLabel}
        />
      ) : (
        <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height={360}>
          <BarChart data={data} margin={{ top: 20, right: 20, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: ct.fontSize.sm, fill: ct.text, fontFamily: ct.fontFamily }}
              axisLine={{ stroke: ct.grid }}
              tickLine={false}
              interval={0}
              angle={data.length > 6 ? -30 : 0}
              textAnchor={data.length > 6 ? 'end' : 'middle'}
              height={data.length > 6 ? 60 : 30}
            />
            <YAxis
              tick={{ fontSize: ct.fontSize.xs, fill: ct.textSecondary, fontFamily: ct.monoFamily }}
              axisLine={false}
              tickLine={false}
              tickFormatter={fmt}
            />
            <Tooltip
              contentStyle={tooltipStyle(ct)}
              formatter={(_value: unknown, _name: unknown, props: { payload?: WaterfallItem }) => {
                const item = props.payload
                if (!item) return ['-', '-']
                return [formatCurrency(item.value), item.name]
              }}
            />
            <ReferenceLine y={0} stroke={ct.grid} />
            <Bar dataKey="base" stackId="waterfall" fill="transparent" isAnimationActive={false} />
            <Bar dataKey="bar" stackId="waterfall" radius={[3, 3, 0, 0]}>
              <LabelList
                dataKey="value"
                position="top"
                formatter={(v: unknown) => fmt(Number(v))}
                style={{ fontSize: ct.fontSize.xs, fill: ct.text, fontFamily: ct.monoFamily }}
              />
              {data.map((item, idx) => (
                <Cell
                  key={idx}
                  fill={
                    item.isTotal
                      ? colors.total
                      : item.value >= 0
                        ? colors.positive
                        : colors.negative
                  }
                  opacity={0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </Wrapper>
  )
})
