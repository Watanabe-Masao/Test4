import { useCallback } from 'react'
import {
  Wrapper,
  Label,
  Value,
  SubText,
  FormulaSummary,
  TrendBadge,
  ExplainHint,
  MethodBadge,
  WarningBadge,
  ReferenceBadge,
} from './KpiCard.styles'
import type { WarningSeverity } from '@/domain/constants'

export { KpiGrid } from './KpiCard.styles'

/** KpiCard に渡す warning 情報 */
export interface KpiWarningInfo {
  /** 最も深刻な severity */
  readonly severity: WarningSeverity
  /** badge に表示するラベル */
  readonly label: string
  /** tooltip に表示するメッセージ */
  readonly message: string
}

export function KpiCard({
  label,
  value,
  subText,
  accent,
  onClick,
  trend,
  badge,
  formulaSummary,
  warning,
  isReference,
}: {
  label: string
  value: string
  subText?: string
  accent?: string
  onClick?: () => void
  trend?: { direction: 'up' | 'down' | 'flat'; label: string }
  badge?: 'actual' | 'estimated'
  /** Level 1: one-line formula hint shown below value (e.g. "売上 − 原価") */
  formulaSummary?: React.ReactNode
  /** Warning info from resolver (severity + label + tooltip message) */
  warning?: KpiWarningInfo
  /** Whether this is a reference value (not authoritative) */
  isReference?: boolean
}) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (onClick && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault()
        onClick()
      }
    },
    [onClick],
  )

  return (
    <Wrapper
      $accent={accent}
      $clickable={!!onClick}
      onClick={onClick}
      onKeyDown={onClick ? handleKeyDown : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `${label}: ${value} - 算出根拠を表示` : undefined}
      title={onClick ? '算出根拠を表示' : undefined}
    >
      {onClick && <ExplainHint data-hint>根拠</ExplainHint>}
      <Label>
        {label}
        {badge && (
          <MethodBadge
            $variant={badge}
            title={
              badge === 'actual'
                ? '在庫法による実績値'
                : '推定法による理論値（実績粗利ではありません）'
            }
          >
            {badge === 'actual' ? '実績' : '推定'}
          </MethodBadge>
        )}
        {warning && (
          <WarningBadge $severity={warning.severity} title={warning.message}>
            {warning.label}
          </WarningBadge>
        )}
        {isReference && !warning && <ReferenceBadge title="参考値です">参考値</ReferenceBadge>}
      </Label>
      <Value>
        {value}
        {trend && (
          <TrendBadge $direction={trend.direction}>
            {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'}
            {trend.label}
          </TrendBadge>
        )}
      </Value>
      {subText && <SubText>{subText}</SubText>}
      {formulaSummary && <FormulaSummary>{formulaSummary}</FormulaSummary>}
    </Wrapper>
  )
}
