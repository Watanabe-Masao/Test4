/**
 * 編集可能な数値セルコンポーネント
 *
 * KpiTableWidgets.tsx から分割。
 */
import { useState, useCallback, useRef, useEffect, type ReactNode } from 'react'
import { useCurrencyFormat } from '@/presentation/components/charts/chartTheme'
import { EditableCell, CellInput, EditHint, KpiTooltip } from './KpiTableWidgets.styles'
import { fmtPct } from './kpiTableUtils'

export function EditableNumberCell({
  value,
  placeholder,
  onChange,
  format = 'currency',
  tooltip,
  style,
}: {
  value: number | null
  placeholder?: string
  onChange: (v: number | null) => void
  format?: 'currency' | 'percent'
  tooltip?: ReactNode
  style?: React.CSSProperties
}) {
  const { format: fmtCurrency } = useCurrencyFormat()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [hovered, setHovered] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const startEdit = useCallback(() => {
    setEditing(true)
    setDraft(value != null ? String(value) : '')
  }, [value])

  const commit = useCallback(() => {
    setEditing(false)
    if (draft === '') {
      onChange(null)
      return
    }
    const n = Number(draft)
    if (!isNaN(n)) onChange(n)
  }, [draft, onChange])

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus()
  }, [editing])

  const displayVal =
    value != null ? (format === 'percent' ? fmtPct(value) : fmtCurrency(value)) : '-'

  return (
    <EditableCell
      style={style}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {editing ? (
        <CellInput
          ref={inputRef}
          type="number"
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') setEditing(false)
          }}
        />
      ) : (
        <div
          style={{
            padding: '4px 8px',
            textAlign: 'right',
            cursor: 'pointer',
            minHeight: '1.2em',
            fontFamily: 'var(--font-mono, monospace)',
          }}
          onClick={startEdit}
          title="クリックで編集"
        >
          {displayVal}
          <EditHint>✎</EditHint>
        </div>
      )}
      {hovered && !editing && tooltip && <KpiTooltip>{tooltip}</KpiTooltip>}
    </EditableCell>
  )
}
