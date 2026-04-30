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
| `test-signal-integrity` | project | AAG Test Signal Integrity — 品質シグナル保全と False Green 防止 | [`projects/completed/test-signal-integrity/AI_CONTEXT.md`](../../projects/completed/test-signal-integrity/AI_CONTEXT.md) |
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
| `data-flow-unification` | 2026-04-18 | 前年データフロー統合 — IndexedDB to DuckDB 経路の一本化 | [`projects/completed/data-flow-unification/`](../../projects/completed/data-flow-unification/) |
| `calendar-modal-route-unification` | 2026-04-18 | カレンダーモーダル正規ルート統一 — Phase A handler 統一を実施し B-3 採用で archive。Phase B/C/D は後継 project に移管 | [`projects/completed/calendar-modal-route-unification/`](../../projects/completed/calendar-modal-route-unification/) |
| `calendar-modal-bundle-migration` | 2026-04-18 | カレンダーモーダル bundle 移行 — timeSlotLane 契約拡張 + HourlyChart の bundle 経由化。Phase 3 削除実行は後継 project に移管 | [`projects/completed/calendar-modal-bundle-migration/`](../../projects/completed/calendar-modal-bundle-migration/) |
| `category-leaf-daily-series` | 2026-04-18 | カテゴリ leaf-grain 正本化 — CategoryLeafDailyBundle 新設 + fallback 畳み込み + 旧 helper 物理削除。presentation 32 件 ratchet-down は後継 project に移管 | [`projects/completed/category-leaf-daily-series/`](../../projects/completed/category-leaf-daily-series/) |
| `presentation-cts-surface-ratchetdown` | 2026-04-19 | presentation 層の CategoryTimeSalesRecord 直接 import を 23→0 に ratchet-down。guard 固定モード移行。alias 解除 (独立構造化) は後継 project に移管 | [`projects/completed/presentation-cts-surface-ratchetdown/`](../../projects/completed/presentation-cts-surface-ratchetdown/) |
| `day-detail-modal-prev-year-investigation` | 2026-04-20 | DayDetailModal 前年データ空表示バグ調査 — 候補 D (「全店」モードで frame null) 確定 + fix 実施 (PR #1094) + 本番確認 OK | [`projects/completed/day-detail-modal-prev-year-investigation/`](../../projects/completed/day-detail-modal-prev-year-investigation/) |
| `category-leaf-daily-entry-shape-break` | 2026-04-20 | CategoryLeafDailyEntry 独立構造化 — Phase 1 (intersection + flat field 並行提供) → Phase 2 (field surface guard 新設 / baseline 7) → Phase 3 (4 batches で 48 refs / 7 ファイル flat field 置換) → Phase 4 (intersection → 独立 interface 昇格 / nested field 型レベル消滅) → Phase 5 (field surface guard 固定モード化)。2 層防御 (import surface + field surface 両方 baseline 0 固定) 完成 | [`projects/completed/category-leaf-daily-entry-shape-break/`](../../projects/completed/category-leaf-daily-entry-shape-break/) |
| `chart-color-alignment` | 2026-04-20 | Chart Color Alignment — 前年バー slate 統一 + 売変 71-74 tokenize + 累計率 subtype 追加。theme.ts / tokens.ts / DiscountTrendChart.tsx / v2.1 DS CSS + docs + preview を一貫した 3 層 (palette → ChartSemanticColors → chart component) に整備 | [`projects/completed/chart-color-alignment/`](../../projects/completed/chart-color-alignment/) |
| `design-system-v2-1-asset` | 2026-04-20 | Design System v2.1 外部 documentation layer 配置 — `references/04-design-system/` に 49 ファイル (README / SKILL / docs / preview / ui_kits / assets / CSS) を正本として配置。本体コードは無変更 | [`projects/completed/design-system-v2-1-asset/`](../../projects/completed/design-system-v2-1-asset/) |
| `widget-context-boundary` | 2026-04-25 | widget / ctx 型境界再構築 (SP-A) — UnifiedWidgetContext page-local 剥離 / DashboardWidgetContext 集約 / WidgetDef 2 型分離 / StoreResult・PrevYearData discriminated union 化。chokepoint narrowing パターン確立。SP-B (widget-registry-simplification) 起動条件解除 | [`projects/completed/widget-context-boundary/`](../../projects/completed/widget-context-boundary/) |
| `widget-registry-simplification` | 2026-04-26 | widget registry 簡素化 (SP-B) — 二重 null check 解消 (type narrowing) / full ctx passthrough を Pick props 化 / IIFE を pure selector 抽出 / inline function & palette refs を helper / component 抽出。4 guard fixed mode、LEG-009 sunset。SP-D Wave 3 ADR-D-003 起動条件解除 | [`projects/completed/widget-registry-simplification/`](../../projects/completed/widget-registry-simplification/) |
| `aag-temporal-governance-hardening` | 2026-04-26 | AAG / Temporal Governance 強化 (SP-D) — reviewPolicy 必須化 (BC-6) / allowlist metadata 必須化 (BC-7) / G8-P20 useMemo body fixed mode (上限 20 行、208→20) / @deprecated metadata + lifecycle 監視 (LEG-008 sunset) / generated remediation 追加 / projectDocConsistencyGuard 4 check。5 guard fixed mode 達成 | [`projects/completed/aag-temporal-governance-hardening/`](../../projects/completed/aag-temporal-governance-hardening/) |
| `architecture-debt-recovery` | 2026-04-26 | アーキテクチャ負債回収 umbrella — 4 sub-project (SP-A widget-context-boundary / SP-B widget-registry-simplification / SP-C duplicate-orphan-retirement / SP-D aag-temporal-governance-hardening) 完遂。7 BC + 15 LEG 全達成、14+ guard fixed mode、useMemo body 上限 20 行 fixed。Phase 1-5 inquiry 全 21 ファイル + Phase 6 並列実装 + Phase 7 archive | [`projects/completed/architecture-debt-recovery/`](../../projects/completed/architecture-debt-recovery/) |
| `duplicate-orphan-retirement` | 2026-04-25 | 複製 / orphan 撤退 (SP-C) — byte-identical widgets.tsx 解消 / useCostDetailData 単一正本化 / Tier D orphan + 17a Option A 拡張 cascade 全削除 (BC-5) / barrel metadata 必須化。SP-D Wave 2 ADR-D-004 起動条件解除 | [`projects/completed/duplicate-orphan-retirement/`](../../projects/completed/duplicate-orphan-retirement/) |
| `budget-achievement-simulator` | 2026-04-23 | 予算達成シミュレーター widget reboot — `BudgetSimulatorWidget` を `features/budget/ui/` に実装、`DayDetailModal`/`PeriodDetailModal` shared 化、Dashboard `MonthlyCalendar` 撤去。reboot 過程で surface した widget/ctx 構造負債 7 項目は umbrella `architecture-debt-recovery` が引き継いで体系回収 (SP-A/B/C/D) | [`projects/completed/budget-achievement-simulator/`](../../projects/completed/budget-achievement-simulator/) |
| `canonicalization-domain-consolidation` | 2026-04-29 | 整合性 / 正本化ドメイン統合 — Phase A〜I 完遂で app-domain/integrity に 14 primitive + 13 ペア + 4 KPI を確立。Hard Gate 2 件 (violations / expiredExceptions)、§P8/§P9 selection rule + 撤退規律を institutionalize。後続 project (integrity-framework-evolution) で Phase Q + R-① 部分 + R-⑥ 完遂後に同 session で archive | [`projects/completed/canonicalization-domain-consolidation/`](../../projects/completed/canonicalization-domain-consolidation/) |
| `integrity-framework-evolution` | 2026-04-29 | 整合性 framework 進化 — Phase Q (採用 4 件: AAG_OVERVIEW.md / AAG_CRITICAL_RULES.md / aag-onboarding-path.md / Tier 0-3 schema / guard-failure-playbook.md / AAG_CHANGE_IMPACT template) + R-① 部分 (COVERAGE_MAP shared JSON 化) + R-⑥ (dogfooding refactor) を landing。anti-bloat self-test で 14 → 4 → 6 (Q 採用 4 + R-① 部分 + R-⑥) に 2 段縮小、cut 要素は YAGNI で future work | [`projects/completed/integrity-framework-evolution/`](../../projects/completed/integrity-framework-evolution/) |
| `phased-content-specs-rollout` | 2026-04-30 | Content Spec System 段階展開 — Phase A〜K 全 mechanism 完遂 (89 spec / 310 Behavior Claims / 11 active guard / 60 KPI all OK / 130 file 893 test PASS)、末セッションで 9 件撤回判定 (Phase C 4 / E 2 / F 1 / G 1 / K Option 3) を理由付き strikethrough で記録。dialog で発見された AAG 構造的弱点 (双方向 integrity 不在 + AAG Meta articulation 不在 + drill-down chain semantic 管理不在) は後継 active project `aag-bidirectional-integrity` で根本対策展開中 (PR #1216〜#1221) | [`projects/completed/phased-content-specs-rollout/`](../../projects/completed/phased-content-specs-rollout/) |
| `aag-core-doc-refactor` | 2026-04-30 | AAG Core doc content refactoring + legacy retirement (Project A、親 `aag-bidirectional-integrity` Phase 4 + Phase 5 を Project A〜D 分割で spawn) — Phase 1〜6 全完遂 (6 新 doc Create + Split/Rewrite + CLAUDE.md 67% 薄化 + registry 整合 + 8 旧 doc archive 移管 + 最終レビュー人間承認)。AAG-REQ-LAYER-SEPARATION 達成 trigger landed (新 5 層 mapping table)、責務分離 (6 責務同居 → 4 doc Split) 完遂、149+ inbound update + references/01-principles/ 46→40 + references/99-archive/ 4→12 | [`projects/completed/aag-core-doc-refactor/`](../../projects/completed/aag-core-doc-refactor/) |
| `aag-legacy-retirement` | 2026-04-30 | AAG legacy doc archive 拡張案件 (Project D、親 `aag-bidirectional-integrity` Phase 5 拡張版を Project A〜D 分割で spawn) — **Phase 1 のみで MVP scope 完遂 (case B early scope-out)**。Project A archive 完遂 (`projects/completed/aag-core-doc-refactor/`、commit `cf8d995`) により全 8 旧 AAG Core doc が `references/99-archive/` に移管完了 + 各旧 doc active inbound = 0 のため、本 project が引き受ける拡張案件 = 0 件。Phase 2-4 (Split + Rewrite + 拡張案件 archive 移管 + 物理削除) は scope out。Project E DecisionTrace schema retrospective retrofit candidate として「本 project 自体の存在判断」が typical example | [`projects/completed/aag-legacy-retirement/`](../../projects/completed/aag-legacy-retirement/) |

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
