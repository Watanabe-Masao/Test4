# checklist — aag-structural-control-plane

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 常時チェック / 恒久ルールは plan.md に書く。
>
> 規約: `references/05-aag-interface/operations/project-checklist-governance.md` §3。
> 形式: `- [ ]` または `- [x]` の半角スペース。ネスト不可。
>
> **Phase 0 完了 + Wave 1 readiness ticked-out**（ADR-SCP-016）。Wave 1 / 2 / 3 各 Phase の checkbox は当該 Wave 着手時 + user 承認後に追記する（不可侵原則 9 = 順序逆行禁止）。Separate Program candidate（Phase 8a/8b/8c + Phase 10）は本 program scope 外、checklist 化しない。

## Phase 0: ADR + Existing Asset Mapping（COMPLETE）

> **完遂判定**: ADR-SCP-016 landing commit で Phase 0 acceptance criteria 全 36 項目満足。本 commit 後の `docs:generate` で project-health の progress に反映される。

- [x] `projects/active/aag-structural-control-plane/` 配下 8 ファイル一式 landing（AI_CONTEXT / HANDOFF / plan / checklist / decision-audit / discovery-log / projectization / config/project.json）
- [x] `inquiry/` 6 ファイル landing（01-existing-contract-assets / 02-existing-yaml-inventory / 03-doc-registry-extension-strategy / 04-self-check-substrate-sync / 05-obligation-migration-strategy / 06-temporal-scope-shadow-policy）
- [x] `references/04-tracking/open-issues.md` の active projects 索引に本 project 追加
- [x] `cd app && npm run docs:generate` で project-health に新 project が `derivedStatus = in_progress` として登録される
- [x] `cd app && npm run test:guards` PASS（projectizationPolicyGuard / checklistFormatGuard / projectCompletionConsistencyGuard / projectDocStructureGuard 等 全件）
- [x] DA-α-000（進行モデル decision）を decision-audit.md に articulate
- [x] ADR-SCP-001（YAML authoring / JSON machine truth）を decision-audit.md に articulate
- [x] ADR-SCP-002（Document Contract は doc-registry.json の拡張層）を decision-audit.md に articulate
- [x] ADR-SCP-003（製本 = 現在 / archive = 過去 / project = 未来 / generated report = 計算済み現在）を decision-audit.md に articulate
- [x] ADR-SCP-004（Tree Contract MVP scope は top-level + structural roots のみ）を decision-audit.md に articulate
- [x] ADR-SCP-005（OBLIGATION_MAP は 3 段階 shadow migration）を decision-audit.md に articulate
- [x] ADR-SCP-006（AI Instruction Pack は post-write validation 限定）を decision-audit.md に articulate
- [x] ADR-SCP-007（Reading Pass 成果物の保存規約）を decision-audit.md に articulate
- [x] ADR-SCP-008（Machine inferred で accepted 扱いとする kind の例外条項）を decision-audit.md に articulate
- [x] ADR-SCP-009（Reading entry の stale 検出と再レビュー基準）を decision-audit.md に articulate
- [x] ADR-SCP-010（Reading Pass 記録フォーマット最小 schema）を decision-audit.md に articulate
- [x] ADR-SCP-011（disposition taxonomy を 6 分類に拡張: + generated-register / + needs-triage）を decision-audit.md に articulate
- [x] ADR-SCP-012（Phase 5 PR 分割基準 = zone × disposition）を decision-audit.md に articulate
- [x] ADR-SCP-013（Finding schema 最小 field set: id / severity / phase / subject / rule / problem / expected / suggestedDisposition / confidence / falsePositiveAllowed / detectedBy / detectedAt / status）を decision-audit.md に articulate
- [x] ADR-SCP-014（Guidance over restriction: AAG SCP 思想 + AAG-SCP-GUIDANCE-001〜007 + 定量/定性分離 + 合言葉更新 `Plan → Context → Contract → Guidance → Gate` + やってはいけないこと §A1/§A2/§B 3 分類 + §A1 永続 checker + §A2 boundary protection guardrail + §B 再チェック機会 + ガードレール metaphor）を decision-audit.md に articulate
- [x] ADR-SCP-015（Phase 1 implementation prep: D1 §A2 declarative YAML + common runner / D2 git diff baseRef 4 段階解決 / D3 hard-gate-count → hard-gate-surface + baseline 比較 / D4 no-new-references-doc 5 例外条件 + rename detection）を decision-audit.md に articulate
- [x] ADR-SCP-016（Wave restructuring 採用: D1 Phase 0〜10 → Wave 1/2/3 + Separate Program candidate / D2 §A1 checker Wave 配置 / D3 verified-zero finding 許容 / D4 hard-gate-surface baseline 構造明示 / D5 §A2 declarative checker + common runner 再強調 / D6 Phase 0 完了判定 / D7 inquiry/08 採用済み）を decision-audit.md に articulate
- [x] ADR-SCP-017（AAG SCP Constitutional Layer = Meaning / Intent / Will / Continuity 最上位原則: D1 AAG-SCP-MEANING-001〜005 / D1.5 AAG-SCP-CONTINUITY-001〜005 / D2 3-layer 思考モデル / D3 AAG 再定義 / D4 Mechanical/Guidance 分離 / D5 ADR 階層 / D6 artifact field articulate / D7 最上位原則 section institute）を decision-audit.md に articulate
- [x] ADR-SCP-018（AAG SCP Ideal-first / Gap-driven 基本作法 = MEANING+CONTINUITY の operational approach: D1 AAG-SCP-DESIGN-001〜005 / D2 8 step 標準フロー / D3 5 areas application / D4 不可侵原則 12 articulate）を decision-audit.md に articulate
- [x] ADR-SCP-019（Parse2 Re-articulation = Skeleton-aware Inventory、DESIGN の Tree Contract concrete application: D1 AAG-SCP-PARSE2-001〜005 / D2 Phase 2A/B/C/D 再分解 / D3 Phase 3 役割変更 / D4 skeleton-diff 6 分類 / D5 Inventory entry 必須 field / D6 1918202 リファクタ方針 / D7 Parse2 でやらないこと / **D8 Operational decision criteria 抜け殻化防止: status 判定基準 + Evidence + status 別 contextQuestion テンプレート + reasonCode 12 codes + 昇格禁止条件**）を decision-audit.md に articulate
- [x] plan.md「やってはいけないこと」が §A1（AAG Core 永続、11 件、Wave 配置 articulate）/ §A2（project-scoped boundary protection、**4 件のみ**、archive で消失）/ §B（仕組み化不可、6+ 件）に 3 分類されている
- [x] §A1 各項目に検出装置 path（`tools/governance/check-*.ts` または既存 mechanism 拡張、parse-heavy 含む）+ Wave / landing phase が articulate されている（GUIDANCE-005 + ADR-SCP-016 D2）
- [x] §A2 が boundary protection（触ってはいけない / 変更してはいけない / 崩してはいけない）4 件に限定されている: `app-untouched` / `docs-contracts-aag-untouched` / `no-new-references-doc` / `hard-gate-surface`
- [x] §A2 各 checker が parse-free（`git diff --name-only` / `grep` のみ）+ phase 不変（全期間一貫禁止）であることが articulate されている（GUIDANCE-007）
- [x] §A2 checker が archive 時に Archive v2 §6.4 で物理削除されることが articulate されている
- [x] aag/scp-checkers/README.md が landing し、4 checker の boundary protection image / 検出ロジック / 設計原則が articulate されている
- [x] §B 各項目に再チェック trigger + 文脈提供 surface が articulate されている（GUIDANCE-006、`check-design-intent.yaml` / Instruction Pack `philosophy` block / `discriminationGuide` field 等）
- [x] §A2 metaphor「AI が安心してアクセルを踏むための事前ガードレール」が ADR-SCP-014 / AI_CONTEXT.md / scp-checkers/README.md に articulate されている
- [x] inquiry/01: 既存 `docs/contracts/aag/*.schema.json`（10 schemas）を棚卸し、本 program の新 schema との配置関係を articulate
- [x] inquiry/02: 既存 YAML 4 件（`.coderabbit.yaml` / `references/04-tracking/*-inventory.yaml` 3 件）を 5 分類（declaration / inventory / generated-input / legacy / unknown）で articulate
- [x] inquiry/03: 既存 `doc-registry.json`（138KB）の構造を確認し、kind / temporalScope / requiredSections の additive 拡張ポイントを articulate
- [x] inquiry/04: `aag-engine/internal/selfcheck/selfcheck.go`（V1〜V7）と `command_selfcheck.go`（V1〜V5 のみ）の drift を確認し、最初の Finding として記録
- [x] inquiry/05: 既存 `OBLIGATION_MAP` / `PATH_TO_REQUIRED_READS`（`tools/architecture-health/src/collectors/obligation-collector.ts` L43 / L201）の構造を確認し、Phase 8a 正規化比較器の必要要件を articulate
- [x] inquiry/06: 既存 `references/99-archive/` の archive-manifest 有無を確認し、ADR-SCP-008 例外条項の trigger 条件（archive-manifest exists）を articulate
- [x] inquiry/07: Phase 0 acceptance criteria 10 項目（高 #1〜#5 + 次点 #6〜#10）が articulate されている — Phase 1 schema 設計の入力として確定
- [x] inquiry/08: Wave restructuring 棚卸し（Phase 0〜10 → Wave 1/2/3 + Separate Program candidate 4 分類 + Wave 1 exit criteria 数値化 + 中止条件 + 価値検証ポイント）が articulate されている — ADR-SCP-016 で正式採用

## Wave 1 readiness（Wave 1 着手前の確認、ADR-SCP-016 D6 整合）

> **役割**: Wave 1（Phase 1 → Phase 2 → Phase 3）着手の前提条件 articulate。本 section の checkbox はすべて `[x]` 状態で Wave 1 着手判断する。Wave 1 内 Phase の作業 checkbox は Wave 1 着手時に追記する。

- [x] plan.md が Wave 1 / Wave 2 / Wave 3 / Separate Program candidate 構造に refactor されている（ADR-SCP-016 D1）
- [x] plan.md §A1 checker table に Wave 配置 column が articulate されている（ADR-SCP-016 D2）
- [x] plan.md §A2 hard-gate-surface entry に baseline 構造（baselineCommit / baselineAt / surfaces / knownHardGateSurfaces）が articulate されている（ADR-SCP-016 D4）
- [x] Wave 1 exit criteria が数値化されている（managed zone == 4 / 追加 schema ≤ 3 / 新 §A1 checker ≤ 3 / §A2 = 4 / 誤検知未解決 == 0 / new-only gate 未導入 / valid finding または verified-zero finding を出せる / 運用コスト articulate 済）
- [x] Wave 1 中止条件が articulate されている（誤検知率 > 30% / Reading Pass 人手負荷過大 / 既存 program 責務衝突 / valid + verified-zero finding ともに不能 / 他 program 進行影響）
- [x] inquiry/08 冒頭に「ADR-SCP-016 で採用済み」note + §5 verified-zero finding articulate
- [x] AI_CONTEXT.md の Read Order が Wave 構造を反映している
- [x] Wave 1 着手 user 承認（次の PR で Phase 1 着手判断、本 commit の review window で確認）

## Wave 1 / Phase 1: Schema MVP（縮小: 最小 3 schema、3〜4 sub-PR）

> **Wave 1 narrowing（ADR-SCP-016 D1）**: 元計画 5 schema → **最小 3 schema**（aag-finding + tree-contracts + 最小 doc-kind-registry）。document-contracts.schema.json + temporal-scope-policy.schema.json は **Wave 2** へ後ろ倒し。
>
> **sub-PR 構造**（独立 rollback 可能、PR 単位 review）:
> - sub-PR 1: aag-finding.schema.json（Finding 共通 schema、ADR-SCP-013 + ADR-SCP-016 D3 result discriminator 統合）
> - sub-PR 2: tree-contracts.schema.json + repo/tree-contracts.yaml authoring source 雛形
> - sub-PR 3: doc-kind-registry.schema.json（最小 schema、Phase 4 で本宣言）+ docs/doc-kind-registry.yaml authoring source 雛形
> - （optional）sub-PR 4: schema validation test infrastructure（既存 ajv 等が利用可能なら省略可）

### sub-PR 1: aag-finding.schema.json

- [x] `docs/contracts/schema/` ディレクトリ作成（既存 `docs/contracts/aag/` とは別 namespace、ADR-SCP-002 整合）
- [x] `docs/contracts/schema/aag-finding.schema.json` landing — ADR-SCP-013 13 fields + ADR-SCP-016 D3 result discriminator（valid-finding / verified-zero）統合
- [x] valid-finding case: `severity` / `subject` / `rule` / `problem` / `expected` / `suggestedDisposition` / `confidence` / `falsePositiveAllowed` 必須（ajv で確認済）
- [x] verified-zero case: `scope` / `evidence`（scannedFiles / drift / scannedAt）/ `rationale` 必須（ajv で確認済）
- [x] Finding ID prefix `FND-SCP-` で grep 可能（Document ID `DOC-` と区別、pattern validation 含む）
- [x] schema 自体が JSON Schema **draft-07** として valid（既存 AAG schemas 8 件と同 family、Ajv 既定 dialect）
- [x] schema が AAG-SCP の ID prefix（`FND-SCP-`）を documentation コメント + pattern validation で articulate

### sub-PR 2: tree-contracts.schema.json + authoring source 雛形

- [x] `docs/contracts/schema/tree-contracts.schema.json` landing — top-level 8 directory の declared / unmanaged-but-tolerated 状態を表現（status enum 2 値 + scope enum 3 値 + metadata block optional + path pattern 構造ルート対応）
- [x] `docs/contracts/src/repo/` ディレクトリ作成
- [x] `docs/contracts/src/repo/tree-contracts.yaml` authoring source 雛形 landing（宣言は Phase 3 で確定、本 sub-PR では `docs/contracts/` 1 entry の schema 形式 example のみ）
- [x] schema 自体が JSON Schema draft-07 として valid（ajv 7 test cases: yaml 雛形 + unmanaged-but-tolerated + nested path + 4 invalid cases、全件期待通り）

### sub-PR 3: doc-kind-registry.schema.json（最小） + authoring source 雛形

- [x] `docs/contracts/schema/doc-kind-registry.schema.json` landing — kind / temporalScope / lifecycle の最小 enum + extensibility（kind id pattern + stage enum で Wave 2 Phase 4 へ extensibility 確保、ADR-SCP-003 4 temporal scopes + ADR-SCP-008 例外条項 articulate）
- [x] `docs/contracts/src/docs/` ディレクトリ作成
- [x] `docs/contracts/src/docs/doc-kind-registry.yaml` authoring source 雛形 landing（stage = minimum、4 entries = canonical-doc / project-plan / archive-doc / generated-report で 4 temporal scope spectrum + ADR-SCP-008 exception 1 件ずつ articulate、本宣言は Wave 2 Phase 4）
- [x] schema 自体が JSON Schema draft-07 として valid（ajv 7 test cases: yaml 雛形 + extended stage + 5 invalid cases、全件期待通り）

### Phase 1 完了条件（ADR-SCP-016 整合）

- [x] 3 schema が JSON Schema draft-07 として valid（既存 `docs/contracts/aag/*.schema.json` 同様の検証パターン、Ajv 既定 dialect）
- [x] Finding ID prefix `FND-` で grep 可能（Document ID `DOC-` と区別）
- [x] Finding result field が `valid-finding` / `verified-zero` を articulate（ADR-SCP-016 D3）
- [x] hard gate 追加なし（advisory only、Wave 1 不可侵原則 8 整合）
- [x] Wave 1 / Phase 2 着手 user 承認

## Wave 1 / Phase 2: Skeleton-aware Parse（再定義 = ADR-SCP-019 PARSE2、4 sub-PR = Phase 2A/B/C/D）

> **再定義（ADR-SCP-019 PARSE2 整合）**: Inventory は現状承認ではない。先に定義した **Structural Skeleton に照らして repo を観察**し、in-skeleton / out-of-skeleton / missing-expected / unexpected-child / inside-unmanaged-zone / observed-only を分類する。**Gap は即違反ではなく、Phase 3 以降の調査・再計画対象**として扱う（最上位原則 MEANING + CONTINUITY 整合、不可侵原則 12 整合）。
>
> **AAG-SCP-PARSE2-001〜005**:
> - Parse2 は現状承認ではない / observed-only として articulate / Skeleton 先定義 / out-of-skeleton は精査対象 / 昇格には rationale 必要
>
> **中心 articulate**: **Inventory is not approval. Correct location is not proof of necessity.**
>
> **既存 commit `1918202` 扱い（ADR-SCP-019 D6）**: 旧 Phase 2 sub-PR 1（4 zone 横断観測、commit `1918202`）は Phase 2B 着手時に refactor（scope を top-level-only に narrow + observed-only field 追加 + 出力 JSON 上書き）。`1918202` 自体は revert / amend しない（履歴保持）。再帰 zone 処理は Phase 2D で file-level inventory として再実装。
>
> **Phase 2 でやらないこと（ADR-SCP-019 D7）**: Document Contract 確定 / 文書移動 / archive / delete / hard gate 追加 / generated JSON を machine truth として consumer に読ませる / observed を approved に昇格 / out-of-skeleton を即違反として fail
>
> **Parse2 entry 必須 field**（ADR-SCP-017 D6 + ADR-SCP-019 D5、不可侵原則 12〜14 整合）:
> - **Status**: observed / inventoryStatus / skeletonStatus / **meaningStatus** (explained/candidate/unexplained) / **intentStatus** (declared/inferred/unknown/missing) / **continuityStatus** (active/inherited/stale/unreviewed/absent)
> - **Disposition**: candidateDisposition (= Gap 7 分類: fix / revise-skeleton / promote / move / archive / tolerate / delete-candidate / needs-triage)
> - **Reason**: reasonCode (OUT_OF_SKELETON / NO_PURPOSE / NO_OWNER / CORRECT_LOCATION_BUT_UNEXPLAINED 等)
> - **Questions**（Guidance 入力）: contextQuestion / futureQuestion / changeQuestion / requiredQuestion
> - **Constraint flags**（一律 false）: preservationAssumed / preferenceBasedDecisionAllowed / localConvenienceDecisionAllowed / promotionAllowed
> - **Context Pipeline hooks**（不可侵原則 15 = CONTEXT 整合、Wave 1 hooks のみ、Wave 2/3 で full pipeline）: contextPackRequired (=true) / contextDepthHint (= L0〜L6 範囲)
> - **Other**: contractStatus (= unreviewed)

### Phase 2A (sub-PR 1): Structural Skeleton declaration

- [x] `docs/contracts/src/repo/tree-contracts.yaml` を 1 entry 雛形 → **top-level 8 root の declared 状態に拡張**（references/ / aag/ / aag-engine/ / projects/ / docs/contracts/ / app/ / tools/ / wasm/）
- [x] 各 entry に purpose / owner articulate（free-form、ADR-SCP-004 整合）
- [x] declared 状態の articulate と並行して、unmanaged-but-tolerated 候補（.github/ / .claude/ / .vscode/）を articulate（promotionRationale で declared 昇格保留 rationale を articulate）
- [x] tree-contracts.yaml の最終版が ajv で valid（JSON Schema draft-07 整合、Phase 1 sub-PR 2 で landed schema、合計 11 entries: 8 declared + 3 unmanaged-but-tolerated）
- [x] 各 declared entry に childPolicy articulate（child directory rule、§A2 boundary protection との整合 + 本 program scope と他 program scope の articulate）
- [x] Ideal-first 原則整合: 実存する top-level dir のうち、planned 8 + dotfile 3 のみ skeleton に articulate。残り (`app-domain/` / `fixtures/` / `roles/` / `scripts/` / `workers/` / `docs/` / `docs/generated/` 等) は Phase 2C skeleton-diff で `out-of-skeleton` または `inside-unmanaged-zone` として surface、user 判断対象（AAG-SCP-MEANING-002 + DESIGN-001/002 整合 = 存在 ≠ 必要性の証明）
- [x] generator はまだ無い（Phase 2B で landing 予定）

### Phase 2B (sub-PR 2): repo topology parser リファクタ + observed-only field 追加

- [x] `tools/governance/build-repo-topology.mjs` を refactor:
  - scope を `managed-zone-4` → `top-level-only` に narrow
  - 再帰 zone (projects/ + references/04-tracking/ + docs/contracts/) を削除
  - entry に `observed: true` / `inventoryStatus: "observed-only"` field 追加
- [x] `docs/contracts/generated/repo-topology.generated.json` を上書き（旧 4 zone 出力 → 新 top-level-only 出力）
- [x] 上書きで content 大幅変更（旧 881 entries → 新 26 entries: 15 directories + 11 files、想定 ~30 entries 範囲内）
- [x] 旧 zones[] structure を flat entries[] に simplify（Phase 2C skeleton-diff の comparison 入力として最適化）
- [x] 6 unaccounted top-level dirs (`app-domain/` / `fixtures/` / `roles/` / `scripts/` / `workers/` / `docs/`) が観測値として surface（Phase 2C で out-of-skeleton 候補として articulate される）

### Phase 2C (sub-PR 3): skeleton diff generator

- [x] `tools/governance/build-skeleton-diff.mjs` generator landing — Phase 2A skeleton declaration + Phase 2B repo topology を入力に diff を生成（js-yaml は app/node_modules から createRequire で resolve）
- [x] `docs/contracts/generated/skeleton-diff.generated.json` landing — 6 分類（in-skeleton / out-of-skeleton / missing-expected / unexpected-child（Wave 1 では検出しない）/ inside-unmanaged-zone / observed-only）+ Status / Disposition / Reason / Questions / Constraint flags / Context hooks の articulate（合計 28 entries）
- [x] entry に approval 誤認 / 現状維持誤認 field を含めない（ADR-SCP-017 D6 + ADR-SCP-019 D5 整合）
- [x] **Status fields**: meaningStatus / intentStatus / continuityStatus + Evidence（meaningEvidence / intentEvidence / continuityEvidence）articulate
- [x] **Disposition field**: candidateDisposition articulate（Gap 7 分類: keep-and-contract 8 / tolerate 4 / needs-triage 16）
- [x] **Reason field**: reasonCode articulate（OUT_OF_SKELETON / MISSING_EXPECTED / CORRECT_LOCATION_BUT_UNEXPLAINED / INHERITED_WITHOUT_RATIONALE 等）
- [x] **Question fields**（Guidance 入力）: contextQuestion / futureQuestion / changeQuestion / requiredQuestion articulate（in-skeleton 8 entries は null = 既 articulate、investigation entries 20 は具体的 question）
- [x] **Constraint flags（一律 false）**: preservationAssumed / preferenceBasedDecisionAllowed / localConvenienceDecisionAllowed / promotionAllowed を全 entry に articulate
- [x] **Context Pipeline hooks**: contextPackRequired / contextDepthHint articulate（in-skeleton entries は false / null = 既 articulate、investigation entries は true / L0-L2 〜 L0-L4）
- [x] AI-EXPECTATION-002 整合: out-of-skeleton entry を「即削除」せず、observation target として articulate（preservationAssumed=false でも自動削除はしない）
- [x] 6 unaccounted top-level dirs 検出: app-domain/ + fixtures/ + roles/ + scripts/ + workers/ が `out-of-skeleton + CORRECT_LOCATION_BUT_UNEXPLAINED` として surface、docs/ は `inside-unmanaged-zone` (parent-of-declared docs/contracts/) として surface
- [x] .vscode/ が `missing-expected + tolerate` として surface（declared as unmanaged-but-tolerated だが本 repo に不在）

### Phase 2D (sub-PR 4): managed-zone file-level inventories

- [x] `tools/governance/build-markdown-inventory.mjs` generator landing — managed zone 3 件（projects/ + references/04-tracking/ + docs/contracts/）の Markdown の path / size / topHeading / candidateKind を articulate（541 entries / 18 candidateKind 分類）
- [x] `docs/contracts/generated/markdown-inventory.generated.json` landing
- [x] `tools/governance/build-yaml-inventory.mjs` generator landing — managed zone 3 件の YAML の 5 分類 candidate（declaration / inventory / generated-input / legacy / unknown）（5 entries / declaration 2 + inventory 3）
- [x] `docs/contracts/generated/yaml-inventory.generated.json` landing
- [x] `tools/governance/build-generated-artifact-inventory.mjs` generator landing — managed zone 3 件の generated artifact 候補の path / detectionReason / producerCandidate（43 entries / unknown 0、self-reference は loop break のため除外）
- [x] `docs/contracts/generated/generated-artifact-inventory.generated.json` landing — producerCandidate articulate、producerDeclared は false / unknown（Wave 3 / Phase 9 で正式宣言）
- [x] すべての entry に observed / inventoryStatus=observed-only / contractStatus=unreviewed / promotionAllowed=false / preservationAssumed=false articulate

### Phase 2E (sub-PR 5 + 6): Top-level Disposition Articulation（ADR-SCP-020）

> **目的**: Phase 2C skeleton-diff を補完し、out-of-skeleton entry に対する disposition の方向性を articulate。Wave 1 = articulate-only / Wave 2 = 整理実行 の分離原則整合。

#### Phase 2E-1 (sub-PR 5): refactor — schema / plan / checklist / ADR / generator

- [x] ADR-SCP-020 articulate（decision-audit.md）
- [x] plan.md に Phase 2E section 追加 + Phase 3 description 整合
- [x] checklist.md Phase 2E 項目 articulate + Phase 2 完了条件再 articulate（本 sub-PR で実施）
- [x] `docs/contracts/schema/tree-contracts.schema.json` の status enum を 4 値に拡張（declared / unmanaged-but-tolerated / container-only / platform-config-tolerated、additive、ADR-SCP-004 不可侵）
- [x] schema に `topLevelRationale` field（structured object: reason / cannotMoveBecause / continuityNote）追加 — `platform-config-tolerated` で必須、`container-only` で推奨
- [x] schema に `nestedDeclaredChildren` field 追加 — `container-only` で必須（空 array 不可）
- [x] `tools/governance/build-skeleton-diff.mjs` 拡張: `topLevelDispositionCandidate`（8 値: declared-root / container-only-root / platform-config-tolerated / tolerate / move-candidate / archive-candidate / delete-candidate / needs-triage）articulate logic 追加
- [x] build-skeleton-diff.mjs に新 12 reasonCode logic 追加（既存 12 + 新 12 = 24）: TOP_LEVEL_OVERPOPULATED / POSSIBLE_ROOT_DUPLICATION / CONTAINER_ONLY_ROOT / PLATFORM_CONFIG_REQUIRED_AT_ROOT / POSSIBLE_MOVE_TO_APP / POSSIBLE_MOVE_TO_TOOLS / POSSIBLE_MOVE_TO_PROJECTS / POSSIBLE_MOVE_TO_AAG / POSSIBLE_MOVE_TO_REFERENCES / POSSIBLE_MOVE_TO_DOCS_CONTRACTS / POSSIBLE_DELETE_CANDIDATE / CURRENT_PROJECT_POINTER_CANDIDATE
- [x] build-skeleton-diff.mjs に D5 個別 heuristic map articulate（app-domain/ → move-candidate + POSSIBLE_MOVE_TO_APP + POSSIBLE_ROOT_DUPLICATION 等、`CURRENT_PROJECT.md` → needs-triage + CURRENT_PROJECT_POINTER_CANDIDATE）
- [x] schema 拡張は additive のみ（既存 declared 8 件 / `.vscode/` の articulate 変更なし、regression 0）
- [x] 本 sub-PR では yaml refine と diff 再生成は行わない（Phase 2E-2 で実施）

#### Phase 2E-2 (sub-PR 6): feat — yaml refine + skeleton-diff regenerate

- [x] `docs/contracts/src/repo/tree-contracts.yaml` で `docs/` を `container-only` として明示 articulate（`nestedDeclaredChildren: ["docs/contracts/"]` + `topLevelRationale` populate）
- [x] tree-contracts.yaml で `.github/` を `platform-config-tolerated` に refine + `topLevelRationale` populate（reason / cannotMoveBecause / continuityNote）
- [x] tree-contracts.yaml で `.claude/` を `platform-config-tolerated` に refine + `topLevelRationale` populate
- [x] tree-contracts.yaml で `.vscode/` は `unmanaged-but-tolerated` 維持（platform-config 性質ではない、個人 IDE 設定）
- [x] 既存 declared 8 件（app/ wasm/ aag/ aag-engine/ docs/contracts/ projects/ references/ tools/）の articulate 変更なし
- [x] `docs/contracts/generated/skeleton-diff.generated.json` 再生成
- [x] surface 確認: `app-domain/` `fixtures/` `scripts/` が `move-candidate` として出力
- [x] surface 確認: `roles/` `workers/` `CURRENT_PROJECT.md` が `needs-triage` として出力
- [x] surface 確認: `docs/` が `container-only-root` + `CONTAINER_ONLY_ROOT` reasonCode で出力
- [x] surface 確認: `.github/` `.claude/` が `platform-config-tolerated` + `PLATFORM_CONFIG_REQUIRED_AT_ROOT` reasonCode で出力
- [x] 削除 / 移動 / README 更新を行っていない（articulate-only 不可侵）
- [x] CURRENT_PROJECT.md の中身改変なし（surface のみ、別 PR）
- [x] cleanup inquiry を起こしていない（Wave 2 で起票）

### Phase 2 完了条件（ADR-SCP-019 + ADR-SCP-020 整合 + D8 抜け殻化防止）

- [x] Structural Skeleton top-level 8 件が tree-contracts.yaml に declared（Phase 2A）
- [x] repo-topology.generated.json が top-level-only + observed-only で生成（Phase 2B、`1918202` の content 上書き）
- [x] skeleton-diff.generated.json が 6 分類で生成（Phase 2C）
- [x] managed zone 3 件の Markdown / YAML / generated artifact 候補が observed-only として出力（Phase 2D）
- [x] skeleton status enum が 4 値（declared / unmanaged-but-tolerated / container-only / platform-config-tolerated）に articulate（Phase 2E、ADR-SCP-020）
- [x] skeleton-diff entry に topLevelDispositionCandidate（8 値）+ 24 reasonCode が articulate（Phase 2E、ADR-SCP-020）
- [x] `docs/` が `container-only` として明示 articulate、`.github/` `.claude/` が `platform-config-tolerated` に refine（Phase 2E）
- [x] inventory entry に approved / contracted / declared と誤認される field がない（meaningStatus / intentStatus / continuityStatus / promotionAllowed=false articulate 済）
- [x] out-of-skeleton が fail ではなく needs-triage candidate として出力
- [x] promotionAllowed は原則 false（全 inventory entry articulate 済）
- [x] hard gate / new-only gate 追加なし

#### D8 抜け殻化防止条件（status を operational に articulate）

- [ ] meaningStatus / intentStatus / continuityStatus の各 enum に **判定基準が定義されている**（D8.1: explained/candidate/unexplained 等の operational definition、entry articulate と並行で plan.md / ADR-SCP-019 D8 で確認可能）
- [ ] 各 inventory entry が **status だけでなく Evidence （meaningEvidence / intentEvidence / continuityEvidence）または reasonCode を持つ**（D8.2、空 array は low-confidence として扱う）
- [ ] **contextQuestion が status / skeletonStatus / candidateKind に応じて生成される**（D8.3、Wave 1 では articulation のみ、Wave 2 で context-trigger.yaml に institute）
- [ ] reasonCode に **CORRECT_LOCATION_BUT_UNEXPLAINED が articulate されている**（D8.4、「正しい場所だから OK」誤認検出）
- [ ] reasonCode に **FUNCTIONING_BUT_INTENT_UNKNOWN が articulate されている**（D8.4、「動いているから OK」誤認検出）
- [ ] 昇格禁止条件（D8.5）が articulate されている: `meaningStatus==unexplained` / `intentStatus==missing` / `continuityStatus==absent` / Evidence 空 / 該当 reasonCode が含まれる場合の昇格 gate

- [x] Wave 1 / Phase 3 着手 user 承認

## Wave 1 / Phase 3: Tree Contract Shadow checker advisory（ADR-SCP-019 D3 整合、2 sub-PR）

> **目的（再定義、ADR-SCP-019 D3）**: Phase 2A skeleton 宣言済 + Phase 2C skeleton-diff + Phase 2E top-level disposition articulate 済を前提に、**Tree Contract Shadow checker を advisory で稼働**。skeleton 宣言は Phase 2A で前倒し済のため、本 Phase は **checker / Finding 化に集中**。

### Phase 3-A (sub-PR 7): tree-contracts normalize generator

- [x] `tools/governance/build-tree-contracts.mjs` landing — `docs/contracts/src/repo/tree-contracts.yaml` を normalize し、`docs/contracts/generated/tree-contracts.generated.json` を生成（不可侵原則 1 整合: schemaVersion / sourceSha / sourcePaths / generatedAt + 既存 schema validation）
- [x] `docs/contracts/generated/tree-contracts.generated.json` 初版 landing（12 entries = 8 declared + 1 container-only + 2 platform-config-tolerated + 1 unmanaged-but-tolerated）
- [x] generator が deterministic（object key alphabetical sort + array order-preserving + indent 2 + final newline）
- [x] tree-contracts.schema.json (ADR-SCP-020 拡張版) との整合確認

### Phase 3-B (sub-PR 8): check-tree advisory checker

- [x] `tools/governance/check-tree.mjs` landing — `docs/contracts/generated/skeleton-diff.generated.json` を入力に、aag-finding-v1 conform Finding を emit
- [x] `docs/contracts/generated/tree-contract-findings.generated.json` 初版 landing
- [x] valid-finding emit: out-of-skeleton + missing-expected (declared) entries (= structural drift articulation)
- [x] verified-zero finding emit: drift count == 0 の場合の AAG 形式 Finding (ADR-SCP-016 D3 整合)
- [x] suggestedDisposition mapping: topLevelDispositionCandidate (Phase 2E) → aag-finding suggestedDisposition (move-candidate → move / archive-candidate → archive / delete-candidate → needs-triage / needs-triage → needs-triage)
- [x] severity articulate: missing-expected (declared) → warn / out-of-skeleton → info (Wave 1 advisory only)
- [x] confidence: high (mechanically deterministic from skeleton+topology join)
- [x] falsePositiveAllowed: true (Wave 1 advisory only、不可侵原則 8 整合)
- [x] new-only gate 設計が articulate されている（実装は別 program、Wave 1 では advisory のみ）
- [x] hard gate 追加なし

### Phase 3 完了条件（ADR-SCP-019 D3 + ADR-SCP-016 D3 整合）

- [x] tree-contracts.generated.json が tree-contracts.yaml から normalize で再生可能（deterministic）
- [x] tree-contract-findings.generated.json が aag-finding-v1 schema conform（ajv 検証 OK）
- [x] valid-finding (= structural drift articulate) または verified-zero finding (= 完全走査済証明) のいずれかが必ず emit される
- [x] `unmanaged-but-tolerated` 状態を Finding として表現できる（no Finding emit = tolerated 整合の articulate）
- [x] hard gate / new-only gate 追加なし（Wave 1 不可侵原則 8 整合）

## Wave 2 readiness（Wave 2 着手前の articulate 確認、ADR-SCP-021 + ADR-SCP-022 整合、articulation-only）

> **役割**: Wave 2（Phase 2.5 Document Reset Pass + Phase 4 + Phase 5）着手の前提条件 articulate。本 section の checkbox は **articulation のみ**（= Wave 1 内に institute 済の constitutional 原則 + ADR が plan.md / decision-audit.md に articulate されているかの確認）。Wave 2 内 Phase の作業 checkbox は Wave 2 着手時 + user 承認後に追記する（不可侵原則 9 = 順序逆行禁止）。

### ADR-SCP-021: Document Reset Pass + Failure Learning Loop articulate 確認

- [x] ADR-SCP-021 が decision-audit.md に articulate されている（D1 = 5 DOC-RESET 原則 / D2 = 4 DOC-LEARNING 原則 / D3 = 9 disposition values / D4 = 10 DOC-FAIL-* taxonomy / D5 = DOC-GUARD-* 5 段階 maturity / D6 = ルール化可/不可 / D7 = Wave 2 deliverables / D8 = Wave 1 articulate-only / Wave 2 implementation 切り分け）
- [x] plan.md 不可侵原則 16 (Document Reset Pass、AAG-SCP-DOC-RESET-001〜005) が articulate されている
- [x] plan.md 不可侵原則 17 (Documentation Failure Learning Loop、AAG-SCP-DOC-LEARNING-001〜004) が articulate されている
- [x] plan.md Wave 2 / Phase 2.5 description が **Document Reset Pass** として rewrite されている（旧「Existing Documentation Reading Pass」を含む superset、9 disposition + DOC-FAIL-* + DOC-GUARD-* + Failure Learning Loop articulate）
- [x] plan.md Wave 2 / Phase 2.5 完了条件に Document Reset Pass + Failure Learning Loop の state-based exit criteria articulate
- [x] plan.md Wave 2 / Phase 5 description に 9 disposition execution + README rewrite (整理後骨格反映) articulate

### ADR-SCP-022: Document Universe Index + README/Index 役割分離 articulate 確認

- [x] ADR-SCP-022 が decision-audit.md に articulate されている（D1 = 5 DOC-INDEX 原則 (本体) / D2 = 3 DOC-INDEX 原則 (README/Index 分離) / D3 = 索引対象 + 構造 + 成果物 / D4 = 7 DOC-IDX-* finding namespace / D5 = entry shape / D6 = Wave 配置 / D7 = README 載せる/載せない）
- [x] plan.md 不可侵原則 18 (Document Universe Index + README/Index 分離、AAG-SCP-DOC-INDEX-001〜008) が articulate されている
- [x] plan.md Wave 2 / Phase 2.5 deliverables に Document Universe Index 4 成果物 (build-document-universe.mjs / document-universe.generated.json / .md / check-document-universe.mjs) が articulate されている
- [x] plan.md Wave 2 / Phase 2.5 完了条件に Document Universe Index coverage + link integrity check が articulate されている
- [x] plan.md Wave 2 / Phase 5 README rewrite が AAG-SCP-DOC-INDEX-005〜008 + AAG-SCP-DOC-RESET-005 整合で articulate されている

### Wave 2 内実装は本 readiness section に含めない（Wave 1 articulate-only 整合、ADR-SCP-021 D8 + ADR-SCP-022 D6）

- [x] Wave 1 では実装しない: build-document-universe.mjs / Reading Pass 実行 / document-failure-patterns.md 蓄積 / DOC-FAIL-* yaml landing / DOC-GUARD-* yaml landing / 削除 / 移動 / rewrite / split / merge / create-missing / README rewrite はすべて **Wave 2 以降**
- [x] Wave 2 着手 user 承認は Wave 1 完了 + Wave 1 exit criteria 全件 PASS 後に判断（不可侵原則 9）

## Wave 2 / Phase 2.5: Document Universe Index simple version (ADR-SCP-022 整合、Wave 2 sub-PR 1)

> **目的（再定義、ADR-SCP-022 D6 整合）**: Phase 2.5 着手時の最初の sub-PR。Reading Pass を実行する前に、repo 内 Markdown を 1 枚で articulate した分類済み索引を landing し、後続 Reading Pass のインフラ + 進捗可視化 surface を提供する。observed-only / unreviewed 中心、`promotionAllowed: false` 維持。

### Phase 2.5 sub-PR 1 (Document Universe Index simple version)

- [x] Wave 2 / Phase 2.5 sub-PR 1 着手 user 承認
- [x] `docs/contracts/schema/document-universe.schema.json` landing — entry shape 13 fields (path / href / indexSection / documentStatus / kind / temporalScope / contractStatus / meaningStatus / intentStatus / continuityStatus / source / promotionAllowed=const false)、ADR-SCP-022 D5 整合
- [x] `tools/governance/build-document-universe.mjs` landing — generator (= git ls-files で broad scope、markdown-inventory + doc-registry + tree-contracts を input、ajv schema validation 込み、deterministic)
- [x] `docs/contracts/generated/document-universe.generated.json` 初版 landing — 743 entries (= repo 内 Markdown 全件、app/ + wasm/ + app-domain/ + fixtures/ + scripts/ は scope 外、ADR-SCP-022 D3 整合)
- [x] `references/04-tracking/generated/document-universe.generated.md` 初版 landing — 1 枚 projection (= summary + indexSection 別 entry table)
- [x] schema validation OK (= ajv) + deterministic (= 連続実行で diff なし)
- [x] indexSection 18 grouping articulate (= repository-entrypoints / foundation / implementation / design-system / aag-interface / tracking / tracking-generated / aag-framework / aag-framework-internal / aag-scp-checkers / aag-engine / contracts / docs-other / active-projects / completed-projects / project-templates / archive / tree-readers / roles / tools / unmanaged 等)
- [x] kind heuristic 6 enum articulate (repo-entrypoint / canonical-doc / generated-report / project-plan / archive-doc / unknown) — Phase 4 doc-kind-registry landing 後に Reading Pass で articulate に更新
- [x] documentStatus 5 enum articulate (declared / generated / needs-triage / observed-only / archive)
- [x] contractStatus 3 enum articulate (unreviewed / reviewed / declared)
- [x] promotionAllowed: false 全 entry で維持 (= 索引掲載 ≠ contract 化、AAG-SCP-DOC-INDEX-002 整合)
- [x] hard gate 追加なし (= Wave 2 advisory only、不可侵原則 8 整合)

### Phase 2.5 sub-PR 1 完了条件 (ADR-SCP-022 D6 整合)

- [x] build-document-universe.mjs simple version landing
- [x] document-universe.generated.json 初版 landing (= observed-only / unreviewed 中心、promotionAllowed: false 維持)
- [x] document-universe.generated.md 初版 landing (= 1 枚 projection、Reading Pass 後段で articulate に更新)
- [x] coverage: repo 内 Markdown (scope: README + CLAUDE.md + CHANGELOG.md + CURRENT_PROJECT.md + references + projects + docs + aag + aag-engine + roles + tools + workers) の索引未掲載 == 0 (= UNINDEXED-MARKDOWN finding 0 検出ロジックは Phase 2.5 後段で landing、本 sub-PR では coverage 担保のみ)
- [x] check-document-universe.mjs (= advisory checker) は Phase 2.5 後段で landing (= 本 sub-PR scope 外、ADR-SCP-022 D6 整合) → **sub-PR 2 で landing 完了**

### Phase 2.5 sub-PR 2 (Document Universe Index advisory checker、ADR-SCP-022 D4 整合)

- [x] Wave 2 / Phase 2.5 sub-PR 2 着手 user 承認
- [x] `tools/governance/check-document-universe.mjs` landing — DOC-IDX-* finding emit (4 check types: MISSING-TARGET / UNINDEXED-MARKDOWN / DUPLICATE-ENTRY / BROKEN-LINK)
- [x] `docs/contracts/generated/document-universe-findings.generated.json` 初版 landing
- [x] aag-finding-v1 schema conform (= ajv 検証 OK)
- [x] verified-zero finding emit (= drift count == 0 達成、ADR-SCP-016 D3 整合): scannedFiles 744 / drift 0
- [x] hard gate / new-only gate 追加なし (= Wave 2 advisory only、不可侵原則 8 整合)
- [x] severity articulate (= 全 check 1 種ずつ articulate: MISSING-TARGET → warn / UNINDEXED-MARKDOWN → info / DUPLICATE-ENTRY → warn / BROKEN-LINK → warn)
- [x] confidence: high (= mechanically deterministic な existsSync / Set lookup)
- [x] falsePositiveAllowed: true (= Wave 2 advisory only)

### Phase 2.5 sub-PR 2 完了条件 (ADR-SCP-022 D4 + ADR-SCP-016 D3 整合)

- [x] check-document-universe.mjs landing
- [x] document-universe-findings.generated.json 初版 landing
- [x] valid-finding (= structural drift) または verified-zero finding が必ず emit される (= 本 sub-PR では verified-zero finding を emit、index integrity 達成証明)
- [x] DOC-IDX-* 4 check (MISSING-TARGET / UNINDEXED-MARKDOWN / DUPLICATE-ENTRY / BROKEN-LINK) 全実装
- [x] BROKEN-ANCHOR / STALE-GENERATED / KIND-MISMATCH check は Phase 2.5 後段 / Phase 4 で landing (= 本 sub-PR scope 外、anchor parse / freshness logic / doc-kind-registry 同期 は Wave 2 別 sub-PR)

## Wave 2 / Phase 4: Document Kind + Temporal Scope Shadow checker (sub-PR B + C bundle)

> **目的（plan.md L639-L665 整合）**: Document Kind Registry を normalize し、temporal-scope policy を articulate して advisory checker を稼働させる。Wave 2 advisory only (= 不可侵原則 8 整合)、hard gate 追加なし。

### Phase 4 sub-PR B (Document Kind Registry normalize)

- [x] Wave 2 / Phase 4 sub-PR B 着手 user 承認
- [x] `tools/governance/build-doc-kind-registry.mjs` landing — yaml→json normalize (= 不可侵原則 1 整合: schemaVersion / metadata / sourceSha + ajv schema validation)
- [x] `docs/contracts/generated/doc-kind-registry.generated.json` 初版 landing (4 kinds: canonical-doc / project-plan / archive-doc / generated-report、stage: minimum 維持)
- [x] stage promotion (minimum → extended) は Phase 4 後段 PR で articulate (= 本 sub-PR では generator + initial generate のみ、scope 限定)
- [x] deterministic (object key alphabetical sort + array order-preserving + indent 2 + final newline)

### Phase 4 sub-PR C (Temporal Scope Policy + advisory checker)

- [x] Wave 2 / Phase 4 sub-PR C 着手 user 承認
- [x] `docs/contracts/schema/temporal-scope-policy.schema.json` landing — Policy entry shape (id / description / scope / checks / severity / confidence / suggestedDisposition / rationale)
- [x] `docs/contracts/src/docs/temporal-scope-policy.yaml` landing — 3 policies: no-temporal-mixing (canonical-doc) + generated-must-have-producer (generated-report、ADR-SCP-008 例外条項 articulate のみ) + archive-must-have-manifest (archive-doc、ADR-SCP-008 例外条項 articulate のみ)
- [x] `tools/governance/build-temporal-scope-policy.mjs` landing — yaml→json normalize + ajv schema validation
- [x] `docs/contracts/generated/temporal-scope-policy.generated.json` 初版 landing
- [x] `tools/governance/check-doc-temporal-scope.mjs` landing — canonical-doc kind の forbidden heading (## History / Roadmap / Future / TODO / Phase / Migration Log) + forbidden pattern (checkbox `^[ \t]*-[ \t]+\[[ x]\]`) を scan、aag-finding-v1 conform finding emit
- [x] `docs/contracts/generated/temporal-scope-findings.generated.json` 初版 landing — 326 valid-finding emit (canonical-doc 269 entries scanned、no-temporal-mixing policy)
- [x] severity articulate: warn (= Wave 2 advisory only、不可侵原則 8 整合)
- [x] confidence: high (= regex match の deterministic 検出)
- [x] falsePositiveAllowed: true (= Wave 2 advisory、Phase 5 cleanup PR で disposition 確定)
- [x] suggestedDisposition: split (= no-temporal-mixing policy で articulate、project-checklist-governance 整合)
- [x] hard gate / new-only gate 追加なし

### Phase 4 sub-PR B + C 完了条件 (plan.md L660-L666 整合)

- [x] doc-kind-registry.generated.json + temporal-scope-policy.generated.json + temporal-scope-findings.generated.json の 3 generated.json が landing
- [x] 製本/archive/project/generated の分類候補が出る (= doc-kind-registry stage minimum で 4 kinds articulate 済 + universe entry kind heuristic で分類済)
- [x] 過去/未来混入 finding が一覧化される (= temporal-scope-findings 326 件で articulate 済、Phase 5 cleanup PR で disposition 確定)
- [x] 誤検知レビュー期間 (state-based exit) は Phase 5 cleanup PR + Reading Pass で並列開始
- [x] advisory のみ (= hard gate なし、Wave 2 不可侵原則 8 整合)
- [x] generated-must-have-producer + archive-must-have-manifest は acceptanceRule articulate のみ (= Phase 4 後段 / Wave 3 で checker 実装、本 sub-PR scope 外)

## Wave 2 / Phase 2.5 sub-PR 3: Document Reading Pass infrastructure (ADR-SCP-021 D7 整合)

> **目的**: Reading Pass を実行する前段として、reading 結果 entry shape (= reading-decisions schema + empty yaml) と DOC-FAIL-* taxonomy (= 10 pre-articulate patterns) と candidates 生成 (= universe → 398 candidates) の infrastructure を landing。machine inferred candidate emit は許容 (= heuristic、disposition 自体は articulate しない)、disposition 確定は次 sub-PR 以降の Reading Pass で実施。

### Phase 2.5 sub-PR 3 (Reading Pass infrastructure、6 files)

- [x] Wave 2 / Phase 2.5 sub-PR 3 着手 user 承認
- [x] `docs/contracts/schema/document-reading-decisions.schema.json` landing — entry shape (= ADR-SCP-021 D7: 9 disposition + 5 hasX flags + reviewedBy + reviewedAtCommit + reviewedAtSha + rationaleSummary + alternativesConsidered + duplicates + failurePatterns)
- [x] `docs/contracts/src/docs/document-reading-decisions.yaml` landing — 初版 stage: empty / entries: [] (= Reading Pass 進行で incremental に append)
- [x] `docs/contracts/schema/document-failure-taxonomy.schema.json` landing — DOC-FAIL-* pattern shape (= id pattern `^DOC-FAIL-` + maturityHint 5 段階 + suggestedRemedy + relatedDispositions + guardrailCandidate)
- [x] `docs/contracts/src/docs/document-failure-taxonomy.yaml` landing — 10 DOC-FAIL-* pre-articulate patterns (= derived/README L18 から landing、stage: pre-articulate、maturityHint: pattern-articulated)
- [x] `tools/governance/build-document-reading-candidates.mjs` landing — universe → candidates generator (= kind heuristic + hot zone priority + alreadyReviewedPaths exclusion)
- [x] `docs/contracts/generated/document-reading-candidates.generated.json` 初版 landing — 398 candidates (HIGH 194 / MEDIUM 204、byKind: canonical-doc 269 / unknown 74 / project-plan 52 / repo-entrypoint 3)
- [x] `derived/README.md` update — landed infrastructure articulate + Reading Pass workflow articulate
- [x] yaml schema validation OK (= ajv conform、empty entries / 10 patterns 共に valid)
- [x] candidates 出力 deterministic (= 連続実行で diff なし)
- [x] hard gate / new-only gate 追加なし (= Wave 2 advisory only、不可侵原則 8 整合)

### Phase 2.5 sub-PR 3 完了条件 (ADR-SCP-021 + AAG-SCP-DOC-RESET-001〜005 + AAG-SCP-DOC-LEARNING-001〜004 整合)

- [x] reading-decisions schema + 空 yaml landing → Reading Pass 結果 articulate 用 contract が utilizable
- [x] failure-taxonomy schema + 10 pre-articulate patterns landing → 即 Gate 化禁止 (AAG-SCP-DOC-LEARNING-002) 整合維持 (= maturityHint: pattern-articulated stage)
- [x] candidates generator + 初版 output landing → 398 candidates が priority articulate 済
- [x] Reading Pass 実行 workflow が derived/README.md L25-L33 で articulate されている
- [x] Wave 2 後段で landing 予定の追加成果物 (= reading log narrative + decisions normalize generator + merged generator + guardrail-candidates schema/yaml) が derived/README.md L37-L43 で articulate されている (= 順序逆行禁止、本 sub-PR scope 外)

## Wave 2 / Phase 2.5 sub-PR 4: Reading Pass Batch 1 (= HIGH priority 5 docs articulate)

> **目的**: sub-PR 3 で landed Reading Pass infrastructure を入力に、HIGH priority hot zone 候補から最初の Reading Pass batch を実行。disposition + 5 hasX flags + rationale + failurePatterns を articulate に確定し、failure-taxonomy examplePaths + maturityHint を observed stage に promote。

### Phase 2.5 sub-PR 4 (Reading Pass Batch 1、5 docs)

- [x] Wave 2 / Phase 2.5 sub-PR 4 着手 user 承認
- [x] 5 docs を read + articulate: CLAUDE.md (HIGH repo-entrypoint) + references/04-tracking/aag-doc-audit-report.md (HIGH canonical-doc) + ar-rule-audit.md (HIGH canonical-doc) + authoritative-term-sweep.md (HIGH unknown) + dashboards/README.md (HIGH unknown)
- [x] 5 entry を document-reading-decisions.yaml に append (= stage: empty → in-progress)
- [x] 各 entry に 9 disposition のいずれかを articulate: keep-and-contract 2 件 (CLAUDE.md + dashboards/README.md) / archive 2 件 (aag-doc-audit-report + authoritative-term-sweep) / move 1 件 (ar-rule-audit)
- [x] 各 entry に 5 hasX flags + rationaleSummary + alternativesConsidered + duplicates + failurePatterns articulate
- [x] document-failure-taxonomy.yaml stage を pre-articulate → in-use に promote
- [x] 4 failure patterns の maturityHint を pattern-articulated → observed に promote: TEMPORAL-MIXING / LOCATION-MISMATCH / GENERATED-AS-MANUAL / PROJECT-CONTENT-IN-REFERENCE
- [x] 各 observed pattern に examplePaths を articulate (= reading-decisions entry path との bidirectional reference)
- [x] candidates regenerate (= 398 → 393 candidates、alreadyReviewedCount 0 → 5)
- [x] yaml schema validation OK (= ajv conform、reading-decisions in-progress + failure-taxonomy in-use)
- [x] hard gate 追加なし (= Wave 2 advisory only)

### Phase 2.5 sub-PR 4 完了条件 (ADR-SCP-021 D7 + AAG-SCP-DOC-LEARNING-002 整合)

- [x] reading-decisions.yaml に 5 entry articulate 済 (= stage: in-progress)
- [x] 全 entry が 9 disposition のいずれかに分類完了 (= 空 disposition 0 件)
- [x] 全 entry に reviewedBy / reviewedAtCommit / reviewedAtSha 記載 (= reproducibility articulate)
- [x] failure-taxonomy.yaml の 4 pattern が observed stage に promote (= AAG-SCP-DOC-LEARNING-002 5 段階 maturity progression 整合: pattern-articulated → observed)
- [x] candidates regenerate で alreadyReviewedPaths が exclusion されている (= 重複 reading 防止)
- [x] 即 Gate 化禁止維持 (= AAG-SCP-DOC-LEARNING-002 整合、Wave 3+ で gate 化判断)

## Wave 2 / Phase 2.5 sub-PR 5: Reading Pass Batch 2 (= HIGH priority 5 docs articulate、reviewedAtCommit dd0f6ed)

> **目的**: Reading Pass Batch 1 (= sub-PR 4) の continuation。HIGH priority hot zone 候補
> から次の 5 documents を articulate。proposedKind に新 vocabulary (= status-snapshot /
> log-journal) を articulate に導入し、disposition 4 種 (split / move / keep-and-contract /
> archive) を実例で articulate。

### Phase 2.5 sub-PR 5 (Reading Pass Batch 2、5 docs)

- [x] Wave 2 / Phase 2.5 sub-PR 5 着手 user 承認 (= Batch 1 完遂後の同 session 順次)
- [x] 5 docs を read + articulate: references/04-tracking/engine-maturity-matrix.md (HIGH unknown) + open-issues.md (HIGH canonical-doc) + project-structure.md (HIGH canonical-doc) + promotion-readiness-correlation.md (HIGH canonical-doc) + taxonomy-review-journal.md (HIGH canonical-doc)
- [x] 5 entry を document-reading-decisions.yaml に append (= entries: 5 → 10、stage: in-progress)
- [x] 各 entry に 9 disposition のいずれかを articulate: keep-and-contract 3 件 (open-issues + project-structure + taxonomy-review-journal) / split 1 件 (engine-maturity-matrix) / move 1 件 (promotion-readiness-correlation)
- [x] 各 entry に 5 hasX flags + rationaleSummary + alternativesConsidered + duplicates + failurePatterns articulate
- [x] 新 proposedKind vocabulary articulate: status-snapshot (engine-maturity-matrix + promotion-readiness-correlation) / log-journal (taxonomy-review-journal)
- [x] duplicates field 実 articulate: engine-maturity-matrix → engine-promotion-matrix / promotion-readiness-correlation → 9 同型 file (customerGap 等)
- [x] candidates regenerate (= 393 → 388 candidates、HIGH 189 → 184、alreadyReviewedCount 5 → 10)
- [x] yaml schema validation OK (= ajv conform、reading-decisions in-progress 10 entries)
- [x] hard gate 追加なし (= Wave 2 advisory only)

### Phase 2.5 sub-PR 5 完了条件 (ADR-SCP-021 D7 + AAG-SCP-DOC-LEARNING-002 整合)

- [x] reading-decisions.yaml に Batch 2 5 entry append 済 (= 累計 10 entries、stage: in-progress)
- [x] 全 entry が 9 disposition のいずれかに分類完了 (= 空 disposition 0 件)
- [x] 全 entry に reviewedBy / reviewedAtCommit / reviewedAtSha 記載 (= reproducibility articulate)
- [x] proposedKind 6 種 articulate (= repo-entrypoint / project-plan / canonical-doc / archive-doc / status-snapshot / log-journal)
- [x] disposition 4 種 articulate (= keep-and-contract / archive / move / split)
- [x] candidates regenerate で alreadyReviewedPaths が exclusion されている (= 重複 reading 防止)
- [x] 即 Gate 化禁止維持 (= AAG-SCP-DOC-LEARNING-002 整合、Wave 3+ で gate 化判断)

## Wave 2 / Phase 2.5 sub-PR 6: Reading Pass Batch 3 (= HIGH priority unknown 5 docs articulate、reviewedAtCommit a564f37)

> **目的**: Reading Pass Batch 1+2 の continuation。Universe Index で `kind=unknown` だった
> 5 documents を triage 集中処理。新 disposition 'rewrite-and-contract' 初使用、新 failure
> pattern 'DOC-FAIL-ARCHIVE-CONTENT-IN-CANONICAL' を observed stage に promote。

### Phase 2.5 sub-PR 6 (Reading Pass Batch 3、5 docs)

- [x] Wave 2 / Phase 2.5 sub-PR 6 着手 (= user 「続けてください」継続承認)
- [x] 5 docs を read + articulate: references/04-tracking/engine-promotion-matrix.md (HIGH unknown) + features-migration-status.md (HIGH unknown) + frozen-list.md (HIGH unknown) + observation-evaluation-guide.md (HIGH unknown) + promotion-criteria.md (HIGH unknown)
- [x] 5 entry を document-reading-decisions.yaml に append (= entries: 10 → 15、stage: in-progress)
- [x] 各 entry に 9 disposition のいずれかを articulate: keep-and-contract 2 件 (observation-evaluation-guide + promotion-criteria) / split 2 件 (engine-promotion-matrix + features-migration-status) / rewrite-and-contract 1 件 (frozen-list)
- [x] 各 entry に 5 hasX flags + rationaleSummary + alternativesConsidered + duplicates + failurePatterns articulate
- [x] 新 disposition 'rewrite-and-contract' 初使用 (= frozen-list、count を generated 化 + history 分離)
- [x] 新 failure pattern 'DOC-FAIL-ARCHIVE-CONTENT-IN-CANONICAL' を pattern-articulated → observed promote (examplePaths: frozen-list.md)
- [x] kind=unknown triage 結果 articulate: 2 件 canonical-doc (= Universe Index detection 漏れ candidate)、2 件 status-snapshot、1 件 canonical-doc (frozen-list)
- [x] candidates regenerate (= 388 → 383 candidates、HIGH 184 → 179、alreadyReviewedCount 10 → 15)
- [x] yaml schema validation OK (= ajv conform、reading-decisions in-progress 15 entries)
- [x] hard gate 追加なし (= Wave 2 advisory only)

### Phase 2.5 sub-PR 6 完了条件 (ADR-SCP-021 D7 + AAG-SCP-DOC-LEARNING-002 整合)

- [x] reading-decisions.yaml に Batch 3 5 entry append 済 (= 累計 15 entries、stage: in-progress)
- [x] 全 entry が 9 disposition のいずれかに分類完了 (= 空 disposition 0 件)
- [x] 全 entry に reviewedBy / reviewedAtCommit / reviewedAtSha 記載 (= reproducibility articulate)
- [x] disposition 5 種 articulate (= keep-and-contract / archive / move / split / rewrite-and-contract)
- [x] failure-taxonomy.yaml の 5 pattern が observed stage に promote (= 既存 4 + 新 1: ARCHIVE-CONTENT-IN-CANONICAL)
- [x] candidates regenerate で alreadyReviewedPaths が exclusion されている (= 重複 reading 防止)
- [x] 即 Gate 化禁止維持 (= AAG-SCP-DOC-LEARNING-002 整合、Wave 3+ で gate 化判断)

## Wave 2 / Phase 2.5 sub-PR 7: Reading Pass Batch 4 (= 残非elements 3 + elements/ サンプル 2、reviewedAtCommit fa58cc7)

> **目的**: Reading Pass Batch 1+2+3 の continuation。残 non-elements 3 件 (quality-audit-latest +
> generated/architecture-state-snapshot + 不要だった technical-debt-roadmap は次回 batch) +
> elements/ サンプル 2 件 (element-taxonomy + CALC-001 + calculations/README) を articulate。
> 新 disposition 'delete-candidate' + 'generated-register' を初使用、新 proposedKind
> 'generated-report' を初使用 → disposition 7 種 + kind 7 種 articulate 達成。

### Phase 2.5 sub-PR 7 (Reading Pass Batch 4、5 docs)

- [x] Wave 2 / Phase 2.5 sub-PR 7 着手 (= user 「よろしくお願いします」継続承認)
- [x] 5 docs を read + articulate: references/04-tracking/quality-audit-latest.md + generated/architecture-state-snapshot.md + elements/element-taxonomy.md + elements/calculations/CALC-001.md + elements/calculations/README.md
- [x] 5 entry を document-reading-decisions.yaml に append (= entries: 15 → 20、stage: in-progress)
- [x] 各 entry に 9 disposition のいずれかを articulate: keep-and-contract 3 件 (element-taxonomy + CALC-001 + calculations/README) / delete-candidate 1 件 (quality-audit-latest) / generated-register 1 件 (architecture-state-snapshot)
- [x] 各 entry に 5 hasX flags + rationaleSummary + alternativesConsidered + duplicates + failurePatterns articulate
- [x] 新 disposition 'delete-candidate' 初使用 (= quality-audit-latest、stale snapshot で architecture-health.json と redundant)
- [x] 新 disposition 'generated-register' 初使用 (= architecture-state-snapshot、機械生成だが naming convention 不整合)
- [x] 新 proposedKind 'generated-report' 初使用 (= architecture-state-snapshot)
- [x] elements/ exemplar articulate: element-taxonomy (= ID prefix 正本) + CALC-001 (= per-element spec exemplar) + calculations/README (= directory README + Lifecycle State Machine)
- [x] candidates regenerate (= 383 → 378 candidates、HIGH 179 → 174、alreadyReviewedCount 15 → 20)
- [x] yaml schema validation OK (= ajv conform、reading-decisions in-progress 20 entries)
- [x] hard gate 追加なし (= Wave 2 advisory only)

### Phase 2.5 sub-PR 7 完了条件 (ADR-SCP-021 D7 + AAG-SCP-DOC-LEARNING-002 整合)

- [x] reading-decisions.yaml に Batch 4 5 entry append 済 (= 累計 20 entries、stage: in-progress)
- [x] 全 entry が 9 disposition のいずれかに分類完了 (= 空 disposition 0 件)
- [x] 全 entry に reviewedBy / reviewedAtCommit / reviewedAtSha 記載 (= reproducibility articulate)
- [x] disposition 7 種 articulate 達成 (= 9 中 7、未使用 2: archive-and-replace / merge)
- [x] proposedKind 7 種 articulate 達成 (= 開放 vocabulary、新規: generated-report)
- [x] candidates regenerate で alreadyReviewedPaths が exclusion されている (= 重複 reading 防止)
- [x] 即 Gate 化禁止維持 (= AAG-SCP-DOC-LEARNING-002 整合、Wave 3+ で gate 化判断)

## Wave 2 / Phase 2.5 sub-PR 8: Reading Pass Batch 5 (= promotion-readiness-* family 一括 articulate、reviewedAtCommit 034c10b)

> **目的**: Reading Pass の throughput 加速 batch。promotion-readiness-* family (correlation +
> 10 candidates) は同 pattern (= per-candidate snapshot + 'まだ current に編入しない' marker +
> Promote Ceremony 待ち) で全件同 disposition: move (= projects/active/pure-calculation-reorg/
> phase-X/readiness/) と articulate。残 10 件を 1 batch で family-level 一括 articulate、
> duplicates field の bidirectional cross-reference で family 関係を articulate。

### Phase 2.5 sub-PR 8 (Reading Pass Batch 5、10 docs)

- [x] Wave 2 / Phase 2.5 sub-PR 8 着手 (= user 「効率よく進めたい」承認、推薦 = promotion-readiness-* 一括)
- [x] 10 docs を read + articulate: 6 BIZ-* (Phase 5 Step 8) = customerGap (BIZ-013) + inventoryCalc (BIZ-009) + observationPeriod (BIZ-010) + pinIntervals (BIZ-011) + piValue (BIZ-012) + remainingBudgetRate (BIZ-008) + 4 ANA-* (Phase 6 Step 9) = dowGapAnalysis (ANA-007) + movingAverage (ANA-009) + sensitivity (ANA-003) + trendAnalysis (ANA-004)
- [x] 10 entry を document-reading-decisions.yaml に append (= entries: 20 → 30、stage: in-progress)
- [x] 全 entry に同 disposition: move articulate (= family-level 一括処理)
- [x] 全 entry に同 proposedKind: status-snapshot articulate
- [x] 全 entry に同 temporalScope: mixed articulate (= 候補情報 present + Promote Ceremony 待ち future)
- [x] 全 entry の duplicates field に他 10 件 (= 11 family - self) cross-reference articulate (= bidirectional family graph 完成)
- [x] 全 entry に同 failurePatterns articulate: DOC-FAIL-PROJECT-CONTENT-IN-REFERENCE + DOC-FAIL-LOCATION-MISMATCH
- [x] generation script 経由で 10 entry を一括生成 (= /tmp/gen-batch5.mjs、re-run 可能な articulate)
- [x] candidates regenerate (= 378 → 368 candidates、HIGH 174 → 164、alreadyReviewedCount 20 → 30)
- [x] yaml schema validation OK (= ajv conform、reading-decisions in-progress 30 entries)
- [x] hard gate 追加なし (= Wave 2 advisory only)

### Phase 2.5 sub-PR 8 完了条件 (ADR-SCP-021 D7 + AAG-SCP-DOC-LEARNING-002 整合)

- [x] reading-decisions.yaml に Batch 5 10 entry append 済 (= 累計 30 entries、stage: in-progress)
- [x] 全 entry が 9 disposition のいずれかに分類完了 (= 空 disposition 0 件)
- [x] 全 entry に reviewedBy / reviewedAtCommit / reviewedAtSha 記載 (= reproducibility articulate)
- [x] family-level 一括 articulate mechanism 確立 (= 同 pattern 文書群を 1 batch で処理する Reading Pass 最適化要素実証)
- [x] duplicates field bidirectional cross-reference articulate 完成 (= 11 件 family graph、各 entry に 10 cross-reference)
- [x] candidates regenerate で alreadyReviewedPaths が exclusion されている (= 重複 reading 防止)
- [x] 即 Gate 化禁止維持 (= AAG-SCP-DOC-LEARNING-002 整合、Wave 3+ で gate 化判断)

## Wave 2 / Phase 2.5 sub-PR 9: failurePattern Registry Generator + Cross-Reference Validation (= Failure Learning Loop infrastructure 着地、reviewedAtCommit 69dd32f)

> **目的**: Reading Pass 結果を ad-hoc string から構造化 registry に articulate。毎 batch が registry を
> 自動 enrich する mechanism。同種 failure の N 回観測 → guard candidate 自動昇格 (= ratchet-down 自動化、
> CLAUDE.md G8 整合)。Reading Pass throughput と Learning quality の bidirectional 強化。

### Phase 2.5 sub-PR 9 (failurePattern registry infrastructure)

- [x] 既存 asset audit: `docs/contracts/src/docs/document-failure-taxonomy.yaml` (= 10 patterns pre-articulated) + `docs/contracts/schema/document-failure-taxonomy.schema.json` (= 既存 schema 完備) を確認、duplicate articulate 防止
- [x] gap 特定: generator 未実装 (= reading-decisions.yaml の使用と bidirectional cross-reference 機能なし)
- [x] generator 実装: `tools/governance/build-document-failure-taxonomy.mjs`
  - taxonomy authoring source schema validation (= ajv conform fail fast)
  - reading-decisions.yaml scan で per-pattern observedCount + observedPaths + observedDispositions auto-compute
  - computedMaturity auto-promotion ルール articulate (= observedCount 1-4 → observed / >=5 → guardrail-candidate-emitted、promote のみ = 下方向 demotion なし)
  - unregistered DOC-FAIL-* in use 検出 (= reading-decisions で使用されているが taxonomy 未登録 = advisory warning)
  - deterministic JSON output (= sorted keys、reproducible)
- [x] generated artifacts 着地:
  - `docs/contracts/generated/document-failure-taxonomy.generated.json` (= machine truth)
  - `references/04-tracking/generated/document-failure-taxonomy.generated.md` (= human view)
- [x] authoring source comment 更新 (= sub-PR 9 で generator landed を明記、derived block + advisory 機能を articulate)
- [x] 初回実行検証:
  - 10 patterns registered / 6 observed / 4 unobserved
  - 4 guard candidates auto-promoted (= PROJECT-CONTENT-IN-REFERENCE 16 + LOCATION-MISMATCH 13 + TEMPORAL-MIXING 6 + GENERATED-AS-MANUAL 5)
  - 2 emerging patterns tracked (= ARCHIVE-CONTENT-IN-CANONICAL 1 + AI-ROUTING-AMBIGUITY 1)
  - 0 unregistered DOC-FAIL-* in use (= clean state、reading-decisions の全 failurePattern が registry 登録済)
- [x] hard gate 追加なし (= Wave 2 advisory only、AAG-SCP-DOC-LEARNING-002 整合)

### Phase 2.5 sub-PR 9 完了条件 (ADR-SCP-021 D7 + AAG-SCP-DOC-LEARNING-002 整合)

- [x] generator が deterministic に動作 (= reproducible output、2 回連続実行で diff 0)
- [x] 既存 taxonomy schema を改変せず derived block で auto-enrichment 実装 (= curated taxonomy preserve)
- [x] computedMaturity の promotion ルールが articulate (= observedCount threshold + 5 段階 progression)
- [x] unregistered DOC-FAIL-* surface 機能あり (= 未登録 pattern 検出、advisory warning)
- [x] guard candidate 抽出機能あり (= observedCount >= 5 で eligible 判定、Wave 3 で guard 着地候補)
- [x] 即 Gate 化禁止維持 (= AAG-SCP-DOC-LEARNING-002 整合、未登録 pattern も hard gate なし)
- [x] Reading Pass の毎 batch で registry が自動 enrich (= node 1 コマンドで再生成可能)

### Phase 2.5 sub-PR 9 で articulate された Failure Learning Loop mechanism

1. **Reading Pass で failurePattern observation** (= reading-decisions.yaml entry に DOC-FAIL-* tag 付与)
2. **Generator が auto-aggregate** (= per-pattern observedCount + observedPaths + observedDispositions)
3. **Maturity auto-promotion** (= observedCount threshold で computedMaturity 昇格)
4. **Guard candidate surface** (= observedCount >= 5 で eligible flag)
5. **Wave 3 で guard 実装** (= guard candidate を実際の guard test に articulate)
6. **同種 failure 再発時に hard fail** (= ratchet-down 完成、CLAUDE.md G8 整合)

## Wave 2 / Phase 2.5 sub-PR 10: Reading Pass Batch 6 (= CALC-* family 23 docs 一括 articulate、reviewedAtCommit af480dd)

> **目的**: sub-PR 9 で Failure Learning Loop infrastructure 着地後の最初の Reading Pass batch。
> elements/calculations/CALC-002〜CALC-024 family 23 件を一括 articulate。CALC-001 (Batch 3 articulate 済)
> と同 pattern (= per-calculation 業務契約 spec、frontmatter + 構造化 spec、lifecycleStatus: active) で
> 全件 keep-and-contract / canonical-doc。Failure Learning Loop の 0-pattern batch 動作検証 (= 全件 clean docs、
> failurePatterns: [] で generator が unregistered surface しないこと確認)。

### Phase 2.5 sub-PR 10 (Reading Pass Batch 6、23 docs)

- [x] Wave 2 / Phase 2.5 sub-PR 10 着手 (= user 「よろしくお願いします」承認、推薦 = CALC-* family 一括)
- [x] 23 docs を read + articulate: CALC-002〜CALC-024 (= 全件 lifecycleStatus: active、canonicalRegistration: current)
- [x] 23 entry を document-reading-decisions.yaml に append (= entries: 30 → 53、stage: in-progress)
- [x] 全 entry に同 disposition: keep-and-contract articulate (= family-level 一括処理)
- [x] 全 entry に同 proposedKind: canonical-doc articulate
- [x] 全 entry に同 temporalScope: present articulate
- [x] 全 entry に同 hasCurrentContract: true / hasHistory: false / hasFuturePlan: false articulate
- [x] 全 entry に同 failurePatterns: [] articulate (= clean docs、Failure Loop の 0-pattern batch 検証)
- [x] generation script で frontmatter (= exportName + contractId + sourceRef + semanticClass + authorityKind) を抽出 + entry 生成 (= /tmp/gen-batch6.mjs、23 件 1 batch 自動 articulate)
- [x] candidates regenerate (= 368 → 345 candidates、HIGH 164 → 141、alreadyReviewedCount 30 → 53)
- [x] Failure Loop generator 再実行 (= per-pattern observed 数値変化なし、unregistered 0、clean batch を確認)
- [x] yaml schema validation OK (= ajv conform、reading-decisions in-progress 53 entries)
- [x] hard gate 追加なし (= Wave 2 advisory only)

### Phase 2.5 sub-PR 10 完了条件 (ADR-SCP-021 D7 + AAG-SCP-DOC-LEARNING-002 整合)

- [x] reading-decisions.yaml に Batch 6 23 entry append 済 (= 累計 53 entries、stage: in-progress)
- [x] 全 entry が 9 disposition のいずれかに分類完了 (= 空 disposition 0 件)
- [x] 全 entry に reviewedBy / reviewedAtCommit / reviewedAtSha 記載 (= reproducibility articulate)
- [x] family-level 一括 articulate mechanism 再実証 (= 23 件 = Batch 5 (10 件) より大規模 batch、generation script で再現可能)
- [x] Failure Learning Loop 0-pattern batch 動作検証 (= clean docs batch でも generator 安定動作、unregistered 検出は 0 維持)
- [x] candidates regenerate で alreadyReviewedPaths が exclusion されている (= 重複 reading 防止)
- [x] 即 Gate 化禁止維持 (= AAG-SCP-DOC-LEARNING-002 整合、Wave 3+ で gate 化判断)

## Wave 2 / Phase 2.5 sub-PR 11: Reading Pass Batch 7 (= projects/active/ zone shift、reviewedAtCommit 02c623a)

> **目的**: sub-PR 10 までは references/04-tracking/ 配下の articulate に集中。Batch 7 で初の
> projects/active/ zone shift を実施 (= 新 zone での Failure Loop 動作検証 + 新 pattern surface 可能性)。
> quick-fixes/ 4 docs を probe batch として articulate (= 標準 project structure: AI_CONTEXT +
> checklist + HANDOFF + plan)、新 proposedKind = project-checklist articulate。

### Phase 2.5 sub-PR 11 (Reading Pass Batch 7、4 docs)

- [x] Wave 2 / Phase 2.5 sub-PR 11 着手 (= user 「よろしくお願いします」承認、推薦 = projects/active/ zone shift)
- [x] 4 docs を read + articulate: quick-fixes/{AI_CONTEXT, checklist, HANDOFF, plan}.md (= 標準 project structure 全 4 件)
- [x] 4 entry を document-reading-decisions.yaml に append (= entries: 53 → 57、stage: in-progress)
- [x] 全 entry に同 disposition: keep-and-contract articulate (= 全件 location 整合 + 役割明確)
- [x] 全 entry に同 temporalScope: present articulate
- [x] 全 entry に同 failurePatterns: [] articulate (= clean docs by design)
- [x] 新 proposedKind articulate: project-checklist (= live task list 正本、project-checklist-governance contract)
- [x] checklist.md の '完了 [x] と open [ ] が混在' を temporal-mixing に誤分類しない判断 articulate (= governance-articulated rule 'collection は終わらない、削除しない' のため failure ではなく feature)
- [x] candidates regenerate (= 345 → 341 candidates、HIGH 141 → 137、alreadyReviewedCount 53 → 57)
- [x] Failure Loop generator 再実行 (= clean batch、unregistered 0 維持、guard candidates 4 維持)
- [x] yaml schema validation OK (= ajv conform、reading-decisions in-progress 57 entries)
- [x] hard gate 追加なし (= Wave 2 advisory only)

### Phase 2.5 sub-PR 11 完了条件 (ADR-SCP-021 D7 + AAG-SCP-DOC-LEARNING-002 整合)

- [x] reading-decisions.yaml に Batch 7 4 entry append 済 (= 累計 57 entries、stage: in-progress)
- [x] 全 entry が 9 disposition のいずれかに分類完了 (= 空 disposition 0 件)
- [x] 全 entry に reviewedBy / reviewedAtCommit / reviewedAtSha 記載
- [x] projects/active/ zone shift 完遂 (= 初の references/04-tracking/ 以外 zone articulate)
- [x] 新 proposedKind 'project-checklist' articulate (= proposedKind 8 種に拡張)
- [x] governance-articulated pattern と failure pattern を articulate に区別 (= collection mode の [x] 蓄積を temporal-mixing と誤分類せず)
- [x] Failure Loop infrastructure が新 zone でも安定動作 (= clean batch、unregistered surface 機能維持)
- [x] candidates regenerate で alreadyReviewedPaths が exclusion されている
- [x] 即 Gate 化禁止維持 (= AAG-SCP-DOC-LEARNING-002 整合)

### Phase 2.5 sub-PR 11 で articulate された判断 mechanism

**governance-articulated pattern vs failure pattern の articulate 区別**:

quick-fixes/checklist.md は [x] 完了 items と [ ] open items が混在するため一見
DOC-FAIL-TEMPORAL-MIXING に該当する可能性がある。しかし:
- collection kind の不可侵原則 '完了したら checked にする (削除しない)' で governance-articulated
- 失敗ではなく feature として articulate されている
- 同 pattern は他の collection project にも適用される

→ Reading Pass の articulate では「mechanism 上の pattern」と「失敗 pattern」を区別、後者のみ
failurePatterns 付与。本判断は将来の Reading Pass で同類 governance-articulated pattern に
遭遇した際の reference (= failurePatterns 付与判断の基準) として機能。

## Wave 2 / Phase 2.5 sub-PR 12: Reading Pass Batch 8 (= projects/active/ zone 継続、reviewedAtCommit 7970765)

> **目的**: Batch 7 の projects/active/ zone shift を継続。presentation-quality-hardening (= 6 docs)
> 全件 articulate。標準 4 doc 構造 (AI_CONTEXT/checklist/HANDOFF/plan) + 拡張 2 doc (discovery-log/
> projectization) を発見、新 proposedKind 2 種 articulate (= project-discovery-log + project-projectization)。
> finite project pattern (= collection と異なる完了 → archive 移行型) を初観測、HANDOFF.md mixed temporal の
> governance-articulated 判断 articulate。

### Phase 2.5 sub-PR 12 (Reading Pass Batch 8、6 docs)

- [x] Wave 2 / Phase 2.5 sub-PR 12 着手 (= user 「1で」承認、= presentation-quality-hardening 一括)
- [x] 6 docs を read + articulate: AI_CONTEXT + checklist + discovery-log + HANDOFF + plan + projectization
- [x] 6 entry を document-reading-decisions.yaml に append (= entries: 57 → 63、stage: in-progress)
- [x] 全 entry に同 disposition: keep-and-contract articulate (= 全件 location 整合 + governance contract 整合)
- [x] 全 entry に同 failurePatterns: [] articulate (= governance-articulated docs)
- [x] 新 proposedKind 2 種 articulate:
  - project-discovery-log (= DA-β-003 institute、projectizationPolicyGuard PZ-14 contract)
  - project-projectization (= projectization-policy.md contract、AAG-COA 判定結果)
- [x] HANDOFF.md mixed temporal の governance-articulated 判断 articulate (= handoff role が past + present + future の併存を要求、長尺 416 行は Phase 1〜3 program の自然な volume、failurePatterns 未付与)
- [x] projectization.md mixed temporal の governance-articulated 判断 articulate (= 判定 timing past + 適用継続 present、機械検証対象)
- [x] candidates regenerate (= 341 → 335 candidates、HIGH 137 → 131、alreadyReviewedCount 57 → 63)
- [x] Failure Loop generator 再実行 (= clean batch 維持、unregistered 0、guard candidates 4 維持)
- [x] yaml schema validation OK (= ajv conform、reading-decisions in-progress 63 entries)
- [x] hard gate 追加なし (= Wave 2 advisory only)

### Phase 2.5 sub-PR 12 完了条件 (ADR-SCP-021 D7 + AAG-SCP-DOC-LEARNING-002 整合)

- [x] reading-decisions.yaml に Batch 8 6 entry append 済 (= 累計 63 entries、stage: in-progress)
- [x] 全 entry が 9 disposition のいずれかに分類完了 (= 空 disposition 0 件)
- [x] 全 entry に reviewedBy / reviewedAtCommit / reviewedAtSha 記載
- [x] proposedKind 10 種に拡張達成 (= repo-entrypoint + canonical-doc + archive-doc + project-plan + status-snapshot + log-journal + generated-report + project-checklist + project-discovery-log + project-projectization)
- [x] finite project pattern 初観測 (= presentation-quality-hardening、collection mode の quick-fixes と異なる完了型)
- [x] governance-articulated mixed temporal の articulate 判断 (= HANDOFF + projectization、failurePatterns 付与せず governance contract で正当化)
- [x] Failure Loop infrastructure が新 doc kind articulate でも安定動作 (= 2 新 kind 追加でも generator は input 不変)
- [x] 即 Gate 化禁止維持 (= AAG-SCP-DOC-LEARNING-002 整合)

### Phase 2.5 sub-PR 12 で articulate された pattern (= Reading Pass の知見蓄積)

**1. project doc の governance contract 多様性**:
projects/active/<id>/ 配下の doc は単一 'project-plan' kind で済まない。それぞれ異なる governance
contract を持つ:
- AI_CONTEXT.md → 入口 articulate (project-plan family)
- checklist.md → project-checklist-governance contract (project-checklist kind)
- discovery-log.md → DA-β-003 institute / PZ-14 (project-discovery-log kind)
- HANDOFF.md → 起点文書 (project-plan family)
- plan.md → 不可侵原則 (project-plan family)
- projectization.md → projectization-policy contract (project-projectization kind)

**2. governance-articulated mixed temporal の articulate 判定**:
mixed temporal scope を持つが governance contract で正当化される doc は failurePatterns 未付与:
- collection mode checklist の [x]+[ ] 混在 (Batch 7 で articulate)
- HANDOFF.md の past + future 併存 (= handoff role 要求)
- projectization.md の past 判定 + present 適用 (= governance contract)

→ Reading Pass の articulate では「mechanism の構造」を見て governance contract がある場合は
failurePatterns 未付与とする judgment 確立。

## Wave 2 / Phase 2.5 sub-PR 13: Reading Pass Batch 9 (= reposteward-ai-ops-platform 一括、reviewedAtCommit 52c9556)

> **目的**: Batch 7/8 の projects/active/ zone shift を継続。reposteward-ai-ops-platform (= 7 docs)
> 全件 articulate。Batch 8 で発見した 6 doc 構造に加えて新出 doc 'decision-audit.md' を articulate
> (= L3 重判断 institute、drawer Pattern 1 application)。新 proposedKind 1 種 articulate
> (project-decision-audit)。

### Phase 2.5 sub-PR 13 (Reading Pass Batch 9、7 docs)

- [x] Wave 2 / Phase 2.5 sub-PR 13 着手 (= user 「1」承認、= reposteward-ai-ops-platform 一括)
- [x] 7 docs を read + articulate: AI_CONTEXT + checklist + decision-audit + discovery-log + HANDOFF + plan + projectization
- [x] 7 entry を document-reading-decisions.yaml に append (= entries: 63 → 70、stage: in-progress)
- [x] 全 entry に同 disposition: keep-and-contract articulate
- [x] 全 entry に同 failurePatterns: [] articulate
- [x] 新 proposedKind 1 種 articulate: project-decision-audit (= drawer Pattern 1 application、5 軸 + 観測点 + Lineage + 振り返り判定の固有 schema、complexity-policy.md §3.4 + decision-articulation-patterns.md governance contract)
- [x] decision-audit.md (2101 行、最大規模 doc) の Lineage articulate scheme (= judgementCommit + preJudgementCommit + retrospectiveCommit) を articulate に温存
- [x] candidates regenerate (= 335 → 328 candidates、HIGH 131 → 124、alreadyReviewedCount 63 → 70)
- [x] Failure Loop generator 再実行 (= clean batch 維持、unregistered 0、guard candidates 4 維持)
- [x] yaml schema validation OK (= ajv conform、reading-decisions in-progress 70 entries)
- [x] hard gate 追加なし (= Wave 2 advisory only)

### Phase 2.5 sub-PR 13 完了条件 (ADR-SCP-021 D7 + AAG-SCP-DOC-LEARNING-002 整合)

- [x] reading-decisions.yaml に Batch 9 7 entry append 済 (= 累計 70 entries、stage: in-progress)
- [x] 全 entry が 9 disposition のいずれかに分類完了
- [x] 全 entry に reviewedBy / reviewedAtCommit / reviewedAtSha 記載
- [x] proposedKind 11 種に拡張達成 (= 10 → 11、新規: project-decision-audit)
- [x] L3 重判断 institute pattern (= drawer Pattern 1) 初観測 + articulate
- [x] active project の standard structure 拡張形 articulate (= quick-fixes 4 doc / presentation-quality-hardening 6 doc / reposteward 7 doc の段階)
- [x] Failure Loop infrastructure が大規模 doc (2101 行) 含む batch でも安定動作
- [x] 即 Gate 化禁止維持 (= AAG-SCP-DOC-LEARNING-002 整合)

### Phase 2.5 sub-PR 13 で articulate された pattern (= Reading Pass の知見蓄積)

**1. active project structure の incremental 拡張 articulate**:
projects/active/<id>/ の標準 structure は固定ではなく、project の governance 要件に応じて
incremental に拡張される:
- 4 doc 構造 = quick-fixes (collection、軽量)
- 6 doc 構造 = presentation-quality-hardening (= 4 + discovery-log + projectization、finite)
- 7 doc 構造 = reposteward-ai-ops-platform (= 6 + decision-audit、L3 重判断 institute)

→ 各 doc は独自 governance contract を持ち得る (= proposedKind 11 種に articulate された理由)。

**2. drawer pattern の articulate 観測**:
decision-audit.md は drawer Pattern 1 application の実例。drawer pattern (= references/05-aag-interface/
drawer/) は AAG が AI に提供する interface family であり、本 Reading Pass で初の application
articulate を観測。今後の Reading Pass で他 drawer pattern (Pattern 2/3/...) の application も
surface する可能性を articulate。

## Wave 2 / Phase 2.5 sub-PR 14: Reading Pass Batch 10 (= pure-calculation-reorg 一括、reviewedAtCommit 5b5a9d1)

> **目的**: projects/active/ zone shift 継続。pure-calculation-reorg (= 14 docs、最大規模 active project)
> 全件 articulate。AAG-COA mandatory artifact (= breaking-changes / legacy-retirement) を初観測、
> phase-8/ sub-structure (= phase-specific entry + readiness table + 4 promote 提案書) を articulate。
> 新 proposedKind 3 種 articulate (= project-breaking-changes + project-legacy-retirement +
> project-promotion-proposal)。

### Phase 2.5 sub-PR 14 (Reading Pass Batch 10、14 docs)

- [x] Wave 2 / Phase 2.5 sub-PR 14 着手 (= user 「1」承認、= pure-calculation-reorg 一括)
- [x] 14 docs を read + articulate: 標準 6 (AI_CONTEXT/checklist/discovery-log/HANDOFF/plan/projectization) + 拡張 2 (breaking-changes/legacy-retirement) + phase-8/ 6 (README + readiness-table + 4 proposals)
- [x] 14 entry を document-reading-decisions.yaml に append (= entries: 70 → 84、stage: in-progress)
- [x] 全 entry に同 disposition: keep-and-contract articulate
- [x] 全 entry に同 failurePatterns: [] articulate
- [x] 新 proposedKind 3 種 articulate:
  - project-breaking-changes (= AAG-COA mandatory when breakingChange:true、bidirectional with projectization)
  - project-legacy-retirement (= AAG-COA mandatory when requiresLegacyRetirement:true、bidirectional with projectization)
  - project-promotion-proposal (= AI scaffold draft + user signature 承認 form の固有 governance workflow)
- [x] candidates regenerate (= 328 → 314 candidates、HIGH 124 → 110、alreadyReviewedCount 70 → 84)
- [x] Failure Loop generator 再実行 (= clean batch 維持)
- [x] yaml schema validation OK (= ajv conform、reading-decisions in-progress 84 entries)
- [x] hard gate 追加なし (= Wave 2 advisory only)

### Phase 2.5 sub-PR 14 完了条件 (ADR-SCP-021 D7 + AAG-SCP-DOC-LEARNING-002 整合)

- [x] reading-decisions.yaml に Batch 10 14 entry append 済 (= 累計 84 entries、stage: in-progress)
- [x] proposedKind 14 種に拡張達成 (= 11 → 14)
- [x] AAG-COA mandatory artifact pattern 初観測 + articulate (= projectization.flag → breaking-changes / legacy-retirement の bidirectional governance contract)
- [x] phase-specific sub-structure 初観測 + articulate (= phase-8/ 配下の README + readiness-table + proposals/)
- [x] Promote Ceremony governance workflow articulate (= AI scaffold + user 承認 form)
- [x] active project 規模 spectrum articulate (= 4 doc / 6 doc / 7 doc / 14 doc の 4 段階)
- [x] 即 Gate 化禁止維持 (= AAG-SCP-DOC-LEARNING-002 整合)

### Phase 2.5 sub-PR 14 で articulate された pattern

**1. AAG-COA mandatory artifact bidirectional pair**:
projectization.json で breakingChange: true / requiresLegacyRetirement: true を declare すると、
対応する mandatory artifact (= breaking-changes.md / legacy-retirement.md) を要求される
governance contract が articulate された。両者は bidirectional pair:
- projectization.breakingChange: true ↔ breaking-changes.md 必須
- projectization.requiresLegacyRetirement: true ↔ legacy-retirement.md 必須

→ 将来の guard candidate: 'projectization で flag が true のとき対応 doc が存在することを機械検証'。

**2. Phase-specific sub-structure pattern**:
projects/active/<id>/phase-N/ の sub-directory 構造を初観測。中身:
- phase-N/README.md (= phase entry doc)
- phase-N/<artifact-type>/<id>.md (= per-Phase artifact、例: proposals/ANA-003-sensitivity.md)
- phase-N/<summary-view>.md (= phase 全体 summary、例: promotion-readiness-table.md)

→ Reading Pass の articulate では phase-N/ sub-structure も project の一部として articulate、
独立 zone として扱わない。

**3. Promote Ceremony governance workflow articulate**:
project-promotion-proposal は AI scaffold + user 承認 form の二段 workflow:
- AI: candidate 情報 + 観測 entry/exit criteria + 推奨順序を draft (= scaffold)
- user: 観測完了後 '承認待ち: user' を user signature で置換 (= 承認 form)

→ AI / user の責任配分が doc 構造に articulate される事例。proposal kind の固有 schema
(承認 form の存在) が新 kind articulate を裏打ち。

## Wave 2 / Phase 2.5 sub-PR 15: Reading Pass Batch 11 (= taxonomy-v2 + Failure Learning Loop 初 auto-promotion 実証、reviewedAtCommit 256da35)

> **目的**: projects/active/ zone shift 継続。taxonomy-v2 (= 17 docs、Level 4 Umbrella project)
> 全件 articulate。**重大発見**: 8 件 (DERIVED.md + derived/ 7 files) が projects/_template/
> identical 複製 → DOC-FAIL-DUPLICATE-RESPONSIBILITY を **初観測**、Failure Learning Loop の
> auto-promotion (= unobserved → guard candidate) が実証された。新 proposedKind 1 種 articulate
> (project-sub-project-map = Level 4 Umbrella 固有 governance)。

### Phase 2.5 sub-PR 15 (Reading Pass Batch 11、17 docs)

- [x] Wave 2 / Phase 2.5 sub-PR 15 着手 (= user 「1」承認、= taxonomy-v2 一括)
- [x] 17 docs を read + articulate: 標準 6 + AAG-COA mandatory 2 + DERIVED.md + derived/ 7 + sub-project-map.md
- [x] 17 entry を document-reading-decisions.yaml に append (= entries: 84 → 101、stage: in-progress)
- [x] **重大発見**: DERIVED.md + derived/ 7 files (= 8 件) が projects/_template/ と完全 identical (= diff 0) と判明、aag-scp が同位置で project-specific 内容にカスタマイズしている対比から duplicate と判断
- [x] 8 件に DOC-FAIL-DUPLICATE-RESPONSIBILITY 付与 + disposition: delete-candidate articulate (= 初観測の unobserved pattern)
- [x] 新 proposedKind 1 種 articulate: project-sub-project-map (= Level 4 Umbrella 固有 governance contract)
- [x] proposedKind 15 種に拡張達成 (= 14 → 15)
- [x] candidates regenerate (= 314 → 297 candidates、HIGH 110 → 93、alreadyReviewedCount 84 → 101)
- [x] **Failure Loop generator が初の auto-promotion 実証**:
  - DUPLICATE-RESPONSIBILITY: observedCount 0 → 8 (= 1 batch で観測)
  - computedMaturity: 'pattern-articulated' → 'guardrail-candidate-emitted' (= 自動昇格)
  - guard candidates total: 4 → 5 (= +1)
  - observed patterns: 6 → 7
  - unobserved patterns: 4 → 3
- [x] yaml schema validation OK (= ajv conform、reading-decisions in-progress 101 entries)
- [x] hard gate 追加なし (= Wave 2 advisory only)

### Phase 2.5 sub-PR 15 完了条件 (ADR-SCP-021 D7 + AAG-SCP-DOC-LEARNING-002 整合)

- [x] reading-decisions.yaml に Batch 11 17 entry append 済 (= 累計 101 entries、stage: in-progress)
- [x] proposedKind 15 種に拡張達成
- [x] 7 番目の disposition 'delete-candidate' を 9 件に拡大 (= 1 → 9、初の有意な delete 候補発見)
- [x] **Failure Learning Loop の design intent (= ratchet-down 自動化、CLAUDE.md G8) が実証**
- [x] Level 4 Umbrella project pattern 初観測 + articulate (= projectizationLevel spectrum 完成)
- [x] 即 Gate 化禁止維持 (= AAG-SCP-DOC-LEARNING-002 整合、guard candidate 昇格は次 Wave で gate 化判断)

### Phase 2.5 sub-PR 15 で articulate された重大発見

**1. taxonomy-v2/derived/ + DERIVED.md = projects/_template/ identical 複製**:

| Path (taxonomy-v2) | Path (_template) | 状態 |
|---|---|---|
| DERIVED.md | DERIVED.md | identical (diff 0) |
| derived/README.md | derived/README.md | identical |
| derived/acceptance-suite.md | derived/acceptance-suite.md | identical |
| derived/pr-breakdown.md | derived/pr-breakdown.md | identical |
| derived/review-checklist.md | derived/review-checklist.md | identical |
| derived/test-plan.md | derived/test-plan.md | identical |
| derived/inventory/README.md | derived/inventory/README.md | identical |
| derived/inventory/00-example.md | derived/inventory/00-example.md | identical |

aag-scp は同位置で project-specific 内容にカスタマイズ (= derived/README.md は Wave 2 deliverable
space articulate)、対して taxonomy-v2 は unfilled template copy のまま放置。

→ 8 件 disposition: delete-candidate (= 最終確認は user + bootstrap policy 整合性検証後)。
→ 同類 pattern が他 active project (= aag-scp 以外) で発生していないか Wave 3 以降で検証。

**2. Failure Learning Loop ratchet-down 自動化の実証**:

sub-PR 9 で着地した Failure Learning Loop infrastructure が **設計通りに機能** した:
- Reading Pass で 1 batch (8 件) の DUPLICATE-RESPONSIBILITY 観測
- Generator 再実行 で computedMaturity を 'pattern-articulated' → 'guardrail-candidate-emitted' に
  **自動昇格** (= observedCount >= 5 threshold で auto-promotion)
- guard candidate count が 4 → 5 に増加 (= Wave 3 着地候補が +1)

これは CLAUDE.md G8 (= 同種 failure 2 回観測 → guard 候補昇格) の機械化実装が正しく機能している
証拠。**ratchet-down mechanism は自動的に動作する**。

**3. proposedKind 15 種への拡張**:
project-sub-project-map (= Level 4 Umbrella 固有) を articulate。projectizationLevel spectrum:
- Level 2 = presentation-quality-hardening
- Level 3 = reposteward + pure-calculation-reorg
- Level 4 (Umbrella) = taxonomy-v2 (= 初観測、固有 governance contract)

## Wave 2 / Phase 2.5 sub-PR 16: Reading Pass Batch 12 (= aag-structural-control-plane self-reference 一括、reviewedAtCommit babfc69)

> **目的**: projects/active/ zone shift 継続。aag-structural-control-plane (= 自プロジェクト 17 docs)
> 全件 articulate (= self-reference)。新 sub-structure 2 種 (aag/scp-checkers/ + inquiry/) を articulate、
> 新 proposedKind 1 種 articulate (project-inquiry = Phase 0 投資調査記録)。projects/active/ zone
> 完遂 (= 6 active projects 全件)。

### Phase 2.5 sub-PR 16 (Reading Pass Batch 12、17 docs、self-reference)

- [x] Wave 2 / Phase 2.5 sub-PR 16 着手 (= user 「1」承認、= aag-scp 自プロジェクト一括)
- [x] 17 docs を read + articulate: 標準 7 + derived/README.md (customized) + aag/scp-checkers/README.md + inquiry/ 8
- [x] 17 entry を document-reading-decisions.yaml に append (= entries: 101 → 118、stage: in-progress)
- [x] 全 entry に同 disposition: keep-and-contract articulate
- [x] 全 entry に同 failurePatterns: [] articulate
- [x] 新 proposedKind 1 種 articulate: project-inquiry (= Phase 0 投資調査記録、PRE-decision investigation で decision-audit と区別)
- [x] proposedKind 16 種に拡張達成 (= 15 → 16)
- [x] derived/README.md (aag-scp) は customized = duplicate ではないこと articulate (= taxonomy-v2 identical copy と対比)
- [x] inquiry/08 採用済み status の articulate (= ADR-SCP-016 正式採用、本 batch の Wave 構造の正本 source)
- [x] candidates regenerate (= 297 → 280 candidates、HIGH 93 → 76、alreadyReviewedCount 101 → 118)
- [x] Failure Loop generator 再実行 (= clean batch、observed/guard candidates 状態維持)
- [x] yaml schema validation OK (= ajv conform、reading-decisions in-progress 118 entries)
- [x] hard gate 追加なし (= Wave 2 advisory only)

### Phase 2.5 sub-PR 16 完了条件 (ADR-SCP-021 D7 + AAG-SCP-DOC-LEARNING-002 整合)

- [x] reading-decisions.yaml に Batch 12 17 entry append 済 (= 累計 118 entries、stage: in-progress)
- [x] proposedKind 16 種に拡張達成
- [x] **projects/active/ zone 完遂** (= 6 active projects 全件 articulate: quick-fixes 4 + presentation-quality-hardening 6 + reposteward 7 + pure-calculation-reorg 14 + taxonomy-v2 17 + aag-scp 17 = 65)
- [x] 自プロジェクト self-reference articulate を慎重に実施 (= 各 entry の disposition / proposedKind は他 project と同 standard で articulate、self-bias 排除)
- [x] inquiry/ pattern の articulate (= PRE-decision investigation の保管役)
- [x] 即 Gate 化禁止維持 (= AAG-SCP-DOC-LEARNING-002 整合)

### Phase 2.5 sub-PR 16 で articulate された pattern

**1. inquiry/ pattern (= PRE-decision investigation の保管)**:

aag-scp は inquiry/ sub-directory に Phase 0 投資調査記録 8 件 (= 01-08 numbered) を articulate。
これは drawer Pattern 1 (= decision-audit の POST-decision lineage articulate) と異なる role:

| 役割 | location | content | timing |
|---|---|---|---|
| project-inquiry (新) | inquiry/<NN>-<topic>.md | PRE-decision investigation | decision 前 |
| project-decision-audit | decision-audit.md | POST-decision lineage | decision 後 |

inquiry → decision-audit に feeding する関係が articulate された (= ADR-SCP-001〜016 の各 ADR は対応する
inquiry/<NN> から導出)。inquiry は採用後も '後続の判断材料として参照する' role で keep-and-contract。

**2. 自プロジェクト self-reference articulate の慎重さ**:

本 batch は AAG Structural Control Plane (= 本 program 自身) の docs を articulate するため、
self-bias を排除する必要があった。各 entry の disposition / proposedKind は他 project の同 doc 種と
同 standard で articulate (= AI_CONTEXT は project-plan / checklist は project-checklist 等)、
self-bias による格上げ / 特別扱いを排除した。

**3. projects/active/ zone 完遂達成**:

Batch 7〜12 で projects/active/ 6 active project 全件 articulate 完遂 (= 累計 65 docs):
- Batch 7: quick-fixes 4 (= collection、軽量)
- Batch 8: presentation-quality-hardening 6 (= finite)
- Batch 9: reposteward 7 (= L3 重判断 institute)
- Batch 10: pure-calculation-reorg 14 (= AAG-COA mandatory + phase sub-structure)
- Batch 11: taxonomy-v2 17 (= Level 4 Umbrella、Failure Loop auto-promotion 実証)
- Batch 12: aag-scp 17 (= self-reference + inquiry sub-structure)

→ projects/active/ zone は次 Reading Pass の対象から除外、references/04-tracking/ + その他 zone へ
focus shift 可能。

## Wave 2 / Phase 2.5 sub-PR 17: Reading Pass Batch 13 (= elements/ 残 family 一括 charts/RM/UIC、reviewedAtCommit b80b2df)

> **目的**: projects/active/ zone 完遂後、references/04-tracking/elements/ へ shift back。
> charts (11) + read-models (11) + ui-components (6) + parent README (1) = 29 docs を一括 articulate。
> Batch 6 CALC-* と同 family pattern (= per-element 業務契約 spec) で全件 keep-and-contract / canonical-doc。
> charts/ の per-element directory 構造 (= R4 institute、README + implementation-ledger 二層) 初観測。

### Phase 2.5 sub-PR 17 (Reading Pass Batch 13、29 docs)

- [x] Wave 2 / Phase 2.5 sub-PR 17 着手 (= user 「1」承認、= elements/ 残 family へ shift back)
- [x] 29 docs を read + articulate:
  - elements/README.md (1)
  - charts/README.md + CHART-001〜005/{README, implementation-ledger}.md = 11
  - read-models/README.md + RM-001〜010.md = 11
  - ui-components/README.md + UIC-001〜005.md = 6
- [x] 29 entry を document-reading-decisions.yaml に append (= entries: 118 → 147、stage: in-progress)
- [x] 全 entry に同 disposition: keep-and-contract articulate
- [x] 全 entry に同 proposedKind: canonical-doc articulate
- [x] 全 entry に同 failurePatterns: [] articulate
- [x] charts/ per-element directory 構造の articulate (= README が主 spec、implementation-ledger が手書き履歴 layer、R4 institute mechanism)
- [x] generation script で frontmatter (= exportName + sourceRef + lifecycleStatus + category 等) 自動抽出 + entry 生成 (= /tmp/gen-batch13.mjs)
- [x] candidates regenerate (= 280 → 251 candidates、HIGH 76 → 47、alreadyReviewedCount 118 → 147)
- [x] Failure Loop generator 再実行 (= clean batch、observed/guard candidates 状態維持)
- [x] yaml schema validation OK (= ajv conform、reading-decisions in-progress 147 entries)
- [x] hard gate 追加なし (= Wave 2 advisory only)

### Phase 2.5 sub-PR 17 完了条件 (ADR-SCP-021 D7 + AAG-SCP-DOC-LEARNING-002 整合)

- [x] reading-decisions.yaml に Batch 13 29 entry append 済 (= 累計 147 entries、stage: in-progress)
- [x] elements/ 配下の charts / read-models / ui-components 3 family 完遂 (= widgets 46 を残し)
- [x] charts/ per-element directory 構造 (= README + implementation-ledger 二層) を初観測 + articulate
- [x] Batch 6 CALC-* family と同 throughput を再現 (= family-level 一括 articulate mechanism の再活用)
- [x] proposedKind 16 種維持 (= elements/ 配下は全て canonical-doc に統合、新 kind なし)
- [x] 即 Gate 化禁止維持

### Phase 2.5 sub-PR 17 で articulate された pattern

**1. per-element directory 構造 (= charts/ で R4 institute)**:

charts/CHART-NNN/ は flat .md ではなく directory 構造:
- CHART-NNN/README.md = 主 spec layer (= 機械検証可能な structured spec、frontmatter + sections)
- CHART-NNN/implementation-ledger.md = 手書き履歴 layer (= 改修履歴 + commit lineage + 変更 rationale)
- CHART-NNN/quality-status.generated.md = 機械生成 layer (= candidates では HIGH 外、generated)
- CHART-NNN/open-issues.generated.md = 機械生成 layer

→ 手書き / 機械生成の articulate な分離 mechanism (= aag-self-hosting-completion R4 で institute)。
flat .md (CALC/RM/UIC) より articulate richer な per-element infra layer。

**2. elements/ family の throughput pattern 再活用**:

Batch 6 で確立した CALC-* family-level 一括処理 mechanism を本 batch で再適用:
- 29 docs を 1 batch で articulate (= 個別 review より throughput 高)
- generation script で frontmatter 自動抽出 + entry 生成 (= 再現可能 articulate)
- 全件同 disposition / proposedKind articulate (= family pattern の活用)

→ Batch 14 (widgets 46) でも同 mechanism 適用予定。

## Wave 2 / Phase 2.5 sub-PR 18: Reading Pass Batch 14 (= HIGH priority 完遂、reviewedAtCommit cfae04e)

> **目的**: HIGH priority Reading Pass の最終 batch。widgets 46 + technical-debt-roadmap.md 1
> = 47 docs 一括 articulate。Wave 2 開始から累計 194 件の HIGH 文書を全件 articulate 完遂
> (= **HIGH 0 到達**)。残 candidates は MEDIUM 204 件のみ。

### Phase 2.5 sub-PR 18 (Reading Pass Batch 14、47 docs、HIGH 完遂)

- [x] Wave 2 / Phase 2.5 sub-PR 18 着手 (= user 「Batch 14 で HIGH 完遂」承認)
- [x] 47 docs を read + articulate:
  - elements/widgets/README.md (1)
  - elements/widgets/WID-001〜WID-045.md (45 widgets)
  - references/04-tracking/technical-debt-roadmap.md (1)
- [x] 47 entry を document-reading-decisions.yaml に append (= entries: 147 → 194、stage: in-progress)
- [x] 全 entry に同 disposition: keep-and-contract articulate
- [x] 全 entry に同 proposedKind: canonical-doc articulate
- [x] 全 entry に同 failurePatterns: [] articulate
- [x] technical-debt-roadmap.md の governance-articulated mixed temporal articulate (= judgment rationale doc、'件数の一次情報源は generated' で manual rationale と generated current value を articulate に分離、GENERATED-AS-MANUAL 違反なし)
- [x] generation script で frontmatter (= widgetDefId + registry + contextType + registrySource 等) 自動抽出 (= /tmp/gen-batch14.mjs)
- [x] candidates regenerate (= 251 → 204 candidates、**HIGH 47 → 0 (完遂)**、MEDIUM 204 のみ残、alreadyReviewedCount 147 → 194)
- [x] Failure Loop generator 再実行 (= clean batch、observed/guard candidates 状態維持)
- [x] yaml schema validation OK (= ajv conform、reading-decisions in-progress 194 entries)
- [x] hard gate 追加なし (= Wave 2 advisory only)

### Phase 2.5 sub-PR 18 完了条件 (ADR-SCP-021 D7 + AAG-SCP-DOC-LEARNING-002 整合)

- [x] reading-decisions.yaml に Batch 14 47 entry append 済 (= 累計 194 entries、stage: in-progress)
- [x] **HIGH priority Reading Pass 完遂達成** (= candidates HIGH 0、Wave 2 開始から 194 件全件 articulate)
- [x] elements/ 全 family 完遂 (= calculations 24 + charts 11 + read-models 11 + ui-components 6 + widgets 46 + parent README 1 = 99 elements docs articulate)
- [x] family-level 一括 articulate mechanism の最大規模適用 (= 47 件 1 batch、Batch 6 23 件 / Batch 13 29 件を上回る)
- [x] 即 Gate 化禁止維持

### Wave 2 Reading Pass HIGH 完遂後の状態

**Reading Pass 累計 progress (Batch 1〜14)**:
- candidates: 398 → 204 (= MEDIUM のみ残)
- alreadyReviewedCount: 0 → **194**
- HIGH priority remaining: 194 → **0** (完遂)
- proposedKind: 16 種 / disposition: 7 種
- delete-candidate: 9 件 / guard candidates: 5 件

**zone breakdown of articulated docs**:
- references/04-tracking/elements/ = 99 docs (calculations + charts + RM + UIC + widgets + parent)
- references/04-tracking/ 直下 + その他 = 30 docs (engine-maturity + open-issues + tracking + 11 promotion-readiness + 1 technical-debt-roadmap 等)
- projects/active/ = 65 docs (6 active projects 全件)
- CLAUDE.md = 1 doc

**Failure Learning Loop 累計成果**:
- totalObservedReferences: 0 → 50
- guard candidates (>=5 occurrences): 0 → 5
  - DOC-FAIL-PROJECT-CONTENT-IN-REFERENCE (16)
  - DOC-FAIL-LOCATION-MISMATCH (13)
  - DOC-FAIL-TEMPORAL-MIXING (6)
  - DOC-FAIL-DUPLICATE-RESPONSIBILITY (8)  ← Batch 11 で auto-promotion 実証
  - DOC-FAIL-GENERATED-AS-MANUAL (5)
- observed patterns: 7 (= 10 中 7、3 件 unobserved に縮小)
- unregistered DOC-FAIL-* 検出: 0 維持

## Wave 2 / Phase 2.5 sub-PR 19: Reading Pass Batch 15 (= 初の MEDIUM batch、projects/_template/ 一括、reviewedAtCommit 879f13e)

> **目的**: HIGH 完遂後、MEDIUM priority Reading Pass を着手。projects/_template/ (= 15 docs、
> canonical project bootstrap templates) を 1 batch で articulate。Batch 11 で観測した
> taxonomy-v2 duplicate の **canonical 側** articulate (= 8 件 duplicate の正本 source 確定)。
> 新 proposedKind 1 種 articulate (template-doc)。

### Phase 2.5 sub-PR 19 (Reading Pass Batch 15、15 docs、初 MEDIUM batch)

- [x] Wave 2 / Phase 2.5 sub-PR 19 着手 (= user 「1」承認、= MEDIUM 着手 + projects/_template/ 一括)
- [x] 15 docs を read + articulate: 標準 7 (AI_CONTEXT/checklist/decision-audit/discovery-log/HANDOFF/plan/projectization) + DERIVED.md + derived/ 7 (README + 5 templates + inventory/{README + 00-example})
- [x] 15 entry を document-reading-decisions.yaml に append (= entries: 194 → 209、stage: in-progress)
- [x] 全 entry に同 disposition: keep-and-contract articulate
- [x] 全 entry に同 proposedKind: template-doc articulate (= 新 kind)
- [x] 全 entry に同 failurePatterns: [] articulate
- [x] Batch 11 の duplicate finding に対する canonical 側 articulate 完成 (= taxonomy-v2/derived/* + DERIVED.md の正本 source 確定)
- [x] proposedKind 17 種に拡張達成 (= 16 → 17、新規: template-doc)
- [x] candidates regenerate (= 204 → 189 MEDIUM、alreadyReviewedCount 194 → 209)
- [x] Failure Loop generator 再実行 (= clean batch、observed/guard candidates 状態維持)
- [x] yaml schema validation OK (= ajv conform、reading-decisions in-progress 209 entries)
- [x] hard gate 追加なし (= Wave 2 advisory only)

### Phase 2.5 sub-PR 19 完了条件 (ADR-SCP-021 D7 + AAG-SCP-DOC-LEARNING-002 整合)

- [x] reading-decisions.yaml に Batch 15 15 entry append 済 (= 累計 209 entries、stage: in-progress)
- [x] 初の MEDIUM priority batch articulate 達成
- [x] projects/_template/ family 完遂 (= 15 件全件 articulate)
- [x] 新 proposedKind 'template-doc' articulate (= 17 種に拡張)
- [x] Batch 11 duplicate findings の canonical 側との bidirectional articulate 完成 (= duplicates field の cross-reference 経由)
- [x] 即 Gate 化禁止維持 (= AAG-SCP-DOC-LEARNING-002 整合)

### Phase 2.5 sub-PR 19 で articulate された pattern

**1. template-doc kind articulate**:

projects/_template/ 配下の 15 docs は全て **filled-in active project doc とは role が異なる**:
- template-doc = unfilled、placeholder 含む、bootstrap 時 copy + customize 対象 = canonical source
- active project docs (project-plan / project-checklist 等) = filled-in、project-specific 内容

→ 新 proposedKind 'template-doc' で role 区別を articulate。

**2. duplicate finding bidirectional articulate 完成**:

Batch 11 で観測した taxonomy-v2 duplicate (= 8 件 identical copy) の **canonical 側** articulate
完成。各 _template/<file> の duplicates field に対応する taxonomy-v2/<file> を articulate、
bidirectional graph 完成:

| canonical (_template) | duplicate (taxonomy-v2) |
|---|---|
| DERIVED.md | DERIVED.md |
| derived/README.md | derived/README.md |
| derived/acceptance-suite.md | derived/acceptance-suite.md |
| derived/inventory/00-example.md | derived/inventory/00-example.md |
| derived/inventory/README.md | derived/inventory/README.md |
| derived/pr-breakdown.md | derived/pr-breakdown.md |
| derived/review-checklist.md | derived/review-checklist.md |
| derived/test-plan.md | derived/test-plan.md |

→ Wave 3 で taxonomy-v2 側 8 件の delete 実行可能 (= canonical _template 側を保持、duplicate
削除で repo 整理)。

## AI 自己レビュー (= user 承認の手前)

> 本 section は **必ず最終レビュー (user 承認) の直前** に置く。実装 AI が project 完了前に
> 自分自身で品質 review を実施し、user 承認の入力を整える mechanism (= DA-β-002 で institute)。
> 機械検証: projectizationPolicyGuard PZ-13 (= section 存在 + ordering 検証、checkbox 内容は AI session 責任)。
> 詳細: `references/05-aag-interface/operations/project-checklist-governance.md` §3.2

- [ ] **総チェック**: 全 Wave 成果物 (commit / PR / 関連正本 / generated artifact) を AI が再 review し、scope 内 / 内容妥当 / 不可侵原則違反 0 を確認
- [ ] **歪み検出**: 実装中に scope 外 commit / 設計負債 / drawer Pattern 違反 / 隠れた前提変更 が無いことを確認
- [ ] **潜在バグ確認**: edge case / null 取扱 / 型 assertion / race condition / fail-safe paths を改めて点検
- [ ] **ドキュメント抜け漏れ確認**: 実装変更に対する README / CLAUDE.md / references/ / 関連 plan / decision-audit の更新が漏れなく完了
- [ ] **CHANGELOG.md 更新 + バージョン管理**: 該当 release entry 追記 + semver 適切 + project-metadata.json appVersion 整合 + aag/CHANGELOG.md aagVersion 整合（本 program は app +0.0.0 / aag +0.1）

## 最終レビュー (user 承認)

> このセクションは **必ず最後** に置き、user レビュー前は [ ] のままにする。
> 機能的な Phase + AI 自己レビューがすべて [x] になっても、ここが [ ] なら project は
> `in_progress` のまま留まり、archive obligation は発火しない。
> 詳細: `references/05-aag-interface/operations/project-checklist-governance.md` §3.1 / §6.2

- [ ] 全 Wave の成果物 (commit / PR / 関連正本 / generated artifact) を user がレビューし、archive プロセスへの移行を承認する
