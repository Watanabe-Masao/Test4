# 意味分類ポリシー（Semantic Classification Policy）

## 1. 目的

`domain/calculations/` に存在する pure 計算群を**意味責任**で分類し、
AI が「pure だから同じ棚」「Rust にあるから同じ棚」と誤解できない構造を作る。

## 2. 用語定義

| 用語 | 定義 | 例 |
|------|------|-----|
| **Business Semantic Core** | 正式な業務確定値を決定する pure 計算。出力が業務 KPI として UI に直接表示される | 粗利計算、予算差異、要因分解 |
| **Analytic Kernel** | 分析基盤としての pure 計算。業務値の核を決めるのではなく、分析 substrate として成立する | 移動平均、z-score、相関、トレンド |
| **business-authoritative** | Business Semantic Core に属する計算の権限種別。`authoritative` 単独では使用禁止 | `authorityKind: 'business-authoritative'` |
| **analytic-authoritative** | Analytic Kernel に属する計算の権限種別 | `authorityKind: 'analytic-authoritative'` |
| **candidate-authoritative** | current ではなく移行候補としての権限種別 | `authorityKind: 'candidate-authoritative'` |
| **current** | 既に正式運用されている実装。保守対象 | 5 WASM engines |
| **candidate** | 移行途中の実装。実験資産。current と混ぜない | 未来の Tier 1 移行候補 |
| **non-target** | 本計画の対象外 | hook, store, QueryHandler, ViewModel |

## 3. 5原則

### 原則 1: 意味責任で棚を分ける

pure であることは前提であり、棚の決定基準ではない。
棚は「何を決めるか」で分ける。

### 原則 2: `authoritative` を単独語で使用しない

`authoritative` は常に `business-authoritative` / `analytic-authoritative` /
`candidate-authoritative` / `non-authoritative` のいずれかとして修飾付きで使う。
単独の `authoritative` は AI が business と analytic を混同する原因になる。

### 原則 3: 技法と意味責任を分離する

Shapley 値分解は技法（analytic_decomposition）だが、意味責任は business である。
`methodFamily` で技法を表現し、`semanticClass` で意味責任を表現する。
両者は独立した軸。

### 原則 4: current と candidate を絶対に混ぜない

同じ registry view に載せない。同じ KPI で評価しない。同じ review 導線を使わない。
current は保守対象、candidate は移行対象。

### 原則 5: 正本は1つ

`calculationCanonRegistry` が唯一の master registry。
business / analytic / candidate の view は全て derived（master から自動導出）。
derived view の手編集は禁止。

## 4. 分類軸

### 4.1 semanticClass

| 値 | 定義 | 配置先 |
|----|------|-------|
| `business` | 業務確定値を決定する | Business Semantic Core |
| `analytic` | 分析基盤として成立する | Analytic Kernel |
| `presentation` | 描画・表示整形のみ | 非対象 |
| `utility` | プリミティブ・ヘルパー | 非対象 |

### 4.2 authorityKind

| 値 | 使用条件 |
|----|---------|
| `business-authoritative` | `semanticClass = business` かつ `runtimeStatus = current` |
| `analytic-authoritative` | `semanticClass = analytic` かつ `runtimeStatus = current` |
| `candidate-authoritative` | `runtimeStatus = candidate`（business/analytic 問わず） |
| `non-authoritative` | utility / presentation / non-target |

### 4.3 runtimeStatus

| 値 | 意味 |
|----|------|
| `current` | 正式運用中。保守対象 |
| `candidate` | 移行途中。実験資産 |
| `non-target` | 本計画の対象外 |

## 5. Business Semantic Core の判定条件

以下を**すべて**満たす:

1. 正式な業務確定値に関わる（KPI、粗利、予算達成率、要因分解等）
2. 同じ入力なら同じ出力（deterministic）
3. UI がなくても成立する
4. StoreResult / PeriodMetrics のフィールド値を決定する
5. 出力の業務意味を説明できる（`businessMeaning` を書ける）

### 5.1 Business Semantic Core の例

粗利計算、予算差異計算、値入率計算、仕入原価集約、要因分解（Shapley）

### 5.2 Business Semantic Core に属するが技法が analytic な例

`factorDecomposition`: Shapley 値分解は analytic な技法だが、出力は業務 KPI。
`semanticClass = business`, `methodFamily = analytic_decomposition`。

## 6. Analytic Kernel の判定条件

以下を**すべて**満たす:

1. pure かつ deterministic
2. 業務値の核を直接決めない
3. 系列処理・集約処理・統計処理として独立
4. `methodFamily` を書ける
5. 数学的不変条件を持つ

### 6.1 Analytic Kernel の例

移動平均、z-score、相関分析、トレンド分析、感度分析、曜日ギャップ分析

## 7. 禁止事項

1. `authoritative` を単独語で新規追加してはならない
2. pure であることだけを根拠に business / analytic を決めてはならない
3. Rust にあることを意味分類の根拠にしてはならない
4. current と candidate を同じ view / KPI / review 導線で扱ってはならない
5. derived view を手編集してはならない
6. presentation helper を candidate/business や candidate/analytics に昇格させてはならない

## 8. 分離対象と非対象

### 8.1 分離対象

- `domain/calculations/` 配下の pure 計算
- deterministic
- UI / store / QueryHandler / DuckDB call 非依存

### 8.2 非対象（non-target）

- hook / store / QueryHandler / ViewModel
- Screen Plan / useQueryWithHandler
- stale discard / retry / debounce / profiling
- DuckDB query 実行
- presentation component

## 9. 参照

- `references/01-principles/engine-boundary-policy.md` — 三層 Engine 定義
- `references/01-principles/engine-responsibility.md` — Engine 責務割当
- `app/src/test/calculationCanonRegistry.ts` — Master registry
