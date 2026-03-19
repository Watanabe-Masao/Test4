import styled from 'styled-components'
import { sc } from '@/presentation/theme/semanticColors'

export const SummaryGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-top: ${({ theme }) => theme.spacing[3]};
  padding: 0 ${({ theme }) => theme.spacing[2]};
`

export const StoreCard = styled.div<{ $borderColor: string }>`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[0]};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  border-left: 3px solid ${({ $borderColor }) => $borderColor};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.interactive.subtleBg};
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  min-width: 140px;
  cursor: pointer;
  transition: background ${({ theme }) => theme.transitions.fast};

  &:hover {
    background: ${({ theme }) => theme.interactive.hoverBg};
  }
`

export const StoreName = styled.span`
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
`

export const PeakInfo = styled.span`
  color: ${({ theme }) => theme.colors.text3};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

export const ModalSimilarityList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
`

export const ModalSimilarityRow = styled.div<{ $high: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ $high }) => ($high ? `${sc.positive}12` : 'transparent')};
  font-size: ${({ theme }) => theme.typography.fontSize.label};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

export const ModalPairLabel = styled.span`
  color: ${({ theme }) => theme.colors.text2};
`

export const ModalSimValue = styled.span<{ $high: boolean }>`
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ $high }) => ($high ? sc.positive : 'inherit')};
`

export const ModalStoreDetail = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  border-left: 3px solid ${({ theme }) => theme.colors.palette.primary};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.interactive.subtleBg};
  font-size: ${({ theme }) => theme.typography.fontSize.label};
  line-height: 1.8;
`

export const ModalSectionTitle = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.label};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
  margin-top: ${({ theme }) => theme.spacing[3]};
`
