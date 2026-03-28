/**
 * SimulationSummaryCard — 主KPI + 従属KPI + 詳細折りたたみ
 *
 * ForecastTools / SensitivityDashboard の結果表示を
 * 「判断できるUI」に変換するための共通カード部品。
 */
import { useState, useCallback, memo } from 'react'
import styled from 'styled-components'
import { sc } from '@/presentation/theme/semanticColors'

export type Tone = 'primary' | 'positive' | 'caution' | 'negative' | 'neutral'

export interface SummaryMetric {
  readonly label: string
  readonly value: string
  readonly tone?: Tone
  readonly subLabel?: string
}

export interface DetailRow {
  readonly label: string
  readonly value: string
  readonly tone?: Tone
}

interface Props {
  readonly title: string
  readonly primary: SummaryMetric
  readonly secondaries?: readonly SummaryMetric[]
  readonly details?: readonly DetailRow[]
}

function toneToColor(tone: Tone | undefined): string | undefined {
  switch (tone) {
    case 'positive':
      return sc.positive
    case 'caution':
      return sc.caution
    case 'negative':
      return sc.negative
    case 'primary':
      return undefined // theme primary — handled by styled-component default
    case 'neutral':
      return sc.neutral
    default:
      return undefined
  }
}

export const SimulationSummaryCard = memo(function SimulationSummaryCard({
  title,
  primary,
  secondaries,
  details,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const toggle = useCallback(() => setExpanded((v) => !v), [])
  const hasDetails = details && details.length > 0

  return (
    <Card>
      <CardTitle>{title}</CardTitle>
      <PrimaryRow>
        <PrimaryValue $color={toneToColor(primary.tone)}>{primary.value}</PrimaryValue>
        <PrimaryLabel>{primary.label}</PrimaryLabel>
        {primary.subLabel && <SubLabel>{primary.subLabel}</SubLabel>}
      </PrimaryRow>
      {secondaries && secondaries.length > 0 && (
        <SecondarySection>
          {secondaries.map((s) => (
            <SecondaryRow key={s.label}>
              <SecondaryLabel>{s.label}</SecondaryLabel>
              <SecondaryValue $color={toneToColor(s.tone)}>{s.value}</SecondaryValue>
            </SecondaryRow>
          ))}
        </SecondarySection>
      )}
      {hasDetails && (
        <>
          <DetailToggle onClick={toggle}>
            {expanded ? '詳細を非表示 ▲' : '詳細を表示 ▼'}
          </DetailToggle>
          {expanded && (
            <DetailSection>
              {details.map((d) => (
                <DetailItem key={d.label}>
                  <DetailLabel>{d.label}</DetailLabel>
                  <DetailValue $color={toneToColor(d.tone)}>{d.value}</DetailValue>
                </DetailItem>
              ))}
            </DetailSection>
          )}
        </>
      )}
    </Card>
  )
})

// ── Styles ──

const Card = styled.div`
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[4]};
`

const CardTitle = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text3};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`

const PrimaryRow = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`

const PrimaryValue = styled.div<{ $color?: string }>`
  font-size: ${({ theme }) => theme.typography.fontSize.title};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ $color, theme }) => $color ?? theme.colors.palette.primary};
  line-height: 1.2;
`

const PrimaryLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ theme }) => theme.colors.text3};
`

const SubLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ theme }) => theme.colors.text4};
  margin-top: ${({ theme }) => theme.spacing[0]};
`

const SecondarySection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[1]};
  padding-top: ${({ theme }) => theme.spacing[2]};
  border-top: 1px dashed ${({ theme }) => theme.colors.border};
`

const SecondaryRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
`

const SecondaryLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text3};
`

const SecondaryValue = styled.span<{ $color?: string }>`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ $color, theme }) => $color ?? theme.colors.text};
`

const DetailToggle = styled.button`
  all: unset;
  display: block;
  width: 100%;
  text-align: center;
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ theme }) => theme.colors.text4};
  cursor: pointer;
  padding: ${({ theme }) => theme.spacing[1]} 0;
  margin-top: ${({ theme }) => theme.spacing[2]};
  transition: color ${({ theme }) => theme.transitions.fast};
  &:hover {
    color: ${({ theme }) => theme.colors.text2};
  }
`

const DetailSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[1]};
  padding-top: ${({ theme }) => theme.spacing[1]};
`

const DetailItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
`

const DetailLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ theme }) => theme.colors.text4};
`

const DetailValue = styled.span<{ $color?: string }>`
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ $color, theme }) => $color ?? theme.colors.text3};
`
