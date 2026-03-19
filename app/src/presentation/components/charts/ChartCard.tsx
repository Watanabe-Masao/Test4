/**
 * ChartCard — 統一チャートカードシェル
 *
 * 全チャートの外殻を統一する。タイトル帯 + ツールバー + 描画領域。
 * ChartHeader.tsx の ChartHelpButton を組み込み、ヘルプパネルも統合。
 */
import type { ReactNode } from 'react'
import type { ChartGuide } from './chartGuides'
import { ChartHelpButton } from './ChartHeader'
import { CardShell, HeaderRow, TitleArea, Title, Subtitle, ChartBody } from './ChartCard.styles'

interface ChartCardProps {
  readonly title: string
  readonly subtitle?: string
  readonly guide?: ChartGuide
  readonly toolbar?: ReactNode
  readonly height?: number
  readonly ariaLabel?: string
  readonly children: ReactNode
}

export function ChartCard({
  title,
  subtitle,
  guide,
  toolbar,
  height,
  ariaLabel,
  children,
}: ChartCardProps) {
  return (
    <CardShell aria-label={ariaLabel ?? title}>
      <HeaderRow>
        <TitleArea>
          <div>
            <Title>{title}</Title>
            {subtitle && <Subtitle>{subtitle}</Subtitle>}
          </div>
          {guide && <ChartHelpButton guide={guide} />}
        </TitleArea>
        {toolbar}
      </HeaderRow>
      <ChartBody $height={height}>{children}</ChartBody>
    </CardShell>
  )
}
