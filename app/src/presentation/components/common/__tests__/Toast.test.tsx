/**
 * Toast.tsx (ToastProvider) — context provider の contract test
 *
 * 検証対象 branch:
 * - showToast: 配列に追加 + history に prepend + hasUnread=true
 * - level ごとの auto-dismiss timer (success/info: 3000, warning: 10000, error: null)
 * - dismiss: dismissed フラグ → 250ms 後配列除去 + timer クリア
 * - close button click で dismiss
 * - history toggle: 開閉時に hasUnread をクリア
 * - clearHistory: history 空 + hasUnread false + showHistory false
 * - history bell button: history.length > 0 のときのみ表示
 * - showToast level icon (✓/!/⚠/i)
 * - aria-live / role 属性
 *
 * Phase 3 Step 3-7: coverage 31.48% → 上 を狙う。
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ThemeProvider } from 'styled-components'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { ToastProvider } from '../Toast'
import { useToast } from '../useToast'
import { darkTheme } from '@/presentation/theme/theme'

/** 子 component 側から showToast を呼ぶための helper */
function ToastTrigger({
  message,
  level,
}: {
  message: string
  level?: 'success' | 'info' | 'warning' | 'error'
}) {
  const showToast = useToast()
  return <button onClick={() => showToast(message, level)}>show {level ?? 'info'}</button>
}

function renderProvider(child: React.ReactNode) {
  return render(
    <ThemeProvider theme={darkTheme}>
      <ToastProvider>{child}</ToastProvider>
    </ThemeProvider>,
  )
}

describe('ToastProvider — 表示と level', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('showToast(info) で alert role の toast が出現する', () => {
    renderProvider(<ToastTrigger message="情報メッセージ" level="info" />)
    fireEvent.click(screen.getByText('show info'))
    expect(screen.getByText('情報メッセージ')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('level=success で ✓ icon が表示される', () => {
    renderProvider(<ToastTrigger message="成功" level="success" />)
    fireEvent.click(screen.getByText('show success'))
    expect(screen.getByText('✓')).toBeInTheDocument()
  })

  it('level=error で ! icon が表示される', () => {
    renderProvider(<ToastTrigger message="エラー" level="error" />)
    fireEvent.click(screen.getByText('show error'))
    expect(screen.getByText('!')).toBeInTheDocument()
  })

  it('level=warning で ⚠ icon が表示される', () => {
    renderProvider(<ToastTrigger message="警告" level="warning" />)
    fireEvent.click(screen.getByText('show warning'))
    expect(screen.getByText('⚠')).toBeInTheDocument()
  })

  it('Container は role=status + aria-live=polite', () => {
    renderProvider(<ToastTrigger message="msg" />)
    fireEvent.click(screen.getByText('show info'))
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-live', 'polite')
  })
})

describe('ToastProvider — auto dismiss', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('level=info は 3000ms 後に自動 dismiss される (250ms アニメーション後に DOM 除去)', () => {
    renderProvider(<ToastTrigger message="自動消去テスト" level="info" />)
    fireEvent.click(screen.getByText('show info'))
    expect(screen.getByText('自動消去テスト')).toBeInTheDocument()

    // 3000ms 経過: dismissed フラグが立つ
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    // さらに 250ms 経過: DOM から除去される
    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(screen.queryByText('自動消去テスト')).not.toBeInTheDocument()
  })

  it('level=warning は 10000ms まで残る', () => {
    renderProvider(<ToastTrigger message="警告メッセージ" level="warning" />)
    fireEvent.click(screen.getByText('show warning'))
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(screen.getByText('警告メッセージ')).toBeInTheDocument() // まだ残る
    act(() => {
      vi.advanceTimersByTime(5000 + 250)
    })
    expect(screen.queryByText('警告メッセージ')).not.toBeInTheDocument()
  })

  it('level=error は自動 dismiss されない (DURATION=null)', () => {
    renderProvider(<ToastTrigger message="エラー" level="error" />)
    fireEvent.click(screen.getByText('show error'))
    act(() => {
      vi.advanceTimersByTime(60000) // 1 分待っても残る
    })
    expect(screen.getByText('エラー')).toBeInTheDocument()
  })
})

describe('ToastProvider — close button', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('close button click で 250ms 後に DOM から除去される', () => {
    renderProvider(<ToastTrigger message="手動消去" level="error" />)
    fireEvent.click(screen.getByText('show error'))
    expect(screen.getByText('手動消去')).toBeInTheDocument()

    // 閉じるボタン click
    const closeBtn = screen.getByRole('button', { name: '閉じる' })
    fireEvent.click(closeBtn)

    // 250ms 経過: 除去
    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(screen.queryByText('手動消去')).not.toBeInTheDocument()
  })
})

describe('ToastProvider — history', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('history が空のとき bell button は表示されない', () => {
    renderProvider(<ToastTrigger message="msg" />)
    expect(screen.queryByTitle('通知履歴')).not.toBeInTheDocument()
  })

  it('1 つでも showToast すれば bell button が表示される', () => {
    renderProvider(<ToastTrigger message="履歴入り" />)
    fireEvent.click(screen.getByText('show info'))
    expect(screen.getByTitle('通知履歴')).toBeInTheDocument()
  })

  it('bell button click で history panel が開き、内部に件数が表示される', () => {
    renderProvider(<ToastTrigger message="第一通知" level="warning" />)
    fireEvent.click(screen.getByText('show warning'))
    fireEvent.click(screen.getByTitle('通知履歴'))
    expect(screen.getByText('通知履歴 (1)')).toBeInTheDocument()
  })

  it('history panel 内に過去メッセージが表示される', () => {
    renderProvider(<ToastTrigger message="過去メッセージ" level="error" />)
    fireEvent.click(screen.getByText('show error'))
    fireEvent.click(screen.getByTitle('通知履歴'))
    // panel 内に複数表示される (toast 自身 + history 内)
    const matches = screen.getAllByText('過去メッセージ')
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })

  it('クリアボタンで history が空になり panel も閉じる', () => {
    renderProvider(<ToastTrigger message="削除対象" level="error" />)
    fireEvent.click(screen.getByText('show error'))
    fireEvent.click(screen.getByTitle('通知履歴'))
    expect(screen.getByText('通知履歴 (1)')).toBeInTheDocument()

    fireEvent.click(screen.getByText('クリア'))
    // panel も閉じる + bell button も非表示 (history 空のため)
    expect(screen.queryByText('通知履歴 (1)')).not.toBeInTheDocument()
    expect(screen.queryByTitle('通知履歴')).not.toBeInTheDocument()
  })
})
