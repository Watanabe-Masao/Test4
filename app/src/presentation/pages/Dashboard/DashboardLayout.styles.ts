/**
 * Dashboard — レイアウトスタイル
 *
 * セクション、ツールバー、グリッド、空状態など。
 */
import styled from 'styled-components'

export const Section = styled.section`
  margin-bottom: ${({ theme }) => theme.spacing[10]};
`

export const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize.body};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`

export const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[12]} ${({ theme }) => theme.spacing[8]};
  color: ${({ theme }) => theme.colors.text3};
`

export const EmptyIcon = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.display};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`

export const EmptyTitle = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.title};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

export const Toolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`

export const WidgetGridStyled = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: ${({ theme }) => theme.spacing[6]};
`

export const ChartRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing[6]};
  margin-top: ${({ theme }) => theme.spacing[6]};
  @media (max-width: ${({ theme }) => theme.breakpoints.lg}) {
    grid-template-columns: 1fr;
  }
`

export const FullChartRow = styled.div`
  margin-top: ${({ theme }) => theme.spacing[6]};
`
