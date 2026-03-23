# 技術負債削減ロードマップ

> 管理責任: documentation-steward ロール。
> 起点: Sprint 1（guardTagRegistry 分離、allowlists/ 分割、CONTRIBUTING.md URL 整合）
> 作成日: 2026-03-23

---

## 現状スナップショット

### allowlist 全体（73 エントリ、起点 99 から -26）

| カテゴリ | 起点 | 現在 | 変動 | 性質 |
|---|---|---|---|---|
| structural | 26 | 35 | +9 | 構造上不可避。削減ではなく監視（P4 再分類 +10） |
| migration | 33 | 20 | **-13** | 移行先が存在。消化するだけ |
| adapter | 5 | 11 | +6 | DI パターン。正当な例外として維持（queries/ 免除追加） |
| legacy | 11 | 2 | **-9** | 旧 API 依存。リファクタで解消可能 |
| bridge | 4 | 1 | **-3** | 暫定接続。移行完了で不要になる |
| lifecycle | 1 | 2 | +1 | ライフサイクル管理。正当 |

**削減可能:** migration + legacy + bridge = **23 エントリ（32%）**
**構造管理:** structural = **35 エントリ（48%）** — データソース移行済み、アクセスパターン監視

### allowlist 別充填率

| allowlist | エントリ | 上限 | 充填率 | 主カテゴリ |
|---|---|---|---|---|
| presentationDuckdbHook | 27 | 27 | **100%** | migration(19), bridge(1), structural(1) |
| applicationToInfrastructure | 10 | 11 | 91% | adapter(7), lifecycle(2), adapter(1) |
| cmpPrevYearDaily | 10 | 10 | **100%** | migration(10) |
| domainLargeFiles | 7 | — | — | structural(7) |
| usecasesLargeFiles | 2 | — | — | structural(2) |
| infraLargeFiles | 2 | — | — | structural(2) |
| useStateLimits | 2 | — | — | structural(2) |
| hookLineLimits | 2 | — | — | structural(2) |
| vmReactImport | 2 | — | — | structural(2) |
| ctxHook | 2 | — | — | structural(1), legacy(1) |
| cmpFramePrevious | 1 | 3 | 33% | migration(1) |
| presentationToUsecases | 1 | 1 | 100% | structural(1) |
| useMemoLimits | 1 | — | — | structural(1) |
| cmpDailyMapping | 1 | 1 | 100% | structural(1) |
| sideEffectChain | 1 | — | — | structural(1) |
| reactImportExcludeDirs | 1 | — | — | structural(1) |
| largeComponentTier2 | **0** | 0 | — | **完了** |
| infrastructureToApplication | **0** | 0 | — | **完了** |
| presentationToInfrastructure | **0** | 0 | — | **完了** |
| dowCalcOverride | **0** | 0 | — | **完了** |

**凍結済み（削減成功例）:** presentationToInfrastructure, dowCalcOverride, infrastructureToApplication, presentationToUsecases（1件残）, largeComponentTier2（全件解消）

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
| 対象 | allowlists/ 全ファイル（起点 99 → 現在 73 エントリ） |
| 削減可能 | 32 エントリ（migration 29 + legacy 2 + bridge 1） |
| 成功条件 | 各 allowlist に削減方針があり、migration/legacy/bridge の優先順位が定義されている |
| 状態 | **進行中** — 26 エントリ削減済み、凍結 5 件達成 |

**削減優先順位:**

| 優先度 | カテゴリ | 起点 | 現在 | 理由 |
|---|---|---|---|---|
| 1 | migration | 33 | 29 | 移行先（V2 comparison, QueryHandler）が既に存在。消化するだけ |
| 2 | legacy | 11 | **2** | 旧 API 依存。リファクタで解消（9件解消済み） |
| 3 | bridge | 4 | **1** | 暫定接続。移行完了で不要になる（3件解消済み） |

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
| 対象 | cmpPrevYearDaily(10), cmpFramePrevious(1), cmpDailyMapping(1) — **計 12 エントリ** |
| 移行先 | `application/comparison/`（V2, 16 ファイル）+ `useComparisonModule` hook |
| 状態 | **データソース V2 移行済み**。アクセスパターン改善は改修タイミング |

**再評価結果（2026-03-23）:**

`ctx.prevYear` はすでに `useComparisonModule.daily`（V2）から供給されている。
`prevYear.daily.get(toDateKeyFromParts(...))` は V2 の PrevYearData Map への正当なアクセス。

ガードが防ぐリスク:
- `toDateKeyFromParts` で「当月の日付」として key を構築→same-DOW alignment 時に不整合
- 新規コードが alignment を無視して Map に直接アクセスすること

**カテゴリ変更:** migration → structural（データソース移行済み、アクセスパターン管理）
**方針:** ヘルパー関数で `.get()` を隠す表面的回避はしない。各ファイルの改修タイミングで
alignment-aware なアクセスパターンに段階的に移行する。

**残存ファイル（12 ファイル）:**

| ファイル | パターン | カテゴリ |
|---|---|---|
| calendarUtils.ts | prevYear.daily.get ×3 | structural |
| MonthlyCalendar.tsx | prevYear.daily.get ×2 | structural |
| DayDetailModal.tsx | prevYear.daily.get | structural |
| DayDetailModal.vm.ts | prevYear.daily.get ×2 | structural |
| AlertPanel.tsx | prevYear.daily.get | structural |
| DailyPage.tsx | prevYear.daily.get | structural |
| useBudgetChartData.ts | prevYear.daily.get | structural |
| buildClipBundle.ts | prevYear.daily.get | structural |
| ForecastPage.helpers.ts | prevYear.daily.get | structural |
| InsightTabBudget.tsx | prevYear.daily.get | structural |
| YoYWaterfallChart.tsx | comparisonFrame.previous | migration |
| PrevYearBudgetDetailPanel.tsx | dailyMapping（sourceDate 維持） | structural |

#### P5: DuckDB 直結削減

| 項目 | 内容 |
|---|---|
| 目的 | Presentation 層から探索クエリ責務を剥がし、filterStore + useFilterSelectors 経由へ |
| 対象 | presentationDuckdbHook — **27 エントリ** |
| 状態 | 27/27 で凍結。**filterStore 移行待ち** |
| 成功条件 | 件数が減少し、新規 direct 参照が発生しない |

**再評価結果（2026-03-23）:** 個別 wrapper hook による表面的分離は不採用。
コードベースの設計意図は `filterStore + useFilterSelectors` への統一移行。
wrapper hook は既存パターンに存在せず、新規追加は一貫性を損なう。

---

### 中期継続

#### P6: 大型 hook / component 縮退

| 項目 | 内容 |
|---|---|
| 目的 | 例外で温存されている重い実装を段階的に薄くする |
| 対象 | ~~largeComponentTier2(8)~~, useMemoLimits(1), useStateLimits(2), hookLineLimits(2) — **計 5 エントリ** |
| 状態 | **largeComponentTier2 全件解消（凍結）。** 残りは hook 複雑性のみ |
| 成功条件 | 件数が減り、分割テンプレートが定着 |

**分離実績:**

| ファイル | 施策 | Before | After |
|---|---|---|---|
| BudgetVsActualChart.tsx | .builders.ts 分離 | 623 | 262 |
| YoYVarianceChart.tsx | .builders.ts 分離 | 618 | 307 |
| CategoryFactorBreakdown.tsx | .logic.ts 分離 | 719 | 469 |
| ForecastChartsCustomer.tsx | .builders.ts 分離 | 755 | 213 |
| MonthlyCalendar.tsx | useClipExport 分離 | 633 | 589 |

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
| 対象 | C1, C4, C5, E1 等の現在レビューのみで検証しているタグ |
| 状態 | **E4, E2, G3 の 3 タグを機械テストに昇格** |
| 成功条件 | 機械的に検出できるタグが増え、REVIEW_ONLY_TAGS が減少 |

**昇格実績:**

| タグ | 施策 | 検出方法 |
|---|---|---|
| E4 | codePatternGuard に追加 | `!obj.numericProp` パターン検出 |
| E2 | eslint.config.js に `@guard` 付与 | `react-hooks/exhaustive-deps: 'error'` |
| G3 | codePatternGuard に追加 | `eslint-disable` / `@ts-ignore` / `@ts-expect-error` 検出 |

**REVIEW_ONLY_TAGS:** 14 → **11**（-3）

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
| allowlist 総エントリ | 99 | **73**（-26） | 70 以下 | 60 以下 |
| migration カテゴリ | 33 | **20**（-13、P4 再分類含む） | 18 以下 | 15 以下 |
| legacy カテゴリ | 11 | **2**（-9） | 1 以下 | 0 |
| bridge カテゴリ | 4 | **1**（-3） | 0 | 0 |
| 凍結済み allowlist | 2 | **5**（+3） | 6 以上 | 6 以上 |
| DuckDB 直結 | 36 | **27**（-9） | 25 以下 | 20 以下 |
| Tier2 大型 component | 8 | **0**（-8、凍結） | 0 | 0 |
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
| 2026-03-23 | BudgetVsActualChart.tsx | largeComponentTier2 | builders 分離（623→262行） |
| 2026-03-23 | YoYVarianceChart.tsx | largeComponentTier2 | builders 分離（618→307行） |
| 2026-03-23 | CategoryFactorBreakdown.tsx | largeComponentTier2 | ロジック分離（719→469行） |
| 2026-03-23 | ForecastChartsCustomer.tsx | largeComponentTier2 | builders 分離（755→213行） |
| 2026-03-23 | alertSystem.ts | — | E4 バグ修正（!budgetProgressRate → == null） |
| 2026-03-23 | YoYWaterfallChart.tsx | cmpFramePrevious | comparisonFrame.previous → prevYearScope（凍結） |
| 2026-03-23 | EtrnTestWidget.tsx | ctxHook | カテゴリ修正 legacy → structural |

## リファクタリング教訓（フィードバックスパイラル）

今回の技術負債削減（99→72 エントリ）で得た構造的教訓。
再発防止のため、ガードテスト・禁止事項・ROLE/SKILL に反映する。

### 教訓 1: 表面的回避と本質的改善を区別する

**事象:** P4 で `prevYear.daily.get()` をヘルパー関数で隠す案を検討したが、
Map アクセスをラップしているだけで構造は変わらない。却下。

**教訓:** ガードの文字列パターンを回避するためだけの変更は改善ではない。
ガードが防いでいるリスクを理解し、そのリスクが実際に解消されたかで判断する。

**適用:** allowlist エントリの削減は「パターンが検出されなくなった」ではなく
「リスクが構造的に解消された」ことを基準にする。

### 教訓 2: 新規パターン導入前に既存パターンの一貫性を確認する

**事象:** P5 で 6 チャートの DuckDB hook を wrapper hook に移行する案を検討したが、
wrapper hook パターンは既存コードベースに存在しなかった。
設計意図は `filterStore + useFilterSelectors` への統一移行。

**教訓:** 新しい抽象化を導入する前に、コードベースの既存パターンと設計意図を確認する。
「正しい方向だが一貫性がない」変更は、将来の移行コストを増やす。

**適用:** 新パターン導入時は以下を確認:
1. 同等の既存パターンがあるか
2. 設計ドキュメント（CLAUDE.md, references/）の移行方針と整合するか
3. 導入後のパターン数が増えないか（既存パターンの置換 OK、併存 NG）

### 教訓 3: カテゴリ再分類はコード変更と同等に価値がある

**事象:** P4 で cmpPrevYearDaily の 10 件を `migration` → `structural` に再分類。
データソース移行は完了していたが、allowlist の reason/category が古いままだった。

**教訓:** allowlist のメタデータ（category, reason, removalCondition）は
コードの現実を反映しなければならない。分類が間違っていると
「移行可能なのに放置」「解消済みなのにカウント」が発生する。

**適用:** allowlist エントリの定期レビューを Sprint 単位で実施し、
category が現実と合っているか確認する。

### 教訓 4: ガードの対象範囲と設計原則の対象範囲を区別する

**事象:** G5（useMemo ≤ 7, useState ≤ 6）は `application/hooks/` のみスキャン。
presentation のコンポーネントに useMemo 11 個のファイルがあっても検出されない。

**教訓:** 設計原則の適用範囲とガードテストのスキャン範囲は一致しないことがある。
ガードが通るからといって、原則に準拠しているとは限らない。

**適用:** 新しいガードを追加するとき、スキャン範囲が原則の適用範囲と
一致しているか確認する。

## この一覧の使い方

- **Sprint 管理:** 最優先 3 件を直近 Sprint の主目標にする
- **PR 管理:** 1 PR = 1 改善プロジェクトの一部に紐づける
- **レビュー観点:** 「どの改善プロジェクトに資する変更か」を明示する
- **進捗確認:** 成功条件をチェックリストとして使う
- **教訓活用:** リファクタリング前に教訓セクションを確認し、同じ轍を踏まない
