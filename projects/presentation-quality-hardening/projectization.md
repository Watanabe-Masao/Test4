# projectization — presentation-quality-hardening

> 役割: AAG-COA 判定結果。
> 規約: `references/05-aag-interface/operations/projectization-policy.md`

## 1. 判定結果

| 項目                       | 値                                                                                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `projectizationLevel`      | Level 2                                                                                                                                                |
| `changeType`               | refactor                                                                                                                                               |
| `implementationScope`      | `["app/src/presentation/pages/Weather/", "app/src/presentation/charts/", "app/src/features/category/ui/widgets/", "app/e2e/", "app/vitest.config.ts"]` |
| `breakingChange`           | false                                                                                                                                                  |
| `requiresLegacyRetirement` | false                                                                                                                                                  |
| `requiresGuard`            | false                                                                                                                                                  |
| `requiresHumanApproval`    | true                                                                                                                                                   |

## 2. 判定理由

Presentation 層のテストカバレッジ強化・500 行超コンポーネント解消・active-debt
削減を 3 Phase で実施する。

- **Level 2** — 複数 feature / layer にまたがるが architecture level の破壊はない。
  新規 feature でもなく、既存構造の品質向上（`.vm.ts` 抽出、hook 抽出、test 追加、
  coverage 閾値引き上げ）
- **changeType=refactor** — 振る舞い不変の構造改善（描画ロジック / VM 分離、hook 抽出）
- **breakingChange=false** — 公開契約・型・API を破壊しない（内部実装の refactor のみ）
- **requiresLegacyRetirement=false** — 既存コードの撤退はなく、抽出・分割のみ
- **requiresGuard=false** — 既存 coverage 閾値の引き上げ以外に新規 guard を追加しない
- **requiresHumanApproval=true** — archive 前の品質レビュー必須（機能 Phase 完了後）

## 3. 必要な文書

| 文書                             |    必要性 | 理由                           |
| -------------------------------- | --------: | ------------------------------ |
| `AI_CONTEXT.md`                  |  required | Level 2 必須                   |
| `HANDOFF.md`                     |  required | Level 2 必須                   |
| `plan.md`                        |  required | 3 Phase 構造 + 不可侵原則      |
| `checklist.md`                   |  required | completion 判定入力            |
| `inquiry/`                       | forbidden | scope が明確で事実棚卸し不要   |
| `breaking-changes.md`            | forbidden | breakingChange=false           |
| `legacy-retirement.md`           | forbidden | requiresLegacyRetirement=false |
| `sub-project-map.md`             | forbidden | 単独 project                   |
| guard 設計 (plan.md 内)          | forbidden | requiresGuard=false            |
| 最終レビュー (人間承認) checkbox |  required | requiresHumanApproval=true     |

## 4. やらないこと (nonGoals)

- coverage 閾値だけ上げて test 追加を後回しにする（CI 破壊）
- `.vm.ts` 抽出のために描画と State の境界をまたぐ
- 既に default 以下の component（IntegratedSalesChart / StorageManagementTab）の再リファクタリング
- ロールシステム軽量化（R-9）— architecture-decision-backlog の所掌
- public API / 型の変更
- 新機能追加

## 5. Escalation / De-escalation 条件

- `.vm.ts` 抽出時に型 API 変更が必要になった → breakingChange=true に escalate → Level 3
- hook 抽出時に新 context / architecture 導入が必要になった → Level 3 に escalate
- scope が小さく 1 Phase で済むと判明 → de-escalate を検討するが、3 Phase 宣言済みのため維持

## 6. 履歴

| 日付        | 変更                       | 理由                                            |
| ----------- | -------------------------- | ----------------------------------------------- |
| （initial） | project bootstrap          | active-debt 集約目的                            |
| 2026-04-25  | AAG-COA 遡及判定 (Level 2) | projectization-policy 導入後の retroactive 付与 |
