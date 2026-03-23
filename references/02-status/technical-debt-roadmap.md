# 技術負債削減ロードマップ

> 管理責任: documentation-steward ロール。
> 起点: Sprint 1（guardTagRegistry 分離、allowlists/ 分割、CONTRIBUTING.md URL 整合）
> 作成日: 2026-03-23

---

## 現状スナップショット

### allowlist 全体（99 エントリ）

| カテゴリ | 件数 | 割合 | 性質 |
|---|---|---|---|
| migration | 33 | 33% | 移行先が存在。消化するだけ |
| structural | 26 | 26% | 構造上不可避。削減ではなく監視 |
| legacy | 11 | 11% | 旧 API 依存。リファクタで解消可能 |
| adapter | 5 | 5% | DI パターン。正当な例外として維持 |
| bridge | 4 | 4% | 暫定接続。移行完了で不要になる |
| lifecycle | 1 | 1% | ライフサイクル管理。正当 |

**削減可能:** migration + legacy + bridge = **48 エントリ（48%）**

### allowlist 別充填率

| allowlist | エントリ | 上限 | 充填率 | 主カテゴリ |
|---|---|---|---|---|
| presentationDuckdbHook | 34 | 35 | 97% | migration(20), bridge(1), structural(1) |
| applicationToInfrastructure | 12 | 14 | 86% | adapter(5), bridge(2), lifecycle(1) |
| cmpPrevYearDaily | **10** | 10 | **100%** | migration(10) |
| largeComponentTier2 | **5** | — | — | legacy(5) |
| domainLargeFiles | 7 | — | — | structural(7) |
| cmpFramePrevious | **1** | 3 | 33% | migration(1) |
| infraLargeFiles | **2** | — | — | structural(2) |
| presentationToUsecases | **1** | 1 | 100% | structural(1) |
| useStateLimits | 2 | — | — | structural(2) |
| hookLineLimits | 2 | — | — | structural(2) |
| usecasesLargeFiles | 2 | — | — | structural(2) |
| vmReactImport | 2 | — | — | structural(2) |
| ctxHook | 2 | — | — | structural(1), legacy(1) |
| useMemoLimits | 1 | — | — | structural(1) |
| cmpDailyMapping | 1 | 1 | 100% | structural(1) |
| sideEffectChain | 1 | — | — | structural(1) |
| reactImportExcludeDirs | 1 | — | — | structural(1) |
| infrastructureToApplication | **0** | 0 | — | **完了** |
| presentationToInfrastructure | **0** | 0 | — | **完了** |
| dowCalcOverride | **0** | 0 | — | **完了** |

**凍結済み（削減成功例）:** presentationToInfrastructure, dowCalcOverride, infrastructureToApplication, presentationToUsecases（1件残、構造的例外のみ）

---

## 改善プロジェクト一覧

### 最優先（次 Sprint の主目標）

#### P1: ガード基盤仕上げ

| 項目 | 内容 |
|---|---|
| 目的 | Sprint 1 の構造リファクタを安全に閉じる |
| 状態 | **完了** |
| 対象 | documentConsistency.test.ts, guardTagRegistry.ts, guardTestHelpers.ts, allowlists/index.ts |
| 成功条件 | コメント・除外条件・参照先が整合し、lint/build/test が安定通過 |

#### P2: allowlist 削減運用化

| 項目 | 内容 |
|---|---|
| 目的 | 例外を「一元管理」から「削減対象」に変える |
| 対象 | allowlists/ 全ファイル（99 エントリ） |
| 削減可能 | 48 エントリ（migration 33 + legacy 11 + bridge 4） |
| 成功条件 | 各 allowlist に削減方針があり、migration/legacy/bridge の優先順位が定義されている |

**削減優先順位:**

| 優先度 | カテゴリ | 件数 | 理由 |
|---|---|---|---|
| 1 | migration | 33 | 移行先（V2 comparison, QueryHandler）が既に存在。消化するだけ |
| 2 | legacy | 11 | 旧 API 依存。リファクタで解消可能 |
| 3 | bridge | 4 | 暫定接続。移行完了で不要になる |

#### P3: レイヤー境界正常化

| 項目 | 内容 |
|---|---|
| 目的 | 4 層依存ルールの例外を減らし、構造を健全化する |
| 対象 | presentationToUsecases, infrastructureToApplication, applicationToInfrastructure の非 adapter 群 |
| 成功条件 | presentation→usecases と infrastructure→application の例外が減少し、新規違反が増えない |

**現状:**

| 境界 | 現状 | 上限 | 削減余地 |
|---|---|---|---|
| application→infrastructure | **10** | 11 | **bridge 全件解消済み**。残り adapter(7)+lifecycle(1)+adapter(2) |
| presentation→usecases | **1** | 1 | **legacy(1) を useClipExport hook で解消済み** |
| infrastructure→application | **0** | 0 | **RawDataPort を domain/ports/ に移動し完了** |
| presentation→infrastructure | **0** | 0 | **完了** |

---

### 高優先（次の改善サイクル）

#### P4: 比較サブシステム移行完了

| 項目 | 内容 |
|---|---|
| 目的 | 旧 comparison API 依存を排除し、比較文脈を一系統に収束 |
| 対象 | cmpPrevYearDaily(11), cmpFramePrevious(3), cmpDailyMapping(1) — **計 15 エントリ** |
| 移行先 | `application/comparison/`（V2, 16 ファイル）+ `useComparisonModule` hook |
| 状態 | 全 allowlist が **100% 充填**（新規追加不可能） |
| 成功条件 | prevYear.daily.get(), comparisonFrame.previous, dailyMapping 劣化変換の残件が計画的に減少 |

**旧 API 残存ファイル（11 ファイル）:**

| ファイル | 違反 | 備考 |
|---|---|---|
| calendarUtils.ts | prevYear.daily.get ×3 | 最多。優先移行候補 |
| MonthlyCalendar.tsx | prevYear.daily.get ×2, comparisonFrame.previous | 3 allowlist 跨り |
| DayDetailModal.tsx | prevYear.daily.get, comparisonFrame.previous | 2 allowlist 跨り |
| DayDetailModal.vm.ts | prevYear.daily.get ×2 | VM 層 |
| YoYWaterfallChart.tsx | comparisonFrame.previous | |
| AlertPanel.tsx | prevYear.daily.get | |
| DailyPage.tsx | prevYear.daily.get | |
| useBudgetChartData.ts | prevYear.daily.get | application 層 |
| buildClipBundle.ts | prevYear.daily.get | export 機能 |
| ForecastPage.helpers.ts | prevYear.daily.get | |
| InsightTabBudget.tsx | prevYear.daily.get | |
| PrevYearBudgetDetailPanel.tsx | dailyMapping（sourceDate 維持） | |

**移行戦略:** Dashboard widgets（Calendar, DayDetail, YoYWaterfall）を一括移行すると
3 allowlist を同時に削減でき、効率が最も高い。

#### P5: DuckDB 直結削減

| 項目 | 内容 |
|---|---|
| 目的 | Presentation 層から探索クエリ責務を剥がし、QueryHandler/hook 経由へ |
| 対象 | presentationDuckdbHook — **36 エントリ**（最大 allowlist） |
| 状態 | 36/37 で **残り 1 スロット**。事実上凍結 |
| 成功条件 | 件数が減少し、新規 direct 参照が発生しない |

削減可能: migration(22) が QueryHandler 移行で解消可能。

---

### 中期継続

#### P6: 大型 hook / component 縮退

| 項目 | 内容 |
|---|---|
| 目的 | 例外で温存されている重い実装を段階的に薄くする |
| 対象 | largeComponentTier2(8), useMemoLimits(1), useStateLimits(2), hookLineLimits(2) — **計 13 エントリ** |
| 成功条件 | 件数が減り、分割テンプレートが定着 |

**注目ファイル:**

| ファイル | 行数 | 上限 | 余裕 | リスク |
|---|---|---|---|---|
| ForecastChartsCustomer.tsx | 755 | 756 | **1 行** | 即超過リスク |
| CategoryFactorBreakdown.tsx | 719 | — | — | 最大級 |
| MonthlyCalendar.tsx | 633 | — | — | P4 移行で分割機会あり |
| TimeSlotChart.tsx | 199 | 660 | 461 | **600 未満 — allowlist 不要** |

#### P7: ドキュメント整合強化

| 項目 | 内容 |
|---|---|
| 目的 | 実装・設定・ドキュメントの説明を継続的に一致させる |
| 対象 | README.md, app/README.md, CONTRIBUTING.md, vite.config.ts, documentConsistency.test.ts |
| 成功条件 | URL・パス・設計説明の不整合がなく、設定と案内文が一致 |

#### P8: guard 運用ルール明確化

| 項目 | 内容 |
|---|---|
| 目的 | 新規例外追加や guard 追加時の判断を属人化させない |
| 対象 | allowlists/ 運用、guard 命名規約、追加フロー |
| 成功条件 | 例外追加条件、category の使い分け、削除条件が短く明文化されている |

#### P9: guard カバレッジ拡大

| 項目 | 内容 |
|---|---|
| 目的 | REVIEW_ONLY_TAGS をガードテストに昇格させる |
| 対象 | C1, C4, C5, E1, E2 等の現在レビューのみで検証しているタグ |
| 成功条件 | 機械的に検出できるタグが増え、REVIEW_ONLY_TAGS が減少 |

---

## 管理レーン

| レーン | プロジェクト | 進め方 |
|---|---|---|
| **今すぐ閉じる** | P1 ガード基盤仕上げ | **完了済み** |
| **毎 Sprint 少しずつ** | P2 allowlist 削減, P3 レイヤー境界, P4 比較移行 | PR ごとに 1-3 エントリ削減 |
| **中期継続** | P5 DuckDB 直結, P6 大型縮退, P7 ドキュメント, P8 guard 運用, P9 guard カバレッジ | 改修タイミングで段階的に |

## 推奨実行順

1. ~~P1: ガード基盤仕上げ~~ **完了**
2. P2: allowlist 削減運用化（削減方針の明文化）
3. P3: レイヤー境界正常化（bridge/legacy の解消）
4. P4: 比較サブシステム移行完了（Dashboard widgets 一括）
5. P5: DuckDB 直結削減（QueryHandler 移行）
6. P6: 大型 hook/component 縮退（ForecastChartsCustomer 最優先）
7. P7: ドキュメント整合強化
8. P8: guard 運用ルール明確化
9. P9: guard カバレッジ拡大

## 成果指標

| 指標 | 起点（Sprint 1 完了時） | 現在値 | 次 Sprint 目標 | 中期目標 |
|---|---|---|---|---|
| allowlist 総エントリ | 99 | **84**（-15） | 80 以下 | 72 以下 |
| migration カテゴリ | 33 | **29**（-4） | 26 以下 | 20 以下 |
| legacy カテゴリ | 11 | **6**（-5） | 5 以下 | 5 以下 |
| bridge カテゴリ | 4 | **1**（-3） | 0 | 0 |
| 凍結済み allowlist | 2 | **4**（+2） | 5 以上 | 5 以上 |
| DuckDB 直結 | 36 | **27**（-9） | 25 以下 | 20 以下 |
| Tier2 大型 component | 8 | **4**（-4） | 3 以下 | 3 以下 |
| app→infra 上限 | 14 | **11**（-3） | 10 以下 | 10 以下 |

### 削減履歴

| 日付 | 削減エントリ | allowlist | 理由 |
|---|---|---|---|
| 2026-03-23 | TimeSlotChart.tsx | largeComponentTier2 | 199 行（600 未満） |
| 2026-03-23 | PerformanceIndexChart.tsx | largeComponentTier2 | 573 行（600 未満） |
| 2026-03-23 | DayDetailModal.tsx | largeComponentTier2 | 579 行（600 未満） |
| 2026-03-23 | jmaEtrnClient.ts | infraLargeFiles | 267 行（400 未満） |
| 2026-03-23 | DiscountAnalysisPanel.tsx | presentationDuckdbHook | DuckDB import なし |
| 2026-03-23 | CategoryHeatmapPanel.tsx | presentationDuckdbHook | DuckDB import なし |
| 2026-03-23 | DayDetailModal.tsx | cmpFramePrevious | comparisonFrame.previous 未使用 |
| 2026-03-23 | MonthlyCalendar.tsx | cmpFramePrevious | comparisonFrame.previous 未使用 |
| 2026-03-23 | IndexedDBRawDataAdapter.ts | infrastructureToApplication | RawDataPort を domain/ports/ に移動 |
| 2026-03-23 | MonthlyCalendar.tsx | presentationToUsecases | useClipExport hook 経由に移行 |
| 2026-03-23 | YoYWaterfallChart.tsx | cmpPrevYearDaily | prevYear.daily.get パターン未使用 |
| 2026-03-23 | MonthlyCalendar.tsx | presentationDuckdbHook | DuckDB import を useClipExport に移動 |
| 2026-03-23 | MonthlyCalendar.tsx | largeComponentTier2 | 589 行（600 未満） |
| 2026-03-23 | queryProfileService.ts | applicationToInfrastructure | queryProfiler を application/ に移動 |
| 2026-03-23 | useWeatherHourlyQuery.ts | applicationToInfrastructure | QueryHandler パターンに移行 |

## この一覧の使い方

- **Sprint 管理:** 最優先 3 件を直近 Sprint の主目標にする
- **PR 管理:** 1 PR = 1 改善プロジェクトの一部に紐づける
- **レビュー観点:** 「どの改善プロジェクトに資する変更か」を明示する
- **進捗確認:** 成功条件をチェックリストとして使う
