# projectization — aag-display-rule-registry

> 役割: AAG-COA 判定結果。
> 規約: `references/03-guides/projectization-policy.md`

## 1. 判定結果

| 項目 | 値 |
|---|---|
| `projectizationLevel` | Level 2 |
| `changeType` | governance-hardening |
| `implementationScope` | `["references/01-principles/aag/display-rule-registry.md", "app-domain/gross-profit/rule-catalog/base-rules.ts", "app/src/test/guards/displayRuleGuard.test.ts", "docs/contracts/doc-registry.json", "references/03-guides/content-and-voice.md"]` |
| `breakingChange` | false |
| `requiresLegacyRetirement` | false |
| `requiresGuard` | true |
| `requiresHumanApproval` | true |

## 2. 判定理由

### なぜ Level 2 か

- 新規 canonical doc 1 件 + DFR-001〜005 (5 rule) + 1 displayRuleGuard
- 推定 commit 数: 5-10 commits
- Project A / B より小 scope、observed drift baseline 化 + ratchet-down 整備で完遂
- bidirectional integrity の concrete instance (forward direction の即時適用) のため governance-hardening

### なぜ governance-hardening か

新 canonical doc + 新 rule registry + 新 guard を導入し、AAG governance を **bidirectional integrity の
最初の concrete instance** で hardening。docs-only ではなく実装変更を伴う。

### なぜ breakingChange = false か

- 新規追加のみ (新 doc + 新 rule entry + 新 guard)
- 既存 doc / rule / guard は touch しない
- backward 互換は維持

### なぜ requiresGuard = true か

本 project の主要 deliverable に **新 displayRuleGuard** が含まれる。これは DFR-NNN registry framework の
Layer 3 機械検証を担う。

### なぜ requiresLegacyRetirement = false か

新規追加のみで legacy 撤退なし。

### なぜ requiresHumanApproval = true か

- DFR rule の意味品質 (semantic articulation) は人間 review 必須
- baseline 設定の妥当性 (observed drift を baseline 化する判断) は人間判断
- AAG bidirectional integrity の最初の concrete instance のため、aag/meta.md §2 status flip も人間承認

## 3. 必要な文書

| 文書 | 必要性 | 理由 |
|---|---:|---|
| `AI_CONTEXT.md` | required | Level 2 必須 |
| `HANDOFF.md` | required | Level 2 必須 |
| `plan.md` | required | Level 2 必須 |
| `checklist.md` | required | Level 2 必須 |
| `inquiry/` | optional | 親 project Phase 3 audit を継承、本 project では新規 inquiry なし |
| `breaking-changes.md` | forbidden | breakingChange = false |
| `legacy-retirement.md` | forbidden | requiresLegacyRetirement = false |
| `sub-project-map.md` | optional | 単独 project (本 project 自身が parent project の sub-project) |
| guard 設計 (plan.md 内) | required | requiresGuard = true (新 displayRuleGuard) |
| 最終レビュー (人間承認) checkbox | required | requiresHumanApproval = true |

## 4. やらないこと (nonGoals)

- **AAG Core doc content refactor** (`aag/` 配下他 doc Create / Split / Rewrite) → **Project A 所掌**
- **AR-rule schema 拡張 / `SemanticTraceBinding` 型 family 実装 / meta-guard 4 件実装** → **Project B 所掌**
- **複雑 legacy archive 案件** → **Project D 所掌**
- **業務ロジック / domain calculation の変更** (display 関連は guards で機械検証のみ、code を直接編集しない)
- **Phase 9 で識別された他 gap 候補のうち anti-bloat 違反のもの** (新規 doc 制作の bloat 抑制、必要なものに限定)
- **observed drift の即時 0 化** (baseline 化 + ratchet-down で漸次対応、親 plan #10)

## 5. Escalation / De-escalation 条件

- **escalate to Level 3**: Phase 1 で識別される rule 数が DFR-001〜005 を大幅に超える場合 (例: 10+ rule)
- **scope 越境発覚**: Project B が未完了の段階で本 project Phase 1 着手要請 → Project B 完了確認 → 不可能なら本 project 着手保留
- **de-escalate to Level 1**: 想定より rule 数が少ない (1-2 rule) と判明した場合

## 6. 履歴

| 日付 | 変更 | 理由 |
|---|---|---|
| 2026-04-30 | 初期判定 (Level 2) | 親 project の Phase 3 hard gate B 確定により Project C として spawn (Phase 9 + Phase 10、推定 commit 5-10 件) |
