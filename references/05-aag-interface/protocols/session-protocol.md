# Session Protocol — 開始 / 実行中 / 終了 / 引き継ぎ (= operational-protocol-system M1 + M2)

> **landed**: 2026-05-04 (= operational-protocol-system M1)
> **refined**: 2026-05-04 (= M2 で L1/L2/L3 別 read order + Session 終了 protocol + 引き継ぎ protocol 双方向 を articulate)
>
> **役割**: AI session の lifecycle 4 phase (= 開始 / 実行中 / 終了 / 引き継ぎ) で **何を articulate するか** の prescriptive 手順。現 ad-hoc な session 開始 / 終了を制度化、handoff の lose を防ぐ。
>
> **位置付け**: [`task-protocol-system.md`](./task-protocol-system.md) §6 で referenced、本 doc が canonical 詳細。L1/L2/L3 別の濃度差は `complexity-policy.md` 参照。

## 1. Session 開始 (= context 復元 + Task 判定)

### 1.1 context 復元 — L 別 read order (= M2 で固定)

| level | read order | rationale |
|---|---|---|
| **L1** 軽修正 | `HANDOFF.md` → 対象 `AI_CONTEXT.md` の scope 部分のみ → 対象 `checklist.md` | 軽修正は scope が小、context 全読は over-cost |
| **L2** 通常変更 | `AI_CONTEXT.md` → `HANDOFF.md` → 対象 Phase の `plan.md` → `checklist.md` | Phase 単位の理解が必要、plan.md で不可侵原則 + Phase 構造を把握 |
| **L3** 重変更 | `AI_CONTEXT.md` → `HANDOFF.md` → `plan.md` → `decision-audit.md` (= 既 entry の振り返り) → `checklist.md` | 重判断は過去 DA の lineage + 振り返りを継承、再発見 cost を回避 |

**全 level 共通 prefix** (= 上記 L 別 read order の手前に必ず実施):

```
0a. CLAUDE.md (= repo root) 通読 (= 鉄則 + 知識の3層分類、初回 session のみ完全通読、継続 session は鉄則 5 件 + 関連 section のみ)
0b. CURRENT_PROJECT.md 読 (= active project pointer)
```

= L 別 read order は CLAUDE.md + CURRENT_PROJECT.md で active project が確定した **後** に適用。

> **M1 → M2 refine note**: 旧 §1.1 (= M1 landing 時の 4 step) は L 識別なしの全 level 共通手順だった。M2 で L 別に refine = L1 で AI_CONTEXT を全読しない / L3 で decision-audit を必ず読む等、level 別の読書 cost を articulate。discovery-log.md は **必要時** 読 (= L 不問、scope 外発見の continuity が必要な session でのみ)。

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

### 4.1 Session 終了 protocol — L 別 required artifacts (= M2 で固定)

session 終了時に **必ず update する artifact** が level 別に異なる。各 level で **1 つでも skip すると ad-hoc handoff の温床** になる。

| level | 必須 update artifact | optional | rationale |
|---|---|---|---|
| **L1** 軽修正 | `checklist.md` (= 当該 checkbox [x]) + push 完了確認 | `HANDOFF.md` §現在地 (= 次 session が同 project を継続する場合のみ) | 軽修正は 1 commit / 1 session 完結が原則、HANDOFF update は continuity 不要なら skip |
| **L2** 通常変更 | `checklist.md` + `HANDOFF.md` §現在地 + §次の作業 + push 完了確認 | `HANDOFF.md` §ハマりポイント / `discovery-log.md` (= scope 外発見時) | Phase 単位の継続が必要、次 session が即着手可能な action articulate |
| **L3** 重変更 | `checklist.md` + `HANDOFF.md` §現在地 + §次の作業 + §ハマりポイント + `decision-audit.md` (= DA Lineage 実 sha update + sub-events) + push 完了確認 | `discovery-log.md` (= scope 外発見時) | DA institute が必須、Lineage 継承で次 session が判断履歴を再発見せず継続可能 |

### 4.2 全 level 共通 — Session 終了 articulation (= user 向け 1-3 文 summary)

L1/L2/L3 すべてで session 終了時に user に articulate (= 1-3 文):

```
1. 本 session で landed した内容 (= deliverable summary)
2. 次の作業 (= HANDOFF.md §次の作業 への pointer or 完遂 articulate)
3. push 完了確認 + branch 状態 (= ahead/behind/clean)
```

= 次 session の AI が読んで即継続可能な状態を作る。

### 4.3 引き継ぎ protocol — 双方向 articulate (= TC-6 Handoff、別 person / 別 AI 移管時)

#### 4.3.1 引き継ぐ側 (= 現 session が次 session に渡す)

`HANDOFF.md` §1 現在地 + §次の作業 + §ハマりポイント を以下のレベルで update:

| field | 内容 |
|---|---|
| **現在地** | landed milestone + 残作業 + ratio (例: 84/113 完遂)、最新 commit SHA を articulate |
| **次の作業** | 次 session が即着手可能な action item (= command level、「考える」ではなく具体 command + 検証点) |
| **ハマりポイント** | 既知の罠 + 回避策 (= 暗黙知の articulate、L3 必須 / L2 推奨) |

引き継ぐ側の **必須 check**:

- [ ] HANDOFF.md §1 現在地 が最新 commit 状態と整合 (= SHA + branch 状態)
- [ ] §次の作業 が実行可能な粒度 (= command + 検証点 articulate)
- [ ] discovery-log.md に scope 外発見が articulate 済 (= 該当時、該当しないなら "なし" articulate)
- [ ] 全 commit が push 済 (= origin と同期、`git status` clean)
- [ ] L3 のみ: decision-audit.md DA Lineage 実 sha update 済 (= judgement / preJudgement / implementation commits)

#### 4.3.2 引き継がれる側 (= 次 session が現状を読み取る)

引き継がれる側の **読書順序** (= L 別 read order §1.1 を適用、加えて handoff 特有 check):

| level | handoff 特有 read item | 確認事項 |
|---|---|---|
| **L1** | HANDOFF §次の作業のみ | 1 task 単位の action item を確認、scope 外なら user に escalate |
| **L2** | HANDOFF §現在地 + §次の作業 + Phase plan の該当 section | Phase 進捗 + 次 Phase 着手条件を確認 |
| **L3** | HANDOFF §現在地 + §次の作業 + §ハマりポイント + decision-audit DA Lineage + 振り返り判定 | 過去 DA の判断モデル + 振り返り (正しい/部分的/間違い) を継承、軌道修正記録があれば必読 |

引き継がれる側の **必須 check**:

- [ ] CLAUDE.md 鉄則 5 件を再確認 (= 継続 session でも違反しない確認)
- [ ] HANDOFF §現在地 の commit SHA が `git log` HEAD と一致 (= 物理状態の整合)
- [ ] L 判定 (= `complexity-policy.md` §3 適用) で current task の重さを再判定
- [ ] L3 のみ: decision-audit DA で active な判断 (= status: active) を全件 review

### 4.4 Session 終了の antipattern

- L 不問 antipattern:
  - HANDOFF.md update なしで終了 (= L2/L3 で next session が context 復元不能)
  - 「次 session に任せる」発言のみで具体 action なし (= ad-hoc handoff)
  - discovery-log entry skip (= scope 外発見 lose)
  - push 未完了で session 終了 (= 次 session が working tree 同期不能)
- L 別 antipattern:
  - L1 で HANDOFF.md を毎回 update (= over-ritual、軽修正で continuity 不要なら skip 可)
  - L2 で plan.md status update を skip (= Phase 進捗が漂流)
  - L3 で DA Lineage 実 sha update を skip (= 後続 session が rollback 経路を再発見できない)

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
