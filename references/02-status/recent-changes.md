# 直近の主要変更（#673-#848+）

> 更新日: 2026-04-13
>
> **役割分担:** 本ドキュメントは内部向けの詳細変更記録。
> リリース単位の要約は `CHANGELOG.md` を参照。
> 同じ内容を二重管理しないこと。

## v1.10.0 — AAG 5.2 Collector-Governance Symmetry（2026-04-13）

### 概要

AAG 5.1 で確立した「checklist driven completion 管理」の**規約と実装の非対称**
を解消する。collector (`project-checklist-collector.ts::countCheckboxes`) が
「やってはいけないこと」「常時チェック」「最重要項目」の見出し配下を正規表現で
除外していた一方、governance §3 はこれらの項目を checklist に書かないと定めて
いた。つまり collector は「書かれることを前提に除外する」設計で、規約と実装が
逆向きだった。project: `aag-collector-purification` として独立プランで実行。

### 主な成果物

- **pure-calculation-reorg/checklist.md の純化** — Phase 内の「やってはいけないこと」
  19 件、ファイル末尾の「常時チェック」6 件、「4つだけ毎回見る最重要項目」4 件を
  `plan.md` の新設「Phase 別禁止事項テーブル」および Phase 11 セクション、
  `CONTRIBUTING.md` の「PR 作成前のローカル確認」にそれぞれ移動。Phase 0-11 の
  達成条件 checkbox 状態 (`[x]`/`[ ]`) は一切変更していない
- **checklistFormatGuard の strict 化** — `FORMAT_EXEMPT_PROJECT_IDS` を空集合に
  設定。F3/F4/F5 を全 live project に適用
- **project-checklist-collector の heading 抑制削除** — `countCheckboxes` から
  見出し正規表現マッチによる除外ロジックを削除。「format guard が通る範囲 =
  collector が集計する範囲」という対称性を回復
- **checklistGovernanceSymmetryGuard 新設** — S1/S2/S3 で禁止見出しそのものの
  存在を検出。規約と実装の非対称が再発したら CI で即発火する最終防波堤
- **governance.md §3/§8 更新** — 機械検証の 2 層 (format guard + symmetry guard)
  を明記、§8 関連実装表に symmetry guard を追加
- **self-host 動作確認**: aag-collector-purification 自身が本 project の
  完了 → archive 動線を実行した 3 番目の利用者となる

### 技術的インパクト

- AAG の「project-health の数字を、そのまま信用してよい」状態が達成された
- 規約と implementation の対称性が test で固定された (再発防止)
- pure-calculation-reorg の progress 表記が `88/132` → `84/113` に変化
  (checked は prohibition-form 4 件の削減を反映、total は 19 件の prohibition
  削減を反映)。Phase 0-11 の達成状況自体は不変

## v1.9.0 — AAG 5.1 Project Lifecycle Management & Documentation/Task Separation（2026-04-12）

### 概要

repo の課題管理を「ドキュメント = 機能説明 / 課題 = projects/<id>/checklist.md」
の二項分離原則のもとに再構築する。`projects/` を live task の唯一正本にし、
collector / format guard / consistency guard / generated project-health /
architecture-health 統合 / archive lifecycle / version sync registry までを
AAG framework の Layer 4A System Operations として一括導入する。

### 主な成果物

- **規約の正本** (`references/03-guides/project-checklist-governance.md`): §0-12 で
  基本思想 / role 表 / completed 定義 / 書き方規格 / 構造 / CURRENT_PROJECT.md /
  archive lifecycle / 関連実装 / live project 一覧 / bootstrap 手順 /
  large vs small 分離 / version sync registry を全て明文化
- **6 + 1 live project** (data-load-idempotency-hardening / presentation-quality-hardening /
  architecture-decision-backlog / aag-rule-splitting-execution / pure-calculation-reorg /
  quick-fixes (collection))。verification (2026-04-12) で確認した LIVE 項目のみ転記、
  DONE / STALE / PARTIAL は意図的に除外
- **project-checklist-collector** + **generated project-health** で derivedStatus を動的判定
- **checklist format guard** (F1-F5) + **completion consistency guard** (C1-C4)
  で format 違反 + dead-link + archive 未実施を機械検出
- **architecture-health hard gate 統合**: `project.checklist.completedNotArchivedCount`
  を hard_gate / eq / 0 で固定。Project Governance KPI カテゴリ追加
- **kind: project / collection** で大きな project と小さな fix の lifecycle を分離
- **archive 7 ステップ + 関連正本更新義務** を governance §6.2 で明文化
- **version sync registry (Core)**: `versionSyncRegistry.ts` (Schema) +
  `versionSyncGuard.test.ts` (Execution)。app version triplet (4 値) を宣言的管理。
  新ペア追加は registry に 1 entry 足すだけ
- **self-host 動作確認**: docs-and-governance-cohesion 自身が完了 → archive 強制
  の最初の利用者となり projects/completed/ に移動済み

### references/ 縮退

- `data-load-idempotency-plan.md` / `handoff.md` / `read-path-duplicate-audit.md` /
  `active-debt-refactoring-plan.md` / `aag-rule-splitting-plan.md` から live task table
  を全削除し、機能説明・歴史記録・背景だけを残置
- `open-issues.md` を「現在の課題 / リスク / 次にやること」から
  「active project 索引 + 解決済み履歴」に縮退
- `technical-debt-roadmap.md` に「judgment rationale 文書」role banner を追加
- `pure-calculation-reorg/AI_CONTEXT.md` から「次の重心: データロード冪等化」誤導線を
  削除し、Phase 8 Promote Ceremony を本来の主役に戻す（context 分離）

### AAG 4 層への登録

- Layer 1 Constitution: aag-5-constitution.md で AAG version 5.0.0 → 5.1.0
- Layer 2 Schema: `versionSyncRegistry.ts` を Schema 層に追加登録
- Layer 3 Execution: 3 新規 guard (versionSync / checklistFormat / projectCompletionConsistency)
- Layer 4A System Operations: project-checklist-governance.md + open-issues.md を登録

### Read-path 重複耐性 (Pre-1.9.0 — branch 内で先行 merged)

- idempotent load contract Phase 0-3 の追加防御 5 PR (A-E)
- duplicate-injected mock conn helper / FRAGILE 6 件への構造的回帰テスト
- @risk JSDoc + @defense 防御コメントの実装隣接化
- FRAGILE 1/2/6 を `store_day_summary` VIEW と同じ pre-aggregate パターンに refactor

## v1.8.0 — Pure 計算責務再編 Phase 3-7（2026-04-10）

### 概要

Phase 0-2 で整備した意味分類・Master Registry 基盤の上に、契約固定（Phase 3）・
current 群保守対象化（Phase 4）・候補移行計画（Phase 5-6）・guard 統合整理（Phase 7）を
構築。本体のアーキテクチャ進化として v1.8.0 をリリース。

### 主な成果物

- **Phase 3**: contract-definition-policy.md（BIZ-001〜013 / ANA-001〜009）、registry 契約値埋め 22 件、5 bridge JSDoc 更新、wasmEngine WASM_MODULE_METADATA
- **Phase 4**: current-maintenance-policy.md、7 Cargo.toml `[package.metadata.semantic]`
- **Phase 5**: tier1-business-migration-plan.md（Tier 1 候補 6 件 + 8 ステップ移行プロセス）
- **Phase 6**: analytic-kernel-migration-plan.md（Analytic 候補 9 件 + 9 ステップ移行プロセス）
- **Phase 7**: guard-consolidation-and-js-retirement.md（全 guard マップ + JS 正本縮退 4 段階）
- **Phase 8 準備**: promote-ceremony-template.md（昇格提案書 + 実施手順 + 巻き戻し）

---

## AAG（アーキテクチャ品質管理）v4.5.0 — 移行タグ基盤 + Phase 3-7 Guard + obligation 修正（2026-04-10）

### 概要

AAG に移行タグサブシステムを導入し、Phase 3-7 の guard 31 件を追加。
obligation collector の generated-section-only false positive を修正。
Architecture Rules を 109→140 に拡充。

### 主な成果物

- **移行タグ基盤**: migrationTagRegistry.ts（型定義 + 運用設計）、migrationTagGuard.test.ts（7テスト）、migration-tag-policy.md
- **obligation collector 修正**: generated section のみの変更を false positive 除外（isGeneratedSectionOnlyChange）

### Guard 追加（+31）

| Phase | 追加数 | 主なルール |
|-------|--------|-----------|
| 3 | +6 | AR-CONTRACT-*, AR-BRIDGE-* |
| 4 | +7 | AR-CURRENT-* |
| 5 | +7 | AR-CAND-BIZ-* |
| 6 | +7 | AR-CAND-ANA-* |
| 7 | +4 | AR-JS-*, AR-REVIEW-NEEDED-BLOCK |

---

## AAG（アーキテクチャ品質管理）v4.4.0 — Pipeline Safety + ReadModelSlice + Co-Change（2026-04-10）

### 概要

KPIカード非表示バグの修正を起点に、データパイプライン全体の「静かに壊れる」パターンを
構造的に排除。ReadModelSlice discriminated union で型レベルの安全性を確立し、
11 の新 Architecture Rule + 3 つのガードテストで再発を防止。

### ReadModelSlice 安全配布アーキテクチャ

- `ReadModelSlice<T>` discriminated union: `idle | loading | error | ready`
- status チェックなしのデータアクセスがコンパイル時にエラー
- `allReady` / `anyLoading` / `anyError` フラグで一括描画ゲート
- 全 25 消費箇所（9 ファイル）を安全パターンに移行
- YoY セクション: loading → skeleton / ready → 一括描画
- YoYDrill の 3 箇所の unsafe 直接アクセスを修正（クラッシュ防止）

### Pipeline Safety ルール群（8 件）

| ルール | 壊れ方 | severity |
|---|---|---|
| AR-SAFETY-SILENT-CATCH | ログなし catch でエラー不可視 | warn (BL=9) |
| AR-SAFETY-FIRE-FORGET | データ保存 Promise の fire-and-forget | warn |
| AR-SAFETY-NULLABLE-ASYNC | 非同期データの ?? 0 で状態消失 | gate (stable) |
| AR-SAFETY-VALIDATION-ENFORCE | バリデーション結果の未チェック | gate (stable) |
| AR-SAFETY-INSERT-VERIFY | DuckDB INSERT 行数の未検証 | warn (BL=1) |
| AR-SAFETY-PROD-VALIDATION | Zod バリデーション DEV 限定 | warn |
| AR-SAFETY-WORKER-TIMEOUT | Worker/Mutex タイムアウトなし | warn (BL=2) |
| AR-SAFETY-STALE-STORE | データソース変更時の派生状態未クリア | warn (BL=0) |

### Co-Change ルール群（3 件）

| ルール | 関係 | severity |
|---|---|---|
| AR-COCHANGE-VALIDATION-SEVERITY | severity 変更 → テストアサーション | warn |
| AR-COCHANGE-DUCKDB-MOCK | conn.query() 追加 → テストモック | warn |
| AR-COCHANGE-READMODEL-PARSE | parse 方式変更 → パスガード | warn |

co-change ガード: collect-then-assert パターンで全チェックを一括出力。
各 hint に具体的な修正方法（ファイル名 + 何をどう変えるか）を案内。

### パイプライン実装修正

- **入口防御**: hasValidationErrors() で重複/小計をブロック（ERROR 昇格）
- **DuckDB 投入**: bulkInsert changes() 検証 + isPrevYear ロールバック修正
- **計算パイプライン**: Worker エラーログ + 30秒タイムアウト + stale data クリア
- **照会品質**: Zod first-row バリデーション PROD 有効化
- **readModel 堅牢化**: 4 モデル safeParse 化
- **保存安全性**: importHelpers await 化（fire-and-forget 解消）
- **silent catch**: 22 箇所にログ追加（30→9）
- **比較モジュール**: PrevYearData に source discriminator 追加

### クリーンアップ

- 空 allowlist 12 件削除（349 行除去）
- 卒業済み import/re-export を全ガードテストから除去

---

## AAG v3.2.0 — 正本昇格 + 双方向検証 + Discovery Review（2026-04-09）

### 概要

AAG v3.1.0 の「次のステップ」を完了。principles.json を正本に昇格し、
思想→原則→ルールのトレーサビリティを双方向検証で機械保証。
技術的負債（active-debt, totalCustomers）を解消し、
Discovery Review による月次品質点検を制度化。

### 正本昇格 + トレーサビリティ完成

- principles.json: 各原則にタイトル・カテゴリ別 doc 参照を追加（tags → principles 構造）
- ALL_PRINCIPLES を principles.json から動的生成（ハードコード廃止）
- Principle Coverage: 42/50 → 50/50（8原則の principleRefs を既存ルールに追加）
- 双方向リンク検証テスト 3 件追加（ガードテスト 421 → 424）

### 技術的負債の解消

- Active-debt: 1 → 0（useCostDetailData useMemo 9→2、transfer/costInclusion sub-hook 分離）
- totalCustomers allowlist: 7 → 0（presentation 層から `.totalCustomers` 完全排除）
- extractPrevYearCustomerCount を features/comparison に移動

### AAG 運用基盤

- Pre-commit hook: 影響スライス別ファイル数表示
- Fix hints: 4 → 17（docs/boundary/allowlist/complexity/guard/perf/temporal）
- Discovery Review チェックリスト: 26 項目（`references/03-guides/discovery-review-checklist.md`）

---

## 進化安全の再構成 — WASM authoritative 昇格 + dual-run 退役（2026-04-05）

### 概要

repo の「運用安全は強いが進化安全が弱い」状態を解消するための構造改善。
6 Phase を 1 セッションで完遂。Health を RISK → Healthy に改善。

### Phase 0: 判定基盤の再同期

- `technical-debt-roadmap.md` の "bridge" 用語二重定義を解消。allowlist bridge category（0 件）と WASM dual-run bridge（5 件）を明確に区別
- `safety-first-architecture-plan.md` の Phase 1 (runtime-adapters) / Phase 2 (context 4-slice化) を完了マーク。Phase 3 の allowlist 削減完了を反映
- `frozen-list.md` §3.1 の exit criteria を `promotion-criteria.md` に正本統一。時間ベース条件を推奨証拠期間に格下げ
- `docs:generate` で generated sections を最新化。Hard Gate: FAIL → PASS

### Phase 1: WASM 5 engine authoritative 昇格

全 5 engine の bridge を 3-mode dispatch（ts-only / wasm-only / dual-run-compare）から WASM authoritative + TS fallback に簡素化。

| Engine | 類型 | Bridge 行数 | Observation |
|---|---|---|---|
| factorDecomposition | A（pure math） | 322 → 96 | 17 pass → 18 invariant |
| budgetAnalysis | B（WASM core + TS dailyCumulative 補完） | 194 → 65 | 15 pass → 12 invariant |
| forecast | B（pure 5 WASM / Date-dependent 5 TS 委譲） | 437 → 125 | 9 pass → 21 invariant |
| grossProfit | C（numerics WASM / status TS authoritative） | 473 → 145 | 16 pass → 30 invariant |
| timeSlot | A（pure math） | 174 → 36 | 25 pass → invariant 書き換え |

Bridge 3 類型:
- **A**: `isWasmReady() ? wasm() ?? ts() : ts()` — 全関数同形
- **B**: WASM core + TS 補助値（dailyCumulative 等）/ 非対象関数は TS 直接委譲
- **C**: numeric core は WASM authoritative、status/warnings は TS authoritative を維持

### Phase 2: dual-run infrastructure 全面退役

- `dualRunObserver.ts` (207 行) 退役 — 全 FnName 削除済み
- `wasmEngine.ts`: ExecutionMode を `ts-only | wasm-only` の 2 モードに簡素化。DEV default を `wasm-only` に変更
- `main.tsx`: `__dualRunStats` DevTools 登録削除
- 旧 bridge unit test 7 ファイル削除（dual-run 前提のテスト、計 2,470 行）
- observation harness 3 ファイル削除（observationRunner / Assertions / Report、計 397 行）
- E2E: `dual-run-observation.spec.ts` + utils 6 ファイル + `playwright.observation.config.ts` 退役
- `architectureStateAudit.ts`: bridge count を dual-run compare コード有無で判定するよう変更

### Phase 3: ComparisonWindow 契約型導入

- `domain/models/ComparisonWindow.ts` 新設:
  - `ComparisonWindow`: `CurrentOnlyWindow | YoYWindow | WoWWindow` の discriminated union
  - `ComparisonProvenance`: window + comparisonAvailable で比較由来を追跡
  - ファクトリ関数: `currentOnly()`, `yoyWindow()`, `wowWindow()`
- `useTimeSlotPlan.ts` の output に `comparisonProvenance` を追加
- 既存の `MatchStatus` / `ResolvedComparisonRow`（比較結果の事実）とは棲み分け

### Phase 4: near-limit 2→0 解消

- `useTimeSlotPlan.ts`: hierarchy drill-through クエリを `useTimeSlotHierarchyPlan.ts` に抽出（241 → 206 行）
- `categoryBenchmarkLogic.ts`: `buildCategoryTrendData` を `categoryBenchmarkTrend.ts` に抽出（274 → 207 行）
- `useTimeSlotPlan.ts` を hookLineLimits 許可リストから卒業

### Phase 5: 1 人運用モデル固定化

- `noNewDebtGuard.test.ts` 新設（5 テスト）:
  - dual-run compare コード再導入禁止
  - `dualRunObserver.ts` 復活禁止
  - `dual-run-compare` mode 再導入禁止
  - presentation 層の wasmEngine 直接 import 禁止
- `dualRunExitCriteriaGuard.test.ts` を退役状態維持ガードに更新
- `safety-first-architecture-plan.md` に Green/Yellow/Red 判定基準 + No-New-Debt ルールを追記

### KPI 変化

| 指標 | Before | After |
|---|---|---|
| Health status | RISK | **Healthy** |
| Hard Gate | FAIL | **PASS** |
| `compat.bridge.count` | 5 (WARN) | **0** |
| `docs.obligation.violations` | 1 (FAIL) | **0** |
| `complexity.nearLimit.count` | 2 | **0** |
| guard files | 37 | **42** (+noNewDebtGuard, dataIntegrityGuard, customerFactPathGuard, canonicalInputGuard, storeResultAnalysisInputGuard) |
| guard tests | 327 | **368** |
| net コード削減 | — | **~5,500 行** |
| shared plan hooks | 25 | **13** (category/time-slot/clip-export/weather を features/ に移行) |
| features/ plan hooks | 0 | **11** |
| orchestrator readModels | 3 | **4** (+customerFact) |

---

## 販売系基礎正本群の設計移行（2026-04-05）

### Phase 0: 用語固定 + 定義書

- `customer-definition.md` 新設 — 正本源 (flowers) と唯一入口 (readCustomerFact) を分離
- `canonical-input-sets.md` 新設 — 指標ごとの入力正本 + 粒度 + 禁止事項
- `sales-definition.md` / `pi-value-definition.md` / `customer-gap-definition.md` 改訂

### Phase 1: CustomerFact readModel 導入

- `readCustomerFact.ts` — pure builder + QueryHandler + 3 導出 helper
- `CustomerFactTypes.ts` — Zod スキーマ
- `queryCustomerDaily()` — store_day_summary.customers の軽量クエリ
- `useWidgetDataOrchestrator` — 3 → 4 readModel 並列取得

### Phase 2: canonical input builders

- `piCanonicalInput.ts` — buildGrandTotalPI / buildStorePIResults
- `customerGapCanonicalInput.ts` — buildAndCalculateCustomerGap
- `canonicalInputGuard.test.ts` — presentation での PI 直計算禁止

### Phase 3: StoreResult 分析依存の縮退

- `storeResultAnalysisInputGuard.test.ts` — .totalCustomers の新規分析利用禁止 (ratchet ≤16)

### バグ修正

- 前年客数2倍計上 — `buildFlowersCustomerIndex` を last-write-wins に変更
- 複数日選択後の単日クリック — DAY_CLICK で pendingRange=null
- 時間帯分析の前年データ欠落 — 歴史月を isPrevYear=true でも DuckDB にロード
- データ整合性ガード 18 テスト — 4 パターンの構造的再発防止

### Feature ownership 移行

- category 6 plans → features/category/application/plans/
- time-slot 3 plans → features/time-slot/application/plans/
- clip-export 1 plan → features/clip-export/application/plans/
- weather 1 plan → features/weather/application/plans/
- shared plan 凍結 (≤13), UnifiedWidgetContext 凍結 (≤47), @deprecated 凍結 (≤7)

---

## v1.7.0 アーキテクチャ改善 + バグ修正（2026-04-02）

### readModel pure builder 化（app→infra 12→7）

5 readModel を pure builder に変換。handler が infra query を呼び、pure builder に渡す構造:
- buildFreePeriodReadModel / buildFreePeriodBudgetReadModel / buildFreePeriodDeptKPIReadModel
- buildSalesFactReadModel / buildDiscountFactReadModel

### God Hook 分割

useUnifiedWidgetContext（49フィールド/29依存）を 3 bundle に分割:
- useComparisonBundle / useQueryBundle / useChartInteractionBundle

### comparison VM 共通基盤

- ComparisonPoint / DailyYoYRow / aggregateContributions を共通化
- storeContributions 直接ループを全て共通 VM 経由に統合

### Category チャート features/ 移動

35 ファイルを features/category/ui/charts/ に移動。バレル re-export で後方互換。

### 前年客数=0 バグ修正

ClassifiedSalesDaySummary に customers を追加し、flowers を JOIN。
getFlowers 個別参照 → summary.customers に統合。

### query-access audit

features/ スキャン + bundle hook 検出を追加。facadeHook: 0→4。

### KPI

- applicationToInfrastructure: 12 → 7
- queryHandlers: 30 → 33
- queryWithHandler: 21 → 29
- facadeHook: 0 → 4

---

## free-period 正本制度化 + 比較subsystem完全移行（2026-04-02）

### 自由期間 readModel + query infra分離

| readModel | 内容 | ガード |
|-----------|------|--------|
| readFreePeriodFact | 売上/仕入/客数/売変 | freePeriodPathGuard (7) |
| readFreePeriodBudgetFact | 月予算→日割り按分 | freePeriodBudgetPathGuard (5) |
| readFreePeriodDeptKPI | 部門KPI 自由期間集約 | freePeriodDeptKPIPathGuard (4) |

query 実装は infrastructure/duckdb/queries/ に分離済み。
readModel は orchestration + Zod parse のみ。

### 比較 subsystem 完全移行

- cmpDailyMapping allowlist: **0**（全件解消）
- PrevYearBudgetDetailPanel: buildSameDowPoints() 経由に移行
- VM が dailyMapping shape を知らない
- 比較意味論は application/comparison に完全に閉じた

### KPI

| 指標 | 値 |
|------|---|
| テスト | 5038 |
| ガードファイル | 31 |
| 自由期間 readModel | 3 |
| cmpDailyMapping | **0** |
| allowlist 総エントリ | 49 |

## adapter DI 化 + 正本ガード完全網羅（2026-04-02）

### adapter 撤去（Phase 1）

| 対象 | 変更 | allowlist |
|------|------|----------|
| weatherAdapter | re-export → AdapterContext.weather + useWeatherAdapter | -1 |
| ExportService | direct import → AdapterContext.export | -1 |
| useImport (rawFileStore) | direct import → AdapterContext.rawFile + RawFilePort | -1 |
| useDataRecovery (rawFileStore) | direct import → AdapterContext.rawFile | removalCondition 具体化 |

AdapterSet: 4 → 6 ports (weather/backup/fileSystem/storagePersistence/export/rawFile)

### 正本ガード完全網羅

| 正本 | ガード | テスト数 |
|------|--------|---------|
| 仕入原価 | purchaseCostPathGuard + importGuard | 24 |
| 粗利 | grossProfitPathGuard | 6 |
| 売上 | salesFactPathGuard | 5 |
| 値引き | discountFactPathGuard | 5 |
| 要因分解 | factorDecompositionPathGuard | 5 |
| 自由期間 | freePeriodPathGuard | 7 |
| PI値 | piValuePathGuard | 2 |
| 客数GAP | customerGapPathGuard | 2 |
| ComparisonScope | comparisonScopeGuard | 5 |
| AnalysisFrame | analysisFrameGuard | 9 |
| TemporalScope | temporalScopeGuard | 4 |

### 比較サブシステム（Phase 3）

- sourceDate 直接参照: presentation 層から消滅
- dailyMapping 直接ループ: 1 件のみ残存（buildSameDowPoints 移行待ち）

### KPI

| 指標 | 値 |
|------|---|
| allowlist 総エントリ | 47 |
| architecture allowlist | 10 |
| widget 自前取得 | 0 |
| active bridges | 4 |
| 互換 re-export | 1 |
| ImportedData direct import | 0 |
| comparison 独自解決 | 0 |
| 正本化 readModel | 6 |
| ガードファイル | 29 |
| ガードテスト | 262 |
| 全テスト | 5017 |

## MonthlyData 移行完了 + 自由期間分析基盤（2026-04-01）

### ImportedData → MonthlyData 構造移行

| 達成事項 | 詳細 |
|---------|------|
| dataStore | ImportedData-free（data/legacyData/dataVersion/_calculationData 全削除） |
| presentation 層 | `s.data` セレクタ **0**（ガードで禁止） |
| 計算パイプライン | dailyBuilder/summaryBuilder/storeAssembler/Worker → MonthlyData |
| import application 層 | orchestrator/singleMonth/multiMonth → MonthlyData 主語 |
| import infrastructure 層 | processDroppedFiles/processFileData → MonthlyData |
| storage / backup | IndexedDB 内部 + backup → MonthlyData |
| 削除済み API | setImportedData, setPrevYearAutoData, getComparisonFields |
| ImportedData direct import | **0**（ガードで禁止） |
| ガード | 4 回帰防止テスト + Exit KPI audit |

### 計算入口純粋化

| 達成事項 | 詳細 |
|---------|------|
| CalculationFrame | `daysInMonth` hidden dependency を型 + factory に集約 |
| 全入口 frame-aware | calculateAllStores / Worker / cache 全て CalculationFrame 経由 |
| cache frame-aware | computeCacheKey / fingerprint 全て frame |

### 自由期間分析基盤

| 達成事項 | 詳細 |
|---------|------|
| AnalysisFrame | BaseAnalysisFrame + FreePeriodAnalysisFrame + TemporalAnalysisFrame 分離 |
| FreePeriodReadModel | 6番目の正本化 readModel（Zod + DuckDB + JS summary） |
| useFreePeriodAnalysis | AnalysisFrame → ComparisonScope → DuckDB → ReadModel パイプライン |
| facade hooks | useAnalysisInput / useComparisonInput |
| 定義文書 | free-period-analysis-definition.md + cache-responsibility.md |

### 監視指標制度化

| KPI | baseline |
|-----|----------|
| 正本化 readModel 領域 | 6 |
| allowlist 総エントリ数 | 51 |
| widget 自前取得 | ≤ 16 |
| active bridges | ≤ 4 |
| 互換 re-export | ≤ 2 |
| ImportedData direct import | 0 |
| ComparisonScope 独自解決 | 0 |

## 正本化施策 完了（2026-03-30）

正本化施策の全 Workstream を完了。

### 完了条件の達成状況

| 完了条件 | 状態 |
|----------|------|
| purchase cost が唯一の取得正本として運用されている | ✅ |
| gross profit が唯一の計算正本として運用されている | ✅ |
| 主要 widget が readModel / calculateModel 消費に統一されている | ✅ |
| DualPeriod 比較入力が統一契約になっている | ✅ |
| UI 層に独自集計・独自 fallback・独自 before/after が残っていない | ✅ |
| guard / 一貫性テスト / 文書が揃っていて、再発を CI で止められる | ✅ |
| WASM trial が正本運用と切り離されている | ✅ |

### Workstream 達成状況

| Workstream | 内容 | PR |
|------------|------|-----|
| A: GP正本化完了 | 利用経路統一 + getEffectiveGrossProfit + raw fallback 禁止 + ラベル定数 + 一貫性テスト | #780, #783 |
| B: widget readModels 消費 | GrossProfitHeatmap .vm.ts + orchestrator 統合 + 分類表 + 移行ガイド | #780, #783 |
| C: DualPeriodSlider 統一 | 全11チャートから内蔵 Slider 削除 + ページレベル統合 + chartPeriodProps | #782, #785 |
| D: 硬化・完了監査 | guard-test-map + PR チェックリスト + GP一貫性テスト + 完了レビュー | #780, #783, #785 |

### 最終数値

| 指標 | 値 |
|------|-----|
| ガードテスト | 23ファイル / 225テスト |
| 不変条件カタログ | INV-CANON-01〜16 (16件) |
| Zod 契約（必須） | 14/14 (100%) |
| Zod 契約（検討） | 7/9 (78%) |
| 比率プリミティブ | 17カテゴリ |
| DualPeriodSlider チャート内呼び出し | 0 |
| raw GP fallback パターン | 0 |
| 全テスト | 4,951パス |

---

## 正本化体系完成 — 全 readModels ガード完備（2026-03-30）

全5正本（purchaseCost / grossProfit / salesFact / discountFact / factorDecomposition）に
パスガードが揃い、正本化体系の構造的防御が完成。

### 新規ガードテスト

| ガード | テスト数 | 保護対象 |
|--------|---------|----------|
| salesFactPathGuard | 5 | readSalesFact 存在・Zod契約・旧クエリimport禁止・orchestrator統合・定義書 |
| discountFactPathGuard | 5 | readDiscountFact 存在・Zod契約・旧クエリimport禁止・orchestrator統合・定義書 |
| factorDecompositionPathGuard | 5 | calculateFactorDecomposition 存在・Zod契約・domain直接import許可リスト制限・presentation層制限・定義書 |
| canonicalizationSystemGuard | 6 | 全readModelディレクトリ・ファイル構成・全定義書・レジストリ・orchestrator・CLAUDE.md参照 |

### 旧経路修正

- **causalChain.ts**: `decompose2` 直接import → `calculateFactorDecomposition` 正本経由に置換
- **grossProfit/index.ts**: バレルエクスポート追加（他の readModel と構成統一）

### 数値成果

| 指標 | Before | After |
|------|--------|-------|
| ガードテストファイル | 18 | **22** (+4) |
| ガードテスト数 | 197 | **212** (+15) |
| 正本パスガード数 | 2 (purchaseCost, grossProfit) | **6** (全正本+体系) |
| factorDecomposition 許可リスト外の直接import | 1 (causalChain) | **0** |

### Zod 契約拡充

- **sensitivity.ts**: 4スキーマ（SensitivityBase/Deltas/Result + ElasticityResult）
- **trendAnalysis.ts**: 2スキーマ（MonthlyDataPoint + TrendAnalysisResult）
- **advancedForecast.ts**: 4スキーマ（WMAEntry/MonthEndProjection/LinearRegression + WeatherAdjustedProjection）
- **correlation.ts**: 4スキーマ（CorrelationResult/NormalizedSeries/DivergencePoint/CorrelationMatrixCell）
- **forecast.ts**: 4スキーマ（WeeklySummary/DayOfWeekAverage/AnomalyDetectionResult + ForecastResult）
- **computeMovingAverage.ts**: 2スキーマ（MovingAveragePoint + MissingnessPolicy）
- **必須14/14完了、検討7/9完了**（残り2件は domain/models 依存で据え置き）

### getEffectiveGrossProfitRate 凍結ガード

- 利用ファイル数上限13に凍結。新規利用は grossProfitFromStoreResult 経由を強制

### 全正本化ガード一覧

| 正本 | パスガード | プロセステスト |
|------|-----------|---------------|
| purchaseCost | purchaseCostPathGuard (9) + importGuard (15) | readPurchaseCost.test (21) |
| grossProfit | grossProfitPathGuard (5) | calculateGrossProfit.test (15) |
| salesFact | salesFactPathGuard (5) | readSalesFact.test (8) |
| discountFact | discountFactPathGuard (5) | readDiscountFact.test (7) |
| factorDecomposition | factorDecompositionPathGuard (5) | calculateFactorDecomposition.test (6) |
| 体系統合 | canonicalizationSystemGuard (6) | — |
| 計算レジストリ | calculationCanonGuard (4) | — |

---

## 仕入原価正本化 + 取得経路統合（2026-03-29）

仕入原価がページによって異なる値を示す問題を解決。Phase 0 全タスク完了。

### バグ修正

1. **移動原価 IN のみフィルタ是正** — 仕入分析の3箇所で transfers を IN のみフィルタしていたため二重計上が発生。全方向(IN+OUT)に修正
2. **ウォーターフォール売上修正** — CTS 依存から daily(StoreResult)正本に変更。CTS 不足時の警告追加
3. **仕入分析バグ修正** — cappedPrevDateTo 月跨ぎバグ、ピボット未来日差異非表示

### 正本化（Phase 0 完了）

4. **複合正本構造** — 3独立正本（通常仕入・売上納品・移動原価）を組み合わせて総仕入原価を構成
5. **Zod 正本契約** — `PurchaseCostReadModel` で runtime 検証（fail fast）。3正本 + grandTotalCost(在庫法/仕入分析) + inventoryPurchaseCost(推定法)
6. **唯一の read 関数** — `readPurchaseCost.ts`（QueryHandler）で3正本を並列取得→統合→parse
7. **facade hook** — `usePurchaseCost.ts` で useQueryWithHandler 経由の統一入口
8. **既存切替** — `usePurchaseComparisonQuery` が `purchaseCostHandler` を使用。旧経路完全除去

### 構造防御

9. **取得経路ガード** — `purchaseCostPathGuard.test.ts`（9テスト、4層防御: import/集計/正本一貫性/手続き保証）
10. **冗長クエリ廃止** — `queryPurchaseBySupplier` 完全削除。`querySupplierNames`（名前解決専用）を新設。`buildSupplierAndCategoryData` を ReadModel ベースに全面書換え
11. **天気ファイル移動** — domain/calculations/ → domain/weather/ へ。NON_CALCULATION_FILES=0 達成

### 数値成果

| 指標 | 変更 |
|------|------|
| ガードテスト | 158 → **167**（+9: 仕入原価取得経路ガード 4層防御） |
| 一貫性テスト | **18** パス（ピボット/KPI 一致不変条件） |
| 取得経路 | 3経路 → **1経路**（readPurchaseCost に統合） |
| 移動原価フィルタ | IN のみ → **全方向**（二重計上解消） |
| 廃止した旧クエリ関数 | **7関数 + 3型** 完全削除 |
| 並列クエリ | 14本 → **8本** |
| ReadModel 粒度 | storeId × day（店舗別分析に対応） |
| プロセス正当性テスト | **63テスト**（21+9+15+18） |

### 関連文書
- `references/01-principles/purchase-cost-definition.md` — 仕入原価の正本定義
- `references/03-guides/purchase-cost-unification-plan.md` — 取得経路統合計画
- `app/src/application/readModels/purchaseCost/` — 複合正本実装

---

## ルーティング正本化・非同期状態統一・層境界改善（2026-03-29）

6つの並行ストリームを1セッションで完了:

1. **PageMeta 正本化** — 7箇所の断片化を PAGE_REGISTRY に統一、pageMetaGuard (12テスト) 追加
2. **AsyncState<T> 統一** — error 型 string→Error 統一、adapter 付き共通型
3. **Persistence Provider 化** — module-scope state → PersistenceContext + useReducer
4. **Presentation 層責務分割** — 10ファイルの計算ロジック・option builder を .vm.ts / Logic.ts に抽出
5. **層境界改善** — Port 型を domain/ports/ に移動、adapter を infrastructure/adapters/ に移動、AdapterProvider DI 導入
6. **ドキュメント清掃** — Recharts 残存コメント清掃、品質レポート・Engine Matrix 更新

### 数値成果

| 指標 | Before | After |
|------|--------|-------|
| Lint 警告 | 15 | **2** (-87%) |
| app→infra allowlist | 13 | **10** (-23%) |
| application/ports/ | 8 ファイル | **全廃** |
| テスト数 | 3,121 | **4,686** (+50%) |
| ガードテスト | 140 | **152** (+12) |

---

## 概要

5つの並行ストリームが収束した期間:

1. **Temporal Phase 0-5** — 移動平均 overlay の最小統合
2. **P5/DuckDB 収束** — composition root 整理・QueryHandler 完全移行
3. **WidgetContext 整理** — UnifiedWidgetContext 派生化・weather 分離
4. **Query 基盤 typed 化** — buildTypedWhere 完全移行・deprecated 管理
5. **Guard 強化** — 新規ガード3件・allowlist カテゴリ分割

---

## Temporal Analysis（#683-#692）

| PR | Phase | 内容 |
|----|-------|------|
| #683 | 0 | 入力型分離 + isolation テスト + temporal-analysis-policy 初版 |
| #684 | 0補修 | temporal isolation テストの store 依存チェック具体化 |
| #685 | 1 | Frame / Fetch Plan の最小導入 |
| #686 | 2 | Daily Series Foundation（連続日次系列 / 欠損 / provenance） |
| #687 | 3 | 最初の rolling 計算として moving average 導入 |
| #688 | 3改善 | row adapter / metric resolver を handler から分離 |
| #689 | 4 | temporal rolling guard + invariant + handler contract テスト |
| #690 | 4差分 | rolling guard 6ルール完成 + contract/policy 整合 |
| #691 | 5 | 日別売上チャートに移動平均 overlay 最小統合 |
| #692 | 5修正 | store×day rows の dateKey 集約（全店合計ベースに修正） |

### Phase 5 到達点

- 対象: 日別売上チャート（IntegratedSalesChart → DailySalesChart）
- 仕様: metric=sales / windowSize=7 / policy=strict / 初期ON / standard view のみ
- パターン: chart は overlay series を受けるだけ、rolling 計算を知らない
- Handler パイプライン: query → dateKey集約 → adapter → buildDailySeries → computeMovingAverage → sliceToAnchorRange

### 構造的成果

- `domain/calculations/temporal/` — 純粋計算（computeMovingAverage）
- `application/services/temporal/` — source normalization（aggregateStoreDaySummaryByDateKey, buildDailySeries）
- `application/queries/temporal/` — MovingAverageHandler
- `application/hooks/` — useTemporalAnalysis（低レベル）/ useMovingAverageOverlay（高レベル）
- Guard: temporalRollingGuard 6ルール（R-T1〜R-T6）で経路乱立を防止

---

## P5/DuckDB 収束（#673-#674）

### #673: useDuckDB composition root 分割

- weather hook 分離（useWeatherStoreId, usePrevYearWeather）
- QueryHandler 移行完了（22 chart + 2 page → allowlist 33→0）
- guard 強化 + 未使用コード削除

### #674: materializeSummary 最適化

- OPFS 復元時スキップ
- buildTypedWhere 完全移行（buildWhereClause を @deprecated 化）
- MaterializeResult インターフェース追加（rowCount, createMs, totalMs, skipped）
- D&D hook 抽出

---

## WidgetContext 整理（#676-#679, #682）

| PR | 内容 |
|----|------|
| #676 | WidgetContext を UnifiedWidgetContext 派生に変更 + materializeSummary テスト修正 |
| #677 | WidgetContext の未使用 import 削除 |
| #678 | toDashboardContext の戻り値に型アサーション追加 |
| #679 | WidgetContext の optional フィールド修正 |
| #682 | observationStatus を UnifiedWidgetContext コアフィールドに昇格 |

### 構造的成果

- UnifiedWidgetContext が主型。WidgetContext はその派生
- observationStatus: 'ok' | 'partial' | 'invalid' | 'undefined' — 品質シグナルとして昇格
- weather は application/hooks に分離（useWeatherStoreId, usePrevYearWeather）
- useWidgetQueryContext: DuckDB context の隔離層

---

## Query 基盤 typed 化（#675, #681）

- buildTypedWhere: 6型の discriminated union（dateRange, boolean, storeIds, code, in, raw）
- 全 queries/ ディレクトリで移行完了
- buildWhereClause: @deprecated マーカー付きで残存（互換）
- テストヘルパーも buildTypedWhere に統一（#681）

---

## Guard 強化（#680, #682）

### 新規ガードテスト

| ガード | 責務 |
|--------|------|
| temporalRollingGuard | rolling path の経路分離（6ルール R-T1〜R-T6） |
| purityGuard | Domain 純粋性 + store C3 検証 |
| codePatternGuard | @internal export 禁止 + 7パターン検出 |

### allowlist 構造変更

- `allowlists.ts`（単一ファイル）→ `allowlists/`（カテゴリ別ディレクトリ）
- architecture.ts / complexity.ts / duckdb.ts / migration.ts / size.ts / misc.ts
- 総エントリ: 99 → 87（migration 33→0, legacy 11→0 で大幅削減）

---

## 移動平均・チャート・UI 大規模改善（#730+）

### MA（移動平均）バグ修正・構造改善

- extraMetrics の policy を `strict` → `partial` に修正（commit 809cbe9 の退行を解消）
- `toMaData` を dateKey 再構築方式から `date.day` ベースの Map ルックアップに変更
- `remapPrevYearSeries` で `dateKey` だけでなく `date` も当年に更新（不変条件維持）
- 全 null の MA 系列をチャートに追加しない（legend/tooltip 不整合防止）
- standard 以外のビューでは MA クエリを停止
- MA 色をハードコードからテーマトークン（`ct.colors.primary` / `ct.colors.cyanDark`）に移行
- 前年整列ロジックを `prevYearAlignment.ts` に共通化（`alignPrevYearDay`）

### カテゴリ分析の拡張

- IntegratedSalesChart のカテゴリ分析タブを3ビューに拡張（日次推移 / カテゴリ棒 / ドリルダウン分析）
- 新規: `CategoryBarChart.tsx` — 期間内のカテゴリ別売上/点数の横棒グラフ
- 期間スコープを `analysisContext` に統一（SubAnalysisPanel と CategoryHierarchyExplorer で共通化）
- ドリル範囲の正確な渡し（`drillEnd` state + `useDrillDateRange` で prevYearScope もスコープ）

### カテゴリ別売変分析

- 新規: `CategoryDiscountChart.tsx` / `CategoryDiscountTable.tsx`
- ダブルクリックでドリルダウン（部門→ライン→クラス）、パンくず戻り対応
- 第二軸に売変率（散布図）、前年比較（rect マーカー + テーブル前年列）
- テーブルヘッダークリックでソート切替（グラフ連動）
- 親 DiscountTrendChart の種別フィルターを子に継承
- ChartCard に `collapsible` / `defaultCollapsed` prop を追加

### PI値分析改善

- 期間スライダー（DualPeriodSlider）を削除し全期間表示に
- ビュートグル「PI値」を「金額PI」「点数PI」に分離
- PI値7日MA を partial 方式に変更（月初からMA表示）
- 当年PI棒の前年比色分け: 上回り=primary、下回り=orange
- 前年PI棒を背後にグレー半透明で追加
- CategoryPerformanceChart を PerformanceIndexChart の子チャートに統合
- 新規: `StorePIComparisonChart.tsx` — 店舗別PI棒 + カテゴリ×店舗PIヒートマップ
- 新規クエリ: `storeCategoryAggregation.ts` + `StoreCategoryPIHandler.ts`

### motion アニメーション

- SegmentedControl: `motion.div layoutId` で pill スライド
- Tab (TimeSlotSalesChart.styles): TabWrapper + tab-indicator で pill スライド
- Modal: CSS keyframes → framer-motion variants（backdrop fade + panel spring）
- サブタブ切替: AnimatePresence + fade/slide
- Dashboard LazyWidget: フェードイン（opacity + scale）
- CategoryHierarchyExplorer: パンくず layout animation + テーブル fade
- 時間帯ヒートマップ: ドリル展開フェード
- prefers-reduced-motion 対応

### ヒートマップ・時間帯売上

- CategoryTimeHeatmap に `onCategoryClick` コールバック追加（行クリックでドリルダウン）
- TimeSlotChartView にドリル後の「← 戻る」ボタン追加
- ツールチップに前年天気を追加（`formatDailyTooltip` に `prevYearWeatherMap` 引数追加）
- 売変シリーズを折れ線から棒グラフに変更

### ForecastTools / SensitivityDashboard UI改善

- 新規: `SimulationInsightBanner.tsx` — 結論1行要約バナー（positive/caution/negative）
- 新規: `SimulationSummaryCard.tsx` — 主KPI + 従属KPI + 詳細折りたたみカード
- 新規: `simulationInsight.ts` — 閾値判定ロジック（getTool1Insight/getTool2Insight/getSensitivityInsight）
- ForecastTools: ExecRow 羅列 → InsightBanner + SummaryCard（Tool1: 2カード、Tool2: 3カード）
- SensitivityDashboard: ResultCard 5枚 → 3枚統合（粗利インパクト/売上シミュレーション/予算達成率変化）

### パフォーマンス・ログ改善

- Weather: inflight dedupe（同一 station/year/month の並列リクエストを Promise 共有）
- Weather: ログ責務を一層化（service 層は開始/完了/エラーのみ、infra 層は `weatherDebug()` で production 無効）
- DuckDB: `ConsoleLogger` → `VoidLogger`（production）/ `ConsoleLogger(WARNING)`（dev）

### ウィジェット整理

- `chart-discount-breakdown` / `chart-category-analysis` を独立ウィジェットから削除（IntegratedSalesChart に統合）
- `exec-department-kpi` を削除（データ未対応）
- `analysis-category-pi` を非表示化（PerformanceIndexChart に統合）
- `analysis-waterfall` は維持（粗利ウォーターフォール）
- YoYWaterfallChartWidget を IntegratedSalesChart に復元

### テスト品質改善

- `usePersistence.test.ts`: act 警告除去（waitFor で非同期復元完了を待つ）
- `ImportServiceAdditional.test.ts`: IndexedDB ノイズ解消（DatasetRegistry モック）、弱いアサーション強化
- `computeMovingAverage.test.ts`: 不変条件テスト5件追加（定数系列、出力長、strict⊂partial、min-max範囲、窓不足）
- `remapPrevYearInvariant.test.ts`: 新規6件（dateKey/date整合、value保持、月マタギ）
- `simulationInsight.test.ts`: 新規14件（判定関数全パターン）
- `SimulationSummaryCard.test.tsx`: 新規4件（折りたたみ挙動）
- `ForecastToolsUI.test.tsx`: 新規4件（InsightBanner/SummaryCard統合）
- `SensitivityDashboardUI.test.tsx`: 新規3件（3カード構成、シナリオ動線）
- `weatherDedupe.test.ts`: 新規4件（dedupe集約、cache クリア、エラー時、別key）
