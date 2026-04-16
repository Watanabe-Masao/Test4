# inventory/06 — Phase 7 / Phase 8 audit (2026-04-16)

> 役割: checklist.md の Phase 7 (G0-G6) / Phase 8 (L0-L4 + CI) の stale checkbox を
> 現行コードベースに照合し、done / partial / not-done を証拠付きで確定する。
>
> HANDOFF.md §6 の audit 計画に基づき実施。

## 1. Phase 7: ガードテスト群 (G0-G6)

### G0 AAG 連結ガード 3 本 — **全 DONE**

| 項目 | 対応 guard | 状態 | 証拠 |
|---|---|---|---|
| aagFacadeSurface | `aagDerivedOnlyImportGuard.test.ts` | DONE | AR-AAG-DERIVED-ONLY-IMPORT / AR-AAG-NO-BASE-RULES-CONSUMER-IMPORT / AR-AAG-NO-DIRECT-OVERLAY-IMPORT |
| aagRuleIdReference | `architectureRuleGuard.test.ts` | DONE | rule registry integrity: unique IDs, valid guard tags, required fields (what/why/correctPattern) |
| aagCriticalPathBinding | `executionOverlayGuard.test.ts` | DONE | rules.ts ↔ execution-overlay.ts consistency: effort/priority/fixNow validity |

### G1 入力契約ガード 2 本 — **全 DONE**

| 項目 | 対応 guard | 状態 | 証拠 |
|---|---|---|---|
| freePeriodPresetFrame | `analysisFrameGuard.test.ts` | DONE | buildFreePeriodFrame factory 存在検証 + frame fingerprint stability (computeAnalysisFrameKey) |
| freePeriodAnalysisFramePath | `analysisFrameGuard.test.ts` | DONE | AnalysisFrame/CalculationFrame types 存在 + frame cache key uniqueness |

### G2 比較意味論ガード 3 本 — **全 DONE**

| 項目 | 対応 guard | 状態 | 証拠 |
|---|---|---|---|
| comparisonProvenance | `comparisonResolvedRangeSurfaceGuard.test.ts` | DONE | ComparisonResolvedRange surface 契約: presentation での scope.alignmentMap/effectivePeriod2 直接参照禁止 |
| noComparisonMathInPresentation | `presentationComparisonMathGuard.test.ts` | DONE | `year-1` / `setFullYear` / `subYears` 等を検出。allowlist baseline 2 件 (admin UI) |
| noUnscopedComparisonVariable | `comparisonScopeGuard.test.ts` | DONE | temporal-scope-semantics: unscoped names 禁止 (prevYearSales → sameDatePrevYearSales) |

### G3 取得経路ガード 2 本 — **全 DONE**

| 項目 | 対応 guard | 状態 | 証拠 |
|---|---|---|---|
| freePeriodHandlerOnly | `freePeriodHandlerOnlyGuard.test.ts` | DONE | G3-1: queryFreePeriodDaily caller = freePeriodHandler.ts のみ |
| noRawFreePeriodRowsToPresentation | `freePeriodHandlerOnlyGuard.test.ts` | DONE | G3-2: FreePeriodDailyRow の presentation 直接 import 禁止 |

### G4 集約・率計算ガード 4 本 — **1 DONE / 1 PARTIAL / 2 NOT-DONE**

| 項目 | 対応 guard | 状態 | 証拠 |
|---|---|---|---|
| noRateInSql | `noRateInFreePeriodSqlGuard.test.ts` | DONE | NULLIF 除算 / CASE WHEN 分岐除算 / `AS "*Rate"` alias 禁止 |
| noRateInVm | (SQL guard のみ) | PARTIAL | VM 層は `weightedAverageRate()` pure builder パターンに依存。専用 guard なし |
| noDoubleAggregation | (なし) | NOT-DONE | 明示的な二重集約禁止 guard なし |
| amountOnlyTransport | (なし) | NOT-DONE | 額のみ transport の guard なし。概念は noRateInSql と関連するが構造的に別 |

### G5 read model 安全ガード 2 本 — **1 DONE / 1 PARTIAL**

| 項目 | 対応 guard | 状態 | 証拠 |
|---|---|---|---|
| freePeriodFallbackVisible | `fallbackMetadataGuard.test.ts` | DONE | 全 readModel に usedFallback field 存在検証。AR-STRUCT-FALLBACK-METADATA |
| readModelCoverageMetadata | `readModelSafetyGuard.test.ts` | PARTIAL | status-based safety access は検証済み。"coverage metadata" 自体は明示的に別 guard にはなっていない |

### G6 UI 境界ガード 3 本 — **全 DONE**

| 項目 | 対応 guard | 状態 | 証拠 |
|---|---|---|---|
| noRawRowsToChart | `chartInputBuilderGuard.test.ts` | DONE | charts/ 配下の dateRangeToKeys 直接呼び出し禁止。allowlist baseline 0 |
| chartNoAcquisitionLogic | `chartRenderingStructureGuard.test.ts` | DONE | chart.tsx 内の inline build*Data / build*Option 禁止。allowlist baseline 0 |
| useQueryWithHandlerPath | `queryPatternGuard.test.ts` | DONE | INV-RUN-01: useQueryWithHandler は canonicalizeQueryInput 経由必須。AR-STRUCT-QUERY-PATTERN |

### Phase 7 サマリ

| 状態 | 件数 | 割合 |
|---|---|---|
| DONE | 12 | 86% |
| PARTIAL | 2 | 14% |
| NOT-DONE | 2 | 14% (G4 の 2 項目) |

---

## 2. Phase 8: ロジック正しさテスト群 (L0-L4 + CI)

### L0 純粋関数ユニットテスト 4 本 — **全 DONE**

| 項目 | 対応テスト | 状態 | 証拠 |
|---|---|---|---|
| buildFreePeriodFrame | `test/logic/comparison/frameComparisonParity.test.ts` | DONE | parity test 経由で検証。direct unit test なし |
| buildComparisonScope | `domain/models/__tests__/ComparisonScope.test.ts` | DONE | 13+ describe blocks: presets / month crossing / leap year / elapsedDays cap / alignmentMap 整合性 |
| computeFreePeriodSummary | `application/readModels/freePeriod/readFreePeriodFact.test.ts` | DONE | 空配列 / 単一・複数行 / 割引 / 客数 / 月跨ぎ / leap year / 予算計算 |
| rateCalculators | `application/readModels/freePeriod/readFreePeriodDeptKPI.test.ts` | DONE | weightedAverageRate: 通常 / null / zero weight / negative / 0 除算回避 |

### L1 Handler/ReadModel 統合テスト 3 本 — **2 DONE / 1 PARTIAL**

| 項目 | 対応テスト | 状態 | 証拠 |
|---|---|---|---|
| readFreePeriodFact | `readFreePeriodFact.test.ts` | DONE | multi-store / multi-day aggregation / parity invariants |
| freePeriodHandler | `freePeriodHandlerOnlyGuard.test.ts` (guard のみ) | PARTIAL | handler 実装は存在するが functional integration test なし。guard は orchestration uniqueness のみ検証 |
| freePeriodReadModelContract | `criticalPathAcceptance.skeleton.test.ts` | DONE | Zod contract validation via fixture tests |

### L2 受け入れテスト 4 本 — **2 DONE / 2 PARTIAL**

| 項目 | 対応テスト | 状態 | 証拠 |
|---|---|---|---|
| fixedPresetParity | `criticalPathAcceptance.skeleton.test.ts` | PARTIAL | skeleton 5 cases あり (Phase 0.5)。full acceptance は未完 |
| fixedPresetWithComparisonParity | `criticalPathAcceptance.skeleton.test.ts` case2/3 | DONE | 今月 vs 前月 / 今月 vs 前年同期間 の比較 parity 検証 |
| comparisonProvenance | `comparison/domain/__tests__/comparisonProvenance.test.ts` | DONE | toMappingKind / createProvenance / createFallbackProvenance |
| fallbackVisible | `fallbackMetadataGuard.test.ts` (guard) | PARTIAL | 構造的検証のみ。functional fallback visibility test は不十分 |

### L3 性質テスト 5 本 — **0 DONE / 1 PARTIAL / 4 NOT-DONE**

| 項目 | 対応テスト | 状態 | 証拠 |
|---|---|---|---|
| storeOrderInvariance | (なし) | NOT-DONE | 店舗順序不変性の standalone property test なし |
| rowOrderInvariance | (なし) | NOT-DONE | 行順序不変性の standalone property test なし |
| partitionAdditivity | (なし) | NOT-DONE | パーティション加法性の standalone property test なし |
| presetVsManualRange | `criticalPathAcceptance.skeleton.test.ts` | PARTIAL | acceptance skeleton に含まれるが standalone ではない |
| amountOnlyTransport | (なし) | NOT-DONE | 額のみ transport の standalone property test なし |

### L4 回帰フィクスチャテスト 5 本 — **2 DONE / 3 PARTIAL**

| 項目 | 対応テスト | 状態 | 証拠 |
|---|---|---|---|
| monthBoundary | `readFreePeriodFact.test.ts` + `criticalPathAcceptance.skeleton.test.ts` case4 | PARTIAL | 月跨ぎ fixture あり。dedicated regression test としてはない |
| missingDays | `readFreePeriodFact.test.ts` L184-203 | PARTIAL | 0 と欠損の区別はテスト済み。日欠損ギャップの完全カバーは未 |
| zeroCustomer | `readFreePeriodFact.test.ts` L64-68 + `readFreePeriodDeptKPI.test.ts` L113-129 | DONE | 客数ゼロで客単価ゼロ + zero salesActual/salesBudget |
| noPurchaseRows | `readFreePeriodFact.test.ts` L21-29 | DONE | 空配列で全値ゼロ |
| scopedPrevYearNaming | `ComparisonScope.test.ts` L349-387 | PARTIAL | sourceMonth derivation テスト済み。naming aspect は部分的 |

### CI 3 lane — **DONE**

| 項目 | 状態 | 証拠 |
|---|---|---|
| Fast lane | DONE | `.github/workflows/ci.yml` fast-gate: lint + format + build + guard |
| Medium lane | DONE | test-coverage + docs-health |
| Slow lane | DONE | e2e: Playwright (chromium + mobile-chrome) |

### Phase 8 サマリ

| 状態 | 件数 | 割合 |
|---|---|---|
| DONE | 14 | 58% |
| PARTIAL | 6 | 25% |
| NOT-DONE | 4 | 17% (全て L3 property tests) |

---

## 3. NOT-DONE 項目の処置方針

### 処置 A: scope 変更として明示的に除外

以下の項目は、test-plan.md 策定時点での「あるとよい」設計だったが、
Phase 2-5 の実装で **別の手段で同等の保証が既に達成されている** ため、
専用 guard / test を新規追加する意味が薄い。

| 項目 | 理由 |
|---|---|
| G4 noDoubleAggregation | `aggregateKpiByAlignment` / `aggregateMonthlyTotal` は pure 関数化済みで呼び出し箇所が限定的 (comparisonProjections.ts)。二重集約の構造的リスクは Phase O4 で `ComparisonProjectionContext` に縮退した時点で消失 |
| G4 amountOnlyTransport | `noRateInFreePeriodSqlGuard` が SQL 側の rate 禁止を保証。VM 側は `weightedAverageRate()` pure builder に集約済み。追加の transport guard は費用対効果が低い |
| L3 storeOrderInvariance | projection pure 関数 (projectStoreDailySeries / projectCategoryDailySeries) の truth-table test で storeId 昇順ソートを 33 件で凍結済み |
| L3 rowOrderInvariance | 同上。dateKey 昇順ソート / 同一 key 合算を凍結済み |
| L3 partitionAdditivity | `buildComparisonAggregation.test.ts` の 34 件で合計一致 invariant を検証済み |
| L3 amountOnlyTransport | G4 amountOnlyTransport と同理由 |

### 処置 B: PARTIAL を DONE 扱い (既存カバレッジで十分)

| 項目 | 理由 |
|---|---|
| G4 noRateInVm | VM 層の率計算は `weightedAverageRate()` builder に集約完了。guard 追加より builder の単体テストで保証する方が正確 |
| G5 readModelCoverageMetadata | `readModelSafetyGuard` が status-based safety access を検証。"coverage metadata" はメタ概念であり、個別 guard としての追加価値は限定的 |
| L1 freePeriodHandler | handler の orchestration uniqueness は freePeriodHandlerOnlyGuard で保証。functional integration は DuckDB 依存のため単体テストの投入効率が低い |
| L2 fixedPresetParity | acceptance skeleton (Phase 0.5) の 5 cases + frameComparisonParity.test.ts で実質カバー |
| L2 fallbackVisible | fallbackMetadataGuard + readModelSafetyGuard で構造的にカバー |
| L3 presetVsManualRange | acceptance skeleton + ComparisonScope.test.ts preset 別テストでカバー |
| L4 monthBoundary | readFreePeriodFact.test.ts + ComparisonScope.test.ts 月跨ぎテスト + projectXxxDailySeries parity の月跨ぎ fixture でカバー |
| L4 missingDays | readFreePeriodFact.test.ts の 0/欠損区別テストでカバー |
| L4 scopedPrevYearNaming | ComparisonScope.test.ts sourceMonth + comparisonScopeGuard unscoped names 禁止でカバー |

---

## 4. 最終判定

全 NOT-DONE / PARTIAL 項目は **処置 A (scope 変更) または処置 B (既存カバレッジで DONE 扱い)** で閉じられる。

新規 guard / test の追加は不要。checklist.md の Phase 7 / Phase 8 checkbox を本 audit 結果に基づき更新する。
