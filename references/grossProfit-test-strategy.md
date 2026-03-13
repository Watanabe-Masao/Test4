# grossProfit テスト戦略

Phase 6 横展開: Rust/WASM 移行に向けたテスト資産の棚卸しと不変条件の明文化

## 1. 既存テスト資産

### Domain 層テスト

| ファイル | テスト数 | カバー関数 | 品質 |
|---|---|---|---|
| `invMethod.test.ts` | 10 | `calculateInvMethod`(10) | 正常系 + null 入力 + 0 除算 + 負値 + 精度 + 在庫増加 |
| `estMethod.test.ts` | 14 | `calculateEstMethod`(10), `calculateCoreSales`(5), `calculateDiscountRate`(4) | 正常系 + 0 入力 + null 入力 + フォールバック + 超過納品 |
| `discountImpact.test.ts` | 6 | `calculateDiscountImpact`(6) | 正常系 + 0 入力 + フォールバック + 高売変率 |
| `markupRate.test.ts` | 7 | `calculateMarkupRates`(7) | 0 入力 + 分離計算 + 不変条件 + storeAssembler 互換 |
| `costAggregation.test.ts` | 6 | `calculateTransferTotals`(3), `calculateInventoryCost`(3) | 0 入力 + 4 方向合計 + storeAssembler 互換 |

**合計: 43 テスト**

### 未テスト領域

| 領域 | 状況 | 優先度 |
|---|---|---|
| Cross-Validation（モジュール間連携） | markupRate → estMethod → discountImpact の一気通貫テストなし | **高** — 移行前に必須 |
| 極値入力（Number.MAX_SAFE_INTEGER 級） | 個別テストなし | **中** — WASM 移行時の f64 精度保証 |
| costAggregation → markupRate 連携 | 互換性テストのみ。出力→入力の連結テストなし | **高** |

## 2. 不変条件カタログ

### 数学的不変条件

| ID | 条件 | 対象関数 | 検証方法 | 現状 |
|---|---|---|---|---|
| GP-INV-1 | `COGS = openingInventory + totalPurchaseCost - closingInventory` | `calculateInvMethod` | 入力値から直接計算し cogs と比較 | テスト済み（複数ケース） |
| GP-INV-2 | `grossProfit = totalSales - COGS` | `calculateInvMethod` | cogs を中間値として独立計算し比較 | テスト済み |
| GP-INV-3 | `openingInventory == null \|\| closingInventory == null → cogs, grossProfit, grossProfitRate 全て null` | `calculateInvMethod` | null 入力パターン 3 種で検証 | テスト済み |
| GP-INV-4 | `margin = coreSales - cogs` | `calculateEstMethod` | coreSales と cogs から直接計算し比較 | テスト済み |
| GP-INV-5 | `closingInventory = openingInventory + inventoryPurchaseCost - cogs`（openingInventory != null のとき） | `calculateEstMethod` | opening, purchase, cogs から独立計算し比較 | テスト済み |
| GP-INV-6 | `coreSales < 0 → coreSales = 0, isOverDelivery = true` | `calculateCoreSales` | 花+産直 > 総売上 のケースで検証 | テスト済み |
| GP-INV-7 | `salesAmount + discountAmount = 0 → discountRate = 0`（safeDivide によるゼロ除算ガード） | `calculateDiscountRate` | 両方 0 のケースで検証 | テスト済み |
| GP-INV-8 | `discountLossCost = (1 - markupRate) * coreSales * discountRate / (1 - discountRate)` | `calculateDiscountImpact` | 入力値から直接計算し比較 | テスト済み |
| GP-INV-9 | `markupRate = (price - cost) / price`（averageMarkupRate, coreMarkupRate ともに） | `calculateMarkupRates` | 入力値から独立計算し比較 | テスト済み |
| GP-INV-10 | `transferPrice = interStoreInPrice + interStoreOutPrice + interDepartmentInPrice + interDepartmentOutPrice` | `calculateTransferTotals` | 4 方向の入力合計と比較 | テスト済み |
| GP-INV-11 | `inventoryCost = totalCost - deliverySalesCost` | `calculateInventoryCost` | 入力値から直接計算し比較 | テスト済み |
| GP-INV-12 | 全出力が有限値（任意の有限入力に対して `isFinite` が true） | 全関数 | 極値入力で NaN/Infinity が出ないことを検証 | **未テスト** |

### 業務的不変条件

| ID | 条件 | 対象関数 | 根拠 | 現状 |
|---|---|---|---|---|
| GP-BIZ-1 | `0 <= markupRate < 1`（正常な小売データの場合） | `calculateMarkupRates` | 売価 > 原価 > 0 なら成立。原価割れ仕入は業務的に異常 | テスト済み（不変条件テスト） |
| GP-BIZ-2 | `grossProfitRate` は負値を許容する（赤字シナリオは有効） | `calculateInvMethod` | COGS > 売上の場合に発生。業務的に正常なケース | テスト済み（粗利マイナスケース） |
| GP-BIZ-3 | `coreSales >= 0`（0 にクランプされる） | `calculateCoreSales` | 花・産直が売上を超過した場合、負のコア売上は意味を持たない | テスト済み |
| GP-BIZ-4 | `discountRate >= 0`（正常データ） | `calculateDiscountRate` | 売変額・売上が非負なら成立 | 暗黙 |
| GP-BIZ-5 | `grossSales >= coreSales`（売変率 >= 0 のとき） | `calculateEstMethod` | 粗売上 = コア売上/(1-売変率) で、0 <= 売変率 < 1 なら成立 | 暗黙 |

## 3. Cross-Validation ケース

### 単一関数の基本検証（TS <-> WASM 比較用）

| ケース | 対象関数 | 入力特性 | 検証ポイント |
|---|---|---|---|
| CV-1 | `calculateInvMethod` | 標準的な小売データ（期首100万、期末80万、仕入500万、売上700万） | 全フィールドの出力一致 |
| CV-2 | `calculateInvMethod` | 売上 0、仕入あり | grossProfitRate の safeDivide フォールバック |
| CV-3 | `calculateInvMethod` | 粗利マイナス（COGS > 売上） | 負の grossProfit, grossProfitRate の符号 |
| CV-4 | `calculateEstMethod` | 標準的な推定計算（売変率 2%、値入率 26%） | grossSales, cogs, margin の数値精度 |
| CV-5 | `calculateEstMethod` | 売変率 0、値入率 0 | 粗売上 = コア売上、cogs = コア売上 |
| CV-6 | `calculateEstMethod` | openingInventory == null | closingInventory が null で返る |
| CV-7 | `calculateCoreSales` | 花 + 産直 > 総売上 | coreSales == 0, isOverDelivery == true |
| CV-8 | `calculateDiscountRate` | 正常ケース（売上 98 万、売変 2 万） | 売変率 0.02 |
| CV-9 | `calculateDiscountImpact` | 標準ケース（コア売上 500 万、値入率 0.26、売変率 0.02） | discountLossCost の数値精度 |
| CV-10 | `calculateMarkupRates` | 仕入 + 売上納品 + 移動の全カテゴリ混在 | averageMarkupRate と coreMarkupRate の分離計算 |
| CV-11 | `calculateTransferTotals` | 4 方向全てに値あり | transferPrice, transferCost の合計 |
| CV-12 | `calculateInventoryCost` | 標準ケース | 単純減算の一致 |

### モジュール間連携検証

| ケース | 連携パス | 入力特性 | 検証ポイント |
|---|---|---|---|
| CV-13 | `calculateTransferTotals` → `calculateMarkupRates` | transferTotals の出力を markupRates の入力に使用 | 中間値の受け渡し精度 |
| CV-14 | `calculateMarkupRates` → `calculateEstMethod` | coreMarkupRate を estMethod の markupRate として使用 | 値入率経由の推定原価精度 |
| CV-15 | `calculateMarkupRates` → `calculateDiscountImpact` | coreMarkupRate を discountImpact の markupRate として使用 | 売変ロス原価の精度 |
| CV-16 | `calculateCoreSales` → `calculateEstMethod` | coreSales を estMethod の入力に使用 | コア売上→推定マージンの一気通貫精度 |
| CV-17 | `calculateDiscountRate` → `calculateEstMethod` | discountRate を estMethod の入力に使用 | 売変率→粗売上→推定原価の精度 |
| CV-18 | `calculateInventoryCost` → `calculateEstMethod` | inventoryCost を inventoryPurchaseCost として使用 | 在庫仕入原価→推定期末在庫の精度 |

### 極値入力検証

| ケース | 入力特性 | 検証ポイント |
|---|---|---|
| CV-19 | 全関数に `Number.MAX_SAFE_INTEGER` 級の入力 | NaN/Infinity が出ないこと、f64 精度限界内 |
| CV-20 | 全関数に微小値（1e-15 級）の入力 | ゼロ近傍での数値安定性 |

## 4. Edge Cases

### invMethod

| # | 条件 | 期待動作 |
|---|---|---|
| E-1 | 売上 0、仕入 0、在庫 0 | cogs == 0, grossProfit == 0, grossProfitRate == 0 |
| E-2 | 売上 0、在庫あり | grossProfitRate == 0（safeDivide フォールバック） |
| E-3 | 負の粗利（COGS > 売上） | grossProfit < 0, grossProfitRate < 0 |
| E-4 | openingInventory == null のみ | 全結果 null |
| E-5 | closingInventory == null のみ | 全結果 null |
| E-6 | 両方 null | 全結果 null |
| E-7 | 負の在庫値 | 計算は実行される（入力バリデーションは呼び出し元の責務） |
| E-8 | 在庫増加（closingInventory > openingInventory + totalPurchaseCost） | cogs が負値になりうる |
| E-9 | `Number.MAX_SAFE_INTEGER` 級の売上・仕入 | f64 精度限界の検証 |

### estMethod

| # | 条件 | 期待動作 |
|---|---|---|
| E-10 | コア売上 0 | grossSales == 0, cogs == costInclusionCost, marginRate == 0 |
| E-11 | 売変率 1.0（ゼロ除算） | grossSales フォールバック（= coreSales） |
| E-12 | 値入率 0（原価 = 粗売上） | cogs == grossSales + costInclusionCost, margin == coreSales - cogs |
| E-13 | 値入率 1.0 | cogs == costInclusionCost のみ |
| E-14 | openingInventory == null | closingInventory == null |
| E-15 | 原価算入費のみ（コア売上 0、原価算入費 > 0） | margin が負値 |
| E-16 | 高い売変率（0.1 = 10%） | 粗売上が大幅増加 |

### calculateCoreSales

| # | 条件 | 期待動作 |
|---|---|---|
| E-17 | 花 + 産直 > 総売上 | coreSales == 0, isOverDelivery == true, overDeliveryAmount == 超過額 |
| E-18 | 花 + 産直 == 総売上 | coreSales == 0, isOverDelivery == false |
| E-19 | 花・産直ともに 0 | coreSales == totalSales |
| E-20 | 総売上 0、花・産直 0 | coreSales == 0, isOverDelivery == false |

### calculateDiscountRate

| # | 条件 | 期待動作 |
|---|---|---|
| E-21 | 売上 0、売変 0 | discountRate == 0（safeDivide フォールバック） |
| E-22 | 売上 0、売変あり | discountRate == 1（全額売変） |
| E-23 | 売変 0 | discountRate == 0 |

### discountImpact

| # | 条件 | 期待動作 |
|---|---|---|
| E-24 | コア売上 0 | discountLossCost == 0 |
| E-25 | 売変率 0 | discountLossCost == 0 |
| E-26 | 値入率 0 | discountLossCost == coreSales * discountRate/(1-discountRate) |
| E-27 | 売変率 1.0（ゼロ除算） | safeDivide フォールバックで discountRate をそのまま使用 |

### markupRate

| # | 条件 | 期待動作 |
|---|---|---|
| E-28 | 全仕入ゼロ | averageMarkupRate == 0, coreMarkupRate == defaultMarkupRate |
| E-29 | 仕入のみ（売上納品・移動なし） | averageMarkupRate == coreMarkupRate |
| E-30 | 売上納品あり → average と core の乖離 | averageMarkupRate != coreMarkupRate |
| E-31 | 原価 > 売価（仕入赤字） | markupRate < 0（業務的には異常だが計算は実行） |

### costAggregation

| # | 条件 | 期待動作 |
|---|---|---|
| E-32 | 全方向ゼロ | transferPrice == 0, transferCost == 0 |
| E-33 | 売上納品原価 > 総原価 | inventoryCost < 0（業務的には異常だが計算は実行） |
| E-34 | 売上納品ゼロ | inventoryCost == totalCost |

## 5. 精度許容差

| 対象 | TS 型 | 許容差 | 理由 |
|---|---|---|---|
| 売上原価・粗利益・在庫（整数系） | `number` | `+-1` | 丸め差 |
| 粗利率・マージン率（rate 系） | `number` | `+-1e-10` | f64 除算精度 |
| 値入率（markupRate） | `number` | `+-1e-10` | f64 除算精度 |
| 売変率（discountRate） | `number` | `+-1e-10` | f64 除算精度 |
| 粗売上（grossSales） | `number` | `+-1` | 除算 + 丸め |
| 推定原価（cogs） | `number` | `+-1` | 乗算 + 加算の累積誤差 |
| 推定期末在庫（closingInventory） | `number` | `+-1` | 加算の累積誤差 |
| 売変ロス原価（discountLossCost） | `number` | `+-1` | 乗算 + 除算の累積誤差 |
| 移動合計（transferPrice/Cost） | `number` | `0`（完全一致） | 整数加算のみ |
| 在庫仕入原価（inventoryCost） | `number` | `0`（完全一致） | 整数減算のみ |

## 6. Rust 移行後も守るべき性質

### 数値安定性

| 性質 | 説明 | 検証方法 |
|---|---|---|
| NaN 非生成 | 任意の有限入力に対して NaN を返さない | GP-INV-12 の全関数テスト |
| Infinity 非生成 | 任意の有限入力に対して Infinity を返さない | GP-INV-12 の全関数テスト |
| safeDivide 互換 | ゼロ除算時にフォールバック値を返す | 各関数のゼロ入力テスト |

### 型の互換性

| 性質 | 説明 | 検証方法 |
|---|---|---|
| null 伝播 | `openingInventory == null` のとき関連出力が null | GP-INV-3, GP-INV-5 のテスト |
| Option 型マッピング | TS の `number \| null` が Rust の `Option<f64>` に正確に対応 | FFI 境界テスト |
| plain object 互換 | 出力が JSON シリアライズ可能な plain object であること | 構造テスト |

### 恒等式

| 性質 | 恒等式 | 対応する不変条件 |
|---|---|---|
| 在庫法 COGS | `COGS = opening + purchase - closing` | GP-INV-1 |
| 在庫法粗利 | `grossProfit = sales - COGS` | GP-INV-2 |
| 推定法マージン | `margin = coreSales - cogs` | GP-INV-4 |
| 推定法期末在庫 | `closingInv = opening + purchase - cogs` | GP-INV-5 |
| コア売上クランプ | `coreSales >= 0` | GP-INV-6 |
| 値入率公式 | `rate = (price - cost) / price` | GP-INV-9 |
| 移動合計 | `transferPrice = sum(4 directions)` | GP-INV-10 |
| 在庫仕入原価 | `inventoryCost = total - delivery` | GP-INV-11 |

### 業務ルール

| 性質 | 説明 | 対応する不変条件 |
|---|---|---|
| 粗利マイナス許容 | grossProfitRate は負値を許容する | GP-BIZ-2 |
| コア売上非負 | coreSales < 0 は 0 にクランプされる | GP-BIZ-3 |
| デフォルト値入率 | コア仕入がゼロのとき defaultMarkupRate を返す | E-28 |

## 7. ガードテスト追加候補

現在のテストにない検証で、WASM 移行前に追加すべきもの:

| テスト | 対象 | 対応する不変条件 | 理由 |
|---|---|---|---|
| 全関数の極値入力で NaN/Infinity 非生成 | 全関数 | GP-INV-12 | Rust f64 と JS number の挙動差を事前検出 |
| costAggregation → markupRate 連携テスト | `calculateTransferTotals` → `calculateMarkupRates` | CV-13 | モジュール間の受け渡し精度を保証 |
| markupRate → estMethod 連携テスト | `calculateMarkupRates` → `calculateEstMethod` | CV-14 | 値入率が推定法に与える影響の一気通貫検証 |
| markupRate → discountImpact 連携テスト | `calculateMarkupRates` → `calculateDiscountImpact` | CV-15 | 値入率が売変影響に与える影響の検証 |
| coreSales → estMethod 連携テスト | `calculateCoreSales` → `calculateEstMethod` | CV-16 | コア売上→推定マージンの一気通貫検証 |
| discountRate → estMethod 連携テスト | `calculateDiscountRate` → `calculateEstMethod` | CV-17 | 売変率→粗売上→推定原価の精度検証 |
| grossSales >= coreSales 不変条件 | `calculateEstMethod` | GP-BIZ-5 | 売変率が非負なら常に成立すべき性質 |
| dual-run-compare 基盤テスト | 全関数 | CV-1〜CV-20 | WASM Bridge 導入後の TS/Rust 出力一致検証基盤 |
