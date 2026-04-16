# test-plan — unify-period-analysis

> 役割: AAG 連結前提の最終形テスト計画。guard テスト群とロジック正しさテスト群を
> 実装ファイル名レベルまで落とした設計書。PR 1〜5 の実装順計画
> (`pr-breakdown.md`) と Critical Path Acceptance Suite
> (`acceptance-suite.md`) の上位にある。

## 前提

この領域はただの UI 改修ではなく、`critical-path-safety-map.md` の
分類に従い:

- **Tier A（業務値の正確さ）**: 自由期間分析
- **Tier B（分析品質の信頼性）**: 比較意味論

に置かれている。したがって AAG の統治系と、アプリの比較・取得・集計系を
別レイヤーで両方締める必要がある。

### 既存の土台

アプリ側:
- `app/src/test/guards/freePeriodPathGuard.test.ts`
- `app/src/test/guards/comparisonScopeGuard.test.ts`
- `app/src/test/guards/readModelSafetyGuard.test.ts`

AAG 側:
- `app/src/test/guards/aagDerivedOnlyImportGuard.test.ts`
- `app/src/test/guards/executionOverlayGuard.test.ts`

これらを土台に拡張する。

---

## 1. 最終ガードテストリスト

### G0. AAG 連結ガード

最上流。アプリが AAG の正本をどの経路で読めるか、overlay と rules の
整合が崩れていないかを止める。

**既存で残す:**

1. `app/src/test/guards/aagDerivedOnlyImportGuard.test.ts`
   - consumer が `architectureRules/rules` を直 import しない
   - `@project-overlay/execution-overlay` を直 import しない
   - facade / merged 経由以外の AAG 正本参照を禁止

2. `app/src/test/guards/executionOverlayGuard.test.ts`
   - base rules の全 rule に overlay がある
   - overlay に orphan ruleId がない
   - merge 後の全 rule が executionPlan と fixNow を持つ
   - overlay の effort / priority / fixNow が妥当

**追加する:**

3. `app/src/test/guards/aagFacadeSurfaceGuard.test.ts`
   - アプリが参照してよい AAG facade export 面を固定
   - facade export の増減をレビュー必須にする
   - 失敗条件: 未承認の AAG export を app 側が読む / facade の破壊的変更が silent

4. `app/src/test/guards/aagRuleIdReferenceGuard.test.ts`
   - アプリ側 guard が参照する ruleId が AAG merged rules に存在することを保証
   - 失敗条件: 死んだ ruleId 参照 / AAG 側 rename で app 側が取り残される

5. `app/src/test/guards/aagCriticalPathBindingGuard.test.ts`
   - free-period / comparison / readModel 安全系の guard が AAG 上の intended rule tag と結びつく
   - 失敗条件: critical path 系 guard が AAG 上で未分類

### G1. 入力契約ガード

固定期間を free-period preset に統合する前提で、Header state が
内部契約に漏れないようにする。

**追加する:**

6. `app/src/test/guards/freePeriodPresetFrameGuard.test.ts`
   - 固定期間 preset が `FreePeriodAnalysisFrame` に変換されることを強制
   - query 経路が `HeaderFilterState` を直接読まない
   - 失敗条件: component / hook / plan が生ヘッダ状態を query に流す

7. `app/src/test/guards/freePeriodAnalysisFramePathGuard.test.ts`
   - free-period 系の query 実行は `FreePeriodAnalysisFrame` を唯一入口にする
   - 失敗条件: dateFrom / dateTo / storeIds / comparison を ad hoc に組み立てる path

### G2. 比較意味論ガード

自由期間導入時に最も壊れやすい層。

**既存で残す・拡張する:**

8. `app/src/test/guards/comparisonScopeGuard.test.ts`
   - `buildComparisonScope()` が唯一の factory
   - `ComparisonScopeSchema` が存在
   - presentation 層が `buildComparisonScope` を直接 import しない
   - year - 1 的な独自比較計算を禁止
   - 無スコープ変数名を検出

**追加する:**

9. `app/src/test/guards/comparisonProvenanceGuard.test.ts`
   - comparison 出力に provenance が必須
   - mappingKind / fallbackApplied / comparisonRange / sourceDate / confidence が揃う
   - 失敗条件: 比較結果が数値だけ返して由来を失う / fallback が silent

10. `app/src/test/guards/noComparisonMathInPresentationGuard.test.ts`
    - presentation / chart / VM で比較先日付を計算しない
    - sameDate / sameDow / previousPeriod の独自解決禁止
    - 失敗条件: 画面ごとに比較解釈が分裂

11. `app/src/test/guards/noUnscopedComparisonVariableGuard.test.ts`
    - `prevYearSales` のような無スコープ命名を新規禁止
    - `alignedPrevYearSales` / `monthlyTotalPrevYearSales` などへ限定

### G3. 取得経路ガード

free-period の取得経路を一本化する。

**既存で残す・拡張する:**

12. `app/src/test/guards/freePeriodPathGuard.test.ts`
    - `buildFreePeriodReadModel` の存在
    - `FreePeriodReadModel.parse` を含むこと
    - `FreePeriodTypes` の契約存在
    - `freePeriodHandler` の存在
    - presentation 層から `readFreePeriodFact` / `freePeriodHandler` / query 直参照を禁止
    - presentation 層で比較先日付を独自計算しない
    - 定義文書の存在確認

**追加する:**

13. `app/src/test/guards/freePeriodHandlerOnlyGuard.test.ts`
    - free-period 取得は `freePeriodHandler` 経由のみ
    - `readFreePeriodFact()` を handler 以外が直接呼ばない
    - 失敗条件: hook / VM / chart が取得経路を持つ

14. `app/src/test/guards/noRawFreePeriodRowsToPresentationGuard.test.ts`
    - `FreePeriodReadModel` を経ずに raw rows を presentation に渡さない
    - 失敗条件: chart が raw DB row を直接読む

### G4. 集約・率計算ガード

静かなズレを防ぐ中核。

**追加する:**

15. `app/src/test/guards/noRateInSqlGuard.test.ts`
    - free-period / comparison 系 DuckDB SQL に rate 計算式を書かせない
    - 例: `(price - cost) / price`, `discount / (sales + discount)`
    - 失敗条件: SQL が amount only transport を破る

16. `app/src/test/guards/noRateInVmGuard.test.ts`
    - VM / Presentation で rate 計算式を直接書かない
    - 失敗条件: ViewModel が業務計算を抱える

17. `app/src/test/guards/noDoubleAggregationGuard.test.ts`
    - SQL と JS で同一集約の二重実装を禁止
    - `computeFreePeriodSummary()` が summary 正本であることを守る
    - 失敗条件: SQL summary と JS summary が並存

18. `app/src/test/guards/amountOnlyTransportGuard.test.ts`
    - Context / Map / intermediate model が率ではなく額を運ぶことを強制
    - 失敗条件: `Map<storeId, rate>` のような伝搬

### G5. read model / 配布安全ガード

silent degradation 防止。

**既存で残す:**

19. `app/src/test/guards/readModelSafetyGuard.test.ts`
    - `readModels?.xxxFact?.grand...` のような直接アクセスを禁止
    - `?? 0` による状態握り潰しを禁止
    - status チェック経由アクセスを強制

**追加する:**

20. `app/src/test/guards/freePeriodFallbackVisibleGuard.test.ts`
    - free-period 系 read model が fallback 情報を必須で持つ
    - `fallbackUsed` を UI へ運ぶ
    - 失敗条件: fallback が silent

21. `app/src/test/guards/readModelCoverageMetadataGuard.test.ts`
    - coverage / source / dateSpan / dataVersion を critical read model に要求
    - 失敗条件: 由来不明の値が chart に流れる

### G6. UI 境界ガード

chart 手前を薄くする。

**追加する:**

22. `app/src/test/guards/noRawRowsToChartGuard.test.ts`
    - chart component は ViewModel のみ読む
    - raw rows / handler output / query result を直接解釈しない
    - 失敗条件: chart が pipeline logic を持つ

23. `app/src/test/guards/chartNoAcquisitionLogicGuard.test.ts`
    - chart component に query 実行や handler 呼び出しを書かせない

24. `app/src/test/guards/useQueryWithHandlerPathGuard.test.ts`
    - free-period / comparison 系の query 実行は `useQueryWithHandler` 経由に限定
    - 失敗条件: 各画面が独自 async state を持つ

---

## 2. ロジック正しさテストリスト

構造を守る guard ではなく、結果が正しいことを証明するテスト。

### L0. 純粋関数ユニットテスト

最も速く、失敗原因も明確。

1. `app/src/test/logic/freePeriod/buildFreePeriodPresetToFrame.test.ts`
   - 固定期間 preset ごとに anchorRange が正しい
   - comparison の初期値が正しい
   - 店舗選択が frame に正しく入る

2. `app/src/test/logic/comparison/buildComparisonScope.test.ts`
   - current / previous / YoY / aligned / fallback-aware の scope 解決
   - invalid 入力の reject
   - provenance の基本値

3. `app/src/test/logic/freePeriod/computeFreePeriodSummary.test.ts`
   - totalSales / totalCustomers / dayCount
   - averageDailySales / transactionValue / discountRate

4. `app/src/test/logic/domain/rateCalculators.test.ts`
   - discountRate / markupRate / gpRate が amount 入力から正しく出る
   - 0 除算・null・missing の扱い

### L1. Handler / ReadModel 統合テスト

DB 取得と read model を跨ぐ。

5. `app/src/test/integration/freePeriod/readFreePeriodFact.integration.test.ts`
   - DuckDB fixture から currentRows / comparisonRows が正しく取れる
   - `classified_sales + purchase LEFT JOIN` が期待通り
   - storeId / dateKey / day / dow / sales / customers / purchaseCost / discount が揃う

6. `app/src/test/integration/freePeriod/freePeriodHandler.integration.test.ts`
   - handler が `FreePeriodReadModel` を正しく返す
   - currentSummary / comparisonSummary が期待通り
   - provenance / fallback / metadata が read model に載る

7. `app/src/test/integration/freePeriod/freePeriodReadModelContract.test.ts`
   - `FreePeriodReadModel.parse` に通る
   - required metadata 欠落時に fail する

### L2. 受け入れテスト

ここが一番効く。固定期間 preset と自由期間入力の意味一致を検証する。

8. `app/src/test/acceptance/freePeriod/fixedPresetParity.acceptance.test.ts`
   - 「今月 preset」で作った frame と、同じ日付範囲を自由期間で手入力した frame が同じ summary を返す
   - comparison なしケースで parity が取れる

9. `app/src/test/acceptance/freePeriod/fixedPresetWithComparisonParity.acceptance.test.ts`
   - 「今月 vs 前月」preset と、同一レンジを比較 scope で明示したケースが同じ結果
   - provenance も一致

10. `app/src/test/acceptance/freePeriod/comparisonProvenance.acceptance.test.ts`
    - mappingKind / comparisonRange / fallbackApplied / sourceDate / confidence が UI 消費直前まで落ちない

11. `app/src/test/acceptance/freePeriod/fallbackVisible.acceptance.test.ts`
    - fallback 発生時に read model / ViewModel / UI 入力へ metadata が残る
    - fallback でも silent success にならない

### L3. 性質テスト / メタモルフィックテスト

壊れにくさを作る。

12. `app/src/test/properties/freePeriod/storeOrderInvariance.property.test.ts`
    - storeIds の順番を変えても summary が同じ

13. `app/src/test/properties/freePeriod/rowOrderInvariance.property.test.ts`
    - 入力 row 順序が変わっても summary が同じ

14. `app/src/test/properties/freePeriod/partitionAdditivity.property.test.ts`
    - 期間を 2 分割して別々に集計し足し合わせた結果が、全期間一括集計と一致する

15. `app/src/test/properties/comparison/presetVsManualRange.property.test.ts`
    - preset range と manual range が同じとき比較結果が等しい

16. `app/src/test/properties/freePeriod/amountOnlyTransport.property.test.ts`
    - amount から計算した rate と、集約後に再計算した rate が一致
    - rate を先に平均した値とは一致しないことを明示

### L4. 回帰フィクスチャテスト

実際に壊れやすいケースを固定する。

17. `app/src/test/regression/freePeriod/monthBoundary.regression.test.ts`
    - 月跨ぎ期間で day だけの扱いに依存しない
    - `critical-path-safety-map.md` でも `countMissingDays()` の day-only ロジックはリスク明示

18. `app/src/test/regression/freePeriod/missingDays.regression.test.ts`
    - 欠損日がある期間でも dayCount と averages が正しい

19. `app/src/test/regression/freePeriod/zeroCustomer.regression.test.ts`
    - 客数 0 の日に transactionValue が壊れない

20. `app/src/test/regression/freePeriod/noPurchaseRows.regression.test.ts`
    - purchase LEFT JOIN 欠損でも summary が壊れない

21. `app/src/test/regression/comparison/scopedPrevYearNaming.regression.test.ts`
    - 月間固定値と alignment 値の混同が再発しない

---

## 3. CI 実行順

### Fast lane

- AAG guard（G0）
- 入力契約 guard（G1）
- 比較意味論 guard（G2）
- 取得経路 guard（G3）
- readModel 安全 guard（G5）
- L0 純粋関数 unit

### Medium lane

- handler / read model integration（L1）
- amount / rate / aggregation guard（G4）
- UI 境界 guard（G6）

### Slow lane

- acceptance（L2）
- property（L3）
- regression fixture（L4）

この順で AAG 側の崩れ、構造崩れ、ロジック崩れ、意味崩れを段階的に止める。

---

## 4. Done の定義

この計画が完成したと言える状態:

- AAG 正本は facade / merged 経由以外で読めない
- free-period は `frame → scope → handler → fact → summary → readModel` に固定
- presentation は比較先や集約を独自計算しない
- SQL / VM / Presentation に rate 直計算がない
- `FreePeriodReadModel` は provenance / fallback / coverage を持つ
- 固定期間 preset と自由期間 manual range の parity が acceptance で保証される
- 月跨ぎ / 欠損日 / 購入欠損 / 0 客数が regression で固定される

これで初めて、AAG と連結した統治とアプリ側の意味安全が両方揃う。

---

## 5. 関連文書

| 文書 | 役割 |
|---|---|
| `plan.md` | 不可侵原則と Phase 構造 |
| `pr-breakdown.md` | PR 1〜5 の実装順計画 |
| `acceptance-suite.md` | Critical Path Acceptance Suite の設計 |
| `review-checklist.md` | A〜J カテゴリ別の総括レビュー観点 |
| `references/01-principles/critical-path-safety-map.md` | Safety Tier 分類（Tier A / B の根拠） |
| `references/01-principles/free-period-analysis-definition.md` | 自由期間分析の正本定義 |
| `references/01-principles/data-pipeline-integrity.md` | 額 / 率の分離原則 |
| `references/03-guides/runtime-data-path.md` | 正本 lane / Screen Plan lane |
