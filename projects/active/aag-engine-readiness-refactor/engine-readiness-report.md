# AAG Engine Readiness Report

> **位置付け**: `aag-engine-readiness-refactor` project Phase 7 deliverable。
> Go / Rust 等の engine 部分移行に向けた readiness 判定 + No-Go boundary articulate。
> 後続 engine 実装 project (= 別 program 起票、本 project archive 後) の **正本参照**。
>
> **scope**: 本 report は engine 実装そのものを **行わない** (= 不可侵原則 1)。
> engine 実装は別 program で行うが、その program が **何を作るか / 何を作らないか** を
> 本 report が articulate。
>
> **status**: AI 自己レビュー全達成、user 最終承認待ち。承認後に archive プロセス
> (= `references/05-aag-interface/operations/project-checklist-governance.md` §6.2) に移行。

## 1. Executive Summary

`aag-engine-readiness-refactor` Phase 0〜6 で以下が articulate / landing 完了:

| 成果物 | location | Phase |
|---|---|---|
| AAG Input Inventory (= 5 分類 + 3 状態問題) | `references/03-implementation/aag-engine-readiness-inventory.md` | Phase 1 |
| DetectorResult TS implementation | `tools/architecture-health/src/detector-result.ts` | Phase 2 |
| 5 系統 pure detector | `tools/architecture-health/src/detectors/*.ts` | Phase 2-3 |
| evaluator helper (= 4 層 layered model 完成) | `evaluateDetectorResults()` | Phase 3 |
| layered model README + Logic Boundary Reference | `tools/architecture-health/src/detectors/README.md` | Phase 3+6 |
| path-helpers foundation (= RepoPath / RepoFileEntry / 4 規約) | `tools/architecture-health/src/path-helpers.ts` | Phase 4 |
| 全 5 detector path-helpers adoption | (= boundary validation) | Phase 4+6 |
| fixture corpus (= 8 fixture / 5 系統 coverage) | `fixtures/aag/` | Phase 5 |
| parity test (= fixture × detector × expected DetectorResult) | `app/src/test/guards/detectorResultModuleGuard.test.ts` | Phase 5 |

**engine 化判定の核**: app-agnostic governance logic (= **5 系統**) は engine
移植可能、app-specific guard (= calculation / presentation / domain) は TS 残置。

## 2. 移行可能 detector (= engine MVP scope)

5 系統すべてが pure detector として landing 済 + path-helpers adoption 済 +
fixture corpus に基づく parity test 済。各 detector の **Logic Boundary** は
`tools/architecture-health/src/detectors/README.md` §「Logic Boundary Reference」
で per-detector articulate 済。

| 系統 | detector | demonstration violation | engine 移植可能性 | 備考 |
|---|---|---|---|---|
| project lifecycle | `project-lifecycle-detector.ts` | C1 (= completed but not archived) | **高** | facts は ProjectChecklistResult、collector が `derivedStatus` を articulate |
| archive manifest | `archive-manifest-detector.ts` | A2 (= top-level required field 欠落) | **高** | schema (`project-archive.schema.json`) を canonical input、12 field 一致のみ |
| doc registry | `doc-registry-detector.ts` | D1 (= registered path が存在しない) | **高** | set membership 判定のみ、collector が existingPaths を articulate |
| generated metadata | `generated-metadata-detector.ts` | G2 (= GENERATED marker / ISO timestamp 欠落) | **中** | 2 regex pattern を engine 側で同期 articulate (= regex literal の同期義務) |
| schema validation | `schema-validation-detector.ts` | PZ-2 (= level が 0〜4 範囲外) | **高** | range check のみ、AAG-COA Level 定義は projectization-policy.md canonical |

= **移行可能性「高」 4 系統 + 「中」 1 系統**、engine MVP scope は 5 系統すべて含めて妥当。

## 3. TS 側残置 detector (= engine 化対象外、不可侵原則 5)

以下 production guard 群は **app domain 知識を必要とする** ため engine 化対象外。
TS 側に残し、本 readiness の対象外:

| 系統 | TS guard 例 | 理由 |
|---|---|---|
| domain calculation | `grossProfitConsistencyGuard` / `factorDecompositionPathGuard` / `piValuePathGuard` 等 | 業務計算 (= シャープリー恒等式 / 粗利計算 / PI 値) の domain knowledge 必須 |
| presentation boundary | `presentationIsolationGuard` / `pageMetaGuard` / `presentationComparisonMathGuard` 等 | React / 画面構造 / chart input pattern の app-specific 知識必須 |
| temporal scope | `temporalScopeGuard` / `temporalRollingGuard` / `dataIntegrityGuard` 等 | 期間 semantics / data flow integrity の app-specific 知識必須 |
| TypeScript AST | `architectureRuleGuard` / `purityGuard` 等 | TS AST parser に密結合、Go / Rust で再実装は重い |
| WASM bridge | `app-domain/integrity/` 系 | WASM module bridge は TS-WASM 境界に依存 |

これらは engine 化すると app domain knowledge を engine 側に複製することになり、
**不可侵原則 5 違反**。TS 残置が canonical な選択。

## 4. Go engine MVP — input boundary

engine が読む input は `aag-engine-readiness-inventory.md` で 5 分類 articulate 済。
Go engine MVP では以下を input scope に含める:

### 4.1. Contracts (= 全 6 件のうち engine MVP 必須 3 件)

| path | 役割 |
|---|---|
| `docs/contracts/doc-registry.json` | doc registry 検証の canonical |
| `docs/contracts/aag/project-archive.schema.json` | Archive v2 schema 正本 |
| `docs/contracts/project-metadata.json` | app version triplet (= drift 検出) |

(残り 3 件 = `escalation-criteria.json` / `principles.json` / `test-contract.json` は MVP scope 外、Phase 2 として後続移行)

### 4.2. Generated artifacts (input only、= MVP では生成側は TS 維持)

| path | 役割 |
|---|---|
| `references/04-tracking/generated/architecture-health.json` | KPI 正本 (engine が読む) |
| `references/04-tracking/generated/project-health.json` | lifecycle 集約 |
| `docs/generated/aag/merged-architecture-rules.json` | 全 rule の merge 後正本 |

(生成側 = Go engine が KPI 計算するのは Phase 2。MVP は input only)

### 4.3. Project lifecycle (= 3 状態すべて handle)

`projects/active/<id>/config/project.json` を entry point として:

- **active**: `checklist.md` を直接 read (= `derivedStatus` を計算)
- **completed v1**: 同上 (= `config.status === 'archived'` で判別)
- **completed v2** (圧縮済): `archive.manifest.json` から lineage / DA / commit history を read、`plan.md` / `checklist.md` の物理存在を **前提にしてはならない**

### 4.4. Rule source (= TS 維持、engine は merged JSON 経由参照)

- `app-domain/gross-profit/rule-catalog/base-rules.ts` は engine **不参照** (= 不可侵原則 4)
- engine は `docs/generated/aag/merged-architecture-rules.json` を入力にする (= rule semantics の重複排除)

### 4.5. Guard / collector source

engine 化対象 = 5 系統 detector のみ。残り (= app-specific guard、§3 参照) は TS 維持。

## 5. Go engine MVP — output boundary

### 5.1. 主出力: DetectorResult[]

各 detector が emit する violation 集合。schema は `docs/contracts/aag/detector-result.schema.json`
canonical:

```typescript
interface DetectorResult {
  ruleId: string
  detectionType: string
  sourceFile: string  // = repo-relative POSIX path、4 規約遵守
  severity: 'gate' | 'warn' | 'block-merge'
  evidence?: string
  actual?: number
  baseline?: number
  messageSeed?: string
}
```

Go engine は同 schema に conformant な JSON を出力 (= Go struct + json.Marshal で
articulate 可能)。

### 5.2. evaluator summary (= layered model evaluator 層)

`DetectorEvaluationSummary` (= `tools/architecture-health/src/detector-result.ts` 参照):

- `totalCount` / `countBySeverity` / `countByRuleId` / `hardGatePass` / `mergeBlockPass`

engine の hard gate 判定は本 summary を経由 (= TS と同 logic を Go で再現)。

### 5.3. 出力形式

- **JSON 直 serialize**: `renderDetectorResultsAsJson()` 経由、deterministic ordering (= severity → ruleId → sourceFile)
- **AagResponse 変換**: 必要なら TS 側で `aggregateDetectorResults()` を呼び human-readable に articulate (= MVP では engine は JSON 出力のみ、AagResponse 変換は TS renderer が責務)

### 5.4. markdown view (= TS renderer が担当)

`*.generated.md` の生成は **TS renderer 責務** で MVP scope 外。engine は JSON
出力までを scope に限定。

## 6. Shadow mode 比較対象

engine 実装後、TS と Go が **同じ input から同じ output を返すか** を機械検証する
shadow mode parity:

### 6.1. fixture corpus による parity (= 主軸)

`fixtures/aag/` 配下 8 fixture を input、各 detector が同 expected を返すか検証:

| fixture | TS detector → expected | Go engine → expected |
|---|---|---|
| archive-v2/pass-minimal | 0 件 | 0 件 (= parity 必須) |
| archive-v2/fail-missing-restore-command | 1 件 (A2) | 1 件 (A2、同 evidence) |
| archive-v2/fail-missing-multiple-fields | 3 件 (A2) | 3 件 (A2、同 evidence、同 順序) |
| project-lifecycle/pass-active | 0 件 | 0 件 |
| project-lifecycle/fail-completed-not-archived | 1 件 (C1) | 1 件 (C1) |
| doc-registry/fail-missing-path | 1 件 (D1) | 1 件 (D1) |
| generated/fail-stale-metadata | 1 件 (G2) | 1 件 (G2) |
| schema-validation/fail-level-out-of-range | 1 件 (PZ-2) | 1 件 (PZ-2) |

= 5 detector × 8 fixture = 40 parity 検証点 (= 一部 fixture は複数 detector に対応)

### 6.2. 実 repo 状態での parity (= 補助)

実 repo の現状 facts に対して TS と Go が同 violation 集合を返すか検証。
但し repo 状態は時系列で変化する (= deterministic でない) ため、shadow mode の
**主軸は fixture corpus**。

### 6.3. drift 検出 mechanism

Shadow mode で diff 発生 → engine 側の bug or TS 側の意味変更。後者は不可侵原則 2
違反候補で、user escalate。

## 7. Hard gate 化 / advisory 判定

engine MVP では各 violation rule の **hard gate 化判定** を以下とする:

| ruleId | severity | hard gate 化判定 (MVP) | 理由 |
|---|---|---|---|
| `AR-PROJECT-LIFECYCLE-C1` | gate | **hard gate** | 既存 production guard と 1:1 整合 |
| `AR-ARCHIVE-MANIFEST-A2` | gate | **hard gate** | schema 違反、archive integrity に直結 |
| `AR-DOC-REGISTRY-D1` | gate | **hard gate** | doc navigation 整合性、broken link 防止 |
| `AR-GENERATED-METADATA-G2` | gate | **advisory (= MVP)** | 手編集検出は false positive 余地あり、運用初期は advisory |
| `AR-SCHEMA-VALIDATION-PZ2` | gate | **hard gate** | AAG-COA schema、誤値は構造的問題 |

= **MVP では 4 hard gate + 1 advisory**。advisory → hard gate 昇格は実 repo データで
false positive 率を観測してから判断 (= test-signal-integrity-advisory.md §5 昇格条件
と同 pattern)。

## 8. Go engine 実装開始条件

以下すべてを満たした時点で **別 program (= aag-engine-go-mvp 等) 起票** が認可:

### 8.1. Pre-condition (= 本 readiness の確認事項)

- [x] 5 系統 pure detector 存在 (= Phase 2-3 で landing)
- [x] DetectorResult schema canonical + sync guard 機械検証 (= Phase 2)
- [x] path-helpers 4 規約 articulate + 全 5 detector adoption 済 (= Phase 4+6)
- [x] fixture corpus 8 件 + parity test 9 件 (= Phase 5)
- [x] Logic Boundary Reference per-detector articulate (= Phase 6)
- [x] 既存 production guard 不変 (= 連続 Phase で不可侵原則 2 維持)
- [ ] 本 readiness report user 承認 (= Phase 7 完了 = 最終レビュー [x])

### 8.2. 別 program 起票時の不可侵原則継承

aag-engine-go-mvp は本 project の不可侵原則を継承:

1. (本 program) Go 実装に **入る** (= 本 readiness report の不可侵原則 1 を反転)
2. **既存 guard の意味を変えない** (= 本 readiness report 不可侵原則 2 維持、shadow mode parity)
3. **新 hard gate を追加しない** (= 本 readiness report の判定通り、advisory → hard gate 昇格は別判断)
4. **rule semantics を別言語に複製しない** (= merged JSON 経由参照のみ、本 readiness report 不可侵原則 4 維持)
5. **app-specific TS guard を engine 化対象に含めない** (= §3 の TS 残置 リスト維持)

### 8.3. shadow mode 期間

実 deploy 前に最低 4 週間の shadow mode 並走推奨 (= 観測期間で false positive
を articulate、parity diff を検出)。期間終了後に user 承認で hard gate 化 / 段階展開。

### 8.4. 移植優先順位

advisory → 移植順序の推奨:

1. **archive-manifest** (= schema check のみ、最も simple、moving target なし)
2. **doc-registry** (= set membership、collector 依存最小)
3. **schema-validation** (= range check のみ)
4. **project-lifecycle** (= ProjectChecklistResult 構造体の Go 再現必要、scope 中)
5. **generated-metadata** (= regex pattern の同期義務、最 careful)

各 detector を 1 ずつ shadow mode 検証 → 全件 parity OK → MVP リリース。

## 9. Out of Scope (= 本 readiness 対象外)

以下は **engine MVP scope 外**、別 program 起票判断で対応:

- **生成側 (= KPI 計算 / `*.generated.md` 生成)**: MVP は input only、生成側は TS 維持
- **rule semantics の Go 再実装**: 不可侵原則 4 違反候補
- **app-specific guard 移植**: §3 リスト、不可侵原則 5
- **renderer markdown 生成**: §5.4 articulate
- **production guard の Vitest wrapper thin 化**: schema-preserving refactor、別 program 所掌

## 10. 本 project archive 後の継承文書

本 project archive 後、後続 engine 実装 project が参照すべき正本:

| 文書 | 役割 |
|---|---|
| `references/03-implementation/aag-engine-readiness-inventory.md` | engine input 5 分類 + 3 状態問題 |
| `tools/architecture-health/src/detector-result.ts` | DetectorResult TS implementation |
| `tools/architecture-health/src/detectors/*.ts` | 5 detector pure logic |
| `tools/architecture-health/src/detectors/README.md` | 4 層 layered model + Logic Boundary Reference |
| `tools/architecture-health/src/path-helpers.ts` | RepoPath / RepoFileEntry + 4 規約 |
| `fixtures/aag/` | 8 fixture (= shadow mode parity 主軸) |
| `docs/contracts/aag/detector-result.schema.json` | canonical schema (= JSON Schema draft-07) |
| `docs/contracts/aag/project-archive.schema.json` | Archive v2 schema |
| `app/src/test/guards/detectorResultModuleGuard.test.ts` | 動作 contract (= unit test 85 件) |
| 本 report | engine MVP scope 判定 + No-Go boundary |

## 11. user 最終承認の articulate

user は本 report を review し以下を判定:

- [ ] §2 移行可能 detector の scope に同意
- [ ] §3 TS 残置 detector の境界に同意
- [ ] §4 / §5 engine MVP input/output boundary に同意
- [ ] §6 shadow mode 比較対象に同意
- [ ] §7 hard gate 化判定に同意
- [ ] §8 別 program 起票条件に同意

すべて同意なら `checklist.md` の最終レビュー section [x] flip → archive プロセス移行。
不同意項目があれば本 report を update し再 review。

---

## DA 参照

- DA-α-000: 進行モデル institute (= AAG Pilot DA institution からの継承)
- DA-α-001: Phase 1 inventory landing 判断 (= 永続 doc + §13.2)
- DA-α-002: Phase 2 forward-looking schema 継承 (= scope candidate B)
- DA-α-003: Phase 3 4 系統 systematic adoption + layered model
- DA-α-004: Phase 4 path-helpers foundation + 3 detector adoption
- DA-α-005: Phase 5 fixture corpus 8 + parity test
- DA-α-006: Phase 6 残り 2 detector adoption + Logic Boundary Reference
- DA-α-007: Phase 7 readiness report landing (= 本 report)

詳細は `decision-audit.md` 参照。
