# discovery-log — aag-engine-readiness-refactor

> **役割**: implementation 中に発見した **scope 外** / **改善必要** / **詳細調査要** 事項の蓄積 artifact (= DA-β-003 で institute)。
> AAG 4 系統 lens (= ログ / メトリクス / 手順書 / チェックリスト) に直交する **5 系統目: 発見蓄積**。
>
> **scope 含む**: 本 project の plan 範囲外で発見した事項 / 改善 candidate / 詳細調査要事項。
> **scope 外 (= 別 doc)**: 本 project plan 範囲内事項 (= `checklist.md` / `plan.md`)、判断履歴 (= `decision-audit.md`)。
>
> 機械検証: `projectizationPolicyGuard` PZ-14 (= file 存在 + schema 軽量 check)。
> entry 内容妥当性は AI session 責任 (= 機械検証 scope 外、AAG philosophy「製本されないものを guard 化しない」と整合)。
>
> 詳細: `references/05-aag-interface/operations/project-checklist-governance.md` §3.3 + DA-β-003。

## priority

| priority | 性質 | 解消 timing |
|---|---|---|
| **P1 (high)** | 本 program 内吸収可能 | 該当 phase で batch 解消 |
| **P2 (med)** | post-archive 別 program candidate | archive 後、別 program 起動判断 (= user) |
| **P3 (low)** | 揮発 / 不要判定可 | 棚卸 phase で削除判定 |

## 発見済 entry

> entry 形式: 以下 template に沿って追記。各 entry は priority + 場所 + 現状 + 改善/調査内容 + trigger + 解消 timing + 影響 で articulate。

(現在: bootstrap 直後、未発見。Phase 0 中の発見 2 件は session 内で別 commit で fix 済 = `_template/decision-audit.md` 追加 + `projectization-policy.md` §4 早見表 update、後者の commit 履歴を参照)

### template (= copy して新 entry を articulate)

```markdown
### <YYYY-MM-DD> <P1|P2|P3>: <短い articulate>

- **場所**: <file path / scope / module>
- **現状**: <観測した state>
- **改善 / 調査内容**: <何をすべきか、何を調べるか>
- **trigger**: <発見契機 = どの作業中に発見したか>
- **解消 timing**: <P1 = 該当 phase / P2 = post-archive 別 program / P3 = 棚卸>
- **影響**: <推定 scope = 件数 / file 数 / module 数>
```

## 別 program candidate (= P2、post-archive)

> 本 project archive 時に user 判断で別 program 起動 candidate として escalate される entry をこの section に集約。

(現在: 該当なし)

## status

- 2026-05-04 (Phase 0 bootstrap): 本 discovery-log landing
