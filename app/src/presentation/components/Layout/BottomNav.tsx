/**
 * Phase 3.5: モバイルボトムナビゲーション
 *
 * モバイル画面サイズで画面下部にナビゲーションバーを表示する。
 * デスクトップでは非表示。
 */
import type { ViewType } from '@/domain/models/storeTypes'
import { Nav, NavItem, NavIcon, NavLabel } from './BottomNav.styles'

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
