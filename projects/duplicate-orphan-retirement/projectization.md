# projectization — duplicate-orphan-retirement

> 役割: AAG-COA 判定結果。
> 規約: `references/03-guides/projectization-policy.md`

## 1. 判定結果

| 項目 | 値 |
|---|---|
| `projectizationLevel` | Level 3 |
| `changeType` | legacy-retirement |
| `implementationScope` | `["app/src/features/", "app/src/presentation/pages/", "app/src/test/guards/"]` |
| `breakingChange` | true |
| `requiresLegacyRetirement` | true |
| `requiresGuard` | true |
| `requiresHumanApproval` | true |

## 2. 判定理由

umbrella `architecture-debt-recovery` の **Lane C sub-project**。`features/*/ui/widgets.tsx`
byte-identical 複製 / `useCostDetailData` 並存 / Tier D orphan 3 件 / barrel re-export
metadata 未設定群を 4 ADR × 3-4 step で撤退する。

- **Level 3** — 複数 feature / pages / guards にまたがる破壊的変更 + 既存コードの削除を含む
- **changeType=legacy-retirement** — project の中心目的が「既存コードの撤退」
- **breakingChange=true** — BC-5 (Tier D orphan 3 件削除) を含む
- **requiresLegacyRetirement=true** — LEG-010〜LEG-015 の 6 legacy item の撤退
- **requiresGuard=true** — 4 guard 新設（duplicateFileHashGuard / hookCanonicalPathGuard /
  orphanUiComponentGuard / barrelReexportMetadataGuard）
- **requiresHumanApproval=true** — 破壊的削除 + 広範囲 import 切替を含むため archive 前に
  人間承認必須

## 3. 必要な文書

| 文書 | 必要性 | 理由 |
|---|---:|---|
| `AI_CONTEXT.md` | required | Level 3 必須 |
| `HANDOFF.md` | required | Level 3 必須 |
| `plan.md` | required | 4 ADR × 3-4 step の実行計画 |
| `checklist.md` | required | completion 判定入力 |
| `inquiry/` | forbidden | parent umbrella inquiry/ に依存 |
| `breaking-changes.md` | required | BC-5 の運用 |
| `legacy-retirement.md` | required | LEG-010〜LEG-015 の撤退運用 |
| `sub-project-map.md` | forbidden | 本 project 自体が sub-project |
| guard 設計 (plan.md 内) | required | 4 guard の baseline 戦略 |
| 最終レビュー (人間承認) checkbox | required | requiresHumanApproval=true |

## 4. やらないこと (nonGoals)

- 他 Lane（SP-A / SP-B / SP-D）の item
- 本 ADR 4 件に載らない複製 / orphan の撤退
- umbrella の Phase 4 で確定されなかった file の削除
- 新機能の追加

## 5. Escalation / De-escalation 条件

- 新たな複製 / orphan が発見された場合 → `inquiry/17a-*.md` addendum で umbrella 側承認後に scope 拡張
- 削除による consumer 影響が予想より大きいと判明した場合 → Level 維持 + rollback plan 強化

## 6. 履歴

| 日付 | 変更 | 理由 |
|---|---|---|
| 2026-04-23 | spawn（SP-C Wave 1） | umbrella Phase 6 Wave 1 |
| 2026-04-24 | AAG-COA 遡及判定 (Level 3) | projectization-policy 導入後の retroactive 付与 |
