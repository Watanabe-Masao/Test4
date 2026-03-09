import styled from 'styled-components'

/**
 * CalendarRangePicker — styled-components テーマ統合スタイル
 *
 * react-day-picker のデフォルト CSS を使わず、
 * styled-components のテーマトークンでダーク/ライト対応する。
 */

export const CalendarDropdown = styled.div`
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 4px;
  z-index: 201;
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  padding: ${({ theme }) => theme.spacing[4]};
  min-width: 280px;
`

export const CalendarHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`

export const CalendarLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text3};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`

export const PresetRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
  flex-wrap: wrap;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`

export const PresetChip = styled.button<{ $active?: boolean }>`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.radii.pill};
  border: 1px solid
    ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.border)};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99,102,241,0.2)'
        : 'rgba(99,102,241,0.08)'
      : 'transparent'};
  color: ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.text3)};
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;

  &:hover {
    border-color: ${({ theme }) => theme.colors.palette.primary};
    color: ${({ theme }) => theme.colors.palette.primary};
  }
`

export const RangeInfo = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text2};
  text-align: center;
  padding: ${({ theme }) => theme.spacing[2]} 0;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  margin-top: ${({ theme }) => theme.spacing[2]};
`

/**
 * react-day-picker のカスタムスタイル
 * テーマトークンを使ってダーク/ライト対応
 */
export const DayPickerWrapper = styled.div`
  /* 全体 */
  .rdp-root {
    --rdp-accent-color: ${({ theme }) => theme.colors.palette.primary};
    --rdp-accent-background-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.1)'};
    --rdp-range_middle-background-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.06)'};
    --rdp-range_middle-color: ${({ theme }) => theme.colors.text};
    --rdp-day_button-height: 28px;
    --rdp-day_button-width: 32px;
    font-family: ${({ theme }) => theme.typography.fontFamily.primary};
    font-size: ${({ theme }) => theme.typography.fontSize.xs};
    color: ${({ theme }) => theme.colors.text};
  }

  /* ナビゲーション */
  .rdp-nav {
    display: flex;
    gap: ${({ theme }) => theme.spacing[1]};
  }

  .rdp-button_previous,
  .rdp-button_next {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: none;
    border-radius: ${({ theme }) => theme.radii.sm};
    background: transparent;
    color: ${({ theme }) => theme.colors.text3};
    cursor: pointer;

    &:hover {
      background: ${({ theme }) => theme.colors.bg4};
      color: ${({ theme }) => theme.colors.text};
    }

    svg {
      width: 12px;
      height: 12px;
    }
  }

  /* 月ヘッダー */
  .rdp-month_caption {
    font-size: ${({ theme }) => theme.typography.fontSize.sm};
    font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
    color: ${({ theme }) => theme.colors.text};
    padding: ${({ theme }) => theme.spacing[1]} 0;
  }

  .rdp-caption_label {
    font-size: ${({ theme }) => theme.typography.fontSize.sm};
    font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  }

  /* 曜日ヘッダー */
  .rdp-weekday {
    font-size: 0.55rem;
    color: ${({ theme }) => theme.colors.text4};
    font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
    width: 32px;
    text-align: center;
  }

  /* 日セル */
  .rdp-day {
    border-radius: ${({ theme }) => theme.radii.sm};
  }

  .rdp-day_button {
    font-size: ${({ theme }) => theme.typography.fontSize.xs};
    color: ${({ theme }) => theme.colors.text};
    border: none;
    border-radius: ${({ theme }) => theme.radii.sm};
    cursor: pointer;
    background: transparent;
    transition: all 0.1s;

    &:hover {
      background: ${({ theme }) => theme.colors.bg4};
    }
  }

  /* 選択範囲の開始・終了 */
  .rdp-range_start .rdp-day_button,
  .rdp-range_end .rdp-day_button {
    background: ${({ theme }) => theme.colors.palette.primary};
    color: #fff;
    font-weight: ${({ theme }) => theme.typography.fontWeight.bold};

    &:hover {
      background: ${({ theme }) => theme.colors.palette.primaryDark};
    }
  }

  /* 選択範囲の中間 */
  .rdp-range_middle .rdp-day_button {
    color: ${({ theme }) => theme.colors.text};
  }

  /* 今日 */
  .rdp-today .rdp-day_button {
    font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
    color: ${({ theme }) => theme.colors.palette.primary};
  }

  /* 範囲外の日 */
  .rdp-outside .rdp-day_button {
    color: ${({ theme }) => theme.colors.text4};
    opacity: 0.4;
  }

  /* disabled */
  .rdp-disabled .rdp-day_button {
    opacity: 0.25;
    cursor: not-allowed;
  }

  /* テーブルレイアウト調整 */
  .rdp-months {
    display: flex;
    gap: ${({ theme }) => theme.spacing[4]};
  }

  .rdp-month {
    margin: 0;
  }

  .rdp-month_grid {
    border-collapse: collapse;
  }

  .rdp-week {
    margin: 0;
  }
`
