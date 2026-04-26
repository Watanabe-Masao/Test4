# projectization — phased-content-specs-rollout

> 役割: AAG-COA 判定結果。
> 規約: `references/03-guides/projectization-policy.md`

## 1. 判定結果

| 項目 | 値 |
|---|---|
| `projectizationLevel` | Level 3 |
| `changeType` | governance-hardening |
| `implementationScope` | `["projects/phased-content-specs-rollout/", "references/05-contents/", "app/src/test/architectureRules.ts", "app/src/test/guards/", "tools/architecture-health/src/collectors/obligation-collector.ts", "tools/widget-specs/"]` |
| `breakingChange` | false |
| `requiresLegacyRetirement` | false |
| `requiresGuard` | true |
| `requiresHumanApproval` | true |

## 2. 判定理由

`references/05-contents/` 配下の Content Spec System (CSS / WSS) を、Phase A〜J で
段階展開する独立 active project。

- **Level 3** — Phase A で 5 件の新 `AR-CONTENT-SPEC-*` rule active 化 + frontmatter
  generator 実装 + `obligation-collector.ts` 拡張 + 複数 guard 新設にまたがる
  architecture level 改修。Phase B 以降も同類の拡張が続く。Level 4（umbrella）化は
  しない（独立 project として完結）
- **changeType=governance-hardening** — AAG 基盤の強化（content spec system の機械検証
  経路を構築）。本体アプリの機能には無影響
- **breakingChange=false** — 既存 type / API / contract に破壊的変更を導入しない。
  spec frontmatter schema は新設で既存 doc 構造を破壊しない
- **requiresLegacyRetirement=false** — 既存 doc / コードの撤退ではなく、新規仕組みの
  段階展開
- **requiresGuard=true** — 5 件 `AR-CONTENT-SPEC-*` 新設 + co-change / freshness / owner
  guard 実装
- **requiresHumanApproval=true** — Phase 構造・Phase 完了条件・Operational Control System
  各 dimension の妥当性を archive 前に人間レビューで承認する

## 3. 必要な文書

| 文書 | 必要性 | 理由 |
|---|---:|---|
| `AI_CONTEXT.md` | required | Level 3 必須 |
| `HANDOFF.md` | required | Level 3 必須 |
| `plan.md` | required | Phase A〜J + Operational Control System §1〜§11 |
| `checklist.md` | required | completion 判定入力 |
| `inquiry/` | forbidden | 独立 active project（umbrella sub-project ではない）。inquiry は持たない |
| `breaking-changes.md` | forbidden | breakingChange=false |
| `legacy-retirement.md` | forbidden | requiresLegacyRetirement=false |
| `sub-project-map.md` | forbidden | 本 project からさらに spawn しない |
| guard 設計 (plan.md 内) | required | 5 件 `AR-CONTENT-SPEC-*` + co-change/freshness/owner の baseline 戦略 |
| 最終レビュー (人間承認) checkbox | required | requiresHumanApproval=true |

## 4. やらないこと (nonGoals)

- **Phase A の対象拡大**（Anchor Slice 5 件以外を Phase A に含めない）
- **「初回スコープ外」表現の復活**（plan.md 不可侵原則 1）
- **Phase F 以降の全網羅**（selection rule 必須）
- **依存 Phase 未完での先行着手**（Wave 構造を破壊する）
- **archived umbrella / archived sub-project の touch**（immutable、本 project は parent
  を持たない独立 active project）
- **WID-NNN 本文の上書き**（全 45 件 landed 済み、Phase A の作業は frontmatter 同期と
  source 接続のみ）
- **本体アプリ（粗利管理ツール）の機能変更**
- **WSS 以外の category（01-principles / 03-guides 等）への原則変更**

## 5. Escalation / De-escalation 条件

- 本 project が独自に破壊的 type 変更を導入する必要が発生 → escalate（人間 review、
  breakingChange=true 化）
- Phase 構造を変更する必要が発生（A〜J 順序の入替・新 Phase 追加） → 人間レビュー必須
  （plan.md 不可侵原則 1〜2 への影響を評価）
- 想定より影響範囲が大きく Level 4（umbrella）化が妥当と判明した場合 → 新 umbrella を
  spawn、本 project を sub-project に降格
- 想定より影響範囲が小さく Phase A〜J 全体が 1〜2 PR で済むと判明した場合 → Level 2 へ
  de-escalate

## 6. 履歴

| 日付 | 変更 | 理由 |
|---|---|---|
| 2026-04-26 | 初期判定 (Level 2 / docs-only) | spawn 時、独立 sub-project として |
| 2026-04-26 | SHELL モード降格 (Level 2 / paused) | umbrella 不可侵原則 #16 + 軽量起動の原則。canonical 計画を inquiry/22 に移管 |
| **2026-04-26** | **ACTIVE 昇格 + Level 3 / governance-hardening 化** | umbrella + 4 sub-project 全 archive 後、archived 配下 inquiry が無効。canonical 計画を本 project の `plan.md` に移管。Phase A の機械接続実装を含むため Level 3 に escalate（5 新 rule + generator + collector 拡張 + guard 新設） |
