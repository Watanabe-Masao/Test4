# budgetAnalysis Engine Audit

Phase 6 横展開: WASM/Rust 移行候補としての budgetAnalysis 監査

## 1. 対象モジュール

| ファイル | 行数 | 公開関数 |
|---|---|---|
| `domain/calculations/budgetAnalysis.ts` | ~120 | `calculateBudgetAnalysis`, `calculateGrossProfitBudget` |

## 2. 公開関数の詳細

### calculateBudgetAnalysis

```typescript
function calculateBudgetAnalysis(
  totalSales: number,
  budget: number | null,
  prevYearSales: number | null,
  daysElapsed: number,
  totalDays: number,
): BudgetAnalysisResult
```

**出力（11 メトリクス）:**
- `budgetAchievementRate` — 予算達成率
- `budgetDiff` — 予算差額
- `prevYearComparisonRate` — 前年比
- `prevYearDiff` — 前年差額
- `dailyAverageSales` — 日販平均
- `remainingBudget` — 残予算
- `requiredDailyAverage` — 達成必要日販
- `projectedMonthEnd` — 月末見込
- `projectedAchievementRate` — 見込達成率
- `daysElapsed` — 経過日数
- `remainingDays` — 残日数

### calculateGrossProfitBudget

```typescript
function calculateGrossProfitBudget(
  totalGrossProfit: number,
  grossProfitBudget: number | null,
  prevYearGrossProfit: number | null,
  daysElapsed: number,
  totalDays: number,
): GrossProfitBudgetResult
```

**出力（5 メトリクス）:**
- `achievementRate` — 達成率
- `diff` — 差額
- `prevYearRate` — 前年比
- `projectedMonthEnd` — 月末見込
- `projectedAchievementRate` — 見込達成率

## 3. FFI 互換性分析

| 観点 | 評価 | 詳細 |
|---|---|---|
| 入力型 | ✅ A | `number` と `number | null` のみ。Map/Date なし |
| 出力型 | ✅ A | plain object（number フィールドのみ） |
| Date 依存 | ✅ なし | カレンダー計算は呼び出し元が担当 |
| 副作用 | ✅ なし | 純粋関数 |
| JSON シリアライズ | ✅ 完全互換 | 入出力ともに JSON-safe |

**結論:** FFI 障壁ゼロ。`ReadonlyMap` 変換も Date 注入も不要。
forecast（Map 変換必要）や factorDecomposition（同）と比較して最も移行しやすい。

## 4. Authoritative / Analytics 分類

| 関数 | 分類 | 根拠 |
|---|---|---|
| `calculateBudgetAnalysis` | **Authoritative** | 予算達成率・日販平均等の確定値。UI の KPI 表示に直結 |
| `calculateGrossProfitBudget` | **Authoritative** | 粗利予算達成率の確定値 |

両関数とも Authoritative Business Calculation。Analytics substrate ではない。

## 5. テスト資産

### Domain 層テスト

| ファイル | テスト数 | 内容 |
|---|---|---|
| `budgetAnalysis.test.ts` | 11 | 正常系 + null 入力 + 0除算 + 経過日数 0 |

### DuckDB 層テスト（Analytics）

| ファイル | テスト数 | 内容 |
|---|---|---|
| `budgetAnalysisQuery.test.ts` | 13 | SQL クエリの正常系 + フィルタ + 集計 |

### 不変条件（暗黙）

| ID | 条件 | 現状 |
|---|---|---|
| B-INV-1 | `projectedMonthEnd >= 0` | テスト済み（0 除算ケース） |
| B-INV-2 | `daysElapsed + remainingDays == totalDays` | 暗黙（テスト未明示） |
| B-INV-3 | `budget == null → achievementRate == 0, diff == 0` | テスト済み |
| B-INV-4 | `daysElapsed == 0 → dailyAverage == 0` | テスト済み |
| B-INV-5 | `remainingDays == 0 → requiredDailyAverage == 0` | テスト済み |

## 6. barrel export の現状

| 関数 | barrel 経由 export | 直接 import |
|---|---|---|
| `calculateBudgetAnalysis` | ✅ `domain/calculations/index.ts` 経由 | — |
| `calculateGrossProfitBudget` | ⚠️ `grossProfit.ts` から未 export | 直接 import あり |

`calculateGrossProfitBudget` は barrel に含まれていない。Bridge 作成時に整理が必要。

## 7. CQRS 適合性

| 観点 | 現状 | 評価 |
|---|---|---|
| Command/Query 分離 | domain = 確定計算、DuckDB = 探索集計 | ✅ 完全分離 |
| 二重実装 | なし（JS と SQL で同一ロジック重複なし） | ✅ |
| 正式値の定義元 | `calculateBudgetAnalysis` のみ | ✅ 単一定義元 |

## 8. 移行難易度評価

| 評価項目 | スコア | 理由 |
|---|---|---|
| FFI 互換性 | 10/10 | 型変換不要 |
| テスト充実度 | 9/10 | 不変条件の明示テストが一部未作成 |
| 副作用なし | 10/10 | 完全 pure |
| Date 非依存 | 10/10 | カレンダー計算なし |
| コード量 | 10/10 | ~120 行、移行コスト極小 |
| 業務重要度 | 8/10 | KPI 直結だが計算自体は単純 |
| **総合** | **Grade A (95/100)** | **最も移行しやすい候補** |

## 9. forecast / factorDecomposition との比較

| 観点 | budgetAnalysis | forecast | factorDecomposition |
|---|---|---|---|
| 入力型 | `number` | `ReadonlyMap` | `number` |
| Date 依存 | なし | あり（4関数） | なし |
| FFI 変換 | 不要 | Map→Array 必要 | 不要 |
| 関数数 | 2 | 11 | 4 |
| コード量 | ~120行 | ~625行 | ~400行 |
| 移行難易度 | ★☆☆ | ★★★ | ★★☆ |

## 10. 次ステップ（Phase 7 以降）

1. **不変条件テスト追加** — B-INV-2（経過日数+残日数=総日数）の明示テスト
2. **Bridge 骨格作成** — `budgetAnalysisBridge.ts`（ts-only、forecast/factorDecomposition と同パターン）
3. **barrel 整理** — `calculateGrossProfitBudget` の export パス統一
4. **Rust 実装** — FFI 変換不要のため、最も単純な Rust 移行候補
