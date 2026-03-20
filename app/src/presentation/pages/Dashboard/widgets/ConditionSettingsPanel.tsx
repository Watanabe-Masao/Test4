import { useState, useCallback, useMemo, memo } from 'react'
import type { Store } from '@/domain/models/record'
import type { ConditionMetricId } from '@/domain/models/analysis'
import type { ConditionSummaryConfig } from '@/domain/models/ConditionConfig'
import { CONDITION_METRIC_DEFS, CONDITION_METRIC_MAP } from '@/domain/constants/conditionMetrics'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { palette } from '@/presentation/theme/tokens'
import {
  SettingsPanel,
  SettingsSectionTitle,
  SettingsGrid,
  SettingsField,
  SettingsLabel,
  SettingsInput,
  SettingsUnit,
  StoreSelect,
  StoreOverrideNote,
  MetricSettingRow,
  MetricSettingHeader,
  MetricToggle,
} from './ConditionSummary.styles'

interface ConditionSettingsPanelProps {
  readonly stores: ReadonlyMap<string, Store>
}

export const ConditionSettingsPanelWidget = memo(function ConditionSettingsPanelWidget({
  stores,
}: ConditionSettingsPanelProps) {
  const settings = useSettingsStore((s) => s.settings)
  const updateSettings = useSettingsStore((s) => s.updateSettings)
  const [settingsStoreId, setSettingsStoreId] = useState<string>('__global__')

  const storeEntries = useMemo(
    () =>
      [...stores.entries()].sort(([, a], [, b]) => (a.code ?? a.id).localeCompare(b.code ?? b.id)),
    [stores],
  )

  /** 閾値変更ハンドラ（conditionConfig 経由） */
  const handleConditionThresholdChange = useCallback(
    (metricId: ConditionMetricId, level: 'blue' | 'yellow' | 'red', raw: string) => {
      const def = CONDITION_METRIC_MAP.get(metricId)
      if (!def) return
      const v = parseFloat(raw)
      if (isNaN(v)) return
      const internalValue = v / def.displayMultiplier

      const prev = settings.conditionConfig ?? { global: {}, storeOverrides: {} }

      if (settingsStoreId === '__global__') {
        const prevMetric = prev.global[metricId] ?? {}
        const newConfig: ConditionSummaryConfig = {
          ...prev,
          global: {
            ...prev.global,
            [metricId]: {
              ...prevMetric,
              thresholds: { ...prevMetric.thresholds, [level]: internalValue },
            },
          },
        }
        updateSettings({ conditionConfig: newConfig })
      } else {
        const prevStore = prev.storeOverrides[settingsStoreId] ?? {}
        const prevMetric = prevStore[metricId] ?? {}
        const newConfig: ConditionSummaryConfig = {
          ...prev,
          storeOverrides: {
            ...prev.storeOverrides,
            [settingsStoreId]: {
              ...prevStore,
              [metricId]: {
                ...prevMetric,
                thresholds: { ...prevMetric.thresholds, [level]: internalValue },
              },
            },
          },
        }
        updateSettings({ conditionConfig: newConfig })
      }
    },
    [settings.conditionConfig, updateSettings, settingsStoreId],
  )

  /** メトリクス有効/無効トグル */
  const handleMetricToggle = useCallback(
    (metricId: ConditionMetricId, enabled: boolean) => {
      const prev = settings.conditionConfig ?? { global: {}, storeOverrides: {} }

      if (settingsStoreId === '__global__') {
        const prevMetric = prev.global[metricId] ?? {}
        const newConfig: ConditionSummaryConfig = {
          ...prev,
          global: {
            ...prev.global,
            [metricId]: { ...prevMetric, enabled },
          },
        }
        updateSettings({ conditionConfig: newConfig })
      } else {
        const prevStore = prev.storeOverrides[settingsStoreId] ?? {}
        const prevMetric = prevStore[metricId] ?? {}
        const newConfig: ConditionSummaryConfig = {
          ...prev,
          storeOverrides: {
            ...prev.storeOverrides,
            [settingsStoreId]: {
              ...prevStore,
              [metricId]: { ...prevMetric, enabled },
            },
          },
        }
        updateSettings({ conditionConfig: newConfig })
      }
    },
    [settings.conditionConfig, updateSettings, settingsStoreId],
  )

  /** 設定パネルで表示する閾値（store override > global > registry default） */
  const getDisplayThreshold = useCallback(
    (metricId: ConditionMetricId, level: 'blue' | 'yellow' | 'red'): string => {
      const def = CONDITION_METRIC_MAP.get(metricId)
      if (!def) return '0'
      const cfg = settings.conditionConfig ?? { global: {}, storeOverrides: {} }
      const storeVal =
        settingsStoreId !== '__global__'
          ? cfg.storeOverrides[settingsStoreId]?.[metricId]?.thresholds?.[level]
          : undefined
      const globalVal = cfg.global[metricId]?.thresholds?.[level]
      const val = storeVal ?? globalVal ?? def.defaults[level]
      return (val * def.displayMultiplier).toFixed(def.inputStep < 1 ? 2 : 0)
    },
    [settings.conditionConfig, settingsStoreId],
  )

  /** メトリクスの有効状態を取得 */
  const getMetricEnabled = useCallback(
    (metricId: ConditionMetricId): boolean => {
      const cfg = settings.conditionConfig ?? { global: {}, storeOverrides: {} }
      if (settingsStoreId !== '__global__') {
        const storeVal = cfg.storeOverrides[settingsStoreId]?.[metricId]?.enabled
        if (storeVal != null) return storeVal
      }
      return cfg.global[metricId]?.enabled ?? true
    },
    [settings.conditionConfig, settingsStoreId],
  )

  /** 店舗オーバーライドか表示 */
  const isStoreOverride = useCallback(
    (metricId: ConditionMetricId, level: 'blue' | 'yellow' | 'red'): boolean => {
      if (settingsStoreId === '__global__') return false
      const cfg = settings.conditionConfig ?? { global: {}, storeOverrides: {} }
      return cfg.storeOverrides[settingsStoreId]?.[metricId]?.thresholds?.[level] != null
    },
    [settings.conditionConfig, settingsStoreId],
  )

  return (
    <SettingsPanel>
      {/* 店舗セレクター */}
      <SettingsSectionTitle>対象店舗</SettingsSectionTitle>
      <StoreSelect value={settingsStoreId} onChange={(e) => setSettingsStoreId(e.target.value)}>
        <option value="__global__">全店共通（デフォルト）</option>
        {storeEntries.map(([id, store]) => (
          <option key={id} value={id}>
            {store.name ?? id}
            {settings.conditionConfig?.storeOverrides[id] &&
            Object.keys(settings.conditionConfig.storeOverrides[id]!).length > 0
              ? ' *'
              : ''}
          </option>
        ))}
      </StoreSelect>

      {settingsStoreId !== '__global__' && (
        <StoreOverrideNote>未設定の項目は全店共通の値が適用されます</StoreOverrideNote>
      )}

      {/* メトリクスごとの閾値設定 */}
      {CONDITION_METRIC_DEFS.map((def) => {
        const enabled = getMetricEnabled(def.id)
        const dirLabel = def.direction === 'higher_better' ? '≧' : '≦'
        return (
          <MetricSettingRow key={def.id}>
            <MetricSettingHeader>
              <MetricToggle
                type="checkbox"
                checked={enabled}
                onChange={(e) => handleMetricToggle(def.id, e.target.checked)}
              />
              <SettingsSectionTitle style={{ margin: 0 }}>{def.label}</SettingsSectionTitle>
            </MetricSettingHeader>
            {enabled && (
              <SettingsGrid>
                {(['blue', 'yellow', 'red'] as const).map((level) => {
                  const emoji = level === 'blue' ? '🔵' : level === 'yellow' ? '🟡' : '🔴'
                  const hasOverride = isStoreOverride(def.id, level)
                  return (
                    <SettingsField key={level}>
                      <SettingsLabel>
                        {emoji} {dirLabel}
                      </SettingsLabel>
                      <SettingsInput
                        type="number"
                        step={def.inputStep}
                        value={getDisplayThreshold(def.id, level)}
                        onChange={(e) =>
                          handleConditionThresholdChange(def.id, level, e.target.value)
                        }
                        style={hasOverride ? { borderColor: palette.primary } : undefined}
                      />
                      <SettingsUnit>{def.inputUnit}</SettingsUnit>
                    </SettingsField>
                  )
                })}
              </SettingsGrid>
            )}
          </MetricSettingRow>
        )
      })}
    </SettingsPanel>
  )
})
