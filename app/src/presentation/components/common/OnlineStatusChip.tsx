/**
 * DataStatusChip — データ取込状態表示チップ
 *
 * アプリのデータ状態（未取込 / 取込済み / 計算済み）を表示する。
 * 長押し（500ms）でコールバックを発火し、データ再取得などに利用。
 *
 * 旧 OnlineStatusChip を置き換え。navigator.onLine は常に true のため廃止。
 */
import { useCallback, useRef, useEffect } from 'react'
import styled from 'styled-components'

type DataStatus = 'no-data' | 'imported' | 'calculated'

const STATUS_CONFIG: Record<
  DataStatus,
  { label: string; colorKey: 'warning' | 'info' | 'positive' }
> = {
  'no-data': { label: '未取込', colorKey: 'warning' },
  imported: { label: '取込済', colorKey: 'info' },
  calculated: { label: '計算済', colorKey: 'positive' },
}

const Chip = styled.button<{ $colorKey: 'warning' | 'info' | 'positive' }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border: 1px solid ${({ theme, $colorKey }) => theme.colors.palette[$colorKey]};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.bg2};
  color: ${({ theme, $colorKey }) => theme.colors.palette[$colorKey]};
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  cursor: pointer;
  user-select: none;
  white-space: nowrap;

  &:hover {
    opacity: 0.85;
  }

  &:active {
    opacity: 0.7;
  }
`

const Dot = styled.span<{ $colorKey: 'warning' | 'info' | 'positive' }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ theme, $colorKey }) => theme.colors.palette[$colorKey]};
`

interface OnlineStatusChipProps {
  /** 長押し時のコールバック（データ再取得など） */
  readonly onLongPress?: () => void
  /** データが存在するか */
  readonly hasData?: boolean
  /** 計算済みか */
  readonly isCalculated?: boolean
}

/** 旧名エイリアス（後方互換） */
export function OnlineStatusChip({ onLongPress, hasData, isCalculated }: OnlineStatusChipProps) {
  return <DataStatusChip onLongPress={onLongPress} hasData={hasData} isCalculated={isCalculated} />
}

export function DataStatusChip({ onLongPress, hasData, isCalculated }: OnlineStatusChipProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const status: DataStatus = isCalculated ? 'calculated' : hasData ? 'imported' : 'no-data'
  const config = STATUS_CONFIG[status]

  const handlePointerDown = useCallback(() => {
    if (!onLongPress) return
    timerRef.current = setTimeout(() => {
      onLongPress()
      timerRef.current = null
    }, 500)
  }, [onLongPress])

  const handlePointerUp = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <Chip
      $colorKey={config.colorKey}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      title={onLongPress ? '長押しでデータ再取得' : undefined}
    >
      <Dot $colorKey={config.colorKey} />
      {config.label}
    </Chip>
  )
}
