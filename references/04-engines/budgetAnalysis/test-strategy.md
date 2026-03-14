# budgetAnalysis テスト戦略

Phase 6 横展開: Rust/WASM 移行に向けたテスト資産の棚卸しと不変条件の明文化

## 1. 既存テスト資産

### Domain 層テスト

| ファイル | テスト数 | カバー関数 | 品質 |
|---|---|---|---|
| `budgetAnalysis.test.ts` | 13 | `calculateBudgetAnalysis`(13) | ✅ 正常系 + 0 除算 + 月末到達 + 進捗ギャップ |

### 未テスト関数

| 関数 | 状況 | 優先度 |
|---|---|---|
| `calculateGrossProfitBudget` | テストなし（barrel 未 export と同根の問題） | **高** — 移行前に必須 |

## 2. 不変条件カタログ

### 数学的不変条件（calculateBudgetAnalysis）

| ID | 条件 | 対象フィールド | 検証方法 | 現状 |
|---|---|---|---|---|
| B-INV-1 | `budgetAchievementRate == safeDivide(totalSales, budget, 0)` | budgetAchievementRate | 入力値から直接計算し比較 | テスト済み |
| B-INV-2 | `averageDailySales >= 0 ⟹ projectedSales >= totalSales` | projectedSales | `remainingDays >= 0` かつ `averageDailySales >= 0` なら成立 | 暗黙（明示テスト未作成） |
| B-INV-3 | `budgetProgressGap == budgetProgressRate - budgetElapsedRate` | budgetProgressGap | 恒等式の直接検証 | テスト済み（identity テスト） |
| B-INV-4 | `budgetVariance == totalSales - cumulativeBudget` | budgetVariance | 累計予算を独立計算し差異を検証 | テスト済み |
| B-INV-5 | `remainingBudget == budget - totalSales` | remainingBudget | 恒等式の直接検証 | テスト済み |
| B-INV-6 | `dailyCumulative[d].sales` は d について単調非減少 | dailyCumulative | 全日について `cum[d] >= cum[d-1]` を検証（salesDaily >= 0 前提） | 暗黙 |
| B-INV-7 | `dailyCumulative[d].budget` は d について単調非減少 | dailyCumulative | 全日について `cum[d] >= cum[d-1]` を検証（budgetDaily >= 0 前提） | 暗黙 |
| B-INV-8 | 除数 0 のとき全 rate 系フィールドが 0 を返す | 全 rate フィールド | `budget == 0` で全 rate == 0 | テスト済み |
| B-INV-9 | `elapsedDays == daysInMonth ⟹ projectedSales == totalSales` | projectedSales | 残日数 0 で追加予測なし | テスト済み（月末到達テスト） |
| B-INV-10 | `remainingDays == 0 ⟹ requiredDailySales == 0` | requiredDailySales | 残日数 0 のガード | テスト済み |
| B-INV-11 | `dailyCumulative` のキー数 == `daysInMonth` | dailyCumulative | Object.keys(dailyCumulative).length 検証 | 暗黙 |

### 数学的不変条件（calculateGrossProfitBudget）

| ID | 条件 | 対象フィールド | 検証方法 | 現状 |
|---|---|---|---|---|
| B-INV-12 | `projectedGPAchievement == safeDivide(projectedGrossProfit, grossProfitBudget, 0)` | projectedGPAchievement | 入力から独立計算し比較 | 未テスト |
| B-INV-13 | `grossProfitBudgetVariance == grossProfit - grossProfitBudget * budgetElapsedRate` | grossProfitBudgetVariance | 恒等式の直接検証 | 未テスト |
| B-INV-14 | `grossProfitProgressGap == gpAchievement - budgetElapsedRate` | grossProfitProgressGap | gpAchievement を独立計算し検証 | 未テスト |
| B-INV-15 | `remainingDays == 0 ⟹ requiredDailyGrossProfit == 0` | requiredDailyGrossProfit | 残日数 0 のガード | 未テスト |
| B-INV-16 | `grossProfitBudget == 0 ⟹ projectedGPAchievement == 0` | projectedGPAchievement | safeDivide 保証 | 未テスト |

### 構造的不変条件（elapsedDays / remainingDays）

| ID | 条件 | 検証方法 | 現状 |
|---|---|---|---|
| B-INV-17 | `elapsedDays + remainingDays == daysInMonth`（calculateBudgetAnalysis 内部） | 内部変数 `remainingDays = daysInMonth - elapsedDays` から自明 | 暗黙（audit で指摘済み） |
| B-INV-18 | `elapsedDays + remainingDays == daysInMonth`（calculateGrossProfitBudget 内部） | 同上 | 未テスト |

## 3. Cross-Validation ケース（TS ↔ WASM 比較用）

factorDecomposition / forecast で確立した dual-run compare パターンを budgetAnalysis に適用する。
以下のケースで TS 実装と WASM 実装の出力を比較する。

### calculateBudgetAnalysis

| ケース | 入力特性 | 検証ポイント |
|---|---|---|
| CV-1 | 均一予算・均一売上（全日同額） | 全フィールドの基本出力一致 |
| CV-2 | 売上 > 予算（予算超過ペース） | budgetProgressGap > 0, budgetVariance > 0 |
| CV-3 | 売上 << 予算（大幅未達） | budgetProgressGap < 0, requiredDailySales の数値精度 |
| CV-4 | elapsedDays == daysInMonth（月末到達） | projectedSales == totalSales, requiredDailySales == 0 |
| CV-5 | elapsedDays == 0（月初） | 累計予算 0、budgetProgressRate == 0 |
| CV-6 | budget == 0 | 全 rate 系が 0（safeDivide 保証） |
| CV-7 | salesDays == 0（営業日なし） | averageDailySales == 0 |
| CV-8 | 日別予算が不均一（週末多め等） | dailyCumulative の累計精度 |
| CV-9 | 歯抜け salesDaily（休業日あり） | dailyCumulative の累計が正確 |
| CV-10 | 大数値（売上 10 億超、予算 10 億超） | 浮動小数点精度 |

### calculateGrossProfitBudget

| ケース | 入力特性 | 検証ポイント |
|---|---|---|
| CV-11 | 正常ケース（粗利 > 0, 予算 > 0） | 全フィールドの基本出力一致 |
| CV-12 | grossProfitBudget == 0 | safeDivide 保証、全 rate == 0 |
| CV-13 | remainingDays == 0 | requiredDailyGrossProfit == 0 |
| CV-14 | budgetElapsedRate == 0（月初相当） | elapsedGPBudget == 0 |
| CV-15 | grossProfit が負値 | projectedGrossProfit の符号 |

## 4. Edge Case 列挙

### 入力 edge case（calculateBudgetAnalysis）

| # | 条件 | 期待動作 |
|---|---|---|
| E-1 | `budgetDaily` が空オブジェクト `{}` | cumulativeBudget == 0、budgetElapsedRate == 0 |
| E-2 | `salesDaily` が空オブジェクト `{}` | dailyCumulative の sales 列が全日 0 |
| E-3 | `totalSales` が負値 | 計算は実行される（入力バリデーションは呼び出し元の責務） |
| E-4 | `elapsedDays > daysInMonth` | remainingDays が負、projectedSales < totalSales の可能性 |
| E-5 | `salesDays > elapsedDays` | 業務的には異常だが計算は実行される |
| E-6 | `daysInMonth == 0` | dailyCumulative が空、remainingDays が負 |
| E-7 | `Number.MAX_SAFE_INTEGER` 級の売上 | f64 精度限界 |
| E-8 | `budgetDaily` のキーが 1 始まりでない（0 始まり） | キー 0 の値は累計に含まれない |
| E-9 | `salesDaily` と `budgetDaily` のキー範囲が不一致 | 存在しないキーは `?? 0` でフォールバック |

### 入力 edge case（calculateGrossProfitBudget）

| # | 条件 | 期待動作 |
|---|---|---|
| E-10 | `grossProfitBudget == 0` | 全 rate 系が 0 |
| E-11 | `budgetElapsedRate` が 1 を超える | elapsedGPBudget > grossProfitBudget |
| E-12 | `salesDays == 0` | averageDailyGP == 0, projectedGrossProfit == grossProfit + 0 |
| E-13 | `grossProfit` が負値 | projectedGrossProfit の符号に影響 |

## 5. 精度許容差

| 対象 | TS 型 | 許容差 | 理由 |
|---|---|---|---|
| 売上合計・差額（整数系） | `number` | `±1` | 丸め差 |
| 達成率・消化率（rate 系） | `number` | `±1e-10` | f64 除算精度 |
| 進捗ギャップ | `number` | `±1e-10` | rate の減算、誤差伝播 |
| 日平均売上 | `number` | `±1e-10` | f64 除算精度 |
| 月末予測売上 | `number` | `±1` | 乗算の累積誤差 |
| dailyCumulative.sales | `number` | `±1` | 整数加算（通常は誤差なし） |
| dailyCumulative.budget | `number` | `±1` | 不均一予算の場合に除算丸め差 |

## 6. ガードテスト追加候補

現在のテストにない検証で、WASM 移行前に追加すべきもの:

| テスト | 対象 | 対応する不変条件 | 理由 |
|---|---|---|---|
| projectedSales >= totalSales 検証 | `calculateBudgetAnalysis` | B-INV-2 | averageDailySales >= 0 の前提下で常に成立すべき |
| dailyCumulative 単調非減少 | `calculateBudgetAnalysis` | B-INV-6, B-INV-7 | 累計値の基本性質 |
| dailyCumulative キー数 == daysInMonth | `calculateBudgetAnalysis` | B-INV-11 | 構造の完全性 |
| calculateGrossProfitBudget 全テスト | `calculateGrossProfitBudget` | B-INV-12〜18 | 現在テストゼロ |
| elapsedDays + remainingDays == daysInMonth | 両関数 | B-INV-17, B-INV-18 | audit で指摘済み未対応 |
