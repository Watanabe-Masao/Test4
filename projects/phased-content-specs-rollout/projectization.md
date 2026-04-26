# projectization — phased-content-specs-rollout

> 役割: AAG-COA 判定結果。
> 規約: `references/03-guides/projectization-policy.md`

## 1. 判定結果

| 項目 | 値 |
|---|---|
| `projectizationLevel` | Level 2 |
| `changeType` | docs-only |
| `implementationScope` | `["projects/phased-content-specs-rollout/", "references/05-contents/"]` |
| `breakingChange` | false |
| `requiresLegacyRetirement` | false |
| `requiresGuard` | false |
| `requiresHumanApproval` | true |

## 2. 判定理由

`references/05-contents/` 配下の Content Spec System (CSS / WSS) を、SP-B Anchor Slice
を起点に Phase A〜J で段階展開するための **計画 doc canonical 化 project**。

- **Level 2** — 計画 doc + Phase A の vertical slice 着手を含む 10 Phase 構造。
  単一 PR では完結せず、Phase 別 Wave 構造を持つが、本 project 自体は実装責務を持た
  ないため Level 3 ではない
- **changeType=docs-only** — 本 project は計画と完了条件の正本を持つ。実装（spec
  本文量産・guard 実装・collector 追加等）は依存 sub-project（SP-B 等）の責務
- **breakingChange=false** — 既存 type / API / contract に破壊的変更を導入しない
- **requiresLegacyRetirement=false** — 既存 doc / コードの撤退ではなく、新規仕組みの
  段階展開
- **requiresGuard=false** — 本 project 単独では新 guard を追加しない。Phase A の 5 件
  `AR-CONTENT-SPEC-*` rule は umbrella inquiry/01a Phase 6 で active 化される
- **requiresHumanApproval=true** — 本 plan は SP-B / SP-C / SP-D の実態と整合する必要
  があり、archive 前に人間レビューで Phase 順序・対象・完了条件の妥当性を承認する

## 3. 必要な文書

| 文書 | 必要性 | 理由 |
|---|---:|---|
| `AI_CONTEXT.md` | required | Level 2 必須 |
| `HANDOFF.md` | required | Level 2 必須 |
| `plan.md` | required | Phase A〜J 構造 + 不可侵原則 |
| `checklist.md` | required | completion 判定入力 |
| `inquiry/` | forbidden | parent umbrella inquiry/01a に依存（単独 inquiry は作らない） |
| `breaking-changes.md` | forbidden | breakingChange=false |
| `legacy-retirement.md` | forbidden | requiresLegacyRetirement=false |
| `sub-project-map.md` | forbidden | 本 project 自体が umbrella の sub-project。さらに spawn しない |
| guard 設計 (plan.md 内) | forbidden | requiresGuard=false (本 project は計画のみ) |
| 最終レビュー (人間承認) checkbox | required | requiresHumanApproval=true |

## 4. やらないこと (nonGoals)

- **Phase B 以降の実装着手**（実装は依存 sub-project の責務、本 project は計画の正本）
- **新 Architecture Rule の active 化**（Phase A の `AR-CONTENT-SPEC-*` 5 件は umbrella
  inquiry/01a Phase 6 で実装）
- **本体アプリ（粗利管理ツール）の機能変更**
- **WSS 以外の category（01-principles / 03-guides 等）への原則変更**
- **Phase A の対象拡大**（SP-B Anchor Slice 5 件以外を Phase A に含めない）
- **「初回スコープ外」表現の復活**（不可侵原則 1 違反）

## 5. Escalation / De-escalation 条件

以下が発生した場合、`projectizationLevel` を再評価する。

- 本 project が独自に guard / collector / type 変更を追加する必要が発生した
  → Level 3 へ escalate（governance-hardening 化）
- Phase 構造を変更する必要が発生した（A〜J 順序の入替・新 Phase 追加）
  → 人間レビュー必須（plan.md §不可侵原則 1〜2 への影響を評価）
- 想定より影響範囲が大きく Level 4（umbrella）化が妥当と判明した場合
  → architecture-debt-recovery と統合協議
- 想定より影響範囲が小さく Phase A〜J 全体が単一 PR で済むと判明した場合
  → Level 1 へ de-escalate（quick-fix 扱い）

## 6. 履歴

| 日付 | 変更 | 理由 |
|---|---|---|
| 2026-04-26 | 初期判定 (Level 2) | spawn 時。「初回スコープ外」を「順番を後にすること」として明記する Phase A〜J 計画 doc canonical 化 project として立ち上げ |
| 2026-04-26 | **SHELL モード降格** | umbrella plan.md §3 不可侵原則 #16「Phase 4/5 計画を経由せずに sub-project を立ち上げない」遵守 + 軽量起動の原則に従い、canonical 計画 doc を umbrella `inquiry/22-content-state-layer-promotion-plan.md` に移管。本 project は **promotion target shell** として残す（Phase C 以降が単一 PR で済まない / 新 AR active 化 / 破壊的 type 変更 / ratchet-down baseline が必要、いずれかの trigger 発火で ACTIVE 再昇格） |
