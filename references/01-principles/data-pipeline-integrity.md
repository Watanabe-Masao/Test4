# データパイプライン整合性（Data Pipeline Integrity）

> 運用仕様書。計算エンジン（心臓）とデータパイプライン（血管）の設計制約を定義する。

## 設計思想

本システムのデータ処理は「心臓」と「血管」の2層で構成される。

| 層 | 役割 | 実装 |
|---|---|---|
| **心臓（計算エンジン）** | 正式な業務値の算出。純粋関数 | `domain/calculations/` + `application/comparison/` |
| **血管（データパイプライン）** | 計算結果の運搬・変換・表示 | hook → store → ViewModel → UI |

**心臓が正確でも、血管が壊れていれば間違った値が表示される。**
逆に、血管が正しくても心臓が壊れていれば全てが狂う。両方の整合性が必須。

## ルール

### R1: 心臓部の純粋性

計算エンジン（`domain/calculations/`、`application/comparison/`）は:

- 副作用を持たない純粋関数のみで構成する
- UI 状態・store 状態に依存しない
- 入力と出力の型で契約を定義する

**検証:** `domain/` 内に React import がないこと（ガードテストで強制）

### R2: 血管の型安全性

データパイプラインの各段階で型が変換される。変換時に意味の異なるデータを混同してはならない。

| 段階 | 型の役割 |
|---|---|
| 計算出力 | `PrevYearMonthlyKpi`（alignment 経由 + monthlyTotal を分離） |
| ViewModel | alignment 値と固定値を別プロパティで保持 |
| UI | ViewModel のみ参照。計算結果を直接参照しない |

**検証:** TypeScript strict mode で型の不整合をコンパイル時に検出

### R3: スコープの分離（temporal-scope-semantics.md と対）

「前年売上」は取得方法（スコープ）によって別の値になる:

| スコープ | 型 | 用途 | 混用時の障害 |
|---|---|---|---|
| alignment 経由 | `PrevYearMonthlyKpiEntry` | 日別比較・YoY | 予算比に使うと取込期間で変動 |
| 月間固定 | `PrevYearMonthlyTotal` | 予算前年比 | alignment 値で代用すると期間依存バグ |
| elapsedDays キャップ | `PrevYearData` | 期中進捗 | 月間固定値として使うと過小評価 |

**型で分離を強制する。変数名にスコープを含める。**

### R4: 3つの Execution Engine との関係

| Engine | 心臓/血管 | パイプライン上の位置 |
|---|---|---|
| Authoritative (JS/WASM) | 心臓 | 正式値の算出。データフロー段階2 |
| Orchestration (TS) | 血管 | 取得・保存・状態管理・ViewModel。段階1,3,4 |
| Exploration (DuckDB) | 血管 | 任意条件の探索。段階1,3 |

Orchestration Engine は心臓部の処理を新規実装してはならない（禁止事項 #9）。

## 危険箇所

### 拡張時に壊れやすいパターン

| パターン | 原因 | 防止策 |
|---|---|---|
| 新しい比較モード追加時に既存の `sameDate.sales` を流用 | スコープの暗黙混同 | 新しい型を定義し、変数名にスコープを含める |
| ViewModel で計算結果を再計算 | 心臓部の責務が血管に流出 | StoreResult の値をそのまま使う。Explanation も再計算禁止 |
| store action 内で業務計算 | store は反映のみ | 計算は domain/ で行い、store は結果を格納するだけ |
| `buildBudgetHeader` 等で alignment 値を月間指標に使用 | 期間スコープの混同 | `monthlyTotal` のみ参照。レビューで検証 |

### 実際に発生したバグ

- **予算ヘッダの前年売上**: `sameDate.sales`（alignment 経由）を月間前年売上として使用。
  取込期間変更で値が変動するバグ。修正: `monthlyTotal.sales` に変更。

## 検証チェックリスト

予算・前年比関連のコード変更時に確認:

- [ ] 予算比較に使う前年値は `monthlyTotal` か？（`sameDate`/`sameDow` ではないか）
- [ ] YoY 比較に使う前年値は alignment 経由か？（`monthlyTotal` ではないか）
- [ ] 新しいスコープを追加する場合、専用の型を定義したか？
- [ ] ViewModel は計算結果を再計算していないか？（StoreResult をそのまま使っているか）
- [ ] domain/ に副作用・UI依存を持ち込んでいないか？

## 関連文書

- `temporal-scope-semantics.md` — 期間スコープの詳細ルール
- `data-flow.md` — 4段階データフローの詳細
- `engine-boundary-policy.md` — 3 Execution Engine の境界ルール
