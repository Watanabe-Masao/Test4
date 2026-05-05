# plan — aag-engine-go-mvp

## 不可侵原則

1. **MVP は validator のみ、generator ではない** — Go engine は repo / docs / project lifecycle / artifact / schema / archive を **read-only** で検証する。docs:generate / generated artifact の書き込みは MVP scope 外、TS 維持。
2. **TypeScript guard を全廃しない** — AAG Engine は「全 guard の置換」ではなく **外部 governance validator** として育てる。app-specific (= calculation / presentation / WASM / TS AST) guard は TS / Vitest に永続維持。本 MVP の対象は repo / governance / archive / lifecycle / metadata の 5 系統に限定。
3. **rule semantics を Go 側に複製しない** — readiness refactor 不可侵原則 4 継承。AAG rule の TS 物理正本 (= `app-domain/gross-profit/rule-catalog/base-rules.ts` 等) は Go 不参照。Go engine は merged JSON (= `docs/generated/aag/merged-architecture-rules.json`) 経由で rule を input にする。
4. **app-specific TS guard を engine 化対象に含めない** — readiness refactor 不可侵原則 5 継承。calculation / presentation / WASM / TS AST 系 guard は Go 移植対象外。本 MVP は **5 系統 (= archive manifest / doc registry / generated metadata / project lifecycle / schema validation)** のみ対象。
5. **CI hard gate を即時置換しない** — Phase 9-10 で shadow mode + CI advisory として並走、Phase 11 で安全な detector から段階昇格、Phase 12 で最終判断。本 MVP の本質は「外部 engine が同 input を読み同 DetectorResult を返せる」 ことの **証明**。
6. **§13.1 / §13.2 / §13.3 の commit pattern を全 Phase で適用** — Phase landing + wrap-up の二段 commit、references/ 新 doc 追加時の atomic dependent update、checkbox flip 後の docs:generate 別 commit。
7. **L3 重変更 routing に従う** — 各 Phase は `decision-audit.md` に DA-α-N entry を articulate (= 5 軸 + 観測点 + Lineage 仮 sha → 実 sha) し、振り返り判定 (= 正しい / 部分的 / 間違い) まで完遂する (= complexity-policy.md §3.4)。
8. **実装 AI が完了承認しない** — checklist の最終レビュー section は user 判断。AI 自己レビューを完遂しても user 承認なしでは archive 不可 (= PZ-13)。
9. **Go engine が source of truth にならない** — engine は正本を持たず、JSON / repo artifact を読むだけ。TS 側 (= readiness refactor で永続維持された deliverable + AAG framework) が source of truth。
10. **fixture parity を必須にする** — Go engine の primary success metric は **既存 8 fixture × 5 detector = 40 parity 検証点** で TS 側と同 DetectorResult[] を返すこと。実 repo 状態での parity は補助 metric (= 時系列で変化するため deterministic でない)。

## Phase 構造

各 Phase は §13.1 に従って **landing commit + wrap-up commit** の二段で進行する。
checkbox flip がある場合は §13.3 に従って docs:generate 反映を別 commit で landing。
references/ 配下に新 doc を追加する場合は §13.2 に従って doc-registry / README index /
inbound link を **同 atomic commit** に統合する。

### Phase 0: Project Bootstrap

**目的**: project を起票し、scope / non-goals / required reads / commit pattern を固定する。Go 実装にはまだ入らない。

**作業**:
- projects/active/aag-engine-go-mvp/ ディレクトリ + 必須 7 file (= AI_CONTEXT / HANDOFF / plan / checklist / projectization / discovery-log / decision-audit) + config/project.json
- references/04-tracking/open-issues.md の active project 索引に追加
- DA-α-000 entry articulate (= 本 project の進行モデル institute、readiness refactor DA-α-000 pattern 継承)
- §13.1 / §13.2 / §13.3 適用方針を本 plan.md §不可侵原則 6 に明記
- **readiness refactor deliverable を required reads として明示列挙** (= AI_CONTEXT.md §「Required reads」 17 file)

**完了条件**:
- project が architecture-health / project-health に認識される
- checklistFormatGuard / projectCompletionConsistencyGuard / projectizationPolicyGuard / archiveV2SchemaGuard すべて PASS
- docs:check PASS
- DA-α-000 振り返り判定 (= landing commit SHA 確定後)
- **Go 実装にはまだ入っていない** (= aag-engine/ directory 不在を確認)

### Phase 1: Go CLI Skeleton

**目的**: engine の空の外枠 (= entry point + JSON output 経路 + exit code contract) を作る。

**想定構造**:

```
aag-engine/
  go.mod
  cmd/aag/main.go
  internal/contract/
  internal/report/
```

**CLI 初期案**:

```bash
aag validate --repo .
aag validate --repo . --format json
aag fixtures --repo .
```

**完了条件**:
- repo を書き換えない (= read-only verify)
- JSON output を返せる (= 空 DetectorResult[] でも valid)
- exit code contract がある (= 0 = pass / 1 = fail / 2 = error)
- DetectorResult[] の空配列を返せる
- DA-α-001 entry articulate

### Phase 2: DetectorResult Contract Binding

**目的**: Go engine の出力を既存 schema (= `docs/contracts/aag/detector-result.schema.json`) に合わせる。

**入力正本**:

- `docs/contracts/aag/detector-result.schema.json` (= JSON Schema draft-07)
- `tools/architecture-health/src/detector-result.ts` (= TS implementation reference)

**完了条件**:
- Go struct (= `internal/contract/detector_result.go`) が DetectorResult schema と一致
- JSON serialization が `expected.json` と比較可能 (= field name / order / type 一致)
- schemaVersion / detectorId / ruleId / severity / sourceFile / evidence / actual / baseline / messageSeed を保持
- DA-α-002 entry articulate

### Phase 3: Fixture Runner

**目的**: 実 repo ではなく fixture で parity を取る土台を作る (= primary success metric)。

**対象**: `fixtures/aag/` 配下 8 fixture (= readiness refactor Phase 5 deliverable):

```
fixtures/aag/archive-v2/{pass-minimal, fail-missing-restore-command, fail-missing-multiple-fields}
fixtures/aag/doc-registry/fail-missing-path
fixtures/aag/generated/fail-stale-metadata
fixtures/aag/project-lifecycle/{pass-active, fail-completed-not-archived}
fixtures/aag/schema-validation/fail-level-out-of-range
```

**完了条件**:
- fixture `input.json` を読める
- `expected.json` と actual を比較できる (= deep equality)
- 差分を machine-readable に出せる
- DA-α-003 entry articulate

### Phase 4: Archive Manifest Detector

**理由 (= 最初に移植する根拠)**:
- JSON input 中心 (= text/AST 解析不要)
- Archive v2 schema が canonical で存在
- app-specific ではない
- false positive が少ない (= field 欠落判定のみ)
- readiness archive で self-dogfood 済 (= 4 件 archive 経験)

**完了条件**:
- `archive-v2/pass-minimal` が pass
- `archive-v2/fail-missing-restore-command` / `fail-missing-multiple-fields` が fail
- DetectorResult が TS 側 expected と field-level 一致
- DA-α-004 entry articulate

### Phase 5: Doc Registry Detector

**目的**: doc-registry の path existence / registration consistency を Go 側でも検証。

**完了条件**:
- doc-registry input を読める (= `docs/contracts/doc-registry.json`)
- missing path を検出 (= `references/` 配下 file の存在確認)
- repo-relative POSIX path に統一 (= readiness refactor path-helpers 4 規約継承)
- references doc 追加時の §13.2 atomic update pattern と整合
- DA-α-005 entry articulate

### Phase 6: Schema Validation Detector

**目的**: AAG contract / archive schema / detector result schema を Go engine で検証。

**完了条件**:
- schema-validation fixture が pass / fail する
- schemaVersion mismatch を検出
- level out-of-range 等を DetectorResult 化
- DA-α-006 entry articulate

### Phase 7: Project Lifecycle Detector

**目的**: `projects/active/` / `projects/completed/` / Archive v2 圧縮済 project の lifecycle を read-only 検証。

**重要前提** (= readiness refactor inventory §1 + §4.3 articulate):

- completed project は `config/project.json` + `archive.manifest.json` + `ARCHIVE.md` の 3 file を読む (= Archive v2 圧縮済の場合)
- completed project に `plan.md` / `checklist.md` / `AI_CONTEXT.md` 等が残っている前提を **持たない** (= 圧縮対象は project ごとに articulate されている)
- v1 (= Archive v2 未実施) は full directory のまま (= active と同 layout)

**完了条件**:
- completed-not-archived (= C1) を検出
- active / completed / template を分離 scan
- Archive v2 圧縮済 project で false positive が出ない
- DA-α-007 entry articulate

### Phase 8: Generated Metadata Detector (advisory)

**目的**: generated artifact の metadata drift を **advisory** として検出。

**扱い**:
- severity: `warn` (= advisory only、`gate` / `block-merge` は MVP scope 外)
- hard gate: **no**

**理由**: sourceCommit / generatedAt / shallow clone / regen timing による false positive 余地があるため、初期は advisory に留める。

**完了条件**:
- stale metadata fixture を検出
- advisory severity で出力
- CI hard fail にはしない (= Phase 10 CI advisory でも non-blocking)
- DA-α-008 entry articulate

### Phase 9: Shadow Mode

**目的**: Go engine を既存 TS AAG と並走させ、parity / drift を report。

**初期運用**:

```
Go engine: advisory only (= report 出力)
TypeScript AAG: 現行 hard gate 維持
```

**完了条件**:
- 5 detector × 8 fixture = 40 parity 検証点で TS と Go が同 DetectorResult[] を返す
- TS detector と Go detector の差分 report が出る
- false positive / false negative を記録できる
- DA-α-009 entry articulate

### Phase 10: CI Advisory

**目的**: Go engine を CI に non-blocking で導入、2〜4週間 false positive を観測。

**CI イメージ**:

```bash
go test ./...
aag fixtures --repo .
aag validate --repo . --format json
```

**扱い**: 結果は report、初期は non-blocking、generated metadata は advisory 継続

**完了条件**:
- CI 上で安定実行 (= flake 0 件)
- 実行時間が許容範囲 (= 既存 fast-gate に圧迫を与えない)
- 2〜4週間 false positive を観測 (= 観測 log を `discovery-log.md` に articulate)
- DA-α-010 entry articulate

### Phase 11: Partial Hard Gate Promotion

**目的**: 安全な detector から hard gate に段階昇格。

**昇格候補順** (= readiness refactor Phase 7 readiness report §8.4 移植優先順位 継承):

1. archive manifest (= schema check のみ、最小 surface)
2. schema validation (= range check のみ)
3. doc registry (= set membership 判定のみ)
4. project lifecycle (= 3 状態 routing、構造体再現あり)
5. **generated metadata は最後、または advisory 継続** (= regex 同期義務、false positive 余地)

**昇格条件** (= readiness refactor § shadow mode 4 週間並走条件 継承):
- fixture parity 100%
- shadow mode 期間で false positive なし
- TS 側との差分なし
- rollback path あり (= TS guard が hard gate を引き続き保持、Go は補完)
- user approval あり

**完了条件**:
- 1 detector が hard gate 化 (= 最低 archive manifest)
- 残り detector の hard gate 化判定が articulate
- DA-α-011 entry articulate

### Phase 12: Closure / Next Architecture Decision

**最終判断** (= user 判断、AI は articulate のみ):

- **A. Go engine を CI hard gate の一部に昇格** (= 既存 hard gate と並列で Go engine も hard gate 担う)
- **B. Go engine を advisory validator として継続** (= hard gate 化見送り、shadow mode 維持)
- **C. 追加 detector を実装する** (= 5 系統超え、新領域 detector を別 program で起票)
- **D. generated artifact validation を強化** (= advisory → hard gate 化検討)
- **E. Rust engine の必要性を再評価** (= Go 一本化 / Rust 並行 / Rust に移行 のいずれか)

**完了条件**:
- 上記 A〜E のいずれかで user 判断
- DA-α-012 entry articulate
- AI 自己レビュー section 全 [x]
- 最終レビュー (user 承認) 待ち state (= 不可侵原則 8 strict adherence)

## やってはいけないこと

- **engine を generator にする** → 不可侵原則 1 違反、scope 逸脱として user escalate
- **TypeScript guard を削除する** → 不可侵原則 2 違反、AAG Engine は外部 validator
- **rule semantics を Go 側に複製する** → 不可侵原則 3 違反 (= readiness refactor 不可侵原則 4 継承)
- **app-specific guard (= calculation / presentation / WASM / TS AST) を Go 移植対象に含める** → 不可侵原則 4 違反 (= readiness refactor 不可侵原則 5 継承)
- **CI hard gate を即時置換する** → 不可侵原則 5 違反、shadow mode 期間と user 承認を経て段階昇格
- **1 commit に landing + wrap-up を統合** → §13.1 antipattern、drawer Pattern 1 違反
- **references/ 新 doc を doc-registry 更新なしで commit** → §13.2 antipattern、push fail
- **checkbox flip + docs:generate を amend で混ぜる** → §13.3 antipattern、AAG-REQ-NO-AMEND 違反
- **Go engine を source of truth にする** → 不可侵原則 9 違反、TS 側が canonical
- **AI 単独で最終レビュー section を [x] にする** → 不可侵原則 8 違反、PZ-10 / PZ-13 違反

## 関連実装

| パス | 役割 |
|---|---|
| `aag-engine/` (= Phase 1 で新設) | Go module root |
| `aag-engine/cmd/aag/main.go` | CLI entry point |
| `aag-engine/internal/contract/` | DetectorResult Go struct + schema loader |
| `aag-engine/internal/report/` | parity report + JSON serializer |
| `aag-engine/internal/detectors/` (= Phase 4-8 で新設) | 5 detector Go 実装 |
| `docs/contracts/aag/detector-result.schema.json` | canonical schema (= Go 側 sync 対象) |
| `fixtures/aag/` | 8 fixture (= primary success metric の input) |
| `tools/architecture-health/src/detectors/README.md` | 4 層 layered model + Logic Boundary Reference (= Go 移植 reference) |
| `tools/architecture-health/src/path-helpers.ts` | RepoPath / 4 規約 (= Go 側で同 規約再現) |
| `tools/architecture-health/src/detector-result.ts` | TS implementation (= Go との parity reference) |

## Long-term Target (= 本 MVP 完遂後の AAG 全体像)

最終形は AAG を **2 layer** に articulate:

```
AAG Core Engine (= Go、本 MVP で MVP 化)
  - contract validation
  - archive validation
  - project lifecycle validation
  - doc registry validation
  - schema validation
  - generated metadata advisory

AAG TS Guards (= 永続維持、本 MVP scope 外)
  - domain-specific architecture tests
  - app-specific import / boundary / calculation rules
  - WASM / React / TypeScript specific checks

AAG Reports (= 段階移管、初期 TS 維持)
  - architecture-health
  - project-health
  - shadow parity (= 本 MVP Phase 9 deliverable)
  - detector drift
```

最終的な価値は、**AI / human が repo を変更しても、設計・正本・project lifecycle・
generated artifact の整合性を外部 engine が検証できる状態**。

一言で:

> AAG を「repo 内の文化・テスト群」から、「repo を外側から読む read-only governance engine」へ昇格させる。
