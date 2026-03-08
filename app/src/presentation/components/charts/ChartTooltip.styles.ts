import styled from 'styled-components'
import type { ChartTheme } from './chartTheme'

export const Wrapper = styled.div<{ $ct: ChartTheme }>`
  background: ${(p) => p.$ct.bg2};
  border: 1px solid ${(p) => p.$ct.grid};
  border-radius: 8px;
  padding: 8px 12px;
  font-size: ${(p) => p.$ct.fontSize.sm}px;
  font-family: ${(p) => p.$ct.fontFamily};
  color: ${(p) => p.$ct.text};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  pointer-events: none;
  max-width: 360px;
`

export const Label = styled.div`
  font-weight: 600;
  margin-bottom: 4px;
  white-space: nowrap;
`

export const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 1px 0;
  white-space: nowrap;
`

export const Dot = styled.span<{ $color: string }>`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${(p) => p.$color};
  flex-shrink: 0;
`

export const Name = styled.span`
  flex: 1;
  opacity: 0.8;
`

export const Value = styled.span`
  font-family: ${(p) => p.theme.typography?.fontFamily?.mono ?? 'monospace'};
  font-weight: 500;
`

export const TrendBadge = styled.span<{ $positive: boolean; $ct: ChartTheme }>`
  font-size: ${(p) => p.$ct.fontSize.xs}px;
  font-weight: 600;
  padding: 0 4px;
  border-radius: 3px;
  margin-left: 4px;
  background: ${(p) => (p.$positive ? p.$ct.colors.success : p.$ct.colors.danger)}20;
  color: ${(p) => (p.$positive ? p.$ct.colors.success : p.$ct.colors.danger)};
`
