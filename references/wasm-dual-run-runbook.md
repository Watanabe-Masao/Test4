# WASM dual-run compare 運用 Runbook

## 1. ロールバック手順（最優先）

WASM compare で問題が発生した場合、即座に TS-only に戻せる。

```javascript
// ブラウザの DevTools Console で実行
localStorage.setItem('factorDecomposition.executionMode', 'ts-only')
location.reload()
```

これで全 decompose 呼び出しが TS 実装のみに戻る。WASM は呼ばれない。

---

## 2. DEV デフォルト挙動

### DEV ビルド (`npm run dev`)

- WASM 初期化: **自動**（`main.tsx` から fire-and-forget で呼び出し）
- 実行モード: **dual-run-compare**（localStorage に値がなければ既定）
- 動作: TS と WASM の両方を実行し、結果を比較。差分があれば `console.warn` に出力。**TS の結果を返す**（WASM は authoritative ではない）

### 本番ビルド (`npm run build` / `npm run preview`)

- WASM 初期化: **呼ばれない**（`import.meta.env.DEV` ガード）
- 実行モード: **ts-only**（`getExecutionMode()` が dual-run-compare を ts-only にフォールバック）
- 動作: TS 実装のみ。WASM は一切関与しない

---

## 3. 実行モード切替

### 利用可能なモード

| モード | 動作 | 用途 |
|---|---|---|
| `ts-only` | TS 実装のみ | 安定運用、問題発生時のロールバック |
| `wasm-only` | WASM のみ（未初期化時は TS フォールバック） | WASM 単体のパフォーマンス観測 |
| `dual-run-compare` | 両方実行→比較→TS 結果を返却 | 正しさの観測（Phase 5C の主目的） |

### 切替方法

```javascript
// DevTools Console で実行
localStorage.setItem('factorDecomposition.executionMode', 'dual-run-compare')
location.reload()

// または ts-only に戻す
localStorage.setItem('factorDecomposition.executionMode', 'ts-only')
location.reload()

// localStorage をクリアすると DEV 既定（dual-run-compare）に戻る
localStorage.removeItem('factorDecomposition.executionMode')
location.reload()
```

---

## 4. WASM 状態 (`WasmState`)

| 状態 | 意味 | bridge の挙動 |
|---|---|---|
| `idle` | 初期化未開始 | TS のみ実行（compare なし） |
| `loading` | 初期化中 | TS のみ実行（compare なし） |
| `ready` | 初期化成功 | モードに応じて TS/WASM/compare |
| `error` | 初期化失敗 | TS のみ実行（永続） |

状態確認:
```javascript
// wasmEngine の状態を確認（DEV のみ）
// コンソールログで確認:
// [wasmEngine] ready — dual-run compare available  → 初期化成功
// [wasmEngine] WASM initialization failed...        → 初期化失敗（TS フォールバック）
```

---

## 5. Mismatch ログの読み方

差分が検出されると `console.warn` に以下の形式で出力される:

```
[factorDecomposition dual-run mismatch] {
  function: 'decompose2',
  inputSummary: { prevSales: 100000, curSales: 132000 },
  tsResult: { custEffect: 11000, ticketEffect: 21000 },
  wasmResult: { custEffect: 11000.000000001, ticketEffect: 20999.999999999 },
  diffs: { custEffect: 0.000000001, ticketEffect: -0.000000001 },
  maxAbsDiff: 0.000000001,
  sumInvariantTs: 'ok',
  sumInvariantWasm: 'ok',
  wasmState: 'ready',
  executionMode: 'dual-run-compare'
}
```

### フィールド説明

| フィールド | 意味 |
|---|---|
| `function` | どの関数で差分が出たか |
| `inputSummary` | 入力の概要（追跡用） |
| `tsResult` | TS 実装の結果 |
| `wasmResult` | WASM 実装の結果 |
| `diffs` | 各フィールドの差分（WASM - TS） |
| `maxAbsDiff` | 最大絶対差分 |
| `sumInvariantTs` | TS 結果の Shapley 恒等式: `ok` or `violated` |
| `sumInvariantWasm` | WASM 結果の Shapley 恒等式: `ok` or `violated` |
| `wasmState` | 検出時の WASM 状態 |
| `executionMode` | 検出時の実行モード |

### null mismatch ログ

decompose5 / decomposePriceMix で一方が null、他方が non-null の場合:

```
[factorDecomposition dual-run null mismatch] decompose5: {
  tsNull: true,
  wasmNull: false
}
```

### 一致時

一致時は **ログが出ない**（静か）。ログが出ないことが正常。

---

## 6. 一次切り分け

### ログが出ない場合

- **正常:** TS と WASM が一致している
- **確認:** WASM が `ready` になっているか（コンソールに `[wasmEngine] ready` があるか）
- **確認:** モードが `dual-run-compare` か（localStorage を確認）

### `maxAbsDiff` が非常に小さい場合（< 1e-10）

- **正常:** 浮動小数点誤差の範囲内。ログには出るが問題なし
- ただし `sumInvariantTs` / `sumInvariantWasm` が `ok` であることを確認

### `sumInvariantWasm: 'violated'` の場合

- **要調査:** WASM 側の Shapley 恒等式が崩れている
- Rust 側の計算ロジックにバグがある可能性
- `sumInvariantTs` が `ok` なら TS 側は正常

### null mismatch の場合

- **要調査:** TS と WASM で null 判定が異なる
- 空カテゴリ、ゼロ分母、NaN 入力などエッジケースの可能性

---

## 7. 主要 call path 観測チェックリスト

以下の経路が dual-run compare で実際に観測されたかを記録する。
Phase 5C の昇格判断材料として使用する。

| # | 経路 | コンポーネント | import 元 | dual-run 実行 | mismatch 有無 | fallback 確認 | UI 差異 |
|---|---|---|---|---|---|---|---|
| 1 | useDecompose2 | useFactorDecomposition | bridge 直接 | - | - | - | - |
| 2 | useDecompose3 | useFactorDecomposition | bridge 直接 | - | - | - | - |
| 3 | useDecompose5 | useFactorDecomposition | bridge 直接 | - | - | - | - |
| 4 | useDecomposePriceMix | useFactorDecomposition | bridge 直接 | - | - | - | - |
| 5 | useShapleyTimeSeries | decompose2 | bridge 直接 | - | - | - | - |
| 6 | buildClipBundle | decompose2/3/5 | bridge 直接 | - | - | - | - |
| 7 | YoYWaterfallChart.data | decompose2/3/5 | calculation.ts 経由 | - | - | - | - |
| 8 | categoryFactorUtils | decomposePriceMix | calculation.ts 経由 | - | - | - | - |
| 9 | DrilldownWaterfall | decompose2/3/5 | calculation.ts 経由 | - | - | - | - |
| 10 | ForecastPage.helpers | decompose2 | calculation.ts 経由 | - | - | - | - |

### 記録方法

- `dual-run 実行`: DEV で該当画面を開き、コンソールにログが出るか確認
- `mismatch 有無`: `[factorDecomposition dual-run mismatch]` ログの有無
- `fallback 確認`: ts-only に切り替えた後、compare ログが消えることを確認
- `UI 差異`: 同じデータで ts-only と dual-run-compare の表示が同一であることを目視確認
