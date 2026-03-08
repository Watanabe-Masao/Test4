/**
 * チャートヘッダー共通コンポーネント
 *
 * 各チャートで重複していた HeaderRow / Title / ViewToggle / ViewBtn を
 * 一箇所に集約。既存チャートはこのコンポーネントを利用する形に段階的に移行。
 */
import { useState, useCallback } from 'react'
import type { ChartGuide } from './chartGuides'
import {
  ChartHeaderRow,
  ChartTitle,
  ChartViewToggle,
  ChartViewBtn,
  ChartViewSep,
  ChartWrapper,
  HelpBtn,
  GuidePanel,
  GuidePurpose,
  GuideList,
  GuideSection,
  GuideSectionLabel,
  MetricTag,
  MetricSummary,
} from './ChartHeader.styles'

export { ChartHeaderRow, ChartTitle, ChartViewToggle, ChartViewBtn, ChartViewSep, ChartWrapper }

// ─── チャートヘルプボタン ──────────────────────────────

/** チャートタイトル横に表示するヘルプボタン + 展開パネル */
export function ChartHelpButton({ guide }: { guide: ChartGuide }) {
  const [open, setOpen] = useState(false)
  const toggle = useCallback(() => setOpen((v) => !v), [])

  return (
    <>
      <HelpBtn $active={open} onClick={toggle} aria-label="このグラフの読み方" aria-expanded={open}>
        ?
      </HelpBtn>
      {open && <ChartGuidePanel guide={guide} />}
    </>
  )
}

/** Explanation L1 要約の型（application 層への依存を避けるため最小限の型を定義） */
interface MetricSummaryInfo {
  readonly title: string
  readonly summary?: string
}

/**
 * ガイドパネル本体（ChartHelpButton から分離して直接使用も可能）
 *
 * @param guide - チャートガイド定義
 * @param metricSummaries - 関連指標の L1 要約。キーは MetricId。
 *   ExplanationService.generateExplanations() の結果から title / formula を渡す。
 */
export function ChartGuidePanel({
  guide,
  metricSummaries,
}: {
  guide: ChartGuide
  metricSummaries?: ReadonlyMap<string, MetricSummaryInfo>
}) {
  const hasMetrics =
    guide.relatedMetrics &&
    guide.relatedMetrics.length > 0 &&
    metricSummaries &&
    metricSummaries.size > 0

  return (
    <GuidePanel role="note" aria-label="グラフの読み方">
      <GuidePurpose>{guide.purpose}</GuidePurpose>
      <GuideSection>
        <GuideSectionLabel>読み方:</GuideSectionLabel>
        <GuideList>
          {guide.howToRead.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </GuideList>
      </GuideSection>
      {guide.keyPoints && guide.keyPoints.length > 0 && (
        <GuideSection>
          <GuideSectionLabel>注目ポイント:</GuideSectionLabel>
          <GuideList>
            {guide.keyPoints.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </GuideList>
        </GuideSection>
      )}
      {hasMetrics && (
        <GuideSection>
          <GuideSectionLabel>関連指標:</GuideSectionLabel>
          <div style={{ marginTop: 4 }}>
            {guide.relatedMetrics!.map((metricId) => {
              const info = metricSummaries!.get(metricId)
              if (!info) return null
              return (
                <MetricTag key={metricId}>
                  {info.title}
                  {info.summary && <MetricSummary> — {info.summary}</MetricSummary>}
                </MetricTag>
              )
            })}
          </div>
        </GuideSection>
      )}
    </GuidePanel>
  )
}
