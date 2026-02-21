import type { Meta, StoryObj } from '@storybook/react'
import styled, { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme'
import { sc } from '@/presentation/theme/semanticColors'

const meta: Meta = {
  title: 'Foundation/Theme',
  tags: ['autodocs'],
}

export default meta

// ─── カラーパレット ─────────────────────────────────

const SwatchGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
`

const Swatch = styled.div<{ $bg: string }>`
  background: ${({ $bg }) => $bg};
  border-radius: 8px;
  padding: 12px;
  min-height: 64px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  border: 1px solid ${({ theme }) => theme.colors.border};
`

const SwatchLabel = styled.span<{ $light?: boolean }>`
  font-size: 0.65rem;
  font-weight: 600;
  color: ${({ $light }) => ($light ? '#fff' : '#000')};
  opacity: 0.9;
`

function PaletteDisplay() {
  const theme = useTheme() as AppTheme
  const p = theme.colors.palette
  const entries = Object.entries(p) as [string, string][]
  return (
    <SwatchGrid>
      {entries.map(([name, color]) => (
        <Swatch key={name} $bg={color}>
          <SwatchLabel $light>{name}</SwatchLabel>
          <SwatchLabel $light>{color}</SwatchLabel>
        </Swatch>
      ))}
    </SwatchGrid>
  )
}

export const ColorPalette: StoryObj = {
  render: () => <PaletteDisplay />,
}

// ─── セマンティックカラー ────────────────────────────

function SemanticDisplay() {
  const semanticColors = [
    { name: 'positive', color: sc.positive, usage: '良好・プラス' },
    { name: 'negative', color: sc.negative, usage: '悪化・マイナス' },
    { name: 'caution', color: sc.caution, usage: '警告・注意' },
  ]
  return (
    <SwatchGrid>
      {semanticColors.map(({ name, color, usage }) => (
        <Swatch key={name} $bg={color}>
          <SwatchLabel $light>{name}</SwatchLabel>
          <SwatchLabel $light>{usage}</SwatchLabel>
        </Swatch>
      ))}
    </SwatchGrid>
  )
}

export const SemanticColors: StoryObj = {
  render: () => <SemanticDisplay />,
}

// ─── タイポグラフィ ──────────────────────────────────

const TypeRow = styled.div`
  margin-bottom: 16px;
  padding: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
`

const TypeLabel = styled.span`
  font-size: 0.65rem;
  color: ${({ theme }) => theme.colors.text3};
  display: block;
  margin-bottom: 4px;
`

function TypographyDisplay() {
  const theme = useTheme() as AppTheme
  const sizes = Object.entries(theme.typography.fontSize)
  return (
    <div>
      {sizes.map(([name, size]) => (
        <TypeRow key={name}>
          <TypeLabel>{name} ({size})</TypeLabel>
          <span style={{ fontSize: size }}>仕入粗利管理ツール - 売上データ ABC 123</span>
        </TypeRow>
      ))}
    </div>
  )
}

export const Typography: StoryObj = {
  render: () => <TypographyDisplay />,
}

// ─── スペーシング ────────────────────────────────────

const SpacingRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
`

const SpacingBox = styled.div<{ $w: string }>`
  width: ${({ $w }) => $w};
  height: 20px;
  background: ${({ theme }) => theme.colors.palette.primary};
  border-radius: 3px;
  opacity: 0.7;
`

const SpacingLabel = styled.span`
  font-size: 0.65rem;
  color: ${({ theme }) => theme.colors.text3};
  min-width: 80px;
  font-family: monospace;
`

function SpacingDisplay() {
  const theme = useTheme() as AppTheme
  const entries = Object.entries(theme.spacing)
  return (
    <div>
      {entries.map(([key, value]) => (
        <SpacingRow key={key}>
          <SpacingLabel>spacing[{key}] = {value}</SpacingLabel>
          <SpacingBox $w={value} />
        </SpacingRow>
      ))}
    </div>
  )
}

export const Spacing: StoryObj = {
  render: () => <SpacingDisplay />,
}
