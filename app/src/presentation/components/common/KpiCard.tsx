import { useCallback } from 'react'
import { GROSS_PROFIT_LABELS } from '@/application/readModels/grossProfit'
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

/** KpiCard に渡す warning 情報  * @responsibility R:unclassified
 */
export interface KpiWarningInfo {
  /** 最も深刻な severity */
  readonly severity: WarningSeverity
  /** badge に表示するラベル */
  readonly label: string
  /** tooltip に表示するメッセージ */
  readonly message: string
}

/** UI 表示モード（authoritative-display-rules.md 準拠） */
export type KpiDisplayMode = 'authoritative' | 'reference' | 'hidden'

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
  displayMode,
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
  /** Display mode derived from MetricResolution */
  displayMode?: KpiDisplayMode
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
                ? GROSS_PROFIT_LABELS.inventoryTooltip
                : GROSS_PROFIT_LABELS.estimatedTooltip
            }
          >
            {badge === 'actual'
              ? GROSS_PROFIT_LABELS.inventoryBadge
              : GROSS_PROFIT_LABELS.estimatedBadge}
          </MethodBadge>
        )}
        {warning && displayMode !== 'hidden' && (
          <WarningBadge $severity={warning.severity} title={warning.message}>
            {warning.label}
          </WarningBadge>
        )}
        {(isReference || displayMode === 'reference') && !warning && displayMode !== 'hidden' && (
          <ReferenceBadge title="参考値です">参考値</ReferenceBadge>
        )}
      </Label>
      <Value>
        {displayMode === 'hidden' ? '—' : value}
        {displayMode !== 'hidden' && trend && (
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
