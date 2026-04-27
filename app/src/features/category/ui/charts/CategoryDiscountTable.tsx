/**
 * CategoryDiscountTable — カテゴリ別売変分析のソート可能テーブル
 *
 * CategoryDiscountChart から分離。ヘッダークリックでソート切り替え、
 * ダブルクリックで下位レベルにドリルダウン。
 *
 * @responsibility R:unclassified
 */
import type { AppTheme } from '@/presentation/theme/theme'
import type { CategoryDiscountOutput } from '@/application/queries/cts/CategoryDiscountHandler'

type CategoryDiscountRow = CategoryDiscountOutput['records'][number]
import { DISCOUNT_TYPES } from '@/domain/models/record'
import { formatPercent } from '@/domain/formatting'
import type { useCurrencyFormat } from '@/presentation/components/charts/chartTheme'

type Level = 'department' | 'line' | 'klass'

const NEXT_LEVEL: Record<Level, Level | null> = {
  department: 'line',
  line: 'klass',
  klass: null,
}

const LEVEL_COLUMN: Record<Level, string> = {
  department: 'department_name',
  line: 'line_name',
  klass: 'class_name',
}

export type SortKey =
  | 'discountTotal'
  | 'discountRate'
  | 'share'
  | 'prevYoyRate'
  | 'prevDiscountRate'
  | 'discount71'
  | 'discount72'
  | 'discount73'
  | 'discount74'

export type SortDir = 'asc' | 'desc'

export interface DrillState {
  readonly level: Level
  readonly parentFilter?: { column: string; value: string }
  readonly breadcrumbs: readonly string[]
}

interface Props {
  records: readonly CategoryDiscountRow[]
  prevByCode: Map<string, CategoryDiscountRow>
  drill: DrillState
  setDrill: (s: DrillState) => void
  sortKey: SortKey
  sortDir: SortDir
  toggleSort: (key: SortKey) => void
  dtColors: Record<string, string>
  theme: AppTheme
  cf: ReturnType<typeof useCurrencyFormat>
}

export function CategoryDiscountTable({
  records,
  prevByCode,
  drill,
  setDrill,
  sortKey,
  sortDir,
  toggleSort,
  dtColors,
  theme,
  cf,
}: Props) {
  const sortIcon = (key: SortKey) => (sortKey === key ? (sortDir === 'desc' ? ' ↓' : ' ↑') : '')

  const thStyle = (align: 'left' | 'right', color?: string): React.CSSProperties => ({
    textAlign: align,
    padding: '4px 8px',
    borderBottom: `2px solid ${theme.colors.border}`,
    color: color ?? theme.colors.text3,
    cursor: 'pointer',
    userSelect: 'none',
    whiteSpace: 'nowrap',
  })

  const cellStyle = (mono?: boolean, color?: string): React.CSSProperties => ({
    textAlign: 'right',
    padding: '4px 8px',
    fontFamily: mono ? theme.typography.fontFamily.mono : undefined,
    color: color ?? theme.colors.text,
  })

  const hasPrev = prevByCode.size > 0
  const totalDiscount = records.reduce((s, x) => s + x.discountTotal, 0)

  return (
    <table
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: theme.typography.fontSize.micro,
        marginTop: 8,
      }}
    >
      <thead>
        <tr>
          <th style={thStyle('left')}>カテゴリ</th>
          <th style={thStyle('right')} onClick={() => toggleSort('discountTotal')}>
            売変合計{sortIcon('discountTotal')}
          </th>
          <th style={thStyle('right')} onClick={() => toggleSort('discountRate')}>
            売変率{sortIcon('discountRate')}
          </th>
          <th style={thStyle('right')} onClick={() => toggleSort('share')}>
            構成比{sortIcon('share')}
          </th>
          {hasPrev && (
            <>
              <th style={thStyle('right')}>前年売変</th>
              <th style={thStyle('right')} onClick={() => toggleSort('prevYoyRate')}>
                前年比{sortIcon('prevYoyRate')}
              </th>
              <th style={thStyle('right')} onClick={() => toggleSort('prevDiscountRate')}>
                前年売変率{sortIcon('prevDiscountRate')}
              </th>
            </>
          )}
          {DISCOUNT_TYPES.map((dt) => (
            <th
              key={dt.type}
              style={thStyle('right', dtColors[dt.type])}
              onClick={() => toggleSort(`discount${dt.type}` as SortKey)}
            >
              {dt.label}
              {sortIcon(`discount${dt.type}` as SortKey)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {records.map((r) => {
          const rate = r.salesAmount > 0 ? r.discountTotal / r.salesAmount : 0
          const share = totalDiscount !== 0 ? r.discountTotal / totalDiscount : 0
          const prev = prevByCode.get(r.code)
          const yoyRate =
            prev && prev.discountTotal !== 0
              ? (r.discountTotal - prev.discountTotal) / Math.abs(prev.discountTotal)
              : null
          const prevRate =
            prev && prev.salesAmount > 0 ? prev.discountTotal / prev.salesAmount : null
          return (
            <tr
              key={r.code}
              style={{
                borderBottom: `1px solid ${theme.colors.border}`,
                cursor: NEXT_LEVEL[drill.level] ? 'pointer' : undefined,
              }}
              onDoubleClick={() => {
                const name = r.name || r.code
                const nextLevel = NEXT_LEVEL[drill.level]
                if (!nextLevel) return
                setDrill({
                  level: nextLevel,
                  parentFilter: { column: LEVEL_COLUMN[drill.level], value: name },
                  breadcrumbs: [...drill.breadcrumbs, name],
                })
              }}
            >
              <td style={{ padding: '4px 8px', fontWeight: 600 }}>{r.name || r.code}</td>
              <td style={cellStyle(true)}>{cf.formatWithUnit(r.discountTotal)}</td>
              <td style={cellStyle(true)}>{formatPercent(rate)}</td>
              <td style={cellStyle(true)}>{formatPercent(share)}</td>
              {hasPrev && (
                <>
                  <td style={cellStyle(true, theme.colors.text3)}>
                    {prev ? cf.formatWithUnit(prev.discountTotal) : '—'}
                  </td>
                  <td
                    style={cellStyle(
                      true,
                      yoyRate != null && yoyRate > 0
                        ? theme.colors.palette.dangerDark
                        : theme.colors.palette.successDark,
                    )}
                  >
                    {yoyRate != null ? formatPercent(yoyRate) : '—'}
                  </td>
                  <td style={cellStyle(true, theme.colors.text3)}>
                    {prevRate != null ? formatPercent(prevRate) : '—'}
                  </td>
                </>
              )}
              {DISCOUNT_TYPES.map((dt) => {
                const val =
                  dt.type === '71'
                    ? r.discount71
                    : dt.type === '72'
                      ? r.discount72
                      : dt.type === '73'
                        ? r.discount73
                        : r.discount74
                return (
                  <td
                    key={dt.type}
                    style={cellStyle(true, val !== 0 ? theme.colors.text : theme.colors.text4)}
                  >
                    {val !== 0 ? cf.formatWithUnit(val) : '—'}
                  </td>
                )
              })}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
