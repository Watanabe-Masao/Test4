# projectization — aag-platformization

> 役割: AAG-COA 判定結果。
> 規約: `references/03-guides/projectization-policy.md`

## 1. 判定結果

| 項目 | 値 |
|---|---|
| `projectizationLevel` | Level 3 |
| `changeType` | architecture-refactor |
| `implementationScope` | `["app/src/test/aag-core-types.ts", "app/src/test/architectureRules.ts", "app/src/test/architectureRules/", "app-domain/gross-profit/rule-catalog/base-rules.ts", "projects/_template/aag/execution-overlay.ts", "tools/architecture-health/src/aag-response.ts", "references/01-principles/aag/", "docs/contracts/", "docs/generated/aag/"]` |
| `breakingChange` | true |
| `requiresLegacyRetirement` | false |
| `requiresGuard` | true |
| `requiresHumanApproval` | true |

## 2. 判定理由

本 program は AAG 自体の制度基盤化を行う。アプリ業務ロジックを 1 行も変えずに、AAG の **authority / artifact / contract / change-policy** の 4 つを完成させることが目的。Go 移行は最終 runtime 形であって、本 program の goal ではない。

- **Level 3** — 単一 feature / layer に閉じない。AAG core types・base-rules・project overlay・derived merge・response builder・docs ガバナンス・guard 群すべてに横断する architecture-level の整理。Level 4 (umbrella) には該当しない (sub-project への分割なし)。
- **changeType=architecture-refactor** — runtime merge を artifact merge へ、helper 駆動の AagResponse を schema 駆動へ、と AAG 内部の境界を引き直す。複数該当 (governance-hardening も含む) の場合は最も重い type を採用 (policy §2)。
- **breakingChange=true** — `architectureRules/merged.ts` が runtime merge から generated artifact 読み出しへ変わる。consumer facade からは透明だが、direct import している test / collector のシグネチャに影響する可能性。
- **requiresLegacyRetirement=false** — 既存 API の物理削除は本 program の scope ではない。Go cutover の本実装が後続 project に分かれるため、本 program では TS facade を残したまま artifact + contract 層を増設する増分。
- **requiresGuard=true** — 4 種を新設予定:
  1. `RuleBinding` 境界 guard (binding に意味系フィールドが漏れたら hard fail)
  2. AAG schema isomorphism guard (TS 型と JSON Schema の同型性検証)
  3. AagResponse contract guard (helper 経由でも schema 準拠の output になること)
  4. detector protocol guard (Go / TS 両側で同一 result schema を返すこと)
- **requiresHumanApproval=true** — Gate 1 (Authority) / Gate 2 (Artifact) / Gate 3 (Runtime Replacement) の 3 つの gate と最終 archive 時に人間承認必須。AAG の制度変更は「邪魔だから」を理由にできない (`core-boundary-policy.md`) ため、各 gate は人間承認を経由する。

## 3. 必要な文書

| 文書 | 必要性 | 理由 |
|---|---:|---|
| `AI_CONTEXT.md` | required | Level 3 必須 |
| `HANDOFF.md` | required | Level 3 必須 |
| `plan.md` | required | 4 不可侵原則 + 4 Workstream + 3 Gate + Phase 構造 |
| `checklist.md` | required | completion 判定の入力 |
| `inquiry/` | optional | Phase 0 棚卸し結果が小さければ HANDOFF.md に集約。3 ファイル以上に膨らんだ時点で足す |
| `breaking-changes.md` | optional | merged artifact cutover (Workstream B 終盤) で必要になったら派生セットから足す |
| `legacy-retirement.md` | forbidden | 本 program は legacy 撤退を含まない (後続 project に分離) |
| `sub-project-map.md` | forbidden | 単独 project (sub-project への分割なし) |
| guard 設計 (plan.md 内) | required | 4 新 guard の baseline 戦略を plan.md §禁止事項テーブルに定義する |
| 最終レビュー (人間承認) checkbox | required | requiresHumanApproval=true |

## 4. やらないこと (nonGoals)

本 program の scope に **絶対に含めない** 作業 (escalation 判定の基準として機能する):

- アプリ業務ロジック (gross-profit / sales / forecast / customer / discount / pi-value / 等) の意味変更
- 新ガード追加による既存検出範囲の縮退 (baseline を緩和方向に動かすこと)
- Go ランタイムの本実装 (Phase 9 の Go Core PoC まで。本 cutover は後続 project)
- `base-rules.ts` の rich TS 表現を一気に JSON 化すること (authoring 正本としての TS 価値を毀損する)
- AAG の外部公開 (本 program は internal platform 化に閉じる。reusable quality OS 化はその先)
- `pure-calculation-reorg` overlay の rule entry 削除 (本 program は overlay の運用方針 = comment / schema を整理する。entry 自体は触らない)

## 5. Escalation / De-escalation 条件

以下が発生した場合、`projectizationLevel` を再評価する。

- Workstream B 完了時点で Go PoC (Phase 9) を待たず本 cutover が必要と判明 → Level 4 に escalate (sub-project に分離)
- merge policy 一本化 (Phase 2) で defaults 補完を全面禁止する判断になった場合 → 既存 overlay 全件への migration が発生するため Level 4 に escalate
- 既存 active project の overlay に互換性 break が発覚 → Level 4 に escalate (移行 sub-project を切る)
- Phase 1〜5 で contract / schema 化が想定より小さく済むと判明 → Level 2 に de-escalate
- 想定より影響範囲が小さく、Workstream A だけで platform 化が成立すると判明 → Level 2 に de-escalate

## 6. 履歴

| 日付 | 変更 | 理由 |
|---|---|---|
| 2026-05-01 | 初期判定 (Level 3) | 別レビュー指摘の merge policy 揺れ + AAG Core Index の reusable quality OS 構想を踏まえ、Go 移行ではなく AAG 制度基盤化として project 化 |
