# projectization — reposteward-ai-ops-platform

> 役割: AAG-COA 判定結果。作業文脈に応じて、必要な project 化の重さと
> 不要な手続きを明示する。
>
> 規約: `references/05-aag-interface/operations/projectization-policy.md`

## 1. 判定結果

| 項目 | 値 |
|---|---|
| `projectizationLevel` | Level 3 |
| `changeType` | governance-hardening |
| `implementationScope` | `["docs/contracts/aag/task-capsule.schema.json", "aag-engine/internal/taskcapsule/", "aag/parameters/", "docs/contracts/aag/aag-parameters.schema.json", "docs/contracts/aag/source-facts.schema.json", "tools/architecture-health/src/facts/", "references/04-tracking/generated/source-facts.json", "references/04-tracking/generated/aag-size-statistics.json", "aag-engine/", "references/03-implementation/detection-inventory-v2.md", "app/src/test/guards/sizeGuard.test.ts", "app/src/test/audits/architectureStateAudit.test.ts"]` |
| `breakingChange` | false |
| `requiresLegacyRetirement` | false |
| `requiresGuard` | false |
| `requiresHumanApproval` | true |

## 2. 判定理由

**Level 3 governance-hardening を採用する理由**:

- 本 program は AAG / RepoSteward に **新 mechanism** (= Task Capsule operating layer / AAG Parameters JSON contract / SourceFacts collector / command navigation surface / Repository cleanliness rules / Premise Contract) を追加する governance 拡張
- **複数 boundary** (= contract schema = `docs/contracts/aag/*.schema.json` / generated facts = `references/04-tracking/generated/*.json` / Go CLI surface = `aag-engine/internal/` / TS collector = `tools/architecture-health/src/facts/`) に跨る変更
- **複数 phase の文脈引き継ぎ必要** (= Phase 0 bootstrap + Wave 1〜5 = 23+ step、各 Wave で不可侵原則 / 設計 / 検証手順を articulate)
- **不可侵原則を独自に持つ** (= JSON-first / AI-first / read-only first / 主検出は構造 / DetectorResult-first / additive-only / Wave-by-wave / versionImpact declare の 8 原則、`plan.md` で articulate)
- **`quick-fixes` collection で扱えない** (= §11 判断基準: 数日〜数週間の作業期間 + 5 個以上の checkbox + ハマりポイント引き継ぎ + 独自不可侵原則 = 大きな project)
- Level 4 (umbrella / sub-project-map.md) は不要 (= 本 program は単一 project で完遂可能、sub-project 分割せず Wave 内 step 独立 PR で展開)

**changeType = governance-hardening の理由**:

- new-feature ではない (= 業務機能 / UI / calculation の追加なし)
- refactor / architecture-refactor ではない (= 既存業務 logic / 4 層構造 / domain calculation 不変)
- bug-fix / docs-only / legacy-retirement ではない
- **governance-hardening が最も整合** (= AAG / RepoSteward governance に operating layer / parameters / facts / cleanliness rules を追加して governance を硬化)

**`requiresHumanApproval=true` の理由**:

- L3 + 複数 boundary 影響 + 不可侵原則を独自に持つため、`projectization-policy.md` §4 で user 承認 必須
- 実装 AI による自己承認は不可侵原則 + nonGoals で禁止 (= `config/project.json#/projectization/nonGoals`)
- 最終レビュー (= checklist.md `## 最終レビュー (user 承認)` section) で明示的 user 承認 gate

## 3. 必要な文書

| 文書 | 必要性 | 理由 |
|---|---:|---|
| `AI_CONTEXT.md` | required | L3 + 複数 phase = project 意味空間の入口 articulate 必須 |
| `HANDOFF.md` | required | L3 + ハマりポイント引き継ぎ articulate 必須 |
| `plan.md` | required | L3 + 8 不可侵原則 + Wave 1〜5 構造 articulate 必須 |
| `checklist.md` | required | L3 + completion 判定の入力 articulate 必須 |
| `decision-audit.md` | required | L3 + 重判断 institution (= drawer Pattern 1) 必須 (= DA-α-000 進行モデル / DA-α-001 naming / DA-α-002 Wave 1 reordering 既 articulate) |
| `discovery-log.md` | required | scope 外発見の蓄積 inventory (= AAG 5 系統目)、PZ-14 機械検証対象 |
| `projectization.md` | required | 本 doc、AAG-COA 判定結果の articulate (= PZ-1〜12 機械検証対象) |
| `inquiry/` | optional | 大規模調査が surface したら追加、現状不要 |
| `breaking-changes.md` | forbidden | `breakingChange=false`、PZ-7 で不在検証 |
| `legacy-retirement.md` | forbidden | `requiresLegacyRetirement=false`、PZ-8 で不在検証 |
| `sub-project-map.md` | forbidden | Level 3 (= Level 4 ではない)、PZ-6 で不在検証 |
| guard 設計 (plan.md 内) | optional | `requiresGuard=false` (= Wave 1 milestone 到達前は hard gate 追加しない、advisory のみ)、Wave 2 以降で必要なら articulate |
| 最終レビュー (user 承認) checkbox | required | `requiresHumanApproval=true`、PZ-10 で存在検証 |

## 4. やらないこと (nonGoals)

> `config/project.json#/projectization/nonGoals` と一致 (= PZ-12 機械検証対象)。

- TypeScript guard を全廃する (= 本 program は parallel implementation、TS 不変、Go MVP 不可侵原則 4 継承)
- React / TS AST / WASM / domain calculation guard を Go に移植する (= Go MVP 不可侵原則 5 継承)
- docs:generate を Go に移管する (= TS 維持)
- 業務 logic (= calculation / UI / store / data shape) を Go に複製する
- Human UI / browser dashboard を作る (= AI-first 原則と矛盾、JSON output に限定)
- YAML を採用する (= JSON-first 原則、AAG Parameters / SourceFacts / Task Capsule / premise contracts は全 JSON)
- Wave 1 milestone 到達前に hard gate を追加する (= read-only first 原則、advisory のみ)
- AAG Parameters を新たな source of truth にしすぎる (= 既存 calculationCanonRegistry / readModels の正本性は維持、parameters は可変設定の articulation のみ)
- コメント annotation (@premise / @canonicalRef 等) を主検出経路にする (= 主検出は path / diff / schema / facts / imports、annotation は補助のみ)
- 実装 AI による自己承認 (= 最終レビュー = user 承認 必須、L3 + requiresHumanApproval=true)
- Wave 2 以降を Wave 1 と同 PR に混ぜる (= Wave-by-wave delivery、肥大化抑止)

## 5. Escalation / De-escalation 条件

以下が発生した場合、`projectizationLevel` を再評価する:

- **paradigm shift 級の変更が surface した** → `versionImpact.aag.delta` を `+0.1` (minor) → `+1.0` (major) に escalate + Level 3 → Level 4 (umbrella) 化検討
- **breakingChange が surface した** → `breakingChange=true` 化 + `breaking-changes.md` 追加 (= PZ-7)
- **legacy 撤退が必要になった** (= 既存 TS guard / docs:generate / Go MVP detector の置換) → `requiresLegacyRetirement=true` 化 + `legacy-retirement.md` 追加 (= PZ-8) + 不可侵原則 6 (additive-only) を再評価
- **新規 hard gate が必要になった** → Wave 1 milestone 到達後に user 判断で別 program (= `aag-engine-hard-gate-promotion` 候補) に切り出し、本 program では追加しない
- **sub-project 分割が必要になった** → Wave が独立 program 化できる規模なら別 program に切り出し、本 program は Wave スコープを縮小
- **当初 nonGoals に含めた作業が必要になった** → `nonGoals` 改訂 + escalation 判定 + DA entry 追加
- **想定より影響範囲が小さく、下位 Level で収まると判明した** → de-escalate 検討 (= Level 2 化 / 簡素化)、ただし本 program は L3 が適正規模

## 6. 履歴

| 日付 | 変更 | 理由 |
|---|---|---|
| 2026-05-06 | 初期判定 (Level 3) | bootstrap 時、L3 governance-hardening / 複数 boundary / 8 不可侵原則 / requiresHumanApproval=true / Wave 1〜5 = 23+ step で articulate |
