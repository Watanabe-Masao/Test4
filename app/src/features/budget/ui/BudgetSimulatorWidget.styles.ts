/**
 * BudgetSimulatorWidget — styled-components
 *
 * 既存のデザイントークン (tokens.ts / semanticColors.ts) を経由してスタイルを定義する。
 * プロトタイプの CSS 変数 (`var(--c-primary)` 等) は持ち込まない。
 */
import styled from 'styled-components'

// ── ヘッダー (タイトル + 日付 + スライダーを横並び) ──

export const SimulatorHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[6]};
  padding: ${({ theme }) => theme.spacing[4]} ${({ theme }) => theme.spacing[6]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    flex-direction: column;
    align-items: stretch;
    gap: ${({ theme }) => theme.spacing[3]};
  }
`

export const HeaderLeft = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[1]};
  flex: 0 0 auto;
`

export const HeaderTitle = styled.div`
  font-size: 1.05rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
`

export const HeaderDate = styled.div`
  font-size: 0.82rem;
  color: ${({ theme }) => theme.colors.text2};
  font-variant-numeric: tabular-nums;

  & > strong {
    color: ${({ theme }) => theme.colors.text};
    font-size: 1rem;
    margin: 0 0.15em;
  }
`

// ── 基準日スライダー ──

export const SliderRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  flex: 1;
  min-width: 0;
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

// ── 日別カレンダー (DayCalendarInput) ──

export const DayCalendarGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: ${({ theme }) => theme.spacing[2]};
  margin-top: ${({ theme }) => theme.spacing[4]};
`

export const DayCalendarHeaderCell = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text3};
  text-align: center;
  padding: ${({ theme }) => theme.spacing[2]} 0;
  letter-spacing: 0.05em;
`

interface DayCellProps {
  readonly $empty?: boolean
  readonly $past?: boolean
  readonly $overridden?: boolean
}

export const DayCalendarCell = styled.div<DayCellProps>`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[1]};
  padding: ${({ theme }) => theme.spacing[2]};
  min-height: 74px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme, $overridden, $past }) =>
    $overridden ? `${theme.colors.palette.primary}15` : $past ? theme.colors.bg2 : theme.colors.bg};
  opacity: ${({ $empty, $past }) => ($empty ? 0 : $past ? 0.55 : 1)};
  pointer-events: ${({ $empty }) => ($empty ? 'none' : 'auto')};
`

export const DayCellHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
`

export const DayCellNumber = styled.span`
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
`

export const DayCellPct = styled.span`
  color: ${({ theme }) => theme.colors.text2};
  font-variant-numeric: tabular-nums;
`

export const DayCellInput = styled.input`
  width: 100%;
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[2]};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.bg};
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.8rem;
  text-align: right;
  font-variant-numeric: tabular-nums;

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: -1px;
  }
`

export const DayCellResetBtn = styled.button`
  align-self: flex-end;
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.colors.text3};
  font-size: 0.8rem;
  cursor: pointer;
  padding: 0;

  &:hover {
    color: ${({ theme }) => theme.colors.palette.negative};
  }
`

export const DayCellPastMarker = styled.span`
  font-size: 0.65rem;
  color: ${({ theme }) => theme.colors.text3};
`

// ── ドリルダウン (DrilldownPanel) ──

export const DrillSection = styled.div`
  margin-top: ${({ theme }) => theme.spacing[4]};
`

export const DrillTitle = styled.h4`
  font-size: 0.95rem;
  font-weight: 600;
  margin: 0 0 ${({ theme }) => theme.spacing[3]};
  color: ${({ theme }) => theme.colors.text};
`

// ── DrillCalendar (カレンダービュー) ──

export const DrillCalendarGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(8, 1fr); /* 7 曜日 + 合計 */
  gap: ${({ theme }) => theme.spacing[1]};
`

interface DrillDowHeadProps {
  readonly $sun?: boolean
  readonly $sat?: boolean
}

export const DrillDowHead = styled.div<DrillDowHeadProps>`
  text-align: center;
  font-size: 0.78rem;
  font-weight: 700;
  padding: ${({ theme }) => theme.spacing[2]} 0;
  color: ${({ theme, $sun, $sat }) =>
    $sun
      ? theme.colors.palette.negative
      : $sat
        ? theme.colors.palette.primary
        : theme.colors.text3};
`

interface DrillCellProps {
  readonly $empty?: boolean
  readonly $outOfRange?: boolean
  readonly $weekend?: boolean
  readonly $weekSum?: boolean
  readonly $avg?: boolean
}

export const DrillCell = styled.div<DrillCellProps>`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[1]};
  padding: ${({ theme }) => theme.spacing[2]};
  min-height: 76px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme, $weekSum, $avg, $weekend }) =>
    $weekSum || $avg
      ? theme.colors.bg2
      : $weekend
        ? `${theme.colors.palette.primary}08`
        : theme.colors.bg};
  opacity: ${({ $empty, $outOfRange }) => ($empty ? 0 : $outOfRange ? 0.5 : 1)};
  ${({ $empty }) => ($empty ? 'visibility: hidden;' : '')}
`

export const DrillCellHead = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 0.75rem;

  & > .num {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text};
  }
  & > .dwlabel {
    color: ${({ theme }) => theme.colors.text3};
    font-size: 0.7rem;
  }
`

export const DrillBarTrack = styled.div`
  height: 3px;
  background: ${({ theme }) => theme.colors.border};
  border-radius: 999px;
  overflow: hidden;
`

export const DrillBarFill = styled.div<{ readonly $pct: number }>`
  width: ${({ $pct }) => Math.max(0, Math.min(100, $pct))}%;
  height: 100%;
  background: ${({ theme }) => theme.colors.palette.primary};
`

export const DrillCellAmt = styled.div`
  font-size: 0.82rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
  font-variant-numeric: tabular-nums;
`

export const DrillCellYoY = styled.div<{ readonly $positive: boolean }>`
  font-size: 0.7rem;
  color: ${({ theme, $positive }) =>
    $positive ? theme.colors.palette.positive : theme.colors.palette.negative};
  font-variant-numeric: tabular-nums;
`

export const DrillCellOOR = styled.div`
  font-size: 0.65rem;
  color: ${({ theme }) => theme.colors.text3};
`

// ── 行クリックで展開するドリル行 ──

export const DrillRow = styled.tr`
  background: ${({ theme }) => theme.colors.bg2};

  & > td {
    padding: ${({ theme }) => theme.spacing[4]};
  }
`

export const DrillCaret = styled.span`
  display: inline-block;
  width: 1em;
  margin-right: ${({ theme }) => theme.spacing[2]};
  color: ${({ theme }) => theme.colors.text3};
  font-variant-numeric: tabular-nums;
  transition: transform 0.15s;
`

export const ClickableTr = styled.tr`
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.bg2};
  }
`

// ── ④ 入力セクション (プロトタイプ c-sim-input-row) ──

export const SimInputSection = styled.div`
  margin-top: ${({ theme }) => theme.spacing[6]};
  padding: ${({ theme }) => theme.spacing[6]};
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
`

export const SimInputLabel = styled.div`
  font-size: 0.95rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`

export const SimInputBody = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
  flex-wrap: wrap;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

export const NumInputGroup = styled.div`
  display: flex;
  align-items: baseline;
  gap: ${({ theme }) => theme.spacing[1]};

  & > .u {
    font-size: 0.9rem;
    color: ${({ theme }) => theme.colors.text2};
  }
`

export const NumInputField = styled.input`
  width: 90px;
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.bg};
  color: ${({ theme }) => theme.colors.text};
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-size: 1rem;
  font-weight: 600;

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: -1px;
  }
`

export const NumRangeSlider = styled.input`
  flex: 1;
  min-width: 160px;
  accent-color: ${({ theme }) => theme.colors.palette.primary};
`

export const PresetsRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
  flex-wrap: wrap;
`

interface PresetProps {
  readonly $active?: boolean
}

export const PresetBtn = styled.button<PresetProps>`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  border: 1px solid
    ${({ theme, $active }) => ($active ? theme.colors.palette.primary : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme, $active }) =>
    $active ? `${theme.colors.palette.primary}15` : theme.colors.bg};
  color: ${({ theme, $active }) => ($active ? theme.colors.palette.primary : theme.colors.text)};
  cursor: pointer;
  font-size: 0.8rem;
  min-width: 72px;

  & > .pl {
    font-weight: 600;
  }
  & > .pv {
    font-size: 0.7rem;
    color: ${({ theme }) => theme.colors.text3};
    font-variant-numeric: tabular-nums;
  }

  &:hover {
    border-color: ${({ theme }) => theme.colors.palette.primary};
  }
`

// ── 曜日別 grid (プロトタイプ c-dow-grid) ──

export const DowGridPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`

export const DowBaseRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
  flex-wrap: wrap;
`

export const DowBaseLabel = styled.span`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.text2};
`

export const DowPresetBtn = styled.button`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.bg};
  color: ${({ theme }) => theme.colors.text2};
  cursor: pointer;
  font-size: 0.8rem;

  &:hover {
    border-color: ${({ theme }) => theme.colors.palette.primary};
    color: ${({ theme }) => theme.colors.palette.primary};
  }
`

export const DowGridCols = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: ${({ theme }) => theme.spacing[2]};
`

interface DowColProps {
  readonly $weekend?: boolean
}

export const DowCol = styled.div<DowColProps>`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: ${({ theme }) => theme.spacing[1]};
  padding: ${({ theme }) => theme.spacing[2]};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme, $weekend }) =>
    $weekend ? `${theme.colors.palette.primary}08` : theme.colors.bg};
`

export const DowColName = styled.div`
  font-size: 0.78rem;
  font-weight: 700;
  text-align: center;
  color: ${({ theme }) => theme.colors.text};
`

export const DowColCount = styled.div`
  font-size: 0.7rem;
  text-align: center;
  color: ${({ theme }) => theme.colors.text3};

  & > .ov {
    color: ${({ theme }) => theme.colors.palette.primary};
  }
`

export const DowColValRow = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 0.15em;

  & > .u {
    font-size: 0.7rem;
    color: ${({ theme }) => theme.colors.text3};
  }
`

export const DowColValInput = styled.input`
  width: 100%;
  padding: ${({ theme }) => theme.spacing[1]};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.bg};
  color: ${({ theme }) => theme.colors.text};
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-size: 0.85rem;
`

export const DowColMoney = styled.div`
  font-size: 0.7rem;
  text-align: center;
  color: ${({ theme }) => theme.colors.text2};
  font-variant-numeric: tabular-nums;

  & > .arrow {
    margin: 0 0.25em;
    color: ${({ theme }) => theme.colors.text3};
  }
  & > strong {
    color: ${({ theme }) => theme.colors.text};
    font-weight: 700;
  }
`

// ── 式表示 (c-sim-formula) + ProjectionBarChart コンテナ ──

export const SimFormula = styled.div`
  margin-top: ${({ theme }) => theme.spacing[4]};
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  background: ${({ theme }) => theme.colors.bg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: 0.88rem;
  color: ${({ theme }) => theme.colors.text2};
  font-variant-numeric: tabular-nums;

  & > strong {
    color: ${({ theme }) => theme.colors.text};
  }
  & .diff-ok {
    color: ${({ theme }) => theme.colors.palette.positive};
  }
  & .diff-bad {
    color: ${({ theme }) => theme.colors.palette.negative};
  }
`

export const SimChartWrap = styled.div`
  margin-top: ${({ theme }) => theme.spacing[4]};
`

export const SimChartLbl = styled.div`
  font-size: 0.85rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`
