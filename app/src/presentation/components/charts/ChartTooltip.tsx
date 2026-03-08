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
import type { ChartTheme } from './chartTheme'
import { toPct } from './chartTheme'
import { Wrapper, Label, Row, Dot, Name, Value, TrendBadge } from './ChartTooltip.styles'

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
