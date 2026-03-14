/**
 * OnlineStatusChip — オンライン/オフライン状態表示チップ
 *
 * navigator.onLine の状態をリアルタイムで表示する。
 * 長押し（500ms）でコールバックを発火し、データ再取得などに利用。
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import styled from 'styled-components'

const Chip = styled.button<{ $online: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border: 1px solid ${({ theme, $online }) => ($online ? theme.positive : theme.negative)};
  border-radius: 12px;
  background: ${({ theme }) => theme.bg2};
  color: ${({ theme, $online }) => ($online ? theme.positive : theme.negative)};
  font-size: ${({ theme }) => theme.fontSize.xs};
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

const Dot = styled.span<{ $online: boolean }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ $online, theme }) => ($online ? theme.positive : theme.negative)};
`

interface OnlineStatusChipProps {
  /** 長押し時のコールバック（データ再取得など） */
  readonly onLongPress?: () => void
}

export function OnlineStatusChip({ onLongPress }: OnlineStatusChipProps) {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

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
      $online={isOnline}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      title={onLongPress ? '長押しでデータ再取得' : undefined}
    >
      <Dot $online={isOnline} />
      {isOnline ? 'オンライン' : 'オフライン'}
    </Chip>
  )
}
