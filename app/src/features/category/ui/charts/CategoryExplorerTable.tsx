/**
 * カテゴリエクスプローラー テーブル描画コンポーネント
 *
 * カテゴリ階層データのテーブル・ツリーマップ表示のみを担う。
 * データ集約・ソート・フィルタは CategoryHierarchyExplorer が担当。
 *
 * @responsibility R:unclassified
 */
import { memo } from 'react'
import { toComma, toPct } from '@/presentation/components/charts/chartTheme'
import { sc } from '@/presentation/theme/semanticColors'
import type {
  HierarchyItem,
  SortKey,
  SortDir,
} from '@/presentation/components/charts/categoryExplorerTypes'
import {
  TreemapWrap,
  TreemapBlock,
  TreemapLabel,
  TreemapPct,
  TableWrap,
  Table,
  Th,
  Tr,
  Td,
  TdName,
  NameMain,
  NameCode,
  TdAmount,
  AmtWrap,
  AmtTrack,
  AmtFill,
  AmtVal,
  PeakBadge,
  TdSpark,
  DrillBtn,
  DrillCount,
  YoYBadge,
  YoYBar,
  AnomalyBadge,
  PiValueBadge,
  ThWithTip,
  TipIcon,
  TipBubble,
} from '@/features/category/ui/charts/CategoryHierarchyExplorer.styles'

const COLORS = [
  '#6366f1',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#06b6d4',
  '#ec4899',
  '#8b5cf6',
  '#84cc16',
  '#f97316',
  '#14b8a6',
  '#e879f9',
  '#a3e635',
  '#fb923c',
  '#38bdf8',
  '#c084fc',
]

/* ── Sparkline SVG ────────────────────────── */

function Sparkline({ data, color = '#6366f1' }: { data: number[]; color?: string }) {
  const start = data.findIndex((v) => v > 0)
  const end = data.length - 1 - [...data].reverse().findIndex((v) => v > 0)
  if (start < 0 || end < start) return null
  const slice = data.slice(start, end + 1)
  const max = Math.max(...slice)
  if (max === 0) return null
  const w = 120,
    h = 22
  const pts = slice.map((v, i) => {
    const x = slice.length > 1 ? (i / (slice.length - 1)) * w : w / 2
    const y = h - (v / max) * (h - 3) - 1.5
    return `${x},${y}`
  })
  const line = pts.join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polygon points={`0,${h} ${line} ${w},${h}`} fill={color} fillOpacity="0.1" />
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/* ── Props ─────────────────────────────────── */

interface Props {
  items: readonly HierarchyItem[]
  sortedItems: readonly HierarchyItem[]
  currentLevel: 'department' | 'line' | 'klass'
  levelLabels: Record<string, string>
  sortKey: SortKey
  sortDir: SortDir
  handleSort: (key: SortKey) => void
  handleDrill: (it: HierarchyItem) => void
  showYoYCols: boolean
  showPi: boolean
  avgPi: number
  maxAmt: number
  canDrill: boolean
}

export const CategoryExplorerTable = memo(function CategoryExplorerTable({
  items,
  sortedItems,
  currentLevel,
  levelLabels,
  sortKey,
  sortDir,
  handleSort,
  handleDrill,
  showYoYCols,
  showPi,
  avgPi,
  maxAmt,
  canDrill,
}: Props) {
  const arrow = (k: SortKey) => (sortKey === k ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '')

  return (
    <>
      <TreemapWrap>
        {items
          .slice()
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 15)
          .map((it, i) => (
            <TreemapBlock
              key={it.code}
              $flex={it.amount}
              $color={COLORS[i % COLORS.length]}
              $canDrill={canDrill}
              onClick={() => canDrill && handleDrill(it)}
              title={`${it.name}: ${toComma(it.amount)}円 (${it.pct.toFixed(1)}%)${it.yoyRatio != null ? ` 前年比${toPct(it.yoyRatio)}` : ''}`}
            >
              <TreemapLabel>{it.name}</TreemapLabel>
              <TreemapPct>
                {it.pct.toFixed(1)}%
                {showYoYCols && it.yoyRatio != null && (
                  <span style={{ marginLeft: 3, color: it.yoyRatio >= 1 ? '#bbf7d0' : '#fecaca' }}>
                    {it.yoyRatio >= 1 ? '↑' : '↓'}
                  </span>
                )}
              </TreemapPct>
            </TreemapBlock>
          ))}
      </TreemapWrap>

      <TableWrap>
        <Table aria-label="カテゴリ階層データ">
          <caption
            style={{
              captionSide: 'top',
              textAlign: 'left',
              fontSize: '0.6rem',
              color: 'inherit',
              padding: '0 0 4px 0',
            }}
          >
            {levelLabels[currentLevel]}別の売上・時間帯分析
          </caption>
          <thead>
            <tr>
              <Th scope="col">#</Th>
              <Th scope="col" $sortable onClick={() => handleSort('name')}>
                {levelLabels[currentLevel]}名{arrow('name')}
              </Th>
              <Th scope="col" $sortable onClick={() => handleSort('amount')}>
                売上金額{arrow('amount')}
              </Th>
              <ThWithTip scope="col" $sortable onClick={() => handleSort('pct')}>
                構成比{arrow('pct')}
                <TipIcon>?</TipIcon>
                <TipBubble>
                  当該カテゴリの売上 ÷ 全体売上 × 100。全体に占める割合を示します。
                </TipBubble>
              </ThWithTip>
              <Th scope="col" $sortable onClick={() => handleSort('quantity')}>
                数量{arrow('quantity')}
              </Th>
              <ThWithTip scope="col">
                取扱日率
                <TipIcon>?</TipIcon>
                <TipBubble>
                  売上のあった日数 ÷ 期間日数 ×
                  100。100%で全日取扱、低い値は季節品や新規品の可能性。
                </TipBubble>
              </ThWithTip>
              {showPi && (
                <ThWithTip scope="col" $sortable onClick={() => handleSort('piValue')}>
                  PI値{arrow('piValue')}
                  <TipIcon>?</TipIcon>
                  <TipBubble>
                    金額PI = カテゴリ売上 ÷ 総客数 ×
                    1000。来店客1000人あたりのカテゴリ売上金額。客数はclassifiedSales由来の全期間合計。
                  </TipBubble>
                </ThWithTip>
              )}
              {showYoYCols && (
                <ThWithTip scope="col" $sortable onClick={() => handleSort('yoyRatio')}>
                  前年比{arrow('yoyRatio')}
                  <TipIcon>?</TipIcon>
                  <TipBubble>
                    当年売上 ÷ 前年売上 × 100。100%超で前年を上回っていることを示します。
                  </TipBubble>
                </ThWithTip>
              )}
              {showYoYCols && (
                <ThWithTip scope="col" $sortable onClick={() => handleSort('yoyDiff')}>
                  前年差{arrow('yoyDiff')}
                  <TipIcon>?</TipIcon>
                  <TipBubble>当年売上 − 前年売上。前年からの売上増減額を示します。</TipBubble>
                </ThWithTip>
              )}
              <ThWithTip scope="col" $sortable onClick={() => handleSort('peakHour')}>
                ピーク{arrow('peakHour')}
                <TipIcon>?</TipIcon>
                <TipBubble>
                  最も販売実績が多い単一時間帯（1時間単位）。売上のピークタイムを示します。
                </TipBubble>
              </ThWithTip>
              <ThWithTip scope="col" $sortable onClick={() => handleSort('coreTimeStart')}>
                コア{arrow('coreTimeStart')}
                <TipIcon>?</TipIcon>
                <TipBubble>
                  連続する3時間の売上合計が最大となる時間帯。主要な販売時間帯を示します。
                </TipBubble>
              </ThWithTip>
              <ThWithTip scope="col" $sortable onClick={() => handleSort('turnaroundHour')}>
                折返{arrow('turnaroundHour')}
                <TipIcon>?</TipIcon>
                <TipBubble>
                  累積売上が1日の50%に到達する時間帯。この時点で売上の半分が達成されています。
                </TipBubble>
              </ThWithTip>
              <Th scope="col">時間帯パターン</Th>
              {canDrill && <Th scope="col" />}
            </tr>
          </thead>
          <tbody>
            {sortedItems.map((it, i) => (
              <Tr key={it.code} $clickable={canDrill} onClick={() => canDrill && handleDrill(it)}>
                <Td $mono>{i + 1}</Td>
                <TdName>
                  <NameMain>{it.name}</NameMain>
                  <NameCode>{it.code}</NameCode>
                </TdName>
                <TdAmount>
                  <AmtWrap>
                    <AmtTrack>
                      <AmtFill
                        $pct={maxAmt > 0 ? (it.amount / maxAmt) * 100 : 0}
                        $color={COLORS[i % COLORS.length]}
                      />
                    </AmtTrack>
                    <AmtVal>{toComma(it.amount)}円</AmtVal>
                  </AmtWrap>
                </TdAmount>
                <Td $mono>{it.pct.toFixed(1)}%</Td>
                <Td $mono>{it.quantity.toLocaleString()}</Td>
                <Td $mono>
                  {it.handledDayCount != null &&
                  it.totalDayCount != null &&
                  it.totalDayCount > 0 ? (
                    <span
                      style={{
                        color:
                          it.handledDayCount === it.totalDayCount
                            ? 'inherit'
                            : it.handledDayCount === 0
                              ? sc.negativeDark
                              : sc.cautionDark,
                      }}
                    >
                      {Math.round((it.handledDayCount / it.totalDayCount) * 100)}%
                    </span>
                  ) : (
                    '-'
                  )}
                </Td>
                {showPi && (
                  <Td $mono>
                    {it.piValue != null ? (
                      <PiValueBadge $below={it.piValue < avgPi * 0.5}>
                        {it.piValue.toFixed(0)}
                      </PiValueBadge>
                    ) : (
                      '-'
                    )}
                  </Td>
                )}
                {showYoYCols && (
                  <Td $mono>
                    {it.yoyRatio != null ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <YoYBadge $positive={it.yoyRatio >= 1}>{toPct(it.yoyRatio)}</YoYBadge>
                        <YoYBar
                          $pct={Math.abs((it.yoyRatio - 1) * 100) * 2}
                          $positive={it.yoyRatio >= 1}
                        />
                      </div>
                    ) : (
                      '-'
                    )}
                  </Td>
                )}
                {showYoYCols && (
                  <Td $mono>
                    {it.yoyDiff != null ? (
                      <span style={{ color: sc.cond(it.yoyDiff >= 0) }}>
                        {it.yoyDiff >= 0 ? '+' : ''}
                        {toComma(it.yoyDiff)}円
                      </span>
                    ) : (
                      '-'
                    )}
                  </Td>
                )}
                <Td $mono>
                  {it.peakHour >= 0 ? (
                    <>
                      <PeakBadge>{it.peakHour}時</PeakBadge>
                      {it.hasAnomalyShift && (
                        <AnomalyBadge
                          title={`ピーク時間が${it.prevPeakHour}時→${it.peakHour}時にシフト`}
                        >
                          ⚠{it.peakHourShift! > 0 ? '+' : ''}
                          {it.peakHourShift}h
                        </AnomalyBadge>
                      )}
                    </>
                  ) : (
                    '-'
                  )}
                </Td>
                <Td $mono>
                  {it.coreTimeStart >= 0 ? (
                    <PeakBadge>
                      {it.coreTimeStart}〜{it.coreTimeEnd}時
                    </PeakBadge>
                  ) : (
                    '-'
                  )}
                </Td>
                <Td $mono>
                  {it.turnaroundHour >= 0 ? <PeakBadge>{it.turnaroundHour}時</PeakBadge> : '-'}
                </Td>
                <TdSpark>
                  <Sparkline data={it.hourlyPattern} color={COLORS[i % COLORS.length]} />
                </TdSpark>
                {canDrill && (
                  <Td>
                    <DrillBtn>
                      ▸{it.childCount > 0 && <DrillCount>{it.childCount}</DrillCount>}
                    </DrillBtn>
                  </Td>
                )}
              </Tr>
            ))}
          </tbody>
        </Table>
      </TableWrap>
    </>
  )
})
