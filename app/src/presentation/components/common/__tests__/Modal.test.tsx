/**
 * Modal.tsx — dialog component の contract test
 *
 * 検証対象 branch:
 * - 基本表示: title / children / footer の有無
 * - role=dialog + aria-modal + aria-labelledby
 * - close button (aria-label="閉じる") click で onClose
 * - backdrop click で onClose (ただし子要素 click は無視)
 * - Escape key で onClose
 * - Focus trap: 初期 focus + Tab / Shift+Tab で内側に閉じこめる
 * - unmount 時に previouslyFocused に focus 復帰
 *
 * Phase 3 Step 3-6: coverage 0% / 8.69% の component 継続。
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect, vi } from 'vitest'
import { ThemeProvider } from 'styled-components'
import { render, screen, fireEvent } from '@testing-library/react'
import type { ReactElement } from 'react'
import { Modal } from '../Modal'
import { darkTheme } from '@/presentation/theme/theme'

function renderWithTheme(ui: ReactElement) {
  return render(ui, {
    wrapper: ({ children }) => <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>,
  })
}

describe('Modal — 基本表示', () => {
  it('title が表示される', () => {
    renderWithTheme(
      <Modal title="設定" onClose={vi.fn()}>
        <div>本文</div>
      </Modal>,
    )
    expect(screen.getByText('設定')).toBeInTheDocument()
  })

  it('children が body に表示される', () => {
    renderWithTheme(
      <Modal title="dialog" onClose={vi.fn()}>
        <p>本文テキスト</p>
      </Modal>,
    )
    expect(screen.getByText('本文テキスト')).toBeInTheDocument()
  })

  it('footer 指定時は表示される', () => {
    renderWithTheme(
      <Modal title="confirm" onClose={vi.fn()} footer={<button>OK</button>}>
        <div>本文</div>
      </Modal>,
    )
    expect(screen.getByRole('button', { name: 'OK' })).toBeInTheDocument()
  })

  it('footer 未指定時は footer 領域が無い', () => {
    renderWithTheme(
      <Modal title="dialog" onClose={vi.fn()}>
        <div>本文</div>
      </Modal>,
    )
    // OK button (footer 内) が無いことで footer 不在を確認
    expect(screen.queryByRole('button', { name: 'OK' })).not.toBeInTheDocument()
  })
})

describe('Modal — accessibility', () => {
  it('role=dialog + aria-modal=true', () => {
    renderWithTheme(
      <Modal title="設定" onClose={vi.fn()}>
        <div>本文</div>
      </Modal>,
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  it('aria-labelledby が title 要素を指している', () => {
    renderWithTheme(
      <Modal title="アクセシビリティテスト" onClose={vi.fn()}>
        <div>本文</div>
      </Modal>,
    )
    const dialog = screen.getByRole('dialog')
    const labelledBy = dialog.getAttribute('aria-labelledby')
    expect(labelledBy).toBeTruthy()
    const titleEl = document.getElementById(labelledBy!)
    expect(titleEl?.textContent).toBe('アクセシビリティテスト')
  })

  it('close button に aria-label="閉じる" が付いている', () => {
    renderWithTheme(
      <Modal title="dialog" onClose={vi.fn()}>
        <div>本文</div>
      </Modal>,
    )
    expect(screen.getByRole('button', { name: '閉じる' })).toBeInTheDocument()
  })
})

describe('Modal — onClose の発火条件', () => {
  it('close button click で onClose が発火する', () => {
    const onClose = vi.fn()
    renderWithTheme(
      <Modal title="dialog" onClose={onClose}>
        <div>本文</div>
      </Modal>,
    )
    fireEvent.click(screen.getByRole('button', { name: '閉じる' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('Escape キーで onClose が発火する', () => {
    const onClose = vi.fn()
    renderWithTheme(
      <Modal title="dialog" onClose={onClose}>
        <div>本文</div>
      </Modal>,
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('Escape 以外のキーでは onClose が発火しない', () => {
    const onClose = vi.fn()
    renderWithTheme(
      <Modal title="dialog" onClose={onClose}>
        <div>本文</div>
      </Modal>,
    )
    fireEvent.keyDown(document, { key: 'Enter' })
    fireEvent.keyDown(document, { key: 'a' })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('backdrop click (target === currentTarget) で onClose 発火', () => {
    const onClose = vi.fn()
    renderWithTheme(
      <Modal title="dialog" onClose={onClose}>
        <div>本文</div>
      </Modal>,
    )
    const backdrop = document.querySelector('[data-modal-backdrop]') as HTMLElement
    expect(backdrop).toBeInTheDocument()
    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('dialog 内部 click (target !== currentTarget) では onClose 発火しない', () => {
    const onClose = vi.fn()
    renderWithTheme(
      <Modal title="dialog" onClose={onClose}>
        <div data-testid="body-content">本文</div>
      </Modal>,
    )
    fireEvent.click(screen.getByTestId('body-content'))
    expect(onClose).not.toHaveBeenCalled()
  })
})

describe('Modal — focus management', () => {
  it('mount 時に最初の focusable 要素 (close button) に focus する', () => {
    renderWithTheme(
      <Modal title="dialog" onClose={vi.fn()}>
        <div>本文</div>
      </Modal>,
    )
    const closeBtn = screen.getByRole('button', { name: '閉じる' })
    expect(document.activeElement).toBe(closeBtn)
  })

  it('focusable 要素が複数ある場合、最初の要素 (close button) が初期 focus', () => {
    renderWithTheme(
      <Modal title="dialog" onClose={vi.fn()} footer={<button>OK</button>}>
        <input placeholder="入力" />
      </Modal>,
    )
    const closeBtn = screen.getByRole('button', { name: '閉じる' })
    // close button (header) が body の input より前にある
    expect(document.activeElement).toBe(closeBtn)
  })

  it('unmount 時に previouslyFocused 要素に focus 復帰する', () => {
    // Render a button that will be focused before opening Modal
    const { unmount: unmountTrigger } = renderWithTheme(<button>opener</button>)
    const opener = screen.getByRole('button', { name: 'opener' })
    opener.focus()
    expect(document.activeElement).toBe(opener)

    // Open modal
    const { unmount } = renderWithTheme(
      <Modal title="dialog" onClose={vi.fn()}>
        <div>本文</div>
      </Modal>,
    )
    // Close button should be focused now
    const closeBtn = screen.getByRole('button', { name: '閉じる' })
    expect(document.activeElement).toBe(closeBtn)

    // Unmount modal
    unmount()
    // Focus should return to opener
    expect(document.activeElement).toBe(opener)

    unmountTrigger()
  })
})

describe('Modal — Tab focus trap', () => {
  it('複数 focusable 要素がある場合、最後の要素で Tab → 最初に戻る', () => {
    renderWithTheme(
      <Modal title="dialog" onClose={vi.fn()} footer={<button>OK</button>}>
        <input placeholder="input1" />
      </Modal>,
    )
    const okBtn = screen.getByRole('button', { name: 'OK' })
    const closeBtn = screen.getByRole('button', { name: '閉じる' })

    // Manually focus the last button
    okBtn.focus()
    expect(document.activeElement).toBe(okBtn)

    // Tab should wrap to first
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(closeBtn)
  })

  it('Shift+Tab で最初の要素 → 最後に wrap', () => {
    renderWithTheme(
      <Modal title="dialog" onClose={vi.fn()} footer={<button>OK</button>}>
        <input placeholder="input1" />
      </Modal>,
    )
    const closeBtn = screen.getByRole('button', { name: '閉じる' })
    const okBtn = screen.getByRole('button', { name: 'OK' })

    // Initial focus on close button (first)
    expect(document.activeElement).toBe(closeBtn)

    // Shift+Tab should wrap to last
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(okBtn)
  })

  it('Tab 以外のキーでは focus trap が作動しない', () => {
    renderWithTheme(
      <Modal title="dialog" onClose={vi.fn()} footer={<button>OK</button>}>
        <div>本文</div>
      </Modal>,
    )
    const closeBtn = screen.getByRole('button', { name: '閉じる' })
    expect(document.activeElement).toBe(closeBtn)

    // Other keys should not move focus
    fireEvent.keyDown(document, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(closeBtn)
  })
})
