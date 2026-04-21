/**
 * BudgetSimulatorWidget — styled-components
 *
 * 既存のデザイントークン (tokens.ts / semanticColors.ts) を経由してスタイルを定義する。
 * プロトタイプの CSS 変数 (`var(--c-primary)` 等) は持ち込まない。
 */
import styled from 'styled-components'

// ── 基準日スライダー ──

export const SliderRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
  padding: ${({ theme }) => theme.spacing[4]} 0;
`

export const SliderLabel = styled.span`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.text3};
  min-width: 3rem;
  text-align: center;
`

export const SliderInput = styled.input`
  flex: 1;
  accent-color: ${({ theme }) => theme.colors.palette.primary};
  cursor: pointer;
`

// ── モード別入力 ──

export const ModeInputPanel = styled.div`
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.spacing[6]};
  margin-bottom: ${({ theme }) => theme.spacing[8]};
`

export const DayInputRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
`

export const DayInputLabel = styled.label`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.text2};
  flex: 1;
`

export const DayInputField = styled.input`
  width: 80px;
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.bg};
  color: ${({ theme }) => theme.colors.text};
  text-align: right;
  font-variant-numeric: tabular-nums;

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: -1px;
  }
`

// ── 曜日別入力 (7 マス) ──

export const DowInputsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: ${({ theme }) => theme.spacing[3]};
  margin-top: ${({ theme }) => theme.spacing[4]};
`

export const DowInputCell = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};

  & > label {
    font-size: 0.85rem;
    color: ${({ theme }) => theme.colors.text2};
  }

  & > input {
    width: 100%;
  }
`

// ── テーブル行装飾 ──

export const GroupRow = styled.tr`
  background: ${({ theme }) => theme.colors.bg2};

  & > td {
    padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
    font-weight: 600;
    font-size: 0.88rem;
    color: ${({ theme }) => theme.colors.text2};
    letter-spacing: 0.02em;
  }
`

export const HighlightRow = styled.tr`
  background: ${({ theme }) => theme.colors.bg2};

  & > td {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text};
  }
`

export const SmallText = styled.span`
  font-size: 0.88rem;
  color: ${({ theme }) => theme.colors.text2};
`

// ── 達成率・前年比の色付け ──

export const DiffPositive = styled.span`
  color: ${({ theme }) => theme.colors.palette.positive};
  font-variant-numeric: tabular-nums;
`

export const DiffNegative = styled.span`
  color: ${({ theme }) => theme.colors.palette.negative};
  font-variant-numeric: tabular-nums;
`

export const DiffNeutral = styled.span`
  color: ${({ theme }) => theme.colors.text3};
`
