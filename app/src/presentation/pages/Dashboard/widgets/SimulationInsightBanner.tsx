/**
 * SimulationInsightBanner — シミュレーション結果の1行要約
 *
 * 各ツールの結果欄の最上部に配置し、即座に判断を伝える。
 * 判定ロジックは simulationInsight.ts に分離。
 *
 * @responsibility R:unclassified
 */
import { memo } from 'react'
import styled from 'styled-components'
import { sc } from '@/presentation/theme/semanticColors'
import type { InsightLevel } from './simulationInsight'

interface Props {
  readonly level: InsightLevel
  readonly message: string
}

function levelToColor(level: InsightLevel): string {
  switch (level) {
    case 'positive':
      return sc.positive
    case 'caution':
      return sc.caution
    case 'negative':
      return sc.negative
  }
}

export const SimulationInsightBanner = memo(function SimulationInsightBanner({
  level,
  message,
}: Props) {
  return <Banner $accentColor={levelToColor(level)}>{message}</Banner>
})

const Banner = styled.div<{ $accentColor: string }>`
  border-left: 4px solid ${({ $accentColor }) => $accentColor};
  background: ${({ $accentColor }) => `${$accentColor}12`};
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`
