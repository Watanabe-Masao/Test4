/**
 * Phase 3.5: モバイルボトムナビゲーション
 *
 * モバイル画面サイズで画面下部にナビゲーションバーを表示する。
 * デスクトップでは非表示。
 */
import styled from 'styled-components'
import type { ViewType } from '@/domain/models'

const Nav = styled.nav`
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 50;
  background: ${({ theme }) => theme.colors.bg2};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  padding: ${({ theme }) => theme.spacing[1]} 0;
  padding-bottom: env(safe-area-inset-bottom, 0);

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    display: flex;
    justify-content: space-around;
    align-items: center;
  }
`

const NavItem = styled.button<{ $active?: boolean }>`
  all: unset;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[2]};
  min-width: 48px;
  min-height: 48px;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.text4)};
  transition: color 0.15s;

  &:hover,
  &:active {
    color: ${({ theme }) => theme.colors.palette.primary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.radii.sm};
  }
`

const NavIcon = styled.span`
  font-size: 20px;
  line-height: 1;
`

const NavLabel = styled.span`
  font-size: 10px;
  line-height: 1;
  white-space: nowrap;
`

/** ボトムナビに表示する主要ビュー (5つまで) */
const bottomItems: { view: ViewType; label: string; icon: string }[] = [
  { view: 'dashboard', label: 'ダッシュ', icon: '📊' },
  { view: 'daily', label: '日別', icon: '📅' },
  { view: 'insight', label: 'インサイト', icon: '📈' },
  { view: 'category', label: 'カテゴリ', icon: '📁' },
  { view: 'admin', label: '管理', icon: '⚙' },
]

export function BottomNav({
  currentView,
  onViewChange,
}: {
  currentView: ViewType
  onViewChange: (view: ViewType) => void
}) {
  return (
    <Nav aria-label="モバイルナビゲーション">
      {bottomItems.map((item) => (
        <NavItem
          key={item.view}
          $active={currentView === item.view}
          onClick={() => onViewChange(item.view)}
          aria-label={item.label}
        >
          <NavIcon>{item.icon}</NavIcon>
          <NavLabel>{item.label}</NavLabel>
        </NavItem>
      ))}
    </Nav>
  )
}
