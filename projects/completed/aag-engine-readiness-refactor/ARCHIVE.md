# aag-engine-readiness-refactor

> **Archive v2 圧縮済 project** (= self-dogfood 4 件目、2026-05-05)。
> 詳細 lineage / decision history / Phase 0〜7 記録は `archive.manifest.json` 参照。
> 復元手順は同 file の `restoreAllCommand` field 参照。

## 完遂内容 (= 達成 milestone summary)

Go / Rust 等への engine 部分移行に向けた TS 側構造事前整備 project (= L3 architecture-refactor)。
**Phase 0〜7 すべて完遂、AI 自己レビュー全達成、user 最終承認 (= 代行 delegation) 後 archive 移行**。

### Deliverable summary (= Phase 別)

| Phase | 主成果物 | 物理 location | 状態 |
|---|---|---|---|
| 0 | project bootstrap (= 9 file + scope lock + DA 進行モデル institute) | (本 archive) | 完遂 |
| 1 | AAG Input Inventory (= 5 分類 + 3 状態問題 articulate) | `references/03-implementation/aag-engine-readiness-inventory.md` | **永続維持** (= 後続 engine 実装 project の正本参照) |
| 2 | DetectorResult TS implementation + 1 系統 demonstration | `tools/architecture-health/src/detector-result.ts` + `detectors/project-lifecycle-detector.ts` | **永続維持** |
| 3 | 4 系統 systematic adoption + evaluator + layered model README | `tools/architecture-health/src/detectors/{archive-manifest,doc-registry,generated-metadata,schema-validation}-detector.ts` + `detectors/README.md` | **永続維持** |
| 4 | path-helpers foundation + 3 detector adoption | `tools/architecture-health/src/path-helpers.ts` | **永続維持** |
| 5 | Fixture corpus 8 件 + parity test 9 件 | `fixtures/aag/` + `app/src/test/guards/detectorResultModuleGuard.test.ts` Phase 5 group | **永続維持** |
| 6 | 残り 2 detector adoption + Logic Boundary Reference | `detectors/README.md` + 2 detector update | **永続維持** |
| 7 | Engine Readiness Report (= No-Go boundary articulate) | (本 archive、`engine-readiness-report.md` は圧縮対象、要点は本 ARCHIVE.md §「engine readiness 要点」 に summary) | **本 ARCHIVE.md 内 summary + 圧縮 file 復元可能** |

### 機械検証 (= archive 直前時点)

- npm run test:guards: 147 file / 1057 test PASS
- npm run docs:check: 60 KPI all OK / Hard Gate PASS
- 不可侵原則 8 件すべて maintained (= 詳細 archive.manifest.json `decisionEntries` 参照)

## archive 経緯 (= 完了判定 + user 承認 lineage)

### 完遂判定の lineage

1. Phase 0〜7 各 landing/wrap-up 完遂 (= 全 8 instance §13.1 二段 commit pattern)
2. Phase 7 wrap-up commit (`c5ef374`) で全機能 [x] flip + AI 自己レビュー 5 件 [x]
3. user 代行 delegation で最終レビュー (user 承認) [x] flip (= 2026-05-05)
4. 本 ARCHIVE.md + archive.manifest.json 新設、圧縮対象 8 file 削除

### user 承認の articulation

本 project の最終レビュー (user 承認) は **user 代行 delegation** で AI session が
checkbox flip 実行。delegation の意思表明 timeline:

- Phase 0 開始 → 「よろしくお願いします」 (= 進行承認)
- Phase 1〜6 → 各 Phase 完遂後 「続き」「よろしくお願いします」 (= 段階的 review + 進行承認)
- Phase 7 完遂後 → 「代行でよろしくお願いします」 (= 最終承認 + archive 委任)

不可侵原則 8 (= 「実装 AI が完了承認しない」) の本義 (= AI 自己判断による approval を防ぐ) は
維持されており、user の明示的 delegation は user judgment の expression として整合。
本 articulate を archive.manifest.json `compressionRationale` field でも明文化。

## restore 手順

完全復元 (= 8 圧縮 file + active 期 entrypoints):

```bash
# archive.manifest.json の restoreAllCommand を実行
git checkout ad37e2c807e27bf60f9875c82715ea4a5977de82 -- \
  projects/completed/aag-engine-readiness-refactor/AI_CONTEXT.md \
  projects/completed/aag-engine-readiness-refactor/HANDOFF.md \
  projects/completed/aag-engine-readiness-refactor/plan.md \
  projects/completed/aag-engine-readiness-refactor/checklist.md \
  projects/completed/aag-engine-readiness-refactor/decision-audit.md \
  projects/completed/aag-engine-readiness-refactor/discovery-log.md \
  projects/completed/aag-engine-readiness-refactor/projectization.md \
  projects/completed/aag-engine-readiness-refactor/engine-readiness-report.md
```

(Note: `git checkout <preCompressionCommit>` は file が active path に存在した時点を
参照するため、復元 file path は active path 形式となる。本 archive では project
directory が completed/ に移されているため、復元時は手動で path を completed/ に
adjust する必要 — 詳細は archive.manifest.json `restoreAllCommand` 参照、project
move 前後で `--` 後の path を合わせる)

## engine readiness 要点 (= engine-readiness-report.md §1〜§11 summary)

後続 engine 実装 project (= `aag-engine-go-mvp` 等) が参照すべき主要 articulate:

### 移行可能 detector (= engine MVP scope = 5 系統)

| 系統 | ruleId | 移植可能性 |
|---|---|---|
| project lifecycle | `AR-PROJECT-LIFECYCLE-C1` | 高 |
| archive manifest | `AR-ARCHIVE-MANIFEST-A2` | 高 |
| doc registry | `AR-DOC-REGISTRY-D1` | 高 |
| generated metadata | `AR-GENERATED-METADATA-G2` | 中 (= regex pattern 同期義務) |
| schema validation | `AR-SCHEMA-VALIDATION-PZ2` | 高 |

### TS 側残置 (= engine 化対象外、不可侵原則 5)

calculation / presentation / temporal / TS AST / WASM bridge 系の production guard。
app domain knowledge を engine 側に複製しないため TS 残置が canonical。

### Go engine MVP 範囲

- **input**: docs/contracts/aag/* (3 件) + generated/*.json (= input only) + project lifecycle 3 状態 + fixtures/aag/ (= parity test 主軸)
- **output**: DetectorResult[] (= JSON serialized)、schema-conformant (= `docs/contracts/aag/detector-result.schema.json`)
- **shadow mode**: 5 detector × 8 fixture = 40 parity 検証点
- **hard gate 化判定**: MVP 4 hard gate + 1 advisory (= G2 は false positive 余地、観測期間後昇格判断)
- **移植優先順位**: archive-manifest → doc-registry → schema-validation → project-lifecycle → generated-metadata (= コスト昇順)

### Go 実装開始条件 (= 別 program 起票時)

1. 不可侵原則 1 反転 (= Go 実装に入る)
2. 不可侵原則 2 / 4 / 5 維持 (= 既存 guard 不変 / rule semantics 不複製 / app-specific 排除)
3. shadow mode 4 週間並走推奨

## 関連

- 親 program: なし (= 本 project が engine readiness program family の root)
- sibling: なし
- child candidate (= post-archive 別 program 起票候補):
  - `aag-engine-go-mvp` (= Go engine MVP 実装、本 readiness を input にする)
  - `aag-engine-rust-mvp` (= Rust 採用時の代替 program)
  - 残り production guard refactor (= Vitest wrapper thin 化、別 program scope)

## 永続維持 file (= 後続 engine 実装 project の正本参照、archive 後も active doc として運用継続)

| path | 役割 |
|---|---|
| `references/03-implementation/aag-engine-readiness-inventory.md` | engine input 5 分類 + 3 状態問題 |
| `tools/architecture-health/src/detector-result.ts` | DetectorResult TS implementation + evaluator |
| `tools/architecture-health/src/detectors/*.ts` | 5 detector pure logic |
| `tools/architecture-health/src/detectors/README.md` | 4 層 layered model + Logic Boundary Reference + Vitest wrapper thin 化 reference |
| `tools/architecture-health/src/path-helpers.ts` | RepoPath / RepoFileEntry + 4 規約 |
| `fixtures/aag/` | 8 fixture (= shadow mode parity 主軸) + README |
| `docs/contracts/aag/detector-result.schema.json` | canonical schema (= JSON Schema draft-07) |
| `docs/contracts/aag/project-archive.schema.json` | Archive v2 schema |
| `app/src/test/guards/detectorResultModuleGuard.test.ts` | 動作 contract (= 85 unit test) |
| `app/src/test/guards/aagContractSchemaSyncGuard.test.ts` | TS interface ↔ schema sync 検証 |

これらは本 archive 後も **永続維持** (= 圧縮対象外)、reader (= 後続 engine 実装 AI session)
が day-to-day で reach 可能。

## 統計

- archive 直前 commit: `ad37e2c807e27bf60f9875c82715ea4a5977de82`
- Phase 0〜7 累積 commit: 31 (= 本 archive transition commit を除く)
- §13 commit pattern: 二段 8 / atomic 1 / regen 17
- DA 件数: 8 (= DA-α-000 進行モデル + DA-α-001〜007 各 Phase)
- 全 DA 振り返り判定: **正しい** (= 8/8)
- 圧縮対象 file 件数: 8 (= ~1,772 line)
- 永続維持 file 件数: 10+ (= references / tools / fixtures / app/test / docs/contracts)
- self-dogfood Archive v2 累計: 4 件目 (= aag-self-hosting-completion / aag-platformization / operational-protocol-system に続く)
