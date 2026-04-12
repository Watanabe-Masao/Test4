# checklist — data-load-idempotency-hardening

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 常時チェック / 恒久ルールは plan.md に書く。

## Phase 0-3: idempotent load contract 本体（landed 済み）

* [x] `loadMonth` の replace セマンティクス契約を JSDoc に明文化した
* [x] `purgeLoadTarget` helper を抽出し内部 purge を一本化した
* [x] reload path の caller-side `deleteMonth` を除去した
* [x] `deletePrevYearRowsAt` を導入し year-shift を解消した
* [x] `dataLoaderPureFunctions.test.ts` に冪等性契約テスト 4 件を追加した
* [x] read-path 重複耐性 spot audit を実施し FRAGILE 6 / PARTIAL 3 / SAFE を分類した

## PR A-E: 残存防御の実装（landed 済み）

* [x] handoff / plan / audit の役割を「正本=plan / 要約=handoff / 根拠=audit」で固定した
* [x] checklist の Done 定義を 5 項目で明文化した
* [x] `duplicateInjectedMockConn.ts` 共有 helper を追加しセルフテスト 7 件を通した
* [x] FRAGILE 6 件の関数 JSDoc に `@risk` タグと `@depends-on loadMonth-replace-semantics` を付与した
* [x] PARTIAL 3 件の関数 JSDoc に `@risk PARTIAL` を付与した
* [x] `schemas.ts` の `MAX(customers)` 直上に `@defense customers=MAX` コメントを転記した
* [x] `deletePolicy.ts::deletePrevYearMonth` 直上に `@defense year-shift` コメントを転記した
* [x] FRAGILE 6 件の構造的回帰テストを `readPathDuplicateResistance.test.ts` に追加した
* [x] `purchaseComparison.ts` FRAGILE 1/2 を pre-aggregate 化した（PR D）
* [x] `freePeriodFactQueries.ts` FRAGILE 6 を pre-aggregate 化した（PR E）
* [x] FRAGILE 1/2/6 の `.fails` を外し通常の `it` に戻した

## Phase F: 恒久方針の最終確認

* [x] FRAGILE 3/4/5 の恒久方針を「`.fails` ロックのまま JSDoc only mitigation」に確定する
* [x] 上記方針を `references/03-guides/read-path-duplicate-audit.md` の §推奨事項に転記する
* [x] 旧 `data-load-idempotency-handoff.md` を「歴史的 handoff」に縮退し本 project の HANDOFF.md に正本を移す
* [x] 旧 `data-load-idempotency-plan.md` から live task table を削除し背景文書化する
