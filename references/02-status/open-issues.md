# 課題管理

> 管理責任: documentation-steward ロール。
> 更新日: 2026-04-05

課題を3分類し、不要なアクセスを最小化する。

---

## 1. 現在の課題（対応が必要）

| # | 課題 | 優先度 | 詳細 |
|---|---|---|---|
| C-1 | Presentation 層のテストカバレッジ不足 | **High** | presentation/ の 243 TSX ファイルのうち約 95% にテストなし。coverage 対象外に設定されている。E2E は 5 spec のみで業務フローの検証が不足 |
| ~~C-2~~ | ~~@deprecated ファイル数が上限超過~~ | ~~解決済み~~ | KNOWN_DEPRECATED 5 件 = 上限 5 件。documentConsistency.test.ts で自動検証中 |

## 2. 将来のリスク（いま壊れていないが放置すると問題になる）

| # | リスク | 優先度 | 詳細 |
|---|---|---|---|
| R-1 | Application→Infrastructure 直接 import | Low | allowlist 10 件（前回 13 から -3）。Port 型は domain/ に移動済み、adapter 実装は infrastructure/ に移動済み。残: DuckDB CQRS (4件)、rawFileStore (2件)、useI18n (1件)、Export (2件)、weatherAdapter bridge (1件)。DuckDB 4 件は構造的に不可避 |
| R-4 | 肥大化コンポーネント（500行超） | Low | 前回 19 件 → 実質 9 件に改善。builders/Logic 等の純粋関数ファイルは対象外。残: IntegratedSalesChart (588行)、StorageManagementTab (547行)、HourlyChart (537行)、InsightTabBudget/Forecast (536/533行) 等。Phase 6 で継続 |
| R-9 | ロールシステムの AI 単体セッション最適化 | Medium | 9 ロール × 2 ファイル = 18 ファイルの読み込みコストが高い。軽量ロール設計を検討する |

### 解決済みリスク

| # | リスク | 解決日 | 対応 |
|---|---|---|---|
| R-6 | FileImportService.ts (632行) | 2026-03 | 632→194行に縮小 |
| R-7 | サブバレル移行未完了 | 2026-03 | 一括移行完了 + ガードテスト追加 |
| R-8 | null/0 棲み分け | 2026-03 | UI 改善完了 |
| R-10 | DualPeriodSlider 個別管理 | 2026-03 | 全11チャートから内蔵 Slider 削除。ページレベル統合 + chartPeriodProps で UnifiedWidgetContext 経由配布 |

## 3. 次に取り組むべきこと（優先順）

### 即時実行可能

| # | タスク | 見積り | 効果 |
|---|---|---|---|
| ~~1~~ | ~~**WASM wasm-only trial 実行**~~ | ~~解決済み~~ | 全 5 engine authoritative 昇格完了（2026-04-05）。dual-run infrastructure 全面退役 |
| ~~2~~ | ~~**timeSlot 観測テスト作成**~~ | ~~解決済み~~ | timeSlot authoritative 昇格完了。25 不変条件テスト維持 |
| 3 | **ComparisonWindow 契約の波及**: useClipExportPlan 等の他 plan hook に comparisonProvenance を追加 | 1-2 週 | 比較由来の追跡を全 plan に拡大 |

### 次スプリント

| # | タスク | 見積り | 効果 |
|---|---|---|---|
| ~~4~~ | ~~**R-10 設計判断**: DualPeriodSlider 廃止~~ | ~~解決済み~~ | 全11チャートから内蔵 Slider 削除済み（R-10 解決済み） |
| 5 | **Phase 6**: 残 500行超コンポーネントの .vm.ts 抽出 | 1-2 週 | complexity allowlist 削減 |
| 6 | **テストカバレッジ強化**: Presentation 層のコンポーネントテスト追加、coverage 閾値 55→70% | 継続 | 品質基盤 |

### 中期

| # | タスク | 見積り | 効果 |
|---|---|---|---|
| 7 | guard カバレッジ拡大（REVIEW_ONLY_TAGS 11→5 以下） | 継続 | 機械検証範囲拡大 |
| 8 | E2E テスト拡充（業務フローカバー） | 継続 | リグレッション防止 |
| 9 | ロールシステム軽量化（リスク項目参照） | 設計判断後 | AI セッション効率化 |

## 4. 解決済みの課題（アーカイブ）

> 以下は対応完了済み。参考情報として残す。

| # | 課題 | 解決日 | 対応内容 |
|---|---|---|---|
| S-27 | WASM 空モック | 2026-03-20 | 型付きモックに置換、4 engine を promotion-candidate に昇格 |
| S-1〜S-26 | 各種課題 | 2026-03 | 全件解決済み（詳細は前回版を参照） |
| — | PageMeta 正本化 | 2026-03-29 | PAGE_REGISTRY 導入、7 箇所の断片化を統一 |
| — | AsyncState<T> 統一 | 2026-03-29 | error 型統一、adapter 付き共通型 |
| — | usePersistence Provider 化 | 2026-03-29 | module-scope state → Context |
| — | useAutoImport timing 修正 | 2026-03-29 | processed フラグを成功後に移動 |
| — | WASM 全 5 engine authoritative 昇格 | 2026-04-05 | bridge 簡素化（計 1,426→431 行）、dual-run infrastructure 全面退役（~5,500 行削減） |
| — | 判定基盤の再同期 | 2026-04-05 | bridge 用語二重定義解消、safety-first plan 進捗反映、frozen-list exit criteria 正本統一 |
| — | ComparisonWindow 契約型 | 2026-04-05 | domain/models/ComparisonWindow.ts 新設、useTimeSlotPlan に provenance 導入 |
| — | near-limit 2→0 | 2026-04-05 | useTimeSlotHierarchyPlan 抽出、categoryBenchmarkTrend 抽出 |
| — | 1 人運用モデル固定化 | 2026-04-05 | noNewDebtGuard 新設、Green/Yellow/Red 判定基準制度化 |
| — | Port 型 domain/ 移動 | 2026-03-29 | application/ports/ 全廃、6 Port を domain/ports/ に移動 |
| — | Adapter infrastructure/ 移動 | 2026-03-29 | 4 adapter 実装を正しい層に配置、allowlist 13→10 |
| — | AdapterProvider DI | 2026-03-29 | 6 hook を Context 経由に切替 |
| — | Presentation 層責務分割 | 2026-03-29 | 10 ファイルの計算ロジック・option builder 抽出 |
| — | Recharts 残存清掃 | 2026-03-29 | 全チャート ECharts 移行完了を確認、コメント・README 更新 |
