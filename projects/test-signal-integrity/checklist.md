# checklist — test-signal-integrity

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 常時チェック / 恒久ルールは plan.md に書く。
>
> 規約: `references/03-guides/project-checklist-governance.md` §3。
> 形式: `* [ ]` または `* [x]` の半角スペース。ネスト不可。
> 各 checkbox は単一の機械的に検証可能な達成条件を表す。
>
> AAG Core 側の checklist として切り出してあり、`presentation-quality-hardening`
> 側の coverage 70 引き上げとは分離している。AAG 側で先に「品質シグナルを歪める
> 行為」を止め、その後に application-side の coverage 強化へ進む前提。

## Phase 1: Principle / Guide 定義

* [x] Signal Integrity の思想を `references/01-principles/` に正本化する
* [x] protected harm（False Green / Review Misleading / Refactoring Fragility / Governance Drift）を定義する
* [x] 品質劣化テストパターンの初期一覧を bad/good example 付きで整理する
* [x] compiler / linter silencing パターンの初期一覧を bad/good example 付きで整理する
* [x] 「機械的に検知できるもの」と「advisory / review に留めるもの」の境界を明文化する
* [x] 許容例外（smoke test / migration 中の一時 suppression / 公開契約の存在確認など）を明文化する
* [x] 固定レスポンスの必須項目（detected / why / protectedHarm / steps / allowedExceptions / examples）を定義する

## Phase 2: Advisory / Review 入口の整備

* [x] 新規 test / spec / e2e 追加時に advisory を返すトリガー対象パスを定義する
* [x] 新規 test 追加時の advisory 文面を定義する
* [x] advisory に含める自己点検項目（existence-only / render-only / snapshot-only / suppression 依存など）を定義する
* [x] hard gate にしないグレーな品質劣化パターンを review-only 候補として整理する
* [x] advisory から hard gate へ昇格させる条件を定義する
* [x] false positive が出た場合の扱い（allowlist / review / rule 精度改善）を定義する

## Phase 3: Hard Gate 1st Batch 実装

* [ ] Phase 3 着手前に TSIG-TEST-01〜03 / TSIG-COMP-01〜03 の **現状件数を採取** し、ratchet-down baseline を決定する（一時 script で repo を走査し、件数 + 代表ファイルパスを記録する）
* [ ] TSIG-TEST-01: existence-only assertion を検知して block する guard を実装する
* [ ] TSIG-COMP-01: 既存 G3 ガード（`AR-G3-SUPPRESS`）を `@ts-ignore` / `@ts-expect-error` の rationale enforcement に拡張する（新規 guard ではなく既存拡張で実現し、二重カウントを避ける）
* [ ] TSIG-COMP-02: 既存 G3 ガード（`AR-G3-SUPPRESS`）を `eslint-disable` の rationale enforcement に拡張する（同上 — 新規 guard ではなく既存拡張）
* [ ] G3 allowlist を `app/src/test/allowlists/signalIntegrity.ts` に切り出し、`reason` / `removalCondition` を必須化する（TSIG-COMP-01/02 の前提作業）
* [ ] TSIG-COMP-03: unused suppress escape の初期対象を検知して block する guard を実装する（既存 G3 では検知していない領域のため新規）
* [ ] 各 guard が固定フォーマットの AAG response を返すようにする
* [ ] 各 guard に why / protectedHarm / steps / allowedExceptions / examples を紐づける
* [ ] `fixNow=now` と `fixNow=review` の使い分けを実装に反映する

## Phase 4: Docs / Map / Integration 整備

* [ ] `references/03-guides/` に test signal integrity guide を追加する
* [ ] `guard-test-map.md` に新規 guard と保護対象を登録する
* [ ] 必要な正本・guide を `doc-registry.json` に登録する
* [ ] fix hint / deep dive の誘導先を整備する
* [ ] `docs:generate` 実行後に generated artifact が整合することを確認する
* [ ] `npm run test:guards` が PASS することを確認する

## Phase 5: 運用着地と application-side への接続

* [ ] 新規 test 追加時に advisory が自動表示されることを確認する
* [ ] 明確な bad pattern が diff 上で hard fail することを確認する
* [ ] グレーなパターンが advisory / review に留まることを確認する
* [ ] 初期ルール群で false positive が過剰に発生しないことを確認する
* [ ] `presentation-quality-hardening` の coverage 70 引き上げ前提として本 project を参照できる状態にする
* [ ] coverage 数値目標は application-side、signal integrity は AAG-side であることを文書上で分離する
