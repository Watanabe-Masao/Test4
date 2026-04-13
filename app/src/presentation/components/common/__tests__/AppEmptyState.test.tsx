/**
 * AppEmptyState.tsx — 空状態コンポーネントの contract test
 *
 * 検証対象 branch:
 * - variant='import': emptyImport + emptyImportAction 表示
 * - variant='result': emptyResult のみ表示 (subMessage なし)
 */
import { describe, it, expect, vi } from 'vitest'
import { ThemeProvider } from 'styled-components'
import { render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { darkTheme } from '@/presentation/theme/theme'

vi.mock('@/application/hooks/useI18n', () => ({
  useI18n: () => ({
    messages: {
      lifecycle: {
        emptyImport: 'データをインポートしてください',
        emptyImportAction: 'インポートボタンを押して開始',
        emptyResult: '計算結果がありません',
      },
    },
  }),
}))

import { AppEmptyState } from '../AppEmptyState'

function renderWithTheme(ui: ReactElement) {
  return render(ui, {
    wrapper: ({ children }) => <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>,
  })
}

describe('AppEmptyState', () => {
  it("variant='import' で emptyImport + emptyImportAction を表示", () => {
    renderWithTheme(<AppEmptyState variant="import" />)
    expect(screen.getByText('データをインポートしてください')).toBeInTheDocument()
    expect(screen.getByText('インポートボタンを押して開始')).toBeInTheDocument()
  })

  it("variant='result' で emptyResult のみ表示", () => {
    renderWithTheme(<AppEmptyState variant="result" />)
    expect(screen.getByText('計算結果がありません')).toBeInTheDocument()
    // import 系メッセージは非表示
    expect(screen.queryByText('データをインポートしてください')).not.toBeInTheDocument()
    expect(screen.queryByText('インポートボタンを押して開始')).not.toBeInTheDocument()
  })
})
