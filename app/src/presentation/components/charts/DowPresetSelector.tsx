/**
 * 曜日プリセットセレクタ
 *
 * 日〜土のトグルボタンを提供し、複数曜日の選択/解除を行う。
 * DailySalesChart や DuckDBCategoryTrendChart 等のチャートで共用する。
 */
import { useCallback, memo } from 'react'
import styled from 'styled-components'

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
`

const Label = styled.span`
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.text4};
  margin-right: ${({ theme }) => theme.spacing[1]};
`

const Chip = styled.button<{ $active: boolean }>`
  padding: 2px 6px;
  font-size: 0.6rem;
  min-width: 24px;
  border: 1px solid
    ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99,102,241,0.2)'
        : 'rgba(99,102,241,0.08)'
      : 'transparent'};
  color: ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.text3)};
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: ${({ theme }) => theme.colors.palette.primary};
  }
`

const ResetChip = styled(Chip)`
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
`

/** 曜日ラベル（日本語）- JS Date.getDay() 順: 0=日, 1=月, ..., 6=土 */
const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const

/** 表示順序: 月火水木金土日 */
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const

interface Props {
  /** 選択中の曜日（空配列 = 全曜日） */
  readonly selectedDows: readonly number[]
  /** 選択変更コールバック */
  readonly onChange: (dows: number[]) => void
}

export const DowPresetSelector = memo(function DowPresetSelector({
  selectedDows,
  onChange,
}: Props) {
  const isAllSelected = selectedDows.length === 0

  const handleToggle = useCallback(
    (dow: number) => {
      if (isAllSelected) {
        // 全選択状態からクリック → その曜日のみ選択
        onChange([dow])
      } else if (selectedDows.includes(dow)) {
        const next = selectedDows.filter((d) => d !== dow)
        // 全部外れたら全選択に戻す
        onChange(next.length === 0 ? [] : next)
      } else {
        const next = [...selectedDows, dow].sort((a, b) => a - b)
        // 全曜日が選ばれたら空配列（全選択）に戻す
        onChange(next.length === 7 ? [] : next)
      }
    },
    [selectedDows, isAllSelected, onChange],
  )

  const handleReset = useCallback(() => {
    onChange([])
  }, [onChange])

  return (
    <Row>
      <Label>曜日:</Label>
      <ResetChip $active={isAllSelected} onClick={handleReset}>
        全
      </ResetChip>
      {DISPLAY_ORDER.map((dow) => (
        <Chip
          key={dow}
          $active={isAllSelected || selectedDows.includes(dow)}
          onClick={() => handleToggle(dow)}
        >
          {DOW_LABELS[dow]}
        </Chip>
      ))}
    </Row>
  )
})
