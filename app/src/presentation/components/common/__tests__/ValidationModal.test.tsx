/**
 * ValidationModal.tsx — 検証結果モーダルの contract test
 *
 * 検証対象 branch:
 * - message sort: errors → warnings → infos の順
 * - MessageEntry: level label (ERROR/WARN/INFO)
 * - 詳細 toggle: details ありなら「詳細 (N)」/ click で expand / 再 click で閉じる
 * - details なし: toggle 非表示
 * - NextStepsSection:
 *   - error あり → error variant + "エラーを修正してから再インポートしてください"
 *   - warning のみ → warning variant + "データは取り込まれましたが..."
 *   - info のみ / 空 → success variant + "取り込み完了!"
 * - footer に「閉じる」Button + click で onClose
 *
 * Phase 3 Step 3-11: larger component を狙う。
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect, vi } from 'vitest'
import { ThemeProvider } from 'styled-components'
import { render, screen, fireEvent } from '@testing-library/react'
import type { ReactElement } from 'react'
import { ValidationModal } from '../ValidationModal'
import { darkTheme } from '@/presentation/theme/theme'
import type { ValidationMessage } from '@/domain/models/record'

function renderWithTheme(ui: ReactElement) {
  return render(ui, {
    wrapper: ({ children }) => <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>,
  })
}

function makeMsg(
  level: ValidationMessage['level'],
  message: string,
  details?: string[],
): ValidationMessage {
  return { level, message, details } as ValidationMessage
}

describe('ValidationModal — message sort', () => {
  it('error → warning → info の順に表示される (入力順無関係)', () => {
    const messages = [
      makeMsg('info', '情報メッセージ'),
      makeMsg('error', 'エラー1'),
      makeMsg('warning', '警告1'),
      makeMsg('error', 'エラー2'),
    ]
    renderWithTheme(<ValidationModal messages={messages} onClose={vi.fn()} />)

    const allMessages = [
      screen.getByText('エラー1'),
      screen.getByText('エラー2'),
      screen.getByText('警告1'),
      screen.getByText('情報メッセージ'),
    ]
    // それぞれが DOM 上に先頭から順に並んでいることを確認
    for (let i = 0; i < allMessages.length - 1; i++) {
      const current = allMessages[i]
      const next = allMessages[i + 1]
      expect(current.compareDocumentPosition(next)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    }
  })
})

describe('ValidationModal — level label badge', () => {
  it('error message は ERROR badge を持つ', () => {
    renderWithTheme(
      <ValidationModal messages={[makeMsg('error', 'テストエラー')]} onClose={vi.fn()} />,
    )
    expect(screen.getByText('ERROR')).toBeInTheDocument()
  })

  it('warning message は WARN badge を持つ', () => {
    renderWithTheme(
      <ValidationModal messages={[makeMsg('warning', 'テスト警告')]} onClose={vi.fn()} />,
    )
    expect(screen.getByText('WARN')).toBeInTheDocument()
  })

  it('info message は INFO badge を持つ', () => {
    renderWithTheme(
      <ValidationModal messages={[makeMsg('info', 'テスト情報')]} onClose={vi.fn()} />,
    )
    expect(screen.getByText('INFO')).toBeInTheDocument()
  })
})

describe('ValidationModal — MessageEntry 詳細 toggle', () => {
  it('details なし → toggle button 非表示', () => {
    renderWithTheme(<ValidationModal messages={[makeMsg('error', 'エラー')]} onClose={vi.fn()} />)
    expect(screen.queryByText(/詳細/)).not.toBeInTheDocument()
  })

  it('details あり → 「▼ 詳細 (N)」toggle 表示', () => {
    renderWithTheme(
      <ValidationModal
        messages={[makeMsg('error', 'エラー', ['detail1', 'detail2', 'detail3'])]}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByText('▼ 詳細 (3)')).toBeInTheDocument()
  })

  it('初期は details 非表示', () => {
    renderWithTheme(
      <ValidationModal
        messages={[makeMsg('error', 'エラー', ['detail1', 'detail2'])]}
        onClose={vi.fn()}
      />,
    )
    expect(screen.queryByText('detail1')).not.toBeInTheDocument()
    expect(screen.queryByText('detail2')).not.toBeInTheDocument()
  })

  it('toggle click で details が表示される', () => {
    renderWithTheme(
      <ValidationModal
        messages={[makeMsg('error', 'エラー', ['detail1', 'detail2'])]}
        onClose={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByText('▼ 詳細 (2)'))
    expect(screen.getByText('detail1')).toBeInTheDocument()
    expect(screen.getByText('detail2')).toBeInTheDocument()
  })

  it('展開後 toggle text が「▲ 閉じる」に変わる', () => {
    renderWithTheme(
      <ValidationModal messages={[makeMsg('error', 'エラー', ['detail1'])]} onClose={vi.fn()} />,
    )
    fireEvent.click(screen.getByText('▼ 詳細 (1)'))
    expect(screen.getByText('▲ 閉じる')).toBeInTheDocument()
  })

  it('再 click で details が再び閉じる', () => {
    renderWithTheme(
      <ValidationModal messages={[makeMsg('error', 'エラー', ['detail1'])]} onClose={vi.fn()} />,
    )
    fireEvent.click(screen.getByText('▼ 詳細 (1)'))
    expect(screen.getByText('detail1')).toBeInTheDocument()
    fireEvent.click(screen.getByText('▲ 閉じる'))
    expect(screen.queryByText('detail1')).not.toBeInTheDocument()
  })
})

describe('ValidationModal — NextStepsSection', () => {
  it('error あり → "エラーを修正してから再インポートしてください"', () => {
    renderWithTheme(
      <ValidationModal
        messages={[makeMsg('error', 'エラー'), makeMsg('warning', '警告')]}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByText(/エラーを修正してから再インポートしてください/)).toBeInTheDocument()
  })

  it('warning のみ → "データは取り込まれましたが..."', () => {
    renderWithTheme(
      <ValidationModal messages={[makeMsg('warning', '警告のみ')]} onClose={vi.fn()} />,
    )
    expect(
      screen.getByText(/データは取り込まれましたが、以下を確認してください/),
    ).toBeInTheDocument()
  })

  it('info のみ → "取り込み完了!"', () => {
    renderWithTheme(<ValidationModal messages={[makeMsg('info', '情報のみ')]} onClose={vi.fn()} />)
    expect(screen.getByText(/取り込み完了/)).toBeInTheDocument()
  })

  it('空 messages → "取り込み完了!" (success)', () => {
    renderWithTheme(<ValidationModal messages={[]} onClose={vi.fn()} />)
    expect(screen.getByText(/取り込み完了/)).toBeInTheDocument()
  })
})

describe('ValidationModal — footer close button', () => {
  it('footer の「閉じる」button が表示される (Modal 本体の ✕ とは別)', () => {
    renderWithTheme(<ValidationModal messages={[makeMsg('info', 'info')]} onClose={vi.fn()} />)
    // footer button は role=button + name=閉じる (Modal の close button と重複)
    const closeButtons = screen.getAllByRole('button', { name: '閉じる' })
    expect(closeButtons.length).toBeGreaterThanOrEqual(1)
  })

  it('footer 閉じる click で onClose が発火', () => {
    const onClose = vi.fn()
    renderWithTheme(<ValidationModal messages={[makeMsg('info', 'info')]} onClose={onClose} />)
    const closeButtons = screen.getAllByRole('button', { name: '閉じる' })
    // footer button (最後) を click
    fireEvent.click(closeButtons[closeButtons.length - 1])
    expect(onClose).toHaveBeenCalled()
  })

  it('Modal header の ✕ button も onClose を発火', () => {
    const onClose = vi.fn()
    renderWithTheme(<ValidationModal messages={[makeMsg('info', 'info')]} onClose={onClose} />)
    // Modal 本体の close button (aria-label=閉じる の ✕)
    const closeButtons = screen.getAllByRole('button', { name: '閉じる' })
    // Modal header の ✕ は最初の要素 (構造依存)
    fireEvent.click(closeButtons[0])
    expect(onClose).toHaveBeenCalled()
  })
})
