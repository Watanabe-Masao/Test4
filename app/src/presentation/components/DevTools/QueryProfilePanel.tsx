/**
 * クエリプロファイルパネル
 *
 * DEV モードでのみ表示される DuckDB クエリログビューア。
 * 直近のクエリ実行ログ、実行時間、成功/失敗を一覧表示する。
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import styled from 'styled-components'
import { queryProfiler, type QueryProfileEntry } from '@/infrastructure/duckdb/queryProfiler'

// DEV モードでのみレンダリング
const isDev = import.meta.env.DEV

const PanelOverlay = styled.div<{ $collapsed: boolean }>`
  position: fixed;
  bottom: 0;
  right: 0;
  width: ${(p) => (p.$collapsed ? '200px' : '600px')};
  max-height: ${(p) => (p.$collapsed ? '40px' : '400px')};
  background: ${(p) => p.theme.colors.bg};
  border-top: 2px solid ${(p) => p.theme.colors.palette.info};
  border-left: 2px solid ${(p) => p.theme.colors.palette.info};
  border-radius: 8px 0 0 0;
  z-index: 9999;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 11px;
  color: ${(p) => p.theme.colors.text};
  overflow: hidden;
  transition: all 0.2s ease;
`

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  background: ${(p) => p.theme.colors.bg2};
  cursor: pointer;
  user-select: none;
`

const Title = styled.span`
  font-weight: 600;
  letter-spacing: 0.5px;
`

const Stats = styled.span`
  opacity: 0.7;
  font-size: 10px;
`

const ClearButton = styled.button`
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: inherit;
  padding: 2px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 10px;
  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`

const EntryList = styled.div`
  overflow-y: auto;
  max-height: 350px;
  padding: 4px;
`

const EntryRow = styled.div<{ $status: string }>`
  display: grid;
  grid-template-columns: 50px 1fr 60px 50px;
  gap: 8px;
  padding: 4px 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  align-items: center;
  background: ${(p) =>
    p.$status === 'error'
      ? 'rgba(255, 80, 80, 0.1)'
      : p.$status === 'running'
        ? 'rgba(255, 200, 50, 0.1)'
        : 'transparent'};

  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }
`

const SqlText = styled.div`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: 0.9;
`

const Duration = styled.span<{ $slow: boolean }>`
  text-align: right;
  color: ${(p) => (p.$slow ? '#ff6b6b' : '#7bed9f')};
  font-weight: ${(p) => (p.$slow ? 600 : 400)};
`

const StatusBadge = styled.span<{ $status: string }>`
  text-align: center;
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  background: ${(p) =>
    p.$status === 'success'
      ? 'rgba(123, 237, 159, 0.2)'
      : p.$status === 'error'
        ? 'rgba(255, 107, 107, 0.2)'
        : 'rgba(255, 200, 50, 0.2)'};
  color: ${(p) =>
    p.$status === 'success' ? '#7bed9f' : p.$status === 'error' ? '#ff6b6b' : '#ffc832'};
`

function formatDuration(ms: number | null): string {
  if (ms === null) return '...'
  if (ms < 1) return '<1ms'
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function truncateSql(sql: string, maxLen = 80): string {
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
