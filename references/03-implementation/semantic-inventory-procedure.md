# 意味分類 Inventory 手順書

## 1. 目的

`domain/calculations/` 配下の全 pure 計算を意味責任で分類し、
`calculationCanonRegistry` の拡張（Phase 2）に必要な入力データを作成する。

## 2. 判定質問セット

### Q1: この関数は正式な業務確定値を決定するか？

Yes → business 候補。Q2 へ。
No → Q5 へ。

### Q2: 出力は StoreResult / PeriodMetrics のフィールド値を決定するか？

Yes → `semanticClass = business`。Q3 へ。
No → Q5 へ（analytic 候補の可能性）。

### Q3: WASM bridge が存在するか？

Yes → `runtimeStatus = current`, `ownerKind = maintenance`。
No → `runtimeStatus = current` (TS-only), `migrationTier = tier1` 候補。

### Q4: businessMeaning を1文で書けるか？

Yes → business 確定。
No → `review-needed` にして理由を記載。

### Q5: 分析基盤として独立しているか？（系列処理・統計処理・集約処理）

Yes → analytic 候補。Q6 へ。
No → Q8 へ。

### Q6: methodFamily を書けるか？（forecasting, time_series, statistical 等）

Yes → `semanticClass = analytic`。Q7 へ。
No → `review-needed` にして理由を記載。

### Q7: 数学的不変条件を持つか？

Yes → `invariantSet` を記載。
No → analytic だが invariant なし（許容）。

### Q8: ユーティリティ / バレル / 型定義のみか？

Yes → `semanticClass = utility`, `runtimeStatus = non-target`。
No → `review-needed` にして理由を記載。

## 3. 重要ルール

### ルール 1: factorDecomposition は Business Semantic Core

技法は Shapley 値分解（`methodFamily = analytic_decomposition`）だが、
出力が業務 KPI として UI に直接表示されるため `semanticClass = business`。

### ルール 2: pure であることは棚の決定基準にならない

pure + deterministic は前提条件であり、business/analytic の分岐基準は
「正式な業務確定値を決定するか」。

### ルール 3: Rust にあることは意味分類の根拠にならない

WASM で実装されているかどうかと semanticClass は独立した軸。

### ルール 4: 迷ったら review-needed

正確に分類できないものは `review-needed` に。嘘の分類より正直な未分類を優先する（C9 原則）。

## 4. methodFamily カタログ

| methodFamily | 例 |
|-------------|-----|
| `accounting` | 在庫法粗利、推定法マージン、仕入原価集約 |
| `budget` | 予算分析、残予算必要達成率 |
| `pricing` | 値入率 |
| `analytic_decomposition` | Shapley 値分解（技法は analytic、意味責任は business） |
| `retail_kpi` | PI値 |
| `behavioral` | 客数GAP |
| `data_quality` | 観測期間ステータス |
| `forecasting` | WMA、回帰、天気調整予測 |
| `time_pattern` | コアタイム、ターンアラウンドタイム |
| `time_series` | 移動平均 |
| `statistical` | 相関、標準偏差、z-score |
| `what_if` | 感度分析 |
| `temporal_pattern` | トレンド分析 |
| `anomaly_detection` | 異常値検出 |
| `calendar_effect` | 曜日ギャップ |

## 5. 出力フォーマット

inventory は `references/04-tracking/semantic-inventory.yaml` に YAML 形式で記録する。

```yaml
entries:
  - file: invMethod.ts
    functions: [calculateInvMethod]
    semanticClass: business
    authorityKind: business-authoritative
    methodFamily: accounting
    runtimeStatus: current
    ownerKind: maintenance
    migrationTier: null
    wasmBridge: true
    reviewNeeded: false
    reviewReason: null
```

## 6. 参照

- `references/01-foundation/semantic-classification-policy.md` — 意味分類ポリシー
- `references/01-foundation/engine-boundary-policy.md` — Engine 境界定義
- `app/src/test/calculationCanonRegistry.ts` — Master registry（Phase 2 で拡張予定）
