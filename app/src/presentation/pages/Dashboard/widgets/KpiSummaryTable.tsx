/**
 * KPI統合テーブル — 売上予算 + 粗利予算の2セクション
 *
 * メトリクス階層:
 *   主1: 売上予算達成率 + Sub2(客数/客単価) → シャープリー直結
 *   主2: 粗利額+粗利率予算 + Sub1(値入率/売変率) → 原価分析直結
 *
 * ドリルダウン: 行クリック → 店別展開 → 「詳しく→」で別ページ
 * 根拠: [?] ボタン → MetricBreakdownPanel
 */

import { useState, useMemo, memo, useCallback } from 'react'
import type { WidgetContext } from './types'
import type { MetricId } from '@/domain/models'
import {
  type SectionData,
  type SummaryRow,
  buildSections,
  buildStoreBreakdown,
} from './KpiSummaryTable.vm'
import {
  TableWrapper,
  TableHeader,
  TableMeta,
  TableTitle,
  SectionWrapper,
  SectionHeader,
  SectionChevron,
  SectionLabel,
  RowWrapper,
  RowLabel,
  RowValue,
  RowBudget,
  RowAchievement,
  EvidenceBtn,
  BreakdownWrapper,
  BreakdownRow,
  BreakdownStoreName,
  BreakdownValue,
  BreakdownBudget,
  BreakdownAch,
  DrillLink,
  ColumnHeaders,
  ColumnHeaderLabel,
} from './KpiSummaryTable.styles'

// ─── Component ──────────────────────────────────────────

export const KpiSummaryTable = memo(function KpiSummaryTable({
  ctx,
}: {
  readonly ctx: WidgetContext
}) {
  const [expandedSections, setExpandedSections] = useState<ReadonlySet<string>>(
    () => new Set(['sales', 'profit']),
  )
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  const sections = useMemo(
    () => buildSections(ctx.result, ctx.fmtCurrency),
    [ctx.result, ctx.fmtCurrency],
  )

  const storeBreakdown = useMemo(
    () =>
      expandedRow
        ? buildStoreBreakdown(expandedRow, ctx.allStoreResults, ctx.stores, ctx.fmtCurrency)
        : [],
    [expandedRow, ctx.allStoreResults, ctx.stores, ctx.fmtCurrency],
  )

  const toggleSection = useCallback((key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const handleRowClick = useCallback((key: string) => {
    setExpandedRow((prev) => (prev === key ? null : key))
  }, [])

  const handleExplain = useCallback(
    (metricId: string, e: React.MouseEvent) => {
      e.stopPropagation()
      ctx.onExplain(metricId as MetricId)
    },
    [ctx],
  )

  return (
    <TableWrapper>
      <TableHeader>
        <TableMeta>KPI SUMMARY</TableMeta>
        <TableTitle>収益概況</TableTitle>
      </TableHeader>

      <ColumnHeaders>
        <ColumnHeaderLabel>指標</ColumnHeaderLabel>
        <ColumnHeaderLabel>実績</ColumnHeaderLabel>
        <ColumnHeaderLabel>予算</ColumnHeaderLabel>
        <ColumnHeaderLabel>達成</ColumnHeaderLabel>
        <ColumnHeaderLabel />
      </ColumnHeaders>

      {sections.map((section) => (
        <SectionBlock
          key={section.key}
          section={section}
          isExpanded={expandedSections.has(section.key)}
          expandedRow={expandedRow}
          storeBreakdown={storeBreakdown}
          onToggleSection={toggleSection}
          onRowClick={handleRowClick}
          onExplain={handleExplain}
        />
      ))}
    </TableWrapper>
  )
})

// ─── Section Block ──────────────────────────────────────

interface SectionBlockProps {
  readonly section: SectionData
  readonly isExpanded: boolean
  readonly expandedRow: string | null
  readonly storeBreakdown: ReturnType<typeof buildStoreBreakdown>
  readonly onToggleSection: (key: string) => void
  readonly onRowClick: (key: string) => void
  readonly onExplain: (metricId: string, e: React.MouseEvent) => void
}

function SectionBlock({
  section,
  isExpanded,
  expandedRow,
  storeBreakdown,
  onToggleSection,
  onRowClick,
  onExplain,
}: SectionBlockProps) {
  return (
    <SectionWrapper>
      <SectionHeader
        $expanded={isExpanded}
        onClick={() => onToggleSection(section.key)}
        aria-expanded={isExpanded}
      >
        <SectionChevron $expanded={isExpanded}>▶</SectionChevron>
        <SectionLabel>{section.title}</SectionLabel>
      </SectionHeader>

      {isExpanded &&
        section.rows.map((row) => (
          <RowBlock
            key={row.key}
            row={row}
            isExpanded={expandedRow === row.key}
            storeBreakdown={expandedRow === row.key ? storeBreakdown : []}
            onRowClick={onRowClick}
            onExplain={onExplain}
          />
        ))}
    </SectionWrapper>
  )
}

// ─── Row Block ──────────────────────────────────────────

interface RowBlockProps {
  readonly row: SummaryRow
  readonly isExpanded: boolean
  readonly storeBreakdown: ReturnType<typeof buildStoreBreakdown>
  readonly onRowClick: (key: string) => void
  readonly onExplain: (metricId: string, e: React.MouseEvent) => void
}

function RowBlock({ row, isExpanded, storeBreakdown, onRowClick, onExplain }: RowBlockProps) {
  return (
    <>
      <RowWrapper
        $isSub={row.isSub}
        $clickable={!row.isSub}
        onClick={!row.isSub ? () => onRowClick(row.key) : undefined}
      >
        <RowLabel $isSub={row.isSub}>{row.label}</RowLabel>
        <RowValue>{row.value}</RowValue>
        <RowBudget>{row.budget ?? ''}</RowBudget>
        <RowAchievement $color={row.achievementColor}>{row.achievement ?? ''}</RowAchievement>
        {row.metricId ? (
          <EvidenceBtn
            onClick={(e) => onExplain(row.metricId!, e)}
            aria-label={`${row.label}の根拠`}
            title="根拠を表示"
          >
            ?
          </EvidenceBtn>
        ) : (
          <span />
        )}
      </RowWrapper>

      {isExpanded && storeBreakdown.length > 0 && (
        <BreakdownWrapper>
          {storeBreakdown.map((store) => (
            <BreakdownRow key={store.storeId}>
              <BreakdownStoreName>{store.storeName}</BreakdownStoreName>
              <BreakdownValue>{store.value}</BreakdownValue>
              <BreakdownBudget>{store.budget ?? ''}</BreakdownBudget>
              <BreakdownAch $color={store.achievementColor}>{store.achievement}</BreakdownAch>
            </BreakdownRow>
          ))}
          {row.drillPage && (
            <DrillLink
              onClick={(e) => {
                e.stopPropagation()
                // Navigation will be handled by linkTo in the widget registry
              }}
            >
              詳しく →
            </DrillLink>
          )}
        </BreakdownWrapper>
      )}
    </>
  )
}
