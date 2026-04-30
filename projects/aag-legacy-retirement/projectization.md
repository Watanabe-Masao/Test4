# projectization — aag-legacy-retirement

> 役割: AAG-COA 判定結果。
> 規約: `references/03-guides/projectization-policy.md`

## 1. 判定結果

| 項目 | 値 |
|---|---|
| `projectizationLevel` | Level 2 |
| `changeType` | legacy-retirement |
| `implementationScope` | `["references/01-principles/adaptive-architecture-governance.md", "references/99-archive/", "docs/contracts/doc-registry.json", "references/02-status/legacy-retirement-extended.md"]` |
| `breakingChange` | true |
| `requiresLegacyRetirement` | true |
| `requiresGuard` | false |
| `requiresHumanApproval` | true |

## 2. 判定理由

### なぜ Level 2 か

- Project A Phase 5 で完遂しない複雑案件 (= 限定的 scope、Project A overflow ではなく明確に別責務)
- 推定 commit 数: 5-10 commits (Project A Phase 5 の延長線、ただし複雑性のため独立 project 化)
- 必要性自体が Project A Phase 5 進捗依存 (case B = 不要なら本 project archive)

### なぜ legacy-retirement か

旧 doc archive + Split + 部分 Archive + 物理削除 = 典型的 legacy-retirement。

### なぜ breakingChange = true か

- 旧 path archive = inbound 全件 update (breakingChange = true、Project A breaking-changes と同質)
- ただし scope は Project A Phase 5 で完遂しなかった範囲のみに限定

### なぜ requiresGuard = false か

新 guard は導入しない。docRegistryGuard / docCodeConsistencyGuard 等の既存 guard が inbound 0 + mapping
landing を機械検証する (Project A と同じ)。

### なぜ requiresLegacyRetirement = true か

本 project 自体が legacy-retirement の拡張案件のため、自明に true。

### なぜ requiresHumanApproval = true か

- 物理削除は人間判断 gate (anti-ritual と orthogonal な安全装置)
- archive 前 mapping 義務の妥当性確認も人間 review
- 必要性 re-evaluate (case A / case B 判定) も人間 review

## 3. 必要な文書

| 文書 | 必要性 | 理由 |
|---|---:|---|
| `AI_CONTEXT.md` | required | Level 2 必須 |
| `HANDOFF.md` | required | Level 2 必須 |
| `plan.md` | required | Level 2 必須 |
| `checklist.md` | required | Level 2 必須 |
| `inquiry/` | optional | Project A の legacy-retirement.md を継承、本 project では新規 inquiry なし |
| `breaking-changes.md` | required | breakingChange = true (ただし Project A breaking-changes を多くは inherit) |
| `legacy-retirement.md` | required | requiresLegacyRetirement = true (拡張案件の articulate) |
| `sub-project-map.md` | optional | 単独 project (本 project 自身が parent project の sub-project) |
| guard 設計 (plan.md 内) | forbidden | requiresGuard = false |
| 最終レビュー (人間承認) checkbox | required | requiresHumanApproval = true |

## 4. やらないこと (nonGoals)

- **AAG Core doc content refactor / 新 doc Create** → **Project A 所掌**
- **AR-rule schema 拡張 / meta-guard 実装** → **Project B 所掌**
- **DFR registry 構築** → **Project C 所掌**
- **業務ロジック / domain calculation の変更**
- **Project A の Phase 5 で完遂可能な単純 archive 案件** → 本 project に持ち込まない (Project A で完遂)
- **期間 buffer (30 日待機等) を archive trigger として導入** → anti-ritual、絶対禁止
- **AI 単独での物理削除実行** → 人間 approval gate 必須

## 5. Escalation / De-escalation 条件

- **escalate to Level 3**: Phase 1 で識別された拡張案件が想定以上に多い / inbound 100+ 件等の大規模化
- **de-escalate to Level 1 or close**: Phase 1 で「拡張案件なし (case B)」と判明した場合 → 本 project archive 候補に migrate
- **scope 越境発覚**: 本 project に Project A の単純案件が紛れ込んだ場合 → Project A に return

## 6. 履歴

| 日付 | 変更 | 理由 |
|---|---|---|
| 2026-04-30 | 初期判定 (Level 2) | 親 project の Phase 3 hard gate B 確定により Project D として spawn (Project A Phase 5 拡張、推定 commit 5-10 件、必要性は Project A 進捗依存) |
