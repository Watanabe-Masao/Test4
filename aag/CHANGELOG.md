# AAG Framework 変更履歴（AAG CHANGELOG）

AAG framework (= Adaptive Architecture Governance) の version 単位の変更を記録します。
**app (粗利管理ツール) の変更は本 file scope 外** — repo root の `CHANGELOG.md` を参照。

## 役割分担 (= 3-tree boundary 整合、第二階層)

| 軸 | source of truth (file) | 構造化 source (JSON) | reader |
|---|---|---|---|
| **app** version | `CHANGELOG.md` (= repo root) | `docs/contracts/project-metadata.json` `appVersion` | 粗利管理 user-facing reader |
| **AAG** version | `aag/CHANGELOG.md` (= 本 file) | `docs/contracts/aag/aag-metadata.json` `aagVersion` | AAG framework reader |

> **bridge note (= AAG 5.x までの歴史)**:
> AAG 5.x (= AAG 5.1 / AAG 5.2) までの version 変更は repo root `CHANGELOG.md` の各 release section title 内 inline articulate されています (= v1.9.0 → AAG 5.1 / v1.10.0 → AAG 5.2)。
> これは 3-tree boundary 分離 (= aag-self-hosting-completion, 2026-05-04 完遂) 以前の articulation 形式であり、retroactive split は scope 外 (= 別 program `aag-changelog-historical-split` 起票候補)。
> **AAG 6.0 以降は本 file が canonical** (= 2026-05-06 aag-engine-go-mvp Phase 12 closure で institute)。

## バージョニングポリシー

[Semantic Versioning 2.0.0](https://semver.org/lang/ja/) を AAG framework 範囲で適用:

- **MAJOR** (X.0): paradigm shift (= 既存 governance mechanism の根本構造変更、rule semantics 移植 boundary 拡張、validator paradigm 変更等)
- **MINOR** (0.Y): 機能追加・改善 (= 新 detector / 新 guard / 新 governance protocol / 新 operational pattern 追加、後方互換あり)
- **PATCH** (= 採用しない、AAG 範囲では本質的に minor 以上の articulation を伴うため)

> **app version との独立**: AAG version は app/package.json `version` / `project-metadata.json` `appVersion` とは **完全独立** に進化。app user-facing 変更なしで AAG version 単独 bump 可能 (= 本 AAG 6.0 が 1 例目)。

## バージョンアップ判定基準 (= 計画段階で project ごとに declare、2026-05-06 institute、DA-α-014)

> **原則**: 「気をつけるではなく mechanism として運用」 (= AAG philosophy)。バージョンアップ判定は **project 着手段階** (= AAG-COA scope 検討と同 timing) で `config/project.json` の `versionImpact` field に declare。archive 移行時に `versionImpactGuard` (= 別 program `aag-version-impact-declaration-guard` で実装、本 MVP では schema + self-dogfood + criteria articulation のみ) が declared vs actual の整合を機械検証することで「未更新の AI 単独判断による看過」 を構造的に防止。

### 判定基準 table

#### app version (= 粗利管理 user-facing、semver X.Y.Z)

| level | delta 表記 | trigger |
|---|---|---|
| `none` | `+0.0.0` | user-facing app behavior 不変 (= calculation / UI / store / data shape 全て不変) |
| `patch` | `+0.0.1` | bug fix / docs only、behavior 不変 |
| `minor` | `+0.1.0` | 新機能 / 改善 (= backward-compatible) |
| `major` | `+1.0.0` | 破壊的変更 (= data format incompat / API removal / 撤去) |

#### AAG version (= AAG framework 自体、X.Y)

| level | delta 表記 | trigger |
|---|---|---|
| `none` | `+0.0` | AAG 構造変更なし (= 内部 refactor / dependency update のみ) |
| `minor` | `+0.1` | 新 detector / 新 guard / 新 governance protocol / 新 operational pattern (= backward-compatible) |
| `major` | `+1.0` | paradigm shift (= validator boundary 拡張 / source of truth 変更 / 不可侵原則 reformulation / 新 mechanism kind) |

### delta + baselineAtCreation snapshot 方式

declare 形式 (= `config/project.json` の `versionImpact` field):

```json
"versionImpact": {
  "app": {
    "baselineAtCreation": "<X.Y.Z>",
    "delta": "+<dx.dy.dz>",
    "rationale": "<判断根拠 1-2 文、本 §判定基準 table reference>"
  },
  "aag": {
    "baselineAtCreation": "<X.Y>",
    "delta": "+<dx.dy>",
    "rationale": "<判断根拠 1-2 文、本 §判定基準 table reference>"
  }
}
```

**並列 / out-of-order project への耐性 (= 絶対値 declare では判定狂う、user 直接 directive)**:

- 単純な絶対値 declare (= e.g., `targetVersion: "6.0"`) では他 project が先に bump した時に「自 project が contribute したか」 が判定不能
- delta + baselineAtCreation で:
  - **expectedTargetVersion** = `baselineAtCreation + delta` (= semver 加算) を archive 時に算出
  - 並列 project (= 同 baseline + 同 delta) → 同 expectedTargetVersion → CHANGELOG entry 1 つに複数 project が relatedPrograms で reference されれば全 PASS
  - sequential (= A 先完了で AAG 5.2 → 6.0 後、B が baseline 5.2 + delta `+0.1` で archive) → expected 5.3、CHANGELOG 5.3 entry を要求 (= 6.0 とは独立 entry articulate 必要)
  - out-of-order: A の expectedTarget 5.3 / B の expectedTarget 6.0 で B 先完了 → A の 5.3 entry は B の 6.0 entry 後に追加可能 (= 別 entry のため衝突なし)
- 競合 declare (= 同 baseline + 同 delta だが意味的に別 paradigm の 2 project) → expected 衝突を検出可能 → user 判断で baseline 再 snapshot or entry 統合

### 機械検証 logic (= versionImpactGuard、別 program で実装予定)

archive 移行 trigger (= active → archived):

1. `expectedTargetVersion` = `baselineAtCreation + delta` (semver 加算) を算出
2. CHANGELOG (= app or AAG) に `## [<expectedTargetVersion>]` 形式 entry が存在するか検証
3. 当該 entry の body or `relatedPrograms` で本 project ID が reference されているか検証
4. delta = none (= `+0.0.0` or `+0.0`) は entry / reference 検証 skip (= 判定対象外)
5. (1)〜(3) すべて satisfy → PASS、いずれか欠落 → hard fail

これにより:
- AI 自己 review 盲点による未更新の看過 → archive trigger で hard fail
- declare 段階の rationale が後続 audit で navigable (= 判断履歴の transparent 化)
- user の bump 判断 burden を archive 直前ではなく **計画段階** に前倒し

## [AAG 6.0] - 2026-05-06

### Read-Only Governance Engine (Go MVP)

**paradigm shift**: AAG framework に **外部 read-only governance validator** を導入。従来の TS-only guard 群 (= app-domain integrity / calculation / presentation / WASM AST guard 等) を **永続維持** しつつ、repo / governance / archive / lifecycle / metadata の 5 系統に対する **言語非依存 validator** (= Go 実装) を articulate。

- **Go module `aag-engine/`** 新設 (= 6 internal package = `cmd/aag` + `internal/contract` + `internal/detectors` + `internal/fixture` + `internal/report` + `internal/shadow`)
- **5 detector 移植完了** (= TS 側 detector の output parity 検証側として):
  - `archive-manifest` (= AR-ARCHIVE-MANIFEST-A2、12 required field 検出)
  - `doc-registry` (= AR-DOC-REGISTRY-D1、missing path 検出)
  - `schema-validation` (= AR-SCHEMA-VALIDATION-PZ2、projectization.level 範囲検出)
  - `project-lifecycle` (= AR-PROJECT-LIFECYCLE-C1、completed-not-archived 検出)
  - `generated-metadata` (= AR-GENERATED-METADATA-G2、stale metadata 検出、advisory CI 扱い)
- **3 CLI subcommand**: `aag validate` (= Phase 1 skeleton、real-repo dispatch は post-MVP) / `aag fixtures` (= fixture catalog 出力) / `aag shadow` (= 5 detector × 8 fixture = 40 parity 検証点を集約)
- **Fixture parity 100% 達成** (= 8 fixture すべてで TS captured output と Go 出力が field-level Match=true、`shadow.AllMatched()=true`)
- **DetectorResult contract**: `docs/contracts/aag/detector-result.schema.json` (= JSON Schema draft-07) を Go struct と structurally identical に articulate (= field name / order / type 一致)
- **2 advisory CI workflow** 新設 (= 既存 `ci.yml` と完全独立、isolation による non-blocking advisory):
  - `.github/workflows/aag-engine.yml` (= advisory all-detector、go test + 3 subcommand)
  - `.github/workflows/aag-engine-archive-manifest-hardgate.yml` (= archive-manifest hard gate 候補、user approval + branch protection 登録で hard gate 効果 articulate)
- **97 Go test PASS** (= cmd/aag 15 + contract 14 + fixture 16 + report 8 + detectors 35 + shadow 9) + **TS guard 1057 PASS** (= 並走整合)
- **Institutional articulation**:
  - `isolation による advisory` pattern (= continue-on-error より transparent、branch protection 登録という単一 operational flip point)
  - `json.RawMessage` 循環依存回避 pattern (= 集約 layer を report に embed する Go 慣用)
  - `fixture name prefix routing` (= forward-compatible dispatch、新 fixture 追加時 shadow runner 修正不要)
  - `obligation map per-commit 履行義務` (= workflow modify → 必ず metadata $comment update を含む follow-up commit、Phase 10/11 で institute)
  - `AAG version の app version からの分離` (= 本 AAG 6.0 で institute、本 file が AAG canonical changelog として確立)

### 不可侵原則 (= 本 MVP 期間中 strict adherence、後続 program でも継承)

1. validator only (= generator にしない)
2. TS guard を全廃しない
3. rule semantics を別言語に複製しない (= regex literal は「検出 surface」 として scope 内、business logic 判断は scope 外)
4. app-specific guard (= calculation / presentation / WASM / TS AST) を Go 移植対象に含めない
5. CI hard gate を即時置換しない (= shadow mode 期間 + user approval 経て段階昇格)
6. scope creep 禁止
7. AI が最終レビューを [x] にしない
8. Go engine を source of truth にしない (= TS captured output が canonical)
9. fixture parity を必須にする (= primary success metric)

### relatedPrograms (= 親 / 子 articulation)

- **parent**: `aag-engine-readiness-refactor` (= 2026-05-05 archive、本 MVP の前提条件 = engine input 5 分類 + 8 fixture corpus + DetectorResult schema + path-helpers articulation)
- **child candidate** (= post-MVP user 判断、`projects/active/aag-engine-go-mvp/discovery-log.md` §別 program candidate):
  - `aag-engine-hard-gate-promotion` (= 残 4 detector の段階昇格)
  - `aag-engine-domain-coverage-extension` (= 新 governance scope 追加)
  - `aag-engine-shadow-mode-runner-impl` (= TS detector を Go から exec する真の TS 並走 mode)
  - `aag-engine-real-repo-dispatch-impl` (= `aag validate --repo .` skeleton 解消)
  - `aag-changelog-vertical-obligation-guard` (= AAG-tagged project は本 file 更新を mechanical 強制する guard)
  - `aag-changelog-historical-split` (= AAG 5.x までの inline articulation を本 file に retroactive 移植)

### 新規追加 file

- `aag-engine/` (= Go module root、6 internal package + cmd)
- `.github/workflows/aag-engine.yml`
- `.github/workflows/aag-engine-archive-manifest-hardgate.yml`
- `aag/CHANGELOG.md` (= 本 file、AAG framework changelog の canonical articulation)
- `docs/contracts/aag/aag-metadata.json` (= AAG version 構造化 source)
- `projects/active/aag-engine-go-mvp/` (= 本 program 8 file = AI_CONTEXT / HANDOFF / plan / checklist / projectization / discovery-log / decision-audit + config/project.json)
