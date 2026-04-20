# checklist — category-leaf-daily-entry-shape-break

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 常時チェック / 恒久ルールは plan.md に書く。
>
> 規約: `references/03-guides/project-checklist-governance.md` §3。

## Phase 1: flat shape 追加 + projection 層拡張 (非破壊) ✅ 完了 (2026-04-19)

* [x] `CategoryLeafDailyEntry` を intersection 型に変更し flat field (`deptCode / deptName / lineCode / lineName / klassCode / klassName`) を追加する
* [x] `projectCategoryLeafDailySeries` を拡張し flat field を生成する (`toCategoryLeafDailyEntries` 純関数として切り出し)
* [x] parity test で `projection(r).deptCode === r.department.code` 等 6 不変を固定する
* [x] 既存 consumer 未変更で build / test / guard が全 PASS することを確認する

## Phase 2: 新 guard 新設 + 初期 baseline 固定 ✅ 完了 (2026-04-20)

* [x] `categoryLeafDailyNestedFieldGuard.test.ts` を新設する
* [x] presentation 層 (production) の `.department.` / `.line.` / `.klass.` access 数を初期 baseline として固定する (7 ファイル)
* [x] orphan / stale / allowlist の 3 テストを `categoryLeafDailyLaneSurfaceGuard` と同形で実装する (flat field 生成点の存在確認も追加で計 5 tests)
* [x] guard が CI で PASS することを確認する

## Phase 3: consumer 段階移行 (ratchet-down)

* [ ] DrilldownWaterfall 周辺の nested field access を flat field に置換する
* [ ] HourlyChart 周辺の nested field access を flat field に置換する
* [ ] YoYWaterfall + 階層・Period フィルタの nested field access を flat field に置換する
* [ ] useDrilldown hooks / context / Admin の nested field access を flat field に置換する
* [ ] 各 PR で guard baseline を更新して単調減少させる
* [ ] baseline を 0 に到達させる

## Phase 4: alias 解除 + 独立 interface 化

* [ ] `CategoryLeafDailyEntry` を intersection から独立 interface に昇格する
* [ ] `projectCategoryLeafDailySeries` で raw → flat 完全変換に切り替える (nested field を entry 構造から除外)
* [ ] parity test を新 shape で更新して不変を固定する
* [ ] presentation から raw nested field access が型レベルで不可能であることを確認する

## Phase 5: guard 固定化 + 2 層防御の確定

* [ ] `categoryLeafDailyNestedFieldGuard` を「追加禁止」固定モードに移行する
* [ ] `categoryLeafDailyLaneSurfaceGuard` (import surface) との 2 層防御が成立することを確認する
* [ ] guard-test-map.md / doc-registry.json に新 guard を登録する

## 最終レビュー (人間承認)

> このセクションは **必ず最後** に置き、人間レビュー前は [ ] のままにする。
> 機能的な Phase がすべて [x] になっても、ここが [ ] なら project は
> `in_progress` のまま留まり、archive obligation は発火しない。
> 詳細: `references/03-guides/project-checklist-governance.md` §3.1 / §6.2

* [ ] 全 Phase の成果物 (commit / PR / 関連正本 / generated artifact) を人間がレビューし、archive プロセスへの移行を承認する
