# projectization — &lt;PROJECT-ID&gt;

> 役割: AAG-COA 判定結果。作業文脈に応じて、必要な project 化の重さと
> 不要な手続きを明示する。
>
> 規約: `references/05-aag-interface/operations/projectization-policy.md`
>
> **テンプレートの使い方:** bootstrap 時にこのファイルをコピー後、
> 下記の `<...>` プレースホルダを実値で置換する。判定は作業開始前に行い、
> 判定結果は `config/project.json` の `projectization` フィールドと一致させる。

## 1. 判定結果

| 項目 | 値 |
|---|---|
| `projectizationLevel` | Level &lt;0 / 1 / 2 / 3 / 4&gt; |
| `changeType` | &lt;bug-fix / new-feature / refactor / architecture-refactor / legacy-retirement / governance-hardening / docs-only&gt; |
| `implementationScope` | &lt;`["domain"]` / `["application", "presentation"]` / ...&gt; |
| `breakingChange` | &lt;true / false&gt; |
| `requiresLegacyRetirement` | &lt;true / false&gt; |
| `requiresGuard` | &lt;true / false&gt; |
| `requiresHumanApproval` | &lt;true / false&gt; |

## 2. 判定理由

&lt;なぜこの Level か。なぜこの changeType か。影響範囲の境界はどこか。&gt;

## 3. 必要な文書

| 文書 | 必要性 | 理由 |
|---|---:|---|
| `AI_CONTEXT.md` | required / optional / forbidden | |
| `HANDOFF.md` | required / optional / forbidden | |
| `plan.md` | required / optional / forbidden | |
| `checklist.md` | required / optional / forbidden | |
| `inquiry/` | required / optional / forbidden | |
| `breaking-changes.md` | required / optional / forbidden | |
| `legacy-retirement.md` | required / optional / forbidden | |
| `sub-project-map.md` | required / optional / forbidden | |
| guard 設計 (plan.md 内) | required / optional / forbidden | |
| 最終レビュー (user 承認) checkbox | required / optional / forbidden | |

## 4. やらないこと (nonGoals)

この project の scope に含めない作業を明示する。
scope 逸脱の抑止と escalation 判定の基準として機能する。

- &lt;nonGoal 1&gt;
- &lt;nonGoal 2&gt;
- &lt;nonGoal 3&gt;

## 5. Escalation / De-escalation 条件

以下が発生した場合、`projectizationLevel` を再評価する。

- 破壊的変更が発覚した
- legacy 撤退が必要になった
- 新規 guard / invariant が必要になった
- 複数 project に分割する必要が出た
- 当初 nonGoals に含めた作業が必要になった
- 想定より影響範囲が小さく、下位 Level で収まると判明した

## 6. 履歴

| 日付 | 変更 | 理由 |
|---|---|---|
| YYYY-MM-DD | 初期判定 (Level X) | |
