/**
 * モバイルボトムナビゲーション
 *
 * モバイル画面サイズで画面下部にナビゲーションバーを表示する。
 * デスクトップでは非表示。ページ定義は PAGE_REGISTRY から導出。
 * @responsibility R:unclassified
 */
import type { ViewType } from '@/domain/models/storeTypes'
import { getMobileNavPages } from '@/application/navigation/pageRegistry'
import { Nav, NavItem, NavIcon, NavLabel } from './BottomNav.styles'

/** mobileNavVisible なページ（navOrder 順、キャッシュ） */
const MOBILE_NAV_PAGES = getMobileNavPages()

export function BottomNav({
  currentView,
  onViewChange,
}: {
  currentView: ViewType
  onViewChange: (view: ViewType) => void
}) {
  return (
    <Nav aria-label="モバイルナビゲーション">
      {MOBILE_NAV_PAGES.map((page) => (
        <NavItem
          key={page.id}
          $active={currentView === page.id}
          onClick={() => onViewChange(page.id as ViewType)}
          aria-label={page.label}
        >
          <NavIcon>{page.icon}</NavIcon>
          <NavLabel>{page.label}</NavLabel>
        </NavItem>
      ))}
    </Nav>
  )
}
