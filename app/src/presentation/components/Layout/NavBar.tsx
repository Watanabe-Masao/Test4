import styled, { keyframes, css } from 'styled-components'
import type { ViewType } from '@/domain/models'
import type { ThemeMode } from '@/presentation/theme'
import { palette } from '@/presentation/theme/tokens'
import { useCalculation } from '@/application/hooks'
import { useAppState } from '@/application/context/AppStateContext'

const Nav = styled.nav`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
  padding: ${({ theme }) => theme.spacing[6]} 0;
  background: ${({ theme }) => theme.colors.bg2};
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  overflow-y: auto;
`

const Logo = styled.div`
  width: ${({ theme }) => theme.layout.logoSize};
  height: ${({ theme }) => theme.layout.logoSize};
  border-radius: ${({ theme }) => theme.radii.lg};
  background: linear-gradient(
    135deg,
    ${({ theme }) => theme.colors.palette.primary},
    ${({ theme }) => theme.colors.palette.purpleDark}
  );
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: white;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

const NavButton = styled.button<{ $active?: boolean }>`
  width: ${({ theme }) => theme.layout.navIconSize};
  height: ${({ theme }) => theme.layout.navIconSize};
  border-radius: ${({ theme }) => theme.radii.md};
  border: none;
  background: ${({ $active, theme }) =>
    $active ? `${theme.colors.palette.primary}20` : 'transparent'};
  color: ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.text3)};
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  transition: all ${({ theme }) => theme.transitions.fast};
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: ${({ theme }) => theme.colors.bg4};
    color: ${({ theme }) => theme.colors.text};
  }
`

const Spacer = styled.div`
  flex: 1;
`

const ThemeButton = styled.button`
  width: ${({ theme }) => theme.layout.navIconSize};
  height: ${({ theme }) => theme.layout.navIconSize};
  border-radius: ${({ theme }) => theme.radii.md};
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text3};
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  transition: all ${({ theme }) => theme.transitions.fast};
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: ${({ theme }) => theme.colors.bg4};
    color: ${({ theme }) => theme.colors.text};
  }
`

// ─── CalcStatusBadge Styled Components ───────────────

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`

const StatusSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: ${({ theme }) => theme.spacing[2]};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`

const StatusDot = styled.div<{ $color: string; $pulse?: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  ${({ $pulse }) =>
    $pulse &&
    css`
      animation: ${pulse} 1.2s ease-in-out infinite;
    `}
`

const StatusText = styled.div<{ $color: string }>`
  font-size: 0.5rem;
  font-weight: 600;
  color: ${({ $color }) => $color};
  white-space: nowrap;
  text-align: center;
  line-height: 1.2;
`

const StatusMeta = styled.div`
  font-size: 0.45rem;
  color: ${({ theme }) => theme.colors.text4};
  white-space: nowrap;
  text-align: center;
  line-height: 1.2;
`

/** 計算状態インジケーター */
function CalcStatusBadge() {
  const { isCalculated, isComputing, storeResults } = useCalculation()
  const state = useAppState()

  const hasData =
    Object.keys(state.data.purchase).length > 0 || state.data.classifiedSales.records.length > 0

  if (!hasData) return null

  const { targetYear, targetMonth } = state.settings
  const monthLabel = `${targetYear}年${String(targetMonth).padStart(2, '0')}月`
  const storeCount = storeResults.size

  if (isComputing) {
    return (
      <StatusSection>
        <StatusDot $color={palette.info} $pulse />
        <StatusText $color={palette.info}>計算中...</StatusText>
        <StatusMeta>{monthLabel}</StatusMeta>
      </StatusSection>
    )
  }

  if (isCalculated) {
    return (
      <StatusSection>
        <StatusDot $color={palette.success} />
        <StatusText $color={palette.success}>計算済み</StatusText>
        <StatusMeta>{monthLabel}</StatusMeta>
        {storeCount > 0 && <StatusMeta>{storeCount}店舗</StatusMeta>}
      </StatusSection>
    )
  }

  return (
    <StatusSection>
      <StatusDot $color={palette.warning} />
      <StatusText $color={palette.warning}>未計算</StatusText>
      <StatusMeta>{monthLabel}</StatusMeta>
    </StatusSection>
  )
}

const navItems: { view: ViewType; label: string; icon: string }[] = [
  { view: 'dashboard', label: 'ダッシュボード', icon: '📊' },
  { view: 'daily', label: '日別', icon: '📅' },
  { view: 'insight', label: 'インサイト', icon: '📈' },
  { view: 'category', label: 'カテゴリ', icon: '📁' },
  { view: 'cost-detail', label: '原価明細', icon: '💰' },
  { view: 'reports', label: 'レポート', icon: '📄' },
]

export function NavBar({
  currentView,
  onViewChange,
  themeMode,
  onThemeToggle,
}: {
  currentView: ViewType
  onViewChange: (view: ViewType) => void
  themeMode: ThemeMode
  onThemeToggle: () => void
}) {
  return (
    <Nav aria-label="メインナビゲーション">
      <Logo>荒</Logo>
      {navItems.map((item) => (
        <NavButton
          key={item.view}
          $active={currentView === item.view}
          onClick={() => onViewChange(item.view)}
          title={item.label}
        >
          {item.icon}
        </NavButton>
      ))}
      <Spacer />
      <CalcStatusBadge />
      <NavButton
        $active={currentView === 'admin'}
        onClick={() => onViewChange('admin')}
        title="管理"
      >
        ⚙
      </NavButton>
      <ThemeButton
        onClick={onThemeToggle}
        title={themeMode === 'dark' ? 'ライトモード' : 'ダークモード'}
      >
        {themeMode === 'dark' ? '🌙' : '☀️'}
      </ThemeButton>
    </Nav>
  )
}
