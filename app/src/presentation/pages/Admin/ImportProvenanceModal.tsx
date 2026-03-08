import type { ImportHistoryEntry } from '@/domain/models'
import type { StoreDayStats } from '@/application/hooks/useDataSummary'
import { palette } from '@/presentation/theme/tokens'
import { Modal } from '@/presentation/components/common/Modal'
import { Table, Th, Td, EmptyState, Badge } from './AdminShared'
import {
  HistoryList,
  HistoryCard,
  HistoryTimestamp,
  HistoryFileList,
  HistoryFileBadge,
  DataVerifySection,
  DataVerifyTitle,
  DataVerifyGrid,
  DataVerifyLabel,
  DataVerifyValue,
} from './ImportHistoryTab.styles'

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso)
    const y = d.getFullYear()
    const mo = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const h = String(d.getHours()).padStart(2, '0')
    const mi = String(d.getMinutes()).padStart(2, '0')
    return `${y}/${mo}/${day} ${h}:${mi}`
  } catch {
    return iso
  }
}

export function ImportProvenanceModal({
  history,
  dataStats,
  onClose,
}: {
  history: readonly ImportHistoryEntry[]
  dataStats: StoreDayStats
  onClose: () => void
}) {
  return (
    <Modal title={`${dataStats.label} — 取込情報`} onClose={onClose}>
      {/* データ内容サマリー */}
      <DataVerifySection>
        <DataVerifyTitle>データ内容</DataVerifyTitle>
        <DataVerifyGrid>
          <DataVerifyLabel>店舗数</DataVerifyLabel>
          <DataVerifyValue>{dataStats.storeCount}</DataVerifyValue>
          <DataVerifyLabel>レコード数</DataVerifyLabel>
          <DataVerifyValue>{dataStats.totalRecords.toLocaleString()}</DataVerifyValue>
          <DataVerifyLabel>日付範囲</DataVerifyLabel>
          <DataVerifyValue>
            {dataStats.dayRange
              ? `${dataStats.dayRange.min}日 〜 ${dataStats.dayRange.max}日`
              : '-'}
          </DataVerifyValue>
        </DataVerifyGrid>
        {dataStats.perStore.length > 0 && (
          <Table style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <Th>店舗</Th>
                <Th>日数</Th>
                <Th>範囲</Th>
              </tr>
            </thead>
            <tbody>
              {dataStats.perStore.map((ps) => (
                <tr key={ps.storeId}>
                  <Td style={{ fontSize: '0.75rem' }}>{ps.storeName}</Td>
                  <Td style={{ fontSize: '0.75rem' }}>{ps.days}日分</Td>
                  <Td style={{ fontSize: '0.75rem' }}>
                    {ps.minDay}日 〜 {ps.maxDay}日
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </DataVerifySection>

      {/* インポート履歴 */}
      {history.length > 0 ? (
        <HistoryList>
          {history.map((entry, i) => (
            <HistoryCard key={i}>
              <HistoryTimestamp>
                {formatTimestamp(entry.importedAt)}
                <Badge $color={palette.successDark} style={{ marginLeft: 8 }}>
                  {entry.successCount}件成功
                </Badge>
                {entry.failureCount > 0 && (
                  <Badge $color={palette.dangerDark} style={{ marginLeft: 4 }}>
                    {entry.failureCount}件失敗
                  </Badge>
                )}
              </HistoryTimestamp>
              <HistoryFileList>
                {entry.files.map((f, j) => (
                  <li key={j}>
                    {f.filename}
                    {f.typeName && <HistoryFileBadge>{f.typeName}</HistoryFileBadge>}
                    {f.rowCount != null && (
                      <span style={{ opacity: 0.6, marginLeft: 6 }}>{f.rowCount}行</span>
                    )}
                  </li>
                ))}
              </HistoryFileList>
            </HistoryCard>
          ))}
        </HistoryList>
      ) : (
        <EmptyState>インポート履歴がありません</EmptyState>
      )}
    </Modal>
  )
}
