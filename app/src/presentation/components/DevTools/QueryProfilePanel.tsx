/**
 * クエリプロファイルパネル
 *
 * DEV モードでのみ表示される DuckDB クエリログビューア。
 * 直近のクエリ実行ログ、実行時間、成功/失敗を一覧表示する。
 * @responsibility R:widget
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { queryProfiler, type QueryProfileEntry } from '@/application/services/queryProfileService'
import {
  PanelOverlay,
  Header,
  Title,
  Stats,
  ClearButton,
  EntryList,
  EntryRow,
  SqlText,
  Duration,
  StatusBadge,
} from './QueryProfilePanel.styles'

// DEV モードでのみレンダリング
const isDev = import.meta.env.DEV

export function formatDuration(ms: number | null): string {
  if (ms === null) return '...'
  if (ms < 1) return '<1ms'
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

export function truncateSql(sql: string, maxLen = 80): string {
  const single = sql.replace(/\s+/g, ' ').trim()
  return single.length > maxLen ? single.slice(0, maxLen) + '...' : single
}

export function QueryProfilePanel() {
  if (!isDev) return null

  return <QueryProfilePanelInner />
}

function QueryProfilePanelInner() {
  const [collapsed, setCollapsed] = useState(true)
  const [entries, setEntries] = useState<readonly QueryProfileEntry[]>(() =>
    queryProfiler.getEntries(),
  )

  useEffect(() => {
    return queryProfiler.onChange(() => {
      setEntries(queryProfiler.getEntries())
    })
  }, [])

  // entries が変わるたびに stats を再計算（entries が依存配列の中身）
  const stats = useMemo(() => {
    return {
      totalQueries: entries.length,
      avgDurationMs:
        entries.length > 0
          ? entries.reduce((sum, e) => sum + (e.durationMs ?? 0), 0) /
              entries.filter((e) => e.status === 'success').length || 0
          : 0,
    }
  }, [entries])

  const handleToggle = useCallback(() => {
    setCollapsed((c) => !c)
  }, [])

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    queryProfiler.clear()
  }, [])

  return (
    <PanelOverlay $collapsed={collapsed}>
      <Header onClick={handleToggle}>
        <Title>DuckDB Profiler</Title>
        <Stats>
          {stats.totalQueries} queries | avg {formatDuration(stats.avgDurationMs)}
        </Stats>
        {!collapsed && <ClearButton onClick={handleClear}>Clear</ClearButton>}
      </Header>
      {!collapsed && (
        <EntryList>
          {entries.map((entry) => (
            <EntryRow key={entry.id} $status={entry.status} title={entry.sql}>
              <StatusBadge $status={entry.status}>{entry.status}</StatusBadge>
              <SqlText>{truncateSql(entry.sql)}</SqlText>
              <Duration $slow={(entry.durationMs ?? 0) > 500}>
                {formatDuration(entry.durationMs)}
              </Duration>
              <span style={{ opacity: 0.5, textAlign: 'right' }}>
                {entry.rowCount !== null ? `${entry.rowCount}r` : ''}
              </span>
            </EntryRow>
          ))}
          {entries.length === 0 && (
            <div style={{ padding: '16px', textAlign: 'center', opacity: 0.5 }}>No queries yet</div>
          )}
        </EntryList>
      )}
    </PanelOverlay>
  )
}
