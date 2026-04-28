/**
 * ChartCard — 統一チャートカードシェル
 *
 * 全チャートの外殻を統一する。タイトル帯 + ツールバー + 描画領域。
 * ChartHeader.tsx の ChartHelpButton を組み込み、ヘルプパネルも統合。
 *
 * variant:
 *   'card'    — スタンドアロンのチャートカード（デフォルト）
 *   'section' — 親カード内に埋め込まれるサブセクション
 * @responsibility R:unclassified
 */
import { type ReactNode, useState, useCallback } from 'react'
import type { ChartGuide } from './chartGuides'
import type { ChartCardVariant } from './ChartCard.styles'
import { ChartHelpButton } from './ChartHeader'
import { CardShell, HeaderRow, TitleArea, Title, Subtitle, ChartBody } from './ChartCard.styles'

interface ChartCardProps {
  readonly title: string
  readonly subtitle?: string
  readonly guide?: ChartGuide
  readonly toolbar?: ReactNode
  readonly height?: number
  readonly ariaLabel?: string
  /** 'card'（デフォルト）: スタンドアロン / 'section': 親カード内サブセクション */
  readonly variant?: ChartCardVariant
  /** 折りたたみ可能にする（デフォルト: false） */
  readonly collapsible?: boolean
  /** 折りたたみの初期状態（デフォルト: false = 開） */
  readonly defaultCollapsed?: boolean
  /** 表示状態の変化を通知する（H6: ChartCard は通知のみ。取得判断は Application 層） */
  readonly onVisibilityChange?: (visible: boolean) => void
  readonly children: ReactNode
}

/** @uic-id UIC-004 */
export function ChartCard({
  title,
  subtitle,
  guide,
  toolbar,
  height,
  ariaLabel,
  variant,
  collapsible,
  defaultCollapsed = false,
  onVisibilityChange,
  children,
}: ChartCardProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const toggleCollapse = useCallback(() => {
    setCollapsed((c) => {
      const next = !c
      onVisibilityChange?.(!next)
      return next
    })
  }, [onVisibilityChange])

  return (
    <CardShell aria-label={ariaLabel ?? title} $variant={variant}>
      <HeaderRow
        style={collapsible ? { cursor: 'pointer', userSelect: 'none' } : undefined}
        onClick={collapsible ? toggleCollapse : undefined}
      >
        <TitleArea>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {collapsible && (
              <span
                style={{
                  display: 'inline-block',
                  transition: 'transform 0.2s',
                  transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                  fontSize: '0.7em',
                }}
              >
                ▼
              </span>
            )}
            <div>
              <Title>{title}</Title>
              {subtitle && <Subtitle>{subtitle}</Subtitle>}
            </div>
          </div>
          {guide && <ChartHelpButton guide={guide} />}
        </TitleArea>
        {!collapsed && toolbar && <div onClick={(e) => e.stopPropagation()}>{toolbar}</div>}
      </HeaderRow>
      {!collapsed && <ChartBody $height={height}>{children}</ChartBody>}
    </CardShell>
  )
}
