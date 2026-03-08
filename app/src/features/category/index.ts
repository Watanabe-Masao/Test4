/**
 * features/category — カテゴリ構造分析スライス
 *
 * PI-CVマップ、CV時系列、ベンチマークなどカテゴリ分析の縦スライス。
 * 内部に4層（presentation → application → domain ← infrastructure）を持つ。
 *
 * 原則:
 *   - 他の features/* への直接依存は禁止（shared/ 経由のみ）
 *   - 既存コードの移行は改修タイミングで段階的に行う
 *   - バレル re-export で後方互換を維持
 */

// 段階的に移行。現時点では空。
// 新規カテゴリ機能はこのスライス内に作成する。
