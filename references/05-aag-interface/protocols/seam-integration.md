# Seam Integration — AAG drawer `_seam` × Task Protocol System (= operational-protocol-system M5 fill)

> **landed**: 2026-05-04 (= operational-protocol-system M5)
>
> **役割**: AAG drawer の `_seam` metadata (= taskHint / consumerKind / sourceRefs) を Task Class / Session Protocol / Complexity Policy lens で **再 articulate**、reader が Task Class から AAG drawer に reach する経路 articulate。
>
> **位置付け**: [`task-protocol-system.md`](./task-protocol-system.md) §7 で referenced、本 doc が canonical 詳細。
>
> **不可侵原則**: AAG drawer (= `docs/generated/aag/rule-index.json` + `tools/architecture-health/src/`) 自身の articulate / 実装は **改変しない** (= 不可侵原則 1)。本 doc は「使う側」の routing articulate のみ。

## 1. AAG drawer `_seam` の現状 articulate (= 既存値、本 M5 では改変しない)

### 1.1 taskHint (= 8 値)

各 rule が「どの **Task の判定** に該当するか」を articulate する hint:

| taskHint | 性質 | 例 |
|---|---|---|
| **regex** | 文字列 pattern match で判定 | path / token / structure 検出 |
| **import** | import statement の関係で判定 | layer boundary / direct import 禁止 |
| **count** | 数値上限 / 下限で判定 | file 行数 / 複雑度 / metadata 件数 |
| **must-include** | 特定要素を含むことを要求 | 必須 metadata / canonical doc reference |
| **must-not-coexist** | 特定要素の共存禁止 | 同種 API / 重複 articulate 禁止 |
| **must-only** | 特定 path のみ articulate 許可 | canonical 配置 / 唯一実装 |
| **co-change** | path A と path B の同時変更 articulate | doc-registry + README sync / spec + impl sync |
| **custom** | 上記に該当しない、rule 固有の判定 | 複合 logic / state-based verification |

### 1.2 consumerKind (= 4 値)

各 rule の violation を「**どの role が消費するか**」を articulate:

| consumerKind | 性質 | 該当 role |
|---|---|---|
| **policy-enforcer** | 全 file 横断の policy 違反検出 | architecture / review-gate |
| **authority-auditor** | Authority (= 不可侵境界) 違反検出 | architecture / pm-business |
| **derivation-assembler** | Derivation (= generated artifact) drift 検出 | documentation-steward |
| **binding-auditor** | Binding (= rule binding / metaRequirementRefs) 整合検出 | architecture |

### 1.3 sourceRefs (= array of paths)

各 rule の **正本 doc への back-reference** (= rule の articulation source、削除すると orphan)。

例: `references/01-foundation/design-principles.md` / `aag/_internal/meta.md` / `references/03-implementation/safety-first-architecture-plan.md`

## 2. Task Class × drawer 軸 routing matrix

各 Task Class が **AAG drawer のどの軸を優先 read するか** を articulate (= reader navigation の prescriptive routing):

| Task Class | 主 read | 副 read | rationale |
|---|---|---|---|
| **TC-1 Planning** | `consumerKind: authority-auditor` の rules | `sourceRefs` 経由で foundation doc | 計画段階で Authority (= 不可侵境界) を確認、foundation 原則に整合する scope articulate |
| **TC-2 Refactor** | `taskHint: import` + `taskHint: must-only` の rules | `taskHint: count` の metric rule | layer boundary / canonical path を refactor 先で維持、metric 改善観測 |
| **TC-3 Bug Fix** | `consumerKind: policy-enforcer` (= 全 file 横断 violation) | `taskHint: regex` / `taskHint: must-include` の rules | defect の root cause が rule violation か検証、policy 違反由来なら fix path articulate |
| **TC-4 New Capability** | `consumerKind: authority-auditor` + `consumerKind: derivation-assembler` | `sourceRefs` 経由で Standard 8 軸 doc | 新 capability が Authority 違反を起こさず、Derivation 経路で機械化可能か検証 |
| **TC-5 Incident Discovery** | `consumerKind: policy-enforcer` (= violation 観点) + `taskHint: co-change` (= drift 観点) | 全 drawer (= 候補 root cause を articulate) | incident の root cause 候補を drawer 横断で articulate |
| **TC-6 Handoff** | (drawer 直接 read 不要) | session-protocol §4 で代替 (= HANDOFF.md 経由で context articulate) | Handoff は context transfer task、drawer reach は次 session の責務 |

= **5 Task Class × drawer 軸 routing matrix articulate** (= M5 観測点 2 達成)。

## 3. Task Class × consumerKind crossover (= reader 別深掘り)

各 consumerKind が **どの Task Class から reach されるか** の reverse-index (= drawer 開発側の reader 想定):

| consumerKind | 主 reader Task Class | 二次 reader |
|---|---|---|
| **policy-enforcer** | TC-3 Bug Fix / TC-5 Incident Discovery | TC-2 Refactor (= regression 観点) |
| **authority-auditor** | TC-1 Planning / TC-4 New Capability | TC-2 Refactor (= scope 拡大時) |
| **derivation-assembler** | TC-4 New Capability | documentation-steward (= 全 doc generated drift 監視) |
| **binding-auditor** | TC-4 New Capability (= 新 rule binding 必要時) | architecture role |

= **drawer 設計者が「想定 reader」を確認可能** (= drawer-generator.ts 改変判断の input、ただし drawer 改変は本 protocol scope 外)。

## 4. guard 化判断 (= drawer Pattern 4 honest articulation)

本 protocol が articulate する Task / Session / Complexity を **session protocol violation 検出 guard** として機械化するか?

### 4.1 候補 guard

- **GP-1** Session 開始時に L 別 read order が trace 可能 (= log articulate)
- **GP-2** Session 終了時に L 別 required artifacts が update されたか (= git diff vs `complexity-policy.md` §5 mapping)
- **GP-3** L3 task で DA Lineage 実 sha update 漏れ検出
- **GP-4** Task Class 不在 commit 検出 (= commit message に TC-N articulate なし)

### 4.2 各 guard の value > cost 評価

| guard | value | cost | 結論 |
|---|---|---|---|
| GP-1 | session 開始 ad-hoc 解消 | log 機械化 = AI session monitor 必要、infrastructure コスト大 | **No** (= 現状 protocol articulate で十分、機械化は post-Pilot) |
| GP-2 | session 終了 ad-hoc 解消 | git diff vs L mapping = 各 task の L 判定が articulate 必要 (= commit message convention 拡張)、cost 中 | **No** (= 現状 protocol articulate で十分、observation 段階) |
| GP-3 | DA Lineage 実 sha update 漏れ防止 | 既 commit 後 amend / follow-up commit pattern が確立済 (= AAG Pilot + 本 program で実証) | **No** (= 既 pattern で吸収可能、guard 化 cost > value) |
| GP-4 | Task Class 漏れ防止 | commit message convention 拡張 = AAG-COA articulate 改変必要 (= 不可侵原則 1 違反 risk) | **No** (= 不可侵原則違反 risk、protocol articulate で十分) |

= **本 M5 では guard 化 No 結論** (= 4 候補すべて value < cost、現状 protocol articulate で十分)。

### 4.3 再起動 trigger (= drawer Pattern 5 意図的 skip + rationale)

以下のいずれかが観測されたら、guard 化判断を **再起動**:

- **trigger A**: 同種 protocol violation が 2 回以上発生 (= G8 整合、再発防止 mechanism 化判断)
- **trigger B**: AAG framework 側で commit message convention が articulate update され、Task Class field が canonical になる (= 候補 GP-4 の cost が劇減)
- **trigger C**: AI session monitor infrastructure が AAG drawer に統合される (= 候補 GP-1/GP-2 の cost が劇減)

= **本 M5 では guard 化判断 = No、ただし trigger 発生時に再評価**。drawer Pattern 5 (= 意図的 skip + rationale + 再起動 trigger) の application instance。

## 5. Task Class lens から drawer に reach する手順 (= reader navigation)

### 5.1 TC-1 Planning が drawer reach する場合

```
1. session-protocol.md §1.3 で Complexity 判定 (= L2 or L3)
2. complexity-policy.md §3.3/§3.4 で routing
3. planning-protocol.md §2 で 6 step 実行
4. Step 2 (調査) で本 protocol §2 routing matrix を read
5. consumerKind: authority-auditor の rules を docs/generated/aag/rule-by-topic.json から read
6. sourceRefs 経由で foundation doc に深掘り
```

### 5.2 TC-2 Refactor / TC-3 Bug Fix / TC-4 New Capability も同 pattern

各 protocol §2 step で本 protocol §2 routing matrix を pivot として AAG drawer に reach。

### 5.3 reach せずに完遂可能な場合

L1 軽修正 (= `complexity-policy.md` §3.2 routing) では drawer reach は通常不要。AAG drawer reach は L2-L3 の Step 2 (= 調査 phase) で初めて活用。

## 6. AAG drawer 改変判断 (= 本 protocol scope 外、不可侵原則 1)

以下は **本 protocol scope 外**:

- AAG drawer (= rule-index.json / merged-architecture-rules.json / 等) の articulate 改変
- `_seam` の新 field 追加
- `tools/architecture-health/` 配下 generator の改変
- AAG-REQ articulate の改変

これらは **AAG framework 改修 program** scope (= `aag-platformization` の後継 program 候補)。本 protocol は drawer の **読み手側** の routing articulate のみ。

## 7. 関連

- 上位 index: `task-protocol-system.md` §7 (= AAG framework との contract)
- AAG drawer 自身: `docs/generated/aag/rule-index.json` + `merged-architecture-rules.json` + `rule-by-topic.json` + `rules-by-path.json`
- AAG drawer canonical articulate: `aag/_internal/source-of-truth.md` + `aag/_internal/architecture.md`
- Task Class catalog: `task-class-catalog.md`
- complexity policy: `complexity-policy.md`
- session protocol: `session-protocol.md`
- AAG drawer Pattern 1-6: `references/05-aag-interface/drawer/decision-articulation-patterns.md`

## 8. status

- 2026-05-04: M5 fill (= 本 doc landing、operational-protocol-system 全 5 Phase 完遂 milestone)
- 後続 (= 別 program): 4.3 trigger 発生時に guard 化判断再起動
