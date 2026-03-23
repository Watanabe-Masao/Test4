import { useState, useCallback, useRef } from 'react'
import { useStorageAdmin } from '@/application/hooks/data'
import { useStoragePersistence } from '@/application/hooks/useStoragePersistence'
import { useBackup, type BackupMeta } from '@/application/hooks/useBackup'
import { useDataRecovery } from '@/application/hooks/useDataRecovery'
import { useRepository } from '@/application/context/useRepository'
import { useDuckDB } from '@/application/hooks/useDuckDB'
import { useDataStore } from '@/application/stores/dataStore'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { useDeviceSync } from '@/application/hooks/useDeviceSync'
import { RawDataViewer, CTSViewer } from './StorageDataViewers'
import { useMonthDataManagement } from './useMonthDataManagement'
import { ClearAllDataSection } from './ClearAllDataSection'
import {
  Section,
  SectionTitle,
  HelpText,
  EmptyState,
  LoadingText,
  MonthCardGrid,
  MonthCard,
  MonthCardHeader,
  MonthLabel,
  MonthTitle,
  MonthBadge,
  HeaderActions,
  ExpandIcon,
  DeleteButton,
  DetailPanel,
  DataTypeGrid,
  DataTypeRow,
  DataTypeLabel,
  DataTypeCount,
  ConfirmOverlay,
  ConfirmDialog,
  ConfirmTitle,
  ConfirmMessage,
  ConfirmActions,
  CancelButton,
  ConfirmDeleteButton,
  ConfirmDetail,
  ConfirmDetailRow,
  ConfirmWarning,
  GovernanceSummary,
  GovernanceRow,
  GovernanceIcon,
  GovernanceText,
  GovernanceStat,
  GovernanceStatValue,
  GovernanceStatLabel,
  ProgressBarOuter,
  ProgressBarInner,
  ActionButton,
  StatusRow,
  StatusLabel,
  StatusValue,
  SubSection,
  FileInputLabel,
  ImportResultBox,
  SyncCodeTextArea,
  SyncRow,
} from './StorageManagementTab.styles'

// ─── Main Component ─────────────────────────────────────

export function StorageManagementTab() {
  const { loadSlice } = useStorageAdmin()
  const repo = useRepository()
  const data = useDataStore((s) => s.data)
  const settings = useSettingsStore((s) => s.settings)
  const { conn, db } = useDuckDB(data, settings.targetYear, settings.targetMonth, repo)

  // 永続化ストレージ
  const {
    status: storageStatus,
    isLoading: storageLoading,
    requestPersistence,
  } = useStoragePersistence()

  // バックアップ
  const { isExporting, isImporting, exportBackup, importBackup, previewBackup } = useBackup(repo)
  const [backupPreview, setBackupPreview] = useState<BackupMeta | null>(null)
  const [backupFile, setBackupFile] = useState<File | null>(null)
  const [backupOverwrite, setBackupOverwrite] = useState(true)
  const backupInputRef = useRef<HTMLInputElement>(null)

  // デバイス間同期
  const {
    isCopied,
    importResult: syncImportResult,
    copySettingsCode,
    importFromText: importSettingsFromText,
    canShareFiles,
    shareBackupFile,
  } = useDeviceSync()
  const [syncImportText, setSyncImportText] = useState('')
  const [isShareExporting, setIsShareExporting] = useState(false)

  // データ復旧
  const { rawFileGroups, canRebuild, isRebuilding, lastRebuildResult, rebuildDuckDB } =
    useDataRecovery(conn, db, repo)

  // データ管理（月別データ・展開・削除）
  const {
    months,
    loading,
    expandedMonths,
    deleteTarget,
    deleting,
    loadData,
    toggleExpand,
    setDeleteTarget,
    handleDelete,
  } = useMonthDataManagement()

  const handleBackupFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      setBackupFile(file)
      const meta = await previewBackup(file)
      setBackupPreview(meta)
      // reset input
      if (backupInputRef.current) backupInputRef.current.value = ''
    },
    [previewBackup],
  )

  const handleBackupImport = useCallback(async () => {
    if (!backupFile) return
    const result = await importBackup(backupFile, backupOverwrite)
    setBackupFile(null)
    setBackupPreview(null)
    await loadData()
    // 復元成功時はページをリロードしてアプリ状態を反映する
    if (result.monthsImported > 0) {
      window.location.reload()
    }
  }, [backupFile, backupOverwrite, importBackup, loadData])

  if (loading) {
    return (
      <Section>
        <SectionTitle>保存データ管理</SectionTitle>
        <LoadingText>IndexedDB からデータを読み込み中...</LoadingText>
      </Section>
    )
  }

  const grandTotalRecords = months.reduce((sum, m) => sum + m.totalRecords, 0)

  return (
    <>
      {/* ─── ストレージ永続化 ──────────────────────────── */}
      <Section>
        <SectionTitle>ストレージ状態</SectionTitle>
        <HelpText>
          ブラウザのストレージ使用状況と永続化設定です。永続化すると、ブラウザがストレージを自動削除するリスクを低減できます。
        </HelpText>
        {storageLoading ? (
          <LoadingText>読み込み中...</LoadingText>
        ) : (
          <SubSection>
            <StatusRow>
              <StatusLabel>使用量</StatusLabel>
              <StatusValue>
                {storageStatus.usageFormatted} / {storageStatus.quotaFormatted}
              </StatusValue>
            </StatusRow>
            <ProgressBarOuter>
              <ProgressBarInner
                $ratio={storageStatus.usageRatio}
                $level={storageStatus.pressureLevel}
              />
            </ProgressBarOuter>
            <StatusRow>
              <StatusLabel>永続化</StatusLabel>
              <StatusValue $highlight={storageStatus.isPersisted}>
                {storageStatus.isPersisted ? '有効' : '無効'}
              </StatusValue>
            </StatusRow>
            <StatusRow>
              <StatusLabel>OPFS</StatusLabel>
              <StatusValue $highlight={storageStatus.isOpfsAvailable}>
                {storageStatus.isOpfsAvailable ? '利用可能' : '利用不可'}
              </StatusValue>
            </StatusRow>
            {storageStatus.pressureLevel !== 'normal' && (
              <ImportResultBox $hasErrors>
                {storageStatus.pressureLevel === 'critical'
                  ? 'ストレージ容量が危険水準です。不要なデータを削除してください。'
                  : 'ストレージ容量が警告水準に達しています。'}
              </ImportResultBox>
            )}
            {!storageStatus.isPersisted && (
              <ActionButton $variant="primary" onClick={requestPersistence}>
                ストレージを永続化する
              </ActionButton>
            )}
          </SubSection>
        )}
      </Section>

      {/* ─── バックアップ ──────────────────────────────── */}
      <Section>
        <SectionTitle>バックアップ</SectionTitle>
        <HelpText>
          全月データ・設定・履歴を JSON ファイルとしてダウンロード、または復元できます（gzip
          圧縮対応）。
        </HelpText>
        <SubSection>
          <StatusRow>
            <ActionButton $variant="primary" onClick={exportBackup} disabled={isExporting}>
              {isExporting ? 'エクスポート中...' : 'バックアップをダウンロード'}
            </ActionButton>
            <FileInputLabel>
              バックアップから復元
              <input
                ref={backupInputRef}
                type="file"
                accept=".json,.json.gz,.gz"
                style={{ display: 'none' }}
                onChange={handleBackupFileSelect}
              />
            </FileInputLabel>
          </StatusRow>
          {backupPreview && (
            <SubSection>
              <ImportResultBox $hasErrors={false}>
                <div>作成日時: {new Date(backupPreview.createdAt).toLocaleString('ja-JP')}</div>
                <div>月数: {backupPreview.months.length} 月分</div>
                <div>
                  対象: {backupPreview.months.map((m) => `${m.year}年${m.month}月`).join(', ')}
                </div>
                <div>
                  フォーマット: v{backupPreview.formatVersion}
                  {backupPreview.checksum ? ' (チェックサム付き)' : ''}
                </div>
              </ImportResultBox>
              <StatusRow>
                <label
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
                >
                  <input
                    type="checkbox"
                    checked={backupOverwrite}
                    onChange={(e) => setBackupOverwrite(e.target.checked)}
                  />
                  既存データを上書きする
                </label>
              </StatusRow>
              <StatusRow>
                <ActionButton
                  $variant="primary"
                  onClick={handleBackupImport}
                  disabled={isImporting}
                >
                  {isImporting ? 'インポート中...' : 'このバックアップを復元する'}
                </ActionButton>
                <ActionButton
                  onClick={() => {
                    setBackupPreview(null)
                    setBackupFile(null)
                  }}
                >
                  キャンセル
                </ActionButton>
              </StatusRow>
            </SubSection>
          )}
        </SubSection>
      </Section>

      {/* ─── デバイス間同期 ──────────────────────────── */}
      <Section>
        <SectionTitle>デバイス間同期</SectionTitle>
        <HelpText>
          PC とスマートフォン間で設定やデータを共有できます。Chrome
          のブラウザ同期ではアプリのデータは同期されないため、手動で転送してください。
        </HelpText>

        {/* 設定コード同期 */}
        <SubSection>
          <StatusLabel>設定の転送（カテゴリ分類・閾値など）</StatusLabel>
          <SyncRow>
            <ActionButton $variant="primary" onClick={copySettingsCode}>
              {isCopied ? 'コピーしました' : '設定コードをコピー'}
            </ActionButton>
          </SyncRow>
          <HelpText style={{ marginBottom: 0, marginTop: 8 }}>
            コピーしたコードを LINE などで送り、別のデバイスで下のテキスト欄に貼り付けてください。
          </HelpText>

          <SyncCodeTextArea
            value={syncImportText}
            onChange={(e) => setSyncImportText(e.target.value)}
            placeholder="SHIIRE_SETTINGS:... のコードを貼り付け"
            rows={2}
          />
          <SyncRow>
            <ActionButton
              $variant="primary"
              onClick={() => {
                importSettingsFromText(syncImportText)
                setSyncImportText('')
              }}
              disabled={!syncImportText.trim()}
            >
              設定を適用
            </ActionButton>
          </SyncRow>
          {syncImportResult && (
            <ImportResultBox $hasErrors={!syncImportResult.success}>
              {syncImportResult.success
                ? `設定を適用しました（${syncImportResult.keysUpdated ?? 0} 項目）`
                : `エラー: ${syncImportResult.error}`}
            </ImportResultBox>
          )}
        </SubSection>

        {/* データファイル共有（Web Share API） */}
        {canShareFiles && (
          <SubSection style={{ marginTop: 16 }}>
            <StatusLabel>データの転送（全月データ + 設定）</StatusLabel>
            <SyncRow>
              <ActionButton
                $variant="primary"
                disabled={isShareExporting || !repo}
                onClick={async () => {
                  if (!repo) return
                  setIsShareExporting(true)
                  try {
                    const appSettings = useSettingsStore.getState().settings
                    const { backupExporter } =
                      await import('@/infrastructure/storage/backupExporter')
                    const blob = await backupExporter.exportBackup(repo, appSettings)
                    await shareBackupFile(blob)
                  } finally {
                    setIsShareExporting(false)
                  }
                }}
              >
                {isShareExporting ? 'エクスポート中...' : 'バックアップを共有'}
              </ActionButton>
            </SyncRow>
            <HelpText style={{ marginBottom: 0, marginTop: 8 }}>
              AirDrop・LINE
              などでバックアップファイルを直接送信できます。受け取り側は上のバックアップセクションから復元してください。
            </HelpText>
          </SubSection>
        )}
      </Section>

      {/* ─── DuckDB 復旧 ─────────────────────────────── */}
      <Section>
        <SectionTitle>DuckDB キャッシュ管理</SectionTitle>
        <HelpText>
          DuckDB のインメモリ/OPFS
          キャッシュを再構築します。データの不整合が疑われる場合に使用してください。
        </HelpText>
        <SubSection>
          <StatusRow>
            <ActionButton
              $variant="primary"
              onClick={rebuildDuckDB}
              disabled={!canRebuild || isRebuilding}
            >
              {isRebuilding ? '再構築中...' : 'DuckDB を再構築'}
            </ActionButton>
          </StatusRow>
          {lastRebuildResult && (
            <ImportResultBox $hasErrors={lastRebuildResult.skippedMonths.length > 0}>
              <div>
                再構築完了: {lastRebuildResult.monthCount} 月分（
                {lastRebuildResult.durationMs.toFixed(0)}ms）
              </div>
              {lastRebuildResult.skippedMonths.length > 0 && (
                <div>
                  スキップ:{' '}
                  {lastRebuildResult.skippedMonths.map((s) => `${s.year}-${s.month}`).join(', ')}
                </div>
              )}
            </ImportResultBox>
          )}
          {rawFileGroups.length > 0 && (
            <SubSection>
              <StatusLabel>保存済み原本ファイル</StatusLabel>
              {rawFileGroups.map((g) => (
                <StatusRow key={`${g.year}-${g.month}`}>
                  <StatusLabel>
                    {g.year}年{g.month}月
                  </StatusLabel>
                  <StatusValue>{g.files.map((f) => f.dataType).join(', ')}</StatusValue>
                </StatusRow>
              ))}
            </SubSection>
          )}
        </SubSection>
      </Section>

      {/* ─── 保存データ管理（既存） ──────────────────── */}
      <Section>
        <SectionTitle>保存データ管理</SectionTitle>
        <HelpText>
          IndexedDB
          に保存されている月別データの一覧です。各月のデータ内容を確認したり、不要なデータを削除できます。
        </HelpText>

        <GovernanceSummary>
          <GovernanceStat>
            <GovernanceStatValue>{grandTotalRecords.toLocaleString()}</GovernanceStatValue>
            <GovernanceStatLabel>件（全 {months.length} 月分合計）</GovernanceStatLabel>
          </GovernanceStat>
          <GovernanceRow>
            <GovernanceIcon />
            <GovernanceText>
              全データはブラウザ内ローカルストレージに保存されています。サーバーへの送信は行いません。
            </GovernanceText>
          </GovernanceRow>
          <GovernanceRow>
            <GovernanceIcon />
            <GovernanceText>自動削除はありません。手動で管理してください。</GovernanceText>
          </GovernanceRow>
          <GovernanceRow>
            <GovernanceIcon />
            <GovernanceText>
              個人を特定できるデータは含まれていません（売上集計データのみ）。
            </GovernanceText>
          </GovernanceRow>
        </GovernanceSummary>

        {months.length === 0 ? (
          <EmptyState>保存されたデータはありません</EmptyState>
        ) : (
          <MonthCardGrid>
            {months.map((entry) => {
              const key = `${entry.year}-${entry.month}`
              const isExpanded = expandedMonths.has(key)
              const ctsSummary = entry.summary.find((s) => s.dataType === 'categoryTimeSales')

              return (
                <MonthCard key={key}>
                  <MonthCardHeader onClick={() => toggleExpand(key)}>
                    <MonthLabel>
                      <ExpandIcon $expanded={isExpanded}>▶</ExpandIcon>
                      <MonthTitle>
                        {entry.year}年{entry.month}月
                      </MonthTitle>
                      <MonthBadge>
                        {entry.dataTypeCount}種別 / {entry.totalRecords.toLocaleString()}件
                      </MonthBadge>
                    </MonthLabel>
                    <HeaderActions>
                      <DeleteButton
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteTarget({ year: entry.year, month: entry.month })
                        }}
                      >
                        削除
                      </DeleteButton>
                    </HeaderActions>
                  </MonthCardHeader>

                  {isExpanded && (
                    <DetailPanel>
                      <DataTypeGrid>
                        {entry.summary.map((s) => (
                          <DataTypeRow key={s.dataType} $hasData={s.recordCount > 0}>
                            <DataTypeLabel>{s.label}</DataTypeLabel>
                            <DataTypeCount $hasData={s.recordCount > 0}>
                              {s.recordCount > 0 ? `${s.recordCount.toLocaleString()}件` : '-'}
                            </DataTypeCount>
                          </DataTypeRow>
                        ))}
                      </DataTypeGrid>

                      <RawDataViewer
                        year={entry.year}
                        month={entry.month}
                        summary={entry.summary}
                        loadSlice={loadSlice}
                      />

                      {ctsSummary && ctsSummary.recordCount > 0 && (
                        <CTSViewer
                          year={entry.year}
                          month={entry.month}
                          dataType="categoryTimeSales"
                          label="分類別時間帯売上"
                          loadSlice={loadSlice}
                        />
                      )}
                    </DetailPanel>
                  )}
                </MonthCard>
              )
            })}
          </MonthCardGrid>
        )}
      </Section>

      {/* ─── 全データ削除（危険操作） ─────────────────── */}
      <ClearAllDataSection
        monthCount={months.length}
        totalRecords={grandTotalRecords}
        onComplete={loadData}
      />

      {/* 月別削除確認ダイアログ */}
      {deleteTarget &&
        (() => {
          const targetEntry = months.find(
            (m) => m.year === deleteTarget.year && m.month === deleteTarget.month,
          )
          return (
            <ConfirmOverlay onClick={() => !deleting && setDeleteTarget(null)}>
              <ConfirmDialog onClick={(e) => e.stopPropagation()}>
                <ConfirmTitle>データ削除の確認</ConfirmTitle>
                <ConfirmMessage>
                  {deleteTarget.year}年{deleteTarget.month}月の保存データを全て削除します。
                </ConfirmMessage>
                {targetEntry && (
                  <ConfirmDetail>
                    <ConfirmDetailRow>
                      <span>データ種別数</span>
                      <span>{targetEntry.dataTypeCount} 種別</span>
                    </ConfirmDetailRow>
                    <ConfirmDetailRow>
                      <span>総レコード数</span>
                      <span>{targetEntry.totalRecords.toLocaleString()} 件</span>
                    </ConfirmDetailRow>
                  </ConfirmDetail>
                )}
                <ConfirmWarning>この操作は取り消せません。</ConfirmWarning>
                <ConfirmActions>
                  <CancelButton onClick={() => setDeleteTarget(null)} disabled={deleting}>
                    キャンセル
                  </CancelButton>
                  <ConfirmDeleteButton onClick={handleDelete} disabled={deleting}>
                    {deleting ? '削除中...' : '削除する'}
                  </ConfirmDeleteButton>
                </ConfirmActions>
              </ConfirmDialog>
            </ConfirmOverlay>
          )
        })()}
    </>
  )
}
