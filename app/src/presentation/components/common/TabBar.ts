import styled from 'styled-components'

/**
 * 共通タブバーコンポーネント
 *
 * InsightPage, CostDetailPage, AdminPage 等で共通利用する
 * タブナビゲーションスタイル。
 *
 * WAI-ARIA tabs パターン:
 * - TabBar: role="tablist"
 * - Tab: role="tab", aria-selected, 左右矢印キーでフォーカス移動
 * @responsibility R:utility
 */

export const TabBar = styled.div.attrs({
  role: 'tablist',
})`
  display: flex;
  gap: ${({ theme }) => theme.spacing[1]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`

export const Tab = styled.button.attrs<{ $active: boolean }>((props) => ({
  role: 'tab',
  'aria-selected': props.$active,
  tabIndex: props.$active ? 0 : -1,
  onKeyDown: (e: { key: string; preventDefault: () => void; currentTarget: EventTarget }) => {
    const target = e.currentTarget as HTMLElement
    const tablist = target.closest('[role="tablist"]')
    if (!tablist) return
    const tabs = Array.from(tablist.querySelectorAll<HTMLElement>('[role="tab"]'))
    const idx = tabs.indexOf(target)
    if (idx < 0) return
    let next: HTMLElement | undefined
    if (e.key === 'ArrowRight') next = tabs[(idx + 1) % tabs.length]
    else if (e.key === 'ArrowLeft') next = tabs[(idx - 1 + tabs.length) % tabs.length]
    else if (e.key === 'Home') next = tabs[0]
    else if (e.key === 'End') next = tabs[tabs.length - 1]
    if (next) {
      e.preventDefault()
      next.focus()
      next.click()
    }
  },
}))<{ $active: boolean }>`
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[6]};
  border: none;
  border-bottom: 2px solid
    ${({ $active, theme }) => ($active ? theme.colors.palette.primary : 'transparent')};
  background: ${({ $active, theme }) =>
    $active ? `${theme.colors.palette.primary}10` : 'transparent'};
  color: ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.text3)};
  font-size: ${({ theme }) => theme.typography.fontSize.label};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  cursor: pointer;
  border-radius: ${({ theme }) => theme.radii.md} ${({ theme }) => theme.radii.md} 0 0;
  transition: all ${({ theme }) => theme.transitions.fast};
  white-space: nowrap;

  &:hover {
    color: ${({ theme }) => theme.colors.text};
    background: ${({ theme }) => theme.colors.bg3};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: -2px;
  }
`
