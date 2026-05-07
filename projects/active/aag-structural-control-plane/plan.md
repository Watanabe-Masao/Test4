# plan — aag-structural-control-plane

## 不可侵原則

1. **YAML authoring / JSON machine truth** — YAML は人間/AI が編集する authoring source としてのみ許可する。Detector / CI / AAG CLI / architecture-health は **generated JSON のみ** を読む。YAML を AAG machine truth にしない（ADR-SCP-001）。reposteward 不可侵原則 1（JSON-first）は AAG Parameters / Task Capsule / SourceFacts / Premise Contract / DetectorResult / generated artifact の **narrow scope** として再定義し、本 program の YAML 用法は同 scope 外（authoring source 層）として共存する。**normalize は deterministic**: object key alphabetical sort + array order-preserving + indent 2 spaces + final newline + metadata block（`schemaVersion` / `sourceSha` / `sourcePaths` / `generatedAt`）必須（詳細: inquiry/07 §8）。
2. **Document Contract は doc-registry.json の拡張層** — 新 namespace の Document ID（DOC-DEF-*）を既存 `docs/contracts/doc-registry.json` と並立させない。kind / temporalScope / requiredSections / forbiddenContent / owner / audience / granularity / lifecycle は doc-registry entry に additive 拡張する形で articulate する（ADR-SCP-002）。既存 `references/04-tracking/recent-changes.generated.md` 系の generator の後方互換（未知 field 無視）は Phase 0 で確認する。
3. **製本は present-only** — `canonical-doc` kind の文書は **現在有効な実装・契約・定義・ルール** のみを書く。過去の実装経緯 / 退役済み設計 / 移行ログは `archive-doc` へ。将来計画 / roadmap / TODO / Phase plan / project progress は `project-plan` へ。現在値の一覧 / 件数 / status は `generated-report` へ。製本に過去/未来が必要な場合は **本文展開せず、Document ID / Project ID で参照** する（ADR-SCP-003）。
4. **Tree Contract MVP scope は top-level + structural roots のみ** — Phase 1 では `references/` / `aag/` / `aag-engine/` / `projects/` / `docs/contracts/` / `app/src/{domain,application,infrastructure,presentation,features}` / `app/src/test/guards/` / `tools/` / `wasm/` のみを Tree Contract 対象とする。それ以外は `unmanaged-but-tolerated` 状態で許容する。粒度爆発を抑止するため、Phase 1 内で個別ディレクトリへ拡大しない（ADR-SCP-004）。`unmanaged-but-tolerated` の意味: inventory に載るが contract 必須対象ではない / 既存 unmanaged 配下への新規子 directory 追加は OK / **新規 top-level directory 追加は finding**（new-only gate 対象）/ baseline は単調減少のみ（unmanaged → managed への promotion は user 判断、新規 unmanaged 化は finding）。詳細: inquiry/07 §7。
5. **OBLIGATION_MAP / PATH_TO_REQUIRED_READS migration は 3 段階 shadow** — Phase 8a で YAML → generated JSON を追加（既存 TS 定数も維持）、TS 定数と generated JSON の正規化比較器で差分を shadow check。Phase 8b で collector を generated JSON 読みに切替（TS 定数は deprecated shim）。Phase 8c で TS 定数を削除。一発切替は禁止（ADR-SCP-005）。
6. **AI Instruction Pack は post-write validation 限定** — AI 執筆の pre-write 強制は機構上不可能。Phase 6 の完了条件は「AI が参照できる Instruction Pack JSON が生成される」 + 「Markdown 作成後に Document Contract 適合性を機械検証できる」のみ。pre-write 強制を完了条件にしない（ADR-SCP-006）。
7. **Existing Documentation Reading Pass を機械分類で代替しない** — Phase 2.5 で各既存 Markdown の `proposedKind` / `temporalScope` / `disposition` は **人間/AI の reading** で確定する。機械は candidate と finding を出すのみ。`generated-report`（producer 宣言済）と `archive-doc`（archive-manifest 存在）は machine inferred で accepted 扱いとする例外条項を持つ（ADR-SCP-008）。Reading Pass 期間中、対象 zone 内の文書本体は編集しない（frontmatter docId 付与は同時付与可）。
8. **Additive-only / Wave 1 milestone 到達前は hard gate 追加しない** — 全 Phase の checker は **advisory** で開始。Hard Gate 昇格は user 判断による別 program 候補（reposteward `aag-engine-hard-gate-promotion` 候補と並走しない）。新規 mechanism は既存 TS guard / docs:generate / aag-engine に **additive** 追加され、置換しない。
9. **Schema-first / Finding-first / Shadow / Ratchet / Gate の段階順序を逆行させない** — Phase 0（ADR + Existing Asset Mapping）→ Phase 1（Schema MVP）→ Phase 2（Inventory）→ Phase 2.5（Reading Pass）→ Phase 3（Tree Contract Shadow）→ Phase 4（Document Kind + Temporal Scope Shadow）→ Phase 5（Document Contract Declaration + Rewrite/Move/Archive PRs）→ Phase 6（AI Instruction Pack）→ Phase 7（Required Docs Matrix）→ Phase 8a/8b/8c（Obligation Migration）→ Phase 9（Artifact Coverage Gate）→ Phase 10（Runner Parity Contract）。Phase の順序を逆行させない（例: Phase 1 Schema 前に Phase 5 Document Contract Declaration を始めない）。
10. **versionImpact は計画段階で declare 済（app: +0.0.0 / aag: +0.1）** — 実 archive 時に paradigm shift が surface したら DA entry を articulate して delta を escalate する。本 program は backward-compatible な additive mechanism のみで minor 想定。
11. **Guidance over restriction（AI を縛らず導く）** — AAG SCP の思想・Document Kind・Instruction Pack は、AI の能力を制限するためではなく、**AI が文脈・役割・粒度・時間軸を正しく把握し、より良い判断を行うための定性的ガイダンス**である。機械的 foul は **構造違反**（未登録 / 欠落 / 混入 / 生成物手編集 / 時間軸違反 / producer 不明 等）に限定し、**設計判断・表現品質・文脈解釈は AI / human review** で扱う。Gate は AI を失敗させる仕組みではなく、**構造的にありえないものだけを検出する安全網**（ADR-SCP-014 + AAG-SCP-GUIDANCE-001〜004）。
   - 思想 (= 不可変) → AI の判断を定性的に導く
   - Contract (= 構造的前提) → AI と repo が共有する前提
   - Guidance (= 文脈提供) → AI が良い判断をするための文脈・観点・参照先
   - Gate (= 構造破綻検出) → 構造的に判定可能な違反のみを foul する安全網
   - 合言葉: **`Plan → Context → Contract → Guidance → Gate`**（旧 `Plan → Contract → Rule → Gate` を更新）

## Phase 構造

### Phase 0: ADR + Existing Asset Mapping（本 PR で完了）

> **目的**: 実装開始前に **既存資産との接続関係を確定** する。型・schema・detector を増やす前に、既存 5 資産（doc-registry / docs/contracts/aag schemas / OBLIGATION_MAP / 既存 YAML / self-check substrate）との関係を articulate する。

含むもの:

- `projects/active/aag-structural-control-plane/` 配下 8 ファイル一式 landing（AI_CONTEXT / HANDOFF / plan / checklist / decision-audit / discovery-log / projectization / config/project.json）
- `inquiry/` 6 ファイル（Phase 0 で確定すべき既存資産マッピング項目の skeleton）
- `references/04-tracking/open-issues.md` の active projects 索引追加
- `cd app && npm run docs:generate` で project-health に新 project が `derivedStatus = in_progress` で登録されることを確認
- `cd app && npm run test:guards` PASS 確認（projectizationPolicyGuard / checklistFormatGuard / projectCompletionConsistencyGuard 等）
- DA-α-000（進行モデル）+ ADR-SCP-001〜009 を decision-audit.md に articulate

ADR 一覧（詳細は `decision-audit.md` 参照）:

| ADR | 主題 |
|---|---|
| ADR-SCP-001 | YAML authoring source / generated JSON machine truth（reposteward JSON-first 原則との narrow scope 再定義） |
| ADR-SCP-002 | Document Contract は doc-registry.json の拡張層（並立 namespace 禁止、配置は `docs/contracts/src/` + `docs/contracts/schema/` + `docs/contracts/generated/`） |
| ADR-SCP-003 | 製本 = 現在 / archive = 過去 / project = 未来 / generated report = 計算済み現在（時間軸 4 分類） |
| ADR-SCP-004 | Tree Contract MVP scope は top-level + structural roots のみ（粒度爆発抑止、unmanaged-but-tolerated 第 3 状態） |
| ADR-SCP-005 | OBLIGATION_MAP / PATH_TO_REQUIRED_READS は 3 段階 shadow migration（Phase 8a/8b/8c） |
| ADR-SCP-006 | AI Instruction Pack は post-write validation 限定（pre-write 強制を完了条件にしない） |
| ADR-SCP-007 | Reading Pass 成果物の保存規約（src/ = human authored、generated/ = machine candidate、merged は join projection） |
| ADR-SCP-008 | Machine inferred で accepted 扱いとする kind の例外条項（generated-report with producer / archive-doc with archive-manifest） |
| ADR-SCP-009 | Reading entry の stale 検出と再レビュー基準（reviewedAtCommit / reviewedAtSha、対象ファイルが reviewed-sha 以降に変更されたら再レビュー必須） |

完了条件: 上記すべて PASS かつ user 承認による checklist.md 最終レビュー [x] flip。

### Phase 1: Schema MVP（5〜6 PR）

> **目的**: Finding-first migration の受け皿を最初に作る。検出結果の型を先に定義し、すべての checker が同一 Finding JSON を返せる状態を作る。

成果物:

- `docs/contracts/schema/aag-finding.schema.json`（Finding の共通 schema = id / severity / subject / problem / expected / suggestedDisposition）
- `docs/contracts/schema/tree-contracts.schema.json`
- `docs/contracts/schema/doc-kind-registry.schema.json`
- `docs/contracts/schema/document-contracts.schema.json`
- `docs/contracts/schema/temporal-scope-policy.schema.json`
- `docs/contracts/src/repo/tree-contracts.yaml`（authoring source 雛形のみ、宣言は Phase 3 で確定）
- `docs/contracts/src/docs/doc-kind-registry.yaml`（authoring source 雛形のみ、宣言は Phase 4 で確定）

完了条件: 5 schema が JSON Schema として valid + Finding ID prefix が `FND-` で grep 可能（Document ID `DOC-` と区別）+ hard gate 追加なし。

### Phase 2: Inventory（3〜4 PR）

> **目的**: repo の現状を機械的に把握する。文書移動や大規模修正は一切しない。違反一覧を出すための入力データを揃える。

成果物:

- `docs/contracts/generated/repo-topology.generated.json`（repo tree 全体の探索結果）
- `docs/contracts/generated/markdown-inventory.generated.json`（全 Markdown の path / size / heading 構造 / docId 有無）
- `docs/contracts/generated/yaml-inventory.generated.json`（全 YAML を `declaration` / `inventory` / `generated-input` / `legacy` / `unknown` の 5 分類 candidate で articulate）
- `docs/contracts/generated/generated-artifact-inventory.generated.json`（generated artifact 候補の path / 推定 producer / manualEdit policy 候補）

完了条件: 4 inventory JSON 生成 + repo 構造 / Markdown / YAML / generated artifact 候補をすべて把握 + まだ foul しない。

### Phase 2.5: Existing Documentation Reading Pass（zone 単位、複数 PR）

> **目的**: 既存 Markdown を一度読み、各文書の意味・役割・時間軸・正本性を確定する。機械分類だけで contract 化しない（不可侵原則 7）。
>
> **AAG-SCP-MIGRATION-001〜006** をここで適用する（詳細は `decision-audit.md` の ADR-SCP-007〜009）。

zone 読み順（依存順）:

1. `references/README.md` + `aag/README.md` + `projects/` root の README.md（3 tree 境界の正本確認）
2. `CLAUDE.md`（orchestration 層の確認）
3. `aag/_internal/{meta,strategy,architecture,evolution,source-of-truth,layer-map,operational-classification}.md`（型と原則の確認）
4. `references/01-foundation/`
5. `references/03-implementation/`
6. `references/04-tracking/`（generated/ 配下は ADR-SCP-008 例外条項で machine inferred）
7. `references/02-design-system/`
8. `references/05-aag-interface/`
9. `references/99-archive/`（archive-manifest 存在の場合 ADR-SCP-008 例外条項で machine inferred）
10. `projects/active/`（各 project の AI_CONTEXT / HANDOFF / plan / checklist は project-plan / project-checklist kind で固定）
11. `aag/`（README.md 以外の framework 内部）
12. `docs/contracts/`（schema は ADR-SCP-008 例外条項で machine inferred）

成果物:

- `docs/contracts/src/docs/document-reading-decisions.yaml`（**human/AI authored**、各 docId に対する `proposedKind` / `temporalScope` / `disposition` / `reviewedBy` / `reviewedAtCommit` / `reviewedAtSha` / `rationaleSummary` / `alternativesConsidered`）
- `docs/contracts/generated/document-reading-candidates.generated.json`（**machine inferred**、heuristic candidate の集合）
- `docs/contracts/generated/document-reading-merged.generated.json`（src/ + generated/ の join projection、final disposition view）

disposition 4 分類:

- `keep-and-contract`: 現在の場所・内容で妥当。Document Contract だけ付与する
- `split`: 1 文書に複数責務（present + past + future）が混在 → Phase 5 で分割
- `move`: 内容は有効だが置き場所が違う → Phase 5 で move
- `archive`: 現行の正本ではない → Phase 5 で `references/99-archive/` または `projects/completed/` へ

完了条件（state-based）:

- `reading-coverage` ratio == 100% per managed zone（reading-decisions.yaml entry 数 / inventory entry 数）
- `false-positive` disposition rate < N%（shadow detection との突合）
- `needs-triage` 残数 == 0
- 各 disposition の根拠が `rationaleSummary` で 1〜2 文 articulate されている
- すべての decision に `reviewedBy` / `reviewedAtCommit` / `reviewedAtSha` 必須

### Phase 3: Tree Contract Shadow（2〜3 PR）

> **目的**: Phase 1 の tree-contracts.schema.json と Phase 2 の repo-topology.generated.json を入力に、Tree Contract checker を **advisory** で稼働させる。

対象（不可侵原則 4 に従う MVP scope）:

- `references/` / `aag/` / `aag-engine/` / `projects/` / `docs/contracts/` / `app/src/{domain,application,infrastructure,presentation,features}` / `app/src/test/guards/` / `tools/` / `wasm/`

成果物:

- `docs/contracts/src/repo/tree-contracts.yaml`（宣言確定）
- `docs/contracts/generated/tree-contracts.generated.json`
- `docs/contracts/generated/tree-contract-findings.generated.json`
- `tools/governance/check-tree.ts`（advisory checker）

完了条件: 未宣言 top-level directory finding を出せる + `unmanaged-but-tolerated` を表現できる + new-only gate 設計が articulate されている + advisory のみ。

### Phase 4: Document Kind + Temporal Scope Shadow（2〜3 PR）

> **目的**: Document Kind Registry + Temporal Scope Policy を確定し、shadow checker で誤検知を回収する。

成果物:

- `docs/contracts/src/docs/doc-kind-registry.yaml`（宣言確定）
- `docs/contracts/src/docs/temporal-scope-policy.yaml`（宣言確定）
- `docs/contracts/generated/doc-kind-registry.generated.json`
- `docs/contracts/generated/temporal-scope-policy.generated.json`
- `docs/contracts/generated/temporal-scope-findings.generated.json`
- `tools/governance/check-doc-temporal-scope.ts`（advisory checker）

検出対象（不可侵原則 3 に従う）:

- canonical-doc に `History` / `Roadmap` / `Future` / `TODO` / `Phase` / `Migration Log` heading がある
- canonical-doc に checkbox がある
- canonical-doc に generated count / current status を手書きしている
- canonical-doc に project progress がある
- canonical-doc に旧実装の詳細説明（移行 history）がある

許可される参照（本文展開禁止 + Document ID / Project ID リンク許可）:

- 「詳細な移行履歴は DOC-ARCHIVE-XXX を参照」
- 「今後の再編計画は PROJECT-YYY を参照」

完了条件: 製本/archive/project/generated の分類候補が出る + 過去/未来混入 finding が一覧化される + 誤検知レビュー期間（state-based exit）を Phase 2.5 と並列で開始 + advisory のみ。

### Phase 5: Document Contract Declaration + Rewrite/Move/Archive PRs（多数 PR）

> **目的**: Phase 2.5 Reading Pass で確定した disposition に基づき、(a) Document Contract を doc-registry に拡張宣言、(b) split / move / archive を実行する。
>
> **1 Finding group = 1 PR** を厳守。一括置換禁止（AAG-SCP-MIGRATION-005）。

含むもの:

- `docs/contracts/src/docs/document-contracts.yaml`（宣言確定、Reading Pass `keep-and-contract` 対象から順次）
- `docs/contracts/generated/document-contracts.generated.json`
- doc-registry.json への kind / temporalScope / requiredSections / forbiddenContent additive 拡張
- `tools/governance/check-doc-contracts.ts`（advisory checker）

**PR 分割単位 = zone × disposition**（ADR-SCP-012、AAG-SCP-MIGRATION-005）。具体例:

| PR タイトル | zone | disposition | 想定 PR 数 |
|---|---|---|---|
| `phase5(zone-01-foundation): keep-and-contract` | references/01-foundation | keep-and-contract | 1 |
| `phase5(zone-01-foundation): split-history-to-archive` | references/01-foundation | split | 数件 |
| `phase5(zone-01-foundation): move-to-project` | references/01-foundation | move | 数件 |
| `phase5(zone-03-implementation): keep-and-contract` | references/03-implementation | keep-and-contract | 1 |
| `phase5(zone-03-implementation): move-project-plan-to-projects` | references/03-implementation | move | 数件 |
| `phase5(zone-04-tracking): generated-register` | references/04-tracking | generated-register | 1（一括） |
| `phase5(zone-99-archive): archive-manifest-add` | references/99-archive | archive | 数件 |

想定 PR 数: 15〜25（6 zone × 6 disposition - 空組み合わせ）。同 zone 同 disposition で entry 数 > 10 の場合は kind 単位で分割可（zone × disposition × kind）。詳細: inquiry/07 §10。

完了条件（ratchet-down）:

- `document.unregistered.count` 単調減少 → 0
- `canonical.temporalViolation.count` 単調減少 → 0
- `disposition.unresolved.count` == 0
- 各 PR が Finding group 単位で独立 rollback 可能
- new-only gate 化（advisory → new violation のみ foul）

### Phase 6: AI Instruction Pack（2〜3 PR）

> **目的**: Document Kind ごとの AI 向け JSON guidance を生成する。**post-write validation 限定**（不可侵原則 6）+ **guidance であって命令書ではない**（不可侵原則 11、AAG-SCP-GUIDANCE-003）。
>
> Instruction Pack は AI の出力を機械的に拘束しない。文書 kind ごとに **目的・読者・必須観点・禁止混入・粒度・参照先** を明示し、AI が文脈を取り違えずに能力を発揮するための補助である。

成果物:

- `docs/contracts/src/docs/ai-doc-template-rules.yaml`
- `docs/contracts/generated/ai-doc-instructions.generated.json`
- `aag docs instruction <doc-id>` command（reposteward `aag-engine` に additive 追加、または `tools/governance/` に landing）
- `tools/governance/check-doc-postwrite.ts`（Markdown 作成後に Document Contract **構造的適合性**を機械検証）

完了条件（不可侵原則 11 整合）:

- AI が参照できる文脈パック（Instruction Pack JSON）が生成される
- AI が文書の目的・読者・時間軸・粒度を理解できる
- 作成後に **構造的欠落・混入** が検証できる（requiredSections 欠落 / forbiddenContent 混入 / kind / temporalScope mismatch）
- pre-write 強制機構は実装しない（AI session の自由度を確保）
- 「設計の良し悪し」「表現品質」「比喩の適切さ」は post-write validation の scope 外（AI / human review の責務）

### Phase 7: Required Docs Matrix（2 PR）

> **目的**: repo 構造から必要 doc を導出。

成果物:

- `docs/contracts/src/docs/required-docs-matrix.yaml`
- `docs/contracts/generated/required-docs-matrix.generated.json`
- `tools/governance/check-required-docs.ts`（advisory checker）

検査対象:

- feature-slice (`app/src/features/*`) requires feature-contract
- wasm-module (`wasm/*`) requires calculation-contract + parity-policy
- active project (`projects/active/*`) requires plan / checklist / handoff / projectization / config/project.json（既存 projectDocStructureGuard と整合）
- source-layer requires layer contract

完了条件: missing required doc finding が一覧化される + 初期は advisory + new-only gate のみ foul。

### Phase 8a/8b/8c: Obligation / Required Reads 3 段階 Shadow Migration

> **目的**: 既存 `OBLIGATION_MAP` / `PATH_TO_REQUIRED_READS`（`tools/architecture-health/src/collectors/obligation-collector.ts`）を YAML authoring source へ慎重に移行（不可侵原則 5）。

#### Phase 8a（2 PR）: YAML 追加 + 正規化比較器

- `docs/contracts/src/governance/obligations.yaml`
- `docs/contracts/src/governance/required-reads.yaml`
- `docs/contracts/generated/obligations.generated.json`
- `docs/contracts/generated/required-reads.generated.json`
- 正規化比較器（オブジェクトキー順序 / 評価順を意味的に等価判定する diff checker）
- collector はまだ既存 TS 定数を読む

完了条件: TS 定数と generated JSON の意味的差分 == 0（正規化比較器で確認）+ shadow check で drift がないこと。

#### Phase 8b（1 PR）: collector 切替

- `obligation-collector.ts` を generated JSON 読みに切替
- TS 定数は **deprecated shim** として短期間残置（呼び出し側がまだ参照可能）
- new-only gate: 新規 obligation 追加は YAML のみ許可

完了条件: collector が generated JSON を入力に動作 + architecture-health pipeline が PASS 維持 + TS 定数は shim 状態。

#### Phase 8c（1 PR）: TS 定数削除

- `OBLIGATION_MAP` / `PATH_TO_REQUIRED_READS` の TS 定数を削除
- 呼び出し側が 0 件であることを grep で確認
- generated JSON が唯一 machine contract

完了条件: TS 定数削除 + 全テスト PASS + architecture-health pipeline 不変。

### Phase 9: Artifact Coverage Gate（2 PR）

> **目的**: 未管理 artifact をすべて declared / generated / archived / external / temporary-with-expiry / ignored-with-reason のいずれかに分類する。

成果物:

- `docs/contracts/src/governance/artifact-coverage.yaml`
- `docs/contracts/src/governance/generated-artifacts.yaml`
- `docs/contracts/generated/artifact-coverage.generated.json`
- `docs/contracts/generated/generated-artifacts.generated.json`
- `docs/contracts/generated/unmanaged-artifacts.generated.json`
- `tools/governance/check-coverage.ts`（advisory checker）

完了条件:

- generated artifact producer 不明を検出
- ignored / temporary には owner / reason / reviewAfter / expiresAt 必須
- 初期は inventory、次に new-only gate

### Phase 10: Runner Parity Contract（1〜2 PR）

> **目的**: pre-push / CI / npm scripts / aag-engine advisory checks の必須 step drift を検出する。

成果物:

- `docs/contracts/src/governance/runner-parity.yaml`
- `docs/contracts/generated/runner-parity.generated.json`
- `tools/governance/check-runner-parity.ts`（advisory checker）

対象:

- pre-push hook (`tools/git-hooks/pre-push`)
- CI workflow (`.github/workflows/`)
- package.json scripts
- aag-engine CI（reposteward 由来）
- 既存の `docs:check` / `test:guards` / `aag self-check` / `aag chaos run`

完了条件: pre-push / CI / npm scripts / aag-engine の必須 step driftを検出 + advisory から開始 + Core gate 成熟後に hard gate 化（user 判断、別 program 候補）。

## やってはいけないこと

> **CLAUDE.md G8 整合**: 「気をつける」（exhortation）ではなく **mechanism として運用** する。
> 仕組み化可能なものは **CI level で foul させる検出装置**を articulate し、仕組み化できないものは AI / human review の責務として明示する（不可侵原則 11 + ADR-SCP-014 + AAG-SCP-GUIDANCE-005）。

### A. CI level で foul させる仕組みあり（mechanism articulated、§A1 + §A2 に細分）

§A はさらに 2 分類（GUIDANCE-007）:

- **§A1: AAG Core 永続 checker** — 全 repo / 全 program に普遍適用、`tools/governance/` 配下、本 program archive 後も残置
- **§A2: project-scoped AI tool** — 本 program 固有の制約、`projects/active/aag-structural-control-plane/aag/scp-checkers/` 配下、archive 時に Archive v2 §6.4 で物理削除、AI が `aag scp check --project aag-structural-control-plane <checker>` で呼び出し可能

各項目に **検出装置 + landing phase + 区分（A1/A2）** を articulate。Phase 1+ で実装され、advisory → new-only gate → hard gate の段階で foul。

#### §A1: AAG Core 永続 checker（`tools/governance/`、archive 後も残置）

| やってはいけないこと | 違反根拠 | 検出装置 | landing phase |
|---|---|---|---|
| **YAML を AAG machine truth として採用する** | 不可侵原則 1 / ADR-SCP-001 | `tools/governance/check-yaml-machine-truth.ts`（detector / CI / AAG CLI が `*.yaml` を直読する import を grep 検出） | Phase 1 |
| **Document Contract を doc-registry.json と並立させる** | 不可侵原則 2 / ADR-SCP-002 | `tools/governance/check-doc-contracts.ts`（新 namespace `DOC-DEF-*` 等の prefix を doc-registry 外で検出すれば finding） | Phase 5 |
| **製本に過去/未来を本文展開する** | 不可侵原則 3 / ADR-SCP-003 | `tools/governance/check-doc-temporal-scope.ts`（canonical-doc kind の文書に History / Roadmap / Future / TODO / Phase / Migration Log heading + checkbox + 禁止表現 patterns 検出） | Phase 4 |
| **Tree Contract MVP scope を超えて全ディレクトリを宣言する** | 不可侵原則 4 / ADR-SCP-004 | `tools/governance/check-tree.ts`（tree-contracts.yaml の declared directory 数が baseline + N を超えれば finding、ratchet-down） | Phase 3 |
| **AI Instruction Pack を pre-write 強制機構として実装する** | 不可侵原則 6 / ADR-SCP-006 / AAG-SCP-GUIDANCE-003 | `tools/governance/check-no-prewrite-hook.ts`（git pre-commit / pre-push hook に Markdown 編集前 instruction-pack 取得強制があれば finding） | Phase 6 |
| **YAML 変更後の generated JSON 未更新** | 不可侵原則 1 補強 | 既存 `docs:check` mechanism（pre-push hook で live recalc + semantic diff）に YAML→JSON normalize 検証を追加 | Phase 1 |
| **実装 AI による自己承認** | L3 + requiresHumanApproval=true | 既存 `projectizationPolicyGuard` PZ-13（最終レビュー section 存在 + ordering 検証）+ `projectCompletionConsistencyGuard` C1（completed 判定後の archive obligation） | 既存 mechanism 利用 |

#### §A2: project-scoped AI tool（`projects/active/aag-structural-control-plane/aag/scp-checkers/`、archive で消失）

各 checker は AI が `aag scp check --project aag-structural-control-plane <checker>` で呼び出し可能。Archive v2 §6.4 で project の `aag/` folder ごと物理削除されるため、archive 後は invocation 不能（restore 経由でのみ復活）。

| やってはいけないこと | 違反根拠 | 検出装置（project-scoped） | landing phase |
|---|---|---|---|
| **OBLIGATION_MAP / PATH_TO_REQUIRED_READS を一発切替する** | 不可侵原則 5 / ADR-SCP-005 | `aag scp check obligation-migration-staging`（Phase 8a で正規化比較器、TS 定数と generated JSON の意味的差分機械検証 + commit history で Phase 8a→8b→8c 段階順序検証） | Phase 8a/8b/8c |
| **Reading Pass を機械分類で代替する** | 不可侵原則 7 / ADR-SCP-007 / ADR-SCP-008 | `aag scp check reading-pass-review`（document-reading-decisions.yaml の各 entry に reviewedBy / reviewedAtCommit / reviewedAtSha が必須、`generated-report` / `archive-doc` 例外条項該当外で machine-inferred 表記があれば finding） | Phase 2.5 |
| **Phase 順序を逆行させる** | 不可侵原則 9 | `aag scp check phase-ordering`（commit history で Phase N+1 の成果物が Phase N より前に landing していれば finding、各 phase の sentinel artifact 存在確認） | Phase 1 |
| **Wave 1 milestone 到達前に Hard Gate を追加する** | 不可侵原則 8 | `aag scp check hard-gate-count`（pre-push / CI に新規 hard-gate step が追加されれば finding、advisory のみ許可） | Phase 1 |
| **`docs/contracts/aag/*.schema.json` を `docs/contracts/schema/` に再配置する** | ADR-SCP-002 / projectization.md §4 nonGoal | `aag scp check docs-contracts-aag-untouched`（git log で `docs/contracts/aag/` 配下に move / delete が発生すれば finding） | Phase 0 完了後即時 |
| **app/src/ 配下を touch する** | projectization.md §4 nonGoal | `aag scp check app-untouched`（本 program branch で `app/src/` 配下に変更があれば finding、scopeJsonGuard 整合） | Phase 0 完了後即時 |
| **業務 logic / domain calculations / readModels を変更する** | projectization.md §4 nonGoal | 上記 `app-untouched` に統合 + `app/src/domain/calculations/` / `app/src/application/readModels/` への変更検出 | Phase 0 完了後即時 |
| **既存 references/99-archive/ への大量 docs 移動を 1 PR で実行する** | AAG-SCP-MIGRATION-005 | `aag scp check finding-group-pr`（PR 内で異なる zone × disposition の Finding group が混在すれば finding、PR description の `Finding group:` annotation 必須） | Phase 5 |
| **Reading Pass 中に対象 zone 内の文書本体を編集する** | AAG-SCP-MIGRATION-006 | 上記 `reading-pass-review` に統合（Reading Pass 期間中の対象 zone 編集を git log で検出、frontmatter docId 付与のみ許可） | Phase 2.5 |
| **新 doc を references/ に新規追加する** | 本 program scope 外 | `aag scp check no-new-references-doc`（本 program branch で `references/` 配下に新 .md 追加があれば finding、ただし inquiry/ や Reading Pass split target は ADR-SCP-011 disposition に従い許可） | Phase 0 完了後即時 |
| **inquiry/ にすべての検証結果を集約する** | inquiry/ は skeleton 限定 | `aag scp check inquiry-scope`（inquiry/*.md 内に generated artifact path / KPI 数値が直書きされていれば finding、generated/ への参照のみ許可） | Phase 1 |

#### §A2 → §A1 promotion 経路

本 program 期間中に「universal な rule」と判明した §A2 checker は、archive 直前に user 判断で **§A1 に promote**:

1. checker 実装を `projects/active/aag-structural-control-plane/aag/scp-checkers/<checker>.ts` から `tools/governance/check-<checker>.ts` へ move
2. `aag scp check <checker>` 呼び出し経路を維持しつつ、pre-push / CI へ統合
3. promotion record を `decision-audit.md` に articulate（DA-α-N の振り返り判定として）
4. archive プロセスで §A2 checker 群が削除されても、promotion 済 §A1 は残置

### B. 仕組み化できない（AI / human review が判定する + 再チェック機会を提供する）

設計判断・表現品質・文脈解釈に属するもの。**Gate / checker の責務ではない**が、**AI / human review に放置せず、再チェック機会を構造的に提供する**（不可侵原則 11 / AAG-SCP-GUIDANCE-002〜004 / **GUIDANCE-006**）。

各項目に **再チェック trigger（いつ）+ 文脈提供 surface（どこで）** を articulate:

| やってはいけないこと | 違反根拠 | 再チェック trigger | 文脈提供 surface |
|---|---|---|---|
| 設計判断・表現品質・文脈解釈を機械検証 scope に含める | 不可侵原則 11 / GUIDANCE-002 | 新 checker 設計時 / new-only gate 昇格時 | `docs/contracts/src/governance/check-design-intent.yaml`（各 checker の design intent / scope 境界を articulate、checker 実装前に AI 確認） + ADR review window |
| Instruction Pack を AI への命令書として扱う | 不可侵原則 11 / GUIDANCE-003 | AI が Instruction Pack を初参照する時 / Markdown 作成前 | Instruction Pack JSON の頭に `philosophy` block を articulate（"This is guidance, not a command. Adapt to context."） + Instruction Pack の `requiredSections` は guideline であって template ではないと明示 |
| Gate を AI 失敗装置として設計する | 不可侵原則 11 / GUIDANCE-004 | 新 checker 設計時 / 既存 checker の severity 引き上げ時 | 同上 `check-design-intent.yaml`（"Gate detects structural break, not bad judgement"） + ADR-SCP-014 への back link |
| Reading Pass の `rationaleSummary` の内容妥当性 | GUIDANCE-002（schema は §A で構造検証、文章品質は §B） | Phase 5 PR review 時 / Reading Pass entry の stale 検出後の再 review 時 | Phase 5 PR description template の「rationaleSummary 妥当性確認」prompt + reading-decisions.yaml の `alternativesConsidered` field（ADR-SCP-010 既 articulate）が AI に「他案も検討した」事実を再認識させる |
| ADR の `rationale` / `alternatives` の articulation 品質 | GUIDANCE-002 | wrap-up commit 時の Lineage update / archive 時の `振り返り判定` articulation | ADR template の `振り返り判定` section（既存）+ 「alternatives は最低 2 件」guideline + archive.manifest.json `decisionEntries` への要約圧縮時の再評価 |
| 文書間の責務境界の妥当性 / kind 選択妥当性 | GUIDANCE-002（kind 設定は §A で構造検証、kind 選択妥当性は §B） | doc-registry kind 設定時 / Reading Pass disposition 確定時 / kind 変更 PR 時 | `docs/contracts/src/docs/doc-kind-registry.yaml` の各 kind に `discriminationGuide` field（"kind A vs kind B の判別観点"、Phase 4 で articulate） + Reading Pass の `alternativesConsidered` field |

> **soft mechanism の articulate**: §B は guard / CI で foul させないが、**再チェック機会を構造的に提供** することで AI session が defensive に振る舞わず、自由判断と妥当性確認を両立できる。AAG philosophy「製本されないものを guard 化しない」+「気をつけるではなく mechanism として運用」（CLAUDE.md G8）の両立。
>
> **AI 自己レビュー section（既存 PZ-13）との関係**: §B 全項目は archive 前に **AI 自己レビュー 5 軸**（総チェック / 歪み検出 / 潜在バグ確認 / ドキュメント抜け漏れ確認 / CHANGELOG 更新）で最終再評価される。本 program archive 時に必ず通過する gate であり、§B 項目の取りこぼしを抑止する最後の安全網。

### 機械検証する（Gate scope）vs 定性的に AI を導く（Guidance scope）

不可侵原則 11 / ADR-SCP-014 / AAG-SCP-GUIDANCE-005 に従う分離:

| 機械検証する（Gate scope = §A） | 定性的に AI を導く（Guidance scope = §B） |
|---|---|
| 未登録 Markdown | この文書は何のためにあるか |
| requiredSections 欠落 | 読者は誰か |
| generated artifact の producer 不明 | どの粒度で説明すべきか |
| generated file の手編集 | 何を判断材料として扱うか |
| doc kind / topology mismatch | 過去・現在・未来をどう分けるか |
| 製本に TODO / Roadmap section | どのような設計思想を優先するか |
| 例外に owner / reason / reviewAfter なし | どの文脈を参照すべきか |
| YAML 変更後の generated JSON 未更新 | 比喩 / 表現の適切さ |

左側 §A だけが foul 可能な構造ルールであり、本 program で **検出装置を articulate + 実装** する。右側 §B は AI / human review の責務であり、AAG が無理に数値化しない。

## 関連実装

| パス | 役割 |
|---|---|
| `docs/contracts/doc-registry.json` | 既存 document registry（Phase 5 で kind / temporalScope / requiredSections additive 拡張、置換しない） |
| `docs/contracts/aag/*.schema.json` | 既存 AAG contract schema（本 program で touch しない、`docs/contracts/schema/` への再配置はしない = ADR-SCP-002） |
| `docs/contracts/schema/` | 本 program で新設する schema 配置（`aag-finding` / `tree-contracts` / `doc-kind-registry` / `document-contracts` / `temporal-scope-policy` / `required-docs-matrix` / `artifact-coverage` / `generated-artifacts` / `obligations` / `required-reads` / `runner-parity`） |
| `docs/contracts/src/` | 本 program で新設する authoring source（`repo/` / `docs/` / `governance/` 配下に YAML） |
| `docs/contracts/generated/` | 本 program で新設する machine truth（detector / CI / AAG CLI / architecture-health の入力） |
| `tools/governance/` | 本 program で新設する checker / scaffolder / normalizer 群 |
| `tools/architecture-health/src/collectors/obligation-collector.ts` | 既存 `OBLIGATION_MAP` / `PATH_TO_REQUIRED_READS` 正本（Phase 8a で YAML 追加、Phase 8b で読み込み切替、Phase 8c で TS 定数削除） |
| `aag-engine/internal/selfcheck/selfcheck.go` | 既存 self-check（V1〜V7 の 7 軸、Phase 0 inquiry で正本照合） |
| `aag-engine/cmd/aag/command_selfcheck.go` | 既存 self-check command layer（Phase 0 inquiry で internal package との drift を Finding 化） |
| `app/src/test/guards/manifestGuard.test.ts` | 既存 manifest guard（`.claude/manifest.json` の検証、本 program は touch しない） |
| `app/src/test/guards/projectizationPolicyGuard.test.ts` | 既存 projectization policy guard（PZ-1〜PZ-14、本 program checklist は PZ 全準拠） |
| `app/src/test/guards/checklistFormatGuard.test.ts` | 既存 checklist format guard（F1〜F5、本 program checklist は F 全準拠） |
| `app/src/test/guards/projectCompletionConsistencyGuard.test.ts` | 既存 project completion consistency guard（C1〜C4 / L1〜L3、本 program は archive 移行時に C / L 準拠） |
| `references/05-aag-interface/operations/project-checklist-governance.md` | AAG Layer 4A 共通運用、本 program checklist は §3 / §6 / §10 / §13 全準拠 |
| `references/05-aag-interface/operations/projectization-policy.md` | AAG-COA 判定、本 program は Level 3 / governance-hardening / requiresHumanApproval=true |
| `aag/_internal/strategy.md` / `architecture.md` / `evolution.md` / `source-of-truth.md` | AAG 戦略 / 5 層構造 / 進化方針 / 正本ポリシー（本 program の判断土台） |
| `projects/active/reposteward-ai-ops-platform/` | substrate 提供 program（Task Capsule / Parameters / SourceFacts / DetectorResult を本 program が消費） |
