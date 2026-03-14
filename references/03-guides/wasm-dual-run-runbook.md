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

## 7. 観測サマリヘルパー（DevTools）

Phase 5C-2 で追加された `__dualRunStats` を使い、ブラウザ操作中の統計を即座に確認できる。

```javascript
// DevTools Console で実行

// 統計サマリを表示（呼出回数、mismatch 回数、最大差分、verdict）
__dualRunStats()

// mismatch ログ一覧を表示（分類済み: numeric-within-tolerance / numeric-over-tolerance / invariant-violation / null-mismatch）
__dualRunStats('log')

// 統計をリセット（新しい観測セッション開始時に使用）
__dualRunStats('reset')
```

### verdict の読み方

| verdict | 意味 | 次のアクション |
|---|---|---|
| `clean` | mismatch ゼロ | そのまま次の経路へ |
| `tolerance-only` | 浮動小数点誤差内のみ | 許容。invariant ok を確認 |
| `needs-investigation` | invariant violation / null mismatch / 誤差超過あり | 修正前に分類→保存 |

---

## 8. 主要 call path 観測チェックリスト

以下の経路が dual-run compare で実際に観測されたかを記録する。
Phase 5D の昇格判断材料として使用する。

### 8.1 経路一覧

| # | 経路 | コンポーネント | import 元 | 優先度 |
|---|---|---|---|---|
| 1 | useDecompose2 | useFactorDecomposition | bridge 直接 | 高 |
| 2 | useDecompose3 | useFactorDecomposition | bridge 直接 | 高 |
| 3 | useDecompose5 | useFactorDecomposition | bridge 直接 | 高 |
| 4 | useDecomposePriceMix | useFactorDecomposition | bridge 直接 | 高 |
| 5 | useShapleyTimeSeries | decompose2 | bridge 直接 | 高 |
| 6 | buildClipBundle | decompose2/3/5 | bridge 直接 | 中 |
| 7 | YoYWaterfallChart.data | decompose2/3/5 | calculation.ts 経由 | 高 |
| 8 | categoryFactorUtils | decomposePriceMix | calculation.ts 経由 | 高 |
| 9 | DrilldownWaterfall | decompose2/3/5 | calculation.ts 経由 | 中 |
| 10 | ForecastPage.helpers | decompose2 | calculation.ts 経由 | 中 |

### 8.2 観測記録テンプレート

各経路の観測結果を以下の形式で記録する。

| # | 実施日 | データ条件 | WASM state | dual-run 実行 | mismatch 有無 | 分類 | fallback 確認 | UI 差異 | メモ |
|---|---|---|---|---|---|---|---|---|---|
| 1 | - | - | - | - | - | - | - | - | - |
| 2 | - | - | - | - | - | - | - | - | - |
| 3 | - | - | - | - | - | - | - | - | - |
| 4 | - | - | - | - | - | - | - | - | - |
| 5 | - | - | - | - | - | - | - | - | - |
| 6 | - | - | - | - | - | - | - | - | - |
| 7 | - | - | - | - | - | - | - | - | - |
| 8 | - | - | - | - | - | - | - | - | - |
| 9 | - | - | - | - | - | - | - | - | - |
| 10 | - | - | - | - | - | - | - | - | - |

### 8.3 データ条件の種類

観測は以下の4種類のデータ条件で行う。少なくとも3種以上をカバーすること。

| 条件 | 内容 | 対象関数への影響 |
|---|---|---|
| **通常ケース** | 標準的な売上・客数データ | decompose2/3 の基本パス |
| **カテゴリ新規/消滅** | 当年にしかないカテゴリ、前年にしかないカテゴリ | decompose5, decomposePriceMix の null 判定 |
| **価格/構成比大変動** | 価格が2倍以上、または構成比が大きく変化 | decomposePriceMix の数値安定性 |
| **時系列比較** | 複数月のデータで期間比較 | useShapleyTimeSeries のループ内蓄積 |

### 8.4 観測手順

1. DEV サーバー起動（`npm run dev`）
2. コンソールで `[wasmEngine] ready` を確認
3. `__dualRunStats('reset')` で統計リセット
4. 該当画面を操作（データ条件ごとに）
5. `__dualRunStats()` でサマリ確認
6. `__dualRunStats('log')` で mismatch 詳細確認
7. 結果を 8.2 のテーブルに記録
8. ts-only に切り替えて fallback 確認（UI が同一であること）

---

## 9. Mismatch 分類フレームワーク

mismatch が出た場合、修正に飛ぶ前にまず分類する。

### 分類 A: 数値差

| 分類 | 判定基準 | アクション |
|---|---|---|
| A1: 許容誤差内 | `maxAbsDiff ≤ 1e-10` かつ invariant ok | 記録のみ。昇格判断に影響しない |
| A2: 許容誤差超過 | `maxAbsDiff > 1e-10` かつ invariant ok | Rust 実装の浮動小数点演算順序を確認 |

### 分類 B: 意味差

| 分類 | 判定基準 | アクション |
|---|---|---|
| B1: null / not-null ズレ | null mismatch ログ | カテゴリ空判定ロジックの不一致を調査 |
| B2: invariant violation | `sumInvariantWasm: 'violated'` | Rust 側の Shapley 恒等式実装を修正 |
| B3: フィールド単位の差分 | 特定フィールドのみ差分 | 該当 effect の計算式を比較 |

### 分類 C: 経路差

| 分類 | 判定基準 | アクション |
|---|---|---|
| C1: hook 経由のみ | hook で呼ばれた時だけ mismatch | useMemo 依存配列・キャッシュの影響を確認 |
| C2: plain 関数のみ | buildClipBundle 等で発生 | 入力データの marshaling を確認 |
| C3: 全経路共通 | どの経路でも同じ mismatch | bridge / WASM wrapper レイヤの問題 |

---

## 10. Phase 5D 昇格判断基準

Phase 5C-2 の観測が以下を全て満たしたとき、Phase 5D（限定環境での wasm-only 試行）に進む。

### 必須条件

- [ ] 高優先度の 7 経路（#1-5, #7-8）で dual-run 実行済み
- [ ] invariant violation がゼロ
- [ ] null mismatch がゼロ
- [ ] UI 差異がゼロ
- [ ] fallback 切替が全経路で正常動作
- [ ] mismatch がゼロ、または分類 A1（許容誤差内）のみ

### 望ましい条件

- [ ] 4種のデータ条件のうち 3種以上でカバー
- [ ] 中優先度の 3 経路（#6, #9-10）も観測済み
- [ ] `__dualRunStats()` の verdict が `clean` または `tolerance-only`
- [ ] ロールバック手順を実行して問題なく復帰できた
- [ ] 開発者がログを読んで一次切り分けできた

### 記録方法

- `dual-run 実行`: DEV で該当画面を開き、`__dualRunStats()` で calls > 0 を確認
- `mismatch 有無`: `__dualRunStats()` の mismatches を確認、または `__dualRunStats('log')` で詳細確認
- `分類`: セクション 9 の分類フレームワークに基づき A1/A2/B1/B2/B3/C1/C2/C3 を記載
- `fallback 確認`: ts-only に切り替えた後、compare ログが消えることを確認
- `UI 差異`: 同じデータで ts-only と dual-run-compare の表示が同一であることを目視確認
