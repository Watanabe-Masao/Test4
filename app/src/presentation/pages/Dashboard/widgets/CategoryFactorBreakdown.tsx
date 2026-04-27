/**
 * カテゴリ別要因分解チャート
 *
 * 部門→ライン→クラスの各階層で要因分解を横棒グラフ+テーブルで表示。
 * クリックで下位階層にドリルダウン可能。
 * 2要素(客数・客単価) / 3要素(客数・点数・単価) / 5要素(+価格・構成比変化) を切替可能。
 *
 * @responsibility R:unclassified
 */
import { useState, useMemo, useCallback, Fragment, memo } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import { useCurrencyFormatter } from '@/presentation/components/charts/chartTheme'
import type { CategoryLeafDailyEntry } from '@/application/hooks/categoryLeafDaily/CategoryLeafDailyBundle.types'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbSep,
  LegendRow,
  LegendItem,
  LegendDot,
  DecompRow,
  DecompBtn,
} from './CategoryFactorBreakdown.styles'
import type {
  DecompLevel,
  FactorItem,
  PathEntry,
  DrillLevel,
} from './categoryFactorBreakdown.types'
import { FACTOR_COLORS } from './FactorTooltip'
import { CategoryFactorTable } from './CategoryFactorTable'
import { CategoryFactorEChart } from './CategoryFactorEChart'
import { useCurrencyFormat } from '@/presentation/components/charts/chartTheme'
import {
  filterRecordsByDrillPath,
  checkHasSubCategories,
  computeFactorItems,
  computeWaterfallItems,
  computeTotals,
} from './categoryFactorBreakdownLogic'

/* ── Component ──────────────────────────────────────── */

export const CategoryFactorBreakdown = memo(function CategoryFactorBreakdown({
  curRecords,
  prevRecords,
  curCustomers = 0,
  prevCustomers = 0,
  compact = false,
  curLabel = '当年',
  prevLabel = '前年',
}: {
  curRecords: readonly CategoryLeafDailyEntry[]
  prevRecords: readonly CategoryLeafDailyEntry[]
  curCustomers?: number
  prevCustomers?: number
  compact?: boolean
  curLabel?: string
  prevLabel?: string
}) {
  const hasCust = curCustomers > 0 && prevCustomers > 0
  const theme = useTheme() as AppTheme
  const fmt = useCurrencyFormatter()
  const { format: fmtCurrency } = useCurrencyFormat()
  const [drillPath, setDrillPath] = useState<PathEntry[]>([])
  const [decompLevel, setDecompLevel] = useState<DecompLevel | null>(null)

  const currentLevel: DrillLevel =
    drillPath.length === 0 ? 'dept' : drillPath.length === 1 ? 'line' : 'class'

  // Filter records by drill path
  const filtered = useMemo(
    () => filterRecordsByDrillPath(curRecords, prevRecords, drillPath),
    [curRecords, prevRecords, drillPath],
  )

  // Check if level 5 is available (need sub-categories)
  const hasSubCategories = useMemo(
    () => checkHasSubCategories(filtered.cur, currentLevel),
    [filtered.cur, currentLevel],
  )

  const maxLevel: DecompLevel = hasSubCategories ? 5 : 3
  const activeLevel = decompLevel !== null && decompLevel <= maxLevel ? decompLevel : maxLevel

  // Compute factor items
  const items = useMemo(
    () =>
      computeFactorItems(
        filtered,
        currentLevel,
        activeLevel,
        hasCust,
        curCustomers,
        prevCustomers,
        compact,
      ),
    [filtered, currentLevel, compact, hasCust, curCustomers, prevCustomers, activeLevel],
  )

  // Build waterfall ranges
  const waterfallItems = useMemo(
    () => computeWaterfallItems(items, activeLevel, hasCust),
    [items, activeLevel, hasCust],
  )

  // Compute totals for the footer row
  const totals = useMemo(() => computeTotals(items), [items])

  const handleDrill = useCallback(
    (item: FactorItem) => {
      if (!item.hasChildren) return
      setDrillPath((prev) => [...prev, { level: currentLevel, code: item.code, name: item.name }])
    },
    [currentLevel],
  )

  const handleBreadcrumb = useCallback((idx: number) => {
    setDrillPath((prev) => prev.slice(0, idx))
  }, [])

  const handleChartClick = useCallback(
    (params: Record<string, unknown>) => {
      const dataIndex = params.dataIndex as number | undefined
      if (dataIndex == null) return
      const item = waterfallItems[dataIndex]
      if (item) handleDrill(item)
    },
    [waterfallItems, handleDrill],
  )

  if (items.length === 0) return null

  const levelLabel =
    currentLevel === 'dept' ? '部門' : currentLevel === 'line' ? 'ライン' : 'クラス'
  // 品目数と分解要素数に応じて行間を動的に算出
  const ROW_HEIGHT = compact ? 32 : 40
  const chartH = Math.max(compact ? 200 : 280, items.length * ROW_HEIGHT + 60)

  return (
    <div>
      {/* Breadcrumb */}
      {drillPath.length > 0 && (
        <Breadcrumb>
          <BreadcrumbItem onClick={() => handleBreadcrumb(0)}>全体</BreadcrumbItem>
          {drillPath.map((entry, i) => (
            <Fragment key={i}>
              <BreadcrumbSep>&rsaquo;</BreadcrumbSep>
              <BreadcrumbItem
                onClick={() => handleBreadcrumb(i + 1)}
                $active={i === drillPath.length - 1}
              >
                {entry.name}
              </BreadcrumbItem>
            </Fragment>
          ))}
        </Breadcrumb>
      )}

      {/* Decomposition level toggle */}
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

      {/* Legend */}
      <LegendRow>
        {hasCust && (
          <LegendItem>
            <LegendDot $color={FACTOR_COLORS.cust} />
            客数効果
          </LegendItem>
        )}
        {activeLevel === 2 && (
          <LegendItem>
            <LegendDot $color={FACTOR_COLORS.ticket} />
            客単価効果
          </LegendItem>
        )}
        {activeLevel >= 3 && (
          <LegendItem>
            <LegendDot $color={FACTOR_COLORS.qty} />
            点数効果
          </LegendItem>
        )}
        {activeLevel === 3 && (
          <LegendItem>
            <LegendDot $color={FACTOR_COLORS.price} />
            単価効果
          </LegendItem>
        )}
        {activeLevel === 5 && (
          <>
            <LegendItem>
              <LegendDot $color={FACTOR_COLORS.price} />
              価格効果
            </LegendItem>
            <LegendItem>
              <LegendDot $color={FACTOR_COLORS.mix} />
              構成比変化効果
            </LegendItem>
          </>
        )}
      </LegendRow>

      {/* Horizontal waterfall x department hybrid chart */}
      <CategoryFactorEChart
        waterfallItems={waterfallItems}
        activeLevel={activeLevel}
        hasCust={hasCust}
        compact={compact}
        chartH={chartH}
        theme={theme}
        fmt={fmt}
        fmtCurrency={fmtCurrency}
        prevLabel={prevLabel}
        curLabel={curLabel}
        onClick={handleChartClick}
      />

      {/* Summary table */}
      <CategoryFactorTable
        items={items}
        totals={totals}
        activeLevel={activeLevel}
        hasCust={hasCust}
        levelLabel={levelLabel}
        prevLabel={prevLabel}
        curLabel={curLabel}
        onDrill={handleDrill}
      />
    </div>
  )
})
