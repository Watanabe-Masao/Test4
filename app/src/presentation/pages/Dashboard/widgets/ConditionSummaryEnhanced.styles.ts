import styled, { css } from 'styled-components'

// ─── Container ──────────────────────────────────────────

export const DashWrapper = styled.div`
  width: 100%;
  background: ${({ theme }) => theme.colors.bg3};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  overflow: hidden;
`

// ─── Header ─────────────────────────────────────────────

export const Header = styled.div`
  padding: ${({ theme }) => theme.spacing[4]} ${({ theme }) => theme.spacing[10]}
    ${({ theme }) => theme.spacing[3]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  justify-content: space-between;
  align-items: center;
`

export const HeaderMeta = styled.div`
  font-size: 10px;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text4};
  letter-spacing: 1px;
  margin-bottom: 2px;
`

export const HeaderTitle = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  margin: 0;
  color: ${({ theme }) => theme.colors.text};
`

export const HeaderControls = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[5]};
  margin-bottom: ${({ theme }) => theme.spacing[7]};
  flex-wrap: wrap;
`

// ─── Tab Toggle ─────────────────────────────────────────

export const TabGroup = styled.div`
  display: flex;
  background: ${({ theme }) => theme.colors.bg2};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 3px;
  border: 1px solid ${({ theme }) => theme.colors.border};
`

export const TabBtn = styled.button<{ $active: boolean }>`
  all: unset;
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[8]};
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ $active }) => ($active ? 700 : 400)};
  font-family: ${({ theme }) => theme.typography.fontFamily.primary};
  background: ${({ $active, theme }) => ($active ? theme.colors.palette.primary : 'transparent')};
  color: ${({ $active, theme }) => ($active ? theme.colors.palette.white : theme.colors.text3)};
  transition: all 0.2s;
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
  }
`

export const YoYBtn = styled.button<{ $active: boolean }>`
  all: unset;
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[7]};
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  font-family: ${({ theme }) => theme.typography.fontFamily.primary};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  transition: all 0.2s;
  ${({ $active, theme }) =>
    $active
      ? css`
          background: ${theme.colors.palette.warningDark}22;
          color: ${theme.colors.palette.warningDark};
          border: 1.5px solid ${theme.colors.palette.warningDark}55;
        `
      : css`
          background: ${theme.colors.bg2};
          color: ${theme.colors.text3};
          border: 1.5px solid ${theme.colors.border};
        `}
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
  }
`

// ─── Metric Selector ────────────────────────────────────

export const MetricRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
`

export const MetricBtn = styled.button<{ $active: boolean; $color: string }>`
  all: unset;
  flex: 1;
  padding: ${({ theme }) => theme.spacing[5]} ${({ theme }) => theme.spacing[4]};
  border-radius: ${({ theme }) => theme.radii.xl};
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  transition: all 0.2s;
  ${({ $active, $color, theme }) =>
    $active
      ? css`
          background: ${$color}18;
          border: 1.5px solid ${$color}60;
        `
      : css`
          background: ${theme.colors.bg2};
          border: 1.5px solid ${theme.colors.border};
        `}
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
  }
`

export const MetricIcon = styled.span<{ $color?: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ $color }) => ($color ? `${$color}18` : 'transparent')};
  color: ${({ $color, theme }) => $color ?? theme.colors.text};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  letter-spacing: -0.5px;
  flex-shrink: 0;
`

export const MetricLabel = styled.span<{ $active: boolean; $color: string }>`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ $active }) => ($active ? 700 : 400)};
  font-family: ${({ theme }) => theme.typography.fontFamily.primary};
  color: ${({ $active, $color, theme }) => ($active ? $color : theme.colors.text3)};
`

// ─── Total Summary ──────────────────────────────────────

export const TotalSection = styled.div`
  padding: ${({ theme }) => theme.spacing[5]} ${({ theme }) => theme.spacing[10]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`

export const TotalGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: ${({ theme }) => theme.spacing[6]};
  align-items: end;
`

export const TotalCell = styled.div<{ $align?: 'left' | 'center' | 'right' }>`
  text-align: ${({ $align }) => $align ?? 'left'};
`

export const PeriodBadge = styled.span<{ $color: string }>`
  font-size: 10px;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ $color }) => $color};
  background: ${({ $color }) => `${$color}14`};
  padding: 2px ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.radii.sm};
`

export const SectionLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text3};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
`

export const BigValue = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
`

export const SubValue = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.text3};
`

export const MainValue = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
`

export const AchValue = styled.div<{ $color: string }>`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ $color }) => $color};
`

export const SmallLabel = styled.div`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.text4};
  margin-bottom: 2px;
`

export const Arrow = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  color: ${({ theme }) => theme.colors.text4};
`

// ─── Progress Bar ───────────────────────────────────────

export const ProgressTrack = styled.div<{ $height?: number }>`
  height: ${({ $height }) => $height ?? 8}px;
  width: 100%;
  background: ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  overflow: hidden;
`

export const ProgressFill = styled.div<{ $width: number; $color: string }>`
  height: 100%;
  border-radius: ${({ theme }) => theme.radii.sm};
  width: ${({ $width }) => Math.min($width, 120) / 1.2}%;
  background: ${({ $color }) => $color};
`

// ─── YoY Row ────────────────────────────────────────────

export const YoYRow = styled.div`
  margin-top: ${({ theme }) => theme.spacing[4]};
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[6]};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.palette.warningDark}08;
  border: 1px solid ${({ theme }) => theme.colors.palette.warningDark}18;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
  justify-content: flex-end;
`

export const YoYLabel = styled.span`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.palette.warningDark}99;
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
`

export const MonoSm = styled.span<{ $color?: string; $bold?: boolean }>`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ $color, theme }) => $color ?? theme.colors.text3};
  ${({ $bold }) => $bold && 'font-weight: 700;'}
`

export const MonoMd = styled.span<{ $color?: string; $bold?: boolean }>`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  color: ${({ $color, theme }) => $color ?? theme.colors.text};
  ${({ $bold }) => $bold && 'font-weight: 700;'}
`

export const MonoLg = styled.span<{ $color?: string; $bold?: boolean }>`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  color: ${({ $color, theme }) => $color ?? theme.colors.text};
  ${({ $bold }) => $bold && 'font-weight: 700;'}
`

// ─── Store Row ──────────────────────────────────────────

export const StoreRowWrapper = styled.div<{ $clickable?: boolean }>`
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[10]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  transition: background 0.12s;
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
  &:nth-child(even) {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.012)'};
  }
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'};
  }
`

/** 店舗行のグリッド */
export const StoreRowGrid = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing[6]};
  align-items: center;
`

export const StoreRowLeft = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
  min-width: 0;
`

export const StoreRowCenter = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  min-width: 0;
`

export const StoreRowRight = styled.div`
  text-align: right;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
  min-width: 80px;
`

export const RankBadge = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ $color }) => `${$color}14`};
  color: ${({ $color }) => $color};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  flex-shrink: 0;
`

export const StoreName = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const StoreAchValue = styled.span<{ $color: string }>`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.extrabold};
  color: ${({ $color }) => $color};
`

export const StoreBudgetValue = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
`

export const RateChip = styled.span<{ $color: string }>`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ $color }) => $color};
  background: ${({ $color }) => `${$color}10`};
  padding: 2px ${({ theme }) => theme.spacing[4]};
  border-radius: ${({ theme }) => theme.radii.sm};
`

export const DiffSpan = styled.span<{ $positive: boolean }>`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ $positive }) => ($positive ? '#10b98199' : '#ef444499')};
`

export const GpRateNote = styled.span`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.text4};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

// ─── Footer ─────────────────────────────────────────────

export const Footer = styled.div`
  padding: ${({ theme }) => theme.spacing[5]} ${({ theme }) => theme.spacing[10]};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[3]};
  flex-shrink: 0;
`

export const FooterNote = styled.div`
  font-size: 10px;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text4};
`

export const LegendDot = styled.span<{ $color: string }>`
  width: 7px;
  height: 7px;
  border-radius: 2px;
  background: ${({ $color }) => $color};
  display: inline-block;
`

export const LegendGroup = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[5]};
  font-size: 10px;
  color: ${({ theme }) => theme.colors.text4};
`

export const LegendItem = styled.span`
  display: flex;
  align-items: center;
  gap: 3px;
`

// ─── Budget Header ─────────────────────────────────────

export const BudgetHeaderRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[6]};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[10]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  flex-wrap: wrap;
  align-items: baseline;
`

export const BudgetHeaderItem = styled.div`
  display: flex;
  align-items: baseline;
  gap: ${({ theme }) => theme.spacing[2]};
`

export const BudgetHeaderLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text4};
  white-space: nowrap;
`

export const BudgetHeaderValue = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
`

export const BudgetGrowthBadge = styled.span<{ $positive: boolean }>`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ $positive }) => ($positive ? '#10b981' : '#ef4444')};
  background: ${({ $positive }) => ($positive ? '#10b98112' : '#ef444412')};
  padding: 1px ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.radii.sm};
`

// ─── Card Grid (横スクロールカードレイアウト) ─────────────

export const CardScrollContainer = styled.div`
  position: relative;
  overflow: hidden;
`

export const CardScrollInner = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: 0 ${({ theme }) => theme.spacing[10]} ${({ theme }) => theme.spacing[4]};
  overflow-x: auto;
  scroll-behavior: smooth;
  scrollbar-width: none;
  -ms-overflow-style: none;
  &::-webkit-scrollbar {
    display: none;
  }
`

export const ScrollCard = styled.div`
  flex: 0 0 180px;
  min-width: 180px;
`

export const ScrollArrow = styled.button<{ $direction: 'left' | 'right' }>`
  all: unset;
  position: absolute;
  top: 50%;
  ${({ $direction }) => ($direction === 'left' ? 'left: 4px;' : 'right: 4px;')}
  transform: translateY(-50%);
  z-index: 2;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(30, 30, 30, 0.9)' : 'rgba(255, 255, 255, 0.9)'};
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text3};
  font-size: 14px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.15s;
  &:hover {
    color: ${({ theme }) => theme.colors.text};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(50, 50, 50, 0.95)' : 'rgba(255, 255, 255, 1)'};
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
  }
`

export const CardGridRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: ${({ theme }) => theme.spacing[3]};
  padding: 0 ${({ theme }) => theme.spacing[10]} ${({ theme }) => theme.spacing[4]};
`

// ─── Collapsible Section ───────────────────────────────

export const SectionHeader = styled.button`
  all: unset;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  cursor: pointer;
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[10]}
    ${({ theme }) => theme.spacing[2]};
  width: 100%;
  box-sizing: border-box;
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)'};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: -2px;
  }
`

export const SectionChevron = styled.span<{ $open: boolean }>`
  display: inline-flex;
  transition: transform 0.2s ease;
  transform: rotate(${({ $open }) => ($open ? '90deg' : '0deg')});
  font-size: 10px;
  color: ${({ theme }) => theme.colors.text4};
`

export const SectionContent = styled.div<{ $open: boolean }>`
  display: grid;
  grid-template-rows: ${({ $open }) => ($open ? '1fr' : '0fr')};
  transition: grid-template-rows 0.25s ease;
  & > div {
    overflow: hidden;
  }
`

export const CardGroupLabel = styled.span`
  font-size: 10px;
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text4};
  letter-spacing: 0.5px;
`

export const SettingsGear = styled.button`
  all: unset;
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  color: ${({ theme }) => theme.colors.text4};
  padding: ${({ theme }) => theme.spacing[2]};
  border-radius: ${({ theme }) => theme.radii.sm};
  transition: all 0.15s;
  &:hover {
    color: ${({ theme }) => theme.colors.text};
    background: ${({ theme }) => theme.colors.bg4};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
  }
`

export const CondCard = styled.div<{ $borderColor: string; $clickable?: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[4]} ${({ theme }) => theme.spacing[5]};
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-left: 3px solid ${({ $borderColor }) => $borderColor};
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: ${({ $clickable = true }) => ($clickable ? 'pointer' : 'default')};
  transition:
    box-shadow 0.15s,
    transform 0.15s;
  ${({ $clickable = true }) =>
    $clickable &&
    `
    &:hover {
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      transform: translateY(-1px);
    }
  `}
`

export const CondSignal = styled.div<{ $color: string }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
  margin-top: 3px;
`

export const CondCardContent = styled.div`
  flex: 1;
  min-width: 0;
`

export const CondCardLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text3};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`

export const CondCardValue = styled.div<{ $color: string }>`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ $color }) => $color};
`

export const CondCardSub = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text3};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  margin-top: ${({ theme }) => theme.spacing[1]};
`

// ─── Drill-down Overlay ─────────────────────────────────

export const DrillOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${({ theme }) => theme.zIndex.modal};
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(15, 23, 42, 0.35)'};
`

export const DrillPanel = styled.div`
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  min-width: 420px;
  max-width: 740px;
  width: 90vw;
  max-height: 82vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
`

export const DrillHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${({ theme }) => theme.spacing[8]} ${({ theme }) => theme.spacing[10]}
    ${({ theme }) => theme.spacing[6]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[4]};
  flex-shrink: 0;
`

export const DrillTitle = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
`

export const DrillBody = styled.div`
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
`

export const DrillCloseBtn = styled.button`
  all: unset;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.text3};
  font-size: 18px;
  flex-shrink: 0;
  transition: all 0.15s;
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'};
    color: ${({ theme }) => theme.colors.text};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
  }
`

// ─── Table Header ──────────────────────────────────────

export const TableHeaderRow = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing[4]};
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[10]};
  border-bottom: 2px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'};
`

export const TableHeaderCell = styled.span<{ $align?: 'left' | 'center' | 'right' }>`
  font-size: 10px;
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  font-family: ${({ theme }) => theme.typography.fontFamily.primary};
  color: ${({ theme }) => theme.colors.text4};
  text-align: ${({ $align }) => $align ?? 'left'};
  letter-spacing: 0.5px;
`

// ─── Daily Detail Modal ────────────────────────────────

export const DailyModalPanel = styled.div`
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  min-width: 500px;
  max-width: 860px;
  width: 92vw;
  max-height: 85vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
`

export const DailyTableWrapper = styled.div`
  overflow-x: auto;
  overflow-y: auto;
  flex: 1;
`

export const DailyTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
`

/** 単日 / 累計 のグループヘッダー行 */
export const DailyGroupTh = styled.th<{ $align?: string; $group?: boolean }>`
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[4]};
  text-align: ${({ $align }) => $align ?? 'center'};
  font-size: 10px;
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.palette.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(59,130,246,0.05)'};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  ${({ $group, theme }) => ($group ? `border-left: 2px solid ${theme.colors.border};` : '')}
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 2;
`

export const DailyTh = styled.th<{ $align?: string; $group?: boolean }>`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[4]};
  text-align: ${({ $align }) => $align ?? 'right'};
  font-size: 10px;
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text4};
  border-bottom: 2px solid ${({ theme }) => theme.colors.border};
  ${({ $group, theme }) => ($group ? `border-left: 2px solid ${theme.colors.border};` : '')}
  white-space: nowrap;
  position: sticky;
  top: 24px;
  background: ${({ theme }) => theme.colors.bg2};
  z-index: 1;
`

export const DailyTd = styled.td<{ $color?: string; $bold?: boolean; $group?: boolean }>`
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[4]};
  text-align: right;
  color: ${({ $color, theme }) => $color ?? theme.colors.text};
  font-weight: ${({ $bold }) => ($bold ? 700 : 400)};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  ${({ $group, theme }) => ($group ? `border-left: 2px solid ${theme.colors.border};` : '')}
  white-space: nowrap;
`

export const DailyTr = styled.tr`
  transition: background 0.1s;
  &:nth-child(even) {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.015)'};
  }
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'};
  }
`
