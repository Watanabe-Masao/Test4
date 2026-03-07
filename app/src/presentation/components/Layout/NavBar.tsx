import { useState, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import styled, { keyframes, css } from 'styled-components'
import type { ViewType } from '@/domain/models'
import type { ThemeMode } from '@/presentation/theme'
import { palette } from '@/presentation/theme/tokens'
import { useCalculation } from '@/application/hooks'
import { useDataStore } from '@/application/stores/dataStore'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { useDataSummary } from '@/application/hooks/useDataSummary'
import { useI18n } from '@/application/hooks/useI18n'
import { usePageStore } from '@/application/stores/pageStore'

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
  const data = useDataStore((s) => s.data)
  const settings = useSettingsStore((s) => s.settings)
  const { hasAnyData: hasData } = useDataSummary(data)
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

const Divider = styled.div`
  width: 60%;
  height: 1px;
  background: ${({ theme }) => theme.colors.border};
  margin: ${({ theme }) => theme.spacing[1]} 0;
`

const CustomPageBtn = styled.button<{ $active?: boolean }>`
  width: ${({ theme }) => theme.layout.navIconSize};
  height: ${({ theme }) => theme.layout.navIconSize};
  border-radius: ${({ theme }) => theme.radii.md};
  border: none;
  background: ${({ $active, theme }) =>
    $active ? `${theme.colors.palette.primary}20` : 'transparent'};
  color: ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.text3)};
  cursor: pointer;
  font-size: 11px;
  font-weight: 600;
  transition: all ${({ theme }) => theme.transitions.fast};
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:hover {
    background: ${({ theme }) => theme.colors.bg4};
    color: ${({ theme }) => theme.colors.text};
  }
`

const AddPageBtn = styled.button`
  width: ${({ theme }) => theme.layout.navIconSize};
  height: 24px;
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px dashed ${({ theme }) => theme.colors.border};
  background: transparent;
  color: ${({ theme }) => theme.colors.text4};
  cursor: pointer;
  font-size: 16px;
  transition: all ${({ theme }) => theme.transitions.fast};
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    border-color: ${({ theme }) => theme.colors.palette.primary};
    color: ${({ theme }) => theme.colors.palette.primary};
    background: ${({ theme }) => `${theme.colors.palette.primary}10`};
  }
`

const ContextMenu = styled.div`
  position: fixed;
  z-index: 100;
  background: ${({ theme }) => theme.colors.bg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: ${({ theme }) => theme.spacing[1]};
  min-width: 120px;
`

const ContextMenuItem = styled.button<{ $danger?: boolean }>`
  all: unset;
  cursor: pointer;
  display: block;
  width: 100%;
  padding: 6px 12px;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ $danger, theme }) => ($danger ? theme.colors.palette.danger : theme.colors.text)};
  border-radius: ${({ theme }) => theme.radii.sm};
  box-sizing: border-box;

  &:hover {
    background: ${({ theme }) => theme.colors.bg4};
  }
`

const RenameInput = styled.input`
  position: fixed;
  z-index: 100;
  padding: 4px 8px;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  background: ${({ theme }) => theme.colors.bg};
  border: 2px solid ${({ theme }) => theme.colors.palette.primary};
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ theme }) => theme.colors.text};
  outline: none;
  min-width: 120px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
`

const navItemDefs: {
  view: ViewType
  labelKey: 'dashboard' | 'daily' | 'insight' | 'category' | 'costDetail' | 'reports'
  icon: string
}[] = [
  { view: 'dashboard', labelKey: 'dashboard', icon: '📊' },
  { view: 'daily', labelKey: 'daily', icon: '📅' },
  { view: 'insight', labelKey: 'insight', icon: '📈' },
  { view: 'category', labelKey: 'category', icon: '📁' },
  { view: 'cost-detail', labelKey: 'costDetail', icon: '💰' },
  { view: 'reports', labelKey: 'reports', icon: '📄' },
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
      {navItemDefs.map((item) => (
        <NavButton
          key={item.view}
          $active={currentView === item.view}
          onClick={() => onViewChange(item.view)}
          title={messages.nav[item.labelKey]}
          aria-label={messages.nav[item.labelKey]}
          aria-current={currentView === item.view ? 'page' : undefined}
        >
          {item.icon}
        </NavButton>
      ))}

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
      <NavButton
        $active={currentView === 'admin'}
        onClick={() => onViewChange('admin')}
        title={messages.nav.admin}
        aria-label={messages.nav.admin}
        aria-current={currentView === 'admin' ? 'page' : undefined}
      >
        ⚙
      </NavButton>
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
