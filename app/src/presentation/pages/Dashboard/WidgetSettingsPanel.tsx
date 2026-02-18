import { useState } from 'react'
import { Button } from '@/presentation/components/common'
import { WIDGET_REGISTRY, WIDGET_MAP, DEFAULT_WIDGET_IDS } from './widgets/registry'
import type { WidgetDef } from './widgets/types'
import {
  PanelOverlay, Panel, PanelTitle, PanelGroup, PanelGroupTitle,
  WidgetItem, Checkbox, SizeBadge, PanelFooter,
} from './DashboardPage.styles'

export function WidgetSettingsPanel({
  activeIds,
  onApply,
  onClose,
}: {
  activeIds: string[]
  onApply: (ids: string[]) => void
  onClose: () => void
}) {
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
    // Preserve ordering: keep existing order, then append new ones
    const ordered = activeIds.filter((id) => selected.has(id))
    const newOnes = Array.from(selected).filter((id) => !activeIds.includes(id))
    onApply([...ordered, ...newOnes])
    onClose()
  }

  const handleReset = () => {
    onApply(DEFAULT_WIDGET_IDS)
    onClose()
  }

  const handleSelectAll = () => {
    setSelected(new Set(WIDGET_REGISTRY.map((w) => w.id)))
  }

  const handleDeselectAll = () => {
    setSelected(new Set())
  }

  // Group widgets
  const groups = new Map<string, WidgetDef[]>()
  WIDGET_REGISTRY.forEach((w) => {
    const list = groups.get(w.group) ?? []
    list.push(w)
    groups.set(w.group, list)
  })

  return (
    <PanelOverlay onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <Panel onClick={(e) => e.stopPropagation()}>
        <PanelTitle>ダッシュボードのカスタマイズ</PanelTitle>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <Button $variant="outline" onClick={handleSelectAll}>全選択</Button>
          <Button $variant="outline" onClick={handleDeselectAll}>全解除</Button>
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
          <Button $variant="primary" onClick={handleApply}>適用</Button>
          <Button $variant="outline" onClick={handleReset}>デフォルトに戻す</Button>
          <Button $variant="outline" onClick={onClose}>キャンセル</Button>
        </PanelFooter>
      </Panel>
    </PanelOverlay>
  )
}
