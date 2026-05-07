# scp-checkers — aag-structural-control-plane project-scoped boundary protection

> **役割**: 本 program が約束する **「触ってはいけない / 変更してはいけない / 崩してはいけない」boundary protection** を CI level で foul させる project-scoped checker 群（plan.md「やってはいけないこと」§A2、ADR-SCP-014 / AAG-SCP-GUIDANCE-007）。
>
> **image**: AI が安心してアクセルを踏めるように、事前にコース固有のガードレールを敷く。AI は本筋（Tree / Document / Temporal の構造補助設計）に集中でき、boundary 逸脱の不安に認知資源を奪われない。
>
> **scope**: parse-free spirit 限定（`git` + `grep` + well-known config field 抽出のみ、Markdown semantic / TS AST 解析禁止）+ phase 不変（本 program 全期間 Phase 0〜10 を通じて一貫禁止）+ project lifetime（archive 時に Archive v2 §6.4 で `aag/` folder ごと物理削除）。
>
> **実装方式**: declarative YAML + TypeScript common runner（ADR-SCP-015 D1）。各 checker は `<id>.yaml` 1 ファイル、共通 runner は `tools/governance/run-scp-checker.ts`（§A1 配置、永続）。

## 1. 設計原則（GUIDANCE-007 + ADR-SCP-015）

- **lifecycle**: 本 program active 期間のみ。archive 時に物理削除（次 program は別の boundary を持つため、コース固有 guardrail は撤去）
- **invocation**: `aag scp check --project aag-structural-control-plane <checker>`（aag-engine = 薄い dispatcher、Node script `node tools/governance/run-scp-checker.mjs --project <id> --checker <name>` を呼ぶ）
- **output**: Finding JSON（ADR-SCP-013 schema 準拠、`docs/contracts/schema/aag-finding.schema.json`）
- **配置**: 本 directory（`projects/active/aag-structural-control-plane/aag/scp-checkers/<id>.yaml`、per-checker 1 file）
- **detection method**: parse-free spirit 限定（`git diff --name-only` / `git diff --name-status -M` / `grep` / well-known config field 抽出。Markdown semantic / TS AST 解析禁止）
- **baseRef 解決**: ADR-SCP-015 D2 の 4 段階解決（`SCP_BASE_REF` env > CI env > local upstream > `HEAD~1` fallback）
- **promotion**: 通常は §A1 へ promote しない（boundary protection は本 program 固有 nonGoal、universal rule にはなりにくい）。例外は archive 直前 user 判断

## 2. checker 一覧（4 件、boundary protection 限定）

| checker | image | 検出ロジック | YAML file | 違反根拠 |
|---|---|---|---|---|
| `app-untouched` | 触ってはいけない（既存実装層） | `git diff --name-only ${BASE_REF}..HEAD` で `^app/src/` patterns 検出。業務 logic / domain calculations / readModels への変更も同 checker で carry | `app-untouched.yaml` | projectization.md §4 nonGoal |
| `docs-contracts-aag-untouched` | 触ってはいけない（既存 reposteward AAG contract schemas） | `git diff --name-status -M ${BASE_REF}..HEAD` で `^docs/contracts/aag/` の move / delete / modify 検出 | `docs-contracts-aag-untouched.yaml` | ADR-SCP-002 / projectization.md §4 nonGoal |
| `no-new-references-doc` | 触ってはいけない（既存 references/ への新 doc 追加） | `git diff --name-status -M ${BASE_REF}..HEAD` で `^references/.*\.md$` の Addition 検出。rename `R<N>` 除外。5 例外: Reading Pass disposition target / generated-report / archive-target / readme-index-update / this-program-deliverable は許可 | `no-new-references-doc.yaml` | 本 program scope 外 |
| `hard-gate-surface` | 崩してはいけない（既存 advisory state） | baseline file と現在の workflow / pre-push / package.json から収集した `hardGate.{workflowJobs, requiredChecks, prePushExitOneSteps, npmScriptGates}` を意味的 set diff、増加方向のみ finding | `hard-gate-surface.yaml` + `hard-gate-surface.baseline.json` | 不可侵原則 8 |

## 3. checker YAML schema（ADR-SCP-015 D1）

各 checker は以下の YAML schema に従う:

```yaml
schemaVersion: scp-checker-v1
id: <checker-id>
description: <1 文 articulate>
imageMetaphor: must-not-touch | must-not-change | must-not-break
violationBasis: <不可侵原則 / ADR / nonGoal への参照>
detectionMethod: git-diff | git-diff-name-status | config-field-extract
spec:
  diffMode: name-only | name-status   # git-diff の場合
  diffOptions: [-M, --diff-filter=A]   # 任意
  baseRefResolver: scp-baseRef         # ADR-SCP-015 D2 の 4 段階解決
  pathPatterns:
    forbidden: [<regex>]
    forbiddenStatuses: [A, M, D, R]    # 任意
    allowedExceptions: [<exception name>]
  configFieldExtract:                  # detectionMethod=config-field-extract の場合
    sources: [<file path>]
    fields: [<dot.path>]
    baselineRef: <baseline file path>
findingTemplate:
  ruleId: SCP-A2-<UPPER-CASE-ID>
  severity: warn | error
  suggestedDisposition: <ADR-SCP-011 6 分類のいずれか>
```

## 4. baseRef 解決（ADR-SCP-015 D2）

common runner が以下の順で baseRef を解決:

1. `SCP_BASE_REF` 環境変数（明示指定、最優先）
2. CI 環境変数（`GITHUB_BASE_REF` + `git merge-base origin/$GITHUB_BASE_REF HEAD`）
3. local pre-push: `git rev-parse @{upstream} 2>/dev/null` → 失敗なら `origin/main`
4. fallback: `HEAD~1`

実行 command:

- 通常: `git diff --name-only ${BASE_REF}..HEAD`
- 追加検出: `git diff --name-only --diff-filter=A ${BASE_REF}..HEAD`
- rename 含む: `git diff --name-status -M ${BASE_REF}..HEAD`

## 5. hard-gate-surface baseline file（ADR-SCP-015 D3）

`hard-gate-surface.baseline.json` は本 program Phase 1 開始時に landing し、ratchet-down 対象:

```jsonc
{
  "$comment": "本 program 開始時の hard gate surface baseline。Wave 1 milestone 到達まで増やさない。",
  "schemaVersion": "scp-baseline-v1",
  "capturedAtCommit": "<SHA at Phase 1 start>",
  "hardGate": {
    "workflowJobs": [],
    "requiredChecks": [],
    "prePushExitOneSteps": [],
    "npmScriptGates": []
  }
}
```

検出 flow: baseline 読み → 現在の `.github/workflows/` / `tools/git-hooks/pre-push` / `package.json` から `hardGate.*` 再収集 → 意味的 set diff → 増加方向のみ finding（減少 = ratchet-down OK）。

## 6. no-new-references-doc 例外条件（ADR-SCP-015 D4）

5 例外:

1. **Reading Pass disposition target**: `document-reading-decisions.yaml` 内 `disposition: split | move | archive` の `splitTargets` / `moveTo` / `archiveTo` path
2. **generated report**: file path が `*.generated.{md,json}` パターン AND `generated-artifacts.yaml` に producer 宣言済（Phase 9 以降）
3. **archive target**: file path が `^references/99-archive/` 配下 AND 同一 directory 内に `archive-manifest.json` 存在（または zone semantics で暫定許可）
4. **index update**: 既存 README.md の modification（addition ではない）
5. **本 program deliverable**: `^projects/active/aag-structural-control-plane/` 配下は本 checker scope 外

rename detection: `git diff --name-status -M` で similarity-based rename 検出。`R<N>` status は addition としてカウントしない（git mv 相当の `disposition: move` を誤検知しない）。

## 7. archive 時の処理

本 program archive 時:

1. archive 直前: §A2 checker のうち promotion candidate を user 判断で評価（通常は無し、boundary protection は project 固有）
2. promotion 採用（例外的）: `tools/governance/check-<checker>.ts` へ実装 move + decision-audit.md 振り返り判定 articulate
3. promotion 棄却 / 該当なし（通常）: そのまま放置（§A2 のまま）
4. Archive v2 §6.4: `projects/active/aag-structural-control-plane/aag/` folder が `projects/completed/aag-structural-control-plane/` 移動時に物理削除（`aag/scp-checkers/` 配下 YAML + baseline file 含む、archive.manifest.json `deletedPaths` に記録）
5. common runner（`tools/governance/run-scp-checker.ts`）は §A1 配置のため archive 後も残置
6. restore 経路: archive.manifest.json `restoreAllCommand` で preCompressionCommit 時点を復元すれば §A2 checker YAML も復活

## 8. 現在の実装状態

Phase 0 では本 directory + README のみ landing。実 checker（4 YAML）+ baseline file + common runner は Phase 1 で順次 landing する（checklist.md の Phase 0 acceptance criteria は本 directory 存在 + README articulation を含む）。

## 9. §A2 から外したもの（参考: plan.md §A1 / §B 配置）

以下は §A2 narrowing rationale により §A1 / §B へ移動:

| 元案項目 | 移動先 | 理由 |
|---|---|---|
| `obligation-migration-staging`（OBLIGATION_MAP 比較器） | §A1（`tools/governance/check-obligation-drift.ts`） | parse-heavy + universal な migration safety pattern |
| `reading-pass-review`（YAML schema 検証） | §A1（`tools/governance/check-reading-pass-schema.ts`） | parse-heavy + universal な reading-pass.schema.json validation |
| `phase-ordering`（commit history 検証） | §A1（`tools/governance/check-phase-ordering.ts`） | 多 phase project の universal pattern |
| `finding-group-pr`（PR description parse） | §A1（`tools/governance/check-finding-group-pr.ts`） | parse-heavy + universal な migration PR convention |
| `inquiry-scope`（Markdown KPI grep） | §B（AI が `grep` で self-check） | 軽量、AI self-check で十分 |
| Reading Pass 中の対象 zone 編集禁止 | §B（AI が `git diff` で self-check） | phase 依存 transient rule、§A2 phase 不変条件に該当しない |
