/**
 * 共通チャート Tooltip コンポーネント
 *
 * Recharts の <Tooltip content={...} /> に渡すカスタムコンテンツ。
 * - styled-components でテーマ対応（ダーク/ライト自動切替）
 * - カラードット付きの統一レイアウト
 * - formatter / labelFormatter を統一インターフェースで提供
 * - オプションのトレンドバッジ（前年比 ↑↓ 表示）
 *
 * ポジショニングは Recharts が担当するため、このコンポーネントは描画のみ。
 */
import { memo } from 'react'
import styled from 'styled-components'
import type { ChartTheme } from './chartTheme'
import { toPct } from './chartTheme'

// ── 型定義 ──

interface PayloadEntry {
  name: string
  value: unknown
  color?: string
  dataKey?: string | number
  /** recharts が注入する元データ行（BarChart の data 配列の該当要素） */
  payload?: Record<string, unknown>
}

/** トレンドバッジの情報 */
export interface TrendInfo {
  /** 前年比（1.0 = 100%、1.05 = +5%） */
  ratio: number
  /** 表示ラベル（省略時は自動生成: "前年比 +5.0%"） */
  label?: string
}

export interface ChartTooltipProps {
  /** Recharts が注入する props */
  active?: boolean
  payload?: readonly PayloadEntry[]
  label?: string | number
  /** ChartTheme インスタンス */
  ct: ChartTheme
  /** 値のフォーマット: (value, name, entry) => [表示値, 表示名] 。null,null を返すと行を非表示 */
  formatter?: (
    value: unknown,
    name: string,
    entry: PayloadEntry,
  ) => readonly [string | null, string | null]
  /** ラベル（X軸値）のフォーマット。payload を受け取るオーバーロードも可 */
  labelFormatter?: (label: string | number | undefined, payload?: readonly PayloadEntry[]) => string
  /**
   * 各データ系列のトレンド情報を返すコールバック。
   * name をキーに TrendInfo を返すと、値の横にトレンドバッジを表示する。
   */
  trendResolver?: (name: string, entry: PayloadEntry) => TrendInfo | null
}

// ── スタイル ──

const Wrapper = styled.div<{ $ct: ChartTheme }>`
  background: ${(p) => p.$ct.bg2};
  border: 1px solid ${(p) => p.$ct.grid};
  border-radius: 8px;
  padding: 8px 12px;
  font-size: ${(p) => p.$ct.fontSize.sm}px;
  font-family: ${(p) => p.$ct.fontFamily};
  color: ${(p) => p.$ct.text};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  pointer-events: none;
  max-width: 360px;
`

const Label = styled.div`
  font-weight: 600;
  margin-bottom: 4px;
  white-space: nowrap;
`

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 1px 0;
  white-space: nowrap;
`

const Dot = styled.span<{ $color: string }>`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${(p) => p.$color};
  flex-shrink: 0;
`

const Name = styled.span`
  flex: 1;
  opacity: 0.8;
`

const Value = styled.span`
  font-family: ${(p) => p.theme.typography?.fontFamily?.mono ?? 'monospace'};
  font-weight: 500;
`

const TrendBadge = styled.span<{ $positive: boolean; $ct: ChartTheme }>`
  font-size: ${(p) => p.$ct.fontSize.xs}px;
  font-weight: 600;
  padding: 0 4px;
  border-radius: 3px;
  margin-left: 4px;
  background: ${(p) => (p.$positive ? p.$ct.colors.success : p.$ct.colors.danger)}20;
  color: ${(p) => (p.$positive ? p.$ct.colors.success : p.$ct.colors.danger)};
`

// ── コンポーネント ──

export const ChartTooltip = memo(function ChartTooltip({
  active,
  payload,
  label,
  ct,
  formatter,
  labelFormatter,
  trendResolver,
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null

  const displayLabel = labelFormatter ? labelFormatter(label, payload) : label

  return (
    <Wrapper $ct={ct}>
      {displayLabel != null && <Label>{String(displayLabel)}</Label>}
      {payload.map((entry, i) => {
        const name = String(entry.name)
        let displayValue: string | null = entry.value != null ? String(entry.value) : '-'
        let displayName: string | null = name

        if (formatter) {
          const [fmtVal, fmtName] = formatter(entry.value, name, entry)
          if (fmtVal === null && fmtName === null) return null
          displayValue = fmtVal
          displayName = fmtName
        }

        const trend = trendResolver ? trendResolver(name, entry) : null

        return (
          <Row key={`${name}-${i}`}>
            {entry.color && <Dot $color={entry.color} />}
            <Name>{displayName}</Name>
            <Value>{displayValue ?? '-'}</Value>
            {trend && (
              <TrendBadge $positive={trend.ratio >= 1} $ct={ct}>
                {trend.label ?? formatTrend(trend.ratio)}
              </TrendBadge>
            )}
          </Row>
        )
      })}
    </Wrapper>
  )
})

/** 前年比をトレンドバッジ用テキストに変換 */
function formatTrend(ratio: number): string {
  const diff = ratio - 1
  const arrow = diff >= 0 ? '\u2191' : '\u2193'
  return `${arrow}${toPct(Math.abs(diff), 1)}`
}

/**
 * ChartTooltip のファクトリ。Recharts の content prop に直接渡せる形で返す。
 *
 * @example
 * <Tooltip content={createChartTooltip({ ct, formatter, labelFormatter })} />
 *
 * // トレンド付き
 * <Tooltip content={createChartTooltip({
 *   ct,
 *   formatter: ...,
 *   trendResolver: (name, entry) => {
 *     const prev = entry.payload?.prevYearSales as number | undefined
 *     const cur = entry.value as number
 *     if (prev && prev > 0) return { ratio: cur / prev }
 *     return null
 *   },
 * })} />
 */
export function createChartTooltip(opts: {
  ct: ChartTheme
  formatter?: ChartTooltipProps['formatter']
  labelFormatter?: ChartTooltipProps['labelFormatter']
  trendResolver?: ChartTooltipProps['trendResolver']
}) {
  return function ChartTooltipContent(props: Record<string, unknown>) {
    return (
      <ChartTooltip
        active={props.active as boolean}
        payload={props.payload as readonly PayloadEntry[]}
        label={props.label as string | number}
        ct={opts.ct}
        formatter={opts.formatter}
        labelFormatter={opts.labelFormatter}
        trendResolver={opts.trendResolver}
      />
    )
  }
}
