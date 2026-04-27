/**
 * コンディションカード — 共通シェルコンポーネント
 *
 * 各メトリクスカードの描画を担う再利用可能なコンポーネント。
 * データとクリックハンドラを外部から受け取り、純粋に描画のみ行う。
 *
 * @responsibility R:unclassified
 */
import { memo } from 'react'
import {
  CondCard,
  CondSignal,
  CondCardContent,
  CondCardLabel,
  CondCardValue,
  CondCardSub,
} from './ConditionSummaryEnhanced.styles'

export interface ConditionCardData {
  /** カードの一意識別子 */
  readonly id: string
  /** カードグループ（並び替え・セクション分けに使用） */
  readonly group: 'budget' | 'yoy'
  /** 表示ラベル */
  readonly label: string
  /** メインの値表示 */
  readonly value: string
  /** 補足テキスト */
  readonly sub: string
  /** シグナルドットの色（達成=緑, 微未達=黄, 未達=赤） */
  readonly signalColor: string
  /** クリック可能かどうか */
  readonly clickable: boolean
  /** 直近1週間トレンド */
  readonly trend?: { readonly direction: 'up' | 'down' | 'flat'; readonly ratio: string }
  /** 未設定データがある場合のツールチップ案内 */
  readonly hint?: string
}

interface ConditionCardShellProps {
  readonly card: ConditionCardData
  readonly onClick?: () => void
}

const TREND_STYLES: Record<'up' | 'down' | 'flat', { arrow: string; color: string }> = {
  up: { arrow: '↑', color: '#10b981' },
  down: { arrow: '↓', color: '#ef4444' },
  flat: { arrow: '→', color: '#94a3b8' },
}

function TrendBadge({
  trend,
}: {
  readonly trend: { readonly direction: 'up' | 'down' | 'flat'; readonly ratio: string }
}) {
  const style = TREND_STYLES[trend.direction]
  return (
    <span
      style={{
        marginLeft: 6,
        fontSize: '0.65rem',
        fontFamily: 'monospace',
        fontWeight: 700,
        color: style.color,
        background: `${style.color}12`,
        padding: '1px 4px',
        borderRadius: 3,
        whiteSpace: 'nowrap',
      }}
      title={`7日トレンド: ${trend.ratio}`}
    >
      {style.arrow} {trend.ratio}
    </span>
  )
}

export const ConditionCardShell = memo(function ConditionCardShell({
  card,
  onClick,
}: ConditionCardShellProps) {
  return (
    <CondCard
      $borderColor={card.signalColor}
      $clickable={card.clickable}
      onClick={card.clickable ? onClick : undefined}
      title={card.hint}
    >
      <CondSignal $color={card.signalColor} />
      <CondCardContent>
        <CondCardLabel>
          {card.label}
          {card.trend && <TrendBadge trend={card.trend} />}
        </CondCardLabel>
        <CondCardValue $color={card.signalColor}>{card.value}</CondCardValue>
        <CondCardSub>{card.sub}</CondCardSub>
      </CondCardContent>
    </CondCard>
  )
})
