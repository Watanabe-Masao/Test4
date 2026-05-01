# AI_CONTEXT — aag-platformization

> 役割: project 意味空間の入口 (why / scope / read order)。
> 現在地・次の作業・ハマりポイントは `HANDOFF.md` を参照。

## Project

AAG Platformization Program — authority + artifact + contract + change-policy (`aag-platformization`)

## Purpose

AAG は **AI のための実装コンテキスト基盤**。既に `references/01-principles/aag/strategy.md` §3.4 で "AAG ドキュメントは人間のためだけではない。AI が判断基準を理解し、意図に沿った変更を行うためのインターフェース... 「過去の自分」「未来の自分」「AI」の 3 者が同じ判断基準で対話するための共通言語" と articulate されている。

本 program はこの **既存 articulation を変えない**。AAG が既に達成している 12/12 `AAG-REQ-*` (`meta.md` §4.1) と、5 AI 本質的弱点への構造的補強 (`strategy.md` §2.1) は維持する。

本 program が変えるのは **AAG の形式** のみ:

- **prose-heavy → structured artifact** — 現在 AAG は doc 中心。AI が consume するときに「文を読む」「文脈を組み立てる」コストが session ごとに発生。**Go + 構造化 format の artifact** に変換することで、AI が同じ正本を identical に消費できる
- **AI-specific → AI-agnostic** — 「どんな AI でも同じように振る舞える」(= AIフリーな設計)。特定の AI 実装 (Claude / GPT / 他) に依存する形ではなく、schema + Go runtime + structured contract で標準化
- **dynamic context-building → static structured navigation** — AI が動的に文脈を navigate する手助けを doc 階層 + 境界 + 役割 で行う (既存)。本 program は doc 階層 と並列に **structured artifact 階層** を整備し、navigation を更に効率化

## Architectural style — Phase 1 で AI 判断 (DA-α-001a)

「単なる情報やコンテキスト」(= prose-heavy doc) を「再利用しやすい形」(= structured artifact) に変換する手段として、本 program 起点では複数の architectural style が候補:

| # | style | Core (canonical) | reference runtime | AI consumption |
|---|---|---|---|---|
| 0 | Go runtime + 構造化 format | Go binary | Go (canonical) | artifact 直読 |
| **A** | **Pure structured artifact (runtime-less)** | **構造化 format ファイル群** | **任意 / optional** | **artifact 直読** |
| B | MCP server | server (任意言語) | server | MCP tool 経由 |
| C | 既存 TS + structured export | TS (既存) | TS | artifact 直読 |
| D | A + B ハイブリッド | 構造化 format + server | server | 両方 |

style 候補の評価軸:

- **構造をよりシンプル** (user 言明) — runtime layer を Domain layer に吸収する案 (A) が最も articulate
- **AI-agnostic** (= AIフリーな設計) — data 自体が言語非依存な案 (A / B / D)
- **本体 (粗利) との分離** — TS 維持の C は分離できない、A / B / D は可能
- **既存 AAG 思想整合** — strategy.md §1.1 「導出可能なものは導出する」+ §3.4 「3 者対話の共通言語」を最も articulate するのは A

現時点で AI が暫定的に **代替案 A (Pure structured artifact)** を最適候補とみなしているが、**Phase 1 着手時に DA-α-001a として正式判断する**。判断後、本 §Architectural style と Purpose の articulation を採用案で書き直す (forward-fix、`decision-audit.md` 参照)。

採用 style に関わらず共通する不変要件:

- AAG が既に達成している 12/12 `AAG-REQ-*` を維持 (`meta.md` §4.1)
- 5 AI 本質的弱点への構造的補強 (`strategy.md` §2.1) を維持
- 接続部 (consumer facade / authoring helper) は TS で維持 (本体 build pipeline と接続するため)
- 本体 (粗利) で使われている Zod / Rust とは混ぜない (責務 / 言語の物理分離)

## AAG strategy.md §2.1 AI 本質的弱点に対する本 program の貢献

| 弱点 (strategy.md §2.1) | 既存 AAG の構造的補強 (達成済) | 本 program の追加貢献 |
|---|---|---|
| 過去判断の文脈消失 | allowlist の `retentionReason` / AR-rule の `why` | `decision-audit.md` (judgement + 振り返り + commit lineage) で **session 間 AI 引き継ぎ** を構造化 |
| 「動く」の妥当性誤認 | 機械検証 (rule + guard) | Q1〜Q5 self-check + RuleBinding 境界 guard で **AI navigability quality** を機械保証 |
| 改善の retraversal | `AAG-REQ-RATCHET-DOWN` | annotated tag + commit-bound rollback で **判断単位の物理的不可逆性** を保証 |
| 重複生成の盲目 | `AAG-REQ-ANTI-DUPLICATION` (達成済) | structured artifact 化で **prose の copy-paste 機会自体を削減** |
| 抽象化の過剰 | `AAG-REQ-SEMANTIC-ARTICULATION` (達成済) + drill-down chain | schema + 構造化 contract で **「べき」の articulate を schema 制約に変換** |

本 program は既存 AAG-REQ-* を全件継承する。新 AAG-REQ-* (例: `AAG-REQ-AI-AGNOSTIC-CONSUMPTION` / `AAG-REQ-STRUCTURED-CONTRACT`) の追加候補は Phase 1 の DA-α-001 で AI 判断対象とし、人間 review なしで Constitution 改訂に相当する変更はしない (`meta.md` §2 intro)。

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
