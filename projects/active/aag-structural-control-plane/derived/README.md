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

## Wave 1 articulate-only (本 directory 現状)

本 README.md のみ landing。Wave 2 着手 (= Wave 1 exit criteria 全件 PASS + user 承認後) まで他成果物は追加しない (= 不可侵原則 9 順序逆行禁止)。

## 不可侵 (Wave 1 / Phase 2E batch 整合)

- 本 README は **Wave 2 deliverables の articulate** を担う (= placeholder ではない、Wave 2 設計 contract)
- Wave 2 着手 user 承認 前に本 directory に成果物を landing しない
- 本 README が articulate する future deliverable filename は ADR-SCP-021 + plan.md Wave 2 / Phase 2.5 deliverables section との整合を維持する (= 名称 drift は ADR + plan + 本 README の同時 update)
