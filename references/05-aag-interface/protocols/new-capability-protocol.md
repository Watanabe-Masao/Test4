# New Capability Protocol — TC-4 (= operational-protocol-system M4 fill)

> **landed**: 2026-05-04 (= operational-protocol-system M4)
>
> **役割**: Task Class **TC-4 New Capability** の standardized 手順。新機能 / 新 KPI / 新 protocol / 新 doc / 新 guard の追加 task の prescriptive flow。
>
> **位置付け**: [`task-class-catalog.md`](./task-class-catalog.md) §5 で referenced、本 doc が canonical 詳細。

## 1. scope (= TC-4 入口判定)

### 1.1 入口条件

- **必要性が articulated** (= why 1 文以上、observable problem articulate)
- **既存 mechanism で達成不可** (= AAG-REQ-ANTI-DUPLICATION 整合、既存 extend で不足)
- AAG-REQ-NO-PERFECTIONISM 整合 (= speculative pre-build 禁止、現観測される必要性のみ)

### 1.2 出口条件

- 新 capability が **観測可能** (= test or contract or guard で機械検証)
- 既存 behavior に regression なし (= 全 test PASS)
- 関連 doc update (= AAG framework / references / CLAUDE.md 等の整合)
- (該当時) AAG-COA 適用判断 (= projectization-policy.md §4 適用、Level 1+ なら project 起動判断)

### 1.3 typical complexity (= `complexity-policy.md` 参照)

| complexity | 該当 |
|---|---|
| L2 | 単一 feature 追加 / 1 doc 追加 / 1 guard 追加 / 単一 KPI 追加 |
| L3 | 新 framework / 新 architecture / 新 protocol family / 新 contract |

## 2. 標準手順 (= 4 step)

```
Step 1. authority/contract/generated 追加要否判断 (= 何を articulate / 何を生成するか確定)
Step 2. 実装 (= articulate 通り実装、observable functioning 確保)
Step 3. compatibility 確認 (= 既存 behavior に regression なし)
Step 4. 関連 doc update (= AAG framework / references / CLAUDE.md / doc-registry / etc. 整合)
```

### 2.1 Step 1 — authority/contract/generated 追加要否判断

新 capability が以下のどれに該当するか articulate:

| 軸 (= Standard 8 軸 from `references/01-foundation/platformization-standard.md`) | 追加要否 articulate |
|---|---|
| **Authority** | 新 authority 必要か (= 不可侵原則 / Tier 0 rule)、通常 NO (= AAG framework 改修 scope) |
| **Derivation** | 新 derived view 必要か (= generated section / merged artifact) |
| **Contract** | 新 schema 必要か (= JSON Schema / Zod / TypeScript interface) |
| **Binding** | 新 binding 必要か (= rule binding / metaRequirementRefs) |
| **Generated** | 新 generated artifact 必要か (= docs:generate 出力) |
| **Facade** | 新 facade 必要か (= 公開 API / consumer-facing entry) |
| **Policy** | 新 policy 必要か (= AAG-COA / project-checklist-governance / 等) |
| **Operating Gate** | 新 gate 必要か (= guard / pre-push / CI gate) |

= 必要軸を articulate (= 通常 1-3 軸)、不要軸は drawer Pattern 5 (意図的 skip + rationale) で articulate。

### 2.2 Step 2 — 実装

**articulate 通り実装**:
- Step 1 で articulate した軸の deliverable を landing
- AAG-REQ-NON-PERFORMATIVE 整合 (= 「あるべき」回避、observable functioning 確保)
- AAG-REQ-NO-PERFECTIONISM 整合 (= speculative pre-build 禁止、必要最小範囲)
- 各 commit で `test:guards` PASS (= 既存 regression なし継続検証)

### 2.3 Step 3 — compatibility 確認

**既存 behavior に regression なし**:
- 全 test PASS (= test:guards / observation tests / coverage / e2e)
- lint / format / build PASS
- breaking change なし (= 該当時は明示 articulate、separate PR 推奨)
- existing consumers の articulation update (= 該当時)

### 2.4 Step 4 — 関連 doc update

新 capability の **integration into AAG framework**:
- `docs/contracts/doc-registry.json` (= 新 doc 追加時)
- `references/README.md` 索引 (= 新 doc 追加時、docRegistryGuard 整合)
- `CLAUDE.md` 該当 section (= 新 mechanism / 新 routing 追加時)
- `references/04-tracking/recent-changes.generated.md` 該当 entry (= 該当時、generated は手編集禁止、自動生成経由)
- (該当時) `aag/_internal/meta.md` AAG-REQ status flip (= AAG framework 改修時のみ)

= AAG-REQ-ANTI-DUPLICATION + AAG-REQ-SEMANTIC-ARTICULATION 整合、新 capability の articulation chain を完成。

## 3. drawer Pattern 1-6 application instance hint

| Pattern | TC-4 での application |
|---|---|
| **Pattern 1** Commit-bound Rollback | L3 New Capability で DA institute (= judgement / rollback-target tag)、各実装 commit を rollback unit |
| **Pattern 2** Scope Discipline | Step 1 軸判断で必要範囲 articulate、Step 2 実装中に逸脱 0 件 |
| **Pattern 3** Clean Rewrite | Step 2 中に articulate と実装の乖離検出時、patch 重ねず Step 1 から再 articulate |
| **Pattern 4** Honest Articulation | Step 1 articulate で「必要 / 不要」を honest 判定、Step 3 compatibility で「regression なし / あり」を honest articulate |
| **Pattern 5** Rationale Skip | Step 1 不要軸を「skip + rationale + trigger」3 要素で articulate |
| **Pattern 6** State-based Verification Harness | Step 2 観測可能 outcome、Step 3 verify input |

## 4. complexity-policy.md (M3) との対応

### 4.1 該当昇格 trigger (= P-番号 / `complexity-policy.md` §4.1)

- **P1 Authority に touch**: Step 1 で Authority 軸が必要と articulate されたら L2 → L3 昇格
- **P3 schema 変更**: Step 1 で Contract 軸が必要と articulate されたら L2 → L3 昇格
- **P4 generated artifact 整合**: Step 1 で Generated / Derivation 軸が必要と articulate されたら L2 → L3 昇格
- **P5 multi-axis 拡張**: Step 1 で 3+ 軸が必要と articulate されたら L2 → L3 昇格
- **P10 breaking change**: Step 3 で API 後方互換性破壊と判明したら L2 → L3 昇格 + user escalate

### 4.2 該当降格 trigger (= D-番号 / `complexity-policy.md` §4.2)

- **D1 既存方針内**: Step 1 で既存 mechanism 内吸収可能と判明したら **task class 切替** (= TC-2 Refactor or TC-3 Bug Fix) escalate
- **D2 Authority/Contract touch なし**: Step 1 で Authority/Contract 軸不要と articulate されたら L3 → L2 降格

### 4.3 typical complexity range

L2-L3 (= `task-class-catalog.md` §1 summary 整合)。L1 New Capability は稀 (= 1 file 内で完遂可能なら通常 TC-2 Refactor 候補)。

## 5. antipattern

- **「あるべき」で実装** (= AAG-REQ-NON-PERFORMATIVE 違反、observable functioning 不在)
- **既存で達成可能なのに新規追加** (= AAG-REQ-ANTI-DUPLICATION 違反、Step 1 の existing mechanism 検討 skip)
- **speculative pre-build** (= AAG-REQ-NO-PERFECTIONISM 違反、現観測されない need の articulate)
- **Step 1 軸判断 skip** (= drawer Pattern 2 違反、scope discipline 不在で実装拡大)
- **Step 4 関連 doc update skip** (= articulation chain 断絶、後続 reader が新 capability に reach 不能)
- **AI 単独で AAG framework 改変** (= AAG-REQ-NO-AI-HUMAN-SUBSTITUTION 違反、AAG framework 改変は別 program scope、本 protocol scope 外)

## 6. 関連

- 上位 catalog: `task-class-catalog.md` §5 TC-4 New Capability
- 上位 index: `task-protocol-system.md`
- 8 軸 articulate: `references/01-foundation/platformization-standard.md`
- AAG-COA: `references/05-aag-interface/operations/projectization-policy.md` (= L1+ なら project 起動判断)
- complexity 軸: `complexity-policy.md`
- AAG drawer: `references/05-aag-interface/drawer/decision-articulation-patterns.md`
