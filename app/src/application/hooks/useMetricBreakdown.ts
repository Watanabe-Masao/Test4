/**
 * useMetricBreakdown — MetricBreakdownPanel のデータ変換・状態管理・副作用フック
 *
 * Presentation 層のコンポーネントからデータ変換と副作用を分離し、
 * 表示用 ViewModel を返す。コンポーネントは描画のみを行う。
 *
 * @see MetricBreakdownPanel.tsx — 描画コンポーネント
 * @see MetricBreakdownPanel.styles.ts — スタイル定義
 */
import { useState, useCallback, useMemo } from 'react'
import type { Explanation, FormulaDetail, MetricId, MetricUnit, Store } from '@/domain/models'
import { formatCurrency, formatPercent } from '@/domain/calculations/utils'
import { useExport } from './useExport'
import { generateMetricSummary } from '@/application/usecases/explanation/ExplanationService'

// ─── ViewModel 型定義 ──────────────────────────────────

type TabType = 'formula' | 'drilldown' | 'evidence'

export interface FormattedInput {
  readonly name: string
  readonly formattedValue: string
  readonly linkedMetric?: MetricId
}

export interface ReverseLink {
  readonly metric: MetricId
  readonly title: string
  readonly formattedValue: string
}

export interface BreakdownRow {
  readonly day: number
  readonly formattedValue: string
  readonly hasDetails: boolean
  readonly details?: readonly { label: string; formattedValue: string }[]
}

export interface EvidenceSummaryEntry {
  readonly dataType: string
  readonly label: string
  readonly count: number
}

export interface EvidenceRefRow {
  readonly kind: string
  readonly storeName: string
  readonly dayLabel: string
}

export interface BreadcrumbItem {
  readonly metric: MetricId
  readonly title: string
  readonly isLast: boolean
}

export interface MetricBreakdownViewModel {
  // ── Header ──
  readonly title: string
  readonly formattedValue: string
  readonly scopeLabel: string

  // ── Tabs ──
  readonly tab: TabType
  readonly setTab: (tab: TabType) => void
  readonly hasDrilldown: boolean
  readonly hasEvidence: boolean

  // ── Formula Tab ──
  readonly formula: string
  readonly formulaDetail?: FormulaDetail
  readonly inputs: readonly FormattedInput[]
  readonly reverseLinks: readonly ReverseLink[]
  readonly evidenceSummary: readonly EvidenceSummaryEntry[]

  // ── Drilldown Tab ──
  readonly breakdownTitle: string
  readonly breakdownRows: readonly BreakdownRow[]
  readonly expandedDays: ReadonlySet<number>
  readonly toggleDay: (day: number) => void

  // ── Evidence Tab ──
  readonly evidenceRefsByType: ReadonlyMap<string, readonly EvidenceRefRow[]>

  // ── Navigation ──
  readonly breadcrumb: readonly BreadcrumbItem[]
  readonly navigateTo: (metric: MetricId) => void
  readonly navigateBack: (index: number) => void

  // ── Actions ──
  readonly handleCsvExport: () => void
  readonly handleCopySummary: () => void
  readonly copied: boolean
}

// ─── ヘルパー ──────────────────────────────────────────

function formatValue(value: number, unit: MetricUnit): string {
  switch (unit) {
    case 'yen':
      return formatCurrency(value)
    case 'rate':
      return formatPercent(value)
    case 'count':
      return value.toLocaleString()
  }
}

function resolveStoreName(storeId: string, stores?: ReadonlyMap<string, Store>): string {
  if (storeId === 'aggregate') return '全店合計'
  if (!stores) return storeId
  const store = stores.get(storeId)
  return store ? `${store.name}（${store.code}）` : storeId
}

const DATA_TYPE_LABELS: Record<string, string> = {
  sales: '売上データ',
  purchase: '仕入データ',
  discount: '売変データ',
  flowers: '花データ',
  directProduce: '産直データ',
  interStoreIn: '店間入データ',
  interStoreOut: '店間出データ',
  consumables: '消耗品データ',
  categoryTimeSales: '分類別時間帯売上',
  budget: '予算データ',
  settings: '初期設定（在庫）',
}

// ─── Hook ──────────────────────────────────────────────

interface UseMetricBreakdownParams {
  readonly explanation: Explanation
  readonly allExplanations: ReadonlyMap<MetricId, Explanation>
  readonly stores?: ReadonlyMap<string, Store>
}

export function useMetricBreakdown({
  explanation,
  allExplanations,
  stores,
}: UseMetricBreakdownParams): MetricBreakdownViewModel {
  const [tab, setTab] = useState<TabType>('formula')
  const [history, setHistory] = useState<MetricId[]>([explanation.metric])
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set())
  const [copied, setCopied] = useState(false)
  const { exportExplanationReport } = useExport()

  const currentMetric = history[history.length - 1]
  const current = allExplanations.get(currentMetric) ?? explanation

  // ── Navigation ──

  const navigateTo = useCallback(
    (metric: MetricId) => {
      if (allExplanations.has(metric)) {
        setHistory((prev) => [...prev, metric])
        setTab('formula')
        setExpandedDays(new Set())
      }
    },
    [allExplanations],
  )

  const navigateBack = useCallback((index: number) => {
    setHistory((prev) => prev.slice(0, index + 1))
    setExpandedDays(new Set())
  }, [])

  const toggleDay = useCallback((day: number) => {
    setExpandedDays((prev) => {
      const next = new Set(prev)
      if (next.has(day)) next.delete(day)
      else next.add(day)
      return next
    })
  }, [])

  // ── Actions ──

  const handleCsvExport = useCallback(() => {
    const storeName = resolveStoreName(explanation.scope.storeId, stores)
    exportExplanationReport(
      allExplanations,
      storeName,
      explanation.scope.year,
      explanation.scope.month,
    )
  }, [allExplanations, explanation.scope, stores, exportExplanationReport])

  const handleCopySummary = useCallback(() => {
    const summaryLines: string[] = []
    for (const [, exp] of allExplanations) {
      summaryLines.push(generateMetricSummary(exp))
    }
    const text = summaryLines.join('\n')
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [allExplanations])

  // ── Derived display data ──

  const inputs = useMemo<readonly FormattedInput[]>(
    () =>
      current.inputs.map((inp) => ({
        name: inp.name,
        formattedValue: formatValue(inp.value, inp.unit),
        linkedMetric: inp.metric && allExplanations.has(inp.metric) ? inp.metric : undefined,
      })),
    [current.inputs, allExplanations],
  )

  const reverseLinks = useMemo<readonly ReverseLink[]>(() => {
    const links: ReverseLink[] = []
    for (const [metricId, exp] of allExplanations) {
      if (metricId === currentMetric) continue
      if (exp.inputs.some((inp) => inp.metric === currentMetric)) {
        links.push({
          metric: metricId,
          title: exp.title,
          formattedValue: formatValue(exp.value, exp.unit),
        })
      }
    }
    return links
  }, [allExplanations, currentMetric])

  const hasDrilldown = !!(current.breakdown && current.breakdown.length > 0)
  const hasEvidence = current.evidenceRefs.length > 0

  const evidenceSummary = useMemo<readonly EvidenceSummaryEntry[]>(() => {
    if (!hasEvidence) return []
    const counts = new Map<string, number>()
    for (const ref of current.evidenceRefs) {
      const dt = ref.dataType
      counts.set(dt, (counts.get(dt) ?? 0) + 1)
    }
    return Array.from(counts, ([dataType, count]) => ({
      dataType,
      label: DATA_TYPE_LABELS[dataType] ?? dataType,
      count,
    }))
  }, [current.evidenceRefs, hasEvidence])

  const breakdownRows = useMemo<readonly BreakdownRow[]>(() => {
    if (!current.breakdown) return []
    return current.breakdown.map((entry) => ({
      day: entry.day,
      formattedValue: formatValue(entry.value, entry.unit ?? current.unit),
      hasDetails: !!(entry.details && entry.details.length > 0),
      details: entry.details?.map((d) => ({
        label: d.label,
        formattedValue: formatValue(d.value, d.unit),
      })),
    }))
  }, [current.breakdown, current.unit])

  const evidenceRefsByType = useMemo<ReadonlyMap<string, readonly EvidenceRefRow[]>>(() => {
    if (!hasEvidence) return new Map()
    const grouped = new Map<string, EvidenceRefRow[]>()
    for (const ref of current.evidenceRefs) {
      const dt = ref.dataType
      if (!grouped.has(dt)) grouped.set(dt, [])
      grouped.get(dt)!.push({
        kind: ref.kind === 'daily' ? '日別' : '集計',
        storeName: resolveStoreName(ref.storeId, stores),
        dayLabel: ref.kind === 'daily' ? `${ref.day}日` : ref.day ? `${ref.day}日` : '-',
      })
    }
    // Limit to 31 per type
    for (const [dt, rows] of grouped) {
      if (rows.length > 31) grouped.set(dt, rows.slice(0, 31))
    }
    return grouped
  }, [current.evidenceRefs, hasEvidence, stores])

  const breadcrumb = useMemo<readonly BreadcrumbItem[]>(
    () =>
      history.map((id, i) => ({
        metric: id,
        title: allExplanations.get(id)?.title ?? id,
        isLast: i === history.length - 1,
      })),
    [history, allExplanations],
  )

  return {
    title: current.title,
    formattedValue: formatValue(current.value, current.unit),
    scopeLabel: `${current.scope.year}年${current.scope.month}月 / ${resolveStoreName(current.scope.storeId, stores)}`,
    tab,
    setTab,
    hasDrilldown,
    hasEvidence,
    formula: current.formula,
    formulaDetail: current.formulaDetail,
    inputs,
    reverseLinks,
    evidenceSummary,
    breakdownTitle: current.title,
    breakdownRows,
    expandedDays,
    toggleDay,
    evidenceRefsByType,
    breadcrumb,
    navigateTo,
    navigateBack,
    handleCsvExport,
    handleCopySummary,
    copied,
  }
}
