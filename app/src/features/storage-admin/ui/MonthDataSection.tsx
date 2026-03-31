/**
 * 月別データ管理セクション — データ一覧 + 展開 + 削除ダイアログ
 */
import type { MonthEntry, LoadSliceFn } from './StorageDataViewers.types'
import { RawDataViewer, CTSViewer } from './StorageDataViewers'
import {
  Section,
  SectionTitle,
  HelpText,
  EmptyState,
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
} from './StorageManagementTab.styles'

interface Props {
  readonly months: readonly MonthEntry[]
  readonly expandedMonths: ReadonlySet<string>
  readonly deleteTarget: { year: number; month: number } | null
  readonly deleting: boolean
  readonly loadSlice: LoadSliceFn
  readonly onToggleExpand: (key: string) => void
  readonly onSetDeleteTarget: (target: { year: number; month: number } | null) => void
  readonly onDelete: () => void
}

export function MonthDataSection({
  months,
  expandedMonths,
  deleteTarget,
  deleting,
  loadSlice,
  onToggleExpand,
  onSetDeleteTarget,
  onDelete,
}: Props) {
  const grandTotalRecords = months.reduce((sum, m) => sum + m.totalRecords, 0)

  return (
    <>
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
                  <MonthCardHeader onClick={() => onToggleExpand(key)}>
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
                          onSetDeleteTarget({ year: entry.year, month: entry.month })
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

      {deleteTarget &&
        (() => {
          const targetEntry = months.find(
            (m) => m.year === deleteTarget.year && m.month === deleteTarget.month,
          )
          return (
            <ConfirmOverlay onClick={() => !deleting && onSetDeleteTarget(null)}>
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
                  <CancelButton onClick={() => onSetDeleteTarget(null)} disabled={deleting}>
                    キャンセル
                  </CancelButton>
                  <ConfirmDeleteButton onClick={onDelete} disabled={deleting}>
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
