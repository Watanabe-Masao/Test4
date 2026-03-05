import { useState, useEffect, useCallback, useMemo } from 'react'
import styled from 'styled-components'
import { palette } from '@/presentation/theme/tokens'
import { useSettings, useStorageAdmin } from '@/application/hooks'
import { useDataStore } from '@/application/stores/dataStore'
import { useUiStore } from '@/application/stores/uiStore'
import { calculationCache } from '@/application/services/calculationCache'
import { calcSameDowOffset } from '@/application/comparison/resolveComparisonFrame'
import type { AlignmentPolicy } from '@/domain/models'
import { getDaysInMonth } from '@/domain/constants/defaults'
import { useDataSummary } from '@/application/hooks/useDataSummary'

// ─── Styled Components ──────────────────────────────────

const Section = styled.div`
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]};
`

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

const HelpText = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text4};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`

const FieldRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
  flex-wrap: wrap;
`

const FieldLabel = styled.label`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  min-width: 160px;
`

const Select = styled.select`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.bg3};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  cursor: pointer;
  min-width: 200px;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.palette.primary};
  }
`

const Badge = styled.span<{ $color?: string }>`
  display: inline-block;
  padding: 2px ${({ theme }) => theme.spacing[2]};
  border-radius: ${({ theme }) => theme.radii.pill};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  background: ${({ $color }) => ($color ? `${$color}20` : 'rgba(255,255,255,0.1)')};
  color: ${({ $color, theme }) => $color ?? theme.colors.text3};
`

const CurrentStatus = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[4]};
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

const StatusItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const StatusLabel = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text4};
`

const StatusValue = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

const ActionRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-top: ${({ theme }) => theme.spacing[4]};
`

const PrimaryButton = styled.button`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[5]};
  border: none;
  background: ${({ theme }) => theme.colors.palette.primary};
  color: ${({ theme }) => theme.colors.palette.white};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: pointer;
  transition: opacity 0.15s;
  &:hover {
    opacity: 0.9;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const SecondaryButton = styled.button`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[5]};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: transparent;
  color: ${({ theme }) => theme.colors.text2};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: pointer;
  &:hover {
    background: ${({ theme }) => theme.colors.bg3};
  }
`

const PreviewGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  font-size: 11px;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

const DowHeader = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[1]};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text3};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`

const DayCell = styled.div<{ $mapped: boolean; $isWeekend: boolean; $hasData?: boolean }>`
  text-align: center;
  padding: 4px 2px;
  border-radius: 3px;
  background: ${({ $mapped, $hasData }) =>
    !$mapped ? 'transparent' : $hasData ? `${palette.successDark}12` : `${palette.dangerDark}08`};
  color: ${({ $isWeekend, theme }) => ($isWeekend ? palette.dangerDark : theme.colors.text)};
  border: 1px solid
    ${({ $mapped, $hasData, theme }) =>
      !$mapped ? 'transparent' : $hasData ? `${palette.successDark}30` : `${theme.colors.border}`};
`

const MappingArrow = styled.div`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.text4};
  line-height: 1;
`

const PrevDayLabel = styled.div<{ $isOverflow?: boolean }>`
  font-size: 10px;
  opacity: ${({ $isOverflow }) => ($isOverflow ? 0.8 : 0.6)};
  color: ${({ $isOverflow }) => ($isOverflow ? palette.warningDark : 'inherit')};
`

const DataStatus = styled.div<{ $hasData: boolean }>`
  font-size: 10px;
  line-height: 1.2;
`

const MappingSummary = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[4]};
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
`

const SummaryItem = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text2};
`

const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土']

// ─── Main Component ─────────────────────────────────────

export function PrevYearMappingTab() {
  const { settings, updateSettings } = useSettings()
  const data = useDataStore((s) => s.data)
  const { listMonths } = useStorageAdmin()
  const { targetYear, targetMonth } = settings
  const { hasPrevYearData, prevYearDays } = useDataSummary(data)

  const [availableMonths, setAvailableMonths] = useState<{ year: number; month: number }[]>([])

  // 現在のオーバーライド設定 — null/undefined/NaN を安全に処理
  const sourceYear =
    typeof settings.prevYearSourceYear === 'number' && !isNaN(settings.prevYearSourceYear)
      ? settings.prevYearSourceYear
      : null
  const sourceMonth =
    typeof settings.prevYearSourceMonth === 'number' && !isNaN(settings.prevYearSourceMonth)
      ? settings.prevYearSourceMonth
      : null
  const dowOffset =
    typeof settings.prevYearDowOffset === 'number' && !isNaN(settings.prevYearDowOffset)
      ? settings.prevYearDowOffset
      : null

  // 実効値
  const effectiveSourceYear = sourceYear ?? targetYear - 1
  const effectiveSourceMonth = sourceMonth ?? targetMonth
  const autoOffset = calcSameDowOffset(
    targetYear,
    targetMonth,
    effectiveSourceYear,
    effectiveSourceMonth,
  )
  const effectiveOffset = Math.max(0, Math.min(6, dowOffset ?? autoOffset))

  // IndexedDB の利用可能月をロード
  useEffect(() => {
    listMonths()
      .then(setAvailableMonths)
      .catch(() => setAvailableMonths([]))
  }, [listMonths])

  // hasPrevYearData は useDataSummary から取得済み

  // ソース年月変更
  const handleSourceChange = useCallback(
    (value: string) => {
      if (value === 'auto') {
        updateSettings({
          prevYearSourceYear: null,
          prevYearSourceMonth: null,
          prevYearDowOffset: null,
        })
      } else {
        const [y, m] = value.split('-').map(Number)
        const newAutoOffset = calcSameDowOffset(targetYear, targetMonth, y, m)
        updateSettings({
          prevYearSourceYear: y,
          prevYearSourceMonth: m,
          prevYearDowOffset: null, // ソース変更時はオフセットもリセットして自動に
        })
        // Force auto-offset recalculation display
        void newAutoOffset
      }
    },
    [targetYear, targetMonth, updateSettings],
  )

  // オフセット変更
  const handleOffsetChange = useCallback(
    (value: string) => {
      if (value === 'auto') {
        updateSettings({ prevYearDowOffset: null })
      } else {
        updateSettings({ prevYearDowOffset: Number(value) })
      }
    },
    [updateSettings],
  )

  // 前年データを再読込（既存データをクリアして auto-load をトリガー）
  const handleReload = useCallback(() => {
    useDataStore.getState().setPrevYearAutoData({
      prevYearClassifiedSales: { records: [] },
      prevYearCategoryTimeSales: { records: [] },
      prevYearFlowers: {},
    })
    calculationCache.clear()
    useUiStore.getState().invalidateCalculation()
  }, [])

  // 自動に戻す
  const handleResetToAuto = useCallback(() => {
    updateSettings({
      prevYearSourceYear: null,
      prevYearSourceMonth: null,
      prevYearDowOffset: null,
    })
  }, [updateSettings])

  const isOverridden = sourceYear !== null || sourceMonth !== null || dowOffset !== null

  // prevYearDays は useDataSummary から取得済み
  const prevDayHasData = prevYearDays

  // 日付マッピングプレビュー
  const mappingPreview = useMemo(() => {
    const daysInTarget = getDaysInMonth(targetYear, targetMonth)
    const daysInSource = getDaysInMonth(effectiveSourceYear, effectiveSourceMonth)
    const firstDow = new Date(targetYear, targetMonth - 1, 1).getDay()
    const nextSourceMonth = (effectiveSourceMonth % 12) + 1

    interface MappingRow {
      currentDay: number
      prevDay: number // 拡張day番号（overflow含む）
      dow: number
      isOverflow: boolean // 前年ソース月を超えている
      prevDisplayMonth: number // 表示用の月
      prevDisplayDay: number // 表示用の日
      hasData: boolean
    }

    const rows: MappingRow[] = []
    let matchedCount = 0
    let unmatchedCount = 0

    for (let d = 1; d <= daysInTarget; d++) {
      const dow = (firstDow + d - 1) % 7
      const prevDay = d + effectiveOffset
      const isOverflow = prevDay > daysInSource
      const prevDisplayMonth = isOverflow ? nextSourceMonth : effectiveSourceMonth
      const prevDisplayDay = isOverflow ? prevDay - daysInSource : prevDay
      const hasData = prevDayHasData.has(prevDay)
      if (hasData) matchedCount++
      else unmatchedCount++
      rows.push({
        currentDay: d,
        prevDay,
        dow,
        isOverflow,
        prevDisplayMonth,
        prevDisplayDay,
        hasData,
      })
    }
    return { rows, firstDow, daysInTarget, daysInSource, matchedCount, unmatchedCount }
  }, [
    targetYear,
    targetMonth,
    effectiveOffset,
    effectiveSourceYear,
    effectiveSourceMonth,
    prevDayHasData,
  ])

  // 選択用: auto + 利用可能月
  const sourceOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [
      { value: 'auto', label: `自動 (${targetYear - 1}年${targetMonth}月)` },
    ]
    for (const { year, month } of availableMonths) {
      // 当月はスキップ
      if (year === targetYear && month === targetMonth) continue
      opts.push({
        value: `${year}-${month}`,
        label: `${year}年${month}月`,
      })
    }
    return opts
  }, [availableMonths, targetYear, targetMonth])

  const currentSourceValue =
    sourceYear !== null && sourceMonth !== null ? `${sourceYear}-${sourceMonth}` : 'auto'

  return (
    <>
      {/* 現在の状態 */}
      <Section>
        <SectionTitle>前年比マッピング設定</SectionTitle>
        <HelpText>
          前年比データの参照元とする年月や、曜日オフセット（同曜日対応付け）を手動で変更できます。
          自動設定で期待通りの比較にならない場合にご利用ください。
        </HelpText>

        <CurrentStatus>
          <StatusItem>
            <StatusLabel>当年対象</StatusLabel>
            <StatusValue>
              {targetYear}年{targetMonth}月
            </StatusValue>
          </StatusItem>
          <StatusItem>
            <StatusLabel>比較元</StatusLabel>
            <StatusValue>
              {effectiveSourceYear}年{effectiveSourceMonth}月
              {isOverridden && (
                <Badge $color={palette.warningDark} style={{ marginLeft: 4 }}>
                  手動
                </Badge>
              )}
              {!isOverridden && (
                <Badge $color={palette.successDark} style={{ marginLeft: 4 }}>
                  自動
                </Badge>
              )}
            </StatusValue>
          </StatusItem>
          <StatusItem>
            <StatusLabel>曜日オフセット</StatusLabel>
            <StatusValue>
              {effectiveOffset}日
              {dowOffset !== null && (
                <Badge $color={palette.warningDark} style={{ marginLeft: 4 }}>
                  手動
                </Badge>
              )}
            </StatusValue>
          </StatusItem>
          <StatusItem>
            <StatusLabel>前年データ</StatusLabel>
            <StatusValue>
              <Badge $color={hasPrevYearData ? palette.successDark : undefined}>
                {hasPrevYearData ? '読込済' : '未読込'}
              </Badge>
            </StatusValue>
          </StatusItem>
        </CurrentStatus>

        <FieldGroup>
          <FieldRow>
            <FieldLabel>期間合わせ方</FieldLabel>
            <Select
              value={settings.alignmentPolicy ?? 'sameDayOfWeek'}
              onChange={(e) =>
                updateSettings({ alignmentPolicy: e.target.value as AlignmentPolicy })
              }
            >
              <option value="sameDayOfWeek">同曜日寄せ（推奨）</option>
              <option value="sameDate">同日付</option>
            </Select>
            <HelpText style={{ margin: 0, minWidth: 200 }}>
              全チャート・全クエリの前年比較に適用
            </HelpText>
          </FieldRow>

          <FieldRow>
            <FieldLabel>比較元（ソース年月）</FieldLabel>
            <Select value={currentSourceValue} onChange={(e) => handleSourceChange(e.target.value)}>
              {sourceOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </FieldRow>

          <FieldRow>
            <FieldLabel>曜日オフセット</FieldLabel>
            <Select
              value={dowOffset !== null ? String(dowOffset) : 'auto'}
              onChange={(e) => handleOffsetChange(e.target.value)}
            >
              <option value="auto">自動 ({autoOffset}日)</option>
              {[0, 1, 2, 3, 4, 5, 6].map((v) => (
                <option key={v} value={String(v)}>
                  {v}日 {v === 0 ? '(同日対応)' : ''}
                </option>
              ))}
            </Select>
            <HelpText style={{ margin: 0, minWidth: 200 }}>
              当年 day d に対応する前年の日 = d + offset
            </HelpText>
          </FieldRow>
        </FieldGroup>

        <ActionRow>
          <PrimaryButton onClick={handleReload}>前年データを再読込</PrimaryButton>
          {isOverridden && (
            <SecondaryButton onClick={handleResetToAuto}>自動に戻す</SecondaryButton>
          )}
        </ActionRow>
      </Section>

      {/* マッピングプレビュー */}
      <Section>
        <SectionTitle>曜日対応プレビュー</SectionTitle>
        <HelpText>
          当年の各日に対応する前年の実際の日付です。オフセット={effectiveOffset} の場合、 当年
          {targetMonth}/1({DOW_LABELS[new Date(targetYear, targetMonth - 1, 1).getDay()] ?? '?'}) →
          前年{effectiveSourceMonth}/{1 + effectiveOffset}(
          {DOW_LABELS[
            new Date(effectiveSourceYear, effectiveSourceMonth - 1, 1 + effectiveOffset).getDay()
          ] ?? '?'}
          )
        </HelpText>

        {hasPrevYearData && (
          <MappingSummary>
            <SummaryItem>
              {mappingPreview.matchedCount > 0 ? '✅' : ''} データあり:{' '}
              {mappingPreview.matchedCount}日
            </SummaryItem>
            <SummaryItem>
              {mappingPreview.unmatchedCount > 0 ? '❌' : ''} データなし:{' '}
              {mappingPreview.unmatchedCount}日
            </SummaryItem>
            {mappingPreview.rows.some((r) => r.isOverflow) && (
              <SummaryItem style={{ color: palette.warningDark }}>
                翌月参照: {mappingPreview.rows.filter((r) => r.isOverflow).length}日
              </SummaryItem>
            )}
          </MappingSummary>
        )}

        <PreviewGrid>
          {DOW_LABELS.map((d, i) => (
            <DowHeader
              key={i}
              style={{ color: i === 0 || i === 6 ? palette.dangerDark : undefined }}
            >
              {d}
            </DowHeader>
          ))}

          {/* 先頭の空セル */}
          {Array.from({ length: mappingPreview.firstDow }).map((_, i) => (
            <DayCell key={`empty-${i}`} $mapped={false} $isWeekend={false} />
          ))}

          {mappingPreview.rows.map(
            ({ currentDay, dow, isOverflow, prevDisplayMonth, prevDisplayDay, hasData }) => (
              <DayCell
                key={currentDay}
                $mapped={true}
                $isWeekend={dow === 0 || dow === 6}
                $hasData={hasPrevYearData && hasData}
              >
                <div>{currentDay}</div>
                <MappingArrow>↕</MappingArrow>
                <PrevDayLabel $isOverflow={isOverflow}>
                  {prevDisplayMonth}/{prevDisplayDay}
                </PrevDayLabel>
                {hasPrevYearData && (
                  <DataStatus $hasData={hasData}>{hasData ? '✅' : '❌'}</DataStatus>
                )}
              </DayCell>
            ),
          )}
        </PreviewGrid>
      </Section>
    </>
  )
}
