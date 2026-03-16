import { useState, useCallback } from 'react'
import { palette } from '@/presentation/theme/tokens'
import { KpiCard } from '@/presentation/components/common'
import { useCurrencyFormat } from '@/presentation/components/charts/chartTheme'
import type { DowGapAnalysis } from '@/domain/models/ComparisonContext'
import type { WidgetContext } from './types'

const DOW_SHORT = ['日', '月', '火', '水', '木', '金', '土'] as const

export function DowGapKpiCard({
  dowGap,
  onExplain,
}: {
  dowGap: DowGapAnalysis
  onExplain: WidgetContext['onExplain']
}) {
  const { format: fmtCurrency } = useCurrencyFormat()
  // 曜日構成同一（平均法=0）の場合、実日法がデフォルト
  const [showActual, setShowActual] = useState(dowGap.isSameStructure)
  const toggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setShowActual((v) => !v)
  }, [])

  const actualDay = dowGap.actualDayImpact
  const hasActualDay = actualDay != null && actualDay.isValid
  const isActualView = showActual && hasActualDay

  const totalDiff = dowGap.dowCounts.reduce((s, d) => s + d.diff, 0)
  const gapSummary = dowGap.dowCounts
    .filter((d) => d.diff !== 0)
    .map((d) => `${DOW_SHORT[d.dow]}${d.diff > 0 ? '+' : ''}${d.diff}`)
    .join(' ')

  if (isActualView) {
    const impact = actualDay.estimatedImpact
    const details = [
      ...actualDay.shiftedIn.map(
        (d) => `${d.prevMonth}/${d.prevDay}(${d.label}): +${fmtCurrency(d.prevSales)}`,
      ),
      ...actualDay.shiftedOut.map(
        (d) => `${d.prevMonth}/${d.prevDay}(${d.label}): -${fmtCurrency(d.prevSales)}`,
      ),
    ].join(' / ')
    const subText = details || `日数差: ${totalDiff >= 0 ? '+' : ''}${totalDiff}日 / ${gapSummary}`

    return (
      <KpiCard
        label="曜日ギャップ（実日）"
        value={`${impact >= 0 ? '+' : ''}${fmtCurrency(impact)}`}
        subText={subText}
        accent={impact >= 0 ? palette.positive : palette.negative}
        onClick={() => onExplain('dowGapImpact')}
        formulaSummary={
          <>
            {'マッピング境界日の実売上 '}
            <ToggleLink onClick={toggle}>平均に切替</ToggleLink>
          </>
        }
      />
    )
  }

  // 平均法（デフォルト） — median がある場合はそちらを使用
  const medianResult = dowGap.methodResults?.median
  const impact = medianResult?.salesImpact ?? dowGap.estimatedImpact
  const methodLabel = medianResult ? '中央値' : '平均'
  const warnings = dowGap.missingDataWarnings ?? []
  const hasWarnings = warnings.length > 0
  const subParts: string[] = []
  if (dowGap.isSameStructure) {
    subParts.push('曜日構成同一（平均法=0、実日法で確認可）')
  } else {
    subParts.push(`日数差: ${totalDiff >= 0 ? '+' : ''}${totalDiff}日`)
    if (gapSummary) subParts.push(gapSummary)
  }
  if (!dowGap.hasPrevDowSales) {
    subParts.push('⚠ 前年曜日別売上なし')
  }

  return (
    <KpiCard
      label={`曜日ギャップ（${methodLabel}）`}
      value={`${impact >= 0 ? '+' : ''}${fmtCurrency(impact)}`}
      subText={subParts.join(' / ')}
      accent={
        hasWarnings && impact === 0
          ? palette.slate
          : impact >= 0
            ? palette.positive
            : palette.negative
      }
      onClick={() => onExplain('dowGapImpact')}
      formulaSummary={
        hasActualDay ? (
          <>
            {`Σ(曜日別${methodLabel} × 日数差) `}
            <ToggleLink onClick={toggle}>実日に切替</ToggleLink>
          </>
        ) : (
          `Σ(曜日別${methodLabel} × 日数差)`
        )
      }
    />
  )
}

function ToggleLink({
  onClick,
  children,
}: {
  onClick: (e: React.MouseEvent) => void
  children: React.ReactNode
}) {
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick(e as unknown as React.MouseEvent)
        }
      }}
      style={{
        cursor: 'pointer',
        textDecoration: 'underline',
        opacity: 0.8,
      }}
    >
      {children}
    </span>
  )
}
