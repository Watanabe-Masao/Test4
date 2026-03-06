import { useState, useRef, useCallback } from 'react'
import { SliderValueInput } from '@/presentation/pages/Dashboard/widgets/ForecastTools.styles'
import type { EditableValueProps } from '@/presentation/pages/Dashboard/widgets/ForecastTools.styles'

export function EditableCurrencyValue({
  value,
  min,
  max,
  onChange,
  format,
  parse,
}: EditableValueProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFocus = useCallback(() => {
    setEditing(true)
    setDraft(String(value))
  }, [value])

  const commit = useCallback(() => {
    setEditing(false)
    const stripped = draft.replace(/[,、，\s%％]/g, '')
    const parsed = parse ? parse(stripped) : Number(stripped)
    if (!isNaN(parsed) && isFinite(parsed)) {
      onChange(Math.max(min, Math.min(max, Math.round(parsed))))
    }
  }, [draft, min, max, onChange, parse])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      inputRef.current?.blur()
    } else if (e.key === 'Escape') {
      setEditing(false)
      setDraft('')
      inputRef.current?.blur()
    }
  }, [])

  return (
    <SliderValueInput
      ref={inputRef}
      value={editing ? draft : format(value)}
      onFocus={handleFocus}
      onBlur={commit}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={handleKeyDown}
    />
  )
}

export function EditablePercentValue({
  value,
  min,
  max,
  onChange,
}: Omit<EditableValueProps, 'format' | 'parse'>) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFocus = useCallback(() => {
    setEditing(true)
    setDraft(value.toFixed(1))
  }, [value])

  const commit = useCallback(() => {
    setEditing(false)
    const stripped = draft.replace(/[%％\s]/g, '')
    const parsed = Number(stripped)
    if (!isNaN(parsed) && isFinite(parsed)) {
      onChange(Math.max(min, Math.min(max, Math.round(parsed * 10) / 10)))
    }
  }, [draft, min, max, onChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      inputRef.current?.blur()
    } else if (e.key === 'Escape') {
      setEditing(false)
      setDraft('')
      inputRef.current?.blur()
    }
  }, [])

  return (
    <SliderValueInput
      ref={inputRef}
      value={editing ? draft : `${value.toFixed(1)}%`}
      onFocus={handleFocus}
      onBlur={commit}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={handleKeyDown}
    />
  )
}
