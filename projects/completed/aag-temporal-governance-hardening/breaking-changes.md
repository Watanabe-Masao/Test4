# breaking-changes — aag-temporal-governance-hardening

> 役割: 本 project が実施する破壊的変更の一覧と運用規約。
>
> **正本**: umbrella `projects/architecture-debt-recovery/inquiry/16-breaking-changes.md`
> の **BC-6 / BC-7** が正本。本文書はその local view（この project で実施する 2 件）。

## 対象破壊的変更

| ID | 対象 | 破壊内容 | ADR |
|---|---|---|---|
| **BC-6** | `RuleOperationalState.reviewPolicy` | optional → **required** 昇格。全 rule に reviewPolicy (owner / lastReviewedAt / reviewCadenceDays) が必須 | ADR-D-001 PR3 |
| **BC-7** | `AllowlistEntry` type | `ruleId` / `createdAt` / `reviewPolicy` / `expiresAt` metadata が **required** 昇格 | ADR-D-002 PR3 |

## 運用規約

- **1 PR = 1 BC**（umbrella plan.md §2 #3 + 本 project plan.md §不可侵原則 #2）
- **BC-6 と BC-7 の merge 間を空ける**（本 project plan.md §不可侵原則 #3）
  — 連続 merge で CI 不安定化を避ける
- **guard 先行**（umbrella plan.md §2 #7）
  - BC-6: `reviewPolicyRequiredGuard` を PR1 で baseline=92 で追加
  - BC-7: `allowlistMetadataGuard` を PR1 で baseline=existing で追加
- **bulk 整備後に type 昇格**（PR2 で metadata bulk 追記 → PR3 で type required 化 baseline=0）
- **rollback 境界**: 各 BC の PR3 で rollback（revert）可能。PR4 の lifecycle 監視追加は別 commit

## 想定影響範囲

- **AAG Core**: rule definition / allowlist type のみ
- **本体アプリ**: 影響 **なし**（governance 基盤のみの変更）
- **テスト**: 全 guard test が新しい type shape で動作する必要あり

## rollback plan

- BC-6 PR3 を revert → PR2 の bulk 追記は残るが optional のまま動作
- BC-7 PR3 を revert → 同上

詳細は umbrella `inquiry/16-breaking-changes.md §BC-6` / §BC-7 を参照。
