/**
 * @responsibility R:unclassified
 */

import { useState, useCallback } from 'react'
import { Button } from '@/presentation/components/common/layout'
import { UNIFIED_WIDGET_REGISTRY } from '@/presentation/components/widgets'
import type { UnifiedWidgetDef } from '@/presentation/components/widgets'
import { DEFAULT_WIDGET_IDS } from './widgets/widgetLayout'
import {
  getAllPresets,
  addCustomPreset,
  deleteCustomPreset,
  saveActivePreset,
} from './widgets/layoutPresets'
import type { LayoutPreset } from './widgets/layoutPresets'
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
} from './DashboardPage.styles'
import {
  PresetSection,
  PresetLabel,
  PresetGrid,
  PresetCard,
  PresetDesc,
  PresetDeleteBtn,
  SaveSection,
  SaveRow,
  SaveInput,
  SaveBtn,
  CustomTag,
} from './WidgetSettingsPanel.styles'

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
  const [allPresets, setAllPresets] = useState<LayoutPreset[]>(getAllPresets)
  const [saveName, setSaveName] = useState('')
  const [showSave, setShowSave] = useState(false)

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
    const preset = allPresets.find((p) => p.id === presetId)
    if (!preset) return
    setActivePreset(presetId)
    setSelected(new Set(preset.widgetIds))
  }

  const handleSaveCustom = useCallback(() => {
    const name = saveName.trim()
    if (!name) return
    const ids = Array.from(selected)
    if (ids.length === 0) return
    const newPreset = addCustomPreset(name, `${ids.length}個のウィジェット`, ids)
    setAllPresets(getAllPresets())
    setActivePreset(newPreset.id)
    setSaveName('')
    setShowSave(false)
  }, [saveName, selected])

  const handleDeleteCustom = useCallback(
    (presetId: string, e: React.MouseEvent) => {
      e.stopPropagation()
      deleteCustomPreset(presetId)
      setAllPresets(getAllPresets())
      if (activePreset === presetId) setActivePreset(null)
    },
    [activePreset],
  )

  const handleApply = () => {
    const ordered = activeIds.filter((id) => selected.has(id))
    const newOnes = Array.from(selected).filter((id) => !activeIds.includes(id))
    const preset = allPresets.find((p) => p.id === activePreset)
    const result = activePreset && preset ? [...preset.widgetIds] : [...ordered, ...newOnes]
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
    setSelected(new Set(UNIFIED_WIDGET_REGISTRY.map((w) => w.id)))
  }

  const handleDeselectAll = () => {
    setActivePreset(null)
    setSelected(new Set())
  }

  // Group widgets
  const groups = new Map<string, UnifiedWidgetDef[]>()
  UNIFIED_WIDGET_REGISTRY.forEach((w) => {
    const list = groups.get(w.group) ?? []
    list.push(w)
    groups.set(w.group, list)
  })

  const customPresets = allPresets.filter((p) => p.isCustom)
  const builtinPresets = allPresets.filter((p) => !p.isCustom)

  return (
    <PanelOverlay
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <Panel onClick={(e) => e.stopPropagation()}>
        <PanelTitle>ダッシュボードのカスタマイズ</PanelTitle>

        {/* 組み込みプリセット */}
        <PresetSection>
          <PresetLabel>プリセット</PresetLabel>
          <PresetGrid>
            {builtinPresets.map((preset) => (
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

        {/* カスタムプリセット */}
        <PresetSection>
          <PresetLabel>カスタム</PresetLabel>
          {customPresets.length > 0 && (
            <PresetGrid>
              {customPresets.map((preset) => (
                <PresetCard
                  key={preset.id}
                  $active={activePreset === preset.id}
                  onClick={() => applyPreset(preset.id)}
                >
                  {preset.label}
                  <CustomTag>保存済み</CustomTag>
                  <PresetDesc>{preset.description}</PresetDesc>
                  <PresetDeleteBtn onClick={(e) => handleDeleteCustom(preset.id, e)} title="削除">
                    ×
                  </PresetDeleteBtn>
                </PresetCard>
              ))}
            </PresetGrid>
          )}
          <SaveSection>
            {!showSave ? (
              <SaveBtn onClick={() => setShowSave(true)}>現在の選択を保存</SaveBtn>
            ) : (
              <SaveRow>
                <SaveInput
                  placeholder="プリセット名を入力"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveCustom()
                  }}
                  autoFocus
                />
                <SaveBtn
                  onClick={handleSaveCustom}
                  disabled={!saveName.trim() || selected.size === 0}
                >
                  保存
                </SaveBtn>
                <SaveBtn
                  onClick={() => {
                    setShowSave(false)
                    setSaveName('')
                  }}
                  style={{ background: 'transparent', color: 'inherit', opacity: 0.6 }}
                >
                  取消
                </SaveBtn>
              </SaveRow>
            )}
          </SaveSection>
        </PresetSection>

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
