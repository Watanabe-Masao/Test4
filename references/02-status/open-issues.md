# active projects 索引

> 役割: live な作業項目の索引（**索引のみ。task table は持たない**）。
> 残作業の正本は `projects/<id>/checklist.md`。
>
> 「未完了の課題はこちらへ」という導線を repo 全体の入口として提供する。
> 各 project の完了状態は AAG project-checklist collector が動的に判定する
> （詳細: `references/03-guides/project-checklist-governance.md`）。

## active projects

| projectId | kind | title | entrypoint |
|---|---|---|---|
| `presentation-quality-hardening` | project | Presentation 品質強化 — テスト・E2E・active-debt 解消 | [`projects/presentation-quality-hardening/AI_CONTEXT.md`](../../projects/presentation-quality-hardening/AI_CONTEXT.md) |
| `pure-calculation-reorg` | project | Pure 計算責務再編（Phase 8 以降） | [`projects/pure-calculation-reorg/AI_CONTEXT.md`](../../projects/pure-calculation-reorg/AI_CONTEXT.md) |
| `test-signal-integrity` | project | AAG Test Signal Integrity — 品質シグナル保全と False Green 防止 | [`projects/test-signal-integrity/AI_CONTEXT.md`](../../projects/test-signal-integrity/AI_CONTEXT.md) |
| `quick-fixes` | collection | Quick Fixes — 文脈を必要としない単発作業の集約 | [`projects/quick-fixes/AI_CONTEXT.md`](../../projects/quick-fixes/AI_CONTEXT.md) |

## archived projects

| projectId | archived at | title | location |
|---|---|---|---|
| `docs-and-governance-cohesion` | 2026-04-12 | ドキュメントと課題の分離 — projects/ 一元化と AAG 統合 | [`projects/completed/docs-and-governance-cohesion/`](../../projects/completed/docs-and-governance-cohesion/) |
| `data-load-idempotency-hardening` | 2026-04-12 | データロード冪等化 — 残存防御の固定化 | [`projects/completed/data-load-idempotency-hardening/`](../../projects/completed/data-load-idempotency-hardening/) |
| `aag-collector-purification` | 2026-04-13 | AAG collector 純化 — 規約と実装の対称性回復 | [`projects/completed/aag-collector-purification/`](../../projects/completed/aag-collector-purification/) |
| `aag-rule-splitting-execution` | 2026-04-13 | AAG ルール分割実行 — AR-STRUCT-RESP-SEPARATION 7 分割 | [`projects/completed/aag-rule-splitting-execution/`](../../projects/completed/aag-rule-splitting-execution/) |
| `architecture-decision-backlog` | 2026-04-13 | アーキテクチャ判断 backlog — ロールシステム軽量化方針を (c) 現状維持で決定 | [`projects/completed/architecture-decision-backlog/`](../../projects/completed/architecture-decision-backlog/) |
| `aag-format-redesign` | 2026-04-14 | AAG フォーマット改修とサブプロジェクト機能 — overlay defaults / derived template / subproject P1 | [`projects/completed/aag-format-redesign/`](../../projects/completed/aag-format-redesign/) |

## 課題発見時のフロー

新しい課題を見つけたとき:

1. **既存 project に該当するか？** → 該当 project の `checklist.md` に新規
   checkbox を追加する
2. **どの project にも該当しないか？** → 新しい project を立てる
   （`references/03-guides/project-checklist-governance.md` §4 のスキーマに従う）
3. **判断が必要なだけか？** → `architecture-decision-backlog/checklist.md` に
   「判断主体・期限・関連文書」を明記して追加する

## 解決済みの課題（参考）

> 以下は対応完了済みの履歴。参考情報として残す。**live ではない。**

| # | 課題 | 解決日 | 対応内容 |
|---|---|---|---|
| C-2 | @deprecated ファイル数が上限超過 | 2026-04 | KNOWN_DEPRECATED 5 件 = 上限 5 件で固定 |
| R-1 | Application→Infrastructure 直接 import | 2026-04 | 13→1 (FileImportService のみ) まで削減 |
| R-4 | 肥大化コンポーネント（500行超）の主要 5 件のうち 2 件 | 2026-04 | IntegratedSalesChart 588→403 / StorageManagementTab 547→126 |
| R-6 | FileImportService.ts (632行) | 2026-03 | 632→194 行に縮小 |
| R-7 | サブバレル移行未完了 | 2026-03 | 一括移行完了 + ガードテスト追加 |
| R-8 | null/0 棲み分け | 2026-03 | UI 改善完了 |
| R-10 | DualPeriodSlider 個別管理 | 2026-03 | 全 11 チャートから内蔵 Slider 削除、ページレベル統合 |
| — | WASM 全 5 engine authoritative 昇格 | 2026-04-05 | bridge 簡素化（計 1,426→431 行）、dual-run infrastructure 全面退役（~5,500 行削減） |
| — | ComparisonWindow 契約型 | 2026-04-05 | useTimeSlotPlan / useClipExportPlan に provenance 導入 |
| — | active-debt 33→1 (verified 2026-04-12) | 2026-04 | features/ 移動と allowlist 卒業で 32 件削減（残 1 件は `projects/presentation-quality-hardening` Phase 1） |
| — | idempotent load contract | 2026-04 | Phase 0-3 + PR A-E で構造的に冪等化 + FRAGILE 1/2/6 SAFE 化 + FRAGILE 3/4/5 は Option A で永続確定 (2026-04-12, project archive) |
| R-9 | ロールシステム軽量化の方針 | 2026-04-13 | (c) 現状維持を決定。AAG コア信頼性回復 (v5.2) 完了時点でロール定義が摩擦源になっている観測事実がなく、再検討は具体的な摩擦が観測されたときに行う |

歴史的詳細は `references/02-status/recent-changes.md` を参照。
