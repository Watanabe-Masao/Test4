# Task Class Catalog — 6 類型 (= operational-protocol-system M1 + M4)

> **landed**: 2026-05-04 (= operational-protocol-system M1)
> **refined**: 2026-05-04 (= M4 で 4 sub-doc pointer + TC-5 scope 外 articulate)
>
> **役割**: 「いま自分は何の作業をしているか」の分類 catalog。6 Task Class 類型 + 各々の scope / typical complexity / 出口条件 / 標準手順 pointer を articulate。
>
> **位置付け**: [`task-protocol-system.md`](./task-protocol-system.md) §4 で referenced、本 doc が canonical 詳細。

## 1. catalog summary

| ID | class | 性質 | typical complexity | 標準手順 (= M4 で landing) |
|---|---|---|---|---|
| TC-1 | **Planning** | 計画策定 / 設計判断 (= 実装前の articulate) | L2-L3 | [`planning-protocol.md`](./planning-protocol.md) ✅ |
| TC-2 | **Refactor** | 既存 behavior 不変な構造改善 | L1-L3 | [`refactor-protocol.md`](./refactor-protocol.md) ✅ |
| TC-3 | **Bug Fix** | 観測された defect の修正 | L1-L2 | [`bug-fix-protocol.md`](./bug-fix-protocol.md) ✅ |
| TC-4 | **New Capability** | 新機能 / 新 KPI / 新 protocol 追加 | L2-L3 | [`new-capability-protocol.md`](./new-capability-protocol.md) ✅ |
| TC-5 | **Incident Discovery** | 観測された incident の root cause 究明 + 修正 | L1-L3 | (本 doc §6 のみ、独立 sub-doc なし — drawer Pattern 5 意図的 skip + rationale articulate) |
| TC-6 | **Handoff** | session 引き継ぎ / context transfer | L1 | [`session-protocol.md`](./session-protocol.md) §4 ✅ |

## 2. TC-1 Planning

### scope

- 計画策定 (= plan.md / charter / 設計判断 articulate)
- 不可侵原則 / Phase 構造 / 観測点 articulate
- AAG-COA Level 判定 (= projectization-policy.md §4 適用)
- 後続 PR に分割する scope discipline articulate

### 入口条件

- user が「設計したい / 計画を立てたい」と発言
- AI が「実装前に articulate が必要」と判断
- AAG-COA Level 1+ (= Lightweight Project 以上)

### 出口条件

- `plan.md` (or 同等) landing
- 不可侵原則 articulated (= 一般的に 3-7 件)
- Phase 構造 articulated (= 各 Phase に観測点)
- AAG-COA judgment 完了 (= Level 確定 + required artifacts list)

### typical complexity

- **L2 通常**: 単一 project 内の plan
- **L3 重変更**: cross-program plan / structural reorganization plan / breaking change plan

### 主な antipattern

- 計画段階で実装する (= drawer Pattern 2 違反、scope discipline 破棄)
- 不可侵原則を articulate せず Phase に進む (= 後続 session で原則漂流)
- 観測点を articulate しない (= 完了判定 fuzzy)

## 3. TC-2 Refactor

### scope

- 既存 behavior 不変な構造改善 (= 抽出 / 移動 / 重複削除 / interface boundary 整理)
- 同 contract / 同 spec を満たす範囲の rewrite
- AAG-REQ-NO-AI-HUMAN-SUBSTITUTION 整合 (= behavior 変更しない)

### 入口条件

- 既存 behavior に不満なし、構造のみ改善
- 観測値 (= test 通過 / spec match) が refactor 前後で同一

### 出口条件

- 全 test PASS (= behavior preservation 機械検証)
- 構造改善が **観測可能** (= 行数 / 複雑度 / 依存数 等の metric)
- breaking change なし (= optional の場合は明示的 articulate)

### typical complexity

- **L1 軽**: 1 file 内 method 抽出 / rename
- **L2 通常**: 複数 file の移動 / interface boundary 整理
- **L3 重**: directory rename + 1,000+ inbound update / module split

### 主な antipattern

- refactor と同時に behavior を変える (= TC-4 New Capability に escalate すべき)
- test 不在で refactor (= behavior preservation 検証不能)
- 「ついでに」で scope を拡大 (= drawer Pattern 2 違反)

## 4. TC-3 Bug Fix

### scope

- **観測された** defect の修正 (= incident report / test failure / regression が起点)
- 最小 scope の修正 (= drawer Pattern 2 整合)
- root cause articulate + fix evidence

### 入口条件

- defect が **再現可能** (= regression test 化可能)
- root cause が articulated (= 推測のみは不可)

### 出口条件

- regression test 追加 + PASS
- 全 test PASS
- defect 再現が解消 (= 同じ手順で再発しない)

### typical complexity

- **L1 軽**: 1 file 内の typo / off-by-one / null check 漏れ
- **L2 通常**: multi-file fix (= root cause が複数 layer に渡る)

### 主な antipattern

- 観測されない defect を「念のため」fix (= TC-2 Refactor or TC-4 New Capability に escalate すべき)
- regression test なしで fix (= 再発検出不能)
- root cause を articulate せず symptom only fix (= 同 root cause の他 case 漏れ)

## 5. TC-4 New Capability

### scope

- 新機能 / 新 KPI / 新 protocol / 新 doc / 新 guard の追加
- 既存に存在しない behavior の articulate

### 入口条件

- 必要性が articulated (= why 1 文以上)
- 既存 mechanism で達成不可 (= 既存 extend で不足)
- AAG-REQ-NO-PERFECTIONISM 整合 (= speculative pre-build 禁止)

### 出口条件

- 新 capability が観測可能 (= test or contract or guard で機械検証)
- 既存 behavior に regression なし
- 関連 doc update (= AAG framework / references / CLAUDE.md 等の整合)

### typical complexity

- **L2 通常**: 単一 feature 追加 / 1 doc 追加 / 1 guard 追加
- **L3 重**: 新 framework / 新 architecture / 新 protocol family

### 主な antipattern

- 「あるべき」で実装 (= AAG-REQ-NON-PERFORMATIVE 違反、observable functioning 不在)
- 既存で達成可能なのに新規追加 (= AAG-REQ-ANTI-DUPLICATION 違反)
- speculative pre-build (= AAG-REQ-NO-PERFECTIONISM 違反)

## 6. TC-5 Incident Discovery

> **M4 articulation**: TC-5 は **独立 sub-doc を持たない** (= drawer Pattern 5 意図的 skip + rationale)。
>
> **rationale**: TC-5 は task として完結せず、root cause 究明後に **TC-3 Bug Fix / TC-2 Refactor / TC-4 New Capability** へ分岐する task。本 catalog §6 で scope + 入口/出口条件を articulate すれば十分、独立 protocol doc は AAG-REQ-ANTI-DUPLICATION 違反 risk。
>
> **再起動 trigger**: TC-5 専用 sub-doc が必要になる pattern (= 究明 phase 自体が複数 session に渡る + 既存 catalog articulate で reach 不能と判明) が観測されたら、独立 `incident-discovery-protocol.md` を起動判断 (= AAG-COA + AI-COA 適用)。

### scope

- 観測された incident の **root cause 究明**
- 究明後の fix (= TC-3 Bug Fix に分岐 or 同 task 内継続)
- 同種再発防止 articulate (= guard / test / process)

### 入口条件

- incident が観測された (= CI failure / production error / user report)
- 単純な fix (= TC-3 で完結) ではなく root cause 究明が必要

### 出口条件

- root cause articulated (= 5 Why 等で深掘り)
- fix landed (= TC-3 に分岐 or 同 task 内)
- 再発防止 mechanism articulated (= guard / test / process or 「不要」articulate)

### typical complexity

- **L1 軽**: 単発 incident、1 commit fix
- **L2 通常**: multi-layer root cause、複数 commit
- **L3 重**: structural root cause、program-level fix

### 主な antipattern

- root cause 究明前に fix (= symptom only、再発不可避)
- 究明後 fix を skip (= articulate のみ、TC-3 に分岐しない)
- 再発防止 mechanism を articulate しない (= 同種 incident 必発)

## 7. TC-6 Handoff

### scope

- session 引き継ぎ (= context transfer to next session / next person)
- HANDOFF.md update (= 現在地 + 次にやること + ハマりポイント)
- discovery-log entry (= scope 外発見の articulation)

### 入口条件

- session が時間切れ / context 上限に近づく
- 別 person / 別 AI に作業移管が必要

### 出口条件

- `HANDOFF.md` §1 現在地 + §次の作業 update
- discovery-log に scope 外発見追記 (= P1/P2/P3 priority articulate)
- next session が読み始めて即継続可能 (= context recovery cost 最小)

### typical complexity

- **L1 軽**: 1 session 内完結が原則 (= 重い handoff は context overflow risk)

### 主な antipattern

- HANDOFF.md update なしで session 終了 (= next session が context 復元不能)
- discovery-log entry skip (= scope 外発見の lose、再発見 cost)
- 「適当に伝わる」前提で実行 (= drawer Pattern 4 honest articulation 違反)

## 8. class 判定 flow (= 入口判断時)

```
[task 着手]
  │
  ├── 観測された defect の修正？ ───── YES → TC-3 Bug Fix
  │
  ├── 観測された incident の root cause 究明？ ── YES → TC-5 Incident Discovery
  │
  ├── 既存 behavior 不変な構造改善？ ── YES → TC-2 Refactor
  │
  ├── 新機能 / 新 KPI / 新 protocol 追加？ ── YES → TC-4 New Capability
  │
  ├── 計画策定 / 設計判断 (= 実装前 articulate)？ ── YES → TC-1 Planning
  │
  └── session 引き継ぎ？ ── YES → TC-6 Handoff
```

= **複数 class が並行する場合**: 主たる class を articulate + 副次 class を `discovery-log.md` に記録 (= 後続 session で別 task として起動)。

## 9. complexity 判定との関係

各 class の typical complexity は §1 表参照。class 確定後、`complexity-policy.md` で L1/L2/L3 を判定し、必要な既存 5 文書を articulate する:

- **L1 軽修正**: `checklist.md` のみ
- **L2 通常変更**: `plan.md` + `checklist.md`
- **L3 重変更**: `plan.md` + `checklist.md` + `decision-audit.md` まで

詳細は [`complexity-policy.md`](./complexity-policy.md) を参照。

## 10. status

- 2026-05-04: M1 fill (= 本 doc landing、`task-protocol-system.md` + `session-protocol.md` + `complexity-policy.md` と同時)
- M4: 各 Task Class の標準手順 (= `<class>-protocol.md` 5 件) 詳細 fill 予定
