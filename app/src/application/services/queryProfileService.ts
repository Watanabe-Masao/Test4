/**
 * クエリプロファイルサービス — Application 層の re-export
 *
 * Presentation 層が infrastructure/ を直接 import しないよう、
 * queryProfiler を Application 層経由で公開する。
 */
export { queryProfiler, type QueryProfileEntry } from '@/infrastructure/duckdb/queryProfiler'
