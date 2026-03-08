/**
 * ページ横断ウィジェット設定パネル
 *
 * 全ページ共通の「ウィジェット設定」UIを提供する。
 * 各ウィジェットの有効/無効をチェックボックスで切り替え、
 * ドラッグ&ドロップで並び替えが可能。
 */
import { useState, useCallback, useRef } from 'react'
import { Button } from '@/presentation/components/common'
import type { WidgetDef } from './types'
import {
  PanelOverlay,
  Panel,
  PanelTitle,
  PanelGroup,
  PanelGroupTitle,
  WidgetItem,
  Checkbox,
  SizeBadge,
  PanelFooter,
  DragHandleIcon,
  ModeToggle,
  ModeBtn,
  OrderItem,
  OrderIndex,
} from './WidgetSettingsPanel.styles'

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
