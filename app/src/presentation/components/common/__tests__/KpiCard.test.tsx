/**
 * KpiCard.tsx — display component の contract test
 *
 * 検証対象 branch:
 * - onClick 有 / 無 (button role, aria-label, keyboard handler)
 * - badge: 'actual' / 'estimated' / 無
 * - warning: severity / displayMode との組み合わせ
 * - isReference / displayMode = 'reference'
 * - displayMode = 'hidden' (value を — に置換)
 * - trend: up / down / flat (記号表示)
 * - subText / formulaSummary の表示有無
 * - keyboard: Enter / Space で onClick が発火
 *
 * Phase 3 Step 3-4: coverage 0% の display component を狙う戦略の一環。
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect, vi } from 'vitest'
import { ThemeProvider } from 'styled-components'
import { render, screen, fireEvent } from '@testing-library/react'
import type { ReactElement } from 'react'
import { KpiCard } from '../KpiCard'
import { darkTheme } from '@/presentation/theme/theme'

function renderWithTheme(ui: ReactElement) {
  return render(ui, {
    wrapper: ({ children }) => <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>,
  })
}

describe('KpiCard — 基本表示', () => {
  it('label と value が表示される', () => {
    renderWithTheme(<KpiCard label="売上" value="¥1,000,000" />)
    expect(screen.getByText('売上')).toBeInTheDocument()
    expect(screen.getByText('¥1,000,000')).toBeInTheDocument()
  })

  it('subText を渡すと表示される', () => {
    renderWithTheme(<KpiCard label="予算" value="¥500,000" subText="先月: ¥450,000" />)
    expect(screen.getByText('先月: ¥450,000')).toBeInTheDocument()
  })

  it('subText 未指定なら subText DOM は存在しない', () => {
    renderWithTheme(<KpiCard label="客数" value="100" />)
    expect(screen.queryByText(/先月/)).not.toBeInTheDocument()
  })

  it('formulaSummary を渡すと表示される', () => {
    renderWithTheme(<KpiCard label="粗利" value="¥300,000" formulaSummary="売上 − 売上原価" />)
    expect(screen.getByText('売上 − 売上原価')).toBeInTheDocument()
  })
})

describe('KpiCard — onClick (clickable mode)', () => {
  it('onClick 指定時は role=button + aria-label + 「根拠」hint が表示される', () => {
    const onClick = vi.fn()
    renderWithTheme(<KpiCard label="売上" value="¥1,000" onClick={onClick} />)

    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-label', '売上: ¥1,000 - 算出根拠を表示')
    expect(screen.getByText('根拠')).toBeInTheDocument()
  })

  it('onClick クリックでハンドラが呼ばれる', () => {
    const onClick = vi.fn()
    renderWithTheme(<KpiCard label="売上" value="¥1,000" onClick={onClick} />)

    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('Enter キーで onClick が発火する', () => {
    const onClick = vi.fn()
    renderWithTheme(<KpiCard label="売上" value="¥1,000" onClick={onClick} />)

    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' })
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('Space キーで onClick が発火する', () => {
    const onClick = vi.fn()
    renderWithTheme(<KpiCard label="売上" value="¥1,000" onClick={onClick} />)

    fireEvent.keyDown(screen.getByRole('button'), { key: ' ' })
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('Tab キーでは onClick が発火しない', () => {
    const onClick = vi.fn()
    renderWithTheme(<KpiCard label="売上" value="¥1,000" onClick={onClick} />)

    fireEvent.keyDown(screen.getByRole('button'), { key: 'Tab' })
    expect(onClick).not.toHaveBeenCalled()
  })

  it('onClick 未指定時は role=button にならず「根拠」hint も表示されない', () => {
    renderWithTheme(<KpiCard label="売上" value="¥1,000" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByText('根拠')).not.toBeInTheDocument()
  })
})

describe('KpiCard — badge (actual / estimated)', () => {
  it("badge='actual' は在庫法 badge を表示する", () => {
    renderWithTheme(<KpiCard label="粗利" value="¥300,000" badge="actual" />)
    // badge 内の label は GROSS_PROFIT_LABELS.inventoryBadge から来る
    // badge DOM 自体の存在を確認 (テキスト依存を避けるため title 属性で識別)
    const allElements = document.querySelectorAll('[title]')
    const inventoryBadge = Array.from(allElements).find((el) =>
      (el.getAttribute('title') ?? '').includes('在庫'),
    )
    expect(inventoryBadge).toBeDefined()
  })

  it("badge='estimated' は推定法 badge を表示する", () => {
    renderWithTheme(<KpiCard label="粗利" value="¥300,000" badge="estimated" />)
    const allElements = document.querySelectorAll('[title]')
    const estimatedBadge = Array.from(allElements).find((el) =>
      (el.getAttribute('title') ?? '').includes('推定'),
    )
    expect(estimatedBadge).toBeDefined()
  })

  it('badge 未指定時は MethodBadge が表示されない', () => {
    renderWithTheme(<KpiCard label="売上" value="¥1,000" />)
    const allElements = document.querySelectorAll('[title]')
    const inventoryBadge = Array.from(allElements).find((el) =>
      (el.getAttribute('title') ?? '').includes('在庫'),
    )
    expect(inventoryBadge).toBeUndefined()
  })
})

describe('KpiCard — trend', () => {
  it("trend.direction='up' で ↑ + label が表示される", () => {
    renderWithTheme(
      <KpiCard label="売上" value="¥1,000" trend={{ direction: 'up', label: '達成' }} />,
    )
    expect(screen.getByText(/↑/)).toBeInTheDocument()
    expect(screen.getByText(/達成/)).toBeInTheDocument()
  })

  it("trend.direction='down' で ↓ + label が表示される", () => {
    renderWithTheme(
      <KpiCard label="売上" value="¥1,000" trend={{ direction: 'down', label: '要注意' }} />,
    )
    expect(screen.getByText(/↓/)).toBeInTheDocument()
    expect(screen.getByText(/要注意/)).toBeInTheDocument()
  })

  it("trend.direction='flat' で → + label が表示される", () => {
    renderWithTheme(
      <KpiCard label="売上" value="¥1,000" trend={{ direction: 'flat', label: '進行中' }} />,
    )
    expect(screen.getByText(/→/)).toBeInTheDocument()
    expect(screen.getByText(/進行中/)).toBeInTheDocument()
  })

  it('trend 未指定時は TrendBadge が表示されない', () => {
    renderWithTheme(<KpiCard label="売上" value="¥1,000" />)
    expect(screen.queryByText(/↑|↓|→/)).not.toBeInTheDocument()
  })
})

describe('KpiCard — displayMode', () => {
  it("displayMode='hidden' のとき value は — に置換される", () => {
    renderWithTheme(<KpiCard label="粗利" value="¥300,000" displayMode="hidden" />)
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.queryByText('¥300,000')).not.toBeInTheDocument()
  })

  it("displayMode='hidden' のとき trend も非表示", () => {
    renderWithTheme(
      <KpiCard
        label="粗利"
        value="¥300,000"
        displayMode="hidden"
        trend={{ direction: 'up', label: '達成' }}
      />,
    )
    expect(screen.queryByText(/↑/)).not.toBeInTheDocument()
    expect(screen.queryByText(/達成/)).not.toBeInTheDocument()
  })

  it("displayMode='reference' で参考値 badge が表示される (warning なしのとき)", () => {
    renderWithTheme(<KpiCard label="粗利率" value="30%" displayMode="reference" />)
    expect(screen.getByText('参考値')).toBeInTheDocument()
  })

  it('isReference=true でも 参考値 badge が表示される', () => {
    renderWithTheme(<KpiCard label="粗利率" value="30%" isReference />)
    expect(screen.getByText('参考値')).toBeInTheDocument()
  })
})

describe('KpiCard — warning', () => {
  it('warning を渡すと WarningBadge が表示される', () => {
    renderWithTheme(
      <KpiCard
        label="粗利"
        value="¥300,000"
        warning={{
          severity: 'warning',
          label: '要確認',
          message: '前年比 -20%',
        }}
      />,
    )
    expect(screen.getByText('要確認')).toBeInTheDocument()
  })

  it("displayMode='hidden' のとき warning badge は非表示", () => {
    renderWithTheme(
      <KpiCard
        label="粗利"
        value="¥300,000"
        displayMode="hidden"
        warning={{
          severity: 'warning',
          label: '要確認',
          message: '前年比 -20%',
        }}
      />,
    )
    expect(screen.queryByText('要確認')).not.toBeInTheDocument()
  })

  it('warning と isReference の両方を渡すと warning badge が優先表示 (参考値 badge は表示されない)', () => {
    renderWithTheme(
      <KpiCard
        label="粗利"
        value="¥300,000"
        isReference
        warning={{
          severity: 'warning',
          label: '要確認',
          message: '前年比 -20%',
        }}
      />,
    )
    expect(screen.getByText('要確認')).toBeInTheDocument()
    expect(screen.queryByText('参考値')).not.toBeInTheDocument()
  })
})
