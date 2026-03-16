/**
 * コンディションカード — 共通シェルコンポーネント
 *
 * 各メトリクスカードの描画を担う再利用可能なコンポーネント。
 * データとクリックハンドラを外部から受け取り、純粋に描画のみ行う。
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
}

interface ConditionCardShellProps {
  readonly card: ConditionCardData
  readonly onClick?: () => void
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
    >
      <CondSignal $color={card.signalColor} />
      <CondCardContent>
        <CondCardLabel>{card.label}</CondCardLabel>
        <CondCardValue $color={card.signalColor}>{card.value}</CondCardValue>
        <CondCardSub>{card.sub}</CondCardSub>
      </CondCardContent>
    </CondCard>
  )
})
