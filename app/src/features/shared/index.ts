/**
 * features/shared — 複数スライスが使う共通基盤
 *
 * DuckDB エンジン管理、共通 UI パーツ、計算コアユーティリティ、
 * 共通型定義などを配置する。
 *
 * 原則:
 *   - shared/ は features/* から参照される（逆方向は禁止）
 *   - 既存の domain/, application/, infrastructure/, presentation/ から
 *     段階的に移行する
 *
 * @responsibility R:unclassified
 */

// 段階的に移行。現時点では空。
