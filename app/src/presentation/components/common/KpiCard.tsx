import styled from 'styled-components'

const Wrapper = styled.div<{ $accent?: string; $clickable?: boolean }>`
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]};
  position: relative;
  ${({ $accent }) => $accent && `border-top: 2px solid ${$accent};`}
  ${({ $clickable, theme }) => $clickable && `
    cursor: pointer;
    transition: border-color ${theme.transitions.fast}, box-shadow ${theme.transitions.fast};
    &:hover {
      border-color: ${theme.colors.palette.primary}40;
      box-shadow: 0 0 0 1px ${theme.colors.palette.primary}20;
    }
    &:hover [data-hint] {
      opacity: 1;
    }
  `}
`

const Label = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text3};
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`

const Value = styled.div`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
`

const SubText = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text3};
  margin-top: ${({ theme }) => theme.spacing[2]};
`

const ExplainHint = styled.span`
  position: absolute;
  top: ${({ theme }) => theme.spacing[2]};
  right: ${({ theme }) => theme.spacing[2]};
  font-size: 10px;
  color: ${({ theme }) => theme.colors.palette.primary};
  opacity: 0.5;
  transition: opacity 0.15s;
`

export function KpiCard({
  label,
  value,
  subText,
  accent,
  onClick,
}: {
  label: string
  value: string
  subText?: string
  accent?: string
  onClick?: () => void
}) {
  return (
    <Wrapper $accent={accent} $clickable={!!onClick} onClick={onClick} title={onClick ? '算出根拠を表示' : undefined}>
      {onClick && <ExplainHint data-hint>根拠</ExplainHint>}
      <Label>{label}</Label>
      <Value>{value}</Value>
      {subText && <SubText>{subText}</SubText>}
    </Wrapper>
  )
}

export const KpiGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: ${({ theme }) => theme.spacing[6]};
`
