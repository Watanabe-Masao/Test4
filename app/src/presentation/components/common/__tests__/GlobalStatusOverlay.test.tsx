/**
 * GlobalStatusOverlay.tsx — lifecycle overlay の contract test
 *
 * 検証対象 branch:
 * - phase='error': ErrorIcon + error title + detail 表示
 * - phase='error' + error 文字列なし: detail 非表示
 * - blocking=false: null (非表示)
 * - blocking=true + booting: booting メッセージ
 * - blocking=true + restoring: restoring メッセージ
 * - blocking=true + initializing_engine: initializingEngine メッセージ
 * - blocking=true + loading_data: loadingData メッセージ
 * - blocking=true + applying_update: applyingUpdate + applyingUpdateDetail
 * - phase='ready' + blocking=false: null
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ThemeProvider } from 'styled-components'
import { render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { darkTheme } from '@/presentation/theme/theme'

// mock lifecycle context
const mockStatus = {
  phase: 'booting' as
    | 'booting'
    | 'restoring'
    | 'initializing_engine'
    | 'loading_data'
    | 'applying_update'
    | 'ready'
    | 'error',
  blocking: true,
  error: null as string | null,
}

vi.mock('@/application/lifecycle', () => ({
  useAppLifecycleContext: () => mockStatus,
}))

vi.mock('@/application/hooks/useI18n', () => ({
  useI18n: () => ({
    messages: {
      lifecycle: {
        booting: '起動中...',
        restoring: '復元中...',
        initializingEngine: 'エンジン初期化中',
        loadingData: 'データ読み込み中',
        applyingUpdate: '更新適用中',
        applyingUpdateDetail: '更新詳細',
        error: 'エラー発生',
      },
    },
  }),
}))

import { GlobalStatusOverlay } from '../GlobalStatusOverlay'

function renderWithTheme(ui: ReactElement) {
  return render(ui, {
    wrapper: ({ children }) => <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>,
  })
}

beforeEach(() => {
  mockStatus.phase = 'booting'
  mockStatus.blocking = true
  mockStatus.error = null
})

describe('GlobalStatusOverlay — blocking 状態', () => {
  it('phase=booting + blocking=true: role=status + booting メッセージ', () => {
    mockStatus.phase = 'booting'
    renderWithTheme(<GlobalStatusOverlay />)
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText('起動中...')).toBeInTheDocument()
  })

  it('phase=restoring: restoring メッセージ', () => {
    mockStatus.phase = 'restoring'
    renderWithTheme(<GlobalStatusOverlay />)
    expect(screen.getByText('復元中...')).toBeInTheDocument()
  })

  it('phase=initializing_engine: initializingEngine メッセージ', () => {
    mockStatus.phase = 'initializing_engine'
    renderWithTheme(<GlobalStatusOverlay />)
    expect(screen.getByText('エンジン初期化中')).toBeInTheDocument()
  })

  it('phase=loading_data: loadingData メッセージ', () => {
    mockStatus.phase = 'loading_data'
    renderWithTheme(<GlobalStatusOverlay />)
    expect(screen.getByText('データ読み込み中')).toBeInTheDocument()
  })

  it('phase=applying_update: applyingUpdate + applyingUpdateDetail 両方表示', () => {
    mockStatus.phase = 'applying_update'
    renderWithTheme(<GlobalStatusOverlay />)
    expect(screen.getByText('更新適用中')).toBeInTheDocument()
    expect(screen.getByText('更新詳細')).toBeInTheDocument()
  })

  it('phase!=applying_update では detail は表示されない', () => {
    mockStatus.phase = 'booting'
    renderWithTheme(<GlobalStatusOverlay />)
    expect(screen.queryByText('更新詳細')).not.toBeInTheDocument()
  })
})

describe('GlobalStatusOverlay — non-blocking 状態', () => {
  it('blocking=false: null (表示なし)', () => {
    mockStatus.phase = 'ready'
    mockStatus.blocking = false
    const { container } = renderWithTheme(<GlobalStatusOverlay />)
    expect(container.textContent).toBe('')
  })
})

describe('GlobalStatusOverlay — error 状態', () => {
  it('phase=error: role=alert + error title 表示 (blocking に関わらず)', () => {
    mockStatus.phase = 'error'
    mockStatus.blocking = false
    mockStatus.error = 'ネットワークエラー'
    renderWithTheme(<GlobalStatusOverlay />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('エラー発生')).toBeInTheDocument()
    expect(screen.getByText('ネットワークエラー')).toBeInTheDocument()
  })

  it('phase=error + error=null: detail 非表示', () => {
    mockStatus.phase = 'error'
    mockStatus.error = null
    renderWithTheme(<GlobalStatusOverlay />)
    expect(screen.getByText('エラー発生')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})
