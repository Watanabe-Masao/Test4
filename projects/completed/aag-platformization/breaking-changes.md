# breaking-changes — aag-platformization

> 役割: 本 program が実施する破壊的変更の一覧と運用規約。
>
> **正本**: 本 project の `plan.md` §禁止事項テーブル + Phase 2 / Phase 4 / Phase 8 の詳細。本文書はその AAG-COA 入口としての summary。

## 対象破壊的変更

| ID | 対象 | 破壊内容 | Phase |
|---|---|---|---|
| **BC-AAG-1** | `app/src/test/architectureRules/merged.ts` の merge ロジック | 採用案 (Phase 2) によって reviewPolicy 解決経路が変わる。defaults stub / merged null fallback / bootstrap seed 必須化のいずれかで実装が変わるため、`merged.ts` を直接 import している test / collector のシグネチャに影響しうる | Phase 2 |
| **BC-AAG-2** | `RuleExecutionOverlayEntry` 型定義 | `_template/aag/execution-overlay.ts` (optional fields) と `pure-calculation-reorg/aag/execution-overlay.ts` (required fields) の二重定義を `aag-core-types.ts` 集約に置換。各 project の type import 文字列が変わる | Phase 2 |
| **BC-AAG-3** | `architectureRules/merged.ts` の export shape | merge 結果に `resolvedBy` field を追加。consumer が `keyof ArchitectureRule` を依存している箇所に影響 | Phase 4 |
| **BC-AAG-4** | `tools/architecture-health/src/aag-response.ts` `AagResponse` 型 | helper 駆動 inline 型から JSON Schema からの型生成に切替。`AagResponse` を `import type` している全箇所が schema-backed 型を見ることになる (互換維持を guard で機械検証) | Phase 5 |
| **BC-AAG-5** | `RuleBinding` の許容 field | `ruleBindingBoundaryGuard` 新設により、binding に追加された意味系 field (what / why / decisionCriteria / migrationRecipe / fixNow / executionPlan / lifecyclePolicy) が hard fail。現状 5 field (doc / correctPattern / outdatedPattern / canonicalDocRef / metaRequirementRefs) のみ許容 | Phase 7 |
| **BC-AAG-6** | overlay の物理形式 | TS authoring 正本の傍ら、`projects/<id>/aag/execution-overlay.json` を派生 artifact として並列出力。TS と JSON の同期 guard が新設される | Phase 8 |

## 運用規約

- **1 PR = 1 Phase** — Phase 境界で `npm run docs:generate` / `test:guards` / `lint` / `build` を回す。複数 Phase の破壊的変更を同 commit に混ぜない (`plan.md` §やってはいけないこと「単一 commit で 2 Phase 以上をまとめる」)
- **採用案の人間承認** — BC-AAG-1 / BC-AAG-2 は Phase 2 の 3 案 (defaults stub / merged null / bootstrap seed) から人間承認で 1 案を確定してから着手
- **Gate 通過必須** — Gate 1 (Phase 1〜3) / Gate 2 (Phase 4〜7) / Gate 3 (Phase 8〜10) の順序を逆転させない
- **既存 guard の baseline 緩和禁止** (`plan.md` §不可侵原則 2)。BC-AAG-1 修正で既存 guard が落ちる場合、guard を緩めるのではなく実装側を直す

## 想定影響範囲

- **アプリ業務 runtime**: **不変** (`plan.md` §不可侵原則 1。本 program は AAG 自体の制度基盤化に閉じる)
- **`pure-calculation-reorg` の merge 結果**: **不変** (Phase 2 の golden test で機械検証)
- **既存 active project の overlay コード**: type import 文字列が変わる (BC-AAG-2)。文字列置換 1 箇所 / project で対応可
- **CI / pre-commit / pre-push hook**: BC-AAG-3 / BC-AAG-4 / BC-AAG-6 の実施時に generated artifact + schema が増えるため、`docs:generate` の出力先が増える

## rollback plan

- **Phase 2 (BC-AAG-1 / BC-AAG-2)**: 採用案次第で rollback 容易性が異なる。defaults stub 案は `defaults.ts` 1 箇所の revert で復旧。bootstrap seed 案は新規 project への影響大、revert 困難
- **Phase 4 (BC-AAG-3)**: merge generator の revert で復旧。生成 artifact は再生成すれば復元
- **Phase 5 (BC-AAG-4)**: schema 削除 + helpers.ts inline 型復旧で revert 可
- **Phase 7 (BC-AAG-5)**: ruleBindingBoundaryGuard を test.skip にすれば一時迂回可。本 commit revert で完全復旧
- **Phase 8 (BC-AAG-6)**: JSON artifact 削除のみ。TS authoring 正本は無傷
- **rollback 境界は Phase 単位** — 複数 Phase 間で revert 順序の依存はない設計

## 後続 project への引き継ぎ

`aag-go-cutover` (仮称、本 program 完了後に立ち上げ予定) は Go runtime の本 cutover を担う。本 program の 6 つの破壊的変更が landing した状態を **前提** とする。`AAG_CUTOVER_CHARTER.md` (Phase 10 で landing) に着手条件を articulate する。

詳細は本 project の `plan.md` §Phase 2, §Phase 4, §Phase 5, §Phase 7, §Phase 8 を参照。
