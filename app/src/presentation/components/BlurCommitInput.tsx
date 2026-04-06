import { useCallback, useState } from 'react'
import { InventoryInput } from '@/presentation/components/DataManagementSidebar.styles'

/**
 * blur 時にのみ値を確定する数値入力コンポーネント。
 * onChange の度に再計算が走る問題を防ぐ。
 * @responsibility R:form
 */
export function BlurCommitInput({
  value,
  onCommit,
  placeholder,
  step,
  min,
  max,
  as: Component = InventoryInput,
}: {
  value: number | null | undefined
  onCommit: (value: number | null) => void
  placeholder?: string
  step?: string
  min?: number
  max?: number
  as?: React.ComponentType<React.ComponentPropsWithRef<'input'>>
}) {
  const [local, setLocal] = useState(value ?? '')
  const [prevValue, setPrevValue] = useState(value)

  // 外部（ストア）からの値変更を同期（React 推奨パターン: render 中の状態リセット）
  if (prevValue !== value) {
    setPrevValue(value)
    setLocal(value ?? '')
  }

  const commit = useCallback(() => {
    const str = String(local).trim()
    let parsed: number | null = str === '' ? null : Number(str)
    if (parsed != null && isNaN(parsed)) parsed = null
    if (parsed != null && min != null) parsed = Math.max(min, parsed)
    if (parsed != null && max != null) parsed = Math.min(max, parsed)
    onCommit(parsed)
    // clamp 後の値で表示を更新
    setLocal(parsed ?? '')
    setPrevValue(parsed)
  }, [local, onCommit, min, max])

  return (
    <Component
      type="number"
      step={step}
      min={min}
      max={max}
      placeholder={placeholder}
      value={local}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
          e.currentTarget.blur()
        }
      }}
    />
  )
}
