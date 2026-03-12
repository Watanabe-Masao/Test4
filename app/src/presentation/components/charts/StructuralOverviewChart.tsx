import { useMemo, useCallback, useState, memo } from 'react'
import { toPct, toComma, toManYen } from './chartTheme'
import { sc } from '@/presentation/theme/semanticColors'
import { palette } from '@/presentation/theme/tokens'
import { safeDivide, getEffectiveGrossProfitRate } from '@/domain/calculations/utils'
import { useCrossChartSelection } from './crossChartSelectionHooks'
import type { StoreResult } from '@/domain/models'
import { ChartHelpButton } from './ChartHeader'
import { CHART_GUIDES } from './chartGuides'
import {
  Wrapper,
  Title,
  FlowContainer,
  Column,
  ColumnLabel,
  FlowNode,
  NodeLabel,
  NodeValue,
  NodeSub,
  YoyBadge,
  Arrow,
  SummaryRow,
  SumCard,
  SumLabel,
  SumValue,
  DrillPanel,
  DrillHeader,
  DrillTitle,
  CloseBtn,
  DrillGrid,
  DrillDay,
  DrillDayLabel,
  DrillDayValue,
  DrillSummary,
  DrillStat,
} from './StructuralOverviewChart.styles'

// ── Types ──

type DrillTarget =
  | 'grossSales'
  | 'totalSales'
  | 'cost'
  | 'discount'
  | 'costInclusion'
  | 'gpInv'
  | 'gpEst'
  | 'budget'
  | null

interface DrillConfig {
  readonly title: string
  readonly color: string
  readonly getValue: (day: number, r: StoreResult) => number
  readonly formatValue: (v: number) => string
  readonly suffix?: string
}

interface Props {
  result: StoreResult
  prevYearResult?: StoreResult
}

const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const

/** 収益構造俯瞰図: 売上→原価→売変→粗利のフロー可視化 */
export const StructuralOverviewChart = memo(function StructuralOverviewChart({
  result,
  prevYearResult,
}: Props) {
  const r = result
  const prev = prevYearResult
  const { requestDrillThrough } = useCrossChartSelection()
  const [drillTarget, setDrillTarget] = useState<DrillTarget>(null)

  const handleDrillThrough = useCallback(
    (widgetId: string) => {
      requestDrillThrough({ widgetId })
    },
    [requestDrillThrough],
  )

  const handleNodeClick = useCallback((target: DrillTarget) => {
    setDrillTarget((prev) => (prev === target ? null : target))
  }, [])

  const nodes = useMemo(() => {
    const grossSales = r.grossSales
    const totalSales = r.totalSales
    const totalCost = r.inventoryCost + r.deliverySalesCost
    const discount = r.totalDiscount
    const costInclusion = r.totalCostInclusion
    const gpInv = r.invMethodGrossProfit
    const gpEst = r.estMethodMargin
    const budget = r.grossProfitBudget

    // 前年比計算
    const yoy = (cur: number, prevVal: number | undefined) => {
      if (prevVal == null || prevVal === 0) return null
      return cur / prevVal
    }

    return {
      // 左列: 収入
      grossSales: { value: grossSales, yoy: yoy(grossSales, prev?.grossSales) },
      totalSales: { value: totalSales, yoy: yoy(totalSales, prev?.totalSales) },
      // 中間列: コスト構造
      cost: {
        value: totalCost,
        yoy: yoy(totalCost, prev ? prev.inventoryCost + prev.deliverySalesCost : undefined),
      },
      discount: { value: discount, yoy: yoy(discount, prev?.totalDiscount) },
      costInclusion: { value: costInclusion, yoy: yoy(costInclusion, prev?.totalCostInclusion) },
      // 右列: 利益
      gpInv: {
        value: gpInv,
        yoy:
          gpInv != null && prev?.invMethodGrossProfit != null
            ? yoy(gpInv, prev.invMethodGrossProfit)
            : null,
      },
      gpEst: { value: gpEst, yoy: yoy(gpEst, prev?.estMethodMargin) },
      budget: { value: budget },
      // 率
      discountRate: r.discountRate,
      gpRateInv: r.invMethodGrossProfitRate,
      gpRateEst: r.estMethodMarginRate,
      markupRate: r.coreMarkupRate,
    }
  }, [r, prev])

  const fmtMan = (v: number | null | undefined) => {
    if (v == null) return '-'
    return toManYen(v)
  }

  const fmtSen = (v: number) => {
    if (Math.abs(v) >= 10000) return `${(v / 10000).toFixed(1)}万`
    return toComma(Math.round(v))
  }

  const renderYoy = (ratio: number | null) => {
    if (ratio == null) return null
    return <YoyBadge $positive={ratio >= 1}>{toPct(ratio)}</YoyBadge>
  }

  // ノードの相対高さ（粗売上を100として）
  const base = nodes.grossSales.value || 1
  const h = (v: number | null | undefined) => Math.round(((v ?? 0) / base) * 160)

  // ドリルダウン設定
  const drillConfigs: Record<Exclude<DrillTarget, null>, DrillConfig> = useMemo(
    () => ({
      grossSales: {
        title: '粗売上 — 日別内訳',
        color: palette.primary,
        getValue: (day) => {
          const d = r.daily.get(day)
          return d ? d.grossSales : 0
        },
        formatValue: fmtSen,
      },
      totalSales: {
        title: '純売上 — 日別内訳',
        color: palette.purpleDark,
        getValue: (day) => {
          const d = r.daily.get(day)
          return d ? d.sales : 0
        },
        formatValue: fmtSen,
      },
      cost: {
        title: '仕入原価 — 日別内訳',
        color: sc.negative,
        getValue: (day) => {
          const d = r.daily.get(day)
          return d ? d.totalCost : 0
        },
        formatValue: fmtSen,
      },
      discount: {
        title: '売変額 — 日別内訳',
        color: palette.warningDark,
        getValue: (day) => {
          const d = r.daily.get(day)
          return d ? d.discountAbsolute : 0
        },
        formatValue: fmtSen,
      },
      costInclusion: {
        title: '原価算入費 — 日別内訳',
        color: palette.orange,
        getValue: (day) => {
          const d = r.daily.get(day)
          return d ? d.costInclusion.cost : 0
        },
        formatValue: fmtSen,
      },
      gpInv: {
        title: '粗利（在庫法）— 月次集計',
        color: sc.positive,
        getValue: () => r.invMethodGrossProfit ?? 0,
        formatValue: fmtSen,
      },
      gpEst: {
        title: '推定粗利 — 日別内訳（売上 - 仕入原価）',
        color: palette.cyanDark,
        getValue: (day) => {
          const d = r.daily.get(day)
          if (!d) return 0
          return d.sales - d.totalCost
        },
        formatValue: fmtSen,
      },
      budget: {
        title: '粗利予算 — 進捗推移',
        color: palette.purpleDeep,
        getValue: (day) => {
          const cum = r.dailyCumulative.get(day)
          return cum ? cum.sales : 0
        },
        formatValue: fmtSen,
      },
    }),
    [r],
  )

  // ドリルダウンデータ
  const drillData = useMemo(() => {
    if (!drillTarget) return null
    const config = drillConfigs[drillTarget]
    const days: { day: number; value: number; dow: number }[] = []
    let maxVal = 0
    let totalVal = 0
    let maxDay = 0
    let minDay = 0
    let minVal = Infinity
    let maxDayVal = -Infinity
    const salesDays = r.salesDays || r.elapsedDays

    // 在庫法粗利は月次のみ → 日別なし
    if (drillTarget === 'gpInv') {
      return {
        days: [],
        config,
        max: 0,
        total: r.invMethodGrossProfit ?? 0,
        avg: r.invMethodGrossProfit ?? 0,
        maxDay: 0,
        minDay: 0,
        isMonthlyOnly: true,
      }
    }

    // 予算進捗
    if (drillTarget === 'budget') {
      let cumSales = 0
      for (let d = 1; d <= salesDays; d++) {
        const rec = r.daily.get(d)
        const sales = rec?.sales ?? 0
        cumSales += sales
        const budgetCum = r.dailyCumulative.get(d)?.budget ?? 0
        days.push({
          day: d,
          value: cumSales,
          dow: new Date(2026, 0, d).getDay(), // placeholder
        })
        if (budgetCum > maxVal) maxVal = budgetCum
        if (cumSales > maxVal) maxVal = cumSales
      }
      return {
        days,
        config,
        max: maxVal,
        total: r.grossProfitBudget,
        avg: 0,
        maxDay: 0,
        minDay: 0,
        isMonthlyOnly: false,
        isBudget: true,
      }
    }

    for (let d = 1; d <= salesDays; d++) {
      const val = config.getValue(d, r)
      if (val === 0 && !r.daily.has(d)) continue
      const date = new Date(2026, 0, d) // dow placeholder, actual month not critical for dow
      days.push({ day: d, value: val, dow: date.getDay() })
      totalVal += val
      if (val > maxVal) maxVal = val
      if (val > maxDayVal) {
        maxDayVal = val
        maxDay = d
      }
      if (val < minVal) {
        minVal = val
        minDay = d
      }
    }

    return {
      days,
      config,
      max: maxVal,
      total: totalVal,
      avg: days.length > 0 ? totalVal / days.length : 0,
      maxDay,
      minDay,
      isMonthlyOnly: false,
    }
  }, [drillTarget, drillConfigs, r])

  return (
    <Wrapper aria-label="構造概要チャート">
      <Title>
        収益構造俯瞰図（売上→原価→売変→粗利）
        <ChartHelpButton guide={CHART_GUIDES['structural-overview']} />
      </Title>
      <FlowContainer>
        {/* 左: 売上 */}
        <Column>
          <ColumnLabel>収入</ColumnLabel>
          <FlowNode
            $color={palette.primary}
            $height={h(nodes.grossSales.value)}
            $clickable
            $active={drillTarget === 'grossSales'}
            onClick={() => handleNodeClick('grossSales')}
          >
            <NodeLabel>粗売上</NodeLabel>
            <NodeValue>
              {fmtMan(nodes.grossSales.value)}
              {renderYoy(nodes.grossSales.yoy)}
            </NodeValue>
            <NodeSub>{toComma(nodes.grossSales.value)}円</NodeSub>
          </FlowNode>
          <FlowNode
            $color={palette.purpleDark}
            $height={h(nodes.totalSales.value)}
            $clickable
            $active={drillTarget === 'totalSales'}
            onClick={() => handleNodeClick('totalSales')}
          >
            <NodeLabel>純売上</NodeLabel>
            <NodeValue>
              {fmtMan(nodes.totalSales.value)}
              {renderYoy(nodes.totalSales.yoy)}
            </NodeValue>
            <NodeSub>
              粗売上の{toPct(safeDivide(nodes.totalSales.value, nodes.grossSales.value, 0))}
            </NodeSub>
          </FlowNode>
        </Column>

        <Arrow>&rarr;</Arrow>

        {/* 中: コスト */}
        <Column>
          <ColumnLabel>コスト</ColumnLabel>
          <FlowNode
            $color={sc.negative}
            $height={h(nodes.cost.value)}
            $clickable
            $active={drillTarget === 'cost'}
            onClick={() => handleNodeClick('cost')}
          >
            <NodeLabel>仕入原価</NodeLabel>
            <NodeValue>
              {fmtMan(nodes.cost.value)}
              {renderYoy(nodes.cost.yoy)}
            </NodeValue>
            <NodeSub>値入率 {toPct(nodes.markupRate)}</NodeSub>
          </FlowNode>
          <FlowNode
            $color={palette.warningDark}
            $height={h(nodes.discount.value)}
            $clickable
            $active={drillTarget === 'discount'}
            onClick={() => handleNodeClick('discount')}
          >
            <NodeLabel>売変額</NodeLabel>
            <NodeValue>
              {fmtMan(nodes.discount.value)}
              {renderYoy(nodes.discount.yoy)}
            </NodeValue>
            <NodeSub>売変率 {toPct(nodes.discountRate)}</NodeSub>
          </FlowNode>
          <FlowNode
            $color={palette.orange}
            $height={h(nodes.costInclusion.value)}
            $clickable
            $active={drillTarget === 'costInclusion'}
            onClick={() => handleNodeClick('costInclusion')}
          >
            <NodeLabel>原価算入費</NodeLabel>
            <NodeValue>
              {fmtMan(nodes.costInclusion.value)}
              {renderYoy(nodes.costInclusion.yoy)}
            </NodeValue>
          </FlowNode>
        </Column>

        <Arrow>&rarr;</Arrow>

        {/* 右: 利益 */}
        <Column>
          <ColumnLabel>利益</ColumnLabel>
          {nodes.gpInv.value != null && (
            <FlowNode
              $color={sc.positive}
              $height={h(nodes.gpInv.value)}
              $clickable
              $active={drillTarget === 'gpInv'}
              onClick={() => handleNodeClick('gpInv')}
            >
              <NodeLabel>粗利（在庫法）</NodeLabel>
              <NodeValue>
                {fmtMan(nodes.gpInv.value)}
                {renderYoy(nodes.gpInv.yoy)}
              </NodeValue>
              <NodeSub>粗利率 {nodes.gpRateInv != null ? toPct(nodes.gpRateInv) : '-'}</NodeSub>
            </FlowNode>
          )}
          <FlowNode
            $color={palette.cyanDark}
            $height={h(nodes.gpEst.value)}
            $clickable
            $active={drillTarget === 'gpEst'}
            onClick={() => handleNodeClick('gpEst')}
          >
            <NodeLabel>在庫差分（推定法）</NodeLabel>
            <NodeValue>
              {fmtMan(nodes.gpEst.value)}
              {renderYoy(nodes.gpEst.yoy)}
            </NodeValue>
            <NodeSub>在庫差分率 {toPct(nodes.gpRateEst)}</NodeSub>
            <NodeSub>※損益ではありません</NodeSub>
          </FlowNode>
          {nodes.budget.value > 0 && (
            <FlowNode
              $color={palette.purpleDeep}
              $height={40}
              $clickable
              $active={drillTarget === 'budget'}
              onClick={() => handleNodeClick('budget')}
            >
              <NodeLabel>粗利予算</NodeLabel>
              <NodeValue>{fmtMan(nodes.budget.value)}</NodeValue>
              <NodeSub>
                残: {fmtMan(nodes.budget.value - (nodes.gpInv.value ?? nodes.gpEst.value))}
              </NodeSub>
            </FlowNode>
          )}
        </Column>
      </FlowContainer>

      {/* ドリルダウンパネル */}
      {drillTarget && drillData && (
        <DrillPanel $color={drillData.config.color}>
          <DrillHeader>
            <DrillTitle>{drillData.config.title}</DrillTitle>
            <CloseBtn onClick={() => setDrillTarget(null)}>閉じる</CloseBtn>
          </DrillHeader>

          {drillData.isMonthlyOnly ? (
            <div style={{ fontSize: '0.6rem', color: 'inherit' }}>
              <p style={{ margin: '4px 0' }}>
                在庫法粗利は月次の棚卸結果から算出されるため、日別内訳はありません。
              </p>
              <DrillSummary>
                <span>
                  月次粗利: <DrillStat>{fmtMan(drillData.total)}</DrillStat>
                </span>
                <span>
                  粗利率:{' '}
                  <DrillStat>{nodes.gpRateInv != null ? toPct(nodes.gpRateInv) : '-'}</DrillStat>
                </span>
              </DrillSummary>
              <div style={{ marginTop: 8, fontSize: '0.55rem', color: palette.primary }}>
                <button
                  onClick={() => handleDrillThrough('gross-profit-rate')}
                  style={{
                    all: 'unset',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    color: 'inherit',
                  }}
                >
                  粗利率推移チャートを表示 &rarr;
                </button>
              </div>
            </div>
          ) : 'isBudget' in drillData && drillData.isBudget ? (
            <BudgetDrillView result={r} fmtSen={fmtSen} fmtMan={fmtMan} nodes={nodes} />
          ) : (
            <>
              <DrillGrid>
                {drillData.days.map((d) => (
                  <DrillDay
                    key={d.day}
                    $intensity={drillData.max > 0 ? d.value / drillData.max : 0}
                    $color={drillData.config.color}
                  >
                    <DrillDayLabel>
                      {d.day}日({DOW_LABELS[d.dow]})
                    </DrillDayLabel>
                    <DrillDayValue>{drillData.config.formatValue(d.value)}</DrillDayValue>
                  </DrillDay>
                ))}
              </DrillGrid>
              <DrillSummary>
                <span>
                  合計: <DrillStat>{fmtMan(drillData.total)}</DrillStat>
                </span>
                <span>
                  日平均: <DrillStat>{fmtSen(drillData.avg)}</DrillStat>
                </span>
                {drillData.maxDay > 0 && (
                  <span>
                    最大: <DrillStat>{drillData.maxDay}日</DrillStat>
                  </span>
                )}
                {drillData.minDay > 0 && (
                  <span>
                    最小: <DrillStat>{drillData.minDay}日</DrillStat>
                  </span>
                )}
              </DrillSummary>
              {/* 関連チャートへのリンク */}
              {(drillTarget === 'cost' ||
                drillTarget === 'discount' ||
                drillTarget === 'gpEst') && (
                <div style={{ marginTop: 8, fontSize: '0.55rem' }}>
                  <button
                    onClick={() =>
                      handleDrillThrough(
                        drillTarget === 'discount'
                          ? 'discount-trend'
                          : drillTarget === 'gpEst'
                            ? 'gross-profit-rate'
                            : 'daily-sales',
                      )
                    }
                    style={{
                      all: 'unset',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      color: palette.primary,
                    }}
                  >
                    {drillTarget === 'discount'
                      ? '売変内訳分析を表示'
                      : drillTarget === 'gpEst'
                        ? '粗利率推移チャートを表示'
                        : '日別売上チャートを表示'}{' '}
                    &rarr;
                  </button>
                </div>
              )}
            </>
          )}
        </DrillPanel>
      )}

      <SummaryRow>
        <SumCard $color={palette.primary}>
          <SumLabel>売上構成</SumLabel>
          <SumValue>
            原価 {toPct(safeDivide(nodes.cost.value, nodes.grossSales.value, 0))} / 売変{' '}
            {toPct(nodes.discountRate)} / 消耗品{' '}
            {toPct(safeDivide(nodes.costInclusion.value, nodes.totalSales.value, 0))}
          </SumValue>
        </SumCard>
        <SumCard $color={sc.positive}>
          <SumLabel>粗利率トレンド</SumLabel>
          <SumValue>
            {nodes.gpRateInv != null
              ? `在庫法: ${toPct(nodes.gpRateInv)}`
              : `推定法（在庫差分率）: ${toPct(nodes.gpRateEst)}`}
            {prev && (prev.invMethodGrossProfitRate != null || prev.estMethodMarginRate > 0) && (
              <YoyBadge
                $positive={getEffectiveGrossProfitRate(r) >= getEffectiveGrossProfitRate(prev)}
              >
                前年 {toPct(getEffectiveGrossProfitRate(prev))}
              </YoyBadge>
            )}
          </SumValue>
        </SumCard>
      </SummaryRow>
    </Wrapper>
  )
})

// ── 予算ドリルダウン ──

function BudgetDrillView({
  result,
  fmtSen,
  fmtMan,
  nodes,
}: {
  result: StoreResult
  fmtSen: (v: number) => string
  fmtMan: (v: number | null | undefined) => string
  nodes: {
    gpInv: { value: number | null }
    gpEst: { value: number }
    budget: { value: number }
  }
}) {
  const salesDays = result.salesDays || result.elapsedDays
  const budget = nodes.budget.value
  const actualGp = nodes.gpInv.value ?? nodes.gpEst.value
  const remaining = budget - actualGp
  const achievement = budget > 0 ? actualGp / budget : 0

  // 日別累計売上 vs 累計予算
  const cumData = useMemo(() => {
    const rows: { day: number; cumSales: number; cumBudget: number }[] = []
    let cumS = 0
    for (let d = 1; d <= salesDays; d++) {
      const rec = result.daily.get(d)
      cumS += rec?.sales ?? 0
      const cumB = result.dailyCumulative.get(d)?.budget ?? 0
      rows.push({ day: d, cumSales: cumS, cumBudget: cumB })
    }
    return rows
  }, [result, salesDays])

  const maxVal = useMemo(
    () => Math.max(...cumData.map((d) => Math.max(d.cumSales, d.cumBudget)), 1),
    [cumData],
  )

  return (
    <div>
      {/* 簡易予算進捗バー */}
      <div style={{ marginBottom: 8 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.55rem',
            marginBottom: 2,
          }}
        >
          <span>予算達成率: {toPct(achievement)}</span>
          <span>残: {fmtMan(remaining)}</span>
        </div>
        <div
          style={{
            height: 8,
            background: 'rgba(0,0,0,0.06)',
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${Math.min(achievement * 100, 100)}%`,
              background: achievement >= 1 ? sc.positive : palette.primary,
              borderRadius: 4,
              transition: 'width 0.3s',
            }}
          />
        </div>
      </div>

      {/* 売上累計 vs 予算累計のミニバーチャート */}
      <div style={{ display: 'flex', gap: 2, alignItems: 'end', height: 60 }}>
        {cumData.map((d) => (
          <div
            key={d.day}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          >
            <div
              style={{
                width: '100%',
                display: 'flex',
                gap: 1,
                alignItems: 'end',
                height: 50,
              }}
            >
              <div
                style={{
                  flex: 1,
                  height: `${(d.cumSales / maxVal) * 100}%`,
                  background: palette.primary,
                  borderRadius: '2px 2px 0 0',
                  opacity: 0.7,
                  minHeight: 1,
                }}
                title={`${d.day}日 売上累計: ${fmtSen(d.cumSales)}`}
              />
              <div
                style={{
                  flex: 1,
                  height: `${(d.cumBudget / maxVal) * 100}%`,
                  background: palette.purpleDeep,
                  borderRadius: '2px 2px 0 0',
                  opacity: 0.4,
                  minHeight: 1,
                }}
                title={`${d.day}日 予算累計: ${fmtSen(d.cumBudget)}`}
              />
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 16,
          marginTop: 4,
          fontSize: '0.5rem',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 2,
              background: palette.primary,
              opacity: 0.7,
              display: 'inline-block',
            }}
          />
          売上累計
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 2,
              background: palette.purpleDeep,
              opacity: 0.4,
              display: 'inline-block',
            }}
          />
          予算累計
        </span>
      </div>
      <DrillSummary>
        <span>
          実績: <DrillStat>{fmtMan(actualGp)}</DrillStat>
        </span>
        <span>
          予算: <DrillStat>{fmtMan(budget)}</DrillStat>
        </span>
        <span>
          差: <DrillStat>{fmtMan(actualGp - budget)}</DrillStat>
        </span>
      </DrillSummary>
    </div>
  )
}
