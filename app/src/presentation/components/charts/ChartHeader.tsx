/**
 * チャートヘッダー共通コンポーネント
 *
 * 各チャートで重複していた HeaderRow / Title / ViewToggle / ViewBtn を
 * 一箇所に集約。既存チャートはこのコンポーネントを利用する形に段階的に移行。
 */
import styled from 'styled-components'
import { useState, useCallback } from 'react'
import type { ChartGuide } from './chartGuides'

export const ChartHeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  padding: 0 ${({ theme }) => theme.spacing[4]};
`

export const ChartTitle = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
`

export const ChartViewToggle = styled.div`
  display: flex;
  gap: 2px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 2px;
`

export const ChartViewBtn = styled.button<{ $active?: boolean }>`
  all: unset;
  cursor: pointer;
  font-size: 0.65rem;
  padding: 3px 8px;
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ $active, theme }) => ($active ? theme.colors.palette.white : theme.colors.text3)};
  background: ${({ $active, theme }) => ($active ? theme.colors.palette.primary : 'transparent')};
  transition: all 0.15s;
  white-space: nowrap;
  &:hover {
    background: ${({ $active, theme }) =>
      $active
        ? theme.colors.palette.primary
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.08)'
          : 'rgba(0,0,0,0.06)'};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.radii.sm};
  }
`

export const ChartViewSep = styled.span`
  opacity: 0.4;
  padding: 3px 2px;
  cursor: default;
  font-size: 0.65rem;
  color: ${({ theme }) => theme.colors.text4};
`

export const ChartWrapper = styled.div<{ $height?: number }>`
  width: 100%;
  height: ${({ $height }) => $height ?? 400}px;
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]} ${({ theme }) => theme.spacing[4]}
    ${({ theme }) => theme.spacing[4]};
`

// ─── チャートヘルプボタン ──────────────────────────────

const HelpBtn = styled.button<{ $active?: boolean }>`
  all: unset;
  cursor: pointer;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.6rem;
  font-weight: 700;
  margin-left: ${({ theme }) => theme.spacing[2]};
  color: ${({ $active, theme }) => ($active ? theme.colors.palette.white : theme.colors.text4)};
  background: ${({ $active, theme }) => ($active ? theme.colors.palette.primary : 'transparent')};
  border: 1px solid
    ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.text4)};
  transition: all 0.15s;
  flex-shrink: 0;
  &:hover {
    color: ${({ theme }) => theme.colors.text};
    border-color: ${({ theme }) => theme.colors.text3};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.radii.sm};
  }
`

const GuidePanel = styled.div`
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  margin: 0 ${({ theme }) => theme.spacing[4]} ${({ theme }) => theme.spacing[3]};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text3};
  line-height: 1.6;
`

const GuidePurpose = styled.div`
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`

const GuideList = styled.ul`
  margin: 0;
  padding-left: 1.2em;
  li {
    margin-bottom: 2px;
  }
`

const GuideSection = styled.div`
  margin-top: ${({ theme }) => theme.spacing[2]};
`

const GuideSectionLabel = styled.span`
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
`

const MetricTag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  margin: 2px 4px 2px 0;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  white-space: nowrap;
`

const MetricSummary = styled.span`
  opacity: 0.7;
  font-family: ${({ theme }) => theme.typography.fontFamily.primary};
`

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
