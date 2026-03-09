/**
 * 比較プリセットトグル
 *
 * ヘッダーに配置し、前年比較のON/OFFとプリセット（同月・同曜日・前月）を切り替える。
 * periodSelectionStore の setPreset / setComparisonEnabled を操作する。
 */
import { memo } from 'react'
import { Chip, ChipGroup } from '@/presentation/components/common'
import { usePeriodSelection } from '@/application/hooks/usePeriodResolver'
import type { ComparisonPreset } from '@/domain/models/PeriodSelection'

const PRESET_OPTIONS: readonly { key: ComparisonPreset; label: string }[] = [
  { key: 'prevYearSameMonth', label: '前年同月' },
  { key: 'prevYearSameDow', label: '前年同曜日' },
  { key: 'prevMonth', label: '前月' },
  { key: 'prevWeek', label: '前週' },
]

export const ComparisonPresetToggle = memo(function ComparisonPresetToggle() {
  const { selection, setPreset } = usePeriodSelection()

  return (
    <ChipGroup>
      {PRESET_OPTIONS.map((opt) => (
        <Chip
          key={opt.key}
          $active={selection.activePreset === opt.key}
          onClick={() => setPreset(opt.key)}
        >
          {opt.label}
        </Chip>
      ))}
    </ChipGroup>
  )
})
