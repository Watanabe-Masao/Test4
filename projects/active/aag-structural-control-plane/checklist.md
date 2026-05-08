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

- [ ] ADR-SCP-020 articulate（decision-audit.md）
- [ ] plan.md に Phase 2E section 追加 + Phase 3 description 整合
- [ ] checklist.md Phase 2E 項目 articulate + Phase 2 完了条件再 articulate（本 sub-PR で実施）
- [ ] `docs/contracts/schema/tree-contracts.schema.json` の status enum を 4 値に拡張（declared / unmanaged-but-tolerated / container-only / platform-config-tolerated、additive、ADR-SCP-004 不可侵）
- [ ] schema に `topLevelRationale` field（structured object: reason / cannotMoveBecause / continuityNote）追加 — `platform-config-tolerated` で必須、`container-only` で推奨
- [ ] schema に `nestedDeclaredChildren` field 追加 — `container-only` で必須（空 array 不可）
- [ ] `tools/governance/build-skeleton-diff.mjs` 拡張: `topLevelDispositionCandidate`（8 値: declared-root / container-only-root / platform-config-tolerated / tolerate / move-candidate / archive-candidate / delete-candidate / needs-triage）articulate logic 追加
- [ ] build-skeleton-diff.mjs に新 12 reasonCode logic 追加（既存 12 + 新 12 = 24）: TOP_LEVEL_OVERPOPULATED / POSSIBLE_ROOT_DUPLICATION / CONTAINER_ONLY_ROOT / PLATFORM_CONFIG_REQUIRED_AT_ROOT / POSSIBLE_MOVE_TO_APP / POSSIBLE_MOVE_TO_TOOLS / POSSIBLE_MOVE_TO_PROJECTS / POSSIBLE_MOVE_TO_AAG / POSSIBLE_MOVE_TO_REFERENCES / POSSIBLE_MOVE_TO_DOCS_CONTRACTS / POSSIBLE_DELETE_CANDIDATE / CURRENT_PROJECT_POINTER_CANDIDATE
- [ ] build-skeleton-diff.mjs に D5 個別 heuristic map articulate（app-domain/ → move-candidate + POSSIBLE_MOVE_TO_APP + POSSIBLE_ROOT_DUPLICATION 等、`CURRENT_PROJECT.md` → needs-triage + CURRENT_PROJECT_POINTER_CANDIDATE）
- [ ] schema 拡張は additive のみ（既存 declared 8 件 / `.vscode/` の articulate 変更なし、regression 0）
- [ ] 本 sub-PR では yaml refine と diff 再生成は行わない（Phase 2E-2 で実施）

#### Phase 2E-2 (sub-PR 6): feat — yaml refine + skeleton-diff regenerate

- [ ] `docs/contracts/src/repo/tree-contracts.yaml` で `docs/` を `container-only` として明示 articulate（`nestedDeclaredChildren: ["docs/contracts/"]` + `topLevelRationale` populate）
- [ ] tree-contracts.yaml で `.github/` を `platform-config-tolerated` に refine + `topLevelRationale` populate（reason / cannotMoveBecause / continuityNote）
- [ ] tree-contracts.yaml で `.claude/` を `platform-config-tolerated` に refine + `topLevelRationale` populate
- [ ] tree-contracts.yaml で `.vscode/` は `unmanaged-but-tolerated` 維持（platform-config 性質ではない、個人 IDE 設定）
- [ ] 既存 declared 8 件（app/ wasm/ aag/ aag-engine/ docs/contracts/ projects/ references/ tools/）の articulate 変更なし
- [ ] `docs/contracts/generated/skeleton-diff.generated.json` 再生成
- [ ] surface 確認: `app-domain/` `fixtures/` `scripts/` が `move-candidate` として出力
- [ ] surface 確認: `roles/` `workers/` `CURRENT_PROJECT.md` が `needs-triage` として出力
- [ ] surface 確認: `docs/` が `container-only-root` + `CONTAINER_ONLY_ROOT` reasonCode で出力
- [ ] surface 確認: `.github/` `.claude/` が `platform-config-tolerated` + `PLATFORM_CONFIG_REQUIRED_AT_ROOT` reasonCode で出力
- [ ] 削除 / 移動 / README 更新を行っていない（articulate-only 不可侵）
- [ ] CURRENT_PROJECT.md の中身改変なし（surface のみ、別 PR）
- [ ] cleanup inquiry を起こしていない（Wave 2 で起票）

### Phase 2 完了条件（ADR-SCP-019 + ADR-SCP-020 整合 + D8 抜け殻化防止）

- [x] Structural Skeleton top-level 8 件が tree-contracts.yaml に declared（Phase 2A）
- [x] repo-topology.generated.json が top-level-only + observed-only で生成（Phase 2B、`1918202` の content 上書き）
- [x] skeleton-diff.generated.json が 6 分類で生成（Phase 2C）
- [x] managed zone 3 件の Markdown / YAML / generated artifact 候補が observed-only として出力（Phase 2D）
- [ ] skeleton status enum が 4 値（declared / unmanaged-but-tolerated / container-only / platform-config-tolerated）に articulate（Phase 2E、ADR-SCP-020）
- [ ] skeleton-diff entry に topLevelDispositionCandidate（8 値）+ 24 reasonCode が articulate（Phase 2E、ADR-SCP-020）
- [ ] `docs/` が `container-only` として明示 articulate、`.github/` `.claude/` が `platform-config-tolerated` に refine（Phase 2E）
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

- [ ] Wave 1 / Phase 3 着手 user 承認

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
