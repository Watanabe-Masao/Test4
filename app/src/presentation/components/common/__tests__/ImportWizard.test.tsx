/**
 * ImportWizard.tsx — ImportProgress / ImportSummaryCard の contract test
 *
 * 検証対象 branch (ImportProgress):
 * - stage='idle' → null (何も描画しない)
 * - stage='reading' + progress あり → ProgressSection 表示
 * - stage='validating' / 'saving' / 'done' → ProgressSection なし (StepIndicator のみ)
 * - StepIndicator: 各 stage の state (pending / active / done)
 * - percent 計算: Math.round((current/total)*100)
 *
 * 検証対象 branch (ImportSummaryCard):
 * - successes / failures の件数表示
 * - totalRecords の集計 (ok && rowCount の合計)
 * - 各 FileImportResult の icon (✓ / ✕)
 * - typeName 表示 / rowCount 表示 / error 表示
 * - skippedRows / warnings の詳細表示
 * - onDismiss button click
 *
 * Phase 3 Step 3-14: larger component を狙う (199 行).
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect, vi } from 'vitest'
import { ThemeProvider } from 'styled-components'
import { render, screen, fireEvent } from '@testing-library/react'
import type { ReactElement } from 'react'
import { ImportProgress, ImportSummaryCard } from '../ImportWizard'
import type { ImportStage } from '../ImportWizard'
import { darkTheme } from '@/presentation/theme/theme'
import type { ImportSummary, FileImportResult } from '@/domain/models/ImportResult'

function renderWithTheme(ui: ReactElement) {
  return render(ui, {
    wrapper: ({ children }) => <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>,
  })
}

// ─── ImportProgress tests ──────────────────────────────

describe('ImportProgress — stage filter', () => {
  it("stage='idle' は null を返す (何も描画しない)", () => {
    const { container } = renderWithTheme(<ImportProgress stage="idle" progress={null} />)
    expect(container.textContent).toBe('')
  })

  it("stage='reading' は StepIndicator を描画", () => {
    renderWithTheme(<ImportProgress stage="reading" progress={null} />)
    expect(screen.getByText('ファイル解析中')).toBeInTheDocument()
    // StepIndicator の他の stage 名も表示される
    expect(screen.getByText('データ検証中')).toBeInTheDocument()
    expect(screen.getByText('保存中')).toBeInTheDocument()
    expect(screen.getByText('完了')).toBeInTheDocument()
  })

  it("stage='validating' / 'saving' / 'done' も StepIndicator を描画", () => {
    const stages: ImportStage[] = ['validating', 'saving', 'done']
    for (const stage of stages) {
      const { unmount } = renderWithTheme(<ImportProgress stage={stage} progress={null} />)
      expect(screen.getByText('ファイル解析中')).toBeInTheDocument()
      unmount()
    }
  })
})

describe('ImportProgress — progress display', () => {
  it("stage='reading' + progress あり → ProgressSection が表示される", () => {
    renderWithTheme(
      <ImportProgress stage="reading" progress={{ current: 3, total: 10, filename: 'test.csv' }} />,
    )
    expect(screen.getByText('test.csv')).toBeInTheDocument()
    expect(screen.getByText('3/10')).toBeInTheDocument()
  })

  it("stage='reading' + progress=null → ProgressSection なし", () => {
    renderWithTheme(<ImportProgress stage="reading" progress={null} />)
    expect(screen.queryByText(/\.csv/)).not.toBeInTheDocument()
  })

  it("stage='validating' + progress あり → ProgressSection は読み込み stage のみ表示のため出ない", () => {
    renderWithTheme(
      <ImportProgress
        stage="validating"
        progress={{ current: 5, total: 10, filename: 'test.csv' }}
      />,
    )
    // progress section の実際の表示は reading stage に限定される
    expect(screen.queryByText('5/10')).not.toBeInTheDocument()
  })
})

// ─── ImportSummaryCard tests ──────────────────────────

function makeResult(overrides: Partial<FileImportResult> = {}): FileImportResult {
  return {
    ok: true,
    filename: 'sales.csv',
    type: null,
    typeName: '売上',
    rowCount: 100,
    ...overrides,
  } as FileImportResult
}

function makeSummary(results: FileImportResult[]): ImportSummary {
  const successCount = results.filter((r) => r.ok).length
  const failureCount = results.filter((r) => !r.ok).length
  return { results, successCount, failureCount }
}

describe('ImportSummaryCard — 基本表示', () => {
  it('「インポート結果」タイトルが表示される', () => {
    renderWithTheme(<ImportSummaryCard summary={makeSummary([makeResult()])} onDismiss={vi.fn()} />)
    expect(screen.getByText('インポート結果')).toBeInTheDocument()
  })

  it('success 件数 badge が表示される', () => {
    renderWithTheme(
      <ImportSummaryCard
        summary={makeSummary([makeResult(), makeResult({ filename: 'purchase.csv' })])}
        onDismiss={vi.fn()}
      />,
    )
    expect(screen.getByText(/2 成功/)).toBeInTheDocument()
  })

  it('failure 件数 badge が表示される', () => {
    renderWithTheme(
      <ImportSummaryCard
        summary={makeSummary([makeResult({ ok: false, error: 'エラー' })])}
        onDismiss={vi.fn()}
      />,
    )
    expect(screen.getByText(/1 失敗/)).toBeInTheDocument()
  })

  it('totalRecords 件数 badge が表示される (ok && rowCount の合計)', () => {
    renderWithTheme(
      <ImportSummaryCard
        summary={makeSummary([
          makeResult({ rowCount: 100 }),
          makeResult({ rowCount: 250 }),
          makeResult({ ok: false, rowCount: 999 }), // ok=false なので合計に含まれない
        ])}
        onDismiss={vi.fn()}
      />,
    )
    expect(screen.getByText(/350件/)).toBeInTheDocument()
    // 999 (失敗行) は合計に含まれない
    expect(screen.queryByText(/1,349件/)).not.toBeInTheDocument()
  })

  it('成功行は ✓ icon、失敗行は ✕ icon で表示', () => {
    renderWithTheme(
      <ImportSummaryCard
        summary={makeSummary([
          makeResult({ filename: 'a.csv' }),
          makeResult({ ok: false, filename: 'b.csv', error: 'err' }),
        ])}
        onDismiss={vi.fn()}
      />,
    )
    expect(screen.getByText('✓')).toBeInTheDocument()
    expect(screen.getByText('✕')).toBeInTheDocument()
  })

  it('filename / typeName / rowCount を表示', () => {
    renderWithTheme(
      <ImportSummaryCard
        summary={makeSummary([
          makeResult({ filename: 'sales.csv', typeName: '売上', rowCount: 100 }),
        ])}
        onDismiss={vi.fn()}
      />,
    )
    expect(screen.getByText('sales.csv')).toBeInTheDocument()
    expect(screen.getByText('売上')).toBeInTheDocument()
    expect(screen.getByText('100行')).toBeInTheDocument()
  })

  it('失敗行の error message が表示される', () => {
    renderWithTheme(
      <ImportSummaryCard
        summary={makeSummary([
          makeResult({ ok: false, filename: 'err.csv', error: 'パースエラー' }),
        ])}
        onDismiss={vi.fn()}
      />,
    )
    expect(screen.getByText('パースエラー')).toBeInTheDocument()
  })
})

describe('ImportSummaryCard — skippedRows / warnings', () => {
  it('skippedRows あり → スキップ情報が表示される', () => {
    renderWithTheme(
      <ImportSummaryCard
        summary={makeSummary([
          makeResult({
            filename: 'test.csv',
            skippedRows: ['row1 invalid', 'row2 invalid', 'row3 invalid'],
          }),
        ])}
        onDismiss={vi.fn()}
      />,
    )
    expect(screen.getByText(/3行スキップ/)).toBeInTheDocument()
  })

  it('warnings あり → 警告情報が表示される', () => {
    renderWithTheme(
      <ImportSummaryCard
        summary={makeSummary([
          makeResult({
            filename: 'test.csv',
            warnings: ['ヘッダ形式警告', '0 件結果'],
          }),
        ])}
        onDismiss={vi.fn()}
      />,
    )
    expect(screen.getByText(/ヘッダ形式警告/)).toBeInTheDocument()
    expect(screen.getByText(/0 件結果/)).toBeInTheDocument()
  })

  it('skipped / warnings 共になしなら詳細 row 非表示', () => {
    const { container } = renderWithTheme(
      <ImportSummaryCard summary={makeSummary([makeResult()])} onDismiss={vi.fn()} />,
    )
    expect(container.textContent).not.toMatch(/スキップ/)
    expect(container.textContent).not.toMatch(/ヘッダ形式警告/)
  })
})

describe('ImportSummaryCard — onDismiss', () => {
  it('閉じる button click で onDismiss が発火', () => {
    const onDismiss = vi.fn()
    renderWithTheme(
      <ImportSummaryCard summary={makeSummary([makeResult()])} onDismiss={onDismiss} />,
    )
    fireEvent.click(screen.getByText('閉じる'))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
