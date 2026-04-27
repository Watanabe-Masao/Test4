/**
 * クエリプロファイルサービス — Application 層の公開 API
 *
 * Presentation 層向けに queryProfiler を公開する。
 * 実体は同層の QueryProfiler.ts に配置済み（infrastructure 依存なし）。
 *
 * @responsibility R:unclassified
 */
export { queryProfiler, type QueryProfileEntry } from './QueryProfiler'
