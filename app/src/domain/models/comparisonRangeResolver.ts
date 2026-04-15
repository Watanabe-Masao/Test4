/**
 * comparisonRangeResolver — 比較先 DateRange の唯一の resolver
 *
 * unify-period-analysis Phase 2: presentation / VM / chart で比較先日付を
 * 独自計算することを禁止し、全ての比較先解決を本モジュールに集約する。
 *
 * ## 設計原則
 *
 * - **入力**: 当期 DateRange + mode（wow / yoy）+ dowOffset + (wow の場合) WoW 範囲
 * - **出力**: 比較先 DateRange + provenance（mappingKind / dowOffset / fallbackApplied）
 * - **純粋関数**: React hooks / store / side effect を一切持たない
 * - **唯一性**: presentation 配下で `new Date(year - 1, ...)` 等の比較先日付計算を
 *   行うことを `freePeriodPathGuard` で機械的に禁止し、本モジュールを唯一の
 *   解決経路にする
 *
 * ## なぜ ComparisonScope の effectivePeriod2 を直接使わないか
 *
 * `ComparisonScope` (`buildComparisonScope`) は **PeriodSelection 全体** に
 * 対する scope を構築するため、period1 全体（例: 月初〜月末）が前提になる。
 * 一方で widget は `dayStart..dayEnd` のような **サブ範囲** を表示することが
 * あり、その場合は scope ではなくサブ範囲に対する比較先解決が必要になる。
 * 本 resolver はその「サブ範囲 → 比較先サブ範囲」変換を担う。
 *
 * dowOffset と alignmentMode の意味論は `ComparisonScope` から導出された値を
 * そのまま受け取るため、scope の resolution と **意味的に等価** であることが
 * 保証される（同じ dowOffset を共有するため）。
 *
 * @see references/01-principles/temporal-scope-semantics.md
 * @see app/src/domain/models/ComparisonScope.ts buildComparisonScope
 */
import type { DateRange } from '@/domain/models/CalendarDate'

/**
 * 比較解決モード。
 *
 * - `wow` (week-over-week): 当期を -7 日シフト
 * - `yoy` (year-over-year): -1 年 + dowOffset シフト（dowOffset == 0 なら sameDate、
 *   != 0 なら sameDayOfWeek）
 */
export type ComparisonResolutionMode = 'wow' | 'yoy'

/**
 * 比較先 DateRange の由来情報（provenance）。
 *
 * Phase 2: presentation 層が「どの mode・どの mapping で導出されたか」を
 * 出力に持たせることを必須化する。
 */
export interface ComparisonRangeProvenance {
  /** mode 名 */
  readonly mode: ComparisonResolutionMode
  /** 日付対応の種別 */
  readonly mappingKind: 'sameDate' | 'sameDayOfWeek' | 'previousWeek'
  /** sameDayOfWeek の dowOffset（sameDate / previousWeek なら 0） */
  readonly dowOffset: number
  /**
   * fallback が発生したか。現状は wow が canWoW=false で利用不可だった場合に
   * true（呼び出し側は yoy にフォールバックする）。yoy / sameDayOfWeek は
   * 常に false（domain の Date 演算で月跨ぎ・閏年を吸収するため fallback が
   * 概念的に発生しない）。
   */
  readonly fallbackApplied: boolean
}

/**
 * 比較先 DateRange の解決結果。
 */
export interface ComparisonRangeResult {
  /** 解決された比較先範囲。利用不可 (canWoW=false) なら undefined */
  readonly range: DateRange | undefined
  /** 由来情報。range が undefined のときは null */
  readonly provenance: ComparisonRangeProvenance | null
}

/**
 * 比較先 DateRange resolver の入力。
 */
export interface ResolveComparisonRangeInput {
  readonly mode: ComparisonResolutionMode
  /** 当期の年 */
  readonly year: number
  /** 当期の月 */
  readonly month: number
  /** 当期サブ範囲の開始日 */
  readonly dayStart: number
  /** 当期サブ範囲の終了日 */
  readonly dayEnd: number
  /** sameDayOfWeek 用の曜日オフセット (0-6)。sameDate なら 0 */
  readonly dowOffset: number
  /** wow が利用可能か（canWoW=false なら mode==='wow' でも undefined を返す） */
  readonly canWoW: boolean
  /** wow 時の前週開始日（同月内日数） */
  readonly wowPrevStart: number
  /** wow 時の前週終了日（同月内日数） */
  readonly wowPrevEnd: number
}

/**
 * 比較先 DateRange を解決する。
 *
 * 月跨ぎ・2月末・閏年は Date 演算で正しく処理される。
 * 結果には provenance が必ず付与される。
 */
export function resolveComparisonRange(input: ResolveComparisonRangeInput): ComparisonRangeResult {
  const { mode, year, month, dayStart, dayEnd, dowOffset, canWoW, wowPrevStart, wowPrevEnd } = input

  if (mode === 'wow') {
    if (!canWoW) {
      return {
        range: undefined,
        provenance: {
          mode: 'wow',
          mappingKind: 'previousWeek',
          dowOffset: 0,
          fallbackApplied: true,
        },
      }
    }
    return {
      range: {
        from: { year, month, day: wowPrevStart },
        to: { year, month, day: wowPrevEnd },
      },
      provenance: {
        mode: 'wow',
        mappingKind: 'previousWeek',
        dowOffset: 0,
        fallbackApplied: false,
      },
    }
  }

  // yoy: -1 年 + dowOffset（Date 演算で月跨ぎ・閏年を正しく処理）
  const fromDate = new Date(year - 1, month - 1, dayStart + dowOffset)
  const toDate = new Date(year - 1, month - 1, dayEnd + dowOffset)
  return {
    range: {
      from: {
        year: fromDate.getFullYear(),
        month: fromDate.getMonth() + 1,
        day: fromDate.getDate(),
      },
      to: {
        year: toDate.getFullYear(),
        month: toDate.getMonth() + 1,
        day: toDate.getDate(),
      },
    },
    provenance: {
      mode: 'yoy',
      mappingKind: dowOffset === 0 ? 'sameDate' : 'sameDayOfWeek',
      dowOffset,
      fallbackApplied: false,
    },
  }
}

/**
 * 当期の年月から、dowOffset を加味した「前年同曜日マッピングの開始 dateKey」
 * を導出する。
 *
 * - presentation 層の chart 配置補助（例: weather mapping の月跨ぎ補正）に使う
 * - dowOffset == 0 のときは undefined（補正不要）を返す
 *
 * `DailySalesChartBodyLogic.deriveCompStartDateKey()` の正本実装。
 */
export function deriveSameDowStartDateKey(
  year: number | undefined,
  month: number | undefined,
  dowOffset: number,
): string | undefined {
  if (dowOffset === 0 || year == null || month == null) return undefined
  const day = 1 + dowOffset
  const d = new Date(year - 1, month - 1, day)
  const yk = d.getFullYear()
  const mk = String(d.getMonth() + 1).padStart(2, '0')
  const dk = String(d.getDate()).padStart(2, '0')
  return `${yk}-${mk}-${dk}`
}
