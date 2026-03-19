import styled from 'styled-components'

// ── コントロール ──

export const ControlStrip = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
  align-items: stretch;
  flex-wrap: wrap;
`

export const ControlItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

export const ControlItemLabel = styled.span`
  font-size: 0.5rem;
  color: ${({ theme }) => theme.colors.text4};
  font-weight: 600;
  letter-spacing: 0.02em;
  line-height: 1;
`

export const ControlBtnGroup = styled.div`
  display: flex;
  gap: 4px;
  align-items: center;
`

export const ToggleBtn = styled.button<{ $active: boolean }>`
  padding: 2px 10px;
  font-size: 0.6rem;
  border: 1px solid
    ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ $active, theme }) => ($active ? theme.interactive.activeBg : 'transparent')};
  color: ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.text3)};
  cursor: pointer;
  white-space: nowrap;
  transition:
    border-color ${({ theme }) => theme.transitions.fast} ${({ theme }) => theme.transitions.ease},
    background ${({ theme }) => theme.transitions.fast} ${({ theme }) => theme.transitions.ease},
    color ${({ theme }) => theme.transitions.fast} ${({ theme }) => theme.transitions.ease},
    transform ${({ theme }) => theme.transitions.fast} ${({ theme }) => theme.transitions.ease};

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.palette.primary};
    color: ${({ theme }) => theme.colors.palette.primary};
  }

  &:active:not(:disabled) {
    transform: ${({ theme }) => theme.interaction.pressScale};
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.interaction.focusRing};
  }
`

// ── 状態表示 ──

export const ChartErrorMsg = styled.div`
  padding: 24px;
  text-align: center;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text3};
`
