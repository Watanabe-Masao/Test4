# PR Breakdown — unify-period-analysis

> 役割: `plan.md` の Phase 構造を実務着手しやすい PR 単位に落とした作業単位書。
> 前提: 固定期間は自由期間の preset として統合し、内部は free-period 系の
> 契約に寄せる。自由期間分析の正本は `readFreePeriodFact()` と
> `computeFreePeriodSummary()` を中心にした別系統であり、入口は
> `FreePeriodAnalysisFrame` と `ComparisonScope`。
>
> 参照: `references/01-principles/free-period-analysis-definition.md`

## PR 1: 固定期間ヘッダを free-period preset に変換する入口を作る

### 目的

UI の固定期間選択を残したまま、内部契約を `FreePeriodAnalysisFrame` に
寄せる。今後の自由期間追加で既存比較系を壊さないため、まず Header state を
内部から切り離すのが最優先。自由期間系の正式な入口は `anchorRange` +
`storeIds` + `comparison` を持つ `FreePeriodAnalysisFrame`。

### やること

- `HeaderFilterState -> FreePeriodAnalysisFrame` の adapter を新設
- 固定期間の「今月」「先月」「前年同月」などを `anchorRange` 生成関数として定義
- 現在ヘッダ状態を直接読んでいる comparison / summary 系 hook の入口を
  frame 受け取りに変更
- component から query 入力を直に組み立てる経路を廃止

### 変更範囲

- header 周辺 state
- comparison 系 hook の入口
- free-period frame builder の新設または整理

### 完了条件

- 画面内部でヘッダ状態を直接 query に流していない
- 比較系 hook が `FreePeriodAnalysisFrame` を受け取る
- 固定期間 UI は現状維持だが、内部は preset 経由で frame 化される

### レビュー観点

- ヘッダ state が内部 query 契約に漏れていないか
- preset が `anchorRange` を返しているか
- frame 化が 1 か所に閉じているか

### この PR の価値

これで以後の PR は、固定期間専用の比較ロジックを増やさずに進められる。

---

## PR 2: 比較先解決を ComparisonScope に一本化する

### 目的

比較系の不安定さの中心である「比較先日付の解釈のばらつき」を止める。
自由期間分析の定義でも、比較条件は `ComparisonScope` が唯一入口。

### やること

- 比較先の解決を resolver に集約
- `sameDate` / `sameDow` / `previousPeriod` / `sameRangeLastYear` などを
  resolver から返す
- comparison 出力に provenance を追加
- presentation / chart / VM 側の独自比較日付計算を削除

### 最低限返すべき情報

- `comparisonRange`
- `mappingKind`
- `fallbackApplied`
- `sourceDate`
- `confidence`

### 変更範囲

- comparison resolver
- comparison hook 群
- 予算ヘッダや日別比較など、比較値を読む VM 群

### 完了条件

- 比較先解決が `ComparisonScope` 経由のみ
- 比較出力に provenance が載る
- presentation 層に比較日付ロジックが残っていない

### レビュー観点

- 比較先解決が resolver に閉じているか
- UI 側独自解決が残っていないか
- provenance を返しているか

### この PR の価値

将来自由期間比較が増えても、比較意味論が画面ごとに分裂しない。

---

## PR 3: free-period の取得・集計レーンを完成させる

### 目的

UI を広げる前に、自由期間分析の正本レーンを先に完成させる。
定義書上、自由期間分析は `readFreePeriodFact()` で取得し、
`computeFreePeriodSummary()` で期間サマリーを計算する構造。

### やること

- `freePeriodHandler` を正式な取得入口にする
- `readFreePeriodFact()` を唯一の取得経路に固定
- `computeFreePeriodSummary()` を唯一のサマリー計算経路に固定
- `FreePeriodReadModel` を確定し、current / comparison rows と summary を
  返す形を揃える

### 変更範囲

- handler
- DuckDB query 呼び出し周辺
- summary 計算
- read model 定義

### 完了条件

- 自由期間データ取得は `readFreePeriodFact()` のみ
- 集計は `computeFreePeriodSummary()` のみ
- raw rows を直接 chart に渡していない
- `FreePeriodReadModel` が UI の単一入力になる

### レビュー観点

- 取得経路が `readFreePeriodFact()` に一本化されているか
- summary が `computeFreePeriodSummary()` に閉じているか
- `FreePeriodReadModel` の責務が明確か

### この PR の価値

ここが完成すると、固定期間 preset も自由期間本体も同じ取得レーンに載せられる。

---

## PR 4: SQL / JS / VM の責務を整理し、率計算を押し戻す

### 目的

自由期間導入時の「静かなズレ」を防ぐため、額と率の責務を整理する。
このプロジェクトの原則では、額で持ち回し、率は `domain/calculations` で
算出する。SQL や VM で率を計算してはいけない。

### やること

- free-period 系 SQL が返す値を amount only に寄せる
- `discountRate` / `gpRate` / `markupRate` の計算が SQL や VM に残って
  いれば削除
- 二重集約を解消する
- 必要な rate は domain の関数経由で算出

### 変更範囲

- free-period 取得 SQL
- summary / VM
- chart 用 builder

### 完了条件

- SQL に rate 計算式がない
- VM / chart 側で rate を直計算していない
- 同一集約が SQL と JS に二重定義されていない

### レビュー観点

- SQL / VM / Presentation に rate 計算が残っていないか
- amount only transport が守られているか
- 二重集約がないか

### この PR の価値

後から比較軸や期間粒度を増やしても、計算定義がぶれにくくなる。

---

## PR 5: chart 直前を薄くし、free-period を既存画面に載せ替える

### 目的

最後に UI 側へ反映する。ただし chart 自体にロジックを持たせず、
`FreePeriodReadModel -> ViewModel -> Chart` の形で載せる。実行時データ
経路でも、component に acquisition logic を書かず、plan / handler / view を
分けるのが原則。

### やること

- 既存固定期間比較画面を free-period preset で動かす
- chart に渡す前に ViewModel builder を作る
- chart component から比較分岐・集約分岐を追い出す
- 必要なら fallback / provenance を UI に出す

### 変更範囲

- summary 画面
- 比較 chart
- 時間帯系または優先度の高い 1 画面
- ViewModel builder / option builder

### 完了条件

- 固定期間画面が free-period preset で動く
- chart が raw rows や raw query 結果を直接解釈しない
- ViewModel が単一入力になる
- fallback / provenance を UI で確認できる

### レビュー観点

- chart が raw rows を直接読んでいないか
- ViewModel builder が間にあるか
- fallback / provenance が隠れていないか

### この PR の価値

この段階で初めて、自由期間本体 UI を足しても既存画面の内部実装を増やさずに済む。

---

## PR 間の依存関係

順番は固定。

```
PR1 入力契約統一
  ↓
PR2 比較解決一本化
  ↓
PR3 free-period 正本レーン完成
  ↓
PR4 額/率/集約責務整理
  ↓
PR5 既存画面載せ替え
```

この順にしないと、先に UI を触ったときに比較ロジックが page / hook / chart
に漏れる。それが今までの不安定化の中心。

## Phase との対応

| PR | plan.md の Phase |
|---|---|
| PR 1 | Phase 1: 入力契約統一 |
| PR 2 | Phase 2: 比較解決一本化 |
| PR 3 | Phase 3: 自由期間データレーン完成 |
| PR 4 | Phase 4: 率計算・集約責務整理 |
| PR 5 | Phase 5 + Phase 6: chart 薄化 + 画面載せ替え |

Phase 0（現状棚卸し）は PR 1 着手前の事前調査として実施し、PR 化はしない
（棚卸し結果は HANDOFF.md または調査メモに残す）。

## 最終的な成功状態

この 5 PR が終わった時点で、こうなっていれば成功:

- 固定期間は free-period preset として扱える
- 比較先解決は `ComparisonScope` だけ
- 自由期間取得は `readFreePeriodFact()` だけ
- 期間サマリー計算は `computeFreePeriodSummary()` だけ
- SQL と JS に同一集約の二重実装がない
- chart は `FreePeriodReadModel` 系の ViewModel だけを読む
- 将来、自由期間 picker を足しても内部を作り直さなくてよい
