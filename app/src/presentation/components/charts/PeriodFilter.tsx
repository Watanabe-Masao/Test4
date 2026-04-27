/**
 * PeriodFilter — 期間・集計モード制御 UI コンポーネント
 *
 * フック (usePeriodFilter, useHierarchyDropdown) は periodFilterHooks.ts に分離。
 * 型・純粋関数は periodFilterUtils.ts に分離。
 *
 * @guard B1 Authoritative 計算は domain/calculations のみ
 * @guard C2 pure function は1仕様軸に閉じる
 * @see divisorRules.test.ts
 *
 * ═══════════════════════════════════════════════════════════
 * ## 設計ルール（破ってはいけない原則）
 * ═══════════════════════════════════════════════════════════
 *
 * 以下のルールは全チャートコンポーネントに適用される。
 * 違反はアーキテクチャガードテスト（divisorRules.test.ts）で検出される。
 *
 * ### RULE-1: 除数は必ず computeDivisor() を経由する
 *
 * 平均計算の除数は `computeDivisor(distinctDayCount, mode)` で算出する。
 * インラインで `mode === 'total' ? 1 : (days.size > 0 ? days.size : 1)`
 * のような独自実装を書いてはいけない。
 *
 * ### RULE-2: 除数はカレンダーではなく実データから算出する
 *
 * カレンダー上の日数（28日、月曜4回等）ではなく、フィルタ適用後の
 * レコードに実際に存在する distinct day 数を使う。
 *
 * ### RULE-3: 当年と前年の除数は独立して算出する
 *
 * 前年比較では当年・前年それぞれの実データ日数から個別に除数を算出する。
 *
 * ### RULE-4: 0除算は computeDivisor が防止する
 *
 * 個別の `Math.max(x, 1)` や `x || 1` ガードは不要。
 *
 * ### RULE-5: 店舗フィルタは filterByStore() を経由する
 *
 * ### RULE-6: 計算変数は一元管理された純粋関数を経由する
 *
 * @see periodFilterHooks.ts — usePeriodFilter, useHierarchyDropdown
 * @see periodFilterUtils.ts — 純粋関数群
 * @see divisorRules.test.ts — アーキテクチャガードテスト
 * @see PeriodFilter.test.ts — 技術ルール準拠テスト
 * @responsibility R:unclassified
 */
import { memo } from 'react'
import type { AggregateMode } from './periodFilterUtils'
import type { PeriodFilterResult, HierarchyFilterResult } from './periodFilterHooks'
import {
  Bar,
  Label,
  RangeValue,
  SliderInput,
  TabGroup,
  Tab,
  Sep,
  DowToggle,
  WarningLabel,
  FilterSelect,
  DropdownRow,
  DropdownLabel,
} from './PeriodFilter.styles'

// Type-only re-exports (don't trigger react-refresh warning)
export type { AggregateMode } from './periodFilterUtils'
export type {
  PeriodFilterState,
  PeriodFilterResult,
  HierarchyFilterState,
  HierarchyFilterResult,
} from './periodFilterHooks'

/* ── Component ──────────────────────────────────────────── */

interface PeriodFilterBarProps {
  pf: PeriodFilterResult
  daysInMonth: number
  /** 取込データ有効期間（経過日数）。超過時に警告表示 */
  elapsedDays?: number
}

const MODE_LABELS: Record<AggregateMode, string> = {
  total: '期間合計',
  dailyAvg: '日平均',
  dowAvg: '曜日別平均',
}

const DOW_LABELS_FILTER = ['日', '月', '火', '水', '木', '金', '土'] as const

export const PeriodFilterBar = memo(function PeriodFilterBar({
  pf,
  daysInMonth,
  elapsedDays,
}: PeriodFilterBarProps) {
  const isDefault = pf.dayRange[0] === 1 && pf.dayRange[1] === pf.defaultEndDay
  const exceedsValidPeriod = elapsedDays != null && elapsedDays > 0 && pf.dayRange[1] > elapsedDays

  return (
    <Bar>
      <Label>期間</Label>
      <SliderInput
        type="range"
        min={1}
        max={daysInMonth}
        value={pf.dayRange[0]}
        onChange={(e) => {
          const v = Number(e.target.value)
          pf.setDayRange([Math.min(v, pf.dayRange[1]), pf.dayRange[1]])
        }}
      />
      <RangeValue>
        {pf.dayRange[0]}日 〜 {pf.dayRange[1]}日
      </RangeValue>
      <SliderInput
        type="range"
        min={1}
        max={daysInMonth}
        value={pf.dayRange[1]}
        onChange={(e) => {
          const v = Number(e.target.value)
          pf.setDayRange([pf.dayRange[0], Math.max(v, pf.dayRange[0])])
        }}
      />
      {!isDefault && (
        <Tab $active={false} onClick={pf.resetToDefault} style={{ fontSize: '0.55rem' }}>
          リセット
        </Tab>
      )}
      {exceedsValidPeriod && <WarningLabel>{elapsedDays}日以降はデータなし</WarningLabel>}
      <Sep />
      <TabGroup>
        {(['total', 'dailyAvg', 'dowAvg'] as AggregateMode[]).map((m) => (
          <Tab key={m} $active={pf.mode === m} onClick={() => pf.setMode(m)}>
            {MODE_LABELS[m]}
          </Tab>
        ))}
      </TabGroup>
      {pf.mode === 'dowAvg' && (
        <>
          <Sep />
          <Label>曜日</Label>
          <TabGroup>
            {DOW_LABELS_FILTER.map((label, dow) => (
              <DowToggle
                key={dow}
                $active={pf.selectedDows.has(dow)}
                $isSun={dow === 0}
                $isSat={dow === 6}
                onClick={() => pf.toggleDow(dow)}
                title={`${label}曜日${pf.selectedDows.has(dow) ? 'を除外' : 'を選択'}`}
              >
                {label}
              </DowToggle>
            ))}
          </TabGroup>
        </>
      )}
    </Bar>
  )
})

/* ── HierarchyDropdowns UI ─────────────────────────────── */

interface HierarchyDropdownsProps {
  hf: HierarchyFilterResult
  /** 表示する階層 (デフォルト: 全て) */
  levels?: ('dept' | 'line' | 'klass')[]
}

export function HierarchyDropdowns({
  hf,
  levels = ['dept', 'line', 'klass'],
}: HierarchyDropdownsProps) {
  const showDept = levels.includes('dept') && hf.departments.length > 1
  const showLine = levels.includes('line') && hf.lines.length > 1
  const showKlass = levels.includes('klass') && hf.klasses.length > 1
  if (!showDept && !showLine && !showKlass) return null

  return (
    <DropdownRow>
      <DropdownLabel>絞込</DropdownLabel>
      {showDept && (
        <FilterSelect value={hf.deptCode} onChange={(e) => hf.setDeptCode(e.target.value)}>
          <option value="">全部門</option>
          {hf.departments.map((d) => (
            <option key={d.code} value={d.code}>
              {d.name}
            </option>
          ))}
        </FilterSelect>
      )}
      {showLine && (
        <FilterSelect value={hf.lineCode} onChange={(e) => hf.setLineCode(e.target.value)}>
          <option value="">全ライン</option>
          {hf.lines.map((l) => (
            <option key={l.code} value={l.code}>
              {l.name}
            </option>
          ))}
        </FilterSelect>
      )}
      {showKlass && (
        <FilterSelect value={hf.klassCode} onChange={(e) => hf.setKlassCode(e.target.value)}>
          <option value="">全クラス</option>
          {hf.klasses.map((k) => (
            <option key={k.code} value={k.code}>
              {k.name}
            </option>
          ))}
        </FilterSelect>
      )}
    </DropdownRow>
  )
}
