/**
 * クエリフック群（集約は SQL、統計計算は JS）— バレル re-export
 *
 * 分割先:
 * - useJsFeatureQueries.ts: 統計計算（曜日パターン、日別特徴量）
 * - useJsSalesCompQueries.ts: 売上比較（日別累積、前年比較、時間帯別）
 */
export { useRawSummaryRows, useJsDowPattern, useJsDailyFeatures } from './useJsFeatureQueries'
export { useJsDailyCumulative, useJsYoyDaily, useJsHourlyProfile } from './useJsSalesCompQueries'
