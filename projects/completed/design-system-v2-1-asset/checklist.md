# checklist — design-system-v2-1-asset

> 役割: completion 判定の入力（required checkbox の集合）。
> 規約: `references/03-guides/project-checklist-governance.md` §3。
> 形式: `* [ ]` または `* [x]` の半角スペース。ネスト不可。

## Phase 1: 資産配置

* [x] `references/04-design-system/` ディレクトリ作成
* [x] 49 ファイルを `references/04-design-system/` 配下に配置
* [x] `references/README.md` の目次に `04-design-system` を追記
* [x] `docs/contracts/doc-registry.json` に `design-system` カテゴリを追加
* [x] `docs/contracts/doc-registry.json` の `$comment` に本 project の履歴を追記

## Phase 2: 動作確認 ✅ 完了 (2026-04-20)

* [x] `references/04-design-system/preview/index.html` をローカルサーバで開き、全プレビューページが描画されることを確認する (2026-04-20)
* [x] preview 上でダーク/ライト切替が動作することを確認する (2026-04-20: 実アプリのダーク UI でも色値が期待通り)
* [x] `references/04-design-system/ui_kits/app/index.html` のクリックスルーを確認する (2026-04-20)
* [x] `references/04-design-system/colors_and_type.css` の値が本体 `app/src/presentation/theme/tokens.ts` + `theme.ts` と整合することを確認する (2026-04-20: 実アプリの DiscountTrendChart で 71 red / 72 orange / 73 yellow / 74 purpleMid + 前年 slate が期待通り)

## Phase 3: Documentation integrity ✅ 完了 (2026-04-20)

* [x] `cd app && npm run docs:check` が PASS すること (2026-04-20 確認)
* [x] `cd app && npm run docs:generate` で generated section に差分が出ないこと (baseline コミット後 diff 無し)
* [x] `git diff --name-only main | grep '^app/'` で本体コード変更が無いことを確認する (本 project は references/04-design-system/ 追加のみ / app/ 無変更)
* [x] `references/` 配下の既存ファイル (01/02/03/99) に意図しない変更が無いことを確認する (04-design-system/ 新設のみ、他カテゴリ変更は generated section 更新のみで意図通り)

## 最終レビュー (人間承認)

> このセクションは **必ず最後** に置き、人間レビュー前は [ ] のままにする。
> 詳細: `references/03-guides/project-checklist-governance.md` §3.1 / §6.2

* [x] 全 Phase の成果物 (commit / PR / 関連正本 / generated artifact) を人間がレビューし、archive プロセスへの移行を承認する (2026-04-20)
