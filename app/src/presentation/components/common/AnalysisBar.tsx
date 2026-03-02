/**
 * AnalysisBar — 分析コンテキストバー
 *
 * 設計原則2「分析はコンテキスト駆動」のUI実装。
 * MainContent 上部に固定表示され、全ページ共通のフィルタ状態を表示・操作する。
 *
 * 表示する情報:
 * - 時間粒度（日/週/月）
 * - 比較モード（前年/前月/なし）
 * - データ系統（実績/推定）
 * - アクティブフィルタ（カテゴリ・部門）
 */
import { memo, useCallback } from 'react'
import styled from 'styled-components'
import { useAnalysisContextStore } from '@/application/stores/analysisContextStore'
import type { AnalysisGranularity, ComparisonType, DataLineage } from '@/domain/models'

// ─── Styled Components ────────────────────────────────

const Bar = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[4]};
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
  flex-wrap: wrap;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
`

const BarGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
`

const BarLabel = styled.span`
  color: ${({ theme }) => theme.colors.text4};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  white-space: nowrap;
`

const BarChip = styled.button<{ $active?: boolean }>`
  all: unset;
  cursor: pointer;
  padding: 1px ${({ theme }) => theme.spacing[2]};
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ $active, theme }) =>
    $active ? theme.typography.fontWeight.semibold : theme.typography.fontWeight.normal};
  color: ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.text3)};
  background: ${({ $active, theme }) =>
    $active ? `${theme.colors.palette.primary}15` : 'transparent'};
  transition: all ${({ theme }) => theme.transitions.fast};
  white-space: nowrap;

  &:hover {
    background: ${({ theme }) => theme.colors.bg4};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 1px;
  }
`

const LineageBadge = styled.button<{ $variant: DataLineage }>`
  all: unset;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  padding: 1px ${({ theme }) => theme.spacing[2]};
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  background: ${({ $variant, theme }) =>
    $variant === 'actual'
      ? `${theme.colors.palette.success}18`
      : `${theme.colors.palette.warningDark}18`};
  color: ${({ $variant, theme }) =>
    $variant === 'actual' ? theme.colors.palette.successDeep : theme.colors.palette.warningDeep};
  border: 1px solid
    ${({ $variant, theme }) =>
      $variant === 'actual'
        ? `${theme.colors.palette.success}30`
        : `${theme.colors.palette.warningDark}30`};
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    opacity: 0.8;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 1px;
  }
`

const Separator = styled.span`
  width: 1px;
  height: 14px;
  background: ${({ theme }) => theme.colors.border};
`

const FilterTag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  padding: 1px ${({ theme }) => theme.spacing[2]};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => `${theme.colors.palette.primary}10`};
  color: ${({ theme }) => theme.colors.palette.primary};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
`

const FilterClear = styled.button`
  all: unset;
  cursor: pointer;
  font-size: 10px;
  color: ${({ theme }) => theme.colors.text4};
  &:hover {
    color: ${({ theme }) => theme.colors.palette.danger};
  }
`

// ─── Component ─────────────────────────────────────────

const GRANULARITY_OPTIONS: { value: AnalysisGranularity; label: string }[] = [
  { value: 'daily', label: '日' },
  { value: 'weekly', label: '週' },
  { value: 'monthly', label: '月' },
]

const COMPARISON_OPTIONS: { value: ComparisonType | null; label: string }[] = [
  { value: null, label: 'なし' },
  { value: 'yoy', label: '前年' },
  { value: 'prevMonth', label: '前月' },
]

export const AnalysisBar = memo(function AnalysisBar() {
  const granularity = useAnalysisContextStore((s) => s.granularity)
  const comparisonType = useAnalysisContextStore((s) => s.comparisonType)
  const dataLineage = useAnalysisContextStore((s) => s.dataLineage)
  const categoryFilter = useAnalysisContextStore((s) => s.categoryFilter)
  const departmentFilter = useAnalysisContextStore((s) => s.departmentFilter)
  const setGranularity = useAnalysisContextStore((s) => s.setGranularity)
  const setComparisonType = useAnalysisContextStore((s) => s.setComparisonType)
  const setDataLineage = useAnalysisContextStore((s) => s.setDataLineage)
  const setCategoryFilter = useAnalysisContextStore((s) => s.setCategoryFilter)
  const setDepartmentFilter = useAnalysisContextStore((s) => s.setDepartmentFilter)

  const toggleLineage = useCallback(() => {
    setDataLineage(dataLineage === 'actual' ? 'estimated' : 'actual')
  }, [dataLineage, setDataLineage])

  return (
    <Bar role="toolbar" aria-label="分析コンテキスト">
      {/* 粒度 */}
      <BarGroup>
        <BarLabel>粒度:</BarLabel>
        {GRANULARITY_OPTIONS.map((opt) => (
          <BarChip
            key={opt.value}
            $active={granularity === opt.value}
            onClick={() => setGranularity(opt.value)}
            aria-pressed={granularity === opt.value}
          >
            {opt.label}
          </BarChip>
        ))}
      </BarGroup>

      <Separator />

      {/* 比較 */}
      <BarGroup>
        <BarLabel>比較:</BarLabel>
        {COMPARISON_OPTIONS.map((opt) => (
          <BarChip
            key={opt.value ?? 'none'}
            $active={comparisonType === opt.value}
            onClick={() => setComparisonType(opt.value)}
            aria-pressed={comparisonType === opt.value}
          >
            {opt.label}
          </BarChip>
        ))}
      </BarGroup>

      <Separator />

      {/* データ系統 */}
      <BarGroup>
        <BarLabel>系統:</BarLabel>
        <LineageBadge
          $variant={dataLineage}
          onClick={toggleLineage}
          aria-label={`データ系統: ${dataLineage === 'actual' ? '実績' : '推定'}`}
          title="クリックで切替"
        >
          {dataLineage === 'actual' ? '実績' : '推定'}
        </LineageBadge>
      </BarGroup>

      {/* アクティブフィルタ */}
      {(categoryFilter || departmentFilter) && (
        <>
          <Separator />
          <BarGroup>
            {categoryFilter && (
              <FilterTag>
                {categoryFilter}
                <FilterClear
                  onClick={() => setCategoryFilter(null)}
                  aria-label="カテゴリフィルタを解除"
                >
                  ✕
                </FilterClear>
              </FilterTag>
            )}
            {departmentFilter && (
              <FilterTag>
                {departmentFilter}
                <FilterClear
                  onClick={() => setDepartmentFilter(null)}
                  aria-label="部門フィルタを解除"
                >
                  ✕
                </FilterClear>
              </FilterTag>
            )}
          </BarGroup>
        </>
      )}
    </Bar>
  )
})
