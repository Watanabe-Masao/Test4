# derived — aag-structural-control-plane (Wave 2 deliverable space)

> 役割: Wave 2 / Phase 2.5 (Document Reset Pass + Failure Learning Loop) で蓄積される派生成果物の配置先。
> Wave 1 (本 program 現在進行中) では articulate のみ、本 directory には Wave 2 着手時に成果物が landing する。

## Wave 2 で landing 予定の成果物 (ADR-SCP-021 D7 整合)

### Document Reset Pass 蓄積物

- `document-reset-reading-log.md` — hot zone 4 件の各 Markdown 文書の精査記録
  - 記録項目: path / currentRole / proposedKind / temporalScope / owner / consumer / hasCurrentContract / hasHistory / hasFuturePlan / hasGeneratedCurrentValue / duplicates / disposition (9 値) / rationale
  - 蓄積タイミング: Wave 2 / Phase 2.5 着手後、各 Reading session で incremental に append
  - 整合: AAG-SCP-DOC-RESET-001~005 (不可侵原則 16) + ADR-SCP-021 D1

### Failure Learning Loop 抽出物

- `document-failure-patterns.md` — Document Reset Pass で抽出された DOC-FAIL-* failure pattern 蓄積記録
  - DOC-FAIL-* taxonomy (10 patterns、ADR-SCP-021 D4 articulate 済): TEMPORAL-MIXING / DUPLICATE-RESPONSIBILITY / LOCATION-MISMATCH / GENERATED-AS-MANUAL / UNOWNED-DOC / UNEXPLAINED-CANONICAL / PROJECT-CONTENT-IN-REFERENCE / ARCHIVE-CONTENT-IN-CANONICAL / AI-ROUTING-AMBIGUITY / README-OVEREXPLAINS-UNREVIEWED-STRUCTURE
  - 蓄積後、成熟したものから `docs/contracts/src/docs/document-failure-taxonomy.yaml` へ昇格 (Wave 2 後段、AAG-SCP-PARSE2-005 整合)
  - 整合: AAG-SCP-DOC-LEARNING-001~004 (不可侵原則 17) + ADR-SCP-021 D2/D4

## Wave 2 / Phase 2.5 sub-PR 3 で landed infrastructure (= Reading Pass 着手準備 完遂)

Reading Pass 実行に必要な infrastructure が docs/contracts/ 配下に landing 済 (= 本 program の derived/ 配下ではなく、再利用可能な contract として):

- `docs/contracts/schema/document-reading-decisions.schema.json` — Reading 結果 entry shape (= ADR-SCP-021 D7 整合: 9 disposition + 5 hasX flags + reviewedBy + reviewedAtSha + rationaleSummary)
- `docs/contracts/src/docs/document-reading-decisions.yaml` — Reading 結果 authoring source (= 初版 stage: empty、Reading Pass 進行で incremental に append)
- `docs/contracts/schema/document-failure-taxonomy.schema.json` — DOC-FAIL-* pattern shape
- `docs/contracts/src/docs/document-failure-taxonomy.yaml` — 10 DOC-FAIL-* pre-articulate patterns landed (= 下記 L18 の 10 patterns を pattern-articulated stage で landing 済)
- `tools/governance/build-document-reading-candidates.mjs` — Reading Pass 入力 candidates 生成 (= document-universe.generated.json から、kind=canonical-doc/project-plan/repo-entrypoint/unknown を hot zone priority で articulate)
- `docs/contracts/generated/document-reading-candidates.generated.json` — 398 candidates (HIGH 194 + MEDIUM 204) initial 出力

## Reading Pass 実行 workflow (= 次 sub-PR 以降)

各 Reading session で:

1. `docs/contracts/generated/document-reading-candidates.generated.json` を input として priority HIGH の candidate から精査
2. 各 doc を read し、5 hasX flags + duplicates + proposedKind + temporalScope + disposition (9 値の 1) + rationaleSummary を articulate
3. `docs/contracts/src/docs/document-reading-decisions.yaml` の `entries:` に append
4. observed failure pattern があれば `docs/contracts/src/docs/document-failure-taxonomy.yaml` の対応 entry の `examplePaths` に追加 (= maturityHint promote 候補)
5. `node tools/governance/build-document-reading-candidates.mjs` 再実行 → reviewed paths が candidates から自動除外

各 Reading session で 5〜20 文書ずつ articulate 推奨 (= 過剰負荷回避)。

## Wave 2 後段で landing 予定の追加成果物

- `document-reset-reading-log.md` — hot zone 4 件の各 Markdown 文書の精査経緯記録 (= 本 derived/ 配下、yaml entry の補足 narrative articulate)
- `document-failure-patterns.md` — DOC-FAIL-* 抽出経緯記録 (= 本 derived/ 配下、taxonomy yaml の補足 narrative articulate)
- `tools/governance/build-document-reading-decisions.mjs` — yaml→json normalize generator (= entries が non-empty になった時点で landing)
- `tools/governance/build-document-reading-merged.mjs` — src + candidates の join projection generator (= progress tracking)
- `docs/contracts/schema/document-guardrail-candidates.schema.json` + yaml — DOC-GUARD-* candidate registry (= Reading Pass で初 candidate が emerged 時点で landing)

## 不可侵 (Wave 1 / Phase 2E batch 整合)

- 本 README は **Wave 2 deliverables の articulate** を担う (= placeholder ではない、Wave 2 設計 contract)
- Wave 2 着手 user 承認 前に本 directory に成果物を landing しない
- 本 README が articulate する future deliverable filename は ADR-SCP-021 + plan.md Wave 2 / Phase 2.5 deliverables section との整合を維持する (= 名称 drift は ADR + plan + 本 README の同時 update)
