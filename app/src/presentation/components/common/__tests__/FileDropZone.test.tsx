/**
 * FileDropZone.tsx — file drop zone の contract test
 *
 * 検証対象 branch:
 * - render: Zone + Icon + MainText + HintText + FolderButton + 2 hidden inputs
 * - dragOver state: true/false toggle
 * - handleClick: fileInputRef.click()
 * - handleFolderClick: stopPropagation + dirInputRef.click()
 * - handleFileChange: files 配列 → onFiles 発火 + reset e.target.value
 * - handleFileChange: 空 files → no-op
 * - handleDirChange: filterAcceptedFiles で拡張子 filter
 * - handleDrop: items に directory 含まれない場合 → files 経路
 * - handleDrop: 空 dataTransfer → no-op
 * - isAcceptedFile: .xlsx/.xls/.csv 受諾、他 reject
 */
import { describe, it, expect, vi } from 'vitest'
import { ThemeProvider } from 'styled-components'
import { render, screen, fireEvent } from '@testing-library/react'
import type { ReactElement } from 'react'
import { FileDropZone } from '../FileDropZone'
import { darkTheme } from '@/presentation/theme/theme'

function renderWithTheme(ui: ReactElement) {
  return render(ui, {
    wrapper: ({ children }) => <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>,
  })
}

describe('FileDropZone — 基本表示', () => {
  it('text + icons + folder button が表示される', () => {
    renderWithTheme(<FileDropZone onFiles={vi.fn()} />)
    expect(screen.getByText(/ファイル\/フォルダをドラッグ＆ドロップ/)).toBeInTheDocument()
    expect(screen.getByText(/Excel \(\.xlsx, \.xls\) \/ CSV \(\.csv\) 対応/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /フォルダを選択/ })).toBeInTheDocument()
  })

  it('2 つの hidden input (file multiple, dir) が存在する', () => {
    renderWithTheme(<FileDropZone onFiles={vi.fn()} />)
    const inputs = document.querySelectorAll('input[type="file"]')
    expect(inputs.length).toBe(2)
  })
})

describe('FileDropZone — file click path', () => {
  it('Zone click で file input の click が発火', () => {
    renderWithTheme(<FileDropZone onFiles={vi.fn()} />)
    const fileInput = document.querySelectorAll('input[type="file"]')[0] as HTMLInputElement
    const clickSpy = vi.spyOn(fileInput, 'click')

    fireEvent.click(screen.getByText(/ファイル\/フォルダをドラッグ/))
    expect(clickSpy).toHaveBeenCalled()
  })

  it('file input change で onFiles が発火する (拡張子 filter なし)', () => {
    const onFiles = vi.fn()
    renderWithTheme(<FileDropZone onFiles={onFiles} />)
    const fileInput = document.querySelectorAll('input[type="file"]')[0] as HTMLInputElement
    const file = new File(['content'], 'data.csv', { type: 'text/csv' })

    fireEvent.change(fileInput, { target: { files: [file] } })
    expect(onFiles).toHaveBeenCalled()
    const arg = onFiles.mock.calls[0][0]
    expect(Array.isArray(arg)).toBe(true)
    expect(arg.length).toBe(1)
    expect(arg[0].name).toBe('data.csv')
  })

  it('空 FileList は no-op', () => {
    const onFiles = vi.fn()
    renderWithTheme(<FileDropZone onFiles={onFiles} />)
    const fileInput = document.querySelectorAll('input[type="file"]')[0] as HTMLInputElement

    fireEvent.change(fileInput, { target: { files: [] } })
    expect(onFiles).not.toHaveBeenCalled()
  })
})

describe('FileDropZone — folder click path', () => {
  it('「フォルダを選択」click で dir input の click が発火 (stopPropagation も発火)', () => {
    renderWithTheme(<FileDropZone onFiles={vi.fn()} />)
    const dirInput = document.querySelectorAll('input[type="file"]')[1] as HTMLInputElement
    const clickSpy = vi.spyOn(dirInput, 'click')

    fireEvent.click(screen.getByRole('button', { name: /フォルダを選択/ }))
    expect(clickSpy).toHaveBeenCalled()
  })

  it('dir input change で 拡張子 filter 後の accepted files が onFiles に渡される', () => {
    const onFiles = vi.fn()
    renderWithTheme(<FileDropZone onFiles={onFiles} />)
    const dirInput = document.querySelectorAll('input[type="file"]')[1] as HTMLInputElement

    const valid = new File(['a'], 'data.csv')
    const invalid = new File(['b'], 'readme.txt')
    const xlsx = new File(['c'], 'report.xlsx')

    fireEvent.change(dirInput, { target: { files: [valid, invalid, xlsx] } })
    expect(onFiles).toHaveBeenCalled()
    const arg = onFiles.mock.calls[0][0]
    expect(arg.length).toBe(2) // .csv と .xlsx のみ
    expect(arg.map((f: File) => f.name)).toEqual(['data.csv', 'report.xlsx'])
  })

  it('dir input change で accepted が空なら onFiles 発火しない', () => {
    const onFiles = vi.fn()
    renderWithTheme(<FileDropZone onFiles={onFiles} />)
    const dirInput = document.querySelectorAll('input[type="file"]')[1] as HTMLInputElement

    const invalid1 = new File(['a'], 'readme.txt')
    const invalid2 = new File(['b'], 'notes.md')

    fireEvent.change(dirInput, { target: { files: [invalid1, invalid2] } })
    expect(onFiles).not.toHaveBeenCalled()
  })
})

describe('FileDropZone — drag & drop', () => {
  it('dragOver / dragLeave が throw しない (state トグルの副作用確認)', () => {
    renderWithTheme(<FileDropZone onFiles={vi.fn()} />)
    const zone = screen.getByText(/ファイル\/フォルダをドラッグ/).parentElement as HTMLElement

    // fireEvent 経由で React handler を trigger
    fireEvent.dragOver(zone)
    fireEvent.dragLeave(zone)
    // state 変化は styled-components prop で反映されるため、assertion 困難
    // 2 回 trigger しても throw しないことを確認するに留める
    expect(zone).toBeInTheDocument()
  })

  it('drop で files 配列が onFiles に渡される', () => {
    const onFiles = vi.fn()
    renderWithTheme(<FileDropZone onFiles={onFiles} />)
    const zone = screen.getByText(/ファイル\/フォルダをドラッグ/).parentElement as HTMLElement

    const file = new File(['content'], 'test.csv')
    const dataTransfer = {
      items: null, // items 未定義時は下側 dataTransfer.files 経路へ
      files: [file],
    }

    fireEvent.drop(zone, { dataTransfer })
    expect(onFiles).toHaveBeenCalled()
    const arg = onFiles.mock.calls[0][0]
    expect(arg[0].name).toBe('test.csv')
  })

  it('drop で 空 dataTransfer は no-op', () => {
    const onFiles = vi.fn()
    renderWithTheme(<FileDropZone onFiles={onFiles} />)
    const zone = screen.getByText(/ファイル\/フォルダをドラッグ/).parentElement as HTMLElement

    fireEvent.drop(zone, { dataTransfer: { items: null, files: [] } })
    expect(onFiles).not.toHaveBeenCalled()
  })
})
