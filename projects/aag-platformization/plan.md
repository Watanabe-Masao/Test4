# plan — aag-platformization

> **AAG Platformization Program**
> 目的: AAG の既存の振る舞いと思想 (`strategy.md` §3.4 の 3 者対話 interface、12/12 `AAG-REQ-*`、5 AI 本質的弱点への構造的補強) を変えず、**ドキュメント中心の限界を突破し、ドキュメント中心では無駄が多かった部分を削ぎ落とす**。
> 高機能を求めない。**高品質に洗練** する。新 doc / 新 guard / 新 artifact は「限界突破」or「無駄削減」のいずれかでなければ追加しない。
> 既存の振る舞いに矛盾や潜在バグが発見された場合は速やかに修正する (発見時の優先順位は「形式進化より修正が先」)。

---

## ドキュメント中心の限界 (本 program の突破点)

| # | 限界 | 突破手段 | 該当 Phase |
|---|---|---|---|
| L1 | AI session 間で「prose を読んで構造を組み立てる」コストが毎回発生 | structured artifact = AI が parse なしで直接消費 | Phase 4 / 8 |
| L2 | 型 / 制約が prose で articulate されると、AI は guard を通すまで違反を検知できない (= 機械的な事前検証不可) | schema = 機械 validation で AI が事前に違反を知る | Phase 3 |
| L3 | prose 同士の整合性は doc-spelling guard でしか守れない (= 重複生成の盲目、`strategy.md` §2.1) | structured artifact = isomorphism guard で機械保証 | Phase 3 / 6 / 8 |
| L4 | 同一情報が複数 doc に散在 (CLAUDE.md / aag/ / projects/* で繰り返し articulate) | 単一 canonical artifact + 派生で複製排除 | Phase 4 / 8 |
| L5 | violation message / response が言語ごと / 場所ごとに reinvent される | 単一 schema-backed contract で全 consumer が同じ output | Phase 5 / 6 |

これらは `references/01-principles/aag/strategy.md` §1.1 「導出可能なものは導出する」 + §3.4 「3 者対話の共通言語」を **形式として実体化** する作業。新概念ではない。

## 削ぎ落とす無駄 (本 program の cutting target)

| # | 無駄 | 現状 | 削減手段 | 該当 Phase |
|---|---|---|---|---|
| W1 | `RuleExecutionOverlayEntry` 型の三重定義 | `_template` / `pure-calculation-reorg` / `aag-platformization` の 3 file で別 declaration | 共通正本へ集約 | Phase 2 |
| W2 | runtime merge の毎回再計算 | `merged.ts` が consumer import 時に毎回 in-memory で merge 実行 | build artifact 化 + consumer は読み出すだけ | Phase 4 |
| W3 | `AagResponse` の inline 型 + comment-only contract | TS interface + `Feedback 層単一性` を comment と guard で守る | schema = type + contract が同じ正本 | Phase 5 |
| W4 | detector output 形式の場所ごと reinvent | guard test / collector / pre-commit で別フォーマット | 単一 detector-result schema | Phase 6 |
| W5 | `RuleBinding` 境界が prose で articulate される (`types.ts:152-183` のコメント) | binding に意味系 field が漏れたら hard fail する仕組みなし | 境界 guard 1 本で機械保証、 doc は最小化 | Phase 7 |
| W6 | overlay が TS-only authoring (他言語消費不能) | `pure-calculation-reorg/aag/execution-overlay.ts` 45,536 行を TS 必須で読む | 派生 artifact (構造化 format) を並列出力、TS authoring は維持 | Phase 8 |
| W7 | AAG Core doc の細分化 (新 doc 6 本案 → 高機能側) | 案件初期では doc 数を増やす方向で articulate | Phase 1 で 3 doc → 1 doc 統合 / Phase 10 で 2 doc → 1 doc 統合 | Phase 1 / 10 |

---

## Doc ↔ Implementation 整合性保証 (AAG の核心役割)

**AAG が果たす最大の役割の 1 つは、ドキュメントと実装が乖離しないことを機械的に保証すること**。本 program はこの役割を維持・強化する。新規追加ではなく、既存 mechanism の **再利用しやすい形 (structured artifact) への昇華** が本 program の貢献。

### 既存の整合性保証 mechanism (本 program で維持する資産)

| # | mechanism | 守る整合性 | 既存 status |
|---|---|---|---|
| I1 | `defaultOverlayCompletenessGuard.test.ts` | BaseRule 全 rule × `DEFAULT_EXECUTION_OVERLAY` の網羅 | active |
| I2 | `aagResponseFeedbackUnificationGuard.test.ts` | `AagResponse` 単一正本 (tools/) ↔ re-export (app/) の drift 拒否 | active |
| I3 | `executionOverlayGuard.test.ts` | rule が effective overlay (project ∪ defaults) を持つ | active |
| I4 | `canonicalDocBackLinkGuard.test.ts` (forward integrity) | 実装 → 設計 doc binding | active (`AAG-REQ-BIDIRECTIONAL-INTEGRITY` 達成) |
| I5 | `canonicalDocRefIntegrityGuard.test.ts` (reverse integrity) | 設計 doc ← 実装 path の実在 | active |
| I6 | `selfHostingGuard.test.ts` | AAG-REQ-* と AR-rule binding の closure | active (`AAG-REQ-SELF-HOSTING` 達成) |
| I7 | `docStaticNumberGuard.test.ts` | doc 内の現在形数値が generated section / 履歴以外に出現しない | active |
| I8 | `docs:check` (KPI drift / generated section / hard gate) | doc 内 KPI ↔ live calculation の drift 拒否 | active |
| I9 | `obligation-collector.ts` PATH_TO_REQUIRED_READS | path 編集 → 必読 doc 義務発火 | active |

これらは **AAG の既存の核心役割を実現する mechanism**。本 program は **1 件も削除しない / 緩和しない** (原則 1 + 原則 3)。

### 本 program が追加する整合性保証 (refactor 後の最小集合)

| # | 追加 mechanism | 守る整合性 | 該当 Phase | 必要性根拠 (原則 7) |
|---|---|---|---|---|
| I10 | `aagSchemaIsomorphismGuard.test.ts` | TS 型 ↔ schema (Phase 3 確定 format) の同型性 | Phase 3 | (a) prose articulate された型を機械検証可能な形に昇格 + (b) 既存 doc-impl drift 経路を 1 つ削減 |
| I11 | merged artifact ↔ runtime merge byte-identity test | `merged.ts` runtime 結果と `merged-architecture-rules.<format>` artifact が byte-identical | Phase 4 | (b) artifact が古いと merge ロジックと派生結果が乖離する → 自動再生成 + 検証で防ぐ |
| I12 | `ruleBindingBoundaryGuard.test.ts` | `RuleBinding` 許可 5 field のみ通過、意味系 field 漏れを hard fail | Phase 7 | (b) 現状 prose articulate のみで guard なし → 意味系漏れが doc-impl 乖離を誘発する |
| I13 | overlay TS ↔ overlay artifact 同期 guard | TS authoring と派生 artifact の sync (Phase 8 で TS 編集後 artifact 未生成だと落ちる) | Phase 8 | (b) authoring と derived 形式の drift を防ぐ |

これら 4 件は **既存 9 件の延長**。新規概念ではなく、**新形式 (schema / artifact) を導入した結果として整合性網羅範囲を拡張** する。`AAG-REQ-BIDIRECTIONAL-INTEGRITY` の枠組み内。

### 本 program 完了時の保証構造

```
[BaseRule (TS authoring)] ←→ I1 ←→ [DEFAULT_EXECUTION_OVERLAY (TS)]
                          ↓
                      I10 (新)
                          ↓
[Schema (Phase 3 確定 format)] ←→ I12 (新) ←→ [RuleBinding 境界]
                          ↓
                      I11 (新)
                          ↓
[merged-architecture-rules artifact] ←→ I13 (新) ←→ [overlay artifact]
                          ↓
                      I8 (既存)
                          ↓
[Generated docs (CLAUDE.md / project-structure.md / etc)]
                          ↓
                      I4 / I5 (既存)
                          ↓
[Canonical AAG docs (references/01-principles/aag/)] ←→ I9 (既存) ←→ [obligation triggers]
                          ↓
                      I6 (既存)
                          ↓
[AAG-REQ-* (meta.md §2)]
```

すべての階層に **doc-impl integrity guard** が存在する状態が完了形。本 program はこの構造を **structured artifact 経由で消費可能** にする (= AI が drift を事前 / 機械的に検知できる、L2 / L3 突破)。

---

## 不可侵原則

本 program が **絶対に破ってはいけない** 5 つのルール。違反は escalation 判定 (`projectization.md` §5) を即時発火させる。

### 原則 0: 言語層を混ぜない

AAG は本体 (粗利管理システム) と空間 / 意味 / 言語が異なる別サブシステムとして物理境界を持つ。以下を **禁じる**:

- AAG Core / Domain で **Zod** を使うこと (Zod は本体ドメインの runtime validation 用)
- AAG Core / Domain で **Rust** を使うこと (Rust/WASM は本体計算エンジン用)
- AAG 接続部 (TS) で **Go** をリンクすること (接続部は TS のまま)

層別言語 mapping:

| AAG layer | 言語 / 形式 | 物理境界 |
|---|---|---|
| **Core** | Go | `tools/aag-go/` (Phase 9 で新設) |
| **Domain** (rules / schemas / overlays) | **構造化データ形式** (Phase 3 で AI 判断 — DA-α-003) + Go | `docs/contracts/aag/` / `docs/generated/aag/` |
| **接続部** (consumer facade / authoring helper) | TypeScript | `app/src/test/architectureRules*` / `tools/architecture-health/` |

> **Domain の serialization format は固定しない**。"構造的に扱える" こと (schema 適用 / diff 可能 / Go から読める / TS 接続部から読める) が要件であり、JSON は **仮置きの第一候補** に過ぎない。Phase 3 着手時に CUE / YAML / TOML / protobuf / JSON5 / JSONC / Dhall / KDL 等を比較し、AI が事実根拠で 1 つ選定する (DA-α-003)。本 plan / docs / artifact 中の "JSON" 表記は format 確定後に置換する。

> **理由**: AAG が Zod / Rust を借りると、本体ドメインと AAG が同じ道具立てを共有することになり、責務の混線が起きる。AAG は本体に依存しないことを物理層で保証する。format 選定も同じく、本体 (粗利) で使われている JSON を惰性で踏襲しない。

### 原則 1: 既存の AAG 振る舞いと思想を変えない (矛盾・潜在バグの修復は例外)

本 program は AAG を分離 (意味的 / 空間的 / 言語的) することに閉じる。既存の `aag/core/AAG_CORE_INDEX.md` / `core-boundary-policy.md` / `references/01-principles/aag/` で articulate された AAG 思想と、現行 `architectureRules.ts` / `merged.ts` / `defaults.ts` / `helpers.ts` / `aag-response.ts` / 各 guard の **振る舞い** を変えない。

**禁じる**:

- 既存 rule / guard の意味 (semantics / governance / detection) を変える
- 既存 rule の severity / baseline を緩和方向に動かす (原則 3 と重複ガード)
- 既存 AagResponse / detector output の "見た目" を変える (Phase 5 / 6 は内部正本切替のみ。出力 byte は golden test で同一性保証)
- 既存 merge 結果を変える (Phase 4 で artifact 化するが、結果は runtime merge と byte-identical)
- `aag/core/principles/core-boundary-policy.md` の 5 設計原則を変える / 上書きする

**例外** (発見時は分離より修正が先):

- **矛盾**: doc と実装の宣言が物理的に乖離している (例: bootstrap-guide が「空 overlay で動く」と articulate するが merged.ts が throw する)
- **潜在バグ**: 過去誰も踏んでいないが論理的に必ず壊れる経路 (例: 新規 project bootstrap)
- **二重定義**: 同一概念が複数 file で別 type として宣言されている (例: `RuleExecutionOverlayEntry`)

例外修復は通常の Phase work として scope に含めるが、**必ず DA entry を起こして根拠と影響範囲を articulate する**。修復前後の振る舞い差分は golden test で機械検証する。

> **理由**: AAG の振る舞いを本 program のついでに変えると、分離が完了したのか思想が変わったのか後から区別不能になる。「分離だけ」が本 program の signature。

### 原則 2: アプリ業務ロジックを 1 行も変えない

本 program は AAG 自体の制度基盤化に閉じる。`domain/calculations/` / `application/usecases/` / `application/queries/` / `presentation/` / readModels の **意味** を変える変更は本 program の scope 外。AAG が改善されたとしても、それを理由に業務側を触らない。

> **理由**: AAG の制度変更とアプリ業務の意味変更を同じ commit に混ぜると、変更の責任境界が崩れる (どちらの diff がどちらの問題を起こしたか追跡不能)。

### 原則 3: 既存 guard の検出範囲を緩めない

既存の guard test (architectureRuleGuard / responsibilityTagGuardV2 / testTaxonomyGuardV2 / 等) の baseline を **緩和方向** に動かさない。Phase 2 の bootstrap path 修復で既存 guard が落ちる場合は、guard を緩めるのではなく実装側を直す。ratchet-down (検出範囲を狭めない方向に baseline を動かす) のみ許容。

> **理由**: 制度基盤化の作業中に既存制度を退行させるのは本末転倒。AAG が床を保証している前提を本 program が壊さない。

### 原則 4: derived artifact を手編集しない

Phase 4 以降に生成される `docs/generated/aag/merged-architecture-rules.json` / `overlay-coverage.json` / `merge-report.json` は **生成物**。手で編集しない。差分が出たら generator (Phase 4 で landing) を直す。

> **理由**: derived の手編集を許すと「正本 → 派生」の方向性が壊れ、artifact が "手で書いた事実" の置き場になる。`source-of-truth.md` 正本ポリシー違反。

### 原則 5: Go PoC は PoC 止まり、本 cutover はしない

Phase 9 で Go binary を作るが、CI 主経路の Go 化 / TS facade の縮退 / Go authoritative 宣言は本 program の scope 外。`aag-go-cutover` (仮称) として後続 project に分離する。本 program は cutover charter (Phase 10) までで止める。

> **理由**: Go 移行を本 program に内包すると Level 4 (umbrella) に escalate せざるを得なくなる。本 program は Level 3 で完結することを設計目標とする。Go 実装を急ぐより authority / artifact / contract / change-policy の 4 軸を完成させる方が、後続 cutover の安全性に効く。

### 原則 6: 高機能ではなく高品質に洗練する

新 doc / 新 schema / 新 guard / 新 artifact / 新 runtime は、以下のいずれかでなければ scope に入れない:

- (a) **限界突破**: ドキュメント中心ではできなかったこと (上 L1〜L5) のうち 1 つ以上を解消する
- (b) **無駄削減**: 既存実装の無駄 (上 W1〜W7) のうち 1 つ以上を削減する
- (c) **矛盾 / バグ修復**: 既存の振る舞いの矛盾や潜在バグを修復する (`原則 1` 例外)

「あった方がいい」「将来に備えて」「他 project でも使えそう」は本 program の scope 外。Phase 完了時の Q1〜Q5 self-check と並んで、**(a) / (b) / (c) のどれを満たすか** を各 Phase / 各成果物に articulate する義務を課す。

> **理由**: user 言明「高機能ではなく、高品質に洗練させていく」。functionality 追加は容易だが、quality 確保は cutting / consolidation を伴う。本 program は cutting / consolidation を default 行動とし、追加は justify を要する。

### 原則 7: 判断の正しさは "人間の同意" で担保しない

本 program は **AI が事実と根拠で判断して進める**。人間承認は **archive 1 点のみ** に圧縮する。各 Phase の選択肢比較・採用案決定は AI が articulate された判断基準で行い、`decision-audit.md` に **判断時の根拠と振り返り観測点 + commit lineage** を記録する。Phase 完了時に観測点を実測し、判断が正しかったか / 部分的か / 間違っていたかを追記する。間違っていた場合は同 artifact に軌道修正方針を記録し、`rollbackTag` で物理的に判断前に戻れる。

> **理由**: 「人間が同意したから正しい」という構造を作らない。同意は判断の根拠ではなく **責任の引受** に過ぎない。判断の正しさは事後の事実観測でしか確かめられない。本 program はそれを制度に組み込む (`projectization.md` §2 `requiresHumanApproval=true` は archive 承認のみ。本 §"Decision Audit Mechanism" 参照)。

---

## 実装品質基準 (Acceptance Criteria)

本 program のあらゆる成果物 — **コード / ガード / 生成 artifact / 文書 / DA entry** — が以下 5 つの基準を満たさない限り landing しない。**AAG は文書中心だが、これらは文書にも同じ強度で適用する**。

| # | 基準 | 定義 (1 文) | 測定 (機械 or 自己点検) | 失敗 mode |
|---|---|---|---|---|
| Q1 | **意味が明確** | 1 文で説明できる。読み手と書き手の意味が一致する | doc 冒頭に「この doc が答える 1 つの問い」を articulate / file 冒頭に責務 1 行 | 同義 API 並走 / 曖昧命名 (utility / helper / manager) / 同一概念が複数表現で散在 |
| Q2 | **境界 / 役割が明確** | file / module / doc / 概念の責務が 1 つに絞られる | 各 doc に owner / scope / nonScope が明記される (`projectization.md` §4 nonGoals 構造を全 doc に拡張) | 1 ファイル = 2 変更理由 / doc が複数概念を語る / 所掌が議論になる |
| Q3 | **依存関係が正しい** | 上位 → 下位の一方向のみ。循環依存なし | code: layer boundary guard. doc: AAG_CORE_INDEX → core/principles → app-domain → projects の reference 一方向性 | layer 境界違反 / doc 間の相互参照 / authority と consumer の逆向き依存 |
| Q4 | **包含関係に矛盾なし** | A が B を含む宣言と実体が一致。除外があれば除外理由が doc 化されている | registry の集合論的整合 (実 file set vs 宣言された包含関係) を機械検証 | registry が "全 X" を主張するのに漏れがある / doc index が新 doc を反映しない / authority table の "全 concept" と実 type 定義が乖離 |
| Q5 | **構造が明確** | 全体構造が一目で把握できる。section / hierarchy / table が情報を構造化 | 各 doc に概要 table を冒頭 / Read Order section / table-driven articulation | 散文の連続で構造が見えない / 同じ表現が散在し位置で意味を持つ / Read Order が無い |

### 各 Phase 完了時の self-check

各 Phase の完了 checkbox には「Q1〜Q5 を全 landing 成果物について自己点検し、不足を `decision-audit.md` の振り返りに記録した」が含まれる。点検結果は同 entry に下記表形式で残す:

```markdown
### Q1〜Q5 self-check (Phase N 完了時)

| 成果物 | Q1 意味 | Q2 境界 | Q3 依存 | Q4 包含 | Q5 構造 |
|---|---|---|---|---|---|
| <成果物 1> | OK | OK | OK | OK | OK |
| <成果物 2> | OK | gap (理由) | OK | OK | OK |
```

gap がある場合は (a) 即時修正 / (b) 後続 Phase で修正 / (c) escalation のいずれかを articulate。**gap を放置して次 Phase に進まない**。

### AAG が文書中心であることの含意

AAG の成果物は code よりも doc / artifact が多い。Q1〜Q5 を文書に適用する具体例:

- **Q1 意味の明確さ** — 各 doc 冒頭に "この doc が答える 1 つの問い" を 1 文で articulate (「AAG_AUTHORITY_TABLE.md は何が正本か / どの authority に属するかを定める」)
- **Q2 境界 / 役割の明確さ** — 各 doc の "Scope" / "nonScope" / "Read Order" / "正本区分" を冒頭に置く (本 plan.md / projectization.md / decision-audit.md と同じ構造)
- **Q3 依存関係** — doc 間の参照を上位 → 下位の一方向に。`AAG_CORE_INDEX → core/principles/* → app-domain → projects` の階層を逆流させない
- **Q4 包含関係** — `references/01-principles/aag/README.md` の index と物理 doc set / `architectureRules.ts` facade と全 rule registry の整合を guard で機械検証
- **Q5 構造の明確さ** — 各 doc 冒頭に概要 table。Phase / 不可侵原則 / Workstream / Gate / DA entry のように構造を table-driven に articulate

> **理由**: AAG は本体に対する床を保証する装置であり、AAG 自身の床が下がれば全体が下がる。AAG は本体より高い品質規律で運用する (`core-boundary-policy.md` の精神)。本 program では Q1〜Q5 を機械検証 + self-check の二重で守る。

---

## 全体構造 — 4 Workstream / 3 AI Checkpoint / 10 Phase

本 program は 4 Workstream を 10 Phase に展開し、Phase 群の境界に **AI Checkpoint** を置く。Checkpoint は人間承認 gate ではなく、**AI が判断を articulate し、振り返り観測点を実測し、次へ進めるかを事実で判定する** 内部手続き。

```
Workstream A (Authority)        Phase 1 → Phase 2 → Phase 3
                                                ↓
                                  [AI Checkpoint α: Authority]
                                                ↓
Workstream B (Artifactization)  Phase 4 → Phase 8
Workstream C (Contract)         Phase 5 → Phase 6 → Phase 7
                                                ↓
                                   [AI Checkpoint β: Artifact]
                                                ↓
Workstream D (Operating System) Phase 9 → Phase 10
                                                ↓
                              [AI Checkpoint γ: Runtime Replacement]
                                                ↓
                              [最終 archive レビュー (人間承認)]
                              ※ project-checklist-governance §3.1 構造要請
```

### Workstream の役割

| Workstream | 目的 | 含む Phase |
|---|---|---|
| **A. Authority** | 何が正本か / 何を schema にするかを決め切る | 1, 2, 3 |
| **B. Artifactization** | runtime merge を build artifact に変える | 4, 8 |
| **C. Contract** | TS helper に宿った意味を schema に引き剥がす | 5, 6, 7 |
| **D. Operating System** | AAG をコードではなく制度として管理する | 9, 10 |

### AI Checkpoint の役割

| Checkpoint | 通過条件 (機械検証) | AI が記録すること |
|---|---|---|
| **α: Authority** | Phase 1〜3 完了 + 振り返り観測点が全て期待通り | DA-α-001 (Phase 1 採用案 + 振り返り結果) |
| **β: Artifact** | Phase 4〜7 完了 + merged artifact / response / detector schema が consumer 健全に届く | DA-β-001〜003 (Phase 4/5/6 各判断 + 振り返り) |
| **γ: Runtime Replacement** | Phase 8〜10 完了 + Go PoC が TS と byte-identical + change policy 文書化 | DA-γ-001 (Phase 9 PoC scope 判断 + 振り返り) |

各 Checkpoint は `checklist.md` の対応 Phase 末尾の checkbox で機械判定する。**人間承認は不要**。判断が誤っていたと振り返りで判明した場合は、`decision-audit.md` の "軌道修正" entry を追加し、後続 Phase 構造を再構成する。

### Decision Audit Mechanism

本 program 中の主要判断は `decision-audit.md` に entry として landing する。1 entry = 1 判断 = 1 振り返り。**判断と commit を物理的に結合し、判断が間違いと判定された場合に物理的に戻れる** ことを制度として保証する。

各 entry の構造:

```markdown
## DA-{α|β|γ}-{NNN}: {判断の名前}

### 判断時 (Phase N 着手時 / YYYY-MM-DD)

- **判断主体**: AI (Claude) / 補助参考
- **候補**: ...
- **採用案**: ...
- **判断根拠**: 事実 + 推論 (どの調査結果に基づくか)
- **想定リスク**: ...
- **振り返り観測点**:
  - 観測点 1: 〈この事実を観測したら判断が正しかった〉
  - 観測点 2: 〈この事実を観測したら判断が間違っていた〉
  - 観測点 N: ...

### Commit Lineage

- **judgementCommit**: `<sha>` (本 entry を landing した commit)
- **preJudgementCommit**: `<sha>` (本判断の影響を受ける前の最後の commit = rollback target)
- **judgementTag**: `aag-platformization/DA-{α|β|γ}-{NNN}-judgement` (judgement commit に付与)
- **rollbackTag**: `aag-platformization/DA-{α|β|γ}-{NNN}-rollback-target` (preJudgement commit に付与)

### 振り返り (Phase N 完了時 / YYYY-MM-DD)

- 観測点 1: 観測結果 → 期待通り / 期待通りでない
- 観測点 N: 観測結果 → 期待通り / 期待通りでない
- **判定**: 正しい / 部分的 / 間違い
- **学習**: 何が効いたか / 何を読み違えたか
- **retrospectiveCommit**: `<sha>` (本振り返りを landing した commit)

### 軌道修正 (判定が "部分的" / "間違い" の場合)

- **rollback decision**: 完全 revert / 部分 revert / forward-fix で対応
- **rollback procedure** (該当する場合):
  ```bash
  # 完全 revert (本判断以降を破棄して preJudgement に戻る)
  git checkout <preJudgementCommit>
  git checkout -b claude/aag-platformization-DA-{NNN}-rollback
  # または rollbackTag 経由
  git checkout aag-platformization/DA-{α|β|γ}-{NNN}-rollback-target
  ```
- **forward-fix plan** (該当する場合): どの Phase の checklist のどの項目を、どう変えるか
- **rollbackCommit**: `<sha>` (rollback / 軌道修正を landing した commit)
- 本 entry は status を `superseded` に変更し、新たな DA-X-NNN (cross-phase) entry を起こす
```

**判断時の必須要件**:

- **振り返り観測点を最低 3 つ書く** (1 つ以上は反証可能 — 「この事実が出たら判断は間違っていた」)
- **事実根拠を明示** — 推測や直感ではなく、調査済みの事実 / file path / line number / commit へのリンク
- **想定リスクを書く** — 採用案が外れたときの最大被害
- **commit lineage を埋める** — judgement / preJudgement の両 commit を必ず記録。tag を打って push する
- **judgement commit を amend 禁止** — sha が変わると振り返り時に commit を引き当てられなくなる

**振り返りの必須要件**:

- 観測点を実測する。**観測しないまま判定しない**
- 判定は 3 値: 正しい / 部分的 / 間違い (グラデーションで逃げない)
- 軌道修正案は具体的に書く (どの Phase をどう変えるか / どの commit に戻るか)

**Commit message convention**:

各 commit の body に **必ず** 以下のいずれかを含める:

```
Decision: DA-{α|β|γ}-{NNN} ({judgement|implementation|retrospective|rollback})
```

- `judgement` — 本判断を articulate した commit (Phase 着手時)
- `implementation` — 本判断に基づく実装 commit
- `retrospective` — 本判断の振り返りを landing した commit
- `rollback` — 本判断の軌道修正 / revert を landing した commit

例:
```
docs(decision): DA-α-002 merge policy 採用案 = defaults stub

3 案 (defaults stub / merged null / bootstrap seed) を blast radius / migration
cost / 後方互換 で比較し、defaults stub を採用。

Decision: DA-α-002 (judgement)
```

**Tag convention**:

- Phase 着手 commit に `aag-platformization/DA-{α|β|γ}-{NNN}-judgement` tag
- Phase 完了 commit に `aag-platformization/DA-{α|β|γ}-{NNN}-retrospective` tag
- 判断前の最後の commit に `aag-platformization/DA-{α|β|γ}-{NNN}-rollback-target` tag
- tag は **annotated tag** (`git tag -a`) で push する

これによって `git log --grep="DA-α-002"` で判断履歴を抽出でき、`git checkout aag-platformization/DA-α-002-rollback-target` で物理的に戻れる。

**Rollback の制度化**:

判定が "間違い" の場合、本 program は失敗ではなく **判断の正しさを担保する仕組みが機能した** ことを意味する。具体的には:

1. 振り返り entry に判定 = "間違い" を記録 (`retrospectiveCommit` を landing)
2. `rollback decision` を articulate (完全 revert / 部分 revert / forward-fix のいずれか)
3. 採用した rollback 手順を実行 (`rollbackCommit` を landing、tag = `aag-platformization/DA-{α|β|γ}-{NNN}-rollback-applied` を打つ)
4. 元の DA entry の status を `superseded` に変更
5. 新たな判断を立てる場合は DA-X-NNN (cross-phase) として新 entry を起こす

これは AAG 自体の "適応" を本 program 内部に埋め込む装置。AI が後続 program / 後続 maintainer に判断履歴と物理的な rollback 経路の両方を引き継げる形にする。

---

## Phase 構造

### Phase 0: Bootstrap (本 commit で完了)

`projects/_template` から本 project を複写し、必須セット 6 ファイルを埋める。AAG-COA Level 3 を `projectization.md` に記録する。最終 archive レビュー checkbox (人間承認、構造的要請) を `checklist.md` 末尾に置く。`open-issues.md` に行を追加し、`CURRENT_PROJECT.md` を切り替えて `npm run verify:project` / `test:guards` / `docs:generate` / `docs:check` / `lint` / `build` が PASS することを確認する。

完了条件: `checklist.md` Phase 0 が全 [x]。

---

### Workstream A — Authority Program

#### Phase 1: Authority Charter (1 doc 統合 + 3 判断)

**目的**: AAG の正本 / 合成方針 / schema 一覧 / RuleBinding 境界を **単一 doc に統合** し、加えて 3 判断 (architectural style / format / runtime) を AI が下す。`aag/core/` 配下の AAG Core doc 数増加を最小化 (W7 削減)。

**やること**:

- `aag/core/AAG_CORE_CONTRACTS.md` を新設し、以下 4 章で構成:
    - §1 Authority Table — 10 concept × 4 列 (concept / authority 分類 / physical source / change policy)。RuleSemantics + RuleDetectionSpec = Core / RuleGovernance + RuleBinding = App Domain / RuleOperationalState = Project Overlay / 派生は Derived Artifact / facade は Consumer Facade
    - §2 Merge Policy — 解決順序 / reviewPolicy 契約 / 採用案 (Phase 2 で確定)
    - §3 Schema Registry — 5 schema の version policy + 採用 format (Phase 3 で確定)
    - §4 RuleBinding Boundary Policy — 許可 5 field / 禁止 7+ field の articulate (Phase 7 guard の上位)
- `aag/core/AAG_CORE_INDEX.md` から本 doc 1 本にリンク
- `references/01-principles/aag/source-of-truth.md` に "Core Contracts" セクションを追加し本 doc を index
- **判断**: 以下 3 件を AI が下し `decision-audit.md` に landing:
    - **DA-α-001a**: Architectural style 選定 (現行 0 / Pure structured artifact A / MCP B / TS export C / hybrid D の 5 案比較)
    - **DA-α-001b**: Domain serialization format 選定 (JSON / YAML / TOML / CUE / protobuf / Dhall / KDL / JSON5 / JSONC を比較)
    - **DA-α-001c**: Reference runtime 選定 (style 採用後、必要なら) — 候補は **Go / Python / Go+Python combo**。**Rust は除外** (本体 (粗利) が WASM/Rust を計算エンジンに使用しているため、AAG Core が Rust を使うと言語境界が混線する)。AI が Rust を強く推奨する場合は **人間確認必須** (例外 escalation)

**完了条件**: `AAG_CORE_CONTRACTS.md` に 4 章 landing + 3 DA entry が landing + judgement / rollback-target tag が push 済 + `docs:check` PASS。

**(a)/(b)/(c) 判定** (原則 7): (b) AAG Core doc 6 本 → 3 本以下に削減 (W7) + (a) 機械 navigation 可能な authority registry を提供 (L4 部分突破)

#### Phase 2: Merge Policy Fix

**目的**: bootstrap 破綻 (空 overlay → `merged.ts` throw) を修復し、merge policy を 1 つに固定する。

**やること**:

- `aag/core/MERGE_POLICY.md` を新設し、以下 3 案を blast radius / migration cost / 後方互換 で比較する一覧を作成、AI が事実根拠で 1 案を採用 (判断は `decision-audit.md` DA-α-002 に記録):
    - **案 A**: `defaults.ts` に reviewPolicy stub を追加 (owner: 'unassigned' / lastReviewedAt: null / reviewCadenceDays: 90)
    - **案 B**: `merged.ts` で project overlay 不在時に reviewPolicy を null として組み立て、reviewPolicy 必須は別 guard に逃がす
    - **案 C**: bootstrap で `seed-execution-overlay.ts` を生成必須化 (空 overlay を許さない)
- `RuleExecutionOverlayEntry` を `aag-core-types.ts` に集約 (現状は _template と pure-calculation-reorg で二重定義)
- `_template/aag/execution-overlay.ts` の comment と `pure-calculation-reorg/aag/execution-overlay.ts` の comment を採用案に揃える
- `merged.ts` の merge result に `resolvedBy` field を追加 (project-overlay / defaults / stub の 3 値)
- `new-project-bootstrap-guide.md` Step 4 を採用案に合わせて書き直す

**完了条件**: 空 `EXECUTION_OVERLAY = {}` で `merged.ts` が throw せず動く。`pure-calculation-reorg` の既存挙動が維持される。`test:guards` PASS。

#### Phase 3: Authority Table + Schema Registry

**目的**: 現存する 5 つの Core type を、Phase 3 で確定する serialization format の schema として正本化する (DA-α-003 で format を選定)。

**やること**:

- AAG_CORE_CONTRACTS.md §3 で確定した format で 5 schema を `docs/contracts/aag/` 配下に新設:
    - `rule-semantics` (Core 分類、`aag-core-types.ts` `RuleSemantics` から派生)
    - `rule-governance` (App Domain 分類、`aag-core-types.ts` `RuleGovernance` から派生)
    - `rule-operational-state` (Project Overlay 分類、`aag-core-types.ts` `RuleOperationalState` から派生)
    - `rule-detection-spec` (Core 分類、`aag-core-types.ts` `RuleDetectionSpec` から派生)
    - `rule-binding` (App Domain 分類、`architectureRules/types.ts` `RuleBinding` から派生)
- 各 schema に identifier / version / description 相当を設定 (format 依存)
- TS 型と schema の同型性を検証する guard を新設 (`aagSchemaIsomorphismGuard.test.ts`)

**完了条件**: 5 schema が landing し、TS 型変更時に同型性 guard が落ちる。`test:guards` PASS。**[AI Checkpoint α: Authority] 通過判定** — `decision-audit.md` の DA-α-001a/b/c (architectural style / format / runtime) + DA-α-002 (merge policy) の振り返り全 entry が "正しい" or "部分的+軌道修正記録あり" 状態。

**(a)/(b)/(c) 判定** (原則 7): (a) prose articulate された型を機械検証可能な schema へ昇格 (L2 突破) + (b) 同型性検証で TS 型と schema の drift を防ぐ (W3 部分削減)

---

### Workstream B — Artifactization Program

#### Phase 4: Merged Artifact Generator (1 artifact のみ)

**目的**: runtime merge を build artifact に変え、`resolvedBy` で transparency を担保する。

**やること**:

- `tools/architecture-health/src/aag/merge-artifact-generator.ts` を新設
- `docs/generated/aag/merged-architecture-rules.<format>` のみ生成 (全 rule の merge 結果 + 各 field の `resolvedBy: 'project-overlay' | 'defaults' | 'stub'`)
- `npm run docs:generate` から呼び出し、`docs:check` で stale 検出

**当初案からの cut**: `merge-report` / `overlay-coverage` の 2 artifact は **削除** (高機能側、原則 7 (a)(b)(c) いずれも満たさない)。必要であれば後続 project の責務とする。

**完了条件**: 1 artifact が再生成可能。`docs:check` PASS。

**(a)/(b)/(c) 判定** (原則 7): (b) runtime merge の毎回再計算を排除 (W2 削減) + (a) AI が parse なしで直接消費可能 (L1 突破)

#### Phase 8: Overlay Artifactization

**目的**: defaults / 各 project overlay を Phase 3 で確定した format の artifact 化し、Go runtime から直接読める状態にする。

**やること**:

- `docs/generated/aag/default-execution-overlay.json` を `defaults.ts` から生成
- 各 active project の `aag/execution-overlay.ts` を `docs/generated/aag/overlays/<project-id>.json` として並列出力 (TS は authoring 正本として残す)
- 後続 Phase 9 の Go PoC が確定 format 経由で読めることを確認

**完了条件**: 全 overlay が確定 format の artifact として存在し、TS と派生 artifact の同期 guard が landing。

---

### Workstream C — Contract Program

#### Phase 5: AagResponse Contract Separation (schema 化のみ、renderer 分割は cut)

**目的**: AagResponse を helper 駆動から schema 駆動に切り替える。

**やること**:

- `docs/contracts/aag/aag-response.<format>` を新設
- `tools/architecture-health/src/aag-response.ts` の `AagResponse` 型を schema からの型生成に切り替え
- helpers.ts は schema-backed AagResponse を re-export するだけにする
- AAG docs (`references/01-principles/aag/`) で AagResponse を doc 化 (短い参照で良い)

**当初案からの cut**: renderer 4 種分割 (text / markdown / shell / pr-comment) は **削除** (高機能側)。現在 text renderer のみで足りているため、必要時は後続 project で追加。

**完了条件**: AagResponse が schema を 1 次正本として振る舞う。既存 text renderer の出力 byte が schema 化前と同一 (golden test)。`test:guards` PASS。

**(a)/(b)/(c) 判定** (原則 7): (b) inline 型 + comment-only contract → schema = 単一 contract (W3 削減) + (a) 言語非依存に AagResponse を消費可能 (L5 突破)

#### Phase 6: Detector Protocol

**目的**: guard / collector / pre-commit / 将来の Go detector が同一 protocol で出力する。

**やること**:

- `docs/contracts/aag/detector-result.schema.json` を新設 (ruleId / detectionType / sourceFile / evidence / actual / baseline / severity / messageSeed)
- 既存 guard test の violation message 構築箇所を schema 準拠に揃える (helpers.ts `formatViolationMessage` 経由)
- collector (obligation-collector / dependency-collector / 等) も同 schema に揃える
- pre-commit hook の output も同 schema 準拠

**完了条件**: 全 detector output が schema validation を通る。`test:guards` PASS。

#### Phase 7: RuleBinding Boundary Guard (guard 1 本のみ、policy doc は cut)

**目的**: `RuleBinding` に意味系フィールド (what / why / decisionCriteria / migrationRecipe / fixNow / executionPlan / lifecyclePolicy) が漏れないことを機械保証する。

**当初案からの cut**: 別 doc `aag/core/principles/rule-binding-policy.md` 新設は **削除** (高機能側)。policy 内容は **AAG_CORE_CONTRACTS.md §4** に統合済 (Phase 1)。本 Phase は guard 1 本だけ追加する。

**やること**:

- `app/src/test/guards/ruleBindingBoundaryGuard.test.ts` を新設
- 許可フィールド: `doc` / `correctPattern` / `outdatedPattern` / `canonicalDocRef` / `metaRequirementRefs` (現状の 5 つ)
- 禁止フィールド: 上記 7 つ + 任意の `detection*` / `governance*` / `operationalState*` プレフィックス
- `aag/core/principles/rule-binding-policy.md` を新設し、許可 / 禁止 list の根拠を articulate

**完了条件**: 違反コードを試験的に書くと guard が hard fail する。`test:guards` PASS。**[AI Checkpoint β: Artifact] 通過判定** — `decision-audit.md` の DA-β-001〜003 振り返り全 entry が "正しい" or "部分的+軌道修正記録あり" 状態。

---

### Workstream D — Operating System Program

#### Phase 9: Reference Runtime PoC (Phase 1 結果に応じて conditional)

**目的**: Phase 1 で選定された architectural style に応じて、AI-agnostic 消費が成立することを最小実装で証明する (PoC 止まり、本 cutover はしない)。

**Phase 1 結果別の振る舞い**:

| DA-α-001a 結果 | Phase 9 の内容 |
|---|---|
| **A: Pure structured artifact** | runtime PoC は最小 CLI のみ (validate + merge の参照実装、~100 行)。consumer の reference として残す |
| **0: Go runtime + 構造化 format** | `tools/aag-go/` で validate + merge + render-response の Go binary 一式 |
| **B: MCP server** | server + client の最小実装 (MCP protocol 経由で AI が consume できる) |
| **C: TS export** | Phase 9 は **skip**。TS canonical のため別言語実装は不要 |
| **D: hybrid** | A の最小 CLI + B の MCP server |

**言語**: 採用 architectural style が runtime を要求する場合の言語候補は **Go / Python / Go+Python combo**。**Rust は除外** (本体 (粗利) が WASM/Rust を計算エンジンに使用しているため、AAG Core が Rust を使うと言語境界が混線する)。**AI が Rust を強く推奨する場合は人間確認必須** (DA-α-001c で escalation)。

**やること** (style A / 0 / B / D の場合、共通):

- `tools/aag-{lang}/` を新設 (採用言語に応じて)
- merge 結果が **TS 側と byte-identical** であることを確認するスクリプトを新設
- CI には組み込まない (後続 cutover project の責務)

**当初案からの cut**: 4 renderer (text / markdown / shell / pr-comment) を全て Go 実装する案は **削除** (高機能側)。reference runtime は最小スコープに絞る。

**完了条件**: PoC として手動実行で TS と同一結果を返す。または style C 採用なら本 Phase は skip 完了。

**(a)/(b)/(c) 判定** (原則 7): (a) 別言語から AAG Core を consume できることを実証 (L1 / L4 突破の証拠) — style C なら本 Phase は不要 (= 高品質判断としての skip)

#### Phase 10: Cutover Charter + Change Policy

**目的**: 本 program で確立した制度を後続 cutover に引き渡せる形で文書化する。

**やること**:

- `aag/core/AAG_CORE_CHARTER.md` を新設 (1 doc に統合):
    - §1 Change Policy — schema versioning / golden test / compatibility test / merge policy 変更ルール / RuleBinding 境界違反 hard fail / Core への app 固有具体名禁止
    - §2 Cutover Charter — 後続 `aag-runtime-cutover` (採用 architectural style 次第で命名) project の前提・nonGoals・着手条件
    - §3 完了済 4 AAG project との継承関係 (`aag-core-doc-refactor` / `aag-rule-schema-meta-guard` / `aag-display-rule-registry` / `aag-legacy-retirement`)
- `references/02-status/recent-changes.md` に本 program のサマリを追加

**当初案からの cut**: `AAG_CORE_CHANGE_POLICY.md` + `AAG_CUTOVER_CHARTER.md` の 2 doc 案は **1 doc 統合** (W7 削減)。3 章 = 3 責務 articulation だが C1 違反ではない (本 doc の責務は "後続 program への institution 引き渡し" の 1 つ、3 章はその構成要素)。

**完了条件**: 1 doc が landing。`docs:check` PASS。**[AI Checkpoint γ: Runtime Replacement] 通過判定** — `decision-audit.md` の DA-γ-001 (Phase 9 PoC scope 判断) + DA-γ-002 (cutover 後続 project 分離方針) の振り返り entry が "正しい" or "部分的+軌道修正記録あり" 状態。

**(a)/(b)/(c) 判定** (原則 7): (b) 2 doc → 1 doc (W7 削減) + (a) 後続 program への institution 引き渡しを構造化

---

### 最終 archive レビュー (人間承認、構造的要請)

`checklist.md` 末尾の最終レビュー checkbox は `references/03-guides/project-checklist-governance.md` §3.1 の構造要請。AI による本 program の判断履歴 (`decision-audit.md` の全 entry) を人間が読み、archive プロセスへの移行を承認する。

**この承認は判断の正しさを担保しない**。人間の "同意" は責任の引受であって、判断の根拠ではない (原則 7)。判断が後日誤りと判明した場合は、後続 program で `decision-audit.md` の "軌道修正" 列を追記して継承する。

---

## やってはいけないこと

| 禁止事項 | なぜ禁止か |
|---|---|
| 既存 AAG 振る舞い (rule semantics / merge 結果 / AagResponse 出力 / detector message) を変える | 不可侵原則 1 違反。分離 program なのに振る舞いが変わると、分離が完了したのか思想が変わったのか後追い不能 |
| アプリ業務ロジック (`domain/calculations/` / `application/usecases/` / readModels) の意味を変える | 不可侵原則 2 違反。本 program と業務変更の責任境界が崩れる |
| 既存 guard の baseline を緩和方向に動かす | 不可侵原則 3 違反。AAG が床を保証している前提を本 program が壊す |
| `docs/generated/aag/*` (確定 format) を手編集する | 不可侵原則 4 違反。正本→派生の方向性が壊れる |
| Phase 9 完了をもって CI の主経路を Go に切り替える | 不可侵原則 5 違反。後続 `aag-go-cutover` project の所掌。本 program の Go PoC は scope 限定 |
| `base-rules.ts` (10,805 行) を全 JSON 化する | nonGoal §4。authoring の rich TS 表現 (型補完 / リファクタ安全) を毀損する |
| `pure-calculation-reorg` の `aag/execution-overlay.ts` rule entry を削除する | nonGoal。本 program は overlay 型 / comment / authority 契約の整理に閉じる。entry の意味判断は所掌外 |
| `references/99-archive/` 配下の旧 AAG doc を削除する | `aag-legacy-retirement` で archive 移管済み。本 program で再削除すると履歴が壊れる |
| Phase 2 完了前に新規 project を bootstrap する | bootstrap path が破綻している (HANDOFF §3.1)。Phase 2 修復後に手順を確定してから |
| 単一 commit で 2 Phase 以上をまとめる | Phase 境界での `docs:generate` / `test:guards` 検証ができなくなる。Phase 単位で commit する |
| AAG 関連 doc を更新せず `tools/architecture-health/` を編集する | obligation-collector が AAG 8 doc の read 義務を発火する (HANDOFF §3.5)。Phase 5 / 6 で必須 |

---

## 関連実装

> **追加成果物の総数 (refactor 後)**: 新 doc **2** (Phase 1 + Phase 10) / 新 schema **7** (rule × 5 + AagResponse + DetectorResult) / 新 guard **2** (isomorphism + binding boundary) / 新 artifact **1** (merged) + overlay 派生 / 新 runtime PoC **0〜1** (style 次第)。当初案の半分強。

### Phase 1〜3 (Authority)

| パス | 役割 |
|---|---|
| `aag/core/AAG_CORE_CONTRACTS.md` | **新設 (Phase 1)** — 4 章統合 doc (Authority Table / Merge Policy / Schema Registry / RuleBinding Boundary Policy)。当初案の 3 doc を 1 doc に集約 (W7 削減) |
| `app/src/test/aag-core-types.ts` | 修正 (Phase 2) — `RuleExecutionOverlayEntry` を集約定義として追加 (W1 削減) |
| `app/src/test/architectureRules/merged.ts` | 修正 (Phase 2 / 4) — bootstrap 修復 + `resolvedBy` 追加 |
| `app/src/test/architectureRules/defaults.ts` | 修正 (Phase 2) — reviewPolicy stub (採用案次第) |
| `app/src/test/guards/aagSchemaIsomorphismGuard.test.ts` | 新設 (Phase 3) — TS 型と確定 format の schema の同型性検証 |

### Phase 4, 8 (Artifactization)

| パス | 役割 |
|---|---|
| `tools/architecture-health/src/aag/merge-artifact-generator.ts` | 新設 (Phase 4) |
| `docs/generated/aag/merged-architecture-rules.<format>` | 派生 (Phase 4) — **1 artifact のみ**。`merge-report` / `overlay-coverage` は当初案から cut |
| `docs/generated/aag/default-execution-overlay.<format>` | 派生 (Phase 8) |
| `docs/generated/aag/overlays/<project-id>.<format>` | 派生 (Phase 8、各 active project ごと) |

### Phase 5〜7 (Contract)

| パス | 役割 |
|---|---|
| `docs/contracts/aag/aag-response.<format>` | 新設 (Phase 5) — schema のみ。renderer 4 種分割は当初案から cut |
| `docs/contracts/aag/detector-result.<format>` | 新設 (Phase 6) |
| `tools/architecture-health/src/aag-response.ts` | 修正 (Phase 5) — schema 駆動化のみ |
| `app/src/test/guards/ruleBindingBoundaryGuard.test.ts` | 新設 (Phase 7) — guard 1 本のみ。policy doc は AAG_CORE_CONTRACTS.md §4 に統合 |

### Phase 9〜10 (Operating System)

| パス | 役割 |
|---|---|
| `tools/aag-{go|python|...}/` | 新設 (Phase 9、style 次第) — Phase 1 で採用 architectural style + 言語 (Go / Python / combo、Rust 除外) を確定。style C なら本 Phase は skip |
| `aag/core/AAG_CORE_CHARTER.md` | **新設 (Phase 10)** — 3 章統合 doc (Change Policy / Cutover Charter / 完了済 4 AAG project 継承)。当初案の 2 doc を 1 doc に集約 (W7 削減) |

### 触らないが影響を受けるもの

| パス | 役割 |
|---|---|
| `app-domain/gross-profit/rule-catalog/base-rules.ts` (10,805 行) | TS authoring 正本として維持 |
| `app/src/test/architectureRules.ts` | facade として維持 (内部だけ artifact 駆動化) |
| `app/src/test/architectureRules/index.ts` | barrel として維持 (artifact 経路に応じて re-export 内容調整) |
| `tools/architecture-health/src/collectors/obligation-collector.ts` | AAG path obligation を維持 |
| `references/01-principles/aag/` (9 doc, 1,538 行) | 整合参照のみ (本 program で削除しない) |
