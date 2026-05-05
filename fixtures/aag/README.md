# AAG Fixture Corpus

> **位置付け**: `aag-engine-readiness-refactor` project Phase 5 deliverable。
> 将来 Go / Rust engine が同じ DetectorResult[] を返すかを検証する parity test
> の input / expected output。

## 構造

各 fixture directory は 2 file で articulate:

| file | 役割 |
|---|---|
| `input.json` | detector layer の facts 入力 (= collector が articulate するであろう facts の JSON 形式) |
| `expected.json` | 期待される `DetectorResult[]` (= deterministic ordering 済、`renderDetectorResultsAsJson` 形式と整合) |

## fixture 一覧 (= Phase 5 完遂時点、8 fixture)

| 系統 | fixture | 検出 ruleId | facts 概要 | expected violation 数 |
|---|---|---|---|---|
| archive manifest | `archive-v2/pass-minimal` | (none) | 12 required field すべて articulate | 0 |
| archive manifest | `archive-v2/fail-missing-restore-command` | AR-ARCHIVE-MANIFEST-A2 | restoreAllCommand のみ欠落 | 1 |
| archive manifest | `archive-v2/fail-missing-multiple-fields` | AR-ARCHIVE-MANIFEST-A2 | 3 field 欠落 (= restoreAllCommand / decisionEntries / commitLineage) | 3 |
| project lifecycle | `project-lifecycle/pass-active` | (none) | active / in_progress project のみ | 0 |
| project lifecycle | `project-lifecycle/fail-completed-not-archived` | AR-PROJECT-LIFECYCLE-C1 | completed but archive 未実施 | 1 |
| doc registry | `doc-registry/fail-missing-path` | AR-DOC-REGISTRY-D1 | 登録 path が file system に存在しない | 1 |
| generated metadata | `generated/fail-stale-metadata` | AR-GENERATED-METADATA-G2 | GENERATED marker / ISO timestamp 両方欠落 | 1 |
| schema validation | `schema-validation/fail-level-out-of-range` | AR-SCHEMA-VALIDATION-PZ2 | level=5 (= 0〜4 範囲外) | 1 |

= 8 fixture (= plan.md 「6〜8 件」 を 2 件 superset、coverage は 5 系統すべて articulate)。

## parity test

`app/src/test/guards/detectorResultModuleGuard.test.ts` の Phase 5 group で
each fixture について以下を機械検証:

1. `input.json` を read → 各 detector に渡す
2. detector 出力 `DetectorResult[]` を取得
3. `expected.json` を read
4. 両者 deep equality を assert

これにより:

- **engine 移行可能性**: Go / Rust engine が同 input を読んで同 expected を返せば parity 成立
- **regression 防御**: 既存 detector logic 変更で fixture が fail (= silent drift 防止)
- **後続 violation rule 追加時の articulation**: 新 violation rule を detector が emit するようになったら fixture expected を update する pattern

## 不可侵原則 (= aag-engine-readiness-refactor plan.md 不可侵原則 2)

各 fixture の expected DetectorResult は **現時点の detector 出力と完全に一致**。
detector logic を意味的に変更する場合は (a) 新 project 起票 + (b) fixture
expected update の co-change が必要。本 fixture corpus は detector の **意味
固定** を機械検証するための **anchor**。

## 関連

- `tools/architecture-health/src/detectors/README.md` — 4 層 layered model + 5 detector 一覧
- `tools/architecture-health/src/detector-result.ts` — DetectorResult contract + evaluator
- `tools/architecture-health/src/path-helpers.ts` — path 規約 + RepoFileEntry (= Phase 4)
- `app/src/test/guards/detectorResultModuleGuard.test.ts` — parity test
- `projects/active/aag-engine-readiness-refactor/plan.md` — 親 project plan
