# HANDOFF — reposteward-ai-ops-platform

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

**Phase 0 (Bootstrap) landing 直後**。本 commit で以下が landed:

- `projects/active/reposteward-ai-ops-platform/` 配下 8 ファイル一式 (= AI_CONTEXT / HANDOFF / plan / checklist / decision-audit / discovery-log / projectization / config/project.json)
- `references/04-tracking/open-issues.md` の active projects 索引に新 project 行追加
- `references/04-tracking/generated/project-health.generated.md` 等 generated artifact の `docs:generate` 反映

**前提 program**: `aag-engine-go-mvp` (2026-05-06 archive、AAG 6.0 institute、5 detector × 8 fixture = 40 parity 維持、advisory CI + archive-manifest hard-gate scaffold)。本 program はその post-MVP 後継として AI-first command operations layer を載せる。

**実装はまだ着手していない**。Wave 1 (**Task Capsule schema v1 → `reposteward task prepare` MVP** → AAG Parameters v1 → SourceFacts v1 → effective LOC statistics → stats files query) が次の milestone。Task Capsule を最先頭に置く判断は bootstrap session 中に user 提案 + 受諾で landing (= DA-α-002 articulate)。本 PR は bootstrap のみで scope を閉じる。

## 2. 次にやること

詳細は `checklist.md` + `plan.md` を参照。優先順位を 1-2 段で要約する。

### 高優先 (Wave 1 — 最初の実利)

1. **Task Capsule schema v1** — `docs/contracts/aag/task-capsule.schema.json` を landing (= taskId / projectId / repoHealth / currentState / goal / nonGoals / requiredReads / targetFiles / relatedCommands / expectedOutputs / repairPolicy の JSON shape 定義)。schema 単体の最小 PR
2. **`reposteward task prepare` MVP** — `aag-engine/internal/taskcapsule/` に MVP command landing (= projectId 受領 → project context 読 → repo health 読 → required reads / nonGoals / target files / commands / expected outputs / repair policy を JSON 出力)。最初の対象 project は `reposteward-ai-ops-platform` 自身
3. **AAG Parameters v1** — `docs/contracts/aag/aag-parameters.schema.json` + `aag/parameters/aag-parameters.json` を landing (= effectiveCodeLines bucket / excludedKinds から articulate 開始、Task Capsule の constraints source として接続)
4. **SourceFacts v1** — `tools/architecture-health/src/facts/source-facts.ts` + collector + `docs/contracts/aag/source-facts.schema.json` + `references/04-tracking/generated/source-facts.json` を landing (= Task Capsule の facts source として接続)
5. **Effective LOC statistics** — `references/04-tracking/generated/aag-size-statistics.json` + Health summary 3 KPI (`code.size.effectiveLoc.p90/p95/max`) を landing
6. **`reposteward stats files` query** — bucket / range から file 直行 command を `aag-engine/` に landing (= Task Capsule v3 `--intent` の入力 backend)

### 中優先 (Wave 2 — 既存 guard の歪み修正)

- `sizeGuard.test.ts` を effective LOC 化
- `architectureStateAudit.test.ts` の raw line count 修正
- Health report に bucket distribution table 追加

### 低優先 (Wave 3〜5)

- Wave 3: AI navigation MVP (= where-am-i / context --project / changed --explain / rule locate / detector refs)
- Wave 4: Cleanliness / Comments / Docs rules
- Wave 5: Repair / Premise / Next action

各 Wave は **独立 PR** で landing する (= 肥大化抑止、`plan.md` 不可侵原則 9)。Wave 1 でも 5 step を 5 PR に分けるのが基本方針 (= bootstrap → inventory → parameters → source-facts → stats query)。

## 3. ハマりポイント

### 3.1. 名前と branch の不整合

- **branch 名**: `claude/reposteward-detection-ops-bootstrap-mqG14` (= 当初 `reposteward-detection-ops-platform` を想定して切られた branch)
- **project ID**: `reposteward-ai-ops-platform` (= bootstrap 直前に user 判断で名前変更、`detection-ops` だと scope を狭める示唆になるため `ai-ops` に拡張)
- 後続 PR の branch 命名は `claude/reposteward-ai-ops-platform-<slug>` パターンを採用 (= 本 bootstrap 限定で `detection-ops` 名残あり)
- 詳細: `decision-audit.md` DA-α-001

### 3.2. CLI binary 名 vs concept name

- **Concept**: `RepoSteward AI Ops Platform` (= 構想名、project 北極星)
- **Binary**: `aag` (= aag-engine-go-mvp 由来、Wave 1〜5 で additive 拡張)
- plan / docs で「`reposteward stats files`」のように articulate される command は **現実装上 `aag stats files`** で実行する
- 詳細: `AI_CONTEXT.md` §Naming Note + `cmd/aag/main.go` 冒頭 docstring + `decision-audit.md` DA-β-002

### 3.2. Go MVP の不可侵原則を継承

- `aag-engine-go-mvp` 不可侵原則 4 (= TS guard 不変) / 不可侵原則 5 (= 業務 logic 不可触) は **本 program でも完全継承**
- AAG Parameters / SourceFacts / command surface は **追加** であって、既存 TS guard / docs:generate / domain calculation の **置換ではない**
- `nonGoals` (= `projectization.md` §4) を着手前に必ず読む

### 3.3. JSON-first 原則は徹底する

- AAG Parameters は **YAML ではなく JSON**。`docs/contracts/aag/aag-parameters.schema.json` で schema 定義
- 既存の AAG ecosystem (= `docs/contracts/aag/aag-metadata.json` / `docs/contracts/aag/project-archive.schema.json`) と整合
- YAML 提案が来たら `plan.md` 不可侵原則 1 に立ち戻って却下

### 3.4. 主検出は path / diff / schema / facts、annotation は補助

- コメント annotation (= `@premise` / `@canonicalRef` / `@reason` / `@expiresAt`) を主検出経路にしない
- 主検出は SourceFacts / ProjectFacts / DiffFacts / RuleFacts (= 構造 / 機械解析可能な情報)
- annotation は **補助 metadata** に留める (= `plan.md` 不可侵原則 4)

### 3.5. read-only first を破らない

- Wave 1〜3 は **read-only**: 検出 / 説明 / locate / summarize / recommend / generate repair-context のみ
- auto edit / auto checklist flip / auto archive / auto generated rewrite は **本 program では実装しない**
- hard gate 追加は Wave 1 milestone 到達後 + user 判断で切り出す別 program (= `aag-engine-hard-gate-promotion` 候補)

### 3.6. effective LOC 切替は計測のみ → guard 切替の 2 段で

- Wave 1 では SourceFacts / statistics の **計測** だけ landing (= 既存 sizeGuard は raw line count のまま)
- Wave 2 で sizeGuard を effective LOC 化 (= guard semantic 切替は別 PR、baseline / ratchet-down 設計が必要)
- 同 PR で混ぜると baseline 動きが二重になり判断不能になる

### 3.7. versionImpact は archive 時に検証される

- `config/project.json#/versionImpact` は **計画段階で declare 済** (= app: +0.0.0 / aag: +0.1)
- archive 移行時に declared vs actual を `versionImpactGuard` (= 別 program `aag-version-impact-declaration-guard` で実装予定) が機械検証
- もし Wave 1〜5 で paradigm shift 級の変更が surface したら **DA entry を articulate して delta を escalate** する (= +0.1 → +1.0 への変更履歴を `decision-audit.md` に残す)

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| `AI_CONTEXT.md` | project 意味空間の入口 (why / scope / read order) |
| `projectization.md` | AAG-COA 判定 (L3 / governance-hardening / nonGoals) |
| `plan.md` | 5 不可侵原則 + Wave 1〜5 構造 + やってはいけないこと |
| `checklist.md` | completion 判定の入力 (Phase 0 ticked-out、Wave 1+ は landing 時に追記) |
| `decision-audit.md` | DA-α-000 進行モデル + DA-α-001 project naming 判断 |
| `discovery-log.md` | scope 外発見の蓄積 inventory |
| `config/project.json` | projectization metadata + versionImpact + entrypoints |
| `projects/completed/aag-engine-go-mvp/ARCHIVE.md` | 前提 program (= validator MVP)、不可侵原則 4/5 / 後続 program 候補 |
| `aag/CHANGELOG.md` | AAG 6.0 entry + バージョンアップ判定基準 table |
| `references/05-aag-interface/operations/project-checklist-governance.md` | bootstrap 手順 §10 / commit pattern §13 |
