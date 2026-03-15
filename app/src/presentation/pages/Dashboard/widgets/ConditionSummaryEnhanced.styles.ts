import styled, { css } from 'styled-components'

// ─── Container ──────────────────────────────────────────

export const DashWrapper = styled.div`
  width: 100%;
  background: ${({ theme }) => theme.colors.bg3};
  border-radius: ${({ theme }) => theme.radii.xl};
  border: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  overflow: hidden;
`

// ─── Header ─────────────────────────────────────────────

export const Header = styled.div`
  padding: ${({ theme }) => theme.spacing[8]} ${({ theme }) => theme.spacing[10]}
    ${({ theme }) => theme.spacing[6]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`

export const HeaderMeta = styled.div`
  font-size: 9px;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text4};
  letter-spacing: 3px;
  margin-bottom: 2px;
`

export const HeaderTitle = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize['2xl']};
  font-weight: ${({ theme }) => theme.typography.fontWeight.extrabold};
  margin: 0 0 ${({ theme }) => theme.spacing[7]} 0;
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

export const MetricIcon = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize['2xl']};
`

export const MetricLabel = styled.span<{ $active: boolean; $color: string }>`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ $active }) => ($active ? 700 : 400)};
  font-family: ${({ theme }) => theme.typography.fontFamily.primary};
  color: ${({ $active, $color, theme }) => ($active ? $color : theme.colors.text3)};
`

// ─── Total Summary ──────────────────────────────────────

export const TotalSection = styled.div`
  padding: ${({ theme }) => theme.spacing[8]} ${({ theme }) => theme.spacing[10]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, transparent 100%)'
      : 'linear-gradient(135deg, rgba(59,130,246,0.03) 0%, transparent 100%)'};
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
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ $color }) => $color};
  background: ${({ $color }) => `${$color}18`};
  padding: 2px ${({ theme }) => theme.spacing[4]};
  border-radius: ${({ theme }) => theme.radii.sm};
  letter-spacing: 1px;
`

export const SectionLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text3};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
`

export const BigValue = styled.div`
  font-size: 28px;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-weight: ${({ theme }) => theme.typography.fontWeight.extrabold};
  color: ${({ theme }) => theme.colors.text};
  letter-spacing: -1px;
`

export const SubValue = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.text3};
`

export const MainValue = styled.div`
  font-size: 24px;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-weight: ${({ theme }) => theme.typography.fontWeight.extrabold};
  color: ${({ theme }) => theme.colors.text};
`

export const AchValue = styled.div<{ $color: string }>`
  font-size: 28px;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-weight: ${({ theme }) => theme.typography.fontWeight.extrabold};
  color: ${({ $color }) => $color};
  letter-spacing: -1px;
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
  background: linear-gradient(90deg, ${({ $color }) => `${$color}66`}, ${({ $color }) => $color});
  transition: width 0.6s ease;
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

export const StoreRowWrapper = styled.div`
  padding: ${({ theme }) => theme.spacing[5]} ${({ theme }) => theme.spacing[10]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  transition: background 0.12s;
  &:nth-child(even) {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.012)'};
  }
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'};
  }
`

/** 店舗行の3カラムグリッド: [順位+名前] [予算→実績] [達成率] */
export const StoreRowGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(100px, 1fr) minmax(140px, 1.2fr) minmax(80px, auto);
  gap: ${({ theme }) => theme.spacing[4]};
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

// ─── Card Grid (横一列カードレイアウト) ─────────────────

export const CardGridRow = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: ${({ theme }) => theme.spacing[4]};
  padding: ${({ theme }) => theme.spacing[6]} ${({ theme }) => theme.spacing[6]};
  @media (max-width: ${({ theme }) => theme.breakpoints.lg}) {
    grid-template-columns: repeat(3, 1fr);
  }
  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    grid-template-columns: repeat(2, 1fr);
  }
`

export const CondCard = styled.div<{ $borderColor: string }>`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[4]};
  padding: ${({ theme }) => theme.spacing[5]};
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-left: 4px solid ${({ $borderColor }) => $borderColor};
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: pointer;
  transition:
    box-shadow 0.15s,
    transform 0.15s;
  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transform: translateY(-1px);
  }
`

export const CondSignal = styled.div<{ $color: string }>`
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  box-shadow: 0 0 6px ${({ $color }) => `${$color}60`};
  flex-shrink: 0;
  margin-top: 2px;
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
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(15, 23, 42, 0.45)'};
  backdrop-filter: blur(4px);
  animation: drillFadeIn 0.18s ease-out;
  @keyframes drillFadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`

export const DrillPanel = styled.div`
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  min-width: 420px;
  max-width: 740px;
  width: 90vw;
  max-height: 82vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow:
    0 24px 48px rgba(0, 0, 0, 0.18),
    0 0 0 1px
      ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)')};
  animation: drillSlideUp 0.22s ease-out;
  @keyframes drillSlideUp {
    from {
      opacity: 0;
      transform: translateY(12px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
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
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.extrabold};
  color: ${({ theme }) => theme.colors.text};
  letter-spacing: -0.3px;
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
