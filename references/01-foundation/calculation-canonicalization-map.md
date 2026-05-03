# domain/calculations/ 正本化マップ

> 全30ファイルを **必須 / 検討 / 不要** の3分類に確定。
> 迷う余地をなくす。

## 分類基準

| 分類 | 基準 | 対応 |
|------|------|------|
| **必須** | ユーザーが見る業務値を生成する。値の意味が固定されるべき | readModel + Zod + テスト |
| **検討** | 分析結果を生成するが、StoreResult 経由ではない探索的用途 | Zod 入出力契約のみ（readModel は任意） |
| **不要** | プリミティブ関数・内部ユーティリティ・型定義のみ | 現状維持 |

---

## 必須（readModel 正本化が必要）

ユーザーが見る業務値を直接生成する計算。

| ファイル | 計算内容 | Zod | readModel |
|---------|---------|-----|-----------|
| invMethod.ts | 在庫法粗利 | ✅ | calculateGrossProfit 経由 |
| estMethod.ts | 推定法マージン | ✅ | calculateGrossProfit 経由 |
| budgetAnalysis.ts | 予算達成率・着地予測 | ✅ | StoreResult 統一済み |
| factorDecomposition.ts | シャープリー値分解 | ✅ | calculateFactorDecomposition |
| discountImpact.ts | 売変ロス原価 | ✅ | Zod 契約追加済み |
| costAggregation.ts | 移動合計・在庫仕入原価 | ✅ | Zod 契約追加済み |
| markupRate.ts | 平均値入率・コア値入率 | ✅ | Zod 契約追加済み |
| inventoryCalc.ts | 日別推定在庫推移 | ✅ | Zod 契約追加済み |
| observationPeriod.ts | 観測期間ステータス | ✅ | Zod 契約追加済み |
| remainingBudgetRate.ts | 残予算必要達成率 | ✅ | Zod 契約追加済み |
| pinIntervals.ts | 在庫確定区間の粗利 | ✅ | Zod 契約追加済み |
| piValue.ts | PI値（点数PI値・金額PI値） | ✅ | Zod 契約追加済み |
| customerGap.ts | 前年比客数GAP | ✅ | Zod 契約追加済み |

## 検討（Zod 入出力契約を追加すべき）

分析結果を生成する。探索的用途だが、入出力の意味は固定すべき。

| ファイル | 計算内容 | Zod |
|---------|---------|-----|
| algorithms/sensitivity.ts | What-if 分析 | ✅ 追加済み |
| algorithms/trendAnalysis.ts | MoM/YoY/トレンド | ✅ 追加済み |
| algorithms/advancedForecast.ts | WMA・回帰・天気調整予測 | ✅ 追加済み |
| algorithms/correlation.ts | ピアソン相関・コサイン類似度 | ✅ 追加済み |
| forecast.ts | 週次サマリー・異常値検出 | ✅ 追加済み |
| temporal/computeMovingAverage.ts | 移動平均（strict/partial） | ✅ 追加済み |
| timeSlotCalculations.ts | コアタイム・ターンアラウンド | ❌ Map 入力のため据え置き |
| dowGapAnalysis.ts | 曜日ギャップ分析 | ❌ 出力型が domain/models 依存 |
| dowGapActualDay.ts | 実日数マッピング | ❌ 出力型が domain/models 依存 |

## 不要（現状維持）

プリミティブ関数・内部ユーティリティ・型定義。

| ファイル | 理由 |
|---------|------|
| utils.ts | safeDivide 等のプリミティブ。Rust core-utils で authoritative |
| divisor.ts | 除数計算の内部ユーティリティ |
| averageDivisor.ts | 平均除数の内部ユーティリティ |
| aggregation.ts | 多店舗集約の内部ユーティリティ |
| rawAggregation/statisticalFunctions.ts | 標準偏差/Z-score の内部ユーティリティ |
| dowGapStatistics.ts | dowGapAnalysis の内部ヘルパー |
| decomposition.ts | re-export モジュール |
| factorDecompositionDto.ts | 型定義のみ（Rust FFI 用） |
| grossProfit.ts | バレルエクスポート |
| index.ts | バレルエクスポート |
| forecast.barrel.ts | バレルエクスポート |
| algorithms/index.ts | バレルエクスポート |
| temporal/index.ts | バレルエクスポート |

---

## 完了状況

| 分類 | 合計 | Zod 追加済み | 残り |
|------|------|------------|------|
| 必須 | 14 | 14 (100%) | 0 |
| 検討 | 9 | 7 (78%) | 2 (domain/models 依存) |
| 不要 | 13 | — | — |

### 据え置き（domain/models の Zod 化が前提）

- **timeSlotCalculations.ts** — 入力が Map ベース。出力型も自明
- **dowGapAnalysis.ts** — 出力型 `DowGapAnalysis` が domain/models/ComparisonContext に定義
- **dowGapActualDay.ts** — 出力型 `ActualDayImpact` が domain/models/ComparisonContext に定義
