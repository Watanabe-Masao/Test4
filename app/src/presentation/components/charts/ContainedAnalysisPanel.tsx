/**
 * ContainedAnalysisPanel — 包含型分析パネルの共通UI枠
 *
 * 「親の中に子を含む」構造を統一するコンポーネント。
 * 売上推移系もカテゴリ系も同じテンプレートで統一。
 *
 * 役割:
 * - role に応じた視覚階層（背景色・左ボーダー）
 * - 継承中の条件表示（ContextTag）
 * - ドリルダウン元の明示（drillLabel）
 * - slideDown アニメーション
 * @responsibility R:unclassified
 */
import { forwardRef, type ReactNode } from 'react'
import type { ContainedRole } from './ContainedAnalysisPanel.styles'
import {
  PanelShell,
  PanelHeader,
  TitleRow,
  PanelTitle,
  DrillLabel,
  PanelSubtitle,
  ContextTagBar,
  ContextTagChip,
  TagLabel,
} from './ContainedAnalysisPanel.styles'

// ── 型定義 ──

/** 継承中の条件を表すタグ */
export interface ContextTag {
  readonly label: string
  readonly value: string
}

export interface ContainedAnalysisPanelProps {
  readonly title: string
  readonly subtitle?: string
  /** 親から引き継いだ条件の表示 */
  readonly inheritedContext?: readonly ContextTag[]
  /** ドリルダウン元の説明（例: "日別からドリルダウン"） */
  readonly drillLabel?: string
  readonly toolbar?: ReactNode
  readonly children: ReactNode
  /** 包含階層での役割（child=子、grandchild=孫） */
  readonly role?: ContainedRole
  /** 到達時の一時的なハイライト */
  readonly emphasized?: boolean
}

// ── Component ──

export const ContainedAnalysisPanel = forwardRef<HTMLDivElement, ContainedAnalysisPanelProps>(
  function ContainedAnalysisPanel(
    {
      title,
      subtitle,
      inheritedContext,
      drillLabel,
      toolbar,
      children,
      role = 'child',
      emphasized,
    },
    ref,
  ) {
    return (
      <PanelShell $role={role} $emphasized={emphasized} ref={ref}>
        {/* コンテキストタグ（継承条件表示） */}
        {inheritedContext != null && inheritedContext.length > 0 && (
          <ContextTagBar>
            {inheritedContext.map((tag, i) => (
              <ContextTagChip key={i}>
                <TagLabel>{tag.label}:</TagLabel> {tag.value}
              </ContextTagChip>
            ))}
          </ContextTagBar>
        )}

        {/* ヘッダ */}
        <PanelHeader>
          <div>
            <TitleRow>
              <PanelTitle>{title}</PanelTitle>
              {drillLabel && <DrillLabel>{drillLabel}</DrillLabel>}
            </TitleRow>
            {subtitle && <PanelSubtitle>{subtitle}</PanelSubtitle>}
          </div>
          {toolbar}
        </PanelHeader>

        {/* コンテンツ */}
        {children}
      </PanelShell>
    )
  },
)
