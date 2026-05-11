# Engine Promotion Matrix — 状態 (split)

> **disposition: split 完遂 (= AAG-COA Sub-3 sub-PR 4)**: 旧 doc は (1) 一覧表 + 個別 engine 詳細 = state snapshot + (2) 昇格ロードマップ + 優先順序 = 過去の判断 narrative + (3) 更新ルール = meta-rule の混在だった。本 doc は **current state 集約** のみ。stage 定義は `engine-maturity-matrix.md`、promotion 判定基準は `promotion-criteria.md` を参照。本 doc 内容は machine-verifiable な engine state ではなく **人手 articulate** であり、内容更新時は `次にやること` 欄 (本 doc 外) ではなく状態が変わった engine の行のみ change する。

## 現在の状態 (2026-04-05 全 engine 昇格完遂)

| Engine | Current State | Rust | WASM | Observation Test | 昇格日 |
|---|---|---|---|---|---|
| factorDecomposition | **authoritative** ✅ | ✅ | ✅ | 18 pass | 2026-04-05 |
| grossProfit | **authoritative** ✅ | ✅ | ✅ | 16 pass | 2026-04-05 |
| budgetAnalysis | **authoritative** ✅ | ✅ | ✅ | 12 pass | 2026-04-05 |
| forecast | **authoritative** ✅ | ✅ | ✅ | 21 pass | 2026-04-05 |
| timeSlot | **authoritative** ✅ | ✅ | ✅ | 25 pass | 2026-04-05 |

各 engine の不変条件テストは `app/src/test/observation/*Observation.test.ts` に articulate (= authoritative 昇格後も観測テストを不変条件テストとして維持)。

## 更新ルール (meta)

- engine の状態 (= current state column) が変わったら本表の行を update する
- authoritative 昇格時は昇格日 + TS fallback 削除の commit hash を articulate する
- 観測テスト件数 (= Observation Test column) は test ファイルの実 count 値を articulate
- 個別 engine の詳細状況 (= TS fallback delete 経緯 / WASM crate 構成 / 観測 verdict 等) は本 doc には書かない (= 該当 engine の README / aag/_internal/ を参照)
