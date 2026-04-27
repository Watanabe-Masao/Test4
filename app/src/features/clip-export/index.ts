/**
 * features/clip-export — クリップボードエクスポートスライス
 *
 * ダッシュボード画面の HTML クリップボードエクスポート機能を含む。
 * 外部からの参照はこの barrel 経由のみ許可。
 *
 * 原則:
 *   - 他の features/* への直接依存は禁止（shared/ 経由のみ）
 *   - 実体ファイルは段階的に移行（既存パスからの re-export で後方互換維持）
 *
 * @responsibility R:unclassified
 */

// ─── Application（hooks / usecases） ──────────────────
export { useClipExport, buildClipBundle, downloadClipHtml, useClipExportPlan } from './application'
export type {
  BuildClipBundleParams,
  ClipExportPlanInput,
  ClipExportPlanResult,
} from './application'
