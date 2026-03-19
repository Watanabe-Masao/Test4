/**
 * 時間別天気モーダル用 styled-components
 * モーダルシェルは base Modal コンポーネントを使用。
 */
import styled from 'styled-components'

export const ChartContainer = styled.div`
  height: 280px;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

export const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: ${({ theme }) => theme.spacing[3]};
`

export const SummaryItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: ${({ theme }) => theme.spacing[2]};
  background: ${({ theme }) => theme.colors.bg3};
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
`

export const SummaryLabel = styled.span`
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.text4};
`

export const SummaryValue = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 0.85rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`

export const WeatherIconSection = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[3]};
  display: flex;
  flex-direction: column;
  gap: 2px;
`

export const WeatherIconRowWrapper = styled.div`
  display: flex;
  align-items: stretch;
`

export const WeatherIconRowLabel = styled.div`
  writing-mode: vertical-rl;
  text-orientation: mixed;
  font-size: 0.5rem;
  color: ${({ theme }) => theme.colors.text3};
  padding: 2px 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-right: none;
  border-radius: ${({ theme }) => theme.radii.sm} 0 0 ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.bg2};
`

export const WeatherIconRow = styled.div`
  display: flex;
  flex: 1;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 0 ${({ theme }) => theme.radii.sm} ${({ theme }) => theme.radii.sm} 0;
  overflow: hidden;
`

export const WeatherIconCell = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: 3px 0;
  font-size: 0.55rem;
  color: ${({ theme }) => theme.colors.text3};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  &:last-child {
    border-right: none;
  }
`

export const WeatherIconEmoji = styled.span`
  font-size: 0.85rem;
  line-height: 1;
`
