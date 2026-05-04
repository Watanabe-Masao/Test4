# Refactor Protocol — TC-2 (= operational-protocol-system M4 fill)

> **landed**: 2026-05-04 (= operational-protocol-system M4)
>
> **役割**: Task Class **TC-2 Refactor** の standardized 手順。**既存 behavior 不変** な構造改善 (= 抽出 / 移動 / 重複削除 / interface boundary 整理) の prescriptive flow。
>
> **位置付け**: [`task-class-catalog.md`](./task-class-catalog.md) §3 で referenced、本 doc が canonical 詳細。

## 1. scope (= TC-2 入口判定)

### 1.1 入口条件

- 既存 behavior に **不満なし** (= 構造のみ改善)
- **観測値** (= test 通過 / spec match / parity check) が refactor 前後で同一見込み
- AAG-REQ-NO-AI-HUMAN-SUBSTITUTION 整合 (= behavior 変更禁止)

### 1.2 出口条件

- 全 test PASS (= behavior preservation 機械検証)
- 構造改善が **観測可能** (= 行数 / 複雑度 / 依存数 / 責務 boundary 等の metric)
- breaking change なし (= 該当時は明示的 articulate、後続 PR 起動)

### 1.3 typical complexity (= `complexity-policy.md` 参照)

| complexity | 該当 |
|---|---|
| L1 | 1 file 内 method 抽出 / rename / inline / extract variable |
| L2 | 複数 file の移動 / interface boundary 整理 / barrel re-export 整理 |
| L3 | directory rename + 1,000+ inbound update / module split / Cargo workspace 再構成 |

## 2. 標準手順 (= 4 step)

```
Step 1. 挙動不変確認 (= test coverage + 観測対象 metric articulate)
Step 2. 範囲確定 (= refactor scope を articulate、scope 外明示)
Step 3. 実装 (= small atomic commits、各 commit で test PASS)
Step 4. parity / drift / regression 確認 (= 全 test PASS + observation tests)
```

### 2.1 Step 1 — 挙動不変確認

**前提条件 verify**:
- 既存 test coverage が refactor 対象を cover (= test 不在 path は refactor 対象外、Step 2 で scope 外明示)
- 観測対象 metric articulate (= 行数 / 複雑度 / 依存数 / responsibility tag / 等)

= 「test 不在で refactor」(= behavior preservation 検証不能) の antipattern を Step 1 で防ぐ。

### 2.2 Step 2 — 範囲確定

refactor scope を articulate:
- **対象 file list** (= 具体的 path、glob pattern 不可)
- **scope 外** (= 触らない file、touch すると task class 切替に escalate)
- **想定変更性質** (= 抽出 / 移動 / 重複削除 / interface 整理 / 等)

scope 外項目が implementation 中に発見されたら **drawer Pattern 5** (Rationale Skip) で articulate or **task class 切替** (= TC-3/TC-4) escalate。

### 2.3 Step 3 — 実装

**small atomic commits**:
- 1 commit = 1 logical refactor step (= 抽出 1 method / move 1 file / 等)
- 各 commit で `test:guards` PASS (= behavior preservation の継続検証)
- commit message に refactor 性質 articulate (= 「extract method `foo` from `bar.ts`」等)

= drawer Pattern 1 (Commit-bound Rollback) integration、各 commit が rollback unit に成立。

### 2.4 Step 4 — parity / drift / regression 確認

**機械検証**:
- 全 test PASS (= test:guards / observation tests / coverage)
- lint / format / build PASS
- 観測対象 metric が想定通り改善 (= 行数 -N / 複雑度 -N / 依存数 -N / 等)
- breaking change がないことを `architectureRuleGuard` / `oldPathReferenceGuard` 等で機械検証

**並行 verify** (= L2/L3 のみ):
- AAG framework guard 全 PASS (= scope 外 file への regression なし)
- docs:check PASS (= generated section 整合)

## 3. drawer Pattern 1-6 application instance hint

| Pattern | TC-2 での application |
|---|---|
| **Pattern 1** Commit-bound Rollback | Step 3 small atomic commits = 各 commit が rollback unit |
| **Pattern 2** Scope Discipline | Step 2 範囲確定で scope 外 articulate、Step 3 実装中に逸脱 0 件 |
| **Pattern 3** Clean Rewrite | Step 3 中に前提 collapse (= refactor が想定通り進まない) 検出時、patch 重ねず Step 2 から再 articulate |
| **Pattern 4** Honest Articulation | Step 4 metric 観測で「改善 / 不変 / 悪化」を honest に articulate (= 「改善した気がする」回避) |
| **Pattern 5** Rationale Skip | Step 2 scope 外項目を「skip + rationale + trigger」3 要素で articulate |
| **Pattern 6** State-based Verification Harness | Step 1 観測 metric が Step 4 verify input、state-based 比較 |

## 4. complexity-policy.md (M3) との対応

### 4.1 該当昇格 trigger (= P-番号 / `complexity-policy.md` §4.1)

- **P3 schema / contract / merge policy 変更**: refactor が contract 改変を含むと判明したら L2 → L3 昇格 (= 通常 TC-4 New Capability に切替)
- **P7 multi-file change**: 想定 1 file → 5+ file に拡大したら L1 → L2 昇格
- **P8 behavior change 含**: refactor が parity 維持できないと判明したら **task class 切替** (= TC-3/TC-4)、L 昇格と同時
- **P9 1,000+ inbound update**: 想定 path 変更 → repo 全体 inbound update に拡大したら L2 → L3 昇格

### 4.2 該当降格 trigger (= D-番号 / `complexity-policy.md` §4.2)

- **D5 想定 scope 縮小**: Step 2 範囲確定で想定より小と判明したら L2 → L1 降格
- **D6 1 file 完遂**: Step 3 中に 1 file 内で吸収可能と判明したら L2 → L1 降格
- **D7 architecture 影響なし**: Step 4 で structural change なしと判明したら L3 → L2 降格

### 4.3 typical complexity range

L1-L3 (= `task-class-catalog.md` §1 summary 整合)。

## 5. antipattern

- **refactor と同時に behavior を変える** (= TC-3 Bug Fix or TC-4 New Capability に escalate すべき、TC-2 scope 違反)
- **test 不在で refactor** (= behavior preservation 検証不能、Step 1 違反)
- **「ついでに」で scope を拡大** (= drawer Pattern 2 違反、Step 2 範囲確定後の逸脱)
- **大粒 commit で実装** (= rollback 不可、Step 3 small atomic commits 違反)
- **observation metric なし** (= drawer Pattern 6 違反、改善観測不能)
- **breaking change を articulate せず実施** (= Step 4 outline、後続 user impact lose)

## 6. 関連

- 上位 catalog: `task-class-catalog.md` §3 TC-2 Refactor
- 上位 index: `task-protocol-system.md`
- complexity 軸: `complexity-policy.md`
- session 軸: `session-protocol.md`
- AAG drawer: `references/05-aag-interface/drawer/decision-articulation-patterns.md`
