# Review Checklist — unify-period-analysis

> 役割: 方針確認・契約・レーン・責務・ガード・移行・完了判定の観点を
> カテゴリ別にまとめた総括チェックリスト。`checklist.md`（完了判定の
> 機械的 required set）とは別役割で、設計・レビュー時に参照する。
>
> 参照: `references/01-principles/free-period-analysis-definition.md`,
> `references/01-principles/data-pipeline-integrity.md`,
> `references/03-guides/runtime-data-path.md`

## 前提 3 点

1. 固定期間は自由期間の preset として扱う
2. 比較は `ComparisonScope` に閉じる
3. 取得・集計・表示は free-period 系の正本レーンに寄せる

この前提は、自由期間分析が `FreePeriodAnalysisFrame` と `ComparisonScope`
を入口にし、`readFreePeriodFact()` を取得正本、`computeFreePeriodSummary()`
を集計正本とする定義に沿っている。実行時データ経路は component → hook /
plan → useQueryWithHandler → QueryHandler → View で、component に
acquisition logic を持ち込まないのが原則。

---

## A. 方針確認

- [ ] 固定期間は「別系統」ではなく free-period preset として扱う
- [ ] 自由期間系と単月確定値系を無理に同一型へ統合しない
- [ ] 比較先解決は `ComparisonScope` 経由のみとする
- [ ] 自由期間取得は `readFreePeriodFact()` を唯一経路にする
- [ ] 期間サマリー計算は `computeFreePeriodSummary()` を唯一経路にする
- [ ] 画面固有の都合で DB・比較・集計ロジックを UI 側へ逃がさない

---

## B. 入力契約

- [ ] ヘッダの固定期間選択は `anchorRange` を返す preset として定義されている
- [ ] `HeaderFilterState -> FreePeriodAnalysisFrame` 変換は 1 か所に閉じている
- [ ] query 実行前に必ず `FreePeriodAnalysisFrame` が作られる
- [ ] component / hook / plan がヘッダ生 state を直接 query に流していない
- [ ] `storeIds`, `anchorRange`, `comparison` が frame に揃っている
- [ ] 固定期間画面も内部では free-period frame を使っている

---

## C. 比較契約

- [ ] 比較条件の入口は `ComparisonScope` のみ
- [ ] `sameDate` / `sameDow` / `previousPeriod` / `sameRangeLastYear` などの解決が resolver に集約されている
- [ ] presentation 層が比較先日付を独自計算していない
- [ ] ViewModel が比較レンジを自前解釈していない
- [ ] chart component が比較ロジックを持っていない
- [ ] 比較結果に provenance が付いている
- [ ] provenance に `mappingKind` がある
- [ ] provenance に `fallbackApplied` がある
- [ ] provenance に `sourceDate` または比較起点日がある
- [ ] provenance に `comparisonRange` がある
- [ ] provenance に `confidence` がある

比較系は、今後の自由期間選択分析まで見据えるなら「取得方法が違う値は別の値」
として扱う必要がある。比較スコープを型と resolver で分けないと、固定期間
前提の暗黙知が残る。

---

## D. 取得レーン

- [ ] 自由期間データ取得は `freePeriodHandler` 経由
- [ ] `readFreePeriodFact()` 以外の自由期間取得経路がない
- [ ] DuckDB 取得は日別×店舗粒度で統一されている
- [ ] comparison 用 current / comparison rows が `FreePeriodReadModel` に整理されている
- [ ] raw query 結果をそのまま chart に渡していない
- [ ] handler は取得 orchestration のみを担い、業務意味論を持っていない

自由期間分析の定義では、取得正本は `readFreePeriodFact()` であり、
`classified_sales + purchase` LEFT JOIN をベースにする。実行時の主経路でも、
handler は取得手順を管理し、意味付けは builder / read model 側に寄せるのが
原則。

---

## E. 集計・計算責務

- [ ] 期間サマリーは `computeFreePeriodSummary()` に一本化されている
- [ ] SQL と JS で同じ集計を二重実装していない
- [ ] VM / chart で summary を再計算していない
- [ ] 比率計算を Presentation で直接書いていない
- [ ] 比率計算を ViewModel で直接書いていない
- [ ] 比率計算を DuckDB SQL に書いていない
- [ ] 率ではなく額を運んでいる
- [ ] rate は `domain/calculations` 側で算出している
- [ ] `discountRate`, `gpRate`, `markupRate` の定義元が分散していない

パイプライン整合性の原則では、額を持ち回し、率は使用直前に
`domain/calculations` で算出する。SQL や VM で率を計算しないことが重要。

---

## F. ViewModel / Chart

- [ ] chart は `FreePeriodReadModel` 系の ViewModel だけを読む
- [ ] chart component が raw rows を直接解釈していない
- [ ] option builder と data builder が分離されている
- [ ] chart component に acquisition logic がない
- [ ] chart component に比較先解決ロジックがない
- [ ] chart component に集約ロジックがない
- [ ] ViewModel は表示用変換に限定されている
- [ ] fallback / provenance を UI に必要な粒度で出せる

実行時データ経路の原則では、component は controller state と描画に寄り、
取得・比較・query orchestration は plan / handler 側に寄せるべき。

---

## G. スコープ安全

- [ ] 「前年売上」のような同名異義の値を型で分離している
- [ ] 変数名にスコープが入っている
- [ ] 月間固定値と期間連動値を混ぜていない
- [ ] 予算比較に alignment 値を使っていない
- [ ] 比較に必要な値が `monthlyTotal` / `aligned` / `elapsedDays` などで明示されている
- [ ] 曖昧な `prevYearSales` のような命名が残っていない

この系統の事故は既に文書化されており、「同じ前年売上でも取得スコープが
違えば別の値」である。型・命名・取得経路で分けないと静かに壊れる。

---

## H. ガード / テスト

- [ ] `readFreePeriodFact()` 以外の取得経路を禁止するガードがある
- [ ] presentation 層で比較先日付を計算しないガードがある
- [ ] SQL / JS 二重集約を検出するガードがある
- [ ] rate を SQL / VM / Presentation で直計算しないテストがある
- [ ] `FreePeriodReadModel` の shape を固定する契約テストがある
- [ ] provenance / fallback が必須であることを確認するテストがある
- [ ] preset から frame への変換を確認するテストがある
- [ ] fixed period preset と free period 実入力で同じ内部レーンを通ることを確認するテストがある

---

## I. 移行手順

- [ ] まず固定期間 UI はそのままで内部だけ frame 化する
- [ ] 次に比較先解決を resolver に寄せる
- [ ] 次に free-period 取得と summary を正本化する
- [ ] 次に rate / aggregate を押し戻す
- [ ] 最後に chart 側を薄くして既存画面を載せ替える
- [ ] 自由期間 picker はこの後に追加する
- [ ] UI を先に広げて、内部契約を後追いしない

---

## J. 完了判定

- [ ] 固定期間は free-period preset として動いている
- [ ] 比較は `ComparisonScope` だけで解決している
- [ ] 自由期間取得は `readFreePeriodFact()` だけ
- [ ] 期間サマリー計算は `computeFreePeriodSummary()` だけ
- [ ] SQL / JS / VM に二重集約がない
- [ ] SQL / VM / Presentation に rate 直計算がない
- [ ] chart は ViewModel のみを読んでいる
- [ ] provenance / fallback を UI まで伝搬できている
- [ ] 将来自由期間 picker を追加しても内部契約を増やさずに済む

---

## 実務用の短縮版

これだけ見れば進められる短縮版。

```
[入口]
- 固定期間は preset
- 内部は FreePeriodAnalysisFrame に統一

[比較]
- ComparisonScope だけで比較先解決
- provenance 必須
- UI で比較先を計算しない

[取得]
- readFreePeriodFact() だけ
- freePeriodHandler 経由
- raw rows を chart に直渡ししない

[集計]
- computeFreePeriodSummary() だけ
- SQL/JS 二重集約禁止
- 率は domain で計算

[表示]
- FreePeriodReadModel -> ViewModel -> Chart
- chart に比較/集約/取得ロジックを置かない
```
