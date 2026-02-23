import styled from 'styled-components'
import { useUiStore, type CurrencyUnit } from '@/application/stores/uiStore'

const ToggleGroup = styled.div`
  display: inline-flex;
  gap: 1px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 2px;
`

const ToggleBtn = styled.button<{ $active: boolean }>`
  all: unset;
  cursor: pointer;
  font-size: 0.6rem;
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ $active, theme }) => ($active ? '#fff' : theme.colors.text3)};
  background: ${({ $active, theme }) =>
    $active ? theme.colors.palette.primary : 'transparent'};
  transition: all 0.15s;
  white-space: nowrap;
  &:hover {
    opacity: 0.85;
  }
`

export function CurrencyUnitToggle() {
  const currencyUnit = useUiStore((s) => s.currencyUnit)
  const setCurrencyUnit = useUiStore((s) => s.setCurrencyUnit)

  const options: { value: CurrencyUnit; label: string }[] = [
    { value: 'sen', label: '千円' },
    { value: 'yen', label: '円' },
  ]

  return (
    <ToggleGroup>
      {options.map((opt) => (
        <ToggleBtn
          key={opt.value}
          $active={currencyUnit === opt.value}
          onClick={() => setCurrencyUnit(opt.value)}
        >
          {opt.label}
        </ToggleBtn>
      ))}
    </ToggleGroup>
  )
}
