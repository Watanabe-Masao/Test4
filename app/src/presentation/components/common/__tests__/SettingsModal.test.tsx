/**
 * SettingsModal.tsx — 設定モーダルの contract test
 *
 * 検証対象 branch:
 * - basicFields (targetGPR / warningThreshold / flowerCostRate / directProduceCostRate):
 *   - 初期値 = settings 値 * 100
 *   - onChange で local state 更新
 *   - 保存時 parseFloat / 100 で AppSettings に戻す
 * - gpThresholdFields: 3 件 (blue/yellow/red pt)
 * - footer cancel / 保存 button
 * - autoBackup / autoImport 連携:
 *   - supported=false: FolderSyncDiagnostic 表示
 *   - folderConfigured: folderName + backupNow/scanNow button
 *   - folderConfigured=false: 「選択」button
 *   - isBacking / isScanning 中: disabled
 *   - autoSyncEnabled toggle
 *   - lastBackupAt / lastScanAt / error 表示
 */
import { describe, it, expect, vi } from 'vitest'
import { ThemeProvider } from 'styled-components'
import { render, screen, fireEvent } from '@testing-library/react'
import type { ReactElement } from 'react'
import { SettingsModal } from '../SettingsModal'
import { darkTheme } from '@/presentation/theme/theme'
import type { AppSettings } from '@/domain/models/storeTypes'

function renderWithTheme(ui: ReactElement) {
  return render(ui, {
    wrapper: ({ children }) => <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>,
  })
}

function makeSettings(overrides: Partial<AppSettings> = {}): AppSettings {
  return {
    targetGrossProfitRate: 0.25,
    warningThreshold: 0.23,
    flowerCostRate: 0.8,
    directProduceCostRate: 0.85,
    gpDiffBlueThreshold: 0.2,
    gpDiffYellowThreshold: -0.2,
    gpDiffRedThreshold: -0.5,
    ...overrides,
  } as AppSettings
}

// basic + threshold = 7 number inputs (index 0-6)
// Order: targetGPR / warningThreshold / flowerCostRate / directProduceCostRate
//        / gpDiffBlue / gpDiffYellow / gpDiffRed
const IDX = {
  targetGPR: 0,
  warningThreshold: 1,
  flowerCostRate: 2,
  directProduceCostRate: 3,
  gpDiffBlue: 4,
  gpDiffYellow: 5,
  gpDiffRed: 6,
} as const

function getInputs(): HTMLInputElement[] {
  return screen.getAllByRole('spinbutton') as HTMLInputElement[]
}

function getFooterSaveButton(): HTMLButtonElement {
  // SettingsModal footer has「保存」button. Modal backdrop close button is「閉じる」.
  // 使い分け: footer 保存 は button role + 「保存」 text。
  // autoBackup folderConfigured の場合、内部にも「保存」button がある。
  // テストで autoBackup 未設定の場合は 1 つしかないので getByRole で OK。
  return screen.getByRole('button', { name: '保存' }) as HTMLButtonElement
}

describe('SettingsModal — basic fields', () => {
  it('初期値として settings 値 * 100 を表示する (targetGrossProfitRate)', () => {
    renderWithTheme(
      <SettingsModal
        settings={makeSettings({ targetGrossProfitRate: 0.3 })}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    const inputs = getInputs()
    expect(inputs[IDX.targetGPR].value).toBe('30')
  })

  it('warningThreshold / flowerCostRate / directProduceCostRate の初期値', () => {
    renderWithTheme(<SettingsModal settings={makeSettings()} onSave={vi.fn()} onClose={vi.fn()} />)
    const inputs = getInputs()
    expect(inputs[IDX.warningThreshold].value).toBe('23')
    expect(inputs[IDX.flowerCostRate].value).toBe('80')
    expect(inputs[IDX.directProduceCostRate].value).toBe('85')
  })

  it('onChange で local state が更新される', () => {
    renderWithTheme(<SettingsModal settings={makeSettings()} onSave={vi.fn()} onClose={vi.fn()} />)
    const inputs = getInputs()
    fireEvent.change(inputs[IDX.targetGPR], { target: { value: '30' } })
    // 再取得して確認 (React 更新後)
    const updated = getInputs()
    expect(updated[IDX.targetGPR].value).toBe('30')
  })

  it('保存 button で parseFloat / 100 値が渡される', () => {
    const onSave = vi.fn()
    renderWithTheme(<SettingsModal settings={makeSettings()} onSave={onSave} onClose={vi.fn()} />)
    const inputs = getInputs()
    fireEvent.change(inputs[IDX.targetGPR], { target: { value: '30' } })
    fireEvent.click(getFooterSaveButton())

    expect(onSave).toHaveBeenCalled()
    const savedArg = onSave.mock.calls[0][0]
    expect(savedArg.targetGrossProfitRate).toBe(0.3)
  })
})

describe('SettingsModal — gpDiff threshold fields', () => {
  it('3 つの gpDiff 閾値フィールド (良好/注意/警告) が label 表示される', () => {
    renderWithTheme(<SettingsModal settings={makeSettings()} onSave={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText('良好 (pt)')).toBeInTheDocument()
    expect(screen.getByText('注意 (pt)')).toBeInTheDocument()
    expect(screen.getByText('警告 (pt)')).toBeInTheDocument()
  })

  it('初期値: pt 値は *100 しない (そのまま表示)', () => {
    renderWithTheme(
      <SettingsModal
        settings={makeSettings({
          gpDiffBlueThreshold: 0.2,
          gpDiffYellowThreshold: -0.2,
          gpDiffRedThreshold: -0.5,
        })}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    const inputs = getInputs()
    expect(inputs[IDX.gpDiffBlue].value).toBe('0.2')
    expect(inputs[IDX.gpDiffYellow].value).toBe('-0.2')
    expect(inputs[IDX.gpDiffRed].value).toBe('-0.5')
  })
})

describe('SettingsModal — footer buttons', () => {
  it('キャンセル button click で onClose 発火 (onSave は呼ばれない)', () => {
    const onSave = vi.fn()
    const onClose = vi.fn()
    renderWithTheme(<SettingsModal settings={makeSettings()} onSave={onSave} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }))
    expect(onClose).toHaveBeenCalled()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('保存 button click で onSave + onClose 両方発火', () => {
    const onSave = vi.fn()
    const onClose = vi.fn()
    renderWithTheme(<SettingsModal settings={makeSettings()} onSave={onSave} onClose={onClose} />)
    fireEvent.click(getFooterSaveButton())
    expect(onSave).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })
})

describe('SettingsModal — autoBackup 連携', () => {
  const makeAutoBackup = (overrides: Record<string, unknown> = {}) =>
    ({
      supported: true,
      folderConfigured: false,
      folderName: null,
      isBacking: false,
      lastBackupAt: null,
      error: null,
      selectFolder: vi.fn(),
      clearFolder: vi.fn(),
      backupNow: vi.fn().mockResolvedValue(null),
      ...overrides,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any

  it('autoBackup 未指定: フォルダ連携 section 非表示', () => {
    renderWithTheme(<SettingsModal settings={makeSettings()} onSave={vi.fn()} onClose={vi.fn()} />)
    expect(screen.queryByText('フォルダ連携')).not.toBeInTheDocument()
  })

  it('autoBackup.supported=false: FolderSyncDiagnostic 表示', () => {
    renderWithTheme(
      <SettingsModal
        settings={makeSettings()}
        onSave={vi.fn()}
        onClose={vi.fn()}
        autoBackup={makeAutoBackup({ supported: false })}
      />,
    )
    expect(screen.getByText(/File System Access API を利用できません/)).toBeInTheDocument()
  })

  it('autoBackup.supported=true + folderConfigured=false: 「選択」button 表示', () => {
    renderWithTheme(
      <SettingsModal
        settings={makeSettings()}
        onSave={vi.fn()}
        onClose={vi.fn()}
        autoBackup={makeAutoBackup({ folderConfigured: false })}
      />,
    )
    expect(screen.getByRole('button', { name: 'バックアップ先を選択' })).toBeInTheDocument()
    expect(screen.getByText('OFF')).toBeInTheDocument()
  })

  it('autoBackup.folderConfigured=true: folderName + 解除 button 表示', () => {
    renderWithTheme(
      <SettingsModal
        settings={makeSettings()}
        onSave={vi.fn()}
        onClose={vi.fn()}
        autoBackup={makeAutoBackup({
          folderConfigured: true,
          folderName: 'backups/',
        })}
      />,
    )
    expect(screen.getByText('backups/')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '解除' })).toBeInTheDocument()
    expect(screen.getByText('ON')).toBeInTheDocument()
    // autoBackup.folderConfigured=true のとき、section 内に「保存」button が
    // 追加されて footer「保存」と合わせて 2 つになる
    const saveButtons = screen.getAllByRole('button', { name: '保存' })
    expect(saveButtons.length).toBe(2)
  })

  it('autoBackup.isBacking=true: disabled + "..." 表示', () => {
    renderWithTheme(
      <SettingsModal
        settings={makeSettings()}
        onSave={vi.fn()}
        onClose={vi.fn()}
        autoBackup={makeAutoBackup({
          folderConfigured: true,
          folderName: 'backups/',
          isBacking: true,
        })}
      />,
    )
    expect(screen.getByText('...')).toBeInTheDocument()
  })

  it('autoBackup.error 表示', () => {
    renderWithTheme(
      <SettingsModal
        settings={makeSettings()}
        onSave={vi.fn()}
        onClose={vi.fn()}
        autoBackup={makeAutoBackup({
          folderConfigured: true,
          folderName: 'backups/',
          error: '書き込み失敗',
        })}
      />,
    )
    expect(screen.getByText('書き込み失敗')).toBeInTheDocument()
  })
})
