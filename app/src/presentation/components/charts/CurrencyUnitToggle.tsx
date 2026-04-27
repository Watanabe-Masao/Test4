/**
 * @responsibility R:unclassified
 */

import { useUiStore, type CurrencyUnit } from '@/application/stores/uiStore'
import { ToggleGroup, ToggleBtn } from './CurrencyUnitToggle.styles'

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
