# projectization — taxonomy-v2

> 役割: AAG-COA 判定結果。
> 規約: `references/05-aag-interface/operations/projectization-policy.md`

## 1. 判定結果

| 項目                       | 値                                                                                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `projectizationLevel`      | Level 4 (Umbrella)                                                                                                                               |
| `changeType`               | architecture-refactor                                                                                                                            |
| `implementationScope`      | `["app/src/test/responsibilityTagRegistry.ts", "app/src/test/guards/", "docs/contracts/", "references/01-foundation/", "references/04-tracking/"]` |
| `breakingChange`           | true                                                                                                                                             |
| `requiresLegacyRetirement` | true                                                                                                                                             |
| `requiresGuard`            | true                                                                                                                                             |
| `requiresHumanApproval`    | true                                                                                                                                             |

## 2. 判定理由

**分類体系 v2（責務軸 + テスト軸の制度化: 親）**。2 sub-project
（responsibility-taxonomy-v2 / test-taxonomy-v2）を束ねる umbrella。7 不可侵原則と
interlock 仕様を固定し、両軸が相互契約を持つ状態を AAG 第 3 の柱として恒久化する。

- **Level 4 (Umbrella)** — 2 sub-project を spawn、複数 architecture lane、広範囲の
  破壊的変更（v1 → v2 vocabulary 入替）と v1 タグ撤退、原則・guard・journal の新設
- **changeType=architecture-refactor** — 語彙体系と interlock 契約の再構築（AAG 第 3 の柱）
- **breakingChange=true** — 既存 v1 責務タグ vocabulary + R/T 軸 interlock 未実装を
  v2 で完全刷新
- **requiresLegacyRetirement=true** — v1 の 400 件未分類 / 48 件タグ不一致 / R:utility
  捨て場化の段階撤退（review window 経由）
- **requiresGuard=true** — taxonomyInterlockGuard / taxonomyVocabularyGuard /
  taxonomyEntropyGuard（両軸共通）+ 子 project の Schema / Operations guard
- **requiresHumanApproval=true** — 7 不可侵原則 + interlock 仕様は Constitution 的性質を
  持つため archive 前に人間承認必須

## 3. 必要な文書

| 文書                             |                 必要性 | 理由                                             |
| -------------------------------- | ---------------------: | ------------------------------------------------ |
| `AI_CONTEXT.md`                  |               required | Level 4 必須                                     |
| `HANDOFF.md`                     |               required | Level 4 必須                                     |
| `plan.md`                        |               required | 7 不可侵原則 + interlock 仕様 + 親 Phase 構造    |
| `checklist.md`                   |               required | 親 Phase 完了条件                                |
| `inquiry/`                       |                   任意 | 現状持たない（各 phase の棚卸しは checklist 内） |
| `breaking-changes.md`            |               required | v1 → v2 vocabulary 刷新の運用                    |
| `legacy-retirement.md`           |               required | v1 タグ段階撤退の運用                            |
| `sub-project-map.md`             | **required (Level 4)** | 2 sub-project + interlock 仕様                   |
| guard 設計 (plan.md 内)          |               required | 8 昇華メカニズムに含まれる                       |
| 最終レビュー (人間承認) checkbox |               required | requiresHumanApproval=true                       |

## 4. やらないこと (nonGoals)

- v1 のマイナー修正だけで済ませる（本 project は Constitution の刷新）
- 片軸だけの変更（原則 interlock 崩壊を防ぐ）
- review window 外での vocabulary 追加
- 未分類タグを `R:utility` / `T:unknown` 等の曖昧タグに退避（`R:unclassified` /
  `T:unclassified` という明示タグに退避）
- Cognitive Load Ceiling（= 15）を超える語彙追加
- AAG の他 2 柱（Architecture Rule / Principles）を混ぜる

## 5. Escalation / De-escalation 条件

- 7 不可侵原則のうちいずれかを見直す必要が出た場合 → plan.md の Constitution 改訂を
  人間承認プロセスに戻す
- 第 3 子 project が必要になった場合（例: 層軸 L:\*） → sub-project-map に追加 +
  Cognitive Load Ceiling の見直し
- v1 撤退 scope が広がった場合 → review window を延長
- Level 4 → Level 3 は発生しない想定（既に 2 sub-project spawn 済み）

## 6. 履歴

| 日付       | 変更                                | 理由                                                                 |
| ---------- | ----------------------------------- | -------------------------------------------------------------------- |
| 2026-04-21 | 設計対話で v1 課題判明 → bootstrap  | 責務タグ制度の構造的課題（400 件未分類 / 軸混在 / utility 捨て場化） |
| 2026-04-25 | AAG-COA 遡及判定 (Level 4 Umbrella) | projectization-policy 導入後の retroactive 付与                      |
