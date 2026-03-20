import { useCallback, useEffect, useRef, useState } from 'react'
import type { AppSettings } from '@/domain/models/storeTypes'
import {
  SidebarSection,
  SectionLabel,
  SliderSection,
  SliderHeader,
  SliderLabel,
  SliderTrackWrap,
  SliderTrack,
  SliderActive,
  SliderInput,
  SliderResetBtn,
  DetectedDayHint,
  SliderNumRow,
  SliderNumInput,
  SliderNumUnit,
} from '@/presentation/components/DataManagementSidebar.styles'

export function DataEndDaySlider({
  daysInMonth,
  detectedMaxDay,
  settings,
  updateSettings,
  onPeriodEndDayChange,
}: {
  readonly daysInMonth: number
  readonly detectedMaxDay: number
  readonly settings: AppSettings
  readonly updateSettings: (patch: Partial<AppSettings>) => void
  /** 期間選択ストアへの同期（Application 層でスコーピング） */
  readonly onPeriodEndDayChange?: (endDay: number) => void
}) {
  const currentEndDay =
    settings.dataEndDay != null ? Math.min(settings.dataEndDay, daysInMonth) : daysInMonth

  // スライダー操作時にローカル状態で即座にUIを更新し、
  // 実際の設定更新はデバウンスして高速操作時の計算連発を防止
  const [localEndDay, setLocalEndDay] = useState(currentEndDay)
  const sliderTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => {
    setLocalEndDay(currentEndDay)
  }, [currentEndDay])
  const debouncedUpdateEndDay = useCallback(
    (v: number) => {
      setLocalEndDay(v)
      clearTimeout(sliderTimerRef.current)
      sliderTimerRef.current = setTimeout(() => {
        updateSettings({ dataEndDay: v === daysInMonth ? null : v })
        onPeriodEndDayChange?.(v)
      }, 150)
    },
    [updateSettings, daysInMonth, onPeriodEndDayChange],
  )
  // クリーンアップ
  useEffect(() => () => clearTimeout(sliderTimerRef.current), [])

  const sliderPct = ((localEndDay - 1) / (daysInMonth - 1)) * 100

  return (
    <SidebarSection>
      <SectionLabel>取込データ有効期間</SectionLabel>
      <SliderSection>
        <SliderHeader>
          <SliderLabel>
            {localEndDay}日 / {daysInMonth}日
          </SliderLabel>
          {detectedMaxDay > 0 && <DetectedDayHint>検出: {detectedMaxDay}日</DetectedDayHint>}
          {localEndDay !== detectedMaxDay && detectedMaxDay > 0 && (
            <SliderResetBtn
              onClick={() => {
                clearTimeout(sliderTimerRef.current)
                const effectiveDay = detectedMaxDay >= daysInMonth ? daysInMonth : detectedMaxDay
                updateSettings({
                  dataEndDay: effectiveDay === daysInMonth ? null : effectiveDay,
                })
                onPeriodEndDayChange?.(effectiveDay)
              }}
            >
              リセット
            </SliderResetBtn>
          )}
        </SliderHeader>
        <SliderTrackWrap>
          <SliderTrack />
          <SliderActive $width={sliderPct} />
          <SliderInput
            type="range"
            min={1}
            max={daysInMonth}
            value={localEndDay}
            onChange={(e) => debouncedUpdateEndDay(Number(e.target.value))}
          />
        </SliderTrackWrap>
        <SliderNumRow>
          <SliderNumUnit>有効末日:</SliderNumUnit>
          <SliderNumInput
            type="number"
            min={1}
            max={daysInMonth}
            value={localEndDay}
            onChange={(e) => {
              const v = Number(e.target.value)
              if (!isNaN(v) && v >= 1 && v <= daysInMonth) {
                debouncedUpdateEndDay(v)
              }
            }}
          />
          <SliderNumUnit>日</SliderNumUnit>
        </SliderNumRow>
      </SliderSection>
    </SidebarSection>
  )
}
