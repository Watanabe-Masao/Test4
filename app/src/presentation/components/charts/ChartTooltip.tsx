/**
 * 共通チャート Tooltip コンポーネント
 *
 * Recharts の <Tooltip content={...} /> に渡すカスタムコンテンツ。
 * - styled-components でテーマ対応（ダーク/ライト自動切替）
 * - カラードット付きの統一レイアウト
 * - formatter / labelFormatter を統一インターフェースで提供
 *
 * ポジショニングは Recharts が担当するため、このコンポーネントは描画のみ。
 */
import { memo } from 'react'
import styled from 'styled-components'
import type { ChartTheme } from './chartTheme'

// ── 型定義 ──

interface PayloadEntry {
  name: string
  value: unknown
  color?: string
  dataKey?: string | number
  /** recharts が注入する元データ行（BarChart の data 配列の該当要素） */
  payload?: Record<string, unknown>
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
  labelFormatter?: (
    label: string | number | undefined,
    payload?: readonly PayloadEntry[],
  ) => string
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
  max-width: 320px;
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

// ── コンポーネント ──

export const ChartTooltip = memo(function ChartTooltip({
  active,
  payload,
  label,
  ct,
  formatter,
  labelFormatter,
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

        return (
          <Row key={`${name}-${i}`}>
            {entry.color && <Dot $color={entry.color} />}
            <Name>{displayName}</Name>
            <Value>{displayValue ?? '-'}</Value>
          </Row>
        )
      })}
    </Wrapper>
  )
})

/**
 * ChartTooltip のファクトリ。Recharts の content prop に直接渡せる形で返す。
 *
 * @example
 * <Tooltip content={createChartTooltip({ ct, formatter, labelFormatter })} />
 */
export function createChartTooltip(opts: {
  ct: ChartTheme
  formatter?: ChartTooltipProps['formatter']
  labelFormatter?: ChartTooltipProps['labelFormatter']
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
      />
    )
  }
}
