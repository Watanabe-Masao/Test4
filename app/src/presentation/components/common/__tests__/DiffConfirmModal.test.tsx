/**
 * DiffConfirmModal.tsx — 差分確認ダイアログの contract test
 *
 * 検証対象 branch:
 * - Summary: totalInsert / totalModify / totalRemove の件数表示
 * - 各 DataTypeDiff の filter (inserts/modifications/removals が 1 つでもあれば section 表示)
 * - DataTypeDiffSection:
 *   - expanded 初期 false
 *   - header click で expanded trigger
 *   - badge: inserts / modifications / removals それぞれの Badge
 *   - 各 section (新規挿入 / 値変更 / 値削除)
 *   - 50 件超過時「...他 N件」表示
 *   - hasConfirmNeeded (modifications or removals > 0) で HelpText 表示
 * - ChangeEntry: insert/modify/remove の値表示形式
 * - action button: cancel / keep-existing / overwrite → onConfirm callback
 * - Modal header ✕ で onConfirm({action:'cancel'})
 *
 * Phase 3 Step 3-15: larger component 戦略継続 (224 行).
 */
import { describe, it, expect, vi } from 'vitest'
import { ThemeProvider } from 'styled-components'
import { render, screen, fireEvent } from '@testing-library/react'
import type { ReactElement } from 'react'
import { DiffConfirmModal } from '../DiffConfirmModal'
import { darkTheme } from '@/presentation/theme/theme'
import type { DiffResult, DataTypeDiff, FieldChange } from '@/domain/models/Persistence'

function renderWithTheme(ui: ReactElement) {
  return render(ui, {
    wrapper: ({ children }) => <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>,
  })
}

function makeChange(overrides: Partial<FieldChange> = {}): FieldChange {
  return {
    storeId: 'store1',
    storeName: '店舗A',
    day: 1,
    fieldPath: 'sales',
    oldValue: 1000,
    newValue: 2000,
    ...overrides,
  }
}

function makeDataTypeDiff(overrides: Partial<DataTypeDiff> = {}): DataTypeDiff {
  return {
    dataType: 'sales',
    dataTypeName: '売上データ',
    inserts: [],
    modifications: [],
    removals: [],
    ...overrides,
  }
}

function makeDiffResult(diffs: DataTypeDiff[]): DiffResult {
  return { diffs, needsConfirmation: true, autoApproved: [] }
}

describe('DiffConfirmModal — Summary 件数表示', () => {
  it('inserts のみなら 新規挿入件数のみ表示', () => {
    renderWithTheme(
      <DiffConfirmModal
        diffResult={makeDiffResult([
          makeDataTypeDiff({
            inserts: [makeChange(), makeChange({ day: 2 }), makeChange({ day: 3 })],
          }),
        ])}
        onConfirm={vi.fn()}
      />,
    )
    expect(screen.getByText(/新規挿入: 3件/)).toBeInTheDocument()
    expect(screen.queryByText(/値変更:/)).not.toBeInTheDocument()
    expect(screen.queryByText(/値削除:/)).not.toBeInTheDocument()
  })

  it('modifications + removals + inserts が混在する場合、全部表示', () => {
    renderWithTheme(
      <DiffConfirmModal
        diffResult={makeDiffResult([
          makeDataTypeDiff({
            inserts: [makeChange()],
            modifications: [makeChange({ day: 2 }), makeChange({ day: 3 })],
            removals: [makeChange({ day: 4 })],
          }),
        ])}
        onConfirm={vi.fn()}
      />,
    )
    expect(screen.getByText(/新規挿入: 1件/)).toBeInTheDocument()
    expect(screen.getByText(/値変更: 2件/)).toBeInTheDocument()
    expect(screen.getByText(/値削除: 1件/)).toBeInTheDocument()
  })

  it('複数の DataTypeDiff で件数が合算される', () => {
    renderWithTheme(
      <DiffConfirmModal
        diffResult={makeDiffResult([
          makeDataTypeDiff({ dataType: 't1', inserts: [makeChange()] }),
          makeDataTypeDiff({
            dataType: 't2',
            inserts: [makeChange(), makeChange()],
          }),
        ])}
        onConfirm={vi.fn()}
      />,
    )
    // 1 + 2 = 3
    expect(screen.getByText(/新規挿入: 3件/)).toBeInTheDocument()
  })
})

describe('DiffConfirmModal — DataTypeDiff section filter', () => {
  it('変更なし (全 empty) の DataTypeDiff は section を描画しない', () => {
    renderWithTheme(
      <DiffConfirmModal
        diffResult={makeDiffResult([
          makeDataTypeDiff({ dataTypeName: '空データ' }), // inserts/modifications/removals empty
        ])}
        onConfirm={vi.fn()}
      />,
    )
    expect(screen.queryByText('空データ')).not.toBeInTheDocument()
  })

  it('inserts のみの DataTypeDiff も section 描画する (filter 通過)', () => {
    renderWithTheme(
      <DiffConfirmModal
        diffResult={makeDiffResult([
          makeDataTypeDiff({ dataTypeName: 'テストデータ', inserts: [makeChange()] }),
        ])}
        onConfirm={vi.fn()}
      />,
    )
    expect(screen.getByText('テストデータ')).toBeInTheDocument()
  })
})

describe('DiffConfirmModal — DataTypeDiffSection expand', () => {
  it('初期は collapsed (change entry 非表示)', () => {
    renderWithTheme(
      <DiffConfirmModal
        diffResult={makeDiffResult([
          makeDataTypeDiff({
            dataTypeName: '売上',
            modifications: [makeChange({ storeName: '店舗X' })],
          }),
        ])}
        onConfirm={vi.fn()}
      />,
    )
    // store name は section 内だけにある (summary 側では出ない)
    expect(screen.queryByText('店舗X')).not.toBeInTheDocument()
  })

  it('header click で展開されて change entry が表示される', () => {
    renderWithTheme(
      <DiffConfirmModal
        diffResult={makeDiffResult([
          makeDataTypeDiff({
            dataTypeName: '売上',
            modifications: [makeChange({ storeName: '店舗Y', day: 5 })],
          }),
        ])}
        onConfirm={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByText('売上'))
    expect(screen.getByText('店舗Y')).toBeInTheDocument()
    expect(screen.getByText('5日')).toBeInTheDocument()
  })

  it('inserts Badge: 件数を表示 (+N)', () => {
    renderWithTheme(
      <DiffConfirmModal
        diffResult={makeDiffResult([
          makeDataTypeDiff({
            inserts: [makeChange(), makeChange(), makeChange({ day: 3 })],
          }),
        ])}
        onConfirm={vi.fn()}
      />,
    )
    expect(screen.getByText('+3')).toBeInTheDocument()
  })

  it('modifications Badge: N変更', () => {
    renderWithTheme(
      <DiffConfirmModal
        diffResult={makeDiffResult([
          makeDataTypeDiff({
            modifications: [makeChange(), makeChange()],
          }),
        ])}
        onConfirm={vi.fn()}
      />,
    )
    expect(screen.getByText('2変更')).toBeInTheDocument()
  })

  it('removals Badge: -N', () => {
    renderWithTheme(
      <DiffConfirmModal
        diffResult={makeDiffResult([
          makeDataTypeDiff({
            removals: [makeChange(), makeChange(), makeChange({ day: 3 }), makeChange({ day: 4 })],
          }),
        ])}
        onConfirm={vi.fn()}
      />,
    )
    expect(screen.getByText('-4')).toBeInTheDocument()
  })

  it('hasConfirmNeeded=true (modifications あり) で HelpText 表示', () => {
    renderWithTheme(
      <DiffConfirmModal
        diffResult={makeDiffResult([
          makeDataTypeDiff({
            modifications: [makeChange()],
          }),
        ])}
        onConfirm={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByText('売上データ'))
    expect(
      screen.getByText(
        /「値変更」「値削除」のある項目は、新規データで上書きするか既存データを維持するか選択できます/,
      ),
    ).toBeInTheDocument()
  })

  it('hasConfirmNeeded=false (inserts のみ) で HelpText 非表示', () => {
    renderWithTheme(
      <DiffConfirmModal
        diffResult={makeDiffResult([
          makeDataTypeDiff({
            inserts: [makeChange()],
          }),
        ])}
        onConfirm={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByText('売上データ'))
    // section の HelpText は modifications/removals がある時のみ出るため、inserts のみだと出ない
    expect(screen.queryByText(/「値変更」「値削除」のある項目は/)).not.toBeInTheDocument()
  })
})

describe('DiffConfirmModal — 50 件超過「...他 N件」', () => {
  it('inserts 51 件の場合「...他 1件」が表示される', () => {
    const manyInserts = Array.from({ length: 51 }, (_, i) =>
      makeChange({ day: i + 1, storeName: `S${i + 1}` }),
    )
    renderWithTheme(
      <DiffConfirmModal
        diffResult={makeDiffResult([makeDataTypeDiff({ inserts: manyInserts })])}
        onConfirm={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByText('売上データ'))
    expect(screen.getByText(/...他 1件/)).toBeInTheDocument()
  })
})

describe('DiffConfirmModal — footer buttons', () => {
  it('キャンセル button click で onConfirm({ action: "cancel" })', () => {
    const onConfirm = vi.fn()
    renderWithTheme(
      <DiffConfirmModal
        diffResult={makeDiffResult([makeDataTypeDiff({ inserts: [makeChange()] })])}
        onConfirm={onConfirm}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }))
    expect(onConfirm).toHaveBeenCalledWith({ action: 'cancel' })
  })

  it('既存を維持 button click で onConfirm({ action: "keep-existing" })', () => {
    const onConfirm = vi.fn()
    renderWithTheme(
      <DiffConfirmModal
        diffResult={makeDiffResult([makeDataTypeDiff({ inserts: [makeChange()] })])}
        onConfirm={onConfirm}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: '既存を維持' }))
    expect(onConfirm).toHaveBeenCalledWith({ action: 'keep-existing' })
  })

  it('新規データで上書き button click で onConfirm({ action: "overwrite" })', () => {
    const onConfirm = vi.fn()
    renderWithTheme(
      <DiffConfirmModal
        diffResult={makeDiffResult([makeDataTypeDiff({ inserts: [makeChange()] })])}
        onConfirm={onConfirm}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: '新規データで上書き' }))
    expect(onConfirm).toHaveBeenCalledWith({ action: 'overwrite' })
  })

  it('Modal header ✕ click も cancel action を発火', () => {
    const onConfirm = vi.fn()
    renderWithTheme(
      <DiffConfirmModal
        diffResult={makeDiffResult([makeDataTypeDiff({ inserts: [makeChange()] })])}
        onConfirm={onConfirm}
      />,
    )
    // header の aria-label=閉じる の ✕
    const closeButtons = screen.getAllByRole('button', { name: '閉じる' })
    fireEvent.click(closeButtons[0])
    expect(onConfirm).toHaveBeenCalledWith({ action: 'cancel' })
  })
})
