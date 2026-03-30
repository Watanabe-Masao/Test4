/**
 * カテゴリ階層エクスプローラー
 *
 * 部門→ライン→クラス の階層ドリルダウンを提供する。
 * データ取得・HierarchyItem 組み立ては useCategoryHierarchyData に分離。
 * テーブル描画は CategoryExplorerTable に委譲。
 */
/**
 * @migration P5: useQueryWithHandler 経由に移行済み（旧: useDuckDBLevelAggregation + useDuckDBCategoryHourly 直接 import）
 */
import { Fragment, memo, useMemo, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { DateRange, PrevYearScope } from '@/domain/models/calendar'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import { toPct } from './chartTheme'
import { CategoryExplorerTable } from './CategoryExplorerTable'
import { ChartSkeleton } from '@/presentation/components/common/feedback'
import { ChartHelpButton } from './ChartHeader'
import { CHART_GUIDES } from './chartGuides'
import type { HierarchyItem, SortKey, SortDir } from './categoryExplorerTypes'
import { useCategoryHierarchyData, type HierarchyLevel } from './useCategoryHierarchyData'
import {
  Wrapper,
  BreadcrumbBar,
  BreadcrumbItem,
  BreadcrumbSep,
  ResetBtn,
  SummaryBar,
  SummaryItem,
  SummaryLabel,
  SummaryValue,
  EmptyFilterMsg,
  YoYBadge,
  TabGroup,
  Tab,
  HeaderRow,
} from './CategoryHierarchyExplorer.styles'

interface Props {
  queryExecutor: QueryExecutor | null
  currentDateRange: DateRange
  prevYearScope?: PrevYearScope
  selectedStoreIds: ReadonlySet<string>
  totalCustomers?: number
}

interface HierarchyFilter {
  departmentCode?: string
  departmentName?: string
  lineCode?: string
  lineName?: string
}

export const CategoryHierarchyExplorer = memo(function CategoryHierarchyExplorer({
  queryExecutor,
  currentDateRange,
  prevYearScope,
  selectedStoreIds,
  totalCustomers,
}: Props) {
  const [filter, setFilter] = useState<HierarchyFilter>({})
  const [sortKey, setSortKey] = useState<SortKey>('amount')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [showYoY, setShowYoY] = useState(true)

  const currentLevel: HierarchyLevel = filter.lineCode
    ? 'klass'
    : filter.departmentCode
      ? 'line'
      : 'department'

  const levelLabels: Record<string, string> = {
    department: '部門',
    line: 'ライン',
    klass: 'クラス',
  }

  const { items, sortedItems, hasPrevYear, isLoading } = useCategoryHierarchyData({
    queryExecutor,
    currentDateRange,
    prevYearScope,
    selectedStoreIds,
    totalCustomers,
    filter,
    currentLevel,
    sortKey,
    sortDir,
  })

  const breadcrumb = useMemo(() => {
    const bc: { label: string; filter: HierarchyFilter }[] = [{ label: '全カテゴリ', filter: {} }]
    if (filter.departmentCode) {
      bc.push({
        label: filter.departmentName || filter.departmentCode,
        filter: { departmentCode: filter.departmentCode, departmentName: filter.departmentName },
      })
    }
    if (filter.lineCode) {
      bc.push({ label: filter.lineName || filter.lineCode, filter: { ...filter } })
    }
    return bc
  }, [filter])

  const handleDrill = useCallback(
    (it: HierarchyItem) => {
      if (currentLevel === 'department')
        setFilter({ departmentCode: it.code, departmentName: it.name })
      else if (currentLevel === 'line')
        setFilter({ ...filter, lineCode: it.code, lineName: it.name })
    },
    [currentLevel, filter],
  )

  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
      else {
        setSortKey(key)
        setSortDir('desc')
      }
    },
    [sortKey],
  )

  // ── サマリー KPI ──
  const totalAmt = items.reduce((s, i) => s + i.amount, 0)
  const totalQty = items.reduce((s, i) => s + i.quantity, 0)
  const totalPrevAmt = items.reduce((s, i) => s + (i.prevAmount ?? 0), 0)
  const totalYoYRatio = totalPrevAmt > 0 ? totalAmt / totalPrevAmt : null
  const maxAmt = items.length > 0 ? Math.max(...items.map((i) => i.amount)) : 1
  const showPi = totalCustomers != null && totalCustomers > 0
  const piItems = items.filter((i) => i.piValue != null)
  const avgPi =
    piItems.length > 0 ? piItems.reduce((s, i) => s + i.piValue!, 0) / piItems.length : 0
  const canDrill = currentLevel !== 'klass'
  const showYoYCols = hasPrevYear && showYoY

  // ── Early returns ──

  if (isLoading) {
    return (
      <Wrapper>
        <ChartSkeleton height="400px" />
      </Wrapper>
    )
  }

  if (sortedItems.length === 0) {
    return (
      <Wrapper>
        <EmptyFilterMsg>選択した絞り込み条件に該当するデータがありません</EmptyFilterMsg>
      </Wrapper>
    )
  }

  return (
    <Wrapper>
      <HeaderRow>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              fontSize: '0.82rem',
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            カテゴリードリルダウン分析
          </span>
          <ChartHelpButton guide={CHART_GUIDES['category-hierarchy-explorer']} />
        </div>
        {hasPrevYear && (
          <TabGroup role="tablist" aria-label="表示切替">
            <Tab
              $active={showYoY}
              onClick={() => setShowYoY(!showYoY)}
              role="tab"
              aria-selected={showYoY}
            >
              前年比較
            </Tab>
          </TabGroup>
        )}
      </HeaderRow>
      <BreadcrumbBar>
        <AnimatePresence mode="popLayout">
          {breadcrumb.map((bc, i) => (
            <Fragment key={bc.label}>
              {i > 0 && <BreadcrumbSep>▸</BreadcrumbSep>}
              <motion.span
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.15 }}
              >
                <BreadcrumbItem
                  $active={i === breadcrumb.length - 1}
                  onClick={() => setFilter(bc.filter)}
                >
                  {bc.label}
                </BreadcrumbItem>
              </motion.span>
            </Fragment>
          ))}
          {filter.departmentCode && (
            <motion.span
              key="reset"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.12 }}
            >
              <ResetBtn onClick={() => setFilter({})}>リセット</ResetBtn>
            </motion.span>
          )}
        </AnimatePresence>
      </BreadcrumbBar>
      <SummaryBar>
        <SummaryItem>
          <SummaryLabel>{levelLabels[currentLevel]}数</SummaryLabel>
          <SummaryValue>{items.length}</SummaryValue>
        </SummaryItem>
        <SummaryItem>
          <SummaryLabel>合計金額</SummaryLabel>
          <SummaryValue>{Math.round(totalAmt / 10000).toLocaleString()}万円</SummaryValue>
        </SummaryItem>
        <SummaryItem>
          <SummaryLabel>合計数量</SummaryLabel>
          <SummaryValue>{totalQty.toLocaleString()}点</SummaryValue>
        </SummaryItem>
        {showYoYCols && totalYoYRatio != null && (
          <SummaryItem>
            <SummaryLabel>前年比</SummaryLabel>
            <SummaryValue>
              <YoYBadge $positive={totalYoYRatio >= 1}>
                {totalYoYRatio >= 1 ? '+' : ''}
                {toPct(totalYoYRatio - 1)}
              </YoYBadge>
            </SummaryValue>
          </SummaryItem>
        )}
        {showYoYCols && totalPrevAmt > 0 && (
          <SummaryItem>
            <SummaryLabel>前年合計</SummaryLabel>
            <SummaryValue style={{ opacity: 0.7 }}>
              {Math.round(totalPrevAmt / 10000).toLocaleString()}万円
            </SummaryValue>
          </SummaryItem>
        )}
      </SummaryBar>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentLevel + (filter.departmentCode ?? '') + (filter.lineCode ?? '')}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
        >
          <CategoryExplorerTable
            items={items}
            sortedItems={sortedItems}
            currentLevel={currentLevel}
            levelLabels={levelLabels}
            sortKey={sortKey}
            sortDir={sortDir}
            handleSort={handleSort}
            handleDrill={handleDrill}
            showYoYCols={showYoYCols}
            showPi={showPi}
            avgPi={avgPi}
            maxAmt={maxAmt}
            canDrill={canDrill}
          />
        </motion.div>
      </AnimatePresence>
    </Wrapper>
  )
})
