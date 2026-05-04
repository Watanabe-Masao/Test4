# Session Protocol — 開始 / 実行中 / 終了 / 引き継ぎ (= operational-protocol-system M1 fill)

> **landed**: 2026-05-04 (= operational-protocol-system M1)
>
> **役割**: AI session の lifecycle 4 phase (= 開始 / 実行中 / 終了 / 引き継ぎ) で **何を articulate するか** の prescriptive 手順。現 ad-hoc な session 開始 / 終了を制度化、handoff の lose を防ぐ。
>
> **位置付け**: [`task-protocol-system.md`](./task-protocol-system.md) §6 で referenced、本 doc が canonical 詳細。L1/L2/L3 別の濃度差は `complexity-policy.md` 参照。

## 1. Session 開始 (= context 復元 + Task 判定)

### 1.1 context 復元 (= 全 level 共通)

```
1. CLAUDE.md (= repo root) 通読 (= 鉄則 + 知識の3層分類)
2. CURRENT_PROJECT.md 読 (= active project pointer)
3. active project の AI_CONTEXT.md → HANDOFF.md 読 (= why + 現在地)
4. 必要に応じて discovery-log.md 読 (= scope 外発見 + 後続 candidate)
```

= 4 step で AI が「いま何の作業をしているか」「直前の session で何が landed したか」を把握。

### 1.2 Task Class 判定 (= `task-class-catalog.md` §8 flow 適用)

ユーザー発言 + HANDOFF §次の作業 から TC-1 〜 TC-6 を判定:

- 「設計したい」「計画を立てたい」 → TC-1 Planning
- 「リファクタしたい」「整理したい」 → TC-2 Refactor
- 「直したい」「壊れている」 → TC-3 Bug Fix
- 「新機能 / 新 doc 追加」 → TC-4 New Capability
- 「調査したい」「root cause 究明」 → TC-5 Incident Discovery
- 「引き継ぎたい」「終わらせたい」 → TC-6 Handoff

**複数 class 並行時**: 主たる class を articulate + 副次 class を discovery-log に記録。

### 1.3 Complexity 判定 (= `complexity-policy.md` §3 適用)

Task Class 確定後、L1/L2/L3 を判定:

- **L1 軽修正**: `checklist.md` のみで十分 → §3.2 の routing
- **L2 通常変更**: `plan.md` + `checklist.md` 必要 → §3.3 の routing
- **L3 重変更**: `plan.md` + `checklist.md` + `decision-audit.md` まで → §3.4 の routing

= L 確定後、本 protocol §3 実行中に進む。

### 1.4 Session 開始 articulation (= 観測点)

session 開始時に以下を user に短く articulate (= 1-2 文):

- 何の作業をしているか (= Task Class + Complexity Level)
- どの protocol に従うか (= 該当 `<class>-protocol.md` or 本 protocol §3)
- どこまでを 1 session で完遂を目指すか (= scope discipline)

## 2. (skipped — section is §1 + §3 で cover 済)

## 3. Session 実行中 (= drawer Pattern 1-6 適用)

### 3.1 全 level 共通

- **drawer Pattern 1** (Commit-bound Rollback): 重判断は judgement commit + rollback target tag を articulate
- **drawer Pattern 2** (Scope Discipline): 事前 articulate された scope を超えない
- **drawer Pattern 3** (Clean Rewrite): 前提 collapse 時は patch 重ねず clean rewrite
- **drawer Pattern 4** (Honest Articulation): 達成と未達成を honest に articulate (= 「あるべき」で終わらせない)
- **drawer Pattern 5** (Rationale Skip): 意図的 skip は rationale articulate (= (a) 何を skip / (b) なぜ / (c) 再起動 trigger)
- **drawer Pattern 6** (State-based Verification): calendar 観測なし、state-based 検証 (= AAG-REQ-NO-DATE-RITUAL 整合)

### 3.2 L1 軽修正 (= `checklist.md` のみ運用)

```
1. 修正対象を articulate (= 1 文)
2. 修正実施
3. 関連 test PASS 確認
4. checklist.md update (= 当該 checkbox を [x])
5. commit + push
```

= 1 session 内完結が原則。L1 で plan.md は触らない (= over-ritual 回避)。

### 3.3 L2 通常変更 (= `plan.md` + `checklist.md` 運用)

```
1. plan.md を読み (= 不可侵原則 + Phase 構造 + 観測点)
2. 該当 Phase の checklist 確認
3. 着手判断 articulate (= Phase 着手時 1 文 articulate、L2 では DA 不要)
4. 実装 + 検証
5. checklist.md update (= 該当 checkbox を [x])
6. plan.md status update (必要に応じて)
7. commit + push
```

= Phase 1 つにつき 1 session 完遂を目指す (= context overflow 回避)。

### 3.4 L3 重変更 (= 5 文書フル運用)

```
1. plan.md 通読 (= 不可侵原則 + Phase 構造)
2. 該当 Phase の checklist 確認
3. decision-audit.md に DA entry articulate (= 5 軸 + Lineage + 観測点)
4. judgement commit に annotated tag landing
5. rollback-target commit に annotated tag landing
6. 実装 + 検証
7. checklist.md update + decision-audit.md Lineage 実 sha update
8. discovery-log.md に scope 外発見追記 (該当時)
9. commit + push
```

= L3 では DA institute 必須 (= drawer Pattern 1 application)。Phase 完遂で振り返り判定 (= 正しい / 部分的 / 間違い)。

## 4. Session 終了 / 引き継ぎ (= TC-6 Handoff、ad-hoc 解消)

### 4.1 Session 終了 articulation (= 全 level 共通)

session 終了時に以下を articulate:

```
1. 本 session で landed した内容 (= 1-3 文 summary)
2. 次の作業 (= HANDOFF.md §次の作業 update)
3. ハマりポイント / 注意 (= HANDOFF.md §ハマりポイント update、該当時)
4. 未解消の scope 外発見 (= discovery-log.md 追記、該当時)
5. push 完了確認
```

= 次 session の AI が読んで即継続可能な状態を作る。

### 4.2 引き継ぎ specific (= TC-6 Handoff、別 person / 別 AI 移管時)

`HANDOFF.md` §1 現在地 + §次の作業 を以下のレベルで update:

| field | 内容 |
|---|---|
| 現在地 | landed milestone + 残作業 + ratio (例: 84/113 完遂) |
| 次の作業 | 次 session が即着手可能な action item (= command level) |
| ハマりポイント | 既知の罠 + 回避策 (= 暗黙知の articulate) |

引き継ぎ時の **必須 check**:

- [ ] HANDOFF.md §1 現在地 が最新 commit 状態と整合
- [ ] §次の作業 が実行可能な粒度 (= 「考える」ではなく command + 検証点)
- [ ] discovery-log.md に scope 外発見が articulate 済
- [ ] 全 commit が push 済 (= origin と同期)

### 4.3 Session 終了の antipattern

- HANDOFF.md update なしで終了 (= next session が context 復元不能)
- 「次 session に任せる」発言のみで具体 action なし (= ad-hoc handoff)
- discovery-log entry skip (= scope 外発見 lose)
- push 未完了で session 終了 (= 次 session が working tree 同期不能)

## 5. Session 内の Task 切替 (= 同 session 中に class 変更)

### 5.1 切替 trigger

- 入口判断時の class 推定が不正確だった (= 例: TC-3 Bug Fix 着手で TC-2 Refactor が必要と判明)
- user 発言で別 class が articulate された
- 別 program scope の発見 (= scope creep risk)

### 5.2 切替 protocol

```
1. 現 class の作業を pause (= partial commit / WIP commit)
2. discovery-log.md に新 class 発見を articulate (= scope 外として記録)
3. user に切替を articulate (= 「現状の作業を一旦止めて、〜に切り替えますか？」)
4. user 判断後、新 class で session 再開 or 別 session に分離
```

= 不可侵原則 (= scope discipline) 整合、scope creep を防ぐ。

## 6. AAG drawer Pattern との整合

各 phase で適用する drawer Pattern:

| phase | 主に適用する Pattern |
|---|---|
| 開始 | Pattern 4 (= 現状 honest articulate) |
| 実行中 | Pattern 1-6 全 (= 状況に応じて) |
| 終了 | Pattern 4 (= 達成 honest articulate) + Pattern 6 (= state-based verify) |
| 引き継ぎ | Pattern 4 (= ハマりポイント articulate) |

詳細: `references/05-aag-interface/drawer/decision-articulation-patterns.md`。

## 7. 既存 5 文書との routing (= L1/L2/L3 別)

| level | session 開始時に読む | session 中に update する |
|---|---|---|
| L1 | CLAUDE.md / CURRENT_PROJECT.md / AI_CONTEXT.md / HANDOFF.md | checklist.md |
| L2 | L1 + plan.md (= 該当 Phase) | checklist.md / plan.md (status のみ) |
| L3 | L2 + decision-audit.md (= 既 entry の振り返り + 新 DA articulate) | checklist.md / plan.md / decision-audit.md (= DA entry + Lineage) |

= 重さに応じて読書量と更新量を articulate (= over-ritual / under-ritual 両 risk 回避)。

## 8. status

- 2026-05-04: M1 fill (= 本 doc landing、4 doc 同時)
- M2: 既存 5 文書への routing 固定 (= per-level required artifacts 詳細化)
- M3: 動的昇格・降格ルール articulate (= L1 → L2 → L3 trigger / 逆方向 trigger)
- M4: 各 Task Class の標準手順 (= 5 protocol 詳細) fill 予定
