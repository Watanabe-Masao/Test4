# plan — reposteward-ai-ops-platform

## 不可侵原則

1. **JSON-first** — 全 AAG Parameters / SourceFacts / Task Capsule / Premise Contract / DetectorResult / generated artifact は JSON。**YAML 採用禁止**。schema は `docs/contracts/aag/*.schema.json` に articulate し、`aagContractSchemaSyncGuard` 系で TS / Go 両側の整合を機械検証する (= Go MVP 確立済 mechanism 継承)。
2. **AI-first / Human-UI 不在** — 全 command の primary output は **JSON**、secondary は Markdown summary 限定。**browser dashboard / Human UI を作らない**。理由: 本 program の目的は AI session の探索コスト最小化であり、Human UI は scope 違い (= 別 program で必要なら articulate)。
3. **Read-only first** — Wave 1〜3 で実装する command は全て **read-only**: 検出 / 説明 / locate / summarize / recommend / generate repair-context のみ。**auto edit / auto checklist flip / auto archive / auto generated rewrite を実装しない**。修復は AI session が judgement + commit-bound rollback で実行する責務。
4. **主検出は構造、annotation は補助** — Task Capsule / SourceFacts / DetectorResult / cleanliness 検出の **主入力は path / diff / schema / facts / project structure / import graph**。コメント annotation (= `@premise` / `@canonicalRef` / `@reason` / `@expiresAt`) は **secondary metadata** に留める。理由: annotation 駆動は腐敗しやすく、構造駆動は機械的に再現可能。
5. **DetectorResult-first** — 全 violation / warning / advisory output は **既存 `DetectorResult` contract に統一** (= Go MVP で確立済の 5 detector × 8 fixture parity contract、`docs/contracts/aag/detector-result.schema.json`)。新 detector / 新 cleanliness / 新 comment violation も同 schema に寄せる。
6. **Additive-only / Wave 1 milestone 到達前は hard gate 追加しない** — 新規 mechanism (= Task Capsule / Parameters / SourceFacts / commands) は **既存 TS guard / docs:generate / Go MVP detector に追加** され、置換しない (= Go MVP 不可侵原則 4/5 継承)。hard gate 化は Wave 1 milestone 到達 + user 判断後に **別 program** (= `aag-engine-hard-gate-promotion` 候補) で切り出す。
7. **Wave-by-wave delivery** — 各 Wave は独立 PR で landing。Wave 1 内でも 6 step を 6 PR (= bootstrap 後の 6 連 PR) に分割。理由: 肥大化抑止 + review 負荷分散 + rollback granularity 確保。
8. **versionImpact は計画段階で declare 済 (app: +0.0.0 / aag: +0.1)** — 実 archive 時に paradigm shift が surface したら DA entry を articulate して delta を escalate する。本 program は backward-compatible な additive mechanism のみで minor 想定。

## Phase 構造

### Phase 0: Bootstrap (本 PR で完了)

- `projects/active/reposteward-ai-ops-platform/` 配下 8 ファイル一式 landing
- `references/04-tracking/open-issues.md` の active projects 索引追加
- `cd app && npm run docs:generate` で project-health に新 project が `derivedStatus = in_progress` で登録されることを確認
- `cd app && npm run test:guards` PASS 確認 (= projectizationPolicyGuard / checklistFormatGuard / projectCompletionConsistencyGuard 等)
- DA-α-000 (進行モデル) + DA-α-001 (project naming) + DA-α-002 (Wave 1 reordering / Task Capsule prepend) を articulate

完了条件: 上記すべて PASS かつ user 承認による checklist.md 最終レビュー [x] flip。

### Wave 1: Task Capsule + Parameters + Facts + Stats (= 最初の実利 milestone、5〜6 PR)

> **Wave 1 を Task Capsule で開始する判断**: DA-α-002 (= bootstrap session で landing)。stats files / rule locate / changed --explain は **個別の道具** だが、Task Capsule は「作業仕様書 + 安全境界 + 参照索引 + 検証手順」を 1 JSON に束ねる **operating layer** で、これが先にあると後続の全 command が AI-friendly に接続される。

1. **Task Capsule schema v1** — `docs/contracts/aag/task-capsule.schema.json` 単体の最小 PR。fields: `taskId / projectId / intent / repoHealth / currentState / goal / nonGoals / requiredReads / targetFiles / relatedCommands / expectedOutputs / repairPolicy`
2. **`reposteward task prepare` MVP** — `aag-engine/internal/taskcapsule/` に Go 実装、最初の対象 project は `reposteward-ai-ops-platform` 自身 (= self-dogfood)。出力は schema v1 準拠 JSON
3. **AAG Parameters v1** — `docs/contracts/aag/aag-parameters.schema.json` + `aag/parameters/aag-parameters.json`。最初は `codeSize.metric=effectiveCodeLines` + 14 bucket + `excludedKinds=[generated, fixture, archive]` のみ。Task Capsule の constraints source として接続
4. **SourceFacts v1** — `tools/architecture-health/src/facts/source-facts.ts` + collector + `docs/contracts/aag/source-facts.schema.json` + `references/04-tracking/generated/source-facts.json`。Task Capsule の facts source として接続
5. **Effective LOC statistics** — `references/04-tracking/generated/aag-size-statistics.json` (= bucket distribution + p50/p75/p90/p95/p99/max + layer 別 distribution)。**Health KPI integration は deferred** (= DA-β-003 articulate、threshold policy 未確定 + Hard Gate FAIL リスク + 不可侵原則 6 整合のため、`code.size.effectiveLoc.{p90,p95,max}` の Health KPI 化は別 program で baseline + ratchet-down 設計と同時に articulate)
6. **`reposteward stats files` query** — `aag-engine/` に command landing。`--metric effectiveCodeLines --range N..M` / `--bucket loc.021_030` / `--above p95 --layer presentation` 等

完了条件: 全 6 PR landed + Health Hard Gate PASS 維持 + 新 hard gate 0 追加 + Task Capsule self-dogfood 出力が schema v1 valid。

### Wave 2: 既存 size guard の effective LOC 化 (= 歪み修正、2 PR)

7. `app/src/test/guards/sizeGuard.test.ts` を effectiveCodeLines 化 (= raw line count → effective、baseline 再計算 + ratchet-down 維持)
8. `app/src/test/audits/architectureStateAudit.test.ts` の raw line count 修正
9. Health report に bucket distribution table 追加 (= `references/04-tracking/generated/architecture-health.generated.md`)

完了条件: コメント追加が size penalty にならない状態 + 全 guard PASS。

### Wave 3: AI navigation MVP (= command surface 拡張、5 PR)

10. `reposteward where-am-i` (= 現在地 / branch / activeProject / repoHealth / openObligations / recommendedNextCommand)
11. `reposteward context --project <id>` (= projectId 受領 → required reads / constraints / next actions、Task Capsule の subset)
12. `reposteward changed --explain --base <ref> --head <ref>` (= 既存 `obligation-collector.ts` 発展、changedFiles / affectedAreas / requiredChecks / requiredCoChanges / requiredReads)
13. `reposteward rule locate <ruleId>` (= ruleId → definition / guards / parameters / docs)
14. `reposteward detector refs <detectorId>` (= detectorId → goImplementation / tsImplementation / schema / fixtures)

完了条件: AI が search なしで上記 5 navigation に到達可能。

### Wave 4: Cleanliness / Comments / Docs rules (= 配置・コメント governance、4 PR)

15. `reposteward clean check` / `clean misplaced --kind generated` / `clean unregistered-docs` (= generated 混入 / docs/contracts narrative / fixtures production doc / archive.manifest.json 不在 / projectId 重複 / generated metadata 不在)
16. `reposteward comments list --kind todo|suppression|expired` (= TODO/FIXME projectId 必須 / suppression reason+expiresAt 必須 / @canonicalRef 存在検証)
17. `reposteward docs placement-check` (= 長期方針=references / project work=projects/active / archived=projects/completed+Archive v2 / schema=docs/contracts / generated=references/04-tracking/generated / fixture=fixtures)
18. Detection Inventory v2 (= preparatory doc work、`references/03-implementation/detection-inventory-v2.md` + `docs/contracts/aag/detection-inventory.schema.json` + `references/04-tracking/generated/detection-inventory.json`、Wave 4 の入力として完成)

完了条件: 配置散乱 / コメント腐敗 / doc-source drift が command で検出可能。

### Wave 5: Premise / Repair / Next (= 修復 loop + 自走、5 PR)

19. `docs/contracts/aag/premise-contract.schema.json` + `aag/parameters/premise-contracts.json` (= path → required reads / required co-changes の宣言契約)
20. `reposteward obligation check --changed-only` 拡張 (= 既存 `obligation-collector.ts` の path-based obligation を code / schema / fixture / test に広げる)
21. `reposteward repair-context --from detector-results.json` (= DetectorResult / obligation / cleanliness / comment violation から AI が読むべき repair context を JSON で返す)
22. `reposteward task validate` / `task close` (= Task Capsule の validate / close 補助)
23. `reposteward project stale` / `reposteward next` (= stale project 検出 + next action recommendation)

完了条件: AI が変更影響 / 修復文脈 / 次アクションまで command で自走可能。

## やってはいけないこと

- **TypeScript guard を全廃する** → Go MVP 不可侵原則 4 違反、本 program は parallel implementation で TS 不変
- **React / TS AST / WASM / domain calculation guard を Go に移植する** → Go MVP 不可侵原則 5 違反、業務 logic 不可触
- **docs:generate を Go に移管する** → TS 維持、本 program scope 外
- **業務 logic (= calculation / UI / store / data shape) を Go に複製する** → 不可侵原則 6 違反 (additive-only) + Go MVP 不可侵原則 5 違反
- **Human UI / browser dashboard を作る** → 不可侵原則 2 違反、AI-first / JSON output 限定
- **YAML を採用する** → 不可侵原則 1 違反
- **Wave 1 milestone 到達前に hard gate を追加する** → 不可侵原則 3 + 6 違反、advisory のみ
- **AAG Parameters を新たな source of truth にしすぎる** → 既存 calculationCanonRegistry / readModels の正本性は不変、parameters は可変設定の articulation のみ
- **コメント annotation を主検出経路にする** → 不可侵原則 4 違反、構造駆動が主
- **実装 AI による自己承認** → L3 + requiresHumanApproval=true、最終レビュー = user 承認 必須
- **Wave 2 以降を Wave 1 と同 PR に混ぜる** → 不可侵原則 7 違反、肥大化抑止
- **Detection Inventory v2 を Wave 1 の critical path に戻す** → DA-α-002 で preparatory に降格、Task Capsule + Parameters + Facts + Stats を最先頭に置く判断を棄却しない

## 関連実装

| パス | 役割 |
|---|---|
| `aag-engine/` | Go MVP 本体 (= 5 detector + fixture parity)、本 program で `internal/taskcapsule/` 等を追加 |
| `aag-engine/internal/taskcapsule/` | Wave 1 #2 で landing 予定 (= `reposteward task prepare` MVP) |
| `docs/contracts/aag/task-capsule.schema.json` | Wave 1 #1 で landing 予定 (= JSON contract) |
| `docs/contracts/aag/aag-parameters.schema.json` | Wave 1 #3 で landing 予定 |
| `aag/parameters/aag-parameters.json` | Wave 1 #3 で landing 予定 (= 可変設定 articulation) |
| `docs/contracts/aag/source-facts.schema.json` | Wave 1 #4 で landing 予定 |
| `tools/architecture-health/src/facts/` | Wave 1 #4 で landing 予定 (= SourceFacts collector) |
| `references/04-tracking/generated/source-facts.json` | Wave 1 #4 で生成 |
| `references/04-tracking/generated/aag-size-statistics.json` | Wave 1 #5 で生成 |
| `app/src/test/guards/sizeGuard.test.ts` | Wave 2 #7 で effective LOC 化 |
| `app/src/test/audits/architectureStateAudit.test.ts` | Wave 2 #8 で raw line count 修正 |
| `tools/architecture-health/src/collectors/obligation-collector.ts` | Wave 3 #12 + Wave 5 #20 で拡張 |
| `references/03-implementation/detection-inventory-v2.md` | Wave 4 #18 で landing (= preparatory doc work、Wave non-blocking) |
| `docs/contracts/aag/detector-result.schema.json` | Go MVP で確立済、本 program は同 schema に寄せる |
| `projects/completed/aag-engine-go-mvp/ARCHIVE.md` | 前提 program、不可侵原則 4/5 継承 |
| `aag/CHANGELOG.md` | AAG version 履歴、本 program archive 時に [AAG 6.1] entry 追加 |
