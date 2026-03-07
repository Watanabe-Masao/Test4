/**
 * ページ横断ウィジェット設定パネル
 *
 * 全ページ共通の「ウィジェット設定」UIを提供する。
 * 各ウィジェットの有効/無効をチェックボックスで切り替え、
 * ドラッグ&ドロップで並び替えが可能。
 */
import { useState, useCallback, useRef } from 'react'
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

const WidgetItem = styled.label<{ $isDragging?: boolean; $isOver?: boolean }>`
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
  opacity: ${({ $isDragging }) => ($isDragging ? 0.4 : 1)};
  ${({ $isOver, theme }) =>
    $isOver
      ? `border-top: 2px solid ${theme.colors.palette.primary};`
      : 'border-top: 2px solid transparent;'}
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

const DragHandleIcon = styled.span`
  cursor: grab;
  color: ${({ theme }) => theme.colors.text4};
  font-size: 10px;
  user-select: none;
  &:active {
    cursor: grabbing;
  }
`

const ModeToggle = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

const ModeBtn = styled.button<{ $active: boolean }>`
  all: unset;
  cursor: pointer;
  padding: 4px 12px;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 1px solid
    ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.border)};
  background: ${({ $active, theme }) =>
    $active ? `${theme.colors.palette.primary}15` : 'transparent'};
  color: ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.text3)};
  transition: all 0.15s;
  &:hover {
    border-color: ${({ theme }) => theme.colors.palette.primary};
  }
`

const OrderItem = styled.div<{ $isDragging?: boolean; $isOver?: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-family: ${({ theme }) => theme.typography.fontFamily.primary};
  color: ${({ theme }) => theme.colors.text};
  opacity: ${({ $isDragging }) => ($isDragging ? 0.4 : 1)};
  ${({ $isOver, theme }) =>
    $isOver
      ? `border-top: 2px solid ${theme.colors.palette.primary};`
      : 'border-top: 2px solid transparent;'}
  &:hover {
    background: ${({ theme }) => theme.colors.bg4};
  }
`

const OrderIndex = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text4};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  min-width: 20px;
  text-align: right;
`

// ─── Component ──────────────────────────────────────────

type PanelMode = 'select' | 'order'

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
  const [orderedIds, setOrderedIds] = useState<string[]>(() => [...activeIds])
  const [mode, setMode] = useState<PanelMode>('select')

  // D&D state for order mode
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const dragItemRef = useRef<number | null>(null)

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        setOrderedIds((o) => o.filter((oid) => oid !== id))
      } else {
        next.add(id)
        setOrderedIds((o) => [...o, id])
      }
      return next
    })
  }

  // D&D handlers for order mode
  const handleDragStart = useCallback((index: number) => {
    dragItemRef.current = index
    setDragIndex(index)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    setOverIndex(index)
  }, [])

  const handleDrop = useCallback((targetIndex: number) => {
    const sourceIndex = dragItemRef.current
    if (sourceIndex == null || sourceIndex === targetIndex) {
      setDragIndex(null)
      setOverIndex(null)
      return
    }
    setOrderedIds((prev) => {
      const next = [...prev]
      const [moved] = next.splice(sourceIndex, 1)
      next.splice(targetIndex, 0, moved)
      return next
    })
    setDragIndex(null)
    setOverIndex(null)
  }, [])

  const handleDragEnd = useCallback(() => {
    setDragIndex(null)
    setOverIndex(null)
  }, [])

  const handleApply = () => {
    // orderedIds contains the user's desired order, filtered to selected only
    const result = orderedIds.filter((id) => selected.has(id))
    // Add any newly selected items that aren't in orderedIds
    const newOnes = Array.from(selected).filter((id) => !orderedIds.includes(id))
    onApply([...result, ...newOnes])
    onClose()
  }

  const handleReset = () => {
    onApply([...defaultIds])
    onClose()
  }

  const handleSelectAll = () => {
    const allIds = registry.map((w) => w.id)
    setSelected(new Set(allIds))
    // Preserve existing order, add new ones at end
    const existing = orderedIds.filter((id) => allIds.includes(id))
    const newOnes = allIds.filter((id) => !orderedIds.includes(id))
    setOrderedIds([...existing, ...newOnes])
  }

  const handleDeselectAll = () => {
    setSelected(new Set())
  }

  // Group widgets for select mode
  const groups = new Map<string, WidgetDef[]>()
  registry.forEach((w) => {
    const list = groups.get(w.group) ?? []
    list.push(w)
    groups.set(w.group, list)
  })

  // Build ordered list for order mode
  const widgetMap = new Map(registry.map((w) => [w.id, w]))
  const orderedWidgets = orderedIds
    .filter((id) => selected.has(id))
    .map((id) => widgetMap.get(id))
    .filter((w): w is WidgetDef => w != null)

  return (
    <PanelOverlay
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <Panel onClick={(e) => e.stopPropagation()}>
        <PanelTitle>{title}</PanelTitle>

        <ModeToggle>
          <ModeBtn $active={mode === 'select'} onClick={() => setMode('select')}>
            選択
          </ModeBtn>
          <ModeBtn $active={mode === 'order'} onClick={() => setMode('order')}>
            並び替え
          </ModeBtn>
        </ModeToggle>

        {mode === 'select' && (
          <>
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
          </>
        )}

        {mode === 'order' && (
          <>
            {orderedWidgets.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text3, #888)' }}>
                ウィジェットが選択されていません。「選択」タブでウィジェットを追加してください。
              </div>
            ) : (
              <div>
                {orderedWidgets.map((w, i) => (
                  <OrderItem
                    key={w.id}
                    draggable
                    $isDragging={dragIndex === i}
                    $isOver={overIndex === i}
                    onDragStart={() => handleDragStart(i)}
                    onDragOver={(e) => handleDragOver(e, i)}
                    onDrop={() => handleDrop(i)}
                    onDragEnd={handleDragEnd}
                  >
                    <DragHandleIcon>⠿</DragHandleIcon>
                    <OrderIndex>{i + 1}</OrderIndex>
                    {w.label}
                    <SizeBadge $size={w.size}>
                      {w.size === 'kpi' ? 'KPI' : w.size === 'half' ? '半幅' : '全幅'}
                    </SizeBadge>
                  </OrderItem>
                ))}
              </div>
            )}
          </>
        )}

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
