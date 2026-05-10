# discovery-log — aag-structural-control-plane

> **役割**: implementation 中に発見した **scope 外** / **改善必要** / **詳細調査要** 事項の蓄積 artifact (= DA-β-003 で institute)。
> AAG 4 系統 lens (= ログ / メトリクス / 手順書 / チェックリスト) に直交する **5 系統目: 発見蓄積**。
>
> **scope 含む**: 本 project の plan 範囲外で発見した事項 / 改善 candidate / 詳細調査要事項。
> **scope 外 (= 別 doc)**: 本 project plan 範囲内事項 (= `checklist.md` / `plan.md`)、判断履歴 (= `decision-audit.md`)。
>
> **役割分担**:
> - `decision-audit.md` (= 判断履歴): scope 内で行った意思決定の lineage articulation
> - `discovery-log.md` (本 doc、= scope 外発見): scope 外で発見した未処理事項の inventory
>
> 機械検証: `projectizationPolicyGuard` PZ-14 (= file 存在 + schema 軽量 check)。
> entry 内容妥当性は AI session 責任 (= 機械検証 scope 外、AAG philosophy「製本されないものを guard 化しない」と整合)。
>
> 詳細: `references/05-aag-interface/operations/project-checklist-governance.md` §3.3 + DA-β-003。

## priority

| priority | 性質 | 解消 timing |
|---|---|---|
| **P1 (high)** | 本 program 内吸収可能 (= 既存 phase で batch 解消可能) | 該当 phase で batch 解消、または直近 phase 末で吸収 |
| **P2 (med)** | post-archive 別 program candidate (= scope 大 / 不可侵原則 risk) | 本 program archive 後、別 program 起動判断 (= user) |
| **P3 (low)** | 揮発 / 不要判定可 / 後続発見で superseded 可能性 | 棚卸 phase で削除判定、scope 不明なら触らない |

## 発見済 entry

> entry 形式: 以下 template に沿って追記。各 entry は priority + 場所 + 現状 + 改善/調査内容 + trigger + 解消 timing + 影響 で articulate。

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

### 2026-05-07 P2: self-check substrate drift（V6/V7 が internal 実装済だが command 層 + Axis コメントは V1〜V5 のみ）

- **場所**: `aag-engine/cmd/aag/command_selfcheck.go`（V1〜V5 のみ articulate） + `aag-engine/internal/selfcheck/selfcheck.go` L72（`Axis    string \`json:"axis"\`    // V1 / V2 / V3 / V4 / V5` の stale comment）
- **現状**: `internal/selfcheck/selfcheck.go` L7-15 doc / L61-67 Summary struct / L94-100 dispatch / L106-119 axis count では V1〜V7 が実装済。一方、command 層 doc と Axis フィールドコメントは V1〜V5 のままで stale。
- **改善 / 調査内容**: command_selfcheck.go の doc を V1〜V7 へ update + selfcheck.go L72 の Axis コメントを V1〜V7 へ update。本 program では「**最初の Finding として inquiry/04 で記録**」のみ実施し、修正は別 program（reposteward 内で対応するのが自然）。
- **trigger**: 本 program の plan v0.2 妥当性レビュー時、self-check 軸数の正本照合で発見（プラン v0.1 で「7 axes」と記述されていたが、command 層検証時に「5 axes」と判定された後、internal 検証で「7 axes」と判明）
- **解消 timing**: P2 = post-archive 別 program candidate（reposteward `aag-engine-domain-coverage-extension` 候補等で同種の doc/comment sync drift と一括対応）
- **影響**: AAG framework 内部実装の drift（user-facing 影響なし、AI substrate trust に間接影響）

## 別 program candidate (= P2、post-archive)

> 本 project archive 時に user 判断で別 program 起動 candidate として escalate される entry をこの section に集約。

| entry id | 短い articulate | 推定 escalate 先 |
|---|---|---|
| 2026-05-07 P2: self-check substrate drift | command 層 doc + Axis コメントの V6/V7 反映 | reposteward `aag-engine-domain-coverage-extension` 候補 等 |

## status

- 2026-05-07 (project bootstrap): 本 discovery-log landing
- 2026-05-07 P2 entry landing（self-check substrate drift、Phase 0 inquiry/04 で詳細記録予定）
- post-archive: P1 全完遂、P2 は別 program candidate に articulate
