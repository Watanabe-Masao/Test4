# Bug Fix Protocol — TC-3 (= operational-protocol-system M4 fill)

> **landed**: 2026-05-04 (= operational-protocol-system M4)
>
> **役割**: Task Class **TC-3 Bug Fix** の standardized 手順。**観測された defect** の修正 (= incident report / test failure / regression が起点) の prescriptive flow。
>
> **位置付け**: [`task-class-catalog.md`](./task-class-catalog.md) §4 で referenced、本 doc が canonical 詳細。

## 1. scope (= TC-3 入口判定)

### 1.1 入口条件

- defect が **再現可能** (= regression test 化可能)
- root cause が **articulated** (= 推測のみは不可、推測段階は TC-5 Incident Discovery)
- 最小 scope の修正 (= drawer Pattern 2 整合、scope 拡大は TC-2/TC-4 escalate)

### 1.2 出口条件

- regression test 追加 + PASS (= 同一手順での再発検出可能)
- 全 test PASS (= 既存 test に regression なし)
- defect 再現が解消 (= 元の trigger 手順で再発しない)
- (該当時) 同種 defect の他 case を articulate (= scope 外 follow-up として discovery-log entry)

### 1.3 typical complexity (= `complexity-policy.md` 参照)

| complexity | 該当 |
|---|---|
| L1 | 1 file 内の typo / off-by-one / null check 漏れ / type assertion fix |
| L2 | multi-file fix (= root cause が複数 layer に渡る) / API contract 内吸収 |
| L3 | structural fix (= 通常 TC-3 で扱わない、TC-5 Incident Discovery → TC-2/TC-4 escalate path) |

## 2. 標準手順 (= 5 step)

```
Step 1. 再現 (= regression test 化、defect が test failure として観測可能)
Step 2. 原因調査 (= root cause articulate、推測のみ禁止)
Step 3. 最小修正 (= root cause を最小 scope で fix、副作用なし)
Step 4. regression 確認 (= 全 test PASS + 元の trigger 手順で再発なし)
Step 5. 再発防止 guard 検討 (= 同種 defect が機械検出可能か articulate、追加判断は user escalate)
```

### 2.1 Step 1 — 再現

defect を **regression test として articulate**:
- test failure として観測可能 (= 期待値 vs 実値 articulate)
- 1 commit で test 追加 (= fix 前の commit、PASS は fix 後)
- test name に defect 性質 articulate (= 「returns null when input is empty」等)

= drawer Pattern 6 (State-based Verification Harness) integration、defect の存在を state で articulate。

### 2.2 Step 2 — 原因調査

**5 Why 等で深掘り**、root cause articulate:
- symptom (= observed) → cause 1 → cause 2 → ... → root cause
- 推測の articulate は drawer Pattern 4 (Honest Articulation) で「推測 / 確認」を分離
- root cause 不明の場合は **TC-5 Incident Discovery に切替** escalate (= TC-3 入口条件不成立)

### 2.3 Step 3 — 最小修正

**root cause を最小 scope で fix**:
- 修正対象 = root cause を articulate した path のみ (= scope 拡大は TC-2/TC-4 escalate)
- 副作用なし (= 既存 test PASS 維持、新 test 1 件 (Step 1) のみ追加)
- commit message に root cause + fix articulate (= 「fix: returns null on empty input — root cause: ...」)

= drawer Pattern 2 (Scope Discipline) 整合、symptom-only fix (= root cause 触らず symptom suppress) 回避。

### 2.4 Step 4 — regression 確認

**機械検証**:
- 全 test PASS (= 既存 + 新 regression test)
- 元の trigger 手順で defect 再現なし (= manual or scenario test)
- lint / format / build PASS
- (該当時) observation tests PASS (= WASM / DuckDB / etc.)

### 2.5 Step 5 — 再発防止 guard 検討

**同種 defect が機械検出可能か articulate**:
- 既存 guard で防げる場合: guard baseline ratchet-down (= articulate のみ、追加 guard 不要)
- 既存 guard で防げない場合: 追加 guard 候補 articulate (= AAG-COA 適用判断、user escalate)
- 機械化困難な場合: drawer Pattern 5 (意図的 skip + rationale) で articulate

= 「気をつける」(= exhortation) で終わらせず mechanism 化判断を articulate (= G8 整合)。**追加 guard 起票判断 = user 領域**。

## 3. drawer Pattern 1-6 application instance hint

| Pattern | TC-3 での application |
|---|---|
| **Pattern 1** Commit-bound Rollback | Step 3 fix commit が rollback unit、Step 1 test commit と分離 |
| **Pattern 2** Scope Discipline | Step 3 最小修正で root cause path のみ touch |
| **Pattern 3** Clean Rewrite | Step 2 root cause 調査で前提 collapse 検出時、patch 重ねず Step 1 から再 articulate |
| **Pattern 4** Honest Articulation | Step 2 「推測 / 確認」分離 articulate、Step 5 再発防止 guard 検討で「機械化可 / 困難」honest articulate |
| **Pattern 5** Rationale Skip | Step 5 機械化困難な再発防止を articulate (= rationale 必須) |
| **Pattern 6** State-based Verification Harness | Step 1 regression test = state articulation、Step 4 verify input |

## 4. complexity-policy.md (M3) との対応

### 4.1 該当昇格 trigger (= P-番号 / `complexity-policy.md` §4.1)

- **P3 schema / contract 変更**: fix が API 互換性を破壊すると判明したら **task class 切替** (= TC-4 New Capability)、L2 → L3 昇格と同時
- **P5 multi-axis 拡張**: 想定 1 module fix → 複数 module 影響と判明したら L1 → L2 昇格
- **P7 multi-file change**: root cause が複数 layer (= UI / domain / infra) に渡ると判明したら L1 → L2 昇格
- **P10 breaking change**: fix が後方互換性を破壊すると判明したら L2 → L3 昇格 + user escalate

### 4.2 該当降格 trigger (= D-番号 / `complexity-policy.md` §4.2)

- **D6 1 file 完遂**: Step 3 で 1 file 内で吸収可能と判明したら L2 → L1 降格
- **D7 architecture 影響なし**: Step 4 で structural impact なしと判明したら L2 → L1 降格

### 4.3 typical complexity range

L1-L2 (= `task-class-catalog.md` §1 summary 整合)。L3 bug fix は稀 (= structural defect は TC-5 Incident Discovery → TC-2 Refactor or TC-4 New Capability に escalate path)。

## 5. antipattern

- **観測されない defect を「念のため」fix** (= TC-2 Refactor or TC-4 New Capability に escalate すべき、TC-3 入口条件不成立)
- **regression test なしで fix** (= 再発検出不能、Step 1 違反)
- **root cause を articulate せず symptom only fix** (= 同 root cause の他 case 漏れ、Step 2 違反)
- **scope 拡大した fix** (= drawer Pattern 2 違反、Step 3 最小修正違反、TC-2/TC-4 escalate すべき)
- **5 Why の途中で停止** (= root cause 未到達、推測のみ articulate)
- **再発防止 guard 検討 skip** (= 「気をつける」で終わる、Step 5 違反、G8 整合違反)

## 6. 関連

- 上位 catalog: `task-class-catalog.md` §4 TC-3 Bug Fix
- 上位 index: `task-protocol-system.md`
- 起点 incident: `incident-discovery` は TC-5、本 protocol の入口で root cause が articulate されている前提
- complexity 軸: `complexity-policy.md`
- session 軸: `session-protocol.md`
- AAG drawer: `references/05-aag-interface/drawer/decision-articulation-patterns.md`
