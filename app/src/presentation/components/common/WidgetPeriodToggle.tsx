/**
 * WidgetPeriodToggle — ウィジェット個別の期間オーバーライドUI
 *
 * チェックボックスでグローバル期間連動のON/OFFを切り替える。
 * OFF時はミニ期間ピッカーを表示し、比較期間を独自に設定可能。
 */
import { memo, useCallback, useMemo, useState } from 'react'
import styled from 'styled-components'
import { useWidgetPeriodStore, resolveWidgetPeriod2 } from '@/application/stores/widgetPeriodStore'
import { usePeriodSelectionStore } from '@/application/stores/periodSelectionStore'
import { PRESET_LABELS } from '@/domain/patterns/period/PeriodContract'
import type { DateRange } from '@/domain/models/CalendarDate'
import { deriveEffectivePeriod2 } from '@/domain/models/PeriodSelection'

const ToggleRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ theme }) => theme.colors.text4};
  padding: ${({ theme }) => theme.spacing[1]} 0;
`

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  cursor: pointer;
  user-select: none;

  &:hover {
    color: ${({ theme }) => theme.colors.text2};
  }
`

const PeriodInfo = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text3};
`

const CustomPeriodRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-top: ${({ theme }) => theme.spacing[1]};
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
`

const MiniInput = styled.input`
  width: 56px;
  padding: ${({ theme }) => theme.spacing[1]};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text};
  background: ${({ theme }) => theme.colors.bg2};
  text-align: center;
`

function formatPeriod(range: DateRange): string {
  const { from, to } = range
  if (from.year === to.year && from.month === to.month) {
    return `${from.year}/${from.month}月 ${from.day}〜${to.day}日`
  }
  return `${from.year}/${from.month}/${from.day}〜${to.year}/${to.month}/${to.day}`
}

export const WidgetPeriodToggle = memo(function WidgetPeriodToggle({
  widgetId,
}: {
  widgetId: string
}) {
  const overrides = useWidgetPeriodStore((s) => s.overrides)
  const toggleLink = useWidgetPeriodStore((s) => s.toggleLink)
  const setCustomPeriod2 = useWidgetPeriodStore((s) => s.setCustomPeriod2)
  const globalSelection = usePeriodSelectionStore((s) => s.selection)

  const effectiveGlobalPeriod2 = useMemo(
    () => deriveEffectivePeriod2(globalSelection),
    [globalSelection],
  )

  const { period2, isLinked } = useMemo(
    () => resolveWidgetPeriod2(widgetId, overrides, effectiveGlobalPeriod2),
    [widgetId, overrides, effectiveGlobalPeriod2],
  )

  const presetLabel = isLinked ? PRESET_LABELS[globalSelection.activePreset].shortLabel : 'カスタム'

  const [editOpen, setEditOpen] = useState(false)

  const handleToggle = useCallback(() => {
    toggleLink(widgetId, !isLinked)
  }, [widgetId, isLinked, toggleLink])

  const handleYearChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const year = parseInt(e.target.value, 10)
      if (!isNaN(year) && year > 2000 && year < 2100) {
        setCustomPeriod2(widgetId, {
          from: { ...period2.from, year },
          to: { ...period2.to, year },
        })
      }
    },
    [widgetId, period2, setCustomPeriod2],
  )

  const handleMonthChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const month = parseInt(e.target.value, 10)
      if (!isNaN(month) && month >= 1 && month <= 12) {
        const daysInMonth = new Date(period2.from.year, month, 0).getDate()
        setCustomPeriod2(widgetId, {
          from: { ...period2.from, month },
          to: { ...period2.to, month, day: Math.min(period2.to.day, daysInMonth) },
        })
      }
    },
    [widgetId, period2, setCustomPeriod2],
  )

  return (
    <>
      <ToggleRow>
        <CheckboxLabel>
          <input type="checkbox" checked={isLinked} onChange={handleToggle} />
          全体連動
        </CheckboxLabel>
        <PeriodInfo>
          比較: {presetLabel} ({formatPeriod(period2)})
        </PeriodInfo>
        {!isLinked && (
          <button
            onClick={() => setEditOpen(!editOpen)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 'inherit',
              color: 'inherit',
              textDecoration: 'underline',
            }}
          >
            {editOpen ? '閉じる' : '期間変更'}
          </button>
        )}
      </ToggleRow>
      {!isLinked && editOpen && (
        <CustomPeriodRow>
          <span>比較先:</span>
          <MiniInput
            type="number"
            value={period2.from.year}
            onChange={handleYearChange}
            title="年"
          />
          <span>年</span>
          <MiniInput
            type="number"
            min={1}
            max={12}
            value={period2.from.month}
            onChange={handleMonthChange}
            title="月"
          />
          <span>月</span>
        </CustomPeriodRow>
      )}
    </>
  )
})
