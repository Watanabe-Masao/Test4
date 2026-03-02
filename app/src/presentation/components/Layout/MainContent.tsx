import styled, { useTheme } from 'styled-components'
import type { ReactNode } from 'react'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { useCalculation, useStoreSelection, usePrevYearData } from '@/application/hooks'
import { AnalysisBar } from '@/presentation/components/common'

const Main = styled.main`
  overflow-y: auto;
  padding: ${({ theme }) => theme.spacing[8]};
  background: ${({ theme }) => theme.colors.bg};
`

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[8]};
`

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
`

const Title = styled.h1`
  font-size: ${({ theme }) => theme.typography.fontSize['2xl']};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
`

const Badge = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.radii.pill};
`

const MonthBadge = styled(Badge)`
  color: ${({ theme }) => theme.colors.text2};
  background: ${({ theme }) => theme.colors.bg3};
`

const StoreBadge = styled(Badge)`
  color: ${({ theme }) => theme.colors.palette.primary};
  background: ${({ theme }) => theme.colors.palette.primary}15;
`

const StatusDot = styled.span<{ $color: string }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  display: inline-block;
`

const ContextBar = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text4};
`

function HeaderContext() {
  const { isCalculated, isComputing } = useCalculation()
  const { stores, selectedStoreIds } = useStoreSelection()
  const prevYear = usePrevYearData()
  const theme = useTheme()

  const storeLabel =
    selectedStoreIds.size === 0 || selectedStoreIds.size === stores.size
      ? `${stores.size}店舗`
      : `${selectedStoreIds.size}/${stores.size}店舗`

  const statusColor = isComputing
    ? theme.colors.palette.blueDark
    : isCalculated
      ? theme.colors.palette.successDark
      : theme.colors.palette.warningDark

  return (
    <ContextBar>
      <StatusDot $color={statusColor} />
      <span>{storeLabel}</span>
      {prevYear.hasPrevYear && <span>| 前年有</span>}
    </ContextBar>
  )
}

export function MainContent({
  title,
  storeName,
  actions,
  showAnalysisBar = true,
  children,
}: {
  title: string
  storeName?: string
  actions?: ReactNode
  /** AnalysisBar を表示するか（デフォルト: true、Admin等では false） */
  showAnalysisBar?: boolean
  children: ReactNode
}) {
  const settings = useSettingsStore((s) => s.settings)

  return (
    <Main>
      <Header>
        <TitleRow>
          <Title>{title}</Title>
          <MonthBadge>
            {settings.targetYear}/{settings.targetMonth}月
          </MonthBadge>
          {storeName && <StoreBadge>{storeName}</StoreBadge>}
        </TitleRow>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <HeaderContext />
          {actions}
        </div>
      </Header>
      {showAnalysisBar && <AnalysisBar />}
      {children}
    </Main>
  )
}
