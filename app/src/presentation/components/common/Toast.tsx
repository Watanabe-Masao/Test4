import styled, { keyframes, css } from 'styled-components'
import { useState, useCallback, useRef, createContext, useContext, useEffect, type ReactNode } from 'react'
import { sc } from '@/presentation/theme/semanticColors'

export type ToastLevel = 'success' | 'error' | 'warning' | 'info'

interface ToastItem {
  id: number
  message: string
  level: ToastLevel
  timestamp: number
  dismissed: boolean
}

/** レベルごとの自動消去時間 (ms)。null = 手動消去のみ */
const DURATION: Record<ToastLevel, number | null> = {
  success: 3000,
  info: 3000,
  warning: 10000,
  error: null,
}

// ─── アニメーション ───────────────────────────────────
const slideIn = keyframes`
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
`

const slideOut = keyframes`
  from { transform: translateX(0); opacity: 1; }
  to { transform: translateX(100%); opacity: 0; }
`

// ─── スタイル ─────────────────────────────────────────
const Container = styled.div`
  position: fixed;
  bottom: ${({ theme }) => theme.spacing[8]};
  right: ${({ theme }) => theme.spacing[8]};
  z-index: 3000;
  display: flex;
  flex-direction: column-reverse;
  gap: ${({ theme }) => theme.spacing[3]};
  pointer-events: none;
`

const levelColors: Record<ToastLevel, string> = {
  success: sc.positive,
  error: sc.negative,
  warning: sc.caution,
  info: '#0ea5e9',
}

const LEVEL_ICONS: Record<ToastLevel, string> = {
  success: '✓',
  error: '!',
  warning: '⚠',
  info: 'i',
}

const ToastCard = styled.div<{ $level: ToastLevel; $dismissing: boolean }>`
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-left: 3px solid ${({ $level }) => levelColors[$level]};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text};
  min-width: 280px;
  max-width: 420px;
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[3]};
  pointer-events: auto;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  ${({ $dismissing }) =>
    $dismissing
      ? css`animation: ${slideOut} 0.25s ease forwards;`
      : css`animation: ${slideIn} 0.3s ease;`}
`

const IconBadge = styled.span<{ $level: ToastLevel }>`
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: ${({ $level }) => levelColors[$level]}22;
  color: ${({ $level }) => levelColors[$level]};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  font-weight: 700;
  line-height: 1;
`

const MessageText = styled.span`
  flex: 1;
  line-height: 1.4;
  word-break: break-word;
`

const CloseBtn = styled.button`
  all: unset;
  cursor: pointer;
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ theme }) => theme.colors.text4};
  font-size: 0.7rem;
  &:hover {
    background: ${({ theme }) => theme.colors.bg4};
    color: ${({ theme }) => theme.colors.text2};
  }
`

// ─── 通知履歴パネル ──────────────────────────────────
const HistoryToggle = styled.button<{ $hasUnread: boolean }>`
  position: fixed;
  bottom: ${({ theme }) => theme.spacing[8]};
  right: calc(${({ theme }) => theme.spacing[8]} + 440px);
  z-index: 3001;
  all: unset;
  cursor: pointer;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  color: ${({ theme }) => theme.colors.text3};
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
  position: relative;
  &:hover {
    background: ${({ theme }) => theme.colors.bg4};
    color: ${({ theme }) => theme.colors.text};
  }
  ${({ $hasUnread }) =>
    $hasUnread &&
    css`
      &::after {
        content: '';
        position: absolute;
        top: 6px;
        right: 6px;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: ${sc.negative};
      }
    `}
`

const HistoryPanel = styled.div`
  position: fixed;
  bottom: calc(${({ theme }) => theme.spacing[8]} + 44px);
  right: ${({ theme }) => theme.spacing[8]};
  z-index: 3002;
  width: 380px;
  max-height: 400px;
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: 0 8px 24px rgba(0,0,0,0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

const HistoryHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing[4]} ${({ theme }) => theme.spacing[5]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text};
`

const HistoryClear = styled.button`
  all: unset;
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text4};
  &:hover { color: ${({ theme }) => theme.colors.text2}; }
`

const HistoryList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${({ theme }) => theme.spacing[2]};
`

const HistoryEntry = styled.div<{ $level: ToastLevel }>`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text2};
  border-left: 2px solid ${({ $level }) => levelColors[$level]};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
  &:hover { background: ${({ theme }) => theme.colors.bg3}; }
`

const HistoryTime = styled.span`
  flex-shrink: 0;
  font-size: 0.65rem;
  color: ${({ theme }) => theme.colors.text4};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  white-space: nowrap;
  margin-top: 1px;
`

const HistoryMsg = styled.span`
  flex: 1;
  line-height: 1.4;
`

const EmptyHistory = styled.div`
  padding: ${({ theme }) => theme.spacing[10]};
  text-align: center;
  color: ${({ theme }) => theme.colors.text4};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
`

// ─── コンテキスト ──────────────────────────────────────
type ShowToast = (message: string, level?: ToastLevel) => void

const ToastContext = createContext<ShowToast>(() => {})

export function useToast(): ShowToast {
  return useContext(ToastContext)
}

// ─── 時刻フォーマット ─────────────────────────────────
function formatTime(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

// ─── プロバイダー ──────────────────────────────────────
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [history, setHistory] = useState<ToastItem[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)
  const idRef = useRef(0)
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: number) => {
    // アニメーション開始
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, dismissed: true } : t)))
    // アニメーション後に除去
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 250)
    // タイマーがあればクリア
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
  }, [])

  const showToast: ShowToast = useCallback(
    (message, level = 'info') => {
      const id = ++idRef.current
      const item: ToastItem = { id, message, level, timestamp: Date.now(), dismissed: false }
      setToasts((prev) => [...prev, item])
      setHistory((prev) => [item, ...prev].slice(0, 100)) // 最大100件保持
      setHasUnread(true)

      const duration = DURATION[level]
      if (duration !== null) {
        const timer = setTimeout(() => {
          dismiss(id)
          timersRef.current.delete(id)
        }, duration)
        timersRef.current.set(id, timer)
      }
    },
    [dismiss],
  )

  const clearHistory = useCallback(() => {
    setHistory([])
    setHasUnread(false)
  }, [])

  const toggleHistory = useCallback(() => {
    setShowHistory((prev) => {
      if (!prev) setHasUnread(false)
      return !prev
    })
  }, [])

  // クリーンアップ
  useEffect(() => {
    const timers = timersRef.current
    return () => {
      timers.forEach((t) => clearTimeout(t))
    }
  }, [])

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <Container>
        {toasts.map((t) => (
          <ToastCard key={t.id} $level={t.level} $dismissing={t.dismissed}>
            <IconBadge $level={t.level}>{LEVEL_ICONS[t.level]}</IconBadge>
            <MessageText>{t.message}</MessageText>
            <CloseBtn onClick={() => dismiss(t.id)} title="閉じる">✕</CloseBtn>
          </ToastCard>
        ))}
      </Container>

      {history.length > 0 && (
        <HistoryToggle $hasUnread={hasUnread} onClick={toggleHistory} title="通知履歴">
          🔔
        </HistoryToggle>
      )}

      {showHistory && (
        <HistoryPanel>
          <HistoryHeader>
            <span>通知履歴 ({history.length})</span>
            <HistoryClear onClick={clearHistory}>クリア</HistoryClear>
          </HistoryHeader>
          <HistoryList>
            {history.length === 0 ? (
              <EmptyHistory>通知はありません</EmptyHistory>
            ) : (
              history.map((h) => (
                <HistoryEntry key={h.id} $level={h.level}>
                  <HistoryTime>{formatTime(h.timestamp)}</HistoryTime>
                  <IconBadge $level={h.level}>{LEVEL_ICONS[h.level]}</IconBadge>
                  <HistoryMsg>{h.message}</HistoryMsg>
                </HistoryEntry>
              ))
            )}
          </HistoryList>
        </HistoryPanel>
      )}
    </ToastContext.Provider>
  )
}
