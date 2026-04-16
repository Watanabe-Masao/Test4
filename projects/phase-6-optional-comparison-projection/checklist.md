# checklist — phase-6-optional-comparison-projection

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 常時チェック / 恒久ルールは plan.md に書く。
>
> 規約: `references/03-guides/project-checklist-governance.md` §3。
> 形式: `* [ ]` または `* [x]` の半角スペース。ネスト不可。
> 各 checkbox は単一の機械的に検証可能な達成条件を表す。

## Phase O1: 最小契約の型定義

* [x] `app/src/features/comparison/application/ComparisonProjectionContext.ts` を新設する (型定義のみ、実装なし)
* [x] `ComparisonProjectionContext` の全フィールドに JSDoc で「なぜ必要か」を明記する
* [x] `PeriodSelection` を薄くコピーした形になっていないことを確認する (`PeriodSelection` からの必要 sub-fields のみを抽出)
* [x] `activePreset` を `ComparisonProjectionContext` に含めていないことを確認する (再監査済み: 現行コードは上書きしており元値不要)
* [x] `buildKpiProjection` 内の `periodSelection.*` 参照箇所を棚卸しして plan.md O1 記載のフィールドのみを抽出対象としている

## Phase O2: pure builder + import guard 追加

* [x] `app/src/features/comparison/application/buildComparisonProjectionContext.ts` を新設し `PeriodSelection → ComparisonProjectionContext` の pure 関数として実装する
* [x] 単体テスト (空ケース + 典型ケース 3 件以上) を追加し green で通す
* [x] `comparisonProjectionContextImportGuard.test.ts` を新設する (`features/comparison/application/**` 配下での `PeriodSelection` import を禁止、ALLOWLIST = builder 1 件 + MIGRATION_BASELINE = comparisonProjections.ts / useComparisonModule.ts の 2 件、O4/O5 で baseline を段階的に 0 に縮退)
* [x] `comparisonProjectionContextFieldGuard.test.ts` を新設する (`ComparisonProjectionContext` の key 数上限 + 許可フィールド名 snapshot + PeriodSelection と同名の大きい塊禁止)
* [x] import guard と field guard が green で通ること

## Phase O3: parity test 先行 (buildKpiProjection のみ)

* [x] `app/src/features/comparison/application/__tests__/buildKpiProjection.parity.test.ts` を新設する
* [x] `sameDow.sales` / `sameDow.customers` / `sameDow.transactionValue` / `sameDow.ctsQuantity` の parity を fixture で固定する
* [x] `sameDate.*` 4 フィールドの parity を fixture で固定する
* [x] `monthlyTotal.*` の parity を fixture で固定する
* [x] `sourceYear` / `sourceMonth` / `dowOffset` の parity を fixture で固定する
* [x] `buildDowGapProjection` 出力の parity を連鎖で検証する
* [x] fixture matrix として典型月 / 月跨ぎ / 年跨ぎ / elapsedDays cap 月 / 2月 leap year / sameDow+sameDate 両ルート / 複数店舗 / 単一店舗 の 8 ケース以上を含める
* [x] `comparisonEnabled=false` は O3 scope 外であること (O5 disable-path regression で検証)

## Phase O4: projection の入力差し替え

* [x] `buildKpiProjection` の signature を `ComparisonProjectionContext` 入力に切り替える
* [x] `comparisonProjections.ts` から `import type { PeriodSelection }` を削除する
* [x] `comparisonProjections.ts` に `PeriodSelection` の型参照が 1 箇所も残っていないことを確認する (O2 import guard で機械検出)
* [x] Phase O3 の parity test を全 green にする
* [x] `buildDowGapProjection` は変更しない (kpi を入力とするだけのため)

## Phase O5: hook の core/wrapper 分離

* [x] `features/comparison/application/hooks/useComparisonModuleCore.ts` に新 core hook を新設する (`{ scope, projectionContext, currentAverageDailySales }`)
* [x] 新 core hook が引数に `periodSelection` を取らないことを確認する
* [x] 新 core hook が `features/comparison/` 内にあり `PeriodSelection` を import しないことを確認する (O2 import guard で保証、MIGRATION_BASELINE 0 到達)
* [x] 旧 `useComparisonModule` の wrapper を `app/src/application/hooks/useComparisonModule.ts` に配置する (features/ 外)
* [x] wrapper 内部で `buildComparisonProjectionContext` を呼び最小 contract に変換して core に委譲する
* [x] disable-path regression test を追加する: `externalScope === undefined` → 内部構築 / `externalScope === null` → 比較無効 / `!comparisonEnabled` → idle status
* [x] wrapper と core の出力一致 regression test を追加する
* [x] 既存 3 caller (`useComparisonSlice` / `usePageComparisonModule` / tests) が wrapper 経由で動作継続することを確認する
* [x] `useComparisonModuleLegacyCallerGuard` baseline 0 を維持する

## Phase O6: primary caller の最小移行

* [x] `useComparisonSlice` が `useComparisonModuleCore` を直接呼ぶ形に書き換える (frame.comparison + projectionContext 経由)
* [x] `usePageComparisonModule` は wrapper 経由のまま温存する (移行必須ではない)
* [x] 全 chart / widget が従来通り動作することを確認する (既存 guard / test で担保)

## Phase O7: guard / docs クローズ

* [x] 親 `projects/unify-period-analysis/HANDOFF.md` の高優先セクションから「Phase 6 optional」を除去する
* [x] 親 `projects/unify-period-analysis/HANDOFF.md` の完了済みリストに本サブ project の完了 entry を追加する
* [x] 本サブ project の `HANDOFF.md` を最終状態に更新する (残タスク = なし、status = archive 準備完了)
* [x] `guard-test-map.md` / `doc-registry.json` に本サブ project 完了の changelog を追加する

## 最終レビュー (人間承認)

> このセクションは **必ず最後** に置き、人間レビュー前は [ ] のままにする。
> 機能的な Phase がすべて [x] になっても、ここが [ ] なら project は
> `in_progress` のまま留まり、archive obligation は発火しない。
> 詳細: `references/03-guides/project-checklist-governance.md` §3.1 / §6.2

* [ ] 全 Phase の成果物 (commit / PR / 関連正本 / generated artifact) を人間がレビューし、archive プロセスへの移行を承認する
