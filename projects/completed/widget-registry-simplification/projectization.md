# projectization — widget-registry-simplification（SP-B）

> 役割: AAG-COA 判定結果。作業文脈に応じて、必要な project 化の重さと
> 不要な手続きを明示する。
>
> 規約: `references/03-guides/projectization-policy.md`

## 1. 判定結果

| 項目 | 値 |
|---|---|
| `projectizationLevel` | Level 3 |
| `changeType` | architecture-refactor |
| `implementationScope` | `["app/src/presentation/pages/Dashboard/widgets/", "app/src/application/readModels/customerFact/", "app/src/test/guards/"]` |
| `breakingChange` | false |
| `requiresLegacyRetirement` | true (LEG-009) |
| `requiresGuard` | true (3 新 guard) |
| `requiresHumanApproval` | true |

## 2. 判定理由

- **Level 3**: 4 ADR × 4 step pattern + 新 guard 3 件 + legacy retirement (LEG-009) で sub-project 規模。umbrella `architecture-debt-recovery` の Lane B として確定。
- **changeType=architecture-refactor**: registry 行の構造的改修（IIFE → selector / full ctx → 絞り込み props / 二重 null check → type narrowing）。新機能 / バグ修正ではない。
- **implementationScope**: registry 行の改修は `presentation/pages/Dashboard/widgets/` に閉じる。selector 抽出は `application/readModels/customerFact/` に集約。guard は `app/src/test/guards/`。
- **breakingChange=false**: registry 内部改修。widget の render 関数の signature / 副作用は不変。
- **requiresLegacyRetirement=true**: LEG-009（registry 行の inline pattern 群）の sunsetCondition 達成が完了条件に含まれる。
- **requiresGuard=true**: 4 ADR 全てが新 guard を伴う ratchet-down 運用。
- **requiresHumanApproval=true**: Lane B の archive プロセスで最終レビュー必須。

## 3. 必要な文書

| 文書 | 必要性 | 理由 |
|---|---:|---|
| `AI_CONTEXT.md` | required | sub-project の意味空間入口、umbrella から Read Order で参照される |
| `HANDOFF.md` | required | 現在地・次の作業・ハマりポイントを 1 画面で把握 |
| `plan.md` | required | 4 ADR 実行計画と禁止事項 |
| `checklist.md` | required | completion 判定の入力（required checkbox） |
| `inquiry/` | optional | umbrella inquiry/15-22 で議論済みのため本 sub-project では不要。新たな調査が必要になった場合のみ作成 |
| `breaking-changes.md` | optional | breakingChange=false のため不要。発生時に作成 |
| `legacy-retirement.md` | required | LEG-009 の sunsetCondition 管理 |
| `sub-project-map.md` | optional | 本 sub-project は更に分割しないため不要 |
| guard 設計 (plan.md 内) | required | 3 新 guard の baseline / 検出ロジックを plan に明記 |
| 最終レビュー (人間承認) checkbox | required | 人間承認ゲート（governance §3.1） |

## 4. やらないこと (nonGoals)

- 他 Lane（SP-A / SP-C / SP-D）の item — 本 sub-project は Lane B 専用
- 本 ADR 4 件に載らない registry / widget 改修 — scope 逸脱抑制
- 新規 widget の追加 — 改修 project であり機能追加ではない
- WSS spec の更新（lastVerifiedCommit 等は別 project 対応）
- runtime 動作の変更 — registry 内部改修、消費者 API 不変

## 5. Escalation / De-escalation 条件

以下が発生した場合、`projectizationLevel` を再評価する。

- registry 行の改修で widget の render 関数 signature を変更する必要が出た（breakingChange=true への escalation）
- selector 抽出が `application/readModels/customerFact/` 以外の readModel にも広がった（scope 拡大）
- 新規 invariant / 原則 が必要になった（umbrella inquiry/13/14 への戻し検討）
- 重量級 widget で予想外の依存が発覚し、別 sub-project への分離が必要になった

## 6. 履歴

| 日付 | 変更 | 理由 |
|---|---|---|
| 2026-04-26 | 初期判定 (Level 3) | umbrella `inquiry/18 §SP-B` の定義通り spawn |
