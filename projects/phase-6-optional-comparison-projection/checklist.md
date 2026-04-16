# checklist — phase-6-optional-comparison-projection

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 常時チェック / 恒久ルールは plan.md に書く。
>
> 規約: `references/03-guides/project-checklist-governance.md` §3。
> 形式: `* [ ]` または `* [x]` の半角スペース。ネスト不可。
> 各 checkbox は単一の機械的に検証可能な達成条件を表す。

## Phase O1: 最小契約の型定義

* [ ] `app/src/features/comparison/application/ComparisonProjectionContext.ts` を新設する (型定義のみ、実装なし)
* [ ] `ComparisonProjectionContext` の全フィールドに JSDoc で「なぜ必要か」を明記する
* [ ] `PeriodSelection` を薄くコピーした形になっていないことを確認する (`PeriodSelection` からの必要 sub-fields のみを抽出)
* [ ] `buildKpiProjection` 内の `periodSelection.*` 参照箇所を棚卸しして本ファイルで説明した通りのフィールドのみを抽出対象としている

## Phase O2: pure builder 追加

* [ ] `app/src/features/comparison/application/buildComparisonProjectionContext.ts` を新設し `PeriodSelection → ComparisonProjectionContext` の pure 関数として実装する
* [ ] 単体テスト (空ケース + 典型ケース 3 件以上) を追加し green で通す
* [ ] 本 builder が `comparison` feature 内で唯一 `PeriodSelection` を import する経路であることを確認する

## Phase O3: parity test 先行

* [ ] `app/src/features/comparison/application/__tests__/buildKpiProjection.parity.test.ts` を新設する
* [ ] `sameDow.sales` / `sameDow.customers` / `sameDow.transactionValue` / `sameDow.ctsQuantity` の parity を fixture で固定する
* [ ] `sameDate.*` 4 フィールドの parity を fixture で固定する
* [ ] `monthlyTotal.*` の parity を fixture で固定する
* [ ] `sourceYear` / `sourceMonth` / `dowOffset` の parity を fixture で固定する
* [ ] `buildDowGapProjection` 出力の parity を連鎖で検証する
* [ ] fixture matrix として典型月 / 月跨ぎ / 年跨ぎ / comparisonEnabled=false / 複数店舗 / 単一店舗 の 6 ケース以上を含める

## Phase O4: projection の入力差し替え

* [ ] `buildKpiProjection` の signature を `ComparisonProjectionContext` 入力に切り替える
* [ ] `comparisonProjections.ts` から `import type { PeriodSelection }` を削除する
* [ ] `comparisonProjections.ts` に `PeriodSelection` の型参照が 1 箇所も残っていないことを確認する (機械検出)
* [ ] Phase O3 の parity test を全 green にする
* [ ] `buildDowGapProjection` は変更しない (kpi を入力とするだけのため)

## Phase O5: hook の core/wrapper 分離

* [ ] `useComparisonModuleCore({ scope, projectionContext, currentAverageDailySales })` 新 hook を新設する
* [ ] 新 core hook が引数に `periodSelection` を取らないことを確認する
* [ ] 旧 `useComparisonModule(periodSelection, elapsedDays, currentAverageDailySales, externalScope?)` を wrapper 化し、内部で `buildComparisonProjectionContext` を呼ぶだけにする
* [ ] 既存 3 caller (`useComparisonSlice` / `usePageComparisonModule` / tests) が wrapper 経由で動作継続することを確認する
* [ ] `useComparisonModuleLegacyCallerGuard` baseline 0 を維持する

## Phase O6: primary caller の最小移行

* [ ] `useComparisonSlice` が `useComparisonModuleCore` を直接呼ぶ形に書き換える (frame.comparison + projectionContext 経由)
* [ ] `usePageComparisonModule` は wrapper 経由のまま温存する (移行必須ではない)
* [ ] 全 chart / widget が従来通り動作することを確認する (既存 guard / test で担保)

## Phase O7: guard / docs クローズ

* [ ] 親 `projects/unify-period-analysis/HANDOFF.md` の高優先セクションから「Phase 6 optional」を除去する
* [ ] 親 `projects/unify-period-analysis/HANDOFF.md` の完了済みリストに本サブ project の完了 entry を追加する
* [ ] 本サブ project の `HANDOFF.md` を最終状態に更新する (残タスク = なし、status = archive 準備完了)
* [ ] `guard-test-map.md` / `doc-registry.json` に本サブ project 完了の changelog を追加する

## 最終レビュー (人間承認)

> このセクションは **必ず最後** に置き、人間レビュー前は [ ] のままにする。
> 機能的な Phase がすべて [x] になっても、ここが [ ] なら project は
> `in_progress` のまま留まり、archive obligation は発火しない。
> 詳細: `references/03-guides/project-checklist-governance.md` §3.1 / §6.2

* [ ] 全 Phase の成果物 (commit / PR / 関連正本 / generated artifact) を人間がレビューし、archive プロセスへの移行を承認する
