# Observation Evaluation Guide — 観測評価ガイド

## 目的

dual-run compare の観測結果をどう読み、どう評価するかを統一する。
観測者が異なっても同じ基準で判断できるようにする。

---

## 1. Mismatch Taxonomy 評価基準

`compare-conventions.md` で定義された 5 分類を昇格判断に結びつける。

### numeric-within-tolerance

| 項目 | 内容 |
|---|---|
| 条件 | maxAbsDiff ≤ 1e-10 かつ invariant ok |
| 昇格判断 | **原則許容。** 浮動小数点精度差であり、業務影響なし |
| 注意点 | 分布を確認する。特定 engine / 特定関数 / 特定入力パターンに偏る場合は要調査 |
| 対応 | 偏りがなければ記録のみ。偏りがあれば原因を特定し、Rust 実装の演算順序を確認 |

### numeric-over-tolerance

| 項目 | 内容 |
|---|---|
| 条件 | maxAbsDiff > 1e-10 かつ invariant ok |
| 昇格判断 | **promotion-candidate 判定では原則 NG** |
| 例外 | 再現性と原因が明確で、非業務影響であることが説明可能な場合は保留可 |
| 対応 | 原因を特定する。TS と Rust の演算順序差、safeDivide の挙動差、型変換の精度ロスを確認 |

### null-mismatch

| 項目 | 内容 |
|---|---|
| 条件 | TS=null / WASM=non-null、またはその逆 |
| 昇格判断 | **原則 NG。** null は意味差であり、浮動小数点精度では説明できない |
| 対応 | WASM adapter の null sentinel 処理（NaN ↔ null 変換）を確認。bridge の null 比較ロジックを確認 |

### invariant-violation

| 項目 | 内容 |
|---|---|
| 条件 | invariant checker が TS 側または WASM 側で violated を返す |
| 昇格判断 | **即 NG。** 数学的不変条件の破壊は最重大 |
| 対応 | 試験停止。原因を特定し、修正後に観測を最初からやり直す |

### semantic-mismatch

| 項目 | 内容 |
|---|---|
| 条件 | 件数差、順序差、discrete value の不一致（forecast の anomaly 件数・trend direction 等） |
| 昇格判断 | **原則 NG。** 業務的意味が異なる |
| 対応 | exact match が必要な項目で不一致が出た場合は、Rust ロジックの再検証 |

---

## 2. 観測ログの最低必要量

「何件見れば十分か」を engine ごとに定義する。

### 共通最低ライン

全 engine に共通して以下を満たすこと:

- 主要 runtime path をすべて 1 回以上通過
- 主要データ条件を複数パターンで検証
- observer summary を複数回保存（異なるセッションで）
- mismatch が発生した場合は必ず記録・分類
- verdict が `clean` または `tolerance-only` であることを複数回確認

### engine 別の目安

#### factorDecomposition（4 関数）

| 経路 | 必要な観測 |
|---|---|
| decompose2 | 2 要因分解の主要パターン（prevSales > 0, prevSales = 0） |
| decompose3 | 3 要因分解の主要パターン |
| decompose5 | 5 要因分解の主要パターン |
| decomposePriceMix | price/mix 分解のパターン |
| 時系列 | 複数月のデータでの連続実行 |

#### grossProfit（8 関数）

| 経路 | 必要な観測 |
|---|---|
| calculateInvMethod | 在庫法: 通常 / null 在庫 / ゼロ売上 |
| calculateEstMethod | 推定法: 通常 / null 在庫 / ゼロ割引率 |
| calculateCoreSales | 通常 / over-delivery |
| calculateDiscountRate | 通常 / ゼロ売上 |
| calculateDiscountImpact | 通常 / ゼロ割引率 |
| calculateMarkupRates | 通常 / fallback 発動 |
| calculateTransferTotals | 4 方向合計パターン |
| calculateInventoryCost | 単純減算パターン |

#### budgetAnalysis（2 関数）

| 経路 | 必要な観測 |
|---|---|
| calculateBudgetAnalysis | 通常 / ゼロ予算 / 月途中 / 月末 |
| calculateGrossProfitBudget | 通常 / ゼロ売上 |

#### forecast（5 pure 関数）

| 経路 | 必要な観測 |
|---|---|
| calculateStdDev | 通常配列 / 空配列 / 1 要素 |
| detectAnomalies | 異常あり / 異常なし / 閾値境界 |
| calculateWMA | 通常 / 短配列 |
| linearRegression | 通常 / 2 点 / 全同値 |
| analyzeTrend | 上昇 / 下降 / 横ばい |

**注:** forecast は Rust 未実装のため、compare は TS stub 同士で動作する。
Rust 実装後に実質的な観測が必要。

---

## 3. 観測結果テンプレート

各 engine の観測結果を統一フォーマットで記録する。
評価会に持ち込める形式とする。

### 記録欄

```markdown
## 観測記録

| 項目 | 内容 |
|---|---|
| 実施日 | YYYY-MM-DD |
| 実施者 | （名前またはセッション ID） |
| Engine | factorDecomposition / grossProfit / budgetAnalysis / forecast |
| 対象関数 | （FnName） |
| 対象経路 | （UI 操作の概要） |
| データ条件 | （入力データの特徴: 月次 / 複数店舗 / 特殊値 等） |
| Execution Mode | ts-only / wasm-only / dual-run-compare |
| WASM State | idle / loading / ready / error |
| Observer Summary | （__dualRunStats() の出力要約） |
| Total Calls | （totalCalls） |
| Total Mismatches | （totalMismatches） |
| Mismatch Kind | numeric-within-tolerance / numeric-over-tolerance / null-mismatch / invariant-violation / なし |
| maxAbsDiff | （数値） |
| Invariant Violation | あり / なし |
| Null Mismatch | あり / なし |
| UI 差異 | あり / なし |
| Verdict | clean / tolerance-only / needs-investigation |
| 判定 | OK / NG / 要継続観測 |
| 備考 | （特記事項） |
```

### 記録のタイミング

- **dual-run-compare モードでの開発利用後** — セッション終了時に `__dualRunStats()` を確認
- **特定の UI 操作を意図的にテストした後** — 経路カバレッジを埋める目的
- **mismatch 発生時** — `__dualRunStats('log')` で詳細を記録

### 記録の保存先

観測記録は以下のいずれかに保存する:

- GitHub Issue のコメント（engine ごとの tracking issue）
- `references/observation-logs/` ディレクトリ（ファイル名: `YYYY-MM-DD-{engine}.md`）

---

## 4. 判定フロー

```
観測実施
  │
  ├→ verdict: clean → 記録して継続
  │
  ├→ verdict: tolerance-only → 分布確認
  │     ├→ 偏りなし → 記録して継続
  │     └→ 偏りあり → 原因調査 → 修正 or 説明文書化
  │
  └→ verdict: needs-investigation → 即対応
        ├→ invariant-violation → 試験停止、原因修正
        ├→ null-mismatch → adapter 再検証
        └→ numeric-over-tolerance → 演算順序・型変換確認
```

### 充足判断

以下を全て満たしたとき、観測量が十分と判断する:

1. engine 別の目安（上記）の全経路を少なくとも 1 回カバー
2. 複数セッション（異なるタイミング）で観測
3. verdict が一貫して `clean` または `tolerance-only`
4. needs-investigation が出た場合は原因が特定・解決済み
