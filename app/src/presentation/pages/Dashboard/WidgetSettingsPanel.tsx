import { useState } from 'react'
import styled from 'styled-components'
import { Button } from '@/presentation/components/common'
import { WIDGET_REGISTRY, DEFAULT_WIDGET_IDS } from './widgets/registry'
import { LAYOUT_PRESETS, saveActivePreset } from './widgets/layoutPresets'
import type { WidgetDef } from './widgets/types'
import {
  PanelOverlay, Panel, PanelTitle, PanelGroup, PanelGroupTitle,
  WidgetItem, Checkbox, SizeBadge, PanelFooter,
} from './DashboardPage.styles'

const PresetSection = styled.div`
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`

const PresetLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text3};
  margin-bottom: 8px;
`

const PresetGrid = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`

const PresetCard = styled.button<{ $active?: boolean }>`
  all: unset;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ $active, theme }) =>
    $active ? theme.colors.palette.primary : theme.colors.border};
  background: ${({ $active, theme }) =>
    $active ? `${theme.colors.palette.primary}15` : theme.colors.bg};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text};
  transition: all 0.15s;

  &:hover {
    border-color: ${({ theme }) => theme.colors.palette.primary};
  }
`

const PresetDesc = styled.div`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.text4};
  margin-top: 2px;
`

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
  const [activePreset, setActivePreset] = useState<string | null>(null)

  const toggle = (id: string) => {
    setActivePreset(null)
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const applyPreset = (presetId: string) => {
    const preset = LAYOUT_PRESETS.find((p) => p.id === presetId)
    if (!preset) return
    setActivePreset(presetId)
    setSelected(new Set(preset.widgetIds))
  }

  const handleApply = () => {
    // Preserve ordering: keep existing order, then append new ones
    const ordered = activeIds.filter((id) => selected.has(id))
    const newOnes = Array.from(selected).filter((id) => !activeIds.includes(id))
    const result = activePreset
      ? [...LAYOUT_PRESETS.find((p) => p.id === activePreset)!.widgetIds]
      : [...ordered, ...newOnes]
    saveActivePreset(activePreset)
    onApply(result)
    onClose()
  }

  const handleReset = () => {
    saveActivePreset(null)
    onApply(DEFAULT_WIDGET_IDS)
    onClose()
  }

  const handleSelectAll = () => {
    setActivePreset(null)
    setSelected(new Set(WIDGET_REGISTRY.map((w) => w.id)))
  }

  const handleDeselectAll = () => {
    setActivePreset(null)
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

        <PresetSection>
          <PresetLabel>プリセット</PresetLabel>
          <PresetGrid>
            {LAYOUT_PRESETS.map((preset) => (
              <PresetCard
                key={preset.id}
                $active={activePreset === preset.id}
                onClick={() => applyPreset(preset.id)}
              >
                {preset.label}
                <PresetDesc>{preset.description}</PresetDesc>
              </PresetCard>
            ))}
          </PresetGrid>
        </PresetSection>

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
