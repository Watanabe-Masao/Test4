import styled from 'styled-components'
import { palette } from '@/presentation/theme/tokens'

export const Wrapper = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]} ${({ theme }) => theme.spacing[4]}
    ${({ theme }) => theme.spacing[4]};
`

export const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
  padding: 0 ${({ theme }) => theme.spacing[4]};
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[2]};
`

export const Title = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
`

export const ToggleRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  flex-wrap: wrap;
`

export const ViewToggle = styled.div`
  display: flex;
  gap: 2px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 2px;
`

export const ViewBtn = styled.button<{ $active?: boolean }>`
  all: unset;
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  padding: 3px 8px;
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ $active, theme }) => ($active ? theme.colors.palette.white : theme.colors.text3)};
  background: ${({ $active, theme }) => ($active ? theme.colors.palette.primary : 'transparent')};
  transition: all 0.15s;
  white-space: nowrap;
  &:hover {
    background: ${({ $active, theme }) =>
      $active
        ? theme.colors.palette.primary
        : theme.mode === 'dark'
          ? `${palette.white}14`
          : `${palette.black}0f`};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.radii.sm};
  }
`

export const CompareChipGroup = styled.div`
  display: flex;
  gap: 2px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 2px;
`

export const CompareChip = styled.button<{ $active?: boolean }>`
  all: unset;
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  padding: 3px 10px;
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ $active, theme }) => ($active ? theme.colors.palette.white : theme.colors.text3)};
  background: ${({ $active, theme }) => ($active ? theme.colors.palette.info : 'transparent')};
  transition: all 0.15s;
  white-space: nowrap;
  &:hover {
    background: ${({ $active, theme }) =>
      $active
        ? theme.colors.palette.info
        : theme.mode === 'dark'
          ? `${palette.white}14`
          : `${palette.black}0f`};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.radii.sm};
  }
`

export const SummaryRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[6]};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[4]}
    ${({ theme }) => theme.spacing[4]};
  flex-wrap: wrap;
`

export const Metric = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 80px;
`

export const MetricLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text3};
  font-family: ${({ theme }) => theme.typography.fontFamily.primary};
`

export const MetricValue = styled.span<{ $color?: string }>`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ $color, theme }) => $color ?? theme.colors.text};
`

export const ProgressBarWrap = styled.div`
  flex: 1;
  min-width: 120px;
  display: flex;
  flex-direction: column;
  gap: 2px;
`

export const ProgressTrack = styled.div`
  height: 8px;
  background: ${({ theme }) => theme.colors.bg4};
  border-radius: 4px;
  overflow: hidden;
  position: relative;
`

export const ProgressFill = styled.div<{ $pct: number; $color: string }>`
  height: 100%;
  width: ${({ $pct }) => Math.min($pct, 100)}%;
  background: ${({ $color }) => $color};
  border-radius: 4px;
  transition: width 0.6s ease;
`

export const ProgressLabel = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text3};
`

export const ChartArea = styled.div`
  width: 100%;
  height: 280px;
`

/* ── Types & Config Constants ── */

export type BudgetViewType = 'line' | 'diff' | 'rate' | 'area' | 'prevYearDiff'

export const VIEW_LABELS: Record<BudgetViewType, string> = {
  line: '線グラフ',
  diff: '差分',
  rate: '達成率',
  area: 'エリア',
  prevYearDiff: '比較期差',
}

export const VIEW_TITLES: Record<BudgetViewType, string> = {
  line: '予算 vs 実績（累計推移）',
  diff: '予算差異（実績 − 予算）',
  rate: '予算達成率推移',
  area: '予算 vs 実績（エリア）',
  prevYearDiff: '予算差・比較期差 累計推移',
}

/* ── 比較モード ── */
export type CompareMode = 'budgetVsActual' | 'currentVsPrev' | 'all'

export const COMPARE_LABELS: Record<CompareMode, string> = {
  budgetVsActual: '予算 vs 実績',
  currentVsPrev: '当期 vs 比較期',
  all: '予算 vs 実績 vs 比較期',
}

/** 比較モード別の利用可能ビュー */
export const VIEWS_BY_COMPARE: Record<CompareMode, readonly BudgetViewType[]> = {
  budgetVsActual: ['line', 'diff', 'rate', 'area'],
  currentVsPrev: ['line', 'area'],
  all: ['line', 'diff', 'rate', 'area', 'prevYearDiff'],
}

/** 比較モード × ビュー別タイトル（線グラフ / エリア のみ上書き） */
export const COMPARE_TITLES: Partial<Record<CompareMode, Partial<Record<BudgetViewType, string>>>> =
  {
    currentVsPrev: {
      line: '当期 vs 比較期（累計推移）',
      area: '当期 vs 比較期（エリア）',
    },
    all: {
      line: '予算 vs 実績 vs 比較期（累計推移）',
      area: '予算 vs 実績 vs 比較期（エリア）',
    },
  }
