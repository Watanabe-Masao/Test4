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
- **requiresGuard=true** — sync guard 数件を新設予定:
  1. `aagRulesByPathSyncGuard` (Phase 2、artifact ↔ canonical drift 検出)
  2. `aagRuleDetailSyncGuard` (Phase 3、同上)
  3. (Phase 5 の rule-by-topic 用 sync guard、判断次第)
- **言語境界**: 本 program runtime は Go / Python / combo OK。**Rust 除外** (本体 WASM/Rust と境界混線、AI が Rust を強く推奨する場合は人間確認 escalation)。canonical (TS) は不変、AAG runtime はオプショナル (Phase 6 simulation 次第)。
- **requiresHumanApproval=true** — `references/03-guides/project-checklist-governance.md` §3.1 の構造的要請として、最終 archive 承認 1 点のみ人間 mandatory。**それ以外の判断は AI が事実根拠で行い、`decision-audit.md` に判断時の根拠と振り返り観測点を記録する** (`plan.md` 原則 7)。AI Checkpoint α / β / γ は人間承認 gate ではなく、AI が振り返り観測点を実測して判定する内部手続き。「人間が同意したから正しい」構造を作らない。

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

本 program の scope に **絶対に含めない** 作業:

- アプリ業務ロジック (gross-profit / sales / forecast 等) の意味変更
- 既存 9 integrity guard / 12 AAG-REQ の baseline 緩和
- 新 doc を増やす (gap fill は既存 doc 拡張、`strategy.md` §1.1「正本を増やさない」)
- `base-rules.ts` (10,805 行) の TS authoring を JSON 化 (authoring 価値を毀損)
- Rust の本 program runtime 使用 (本体境界混線、Go / Python / combo OK)
- 後続 cutover の本実装 (本 program は前提整備まで)
- observation なき articulation を deliverable に追加 (supreme principle)
- `pure-calculation-reorg` overlay の rule entry 削除 (entry 自体は触らない、形式整理に閉じる)

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
