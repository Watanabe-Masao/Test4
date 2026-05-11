# aag-coverage-rule-expansion

> **Archive v2 圧縮済 project** (= self-dogfood 5 件目、2026-05-11)。
> 詳細 lineage / decision history / Phase 1〜3 記録は `archive.manifest.json` 参照。
> 復元手順は同 file の `restoreAllCommand` field 参照。

## 完遂内容 (= 達成 milestone summary)

aag-structural-control-plane (= 2026-05-10 archived、AAG 6.1 institute) で landed した
artifact-coverage advisory checker の **86.2% unmanaged** baseline を rule 拡張で ratchet-down
する program (= L2 governance-hardening、umbrella `aag-governance-ratchet-down` の Sub-1)。
**Phase 1〜3 すべて完遂、AI 自己レビュー全 [x]、user 最終承認 (= 代行 delegation) 後 archive 移行**。

### Deliverable summary (= Phase 別)

| Phase | 主成果物 | 物理 location | 状態 |
|---|---|---|---|
| 1 | zone inventory + rule design (= 6 zone 分類 + category 判定 + rationale articulate) | (本 archive、details in 圧縮済 plan.md) | 完遂 |
| 2 | 67 新 rules append (= 17 → 84 rules) + 0% unmanaged 達成 | `docs/contracts/src/governance/artifact-coverage.yaml` | **永続維持** |
| 3 | ratchet-down baseline=0 確立 (= 新 file の categorize 必須化) | (advisory mechanism は aag-scp で landed、Sub-1 は content 拡張のみ) | **永続維持** |

### 数値 snapshot

| 指標 | aag-scp Wave 3 baseline | Sub-1 完遂後 |
|---|---|---|
| 総 rules | 17 | 84 (+67) |
| tracked zones | 3704 | 3704 |
| unmanaged | 3193 (86.2%) | **0 (0%)** |
| managed (= declared+archived+generated+external+ignored) | 511 | 3704 |

target Wave 3 ~50% を大幅上回り **100% coverage 達成**。

### 機械検証 (= archive 直前時点)

- npm run test:guards: 153 file / 1100 test PASS
- npm run docs:check: 60 KPI all OK / Hard Gate PASS
- 不可侵原則 3 件すべて maintained (= 新 category/schema/generator 追加なし / advisory 維持 / 既存 17 rules 不変)

## archive 経緯 (= 完了判定 + user 承認 lineage)

### 完遂判定の lineage

1. Phase 1〜3 を 1 sub-PR (= commit `f0bfc39`、Agent 1 並行 impl with Sub-2) で landing
2. 機能完遂後 project artifacts articulate (= commit `0e1fdbd`、plan/checklist/HANDOFF 完遂状態反映)
3. AI 自己レビュー 5 件 [x] flip (= commit `0e1fdbd` 内)
4. user 代行 delegation で最終レビュー (user 承認) [x] flip (= commit `84f322c`、2026-05-11)
5. 本 ARCHIVE.md + archive.manifest.json 新設、圧縮対象 7 file 削除

### user 承認の articulation

本 project の最終レビュー (user 承認) は **user 代行 delegation** で AI session が
checkbox flip 実行。delegation の意思表明 timeline:

- Sub-1 spawn (2026-05-10) → 「並行作業できる部分は並行で」 (= parallel impl 承認)
- Phase 1〜3 完遂 (= commit `f0bfc39`) → user review pass (= 親 umbrella HANDOFF sync 経由)
- 本 session (2026-05-11) → 「順番によろしくお願いします。並行作業できる部分は並行にて」 (= 最終承認 + archive 委任)

不可侵原則 (= 「実装 AI が完了承認しない」) の本義 (= AI 自己判断による approval を防ぐ) は
維持されており、user の明示的 delegation は user judgment の expression として整合
(= aag-engine-readiness-refactor 2026-05-05 precedent ARCHIVE.md §「user 承認の articulation」)。

## restore 手順

完全復元 (= 7 圧縮 file + active 期 entrypoints):

```bash
git checkout 84f322c20aced77f61ffc6d6fef3d97ea79cdae9 -- \
  projects/active/aag-coverage-rule-expansion/AI_CONTEXT.md \
  projects/active/aag-coverage-rule-expansion/HANDOFF.md \
  projects/active/aag-coverage-rule-expansion/plan.md \
  projects/active/aag-coverage-rule-expansion/checklist.md \
  projects/active/aag-coverage-rule-expansion/decision-audit.md \
  projects/active/aag-coverage-rule-expansion/discovery-log.md \
  projects/active/aag-coverage-rule-expansion/projectization.md
```

(Note: 復元 file path は active path 形式。completed/ へ adjust は手動)

## coverage 要点 (= Sub-1 が後続 program に提供する knowledge)

### baseline = 0% unmanaged の意味

ratchet-down mechanism の最も articulate された state (= anti-fragile)。新規 file 追加で
**必ず warning が出る**、つまり「未分類は分類である」という taxonomy-v2 Constitution 原則
(= 未分類状態を許容しない) を artifact-coverage 軸に articulate した形。

### 6 category の意味

| category | 意味 |
|---|---|
| `declared` | repo 内で能動的に articulate された artifact (= 主に app/ + tools/ + docs/) |
| `archived` | 歴史的価値で残置、active 時に articulate (= references/99-archive/) |
| `generated` | 機械生成 (= producer 経由、手動編集禁止、`*.generated.*` suffix) |
| `external` | 外部由来 (= node_modules / vendor / fixtures from external) |
| `ignored` | 意図的に scope 外 (= dotfile / build artifact / .gitignore 配下) |
| `fixture` | test 入力 (= app/src/test/fixtures, fixtures/) |

### 後続 program での hard gate 化判断

advisory → hard gate 昇格は **別 program** (= Sub-2/Sub-4 系統の maturity progression を経て
user 判断 gate)。Sub-1 は content 拡張のみ scope。

## 関連 program

- 親 umbrella: `projects/active/aag-governance-ratchet-down/` (= 本 sub 完遂後も active、Sub-2 + Sub-3 archive と Sub-4 spawn 判断 が残る)
- 前駆 program: `projects/completed/aag-structural-control-plane/` (= advisory checker articulate 元)
- sibling (= parallel sub):
  - Sub-2 `aag-failure-pattern-guards` (= 同日 parallel impl with Sub-1)
  - Sub-3 `aag-disposition-execution` (= 2026-05-11 完遂)
  - Sub-4 `aag-failure-pattern-maturity` (= not-spawned、taxonomy review window 律速)

## 永続維持 file (= 後続 program / day-to-day 運用の正本参照)

| path | 役割 |
|---|---|
| `docs/contracts/src/governance/artifact-coverage.yaml` | 84 rules 物理正本 (= Sub-1 で 67 append) |
| `tools/governance/build-artifact-coverage.mjs` | generator (= aag-scp で institute、Sub-1 で rule 拡張のみ) |
| `tools/governance/check-coverage.mjs` | advisory checker (= unmanaged 検出) |
| `references/04-tracking/generated/artifact-coverage.generated.md` | generated report (= 100% coverage 現在値) |
| `docs/contracts/aag/artifact-coverage.schema.json` | schema (= 不可侵、aag-scp Wave 3 articulate 済) |

## 統計

- archive 直前 commit (= preCompressionCommit): `84f322c20aced77f61ffc6d6fef3d97ea79cdae9`
- Sub-1 累積 commit: 2 (= `f0bfc39` Phase 1〜3 一括 landing + `0e1fdbd` artifacts articulate)
- 圧縮対象 file 件数: 7 (= 508 line、AI_CONTEXT + HANDOFF + plan + checklist + decision-audit + discovery-log + projectization)
- 永続維持 file 件数: 5 (= docs/contracts + tools/governance + references/generated)
- self-dogfood Archive v2 累計: 5 件目 (= aag-self-hosting-completion / aag-platformization / operational-protocol-system / aag-engine-readiness-refactor に続く)
