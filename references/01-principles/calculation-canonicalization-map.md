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

| ファイル | 計算内容 | 正本化状態 | readModel |
|---------|---------|-----------|-----------|
| invMethod.ts | 在庫法粗利 | ✅ | calculateGrossProfit 経由 |
| estMethod.ts | 推定法マージン | ✅ | calculateGrossProfit 経由 |
| budgetAnalysis.ts | 予算達成率・着地予測 | ✅ | StoreResult 統一済み |
| factorDecomposition.ts | シャープリー値分解 | ✅ | calculateFactorDecomposition |
| **discountImpact.ts** | 売変ロス原価 | ❌ **未正本化** | 新設必要 |
| **costAggregation.ts** | 移動合計・在庫仕入原価 | ❌ **未正本化** | 新設必要 |
| **markupRate.ts** | 平均値入率・コア値入率 | ❌ **未正本化** | 新設必要 |
| **inventoryCalc.ts** | 日別推定在庫推移 | ❌ **未正本化** | 新設必要 |
| **observationPeriod.ts** | 観測期間ステータス | ❌ **未正本化** | 新設必要 |
| **remainingBudgetRate.ts** | 残予算必要達成率 | ❌ **未正本化** | 新設必要 |
| **pinIntervals.ts** | 在庫確定区間の粗利 | ❌ **未正本化** | 新設必要 |

## 検討（Zod 入出力契約を追加すべき）

分析結果を生成する。探索的用途だが、入出力の意味は固定すべき。

| ファイル | 計算内容 | 対応 |
|---------|---------|------|
| **timeSlotCalculations.ts** | コアタイム・ターンアラウンド時間 | Zod 入出力契約 |
| **algorithms/advancedForecast.ts** | WMA・回帰・天気調整予測 | Zod 入出力契約 |
| **algorithms/sensitivity.ts** | What-if 分析（粗利シミュレーション） | Zod 入出力契約 |
| **algorithms/trendAnalysis.ts** | MoM/YoY/移動平均/季節指数/トレンド | Zod 入出力契約 |
| **algorithms/correlation.ts** | ピアソン相関・コサイン類似度 | Zod 入出力契約 |
| **forecast.ts** | 週次サマリー・曜日平均・異常値検出 | Zod 入出力契約 |
| **dowGapAnalysis.ts** | 曜日ギャップ分析 | Zod 入出力契約 |
| **dowGapActualDay.ts** | 実日数マッピング | Zod 入出力契約 |
| **temporal/computeMovingAverage.ts** | 移動平均（strict/partial） | Zod 入出力契約 |

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

## 実施優先順

### 第1優先: StoreResult に直接影響する計算

1. **discountImpact** — 売変ロス原価（粗利計算の入力）
2. **costAggregation** — 移動合計・在庫仕入原価（仕入原価の構成要素）
3. **markupRate** — 値入率（推定法の入力）

### 第2優先: 在庫分析に影響する計算

4. **inventoryCalc** — 日別推定在庫（在庫チャートの正本）
5. **observationPeriod** — 観測ステータス（データ品質表示）
6. **pinIntervals** — 在庫確定区間

### 第3優先: 予算系

7. **remainingBudgetRate** — 残予算達成率

### 第4優先: 分析アルゴリズム（Zod 契約のみ）

8-16. timeSlot, forecast, trend, correlation, sensitivity, dowGap, movingAverage
