/**
 * ComparisonWindow — 比較期間の型安全な表現
 *
 * isPrevYear ベースの boolean 契約から、意味を持つ Window 型に移行する。
 * 各 Window 型は比較の種類（YoY/WoW/同曜日/カスタム）を明示的に表現し、
 * 日付範囲の起点・対応関係を型として保持する。
 *
 * @responsibility R:unclassified
 */
import type { DateRange } from '@/domain/models/CalendarDate'

/** 比較期間の基底型 */
interface BaseComparisonWindow {
  /** 比較元（当期）の日付範囲 */
  readonly current: DateRange
  /** 比較先の日付範囲 */
  readonly target: DateRange
}

/** 前年同月比較（Year-over-Year） */
export interface YoYWindow extends BaseComparisonWindow {
  readonly kind: 'yoy'
  /** 曜日アラインメントの日数オフセット（0 = 同日比較） */
  readonly dowOffset: number
}

/** 前週比較（Week-over-Week） */
export interface WoWWindow extends BaseComparisonWindow {
  readonly kind: 'wow'
}

/** フォールバック付き比較 — isPrevYear=true で取得失敗時に isPrevYear=false で再取得 */
export interface FallbackAwareWindow extends BaseComparisonWindow {
  readonly kind: 'fallback-aware'
  /** 一次取得で isPrevYear=true を使用するか */
  readonly preferPrevYear: true
}

/** 比較なし（単一期間） */
export interface SingleWindow {
  readonly kind: 'single'
  readonly current: DateRange
}

/** 全比較 Window のユニオン型 */
export type ComparisonWindow = YoYWindow | WoWWindow | FallbackAwareWindow | SingleWindow

/** Window の種類判定ヘルパー */
export function isComparisonWindow(
  w: ComparisonWindow,
): w is YoYWindow | WoWWindow | FallbackAwareWindow {
  return w.kind !== 'single'
}
