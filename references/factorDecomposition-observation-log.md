# factorDecomposition dual-run 観測ログ

最終更新: 2026-03-13

---

## 1. 観測基盤の現状

### Bridge の dual-run compare 実装状態

`factorDecompositionBridge.ts` に 4 関数の dual-run compare が完全に実装済み。

| 関数 | dual-run compare | null mismatch 検出 | 不変条件チェック |
|---|---|---|---|
| `decompose2` | 実装済み | N/A（null を返さない） | `custEffect + ticketEffect = delta` |
| `decompose3` | 実装済み | N/A（null を返さない） | `custEffect + qtyEffect + pricePerItemEffect = delta` |
| `decompose5` | 実装済み | 実装済み | `custEffect + qtyEffect + priceEffect + mixEffect = delta` |
| `decomposePriceMix` | 実装済み | 実装済み | `priceEffect + mixEffect = total`（内部合計） |

**差分検出閾値:** `maxAbsDiff > 1e-10` で mismatch としてログ出力。
**不変条件閾値:** `Math.abs(sum - delta) < 1.0` で `ok` / `violated` を判定。

### `__dualRunStats()` の利用可能性

`dualRunObserver.ts` に完全実装済み。`main.tsx` の `import.meta.env.DEV` ガード内で `window.__dualRunStats` として登録される。

| コマンド | 機能 |
|---|---|
| `__dualRunStats()` | 全関数の統計サマリ（totalCalls, totalMismatches, verdict 等） |
| `__dualRunStats('reset')` | 統計リセット（新しい観測セッション開始時） |
| `__dualRunStats('log')` | mismatch ログ一覧（分類済みエントリ、最大 200 件） |

**verdict 判定ロジック:**
- `clean`: mismatch ゼロ
- `tolerance-only`: mismatch あるが全て `1e-10` 以下かつ invariant ok
- `needs-investigation`: invariant violation / null mismatch / 誤差超過あり

### 観測環境の条件

観測には以下の全てが必要:

1. **DEV ビルド** — `npm run dev` で Vite 開発サーバーを起動
2. **ブラウザ** — DevTools Console でコマンド実行
3. **WASM 初期化成功** — コンソールに `[wasmEngine] ready` が表示されること
4. **execution mode = `dual-run-compare`** — DEV デフォルトで有効（localStorage に値がなければ既定）

CLI セッションでは上記環境を満たせないため、観測データの収集は不可能。

---

## 2. 観測計画

### 観測手順

`references/wasm-dual-run-runbook.md` セクション 8.4 に準拠する。

1. `cd app && npm run dev` で DEV サーバー起動
2. ブラウザで開発サーバーにアクセス
3. DevTools Console で `[wasmEngine] ready` を確認
4. `__dualRunStats('reset')` で統計リセット
5. 該当画面を操作（売上分析、要因分解チャート等）
6. `__dualRunStats()` でサマリ確認
7. `__dualRunStats('log')` で mismatch 詳細確認
8. `localStorage.setItem('factorDecomposition.executionMode', 'ts-only')` + リロードで fallback 確認

### 観測対象

主要 call path 10 経路（runbook セクション 8.1）:

| 優先度 | 経路 |
|---|---|
| 高 | useDecompose2, useDecompose3, useDecompose5, useDecomposePriceMix, useShapleyTimeSeries, YoYWaterfallChart.data, categoryFactorUtils |
| 中 | buildClipBundle, DrilldownWaterfall, ForecastPage.helpers |

### 確認項目

- mismatch count（関数別）
- 最大絶対差分（`globalMaxAbsDiff`）
- invariant violation の有無
- null mismatch の有無
- verdict（`clean` / `tolerance-only` / `needs-investigation`）
- ts-only fallback 切替後の UI 一致

### データ条件（4 種）

| 条件 | 内容 |
|---|---|
| 通常ケース | 標準的な売上・客数データ |
| カテゴリ新規/消滅 | 当年のみ / 前年のみのカテゴリ |
| 価格/構成比大変動 | 価格 2 倍以上、構成比大変化 |
| 時系列比較 | 複数月データでの期間比較 |

---

## 3. 観測結果テンプレート

### 3.1 関数別サマリ

| 日付 | 関数 | 呼出回数 | mismatch | 分類 | 備考 |
|---|---|---|---|---|---|
| (記録待ち) | decompose2 | - | - | - | - |
| (記録待ち) | decompose3 | - | - | - | - |
| (記録待ち) | decompose5 | - | - | - | - |
| (記録待ち) | decomposePriceMix | - | - | - | - |

### 3.2 経路別観測記録

| # | 経路 | 実施日 | データ条件 | WASM state | dual-run 実行 | mismatch 有無 | 分類 | fallback 確認 | UI 差異 | メモ |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | useDecompose2 | - | - | - | - | - | - | - | - | - |
| 2 | useDecompose3 | - | - | - | - | - | - | - | - | - |
| 3 | useDecompose5 | - | - | - | - | - | - | - | - | - |
| 4 | useDecomposePriceMix | - | - | - | - | - | - | - | - | - |
| 5 | useShapleyTimeSeries | - | - | - | - | - | - | - | - | - |
| 6 | buildClipBundle | - | - | - | - | - | - | - | - | - |
| 7 | YoYWaterfallChart.data | - | - | - | - | - | - | - | - | - |
| 8 | categoryFactorUtils | - | - | - | - | - | - | - | - | - |
| 9 | DrilldownWaterfall | - | - | - | - | - | - | - | - | - |
| 10 | ForecastPage.helpers | - | - | - | - | - | - | - | - | - |

### 3.3 verdict 履歴

| 日付 | totalCalls | totalMismatches | totalNullMismatches | totalInvariantViolations | globalMaxAbsDiff | verdict |
|---|---|---|---|---|---|---|
| (記録待ち) | - | - | - | - | - | - |

---

## 4. mismatch 分類基準

`dualRunObserver.ts` の自動分類と、runbook セクション 9 の手動分類を併用する。

### 自動分類（dualRunObserver）

| 分類 | 条件 | 深刻度 |
|---|---|---|
| `numeric-within-tolerance` | `maxAbsDiff <= 1e-10` かつ invariant ok | 低（許容） |
| `numeric-over-tolerance` | `maxAbsDiff > 1e-10` かつ invariant ok | 中（要調査） |
| `invariant-violation` | `sumInvariantTs` または `sumInvariantWasm` が `violated` | 高（要修正） |
| `null-mismatch` | TS と WASM で null/non-null が不一致 | 高（要修正） |

### 手動分類（runbook 準拠）

| 大分類 | 小分類 | 判定基準 | アクション |
|---|---|---|---|
| A: 数値差 | A1: 許容誤差内 | `maxAbsDiff <= 1e-10` + invariant ok | 記録のみ |
| A: 数値差 | A2: 許容誤差超過 | `maxAbsDiff > 1e-10` + invariant ok | Rust 浮動小数点演算順序を確認 |
| B: 意味差 | B1: null ズレ | null mismatch ログ | カテゴリ空判定ロジック不一致を調査 |
| B: 意味差 | B2: invariant violation | `sumInvariantWasm: 'violated'` | Rust Shapley 恒等式実装を修正 |
| B: 意味差 | B3: フィールド単位差分 | 特定フィールドのみ差分 | 該当 effect 計算式を比較 |
| C: 経路差 | C1: hook 経由のみ | hook 呼出時のみ mismatch | useMemo 依存配列・キャッシュ影響を確認 |
| C: 経路差 | C2: plain 関数のみ | buildClipBundle 等で発生 | 入力データ marshaling を確認 |
| C: 経路差 | C3: 全経路共通 | どの経路でも同じ | bridge / WASM wrapper レイヤの問題 |

---

## 5. 現時点の判断

### 観測基盤の評価

- **実装完了度: 100%** — bridge の dual-run compare、dualRunObserver、`__dualRunStats` DevTools API、main.tsx への登録が全て完了
- **テスト:** `dualRunObserver.test.ts` および `observationPipeline.test.ts` でユニットテスト済み
- **Runbook:** `references/wasm-dual-run-runbook.md` に運用手順・分類フレームワーク・昇格基準が文書化済み

### 収集済み観測データ

**0 件。** 観測データは未収集。

理由: 観測には DEV サーバー起動 + ブラウザ DevTools が必要であり、CLI セッションでは実行不可能。

### 次のアクション

| 優先度 | アクション | 条件 |
|---|---|---|
| 1 | DEV サーバー + ブラウザ環境で初回観測を実施 | 開発環境にアクセス可能なとき |
| 2 | 高優先度 7 経路の観測結果を本ログに記録 | 初回観測完了後 |
| 3 | 4 種のデータ条件でカバレッジを拡大 | 経路観測完了後 |
| 4 | Phase 5D 昇格判断基準との照合 | 全観測完了後 |

### Phase 5D 昇格チェックリスト状況

| 条件 | 状態 |
|---|---|
| 高優先度 7 経路で dual-run 実行済み | 未実施 |
| invariant violation ゼロ | 未確認 |
| null mismatch ゼロ | 未確認 |
| UI 差異ゼロ | 未確認 |
| fallback 切替正常 | 未確認 |
| mismatch ゼロまたは A1 のみ | 未確認 |

---

## 関連ファイル

| ファイル | 役割 |
|---|---|
| `app/src/application/services/factorDecompositionBridge.ts` | dual-run compare 実装 |
| `app/src/application/services/dualRunObserver.ts` | 観測統計アキュムレータ |
| `app/src/main.tsx` | `__dualRunStats` の window 登録 |
| `references/wasm-dual-run-runbook.md` | 運用手順・分類・昇格基準 |
| `app/src/application/services/__tests__/dualRunObserver.test.ts` | observer ユニットテスト |
| `app/src/application/services/__tests__/observationPipeline.test.ts` | パイプライン統合テスト |
