/**
 * ページ横断ウィジェット設定パネル
 *
 * 全ページ共通の「ウィジェット設定」UIを提供する。
 * 各ウィジェットの有効/無効をチェックボックスで切り替え可能。
 */
import { useState } from 'react'
import styled from 'styled-components'
import { Button } from '@/presentation/components/common'
import type { WidgetDef } from './types'

// ─── Styled Components ──────────────────────────────────

const PanelOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 100;
  display: flex;
  justify-content: flex-end;
`

const Panel = styled.div`
  width: 340px;
  max-width: 90vw;
  height: 100%;
  background: ${({ theme }) => theme.colors.bg2};
  border-left: 1px solid ${({ theme }) => theme.colors.border};
  overflow-y: auto;
  padding: ${({ theme }) => theme.spacing[8]};
`

const PanelTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`

const PanelGroup = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`

const PanelGroupTitle = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text3};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`

const WidgetItem = styled.label`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-family: ${({ theme }) => theme.typography.fontFamily.primary};
  color: ${({ theme }) => theme.colors.text};
  transition: background 0.15s;
  &:hover {
    background: ${({ theme }) => theme.colors.bg4};
  }
`

const Checkbox = styled.input`
  width: 16px;
  height: 16px;
  accent-color: ${({ theme }) => theme.colors.palette.primary};
  cursor: pointer;
`

type SizeBadgeSize = 'kpi' | 'half' | 'full'

const SizeBadge = styled.span<{ $size: SizeBadgeSize }>`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  padding: 1px ${({ theme }) => theme.spacing[2]};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ $size, theme }) =>
    $size === 'kpi'
      ? `${theme.colors.palette.primary}20`
      : $size === 'half'
        ? `${theme.colors.palette.success}20`
        : `${theme.colors.palette.warning}20`};
  color: ${({ $size, theme }) =>
    $size === 'kpi'
      ? theme.colors.palette.primary
      : $size === 'half'
        ? theme.colors.palette.success
        : theme.colors.palette.warning};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
`

const PanelFooter = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[4]};
  margin-top: ${({ theme }) => theme.spacing[6]};
  padding-top: ${({ theme }) => theme.spacing[6]};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`

// ─── Component ──────────────────────────────────────────

interface Props {
  readonly title: string
  readonly registry: readonly WidgetDef[]
  readonly activeIds: readonly string[]
  readonly defaultIds: readonly string[]
  readonly onApply: (ids: string[]) => void
  readonly onClose: () => void
}

export function WidgetSettingsPanel({
  title,
  registry,
  activeIds,
  defaultIds,
  onApply,
  onClose,
}: Props) {
  const [selected, setSelected] = useState(() => new Set(activeIds))

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleApply = () => {
    // 既存の順序を維持し、新しいものは末尾に追加
    const ordered = activeIds.filter((id) => selected.has(id))
    const newOnes = Array.from(selected).filter((id) => !activeIds.includes(id))
    onApply([...ordered, ...newOnes])
    onClose()
  }

  const handleReset = () => {
    onApply([...defaultIds])
    onClose()
  }

  const handleSelectAll = () => {
    setSelected(new Set(registry.map((w) => w.id)))
  }

  const handleDeselectAll = () => {
    setSelected(new Set())
  }

  // Group widgets
  const groups = new Map<string, WidgetDef[]>()
  registry.forEach((w) => {
    const list = groups.get(w.group) ?? []
    list.push(w)
    groups.set(w.group, list)
  })

  return (
    <PanelOverlay
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <Panel onClick={(e) => e.stopPropagation()}>
        <PanelTitle>{title}</PanelTitle>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <Button $variant="outline" onClick={handleSelectAll}>
            全選択
          </Button>
          <Button $variant="outline" onClick={handleDeselectAll}>
            全解除
          </Button>
        </div>

        {Array.from(groups.entries()).map(([group, widgets]) => (
          <PanelGroup key={group}>
            <PanelGroupTitle>{group}</PanelGroupTitle>
            {widgets.map((w) => (
              <WidgetItem key={w.id}>
                <Checkbox
                  type="checkbox"
                  checked={selected.has(w.id)}
                  onChange={() => toggle(w.id)}
                />
                {w.label}
                <SizeBadge $size={w.size}>
                  {w.size === 'kpi' ? 'KPI' : w.size === 'half' ? '半幅' : '全幅'}
                </SizeBadge>
              </WidgetItem>
            ))}
          </PanelGroup>
        ))}

        <PanelFooter>
          <Button $variant="primary" onClick={handleApply}>
            適用
          </Button>
          <Button $variant="outline" onClick={handleReset}>
            デフォルトに戻す
          </Button>
          <Button $variant="outline" onClick={onClose}>
            キャンセル
          </Button>
        </PanelFooter>
      </Panel>
    </PanelOverlay>
  )
}
