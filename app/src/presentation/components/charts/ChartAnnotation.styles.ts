import styled from 'styled-components'
import type { ChartTheme } from './chartTheme'

export const Trigger = styled.span`
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  pointer-events: auto;
`

export const Popover = styled.div<{ $ct: ChartTheme }>`
  background: ${(p) => p.$ct.bg2};
  border: 1px solid ${(p) => p.$ct.grid};
  border-radius: 8px;
  padding: 10px 14px;
  font-size: ${(p) => p.$ct.fontSize.sm}px;
  font-family: ${(p) => p.$ct.fontFamily};
  color: ${(p) => p.$ct.text};
  box-shadow: 0 4px 16px
    ${({ theme }) => (theme.mode === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)')};
  max-width: 280px;
  line-height: 1.5;
  z-index: 1100;
`
