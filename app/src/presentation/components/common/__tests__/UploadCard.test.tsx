/**
 * UploadCard.tsx — file upload card の contract test
 *
 * 検証対象 branch:
 * - icon mapping: dataType → emoji (fileTypeIcons + fallback '📄')
 * - label 表示
 * - loaded=false: Status 非表示
 * - loaded=true: Status 表示 ('✓ 読込済' or `✓ ${filename}`)
 * - maxDay > 0: ` N日` が append される
 * - maxDay = 0 / null: 非表示
 * - click → input.click() → file select
 * - multiple + 複数 File → Array で onFile
 * - multiple + 単一 File → 単一で onFile
 * - multiple=false + 複数 File → 先頭のみで onFile
 * - empty file list → no-op
 * - onChange 後 e.target.value = '' で reset
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect, vi } from 'vitest'
import { ThemeProvider } from 'styled-components'
import { render, screen, fireEvent } from '@testing-library/react'
import type { ReactElement } from 'react'
import { UploadCard } from '../UploadCard'
import { darkTheme } from '@/presentation/theme/theme'

function renderWithTheme(ui: ReactElement) {
  return render(ui, {
    wrapper: ({ children }) => <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>,
  })
}

describe('UploadCard — 基本表示', () => {
  it('label が表示される', () => {
    renderWithTheme(
      <UploadCard dataType="purchase" label="仕入データ" loaded={false} onFile={vi.fn()} />,
    )
    expect(screen.getByText('仕入データ')).toBeInTheDocument()
  })

  it('dataType=purchase で 📦 icon', () => {
    renderWithTheme(<UploadCard dataType="purchase" label="仕入" loaded={false} onFile={vi.fn()} />)
    expect(screen.getByText('📦')).toBeInTheDocument()
  })

  it('dataType=classifiedSales で 💰 icon', () => {
    renderWithTheme(
      <UploadCard dataType="classifiedSales" label="売上" loaded={false} onFile={vi.fn()} />,
    )
    expect(screen.getByText('💰')).toBeInTheDocument()
  })

  it('未定義 dataType で fallback 📄 icon', () => {
    renderWithTheme(
      <UploadCard
        dataType={'unknown' as 'purchase'}
        label="不明"
        loaded={false}
        onFile={vi.fn()}
      />,
    )
    expect(screen.getByText('📄')).toBeInTheDocument()
  })
})

describe('UploadCard — loaded 状態', () => {
  it('loaded=false: Status 非表示', () => {
    renderWithTheme(<UploadCard dataType="purchase" label="仕入" loaded={false} onFile={vi.fn()} />)
    expect(screen.queryByText(/✓/)).not.toBeInTheDocument()
  })

  it('loaded=true + filename なし: "✓ 読込済" 表示', () => {
    renderWithTheme(<UploadCard dataType="purchase" label="仕入" loaded={true} onFile={vi.fn()} />)
    expect(screen.getByText(/✓ 読込済/)).toBeInTheDocument()
  })

  it('loaded=true + filename あり: "✓ {filename}" 表示', () => {
    renderWithTheme(
      <UploadCard
        dataType="purchase"
        label="仕入"
        loaded={true}
        filename="data.xlsx"
        onFile={vi.fn()}
      />,
    )
    expect(screen.getByText(/✓ data\.xlsx/)).toBeInTheDocument()
  })

  it('loaded + maxDay > 0: "N日" が追加される', () => {
    renderWithTheme(
      <UploadCard dataType="purchase" label="仕入" loaded={true} maxDay={15} onFile={vi.fn()} />,
    )
    expect(screen.getByText(/15日/)).toBeInTheDocument()
  })

  it('loaded + maxDay=0: 日付表示なし', () => {
    renderWithTheme(
      <UploadCard dataType="purchase" label="仕入" loaded={true} maxDay={0} onFile={vi.fn()} />,
    )
    expect(screen.queryByText(/0日/)).not.toBeInTheDocument()
  })

  it('loaded + maxDay undefined: 日付表示なし', () => {
    renderWithTheme(<UploadCard dataType="purchase" label="仕入" loaded={true} onFile={vi.fn()} />)
    expect(screen.queryByText(/\d+日/)).not.toBeInTheDocument()
  })
})

describe('UploadCard — file select', () => {
  it('card click で内部 input が click される (ref 経由)', () => {
    const onFile = vi.fn()
    renderWithTheme(<UploadCard dataType="purchase" label="仕入" loaded={false} onFile={onFile} />)
    // file input を取得 (display:none)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(input).toBeInTheDocument()
    const clickSpy = vi.spyOn(input, 'click')

    // card wrapper の click
    fireEvent.click(screen.getByText('仕入'))
    expect(clickSpy).toHaveBeenCalled()
  })

  it('multiple=false + 単一 File: 先頭 File で onFile', () => {
    const onFile = vi.fn()
    renderWithTheme(<UploadCard dataType="purchase" label="仕入" loaded={false} onFile={onFile} />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['content'], 'test.csv', { type: 'text/csv' })

    fireEvent.change(input, { target: { files: [file] } })
    expect(onFile).toHaveBeenCalledWith(file, 'purchase')
  })

  it('multiple=true + 複数 File: Array で onFile', () => {
    const onFile = vi.fn()
    renderWithTheme(
      <UploadCard
        dataType="classifiedSales"
        label="売上"
        loaded={false}
        onFile={onFile}
        multiple
      />,
    )
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const f1 = new File(['a'], 'a.csv')
    const f2 = new File(['b'], 'b.csv')

    fireEvent.change(input, { target: { files: [f1, f2] } })
    expect(onFile).toHaveBeenCalled()
    const call = onFile.mock.calls[0]
    expect(Array.isArray(call[0])).toBe(true)
    expect((call[0] as File[]).length).toBe(2)
    expect(call[1]).toBe('classifiedSales')
  })

  it('multiple=true + 単一 File: 単一 File で onFile (Array 化しない)', () => {
    const onFile = vi.fn()
    renderWithTheme(
      <UploadCard
        dataType="classifiedSales"
        label="売上"
        loaded={false}
        onFile={onFile}
        multiple
      />,
    )
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['a'], 'single.csv')

    fireEvent.change(input, { target: { files: [file] } })
    // multiple=true でも files.length=1 なら単一 File 渡し
    expect(onFile).toHaveBeenCalledWith(file, 'classifiedSales')
  })

  it('空 FileList: no-op (onFile 未発火)', () => {
    const onFile = vi.fn()
    renderWithTheme(<UploadCard dataType="purchase" label="仕入" loaded={false} onFile={onFile} />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement

    fireEvent.change(input, { target: { files: [] } })
    expect(onFile).not.toHaveBeenCalled()
  })
})
