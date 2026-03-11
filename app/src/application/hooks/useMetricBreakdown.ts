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
import type { Explanation, MetricId, Store } from '@/domain/models'
import { useExport } from './useExport'
import { generateMetricSummary } from '@/application/usecases/explanation/ExplanationService'
import type { FormulaDetail } from '@/domain/models'
import {
  buildFormattedInputs,
  buildReverseLinks,
  buildEvidenceSummary,
  buildBreakdownRows,
  buildEvidenceRefsByType,
  buildBreadcrumb,
  buildScopeLabel,
  formatMetricValue,
  resolveStoreName,
} from '@/application/usecases/metricBreakdownTransform'

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
  /** カスタム日ラベル（例: "2025年02月01日 (土)"）。未設定時は "{day}日" を表示 */
  readonly dayLabel?: string
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

  // ── Derived display data (pure transform functions) ──

  const inputs = useMemo(
    () => buildFormattedInputs(current.inputs, allExplanations),
    [current.inputs, allExplanations],
  )

  const reverseLinks = useMemo(
    () => buildReverseLinks(allExplanations, currentMetric),
    [allExplanations, currentMetric],
  )

  const hasDrilldown = !!(current.breakdown && current.breakdown.length > 0)
  const hasEvidence = current.evidenceRefs.length > 0

  const evidenceSummary = useMemo(
    () => buildEvidenceSummary(current.evidenceRefs),
    [current.evidenceRefs],
  )

  const breakdownRows = useMemo(
    () => buildBreakdownRows(current.breakdown, current.unit),
    [current.breakdown, current.unit],
  )

  const evidenceRefsByType = useMemo(
    () => buildEvidenceRefsByType(current.evidenceRefs, stores),
    [current.evidenceRefs, stores],
  )

  const breadcrumb = useMemo(
    () => buildBreadcrumb(history, allExplanations),
    [history, allExplanations],
  )

  return {
    title: current.title,
    formattedValue: formatMetricValue(current.value, current.unit),
    scopeLabel: buildScopeLabel(current.scope, stores),
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
