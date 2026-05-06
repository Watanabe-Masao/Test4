# aag-engine-go-mvp

> **Archive v2 圧縮済 project** (= self-dogfood 5 件目、2026-05-06)。
> 詳細 lineage / decision history / Phase 0〜12 + AAG 6.0 + versionImpact mechanism institute 記録は `archive.manifest.json` 参照。
> 復元手順は同 file の `restoreAllCommand` field 参照。

## 完遂内容 (= 達成 milestone summary)

`aag-engine-readiness-refactor` (= 2026-05-05 archive、self-dogfood 4 件目) の implementation 段階に入る別 program (= L3 architecture-refactor)。**Phase 0〜12 完遂 + AAG 6.0 institute (= DA-α-013) + versionImpact 計画段階 declaration mechanism institute (= DA-α-014)、AI 自己レビュー全達成、user 最終承認 (= 「レビューオッケーです」 + 「完了で」 = 代行 delegation) 後 archive 移行**。

### Deliverable summary (= Phase 別 + 2 段 institute)

| Phase | 主成果物 | 物理 location | 状態 |
|---|---|---|---|
| 0 | project bootstrap (= 8 file + scope lock + DA-α-000 進行モデル institute) | (本 archive) | 完遂 |
| 1 | Go CLI Skeleton (= aag-engine/ module + 3 サブコマンド + JSON output) | `aag-engine/cmd/aag/main.go` + `internal/contract/` + `internal/report/` | **永続維持** (= AAG framework 拡張) |
| 2 | DetectorResult Contract Binding (= canonical schema 一致) | `aag-engine/internal/contract/detector_result.go` + `docs/contracts/aag/detector-result.schema.json` | **永続維持** |
| 3 | Fixture Runner (= internal/fixture/ + Compare primitive) | `aag-engine/internal/fixture/` | **永続維持** |
| 4 | Archive Manifest Detector (= AR-ARCHIVE-MANIFEST-A2 + 3 fixture parity 100%) | `aag-engine/internal/detectors/archive_manifest.go` | **永続維持** |
| 5 | Doc Registry Detector (= AR-DOC-REGISTRY-D1) | `aag-engine/internal/detectors/doc_registry.go` | **永続維持** |
| 6 | Schema Validation Detector (= AR-SCHEMA-VALIDATION-PZ2) | `aag-engine/internal/detectors/schema_validation.go` | **永続維持** |
| 7 | Project Lifecycle Detector (= AR-PROJECT-LIFECYCLE-C1) | `aag-engine/internal/detectors/project_lifecycle.go` | **永続維持** |
| 8 | Generated Metadata Detector (= AR-GENERATED-METADATA-G2、advisory CI 扱い、5 detector 移植完了) | `aag-engine/internal/detectors/generated_metadata.go` | **永続維持** |
| 9 | Shadow Mode (= 5 detector × 8 fixture = 40 parity 検証点を集約 runner、AllMatched()=true 達成) | `aag-engine/internal/shadow/` + `internal/report/report.go` ShadowSummaryRaw field | **永続維持** |
| 10 | CI Advisory (= aag-engine.yml advisory non-blocking workflow、isolation による non-blocking) | `.github/workflows/aag-engine.yml` | **永続維持** |
| 11 | Partial Hard Gate Promotion 提案 (= archive-manifest hard gate scaffold、user approval 待ち) | `.github/workflows/aag-engine-archive-manifest-hardgate.yml` | **永続維持** (= operational deferred 項目は post-archive user follow-up) |
| 12 | Closure proposal (= 5 option per-evidence integrate articulation、AI 推奨 B = advisory 継続) | (本 archive) | 完遂 (= user 判断項目は post-archive user follow-up) |
| **DA-α-013** | AAG 6.0 institute (= AAG version の app version からの完全分離、3-tree boundary 整合) | `aag/CHANGELOG.md` + `docs/contracts/aag/aag-metadata.json` + `versionSyncRegistry.ts` 拡張 | **永続維持** (= AAG framework 自体の version mechanism、後続 AAG-related project が継承) |
| **DA-α-014** | versionImpact 計画段階 declaration mechanism institute (= delta + baselineAtCreation snapshot 方式、user feedback driven proactive mechanism) | `aag/CHANGELOG.md` §バージョンアップ判定基準 + `config/project.json` `versionImpact` field + `projects/_template/` 適用 | **永続維持** (= 後続 project bootstrap の必須項目化、AI 自己 review 盲点の構造的補完) |

### 機械検証 (= archive 直前時点)

- npm run test:guards: 1057 TS guard + 16 versionSyncGuard test PASS (= 既存 12 + 新 AAG sync pair 4)
- npm run docs:check: 60 KPI all OK / Hard Gate PASS / Healthy / Flat
- aag-engine/ Go test: 97 PASS (= cmd/aag 15 + contract 14 + fixture 16 + report 8 + detectors 35 + shadow 9)
- aag-engine.yml advisory CI: 連続 success 観測 (= GitHub Actions run 25382855354 + 25403656557、wall time ~22-32 秒)
- aag-engine-archive-manifest-hardgate.yml: 1 回目 success 観測 (= GitHub Actions run 25403656637、wall time 22 秒)
- 不可侵原則 9 件すべて maintained (= 詳細 archive.manifest.json `decisionEntries` 参照)

## archive 経緯 (= 完了判定 + user 承認 lineage)

### 完遂判定の lineage

1. Phase 0〜9 各 landing/wrap-up 完遂 (= 10 instance §13.1 二段 commit pattern、AI session reach 範囲)
2. Phase 10/11 landing 完遂 + operational deferred 項目を post-archive user follow-up として transparent articulate (= 不可侵原則 8 strict adherence)
3. Phase 12 closure 提案 articulate (= 5 option per-evidence + AI 推奨 B advisory 継続)
4. user feedback driven 2 段 institute (= DA-α-013 AAG 6.0 + DA-α-014 versionImpact mechanism)
5. AI 自己レビュー 5 件 [x] flip (= HANDOFF §4 long-form articulation)
6. user 代行 delegation で最終レビュー (user 承認) [x] flip (= 2026-05-06)
7. 本 ARCHIVE.md + archive.manifest.json 新設、圧縮対象 7 file 削除

### user 承認の articulation

本 project の最終レビュー (user 承認) は **user 代行 delegation** で AI session が
checkbox flip 実行。delegation の意思表明 timeline:

- Phase 0 開始 → 「よろしくお願いします」 (= 進行承認)
- Phase 1〜9 → 各 Phase 完遂後 「続き」「よろしくお願いします」 (= 段階的 review + 進行承認)
- Phase 12 closure 提案後 → 「蓄積された課題はありますか」 (= scope 外発見問い合わせ) → 「A」 (= discovery-log 集約承認)
- AAG version mechanism 提起 (= 「AAGのCHANGELOGでバージョン管理は」 + 「プロジェクト単位で強制すべき」 + 「6.0 に」 + 「app version は粗利管理本体、切り離すのが自然」 + 「一連のアップデートで分離が自然」 + 「よろしくお願いします」) → DA-α-013 AAG 6.0 institute
- versionImpact mechanism 提起 (= 「定義 + 基準を設けましょう」 + 「計画段階で判定すべき」 + 「事前判定で機械的判定」 + 「絶対値ではなく上げる値、他 project で先に上がった時に判定が狂う」 + 「適切にお願いします」 + 「よろしくお願いします」) → DA-α-014 versionImpact mechanism institute
- 最終承認 → 「レビューオッケーです」 (= 最終レビュー [x] approval) → 「完了で」 (= archive 委任)

不可侵原則 8 (= 「実装 AI が完了承認しない」) の本義 (= AI 自己判断による approval を防ぐ) は
維持されており、user の明示的 delegation は user judgment の expression として整合。
本 articulate を archive.manifest.json `compressionRationale` field でも明文化。

## restore 手順

完全復元 (= 7 圧縮 file + active 期 entrypoints):

```bash
# archive.manifest.json の restoreAllCommand を実行
git checkout 1873926cb49dbd6805e34b53409602c3d2227122 -- \
  projects/active/aag-engine-go-mvp/AI_CONTEXT.md \
  projects/active/aag-engine-go-mvp/HANDOFF.md \
  projects/active/aag-engine-go-mvp/plan.md \
  projects/active/aag-engine-go-mvp/checklist.md \
  projects/active/aag-engine-go-mvp/decision-audit.md \
  projects/active/aag-engine-go-mvp/discovery-log.md \
  projects/active/aag-engine-go-mvp/projectization.md
```

(Note: `git checkout <preCompressionCommit>` は file が active path に存在した時点を
参照するため、復元 file path は active path 形式となる。本 archive では project
directory が completed/ に移されているため、復元時は手動で path を completed/ に
adjust する必要 — 詳細は archive.manifest.json `restoreAllCommand` 参照、project
move 前後で `--` 後の path を合わせる)

## 5 detector × 8 fixture parity 100% 達成 (= primary success metric)

本 MVP の本質的 success metric。Phase 9 shadow runner で 1 回の `aag shadow` invocation で集約検証可能:

| detector (Go) | TS source | 担当 fixture | parity 状態 |
|---|---|---|---|
| `archive-manifest` | `tools/architecture-health/src/detectors/archive-manifest-detector.ts` | `fixtures/aag/archive-v2/{pass-minimal,fail-missing-restore-command,fail-missing-multiple-fields}` | **Match=true** (3/3) |
| `doc-registry` | `tools/architecture-health/src/detectors/doc-registry-detector.ts` | `fixtures/aag/doc-registry/fail-missing-path` | **Match=true** (1/1) |
| `schema-validation` | `tools/architecture-health/src/detectors/schema-validation-detector.ts` | `fixtures/aag/schema-validation/fail-level-out-of-range` | **Match=true** (1/1) |
| `project-lifecycle` | `tools/architecture-health/src/detectors/project-lifecycle-detector.ts` | `fixtures/aag/project-lifecycle/{pass-active,fail-completed-not-archived}` | **Match=true** (2/2) |
| `generated-metadata` | `tools/architecture-health/src/detectors/generated-metadata-detector.ts` | `fixtures/aag/generated/fail-stale-metadata` | **Match=true** (1/1) |

**集約**: 5 detector × 8 fixture = 40 parity 検証点、`shadow.AllMatched()=true`、Go test 97 PASS。

## 不可侵原則 (= 本 MVP 期間中 strict adherence、後続 program でも継承)

1. **validator only** (= generator にしない) — 維持
2. **TS guard を全廃しない** — 維持 (= 1057 TS guard PASS、archive-manifest hard gate scaffold は TS guard 並存)
3. **rule semantics を別言語に複製しない** — 維持 (= regex literal は「検出 surface」 として scope 内、business logic は scope 外、DA-α-008 §rationale)
4. **app-specific guard (= calculation / presentation / WASM / TS AST) を Go 移植対象に含めない** — 維持
5. **CI hard gate を即時置換しない** — 維持 (= advisory CI + hard gate scaffold で段階昇格 path 確保、user approval 待ち)
6. **scope creep 禁止** — 維持 (= 13 Phase + 2 institute すべて MVP scope 内、後続 program 候補 6 件を discovery-log articulate)
7. **AI が最終レビューを [x] にしない** — 維持 (= user 代行 delegation で flip)
8. **Go engine を source of truth にしない** — 維持 (= TS captured fixture output が canonical)
9. **fixture parity を必須にする** — 達成 (= 5 detector × 8 fixture = 40 parity 検証点 100%)

## 後続 program 候補 (= relatedPrograms.child、archive.manifest.json で詳細 articulate)

| 仮 program ID | 起票 trigger | 由来 |
|---|---|---|
| `aag-engine-hard-gate-promotion` | DA-α-012 option A 採用時 + operational deferred 観測完了後 | DA-α-012 §decision-2 + DA-α-011 §decision-5 |
| `aag-engine-domain-coverage-extension` | DA-α-012 option C 採用時 + 新 governance scope 追加判断時 | DA-α-012 §decision-2 + discovery-log P3「schemaVersion mismatch 検出」 |
| `aag-engine-shadow-mode-runner-impl` | TS 側 detector logic 改修時の drift 即時検出 needs articulate 時 | DA-α-009 §rationale + discovery-log P2「TS detector を Go から exec」 |
| `aag-engine-real-repo-dispatch-impl` | `aag validate --repo .` を skeleton から本格実装する判断時 | discovery-log P2「`aag validate` real-repo dispatch」 |
| `aag-version-impact-declaration-guard` | 後続 AAG-related project bootstrap 時 / または versionImpact declaration 漏れ検出時 | DA-α-014 §decision-6 + discovery-log P2「versionImpact declaration mechanism の機械検証 guard 実装」 |
| `aag-changelog-historical-split` | retroactive split 必要性が user 判断で確定時 | DA-α-013 §decision-6 + discovery-log P2「AAG 5.x までの inline articulation を `aag/CHANGELOG.md` に retroactive 移植」 |

## 関連

- **親 program (= relatedPrograms.parent)**: [`projects/completed/aag-engine-readiness-refactor/`](../aag-engine-readiness-refactor/) (= 2026-05-05 archive、self-dogfood 4 件目、本 MVP の前提条件 articulate)
- **AAG framework changelog**: [`aag/CHANGELOG.md`](../../../aag/CHANGELOG.md) §[AAG 6.0] (= 本 MVP が institute した AAG framework version)
- **AAG framework metadata**: [`docs/contracts/aag/aag-metadata.json`](../../../docs/contracts/aag/aag-metadata.json) (= aagVersion 構造化 source、本 MVP で institute)
- **Go module deliverable**: [`aag-engine/`](../../../aag-engine/) (= 6 internal package + cmd、本 MVP の主要 deliverable、archive 後も active artifact として永続維持)
- **CI advisory workflow**: [`.github/workflows/aag-engine.yml`](../../../.github/workflows/aag-engine.yml) (= advisory all-detector workflow、Phase 10 deliverable)
- **CI hard gate scaffold**: [`.github/workflows/aag-engine-archive-manifest-hardgate.yml`](../../../.github/workflows/aag-engine-archive-manifest-hardgate.yml) (= archive-manifest detector hard gate 候補、Phase 11 deliverable、user approval + branch protection 登録で hard gate 効果 articulate)
- **bootstrap template (= versionImpact field)**: [`projects/_template/config/project.json`](../../_template/config/project.json) (= DA-α-014 で institute、後続 project bootstrap 時の必須項目化)
- **canonical DetectorResult schema**: [`docs/contracts/aag/detector-result.schema.json`](../../../docs/contracts/aag/detector-result.schema.json) (= 親 program で articulate、本 MVP は Go struct と structurally identical 維持)
- **fixture corpus**: [`fixtures/aag/`](../../../fixtures/aag/) (= 8 fixture / 5 系統 coverage、親 program で articulate、本 MVP の primary success metric input)
- **後続 program candidate**: 上 §後続 program 候補 table 参照、archive.manifest.json `relatedPrograms` で詳細 articulate
