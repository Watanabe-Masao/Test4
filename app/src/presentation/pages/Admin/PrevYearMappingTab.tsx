import { useState, useEffect, useCallback, useMemo } from 'react'
import { palette } from '@/presentation/theme/tokens'
import { useStorageAdmin } from '@/application/hooks/data'
import { useSettings } from '@/application/hooks/ui'
import { useDataStore } from '@/application/stores/dataStore'
import { useUiStore } from '@/application/stores/uiStore'
import { calculationCache } from '@/application/services/calculationCache'
import { calcSameDowOffset } from '@/application/comparison/dowOffset'
import type { AlignmentMode } from '@/domain/models/calendar'
import { buildMappingPreview, buildSourceOptions } from './PrevYearMappingTab.vm'
import { useDataSummary } from '@/application/hooks/useDataSummary'
import {
  Section,
  SectionTitle,
  HelpText,
  FieldGroup,
  FieldRow,
  FieldLabel,
  Select,
  Badge,
  CurrentStatus,
  StatusItem,
  StatusLabel,
  StatusValue,
  ActionRow,
  PrimaryButton,
  SecondaryButton,
  PreviewGrid,
  DowHeader,
  DayCell,
  MappingArrow,
  PrevDayLabel,
  DataStatus,
  MappingSummary,
  SummaryItem,
} from './PrevYearMappingTab.styles'

const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土']

// ─── Main Component ─────────────────────────────────────

export function PrevYearMappingTab() {
  const { settings, updateSettings } = useSettings()
  const { listMonths } = useStorageAdmin()
  const { targetYear, targetMonth } = settings
  const { hasPrevYearData, prevYearDays } = useDataSummary()

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
      .catch((err: unknown) => {
        console.error('Failed to load available months:', err)
        setAvailableMonths([])
      })
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
    useDataStore.getState().setPrevYearMonthData(null)
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

  const mappingPreview = useMemo(
    () =>
      buildMappingPreview(
        targetYear,
        targetMonth,
        effectiveOffset,
        effectiveSourceYear,
        effectiveSourceMonth,
        prevDayHasData,
      ),
    [
      targetYear,
      targetMonth,
      effectiveOffset,
      effectiveSourceYear,
      effectiveSourceMonth,
      prevDayHasData,
    ],
  )

  const sourceOptions = useMemo(
    () => buildSourceOptions(availableMonths, targetYear, targetMonth),
    [availableMonths, targetYear, targetMonth],
  )

  const currentSourceValue =
    sourceYear !== null && sourceMonth !== null ? `${sourceYear}-${sourceMonth}` : 'auto'

  return (
    <>
      {/* 現在の状態 */}
      <Section>
        <SectionTitle>比較期マッピング設定</SectionTitle>
        <HelpText>
          比較期データの参照元とする年月や、曜日オフセット（同曜日対応付け）を手動で変更できます。
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
              onChange={(e) => updateSettings({ alignmentPolicy: e.target.value as AlignmentMode })}
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
              当期 day d に対応する比較期の日 = d + offset
            </HelpText>
          </FieldRow>
        </FieldGroup>

        <ActionRow>
          <PrimaryButton onClick={handleReload}>比較期データを再読込</PrimaryButton>
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
