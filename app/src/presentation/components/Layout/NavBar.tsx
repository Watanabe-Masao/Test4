import styled from 'styled-components'
import type { ViewType } from '@/domain/models'
import type { ThemeMode } from '@/presentation/theme'

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
    <Nav>
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
