import { useState, useCallback, useRef, useEffect, type ReactNode } from 'react'
import { ToastContext } from './toastContextDef'
import type { ToastLevel, ShowToast } from './toastContextDef'
import {
  Container,
  ToastCard,
  IconBadge,
  MessageText,
  CloseBtn,
  HistoryToggle,
  HistoryPanel,
  HistoryHeader,
  HistoryClear,
  HistoryList,
  HistoryEntry,
  HistoryTime,
  HistoryMsg,
  EmptyHistory,
} from './Toast.styles'

export type { ToastLevel } from './toastContextDef'

interface ToastItem {
  id: number
  message: string
  level: ToastLevel
  timestamp: number
  dismissed: boolean
}

/** レベルごとの自動消去時間 (ms)。null = 手動消去のみ  * @responsibility R:widget
 */
const DURATION: Record<ToastLevel, number | null> = {
  success: 3000,
  info: 3000,
  warning: 10000,
  error: null,
}

const LEVEL_ICONS: Record<ToastLevel, string> = {
  success: '✓',
  error: '!',
  warning: '⚠',
  info: 'i',
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
    setShowHistory(false)
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
      <Container role="status" aria-live="polite">
        {toasts.map((t) => (
          <ToastCard
            key={t.id}
            $level={t.level}
            $dismissing={t.dismissed}
            role="alert"
            aria-live="assertive"
          >
            <IconBadge $level={t.level} aria-hidden="true">
              {LEVEL_ICONS[t.level]}
            </IconBadge>
            <MessageText>{t.message}</MessageText>
            <CloseBtn onClick={() => dismiss(t.id)} aria-label="閉じる">
              ✕
            </CloseBtn>
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
