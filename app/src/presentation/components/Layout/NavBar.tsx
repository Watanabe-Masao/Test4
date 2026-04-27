import { useState, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import type { ViewType } from '@/domain/models/storeTypes'
import type { ThemeMode } from '@/presentation/theme'
import { palette } from '@/presentation/theme/tokens'
import { useCalculation } from '@/application/hooks/calculation'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { useDataSummary } from '@/application/hooks/useDataSummary'
import { useI18n } from '@/application/hooks/useI18n'
import { usePageStore } from '@/application/stores/pageStore'
import { getNavPages } from '@/application/navigation/pageRegistry'
import {
  Nav,
  Logo,
  NavButton,
  Spacer,
  ThemeButton,
  StatusSection,
  StatusDot,
  StatusText,
  StatusMeta,
  Divider,
  CustomPageBtn,
  AddPageBtn,
  ContextMenu,
  ContextMenuItem,
  RenameInput,
} from './NavBar.styles'

type NavLabelKey =
  | 'dashboard'
  | 'storeAnalysis'
  | 'daily'
  | 'insight'
  | 'category'
  | 'costDetail'
  | 'purchaseAnalysis'
  | 'reports'
  | 'admin'

/** PageMeta.id → i18n nav message key  * @responsibility R:unclassified
 */
const NAV_LABEL_KEY: Record<string, NavLabelKey> = {
  dashboard: 'dashboard',
  'store-analysis': 'storeAnalysis',
  daily: 'daily',
  insight: 'insight',
  category: 'category',
  'cost-detail': 'costDetail',
  'purchase-analysis': 'purchaseAnalysis',
  reports: 'reports',
  admin: 'admin',
}

/** navVisible なページ（navOrder 順、キャッシュ） */
const NAV_PAGES = getNavPages()

/** admin ページは下部に分離表示 */
const MAIN_NAV_PAGES = NAV_PAGES.filter((p) => p.id !== 'admin')
const ADMIN_PAGE = NAV_PAGES.find((p) => p.id === 'admin')

/** 計算状態インジケーター */
function CalcStatusBadge() {
  const { isCalculated, isComputing, storeResults } = useCalculation()
  const settings = useSettingsStore((s) => s.settings)
  const { hasAnyData: hasData } = useDataSummary()
  const { messages } = useI18n()

  if (!hasData) return null

  const { targetYear, targetMonth } = settings
  const monthLabel = `${targetYear}年${String(targetMonth).padStart(2, '0')}月`
  const storeCount = storeResults.size

  if (isComputing) {
    return (
      <StatusSection>
        <StatusDot $color={palette.info} $pulse />
        <StatusText $color={palette.info}>{messages.calculation.calculating}</StatusText>
        <StatusMeta>{monthLabel}</StatusMeta>
      </StatusSection>
    )
  }

  if (isCalculated) {
    return (
      <StatusSection>
        <StatusDot $color={palette.success} />
        <StatusText $color={palette.success}>{messages.calculation.calculated}</StatusText>
        <StatusMeta>{monthLabel}</StatusMeta>
        {storeCount > 0 && (
          <StatusMeta>
            {storeCount}
            {messages.common.store}
          </StatusMeta>
        )}
      </StatusSection>
    )
  }

  return (
    <StatusSection>
      <StatusDot $color={palette.warning} />
      <StatusText $color={palette.warning}>{messages.calculation.notCalculated}</StatusText>
      <StatusMeta>{monthLabel}</StatusMeta>
    </StatusSection>
  )
}

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
  const { messages } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const pages = usePageStore((s) => s.pages)
  const addPage = usePageStore((s) => s.addPage)
  const removePage = usePageStore((s) => s.removePage)
  const renamePage = usePageStore((s) => s.renamePage)

  const [contextMenu, setContextMenu] = useState<{
    pageId: string
    x: number
    y: number
  } | null>(null)

  const [renameState, setRenameState] = useState<{
    pageId: string
    value: string
    x: number
    y: number
  } | null>(null)

  const handleAddPage = useCallback(() => {
    const newPage = addPage('新しいページ')
    navigate(newPage.path)
  }, [addPage, navigate])

  const handleContextMenu = useCallback((e: React.MouseEvent, pageId: string) => {
    e.preventDefault()
    setContextMenu({ pageId, x: e.clientX, y: e.clientY })
  }, [])

  const handleRename = useCallback(() => {
    if (!contextMenu) return
    const page = pages.find((p) => p.id === contextMenu.pageId)
    if (!page) return
    setRenameState({
      pageId: contextMenu.pageId,
      value: page.label,
      x: contextMenu.x,
      y: contextMenu.y,
    })
    setContextMenu(null)
  }, [contextMenu, pages])

  const handleRenameSubmit = useCallback(() => {
    if (!renameState) return
    const trimmed = renameState.value.trim()
    if (trimmed) {
      renamePage(renameState.pageId, trimmed)
    }
    setRenameState(null)
  }, [renameState, renamePage])

  const handleDelete = useCallback(() => {
    if (!contextMenu) return
    removePage(contextMenu.pageId)
    setContextMenu(null)
    if (location.pathname === `/custom/${contextMenu.pageId}`) {
      navigate('/dashboard')
    }
  }, [contextMenu, removePage, location.pathname, navigate])

  const currentCustomPageId = location.pathname.startsWith('/custom/')
    ? location.pathname.slice('/custom/'.length)
    : null

  return (
    <Nav
      aria-label="メインナビゲーション"
      onClick={() => {
        setContextMenu(null)
        setRenameState(null)
      }}
    >
      <Logo>荒</Logo>
      {MAIN_NAV_PAGES.map((page, i) => {
        const labelKey = NAV_LABEL_KEY[page.id]
        const label = labelKey ? messages.nav[labelKey] : page.label
        return (
          <span key={page.id}>
            <NavButton
              $active={currentView === page.id}
              onClick={() => onViewChange(page.id as ViewType)}
              title={label}
              aria-label={label}
              aria-current={currentView === page.id ? 'page' : undefined}
            >
              {page.icon}
            </NavButton>
            {page.navDividerAfter && i < MAIN_NAV_PAGES.length - 1 && <Divider />}
          </span>
        )
      })}

      {pages.length > 0 && <Divider />}
      {pages.map((page) => (
        <CustomPageBtn
          key={page.id}
          $active={currentCustomPageId === page.id}
          onClick={() => navigate(page.path)}
          onContextMenu={(e) => handleContextMenu(e, page.id)}
          title={page.label}
          aria-label={page.label}
          aria-current={currentCustomPageId === page.id ? 'page' : undefined}
        >
          {page.label.slice(0, 2)}
        </CustomPageBtn>
      ))}
      <AddPageBtn onClick={handleAddPage} title="ページを追加" aria-label="ページを追加">
        +
      </AddPageBtn>

      <Spacer />
      <CalcStatusBadge />
      {ADMIN_PAGE && (
        <NavButton
          $active={currentView === 'admin'}
          onClick={() => onViewChange('admin')}
          title={messages.nav.admin}
          aria-label={messages.nav.admin}
          aria-current={currentView === 'admin' ? 'page' : undefined}
        >
          {ADMIN_PAGE.icon}
        </NavButton>
      )}
      <ThemeButton
        onClick={onThemeToggle}
        title={themeMode === 'dark' ? messages.nav.lightMode : messages.nav.darkMode}
        aria-label={themeMode === 'dark' ? messages.nav.lightMode : messages.nav.darkMode}
      >
        {themeMode === 'dark' ? '🌙' : '☀️'}
      </ThemeButton>

      {contextMenu && (
        <ContextMenu
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <ContextMenuItem onClick={handleRename}>名前を変更</ContextMenuItem>
          <ContextMenuItem $danger onClick={handleDelete}>
            削除
          </ContextMenuItem>
        </ContextMenu>
      )}

      {renameState && (
        <RenameInput
          style={{ left: renameState.x, top: renameState.y }}
          value={renameState.value}
          onChange={(e) => setRenameState({ ...renameState, value: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRenameSubmit()
            if (e.key === 'Escape') setRenameState(null)
          }}
          onBlur={handleRenameSubmit}
          onClick={(e) => e.stopPropagation()}
          autoFocus
        />
      )}
    </Nav>
  )
}
