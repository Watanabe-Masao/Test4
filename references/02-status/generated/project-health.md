# Project Health — generated artifact

> **役割: 生成された project KPI 正本（生成後手編集禁止）。**
> 規約: [`references/03-guides/project-checklist-governance.md`](../../03-guides/project-checklist-governance.md)

> 生成: 2026-04-25T16:36:38.237Z

## サマリー

| 指標 | 値 |
|---|---|
| active project 数（archive 未実施を含む） | 10 |
| archived project 数 | 19 |
| in_progress project 数 | 9 |
| checklist 完了済みだが archive 未実施 | 0 |
| checkbox 空 (placeholder / 立ち上げ直後) | 0 |
| collection (continuous, 終わらない) | 1 |
| 全 project の required checkbox 総数 | 813 |
| 全 project の checked checkbox 総数 | 620 |

## projects

| projectId | title | derivedStatus | parent | progress | entrypoint |
|---|---|---|---|---|---|
| `aag-collector-purification` | AAG collector 純化 — 規約と実装の対称性回復 | **archived** | — | 28/28 (100%) | [`projects/completed/aag-collector-purification/AI_CONTEXT.md`](../../../projects/completed/aag-collector-purification/AI_CONTEXT.md) |
| `aag-format-redesign` | AAG フォーマット改修とサブプロジェクト機能 | **archived** | — | — | [`projects/aag-format-redesign/AI_CONTEXT.md`](../../../projects/aag-format-redesign/AI_CONTEXT.md) |
| `aag-rule-splitting-execution` | AAG ルール分割実行 — AR-STRUCT-RESP-SEPARATION 7 分割 | **archived** | — | 17/17 (100%) | [`projects/completed/aag-rule-splitting-execution/AI_CONTEXT.md`](../../../projects/completed/aag-rule-splitting-execution/AI_CONTEXT.md) |
| `aag-temporal-governance-hardening` | AAG / Temporal Governance 強化（SP-D） | **in_progress** | `architecture-debt-recovery` | 15/29 (52%) | [`projects/aag-temporal-governance-hardening/AI_CONTEXT.md`](../../../projects/aag-temporal-governance-hardening/AI_CONTEXT.md) |
| `architecture-debt-recovery` | アーキテクチャ負債回収（widget 起点の大型改修） | **in_progress** | — | 52/73 (71%) | [`projects/architecture-debt-recovery/AI_CONTEXT.md`](../../../projects/architecture-debt-recovery/AI_CONTEXT.md) |
| `architecture-decision-backlog` | アーキテクチャ判断 backlog — 未決定の設計判断 | **archived** | — | 1/1 (100%) | [`projects/completed/architecture-decision-backlog/AI_CONTEXT.md`](../../../projects/completed/architecture-decision-backlog/AI_CONTEXT.md) |
| `budget-achievement-simulator` | 予算達成シミュレーター | **archived** | — | 43/45 (96%) | [`projects/completed/budget-achievement-simulator/AI_CONTEXT.md`](../../../projects/completed/budget-achievement-simulator/AI_CONTEXT.md) |
| `calendar-modal-bundle-migration` | カレンダーモーダル bundle 移行 — timeSlotLane 契約拡張 + HourlyChart の bundle 経由化 | **archived** | — | 18/18 (100%) | [`projects/completed/calendar-modal-bundle-migration/AI_CONTEXT.md`](../../../projects/completed/calendar-modal-bundle-migration/AI_CONTEXT.md) |
| `calendar-modal-route-unification` | カレンダーモーダル正規ルート統一 — useDayDetailPlan の bundle / paired handler 経由化 | **archived** | — | 6/6 (100%) | [`projects/completed/calendar-modal-route-unification/AI_CONTEXT.md`](../../../projects/completed/calendar-modal-route-unification/AI_CONTEXT.md) |
| `category-leaf-daily-entry-shape-break` | CategoryLeafDailyEntry 独立構造化 — alias 解除で presentation を raw 型から完全隔離 (Option B 平坦化) | **archived** | — | — | [`projects/category-leaf-daily-entry-shape-break/AI_CONTEXT.md`](../../../projects/category-leaf-daily-entry-shape-break/AI_CONTEXT.md) |
| `category-leaf-daily-series` | カテゴリ leaf-grain 正本化 — CategoryLeafDailySeries 新設と 3 consumer 載せ替え | **archived** | — | 21/22 (96%) | [`projects/completed/category-leaf-daily-series/AI_CONTEXT.md`](../../../projects/completed/category-leaf-daily-series/AI_CONTEXT.md) |
| `chart-color-alignment` | Chart Color Alignment — 前年バー slate 統一 + 売変 71-74 tokenize | **archived** | — | — | [`projects/chart-color-alignment/AI_CONTEXT.md`](../../../projects/chart-color-alignment/AI_CONTEXT.md) |
| `data-flow-unification` | 前年データフロー統合 — IndexedDB to DuckDB 経路の一本化 | **archived** | — | 21/21 (100%) | [`projects/completed/data-flow-unification/AI_CONTEXT.md`](../../../projects/completed/data-flow-unification/AI_CONTEXT.md) |
| `data-load-idempotency-hardening` | データロード冪等化 — 残存防御の固定化 | **archived** | — | 21/21 (100%) | [`projects/completed/data-load-idempotency-hardening/AI_CONTEXT.md`](../../../projects/completed/data-load-idempotency-hardening/AI_CONTEXT.md) |
| `day-detail-modal-prev-year-investigation` | DayDetailModal 前年データ空表示バグ調査 — 3/5-factor / 時間帯分析 / ドリルダウンが表示されない原因の特定 | **archived** | — | — | [`projects/day-detail-modal-prev-year-investigation/AI_CONTEXT.md`](../../../projects/day-detail-modal-prev-year-investigation/AI_CONTEXT.md) |
| `design-system-v2-1-asset` | Design System v2.1 — 外部 documentation layer 配置 | **archived** | — | — | [`projects/design-system-v2-1-asset/AI_CONTEXT.md`](../../../projects/design-system-v2-1-asset/AI_CONTEXT.md) |
| `docs-and-governance-cohesion` | ドキュメントと課題の分離 — projects/ 一元化と AAG 統合 | **archived** | — | 85/85 (100%) | [`projects/completed/docs-and-governance-cohesion/AI_CONTEXT.md`](../../../projects/completed/docs-and-governance-cohesion/AI_CONTEXT.md) |
| `duplicate-orphan-retirement` | 複製 / orphan 撤退（SP-C） | **in_progress** | `architecture-debt-recovery` | 16/25 (64%) | [`projects/duplicate-orphan-retirement/AI_CONTEXT.md`](../../../projects/duplicate-orphan-retirement/AI_CONTEXT.md) |
| `phase-6-optional-comparison-projection` | Phase 6 optional — comparison subsystem projection context | **archived** | `unify-period-analysis` | 40/40 (100%) | [`projects/completed/phase-6-optional-comparison-projection/AI_CONTEXT.md`](../../../projects/completed/phase-6-optional-comparison-projection/AI_CONTEXT.md) |
| `presentation-cts-surface-ratchetdown` | presentation 層の CategoryTimeSalesRecord 直接 import を 23→0 に ratchet-down | **archived** | — | 18/18 (100%) | [`projects/completed/presentation-cts-surface-ratchetdown/AI_CONTEXT.md`](../../../projects/completed/presentation-cts-surface-ratchetdown/AI_CONTEXT.md) |
| `presentation-quality-hardening` | Presentation 品質強化 — テスト・E2E・active-debt 解消 | **in_progress** | — | 13/16 (81%) | [`projects/presentation-quality-hardening/AI_CONTEXT.md`](../../../projects/presentation-quality-hardening/AI_CONTEXT.md) |
| `pure-calculation-reorg` | Pure 計算責務再編 | **in_progress** | — | 84/113 (74%) | [`projects/pure-calculation-reorg/AI_CONTEXT.md`](../../../projects/pure-calculation-reorg/AI_CONTEXT.md) |
| `quick-fixes` | Quick Fixes — 文脈を必要としない単発作業の集約 | **collection** | — | 5/5 (100%) | [`projects/quick-fixes/AI_CONTEXT.md`](../../../projects/quick-fixes/AI_CONTEXT.md) |
| `responsibility-taxonomy-v2` | 責務分類 v2（子: 責務軸の Schema / Guard / Operations / Legacy 撤退） | **in_progress** | `taxonomy-v2` | 0/43 (0%) | [`projects/responsibility-taxonomy-v2/AI_CONTEXT.md`](../../../projects/responsibility-taxonomy-v2/AI_CONTEXT.md) |
| `taxonomy-v2` | 分類体系 v2（責務軸 + テスト軸の制度化: 親） | **in_progress** | — | 0/21 (0%) | [`projects/taxonomy-v2/AI_CONTEXT.md`](../../../projects/taxonomy-v2/AI_CONTEXT.md) |
| `test-signal-integrity` | AAG Test Signal Integrity — 品質シグナル保全と False Green 防止 | **archived** | — | 35/35 (100%) | [`projects/completed/test-signal-integrity/AI_CONTEXT.md`](../../../projects/completed/test-signal-integrity/AI_CONTEXT.md) |
| `test-taxonomy-v2` | テスト分類 v2（子: テスト軸の Schema / Guard / Operations / Legacy 撤退） | **in_progress** | `taxonomy-v2` | 0/41 (0%) | [`projects/test-taxonomy-v2/AI_CONTEXT.md`](../../../projects/test-taxonomy-v2/AI_CONTEXT.md) |
| `unify-period-analysis` | 期間分析統合（固定期間を自由期間プリセットに） | **archived** | — | 57/57 (100%) | [`projects/completed/unify-period-analysis/AI_CONTEXT.md`](../../../projects/completed/unify-period-analysis/AI_CONTEXT.md) |
| `widget-context-boundary` | widget / ctx 型境界再構築（SP-A） | **in_progress** | `architecture-debt-recovery` | 24/33 (73%) | [`projects/widget-context-boundary/AI_CONTEXT.md`](../../../projects/widget-context-boundary/AI_CONTEXT.md) |
