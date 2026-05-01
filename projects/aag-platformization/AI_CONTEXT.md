# AI_CONTEXT — aag-platformization

> 役割: project 意味空間の入口 (why / scope / read order)。
> 現在地・次の作業・ハマりポイントは `HANDOFF.md` を参照。

## Project

AAG Platformization Program — authority + artifact + contract + change-policy (`aag-platformization`)

## Purpose

AAG をアプリ内サブシステムから、**authority / artifact / contract / change-policy** の 4 軸を持つ独立した品質基盤に昇華する。Go 移行はその最終 runtime 形であって、本 program の goal ではない。本 program ではアプリ業務ロジックを 1 行も変えず、AAG 自体の制度基盤化を完成させる。

## Read Order

1. 本ファイル (project 文脈の入口)
2. `HANDOFF.md` (現在地・次にやること・ハマりポイント)
3. `plan.md` (4 不可侵原則 + 4 Workstream + 3 Gate + 10 Phase 構造)
4. `checklist.md` (completion 判定の入力 — required checkbox 集合)
5. `projectization.md` (AAG-COA 判定結果と nonGoals)
6. 必要に応じて以下を参照:
    - `aag/core/AAG_CORE_INDEX.md` (Core 3 層モデル)
    - `aag/core/principles/core-boundary-policy.md` (Core 境界 5 原則)
    - `references/01-principles/aag/` (5 層構造 / 進化動学 / 運用区分 / 正本方針)

## Why this project exists

本 project が独立して立ち上がる理由は 4 つ。**ここに書いた理由が消えたら escalation 判定の見直し対象**。

### 0. 本体 (粗利) と AAG の空間 / 意味 / 言語の分離

本リポジトリは粗利管理システム (shiire-arari) であり、その内部には既に以下の道具立てがある:

- **Zod 契約** — application/queries / readModels の runtime validation (本体ドメイン)
- **WASM (Rust)** — 計算エンジン (`domain/calculations/` の authoritative path)

AAG はこれらと **空間 / 意味 / 言語が異なる別のサブシステム**。AAG が Zod や Rust を混ぜない理由は技術的好みではなく、**責務の混線を物理的に禁じる** ため。本 program は AAG の道具立てを以下のとおり別レイヤとして固定する:

| AAG layer | 言語 / 形式 | 物理境界 | 同居して良い本体側 |
|---|---|---|---|
| **Core** | Go | `tools/aag-go/` (Phase 9 で新設) | なし (本体と完全分離) |
| **Domain** (rules / schemas / overlays) | JSON + Go | `docs/contracts/aag/` / `docs/generated/aag/` (Phase 3, 4, 8) | なし |
| **接続部** (consumer facade / authoring helper) | TypeScript | `app/src/test/architectureRules*` / `tools/architecture-health/` | TS のため本体 build pipeline と同居 |

「再利用可能な品質 OS」とは、AAG を他アプリへ移植する話 **ではない**。**境界 / 責務 / パッケージが明確に切れている** ことを指す表現。本 program はこの境界を制度として固定する。

### 1. AAG 自体の authority 契約が穴を持っている

本 program 起点の調査で、bootstrap path に **物理的に動かない部分** があることが判明した:

- `app/src/test/architectureRules/merged.ts` は全 rule に対して `reviewPolicy` を project overlay 必須とする (`!reviewPolicy` で throw)
- `app/src/test/architectureRules/defaults.ts` は `reviewPolicy` を含まない (案件固有時刻フィールドのため)
- `projects/_template/aag/execution-overlay.ts` は `EXECUTION_OVERLAY = {}` (空)
- → **新 project は bootstrap 時点で merged.ts が throw する**

`references/03-guides/new-project-bootstrap-guide.md` Step 4 は「空 overlay で全 rule が defaults から自動解決される」と明示しているが、merged.ts の実装はその契約を満たしていない。これは comment 揺れではなく authority 契約の穴。本 program で正す。

### 2. Project Overlay 型が二重に定義されている

- `_template/aag/execution-overlay.ts` の `RuleExecutionOverlayEntry` は fixNow / executionPlan を **optional**
- `pure-calculation-reorg/aag/execution-overlay.ts` の同名型は fixNow / executionPlan を **required**
- 共通 authority 型がない (project 毎に再宣言)
- → "project overlay が provide すべきもの" という制度契約が `merged.ts` の実装に隠れている

これも authority 不在の症状。共通型を `aag-core-types.ts` に集約することで authority を可視化する。

### 3. Derived 結果が runtime にしか存在しない

`merged.ts` は import 時に in-memory で merge するため、artifact として残らない。結果として:

- consumer は merge ロジックを毎回再実行する
- project overlay が defaults を override したのか defaults 補完だったのかを **追跡できない**
- Go 移行を含む将来の runtime 置換が「再実装」になる (artifact がないため引き継げない)

`docs/generated/aag/merged-architecture-rules.json` を artifact 正本化することで、runtime 置換を「実行基盤の置換」に縮約できる。

### 4. AagResponse / Detector Result に schema がない

- AagResponse は `tools/architecture-health/src/aag-response.ts` に集約済み (helper 駆動だが consumer 単一)
- ただし `.json schema` は存在しない (repo 全体で .schema.json は 1 ファイルのみ)
- → 言語 / runtime をまたぐ contract がなく、Go / TS の同一性を機械検証できない

contract を schema 起点にすることで、TS facade と Go runtime の両方が同じ正本を読める状態にする。

### 5. 5 つの実装品質基準を全成果物に適用

本 program のあらゆる成果物 (コード / ガード / 生成 artifact / 文書 / DA entry) は **Q1〜Q5** を満たさない限り landing しない。**AAG は文書中心だが、文書にも同じ強度で適用する**:

| # | 基準 | 失敗 mode の代表例 |
|---|---|---|
| Q1 | **意味が明確** | 同義 API 並走 / 曖昧命名 / 同一概念が複数表現で散在 |
| Q2 | **境界 / 役割が明確** | 1 ファイル = 2 変更理由 / doc が複数概念を語る / 所掌が議論になる |
| Q3 | **依存関係が正しい** | layer 境界違反 / doc 間の相互参照 / 逆向き依存 |
| Q4 | **包含関係に矛盾なし** | registry の "全 X" 主張に漏れがある / authority table と実 type 定義が乖離 |
| Q5 | **構造が明確** | 散文の連続で構造が見えない / Read Order が無い |

各 Phase 完了時に DA entry 内で Q1〜Q5 self-check 表を埋める。詳細は `plan.md` §"実装品質基準"。

### 6. AI-driven judgement + retrospective verification + commit-bound rollback

本 program の **進行モデル** は以下:

- **AI が事実と根拠で判断する** — 各 Phase の選択肢比較・採用案決定・実装方針は、調査と検証に基づいて AI が決める。Phase 2 の 3 案選定もこれに含まれる。
- **人間承認は最小化** — 「人間が同意したから正しい」という構造を作らない。同意は判断の根拠ではなく **責任の引受** に過ぎない。
- **判断の事後振り返りを制度化** — 各判断は `decision-audit.md` に articulate される。振り返り観測点を判断時に書いておき、Phase 完了時に観測する。判断が間違っていた / 部分的だったと判明したら、軌道修正方針も同 artifact に記録する。
- **判断と commit を物理的に結合** — 各 DA entry に `judgementCommit` (sha) + `preJudgementCommit` (sha) + `judgementTag` (annotated tag) + `rollbackTag` (annotated tag) を記録。**判定が "間違い" なら `git checkout <rollbackTag>` で物理的に戻れる**。commit message に `Decision: DA-XXX (...)` を必須化することで `git log --grep` で判断ベースの追跡が可能。
- **archive 承認だけが人間 mandatory** — `project-checklist-governance.md` の構造的要請に従い、最終 archive 承認のみ人間 (`requiresHumanApproval: true` はこの 1 点のため)。それ以外の判断はすべて AI が事後検証可能な形で articulate して進める。

詳細は `decision-audit.md` (本 commit で scaffold landing 済) と `plan.md` §"Decision Audit Mechanism" を参照。

### 7. なぜ既存 project に追加しないか

- `pure-calculation-reorg` は **pure 計算責務再編** に閉じる (本 project の AAG 制度基盤化と scope が交わらない)
- `presentation-quality-hardening` は presentation 品質 (scope 外)
- 完了済み AAG 系 (`aag-core-doc-refactor` / `aag-rule-schema-meta-guard` / `aag-display-rule-registry` / `aag-legacy-retirement`) は **doc 構造と rule 装着の整理** であり、authority / artifact / contract / change-policy の制度化は未着手
- 本 program はこれらの完遂結果の上に、**AAG を独立した品質基盤として完成させる** 段階

`references/03-guides/project-checklist-governance.md` §0 (複数の動線・コンテキストを混ぜない原則) に基づき、独立 project として立てる。

## Scope

### 含む

- AAG authority 契約の明示 (Authority Table / Merge Policy / Schema Registry の 3 doc 新設)
- `merged.ts` の bootstrap path 修復 (空 overlay で動く状態の復活)
- 共通 `RuleExecutionOverlayEntry` 型の `aag-core-types.ts` 集約
- merged 結果の artifact 化 (`docs/generated/aag/merged-architecture-rules.json` + `resolvedBy` 追跡)
- AagResponse の schema 化 (`docs/contracts/aag-response.schema.json`)
- Detector Result protocol の定義 (`docs/contracts/detector-result.schema.json`)
- RuleBinding 境界 guard (binding に意味系フィールドが漏れたら hard fail)
- defaults / overlay の JSON artifact 化
- Go Core PoC (merge / validate / response の最小実装)
- AAG Change Policy 文書化 (schema versioning / golden test / compatibility test の制度化)

### 含まない

- アプリ業務ロジック (gross-profit / sales / forecast / customer / discount / pi-value / 等) の意味変更
- 新ガード追加による既存検出範囲の縮退 (緩和方向の baseline 変更)
- Go ランタイムの **本** 実装 (Phase 9 の PoC まで。本 cutover は後続 project)
- `base-rules.ts` の rich TS 表現を一気に JSON 化すること (authoring 正本としての TS 価値を毀損する)
- AAG の外部公開 (本 program は internal platform 化に閉じる)
- `pure-calculation-reorg` overlay の rule entry 削除 (本 program は overlay 型 / comment / authority 契約の整理に閉じる)
- 既存 guard test の baseline 緩和 (ratchet-down のみ許容)

## 関連文書

| 文書 | 役割 |
|---|---|
| `references/03-guides/project-checklist-governance.md` | 本 project の運用ルール (AAG Layer 4A) |
| `references/03-guides/projectization-policy.md` | 本 project の AAG-COA 判定根拠 (Level 3) |
| `references/03-guides/new-project-bootstrap-guide.md` | 本 project bootstrap 時の手順 (本 program で Step 4 を修復対象とする) |
| `aag/core/AAG_CORE_INDEX.md` | Core 3 層モデル — 本 program が扱う authority 層の正本 |
| `aag/core/principles/core-boundary-policy.md` | Core 境界 5 原則 — 本 program の不可侵原則の上位 |
| `references/01-principles/aag/README.md` | AAG 5 層構造 index — Layer 0+1 (Meta) / Layer 2+3 (Core) / Layer 4 (Audit) |
| `references/01-principles/aag/source-of-truth.md` | 正本 / 派生物 / 運用物 区分 policy — 本 program の artifact 化の根拠 |
| `app/src/test/aag-core-types.ts` | RuleSemantics / Governance / OperationalState / DetectionSpec — 本 program で schema 化する対象 |
| `app/src/test/architectureRules.ts` | Consumer facade — 本 program で artifact 駆動に切替 |
| `app/src/test/architectureRules/merged.ts` | Derived merge 実装 — 本 program で artifact generator 化 |
| `app/src/test/architectureRules/defaults.ts` | DEFAULT_EXECUTION_OVERLAY — 本 program で reviewPolicy 契約の穴を埋める対象 |
| `app-domain/gross-profit/rule-catalog/base-rules.ts` | BaseRule 物理正本 — 本 program では触らない (TS authoring 維持) |
| `tools/architecture-health/src/aag-response.ts` | AagResponse 物理正本 — 本 program で schema 化 |
