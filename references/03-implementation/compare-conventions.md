# Compare Conventions（dual-run compare 共通規約）

## 目的

grossProfit / budgetAnalysis / forecast の 3 モジュールに共通する
dual-run compare の原則・型・tolerance・分類を一箇所に定義する。
新しい engine を追加する際はこの文書に準拠する。

## Execution Mode の意味

| モード | 動作 | authoritative |
|---|---|---|
| `ts-only` | TS 実装のみ実行 | TS |
| `wasm-only` | WASM 実装のみ実行（未初期化時は TS フォールバック） | WASM（フォールバック時は TS） |
| `dual-run-compare` | 両方実行→結果比較→差分ログ→TS 結果を返却 | TS |

**原則:** authoritative return は常に TS。WASM への authoritative 昇格は
観測フェーズ完了後に行う。

## フォールバック条件

以下のいずれかの場合、WASM 未初期化として TS にフォールバックする:

- `getXxxWasmExports() === null`（モジュール固有の初期化チェック）
- WASM モジュールの `init()` がまだ完了していない

各 bridge は自モジュールの WASM exports getter を使う（共有 `getWasmState()` ではない）。

## Mismatch Kind（分類）

| 分類 | 条件 | 対応 |
|---|---|---|
| `numeric-within-tolerance` | maxAbsDiff ≤ TOLERANCE かつ invariant ok | 正常。浮動小数点精度差 |
| `numeric-over-tolerance` | maxAbsDiff > TOLERANCE かつ invariant ok | 要調査。ロジック差 |
| `invariant-violation` | invariant checker が violated | 即時調査 |
| `null-mismatch` | TS=null / WASM=non-null または逆 | 即時調査 |
| `semantic-mismatch` | 件数差、順序差、discrete value 不一致 | 即時調査 |

## Tolerance 基本方針

| 種類 | 許容差 | 備考 |
|---|---|---|
| 通常数値差 | 1e-10 | 標準 |
| 分析系（R² 等） | 1e-8 まで許容 | 浮動小数点精度の限界考慮 |
| anomaly 件数 | exact match | 意味差として扱う |
| anomaly 順序 | exact match | 意味差として扱う |
| trend direction | exact match | 意味差として扱う |
| boolean | exact match | null-mismatch として扱う |

## Null 比較ルール

- 両方 null → 一致（skip）
- 片方 null → `null-mismatch`（recordNullMismatch）
- null sentinel（Float64Array[0] === 1.0）も null 扱い

## Finite 比較ルール

- 全出力フィールドが `Number.isFinite()` でなければ `invariant-violation`
- NaN, Infinity, -Infinity は即時 violation

## Invariant 比較ルール

モジュール固有の数学的不変条件を invariantChecker で検証する。
bridge ごとに定義し、TS / WASM 両方に適用する。

例:
- factorDecomposition: effects の合計 == delta（売上差）
- grossProfit: COGS = opening + purchases - closing
- forecast: stdDev >= 0, 0 <= R² <= 1

## Mismatch Log 基本骨格

全 bridge の log は以下の共通フィールドを含む:

```typescript
{
  function: string        // 関数名
  inputSummary: Record<string, number | undefined>  // 入力の要約
  tsResult: Record<string, number | string | null>   // TS 結果
  wasmResult: Record<string, number | string | null> // WASM 結果
  diffs: Record<string, number | string>             // フィールドごとの差分
  maxAbsDiff: number      // 数値差の最大値
  wasmState: WasmState    // WASM 状態
  executionMode: ExecutionMode  // 実行モード
}
```

モジュール固有の追加フィールド:
- `invariantTs` / `invariantWasm`: invariant checker の結果
- `sumInvariantTs` / `sumInvariantWasm`: factorDecomposition 固有
- `kind`: semantic-mismatch の種別

## dualRunObserver 運用ルール

### FnName 追加ルール

1. 新しい compare 対象関数を追加するとき、`FnName` union type に追加する
2. `stats` オブジェクトに `makeFnStats()` エントリを追加する
3. dualRunObserver.test.ts の `toHaveLength` を更新する

### recordCall / recordMismatch / recordNullMismatch の使い分け

| API | 使い所 |
|---|---|
| `recordCall(fnName)` | 全モードで呼ぶ（DEV ガード付き） |
| `recordMismatch(fnName, maxAbsDiff, invariantTs, invariantWasm, inputSummary)` | 数値差 > tolerance または invariant violation |
| `recordNullMismatch(fnName)` | null 不一致、boolean 不一致、件数差、順序差 |

### summary の読み方

- `verdict: 'clean'` → 全関数で mismatch ゼロ
- `verdict: 'tolerance-only'` → 浮動小数点精度差のみ。正常
- `verdict: 'needs-investigation'` → invariant violation / null mismatch / 大きな数値差

## Bridge Test 共通パターン

新しい compare bridge を追加するとき、以下のテストを必ず含める:

1. **ts-only**: bridge と直接呼び出しの結果一致
2. **wasm-only + idle**: TS フォールバック
3. **wasm-only + loading/error**: TS フォールバック
4. **dual-run-compare + idle**: compare なし、warn なし
5. **MismatchLog shape**: モック WASM で差分検出（log の shape 検証）
6. **一致時 silent**: warn なし
7. **null mismatch / semantic mismatch**: 該当する場合
8. **invariants via bridge**: 既存 invariant が bridge 経由でも成立

## 新 Engine 追加チェックリスト

1. `forecastWasm.ts` パターンで WASM adapter を作成
2. bridge に 3-mode dispatch を実装
3. `dualRunObserver.ts` の FnName に追加
4. bridge test を共通パターンで作成
5. この文書の engine 一覧を更新
