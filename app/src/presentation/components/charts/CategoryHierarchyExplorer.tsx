/**
 * カテゴリ階層エクスプローラー コントローラー
 *
 * 部門→ライン→クラス の階層ドリルダウンを提供する。
 * データ集約は useCategoryExplorerData、テーブル描画は CategoryExplorerTable に委譲。
 */
import { Fragment, memo } from 'react'
import type { CategoryTimeSalesIndex } from '@/domain/models'
import { toPct } from './chartTheme'
import { PeriodFilterBar, HierarchyDropdowns } from './PeriodFilter'
import { useCategoryExplorerData } from './useCategoryExplorerData'
import { CategoryExplorerTable } from './CategoryExplorerTable'
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
  ctsIndex: CategoryTimeSalesIndex
  prevCtsIndex: CategoryTimeSalesIndex
  selectedStoreIds: ReadonlySet<string>
  daysInMonth: number
  year: number
  month: number
  dataMaxDay?: number
  totalCustomers?: number
}

export const CategoryHierarchyExplorer = memo(function CategoryHierarchyExplorer({
  ctsIndex,
  prevCtsIndex,
  selectedStoreIds,
  daysInMonth,
  year,
  month,
  dataMaxDay,
  totalCustomers,
}: Props) {
  const d = useCategoryExplorerData(
    ctsIndex,
    prevCtsIndex,
    selectedStoreIds,
    daysInMonth,
    year,
    month,
    dataMaxDay,
    totalCustomers,
  )

  if (d.sortedItems.length === 0)
    return (
      <Wrapper>
        <EmptyFilterMsg>選択した絞り込み条件に該当するデータがありません</EmptyFilterMsg>
        <PeriodFilterBar pf={d.pf} daysInMonth={daysInMonth} />
        <HierarchyDropdowns hf={d.hf} />
      </Wrapper>
    )

  return (
    <Wrapper>
      <HeaderRow>
        <BreadcrumbBar style={{ marginBottom: 0 }}>
          {d.breadcrumb.map((bc, i) => (
            <Fragment key={i}>
              {i > 0 && <BreadcrumbSep>▸</BreadcrumbSep>}
              <BreadcrumbItem
                $active={i === d.breadcrumb.length - 1}
                onClick={() => d.setFilter(bc.filter)}
              >
                {bc.label}
              </BreadcrumbItem>
            </Fragment>
          ))}
          {d.filter.departmentCode && <ResetBtn onClick={() => d.setFilter({})}>リセット</ResetBtn>}
        </BreadcrumbBar>
        {d.hasPrevYear && (
          <TabGroup role="tablist" aria-label="表示切替">
            <Tab
              $active={d.showYoY}
              onClick={() => d.setShowYoY(!d.showYoY)}
              role="tab"
              aria-selected={d.showYoY}
            >
              前年比較
            </Tab>
          </TabGroup>
        )}
      </HeaderRow>
      <SummaryBar>
        <SummaryItem>
          <SummaryLabel>{d.levelLabels[d.currentLevel]}数</SummaryLabel>
          <SummaryValue>{d.items.length}</SummaryValue>
        </SummaryItem>
        <SummaryItem>
          <SummaryLabel>合計金額</SummaryLabel>
          <SummaryValue>{Math.round(d.totalAmt / 10000).toLocaleString()}万円</SummaryValue>
        </SummaryItem>
        <SummaryItem>
          <SummaryLabel>合計数量</SummaryLabel>
          <SummaryValue>{d.totalQty.toLocaleString()}点</SummaryValue>
        </SummaryItem>
        {d.showYoYCols && d.totalYoYRatio != null && (
          <SummaryItem>
            <SummaryLabel>前年比</SummaryLabel>
            <SummaryValue>
              <YoYBadge $positive={d.totalYoYRatio >= 1}>
                {d.totalYoYRatio >= 1 ? '+' : ''}
                {toPct(d.totalYoYRatio - 1)}
              </YoYBadge>
            </SummaryValue>
          </SummaryItem>
        )}
        {d.showYoYCols && d.totalPrevAmt > 0 && (
          <SummaryItem>
            <SummaryLabel>前年合計</SummaryLabel>
            <SummaryValue style={{ opacity: 0.7 }}>
              {Math.round(d.totalPrevAmt / 10000).toLocaleString()}万円
            </SummaryValue>
          </SummaryItem>
        )}
      </SummaryBar>

      <CategoryExplorerTable
        items={d.items}
        sortedItems={d.sortedItems}
        currentLevel={d.currentLevel}
        levelLabels={d.levelLabels}
        sortKey={d.sortKey}
        sortDir={d.sortDir}
        handleSort={d.handleSort}
        handleDrill={d.handleDrill}
        showYoYCols={d.showYoYCols}
        showPi={d.showPi}
        avgPi={d.avgPi}
        maxAmt={d.maxAmt}
        canDrill={d.canDrill}
      />
      <PeriodFilterBar pf={d.pf} daysInMonth={daysInMonth} />
      <HierarchyDropdowns hf={d.hf} />
    </Wrapper>
  )
})
