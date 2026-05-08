# plan — aag-structural-control-plane

## 最上位原則（Constitutional Layer = Meaning / Intent / Will / Continuity）

> **役割**: AAG SCP の **最上位原則**。Tree Contract / Document Contract / Skeleton / Inventory / Guidance / Gate を含む **すべての下位機能の根拠** となる constitutional layer。詳細根拠: `decision-audit.md` ADR-SCP-017。
>
> 不可侵原則 1〜12（下記 section）は本最上位原則の **operational invariant**（= 不変制約）として articulate される。本最上位原則は constitutional principle（= すべての下位機能の根拠）であり、両者は性質が異なる。

### AAG の定義

> **AAG は、良い設計を保証するものではなく、設計に込められた意図と意思が失われないようにし、変化し続ける未来へ継承するための仕組みである。**

最も articulated 形式（過去文脈 / 現在意味 / 未来意思 の 3 軸統合、CONTINUITY-006〜008 整合）:

> AAG は、repo 内の構造・文書・ルール・生成物・例外・変更について、**それが過去のどの文脈を受け継ぎ、現在どの意味を持ち、未来へ何を渡す意思があるのか**を問い続ける仕組みである。

中心 articulate（4 文）:

> **意味がないものは置かない。意味のないことはしない。**
> **説明できないものは置かない。説明できないことはしない。**

補強 articulate（誤認回避）:

> **存在していることは意味の証明ではない。動いていることは意図の証明ではない。**
> Existence is not proof of meaning. Functioning is not proof of intent.

判断要件 articulate（CONTINUITY-006〜008 整合）:

> **AAG は、判断に「文脈」と「意思」を要求する。**
> **AAG は、過去の文脈を未来へ繋げる意思のない変更を許さない。**
> **AAG は、判断の正解を保証しない。AAG は、その判断が文脈を持ち、意思を持ち、未来の判断者に継承可能であることを要求する。**

### AAG が保証するもの / 保証しないもの

| AAG が保証するもの（articulate） | AAG が保証しないもの（articulate しない） |
|---|---|
| その時点で何を意図していたか | この設計が最善である |
| なぜその判断をしたか | この構造が永久に正しい |
| どの前提でそうしたか | このドキュメント体系が完成形である |
| 何を守ろうとしていたか | このルールが将来も有効である |
| 何を捨てたか | この判断が絶対に正しい |
| 何を後続に委ねたか | （上記すべて、固定的な「正しさ」の保証） |
| いつ再検討すべきか | |

### AAG-SCP-MEANING-001〜005（spatial dimension = 各 artifact / action 単位）

| 原則 ID | 内容 |
|---|---|
| **AAG-SCP-MEANING-001** | AAG は、repo 内の artifact / action に対して、**意味・意図・意思が存在するか**を問う |
| **AAG-SCP-MEANING-002** | 意味が説明できない artifact は、declared / contracted / generated / archived の **いずれにも昇格できない** |
| **AAG-SCP-MEANING-003** | 意図が説明できない変更は、rule / checker / document / generated artifact として **追加してはならない** |
| **AAG-SCP-MEANING-004** | **存在していることは意味の証明ではない。動いていることは意図の証明ではない。** |
| **AAG-SCP-MEANING-005** | AAG の目的は、repo を形式に従わせることではなく、**意思を持って設計された構造として維持する**ことである |

### AAG-SCP-CONTINUITY-001〜008（temporal dimension = 変化の継承可能性 + 判断軸）

| 原則 ID | 内容 |
|---|---|
| **AAG-SCP-CONTINUITY-001** | AAG は、**良い設計そのものを保証しない**。AAG は、設計に込められた意味・意図・意思の **連続性**（未来の AI / 人間への継承可能性）を保証する |
| **AAG-SCP-CONTINUITY-002** | 設計意図は **固定物ではなく、変化し続ける前提**で扱う。変化は許可されるが、**変化の理由・捨てた前提・継承した意図**を記録しなければならない |
| **AAG-SCP-CONTINUITY-003** | AAG の Gate は **設計判断の正しさを判定しない**。Gate は、**説明不能な構造・未宣言の変更・意図なき追加・理由なき例外**を検出する |
| **AAG-SCP-CONTINUITY-004** | 過去の意図は未来の判断を **拘束するものではなく**、未来の AI / 人間が判断するための **文脈** である |
| **AAG-SCP-CONTINUITY-005** | AAG は **変化を止めるのではなく、変化を継承可能にする** |
| **AAG-SCP-CONTINUITY-006** | AAG における判断は、**好き嫌い・局所最適・その場の都合**によって行ってはならない。判断は、**過去の文脈を理解し、現在の意味を説明し、未来へ何を継承するか**を明確にしたうえで行う |
| **AAG-SCP-CONTINUITY-007** | 変更は、**現在の不便を解消するためだけに行ってはならない**。変更は、**過去から引き継ぐべき意図と、未来へ渡すべき構造**を明示したうえで行う |
| **AAG-SCP-CONTINUITY-008** | AAG は **判断の正解を保証しない**。AAG は、その判断が **文脈を持ち、意思を持ち、未来の判断者に継承可能**であることを要求する |

#### 判断軸（CONTINUITY-006/007/008 の operational articulation）

> **AAG は、判断に「文脈」と「意思」を要求する。**
> **AAG は、過去の文脈を未来へ繋げる意思のない変更を許さない。**
>
> ただし、これは「過去を守る」ことではない。**過去は拘束ではなく、判断材料**である。

| NG（AAG が許さない判断） | OK（AAG が要求する判断） |
|---|---|
| 好きだから変える | 過去の文脈を理解している |
| 気に入らないから消す | 現在の意味を説明できる |
| 今回だけ楽だから置く | 未来へ何を継承するか明確である |
| 一時的に都合がいいから増やす | 何を捨てるか説明できる |
| 既存にあるから残す | 変更後の構造に意図がある |
| AI がそう出力したから採用する | 後続の AI / 人間が判断を追える |

判断のプロセス（CONTINUITY-006/007 の operational articulate）:

```
過去の文脈を理解する
   ↓
現在の意味を問い直す
   ↓
未来へ繋げるものを選ぶ
   ↓
不要なものは捨てる
   ↓
なぜそうしたかを残す
```

### 3-layer 思考モデル（Meaning / Intent / Will）

すべての artifact / action に対して、3 段階の問いを順に articulate:

| 層 | 問い | 説明できない場合 |
|---|---|---|
| **1. Meaning（これは何か）** | このディレクトリ / 文書 / JSON / checker / generated file / 例外は何か? | unexplained artifact（= AAG 上で危険） |
| **2. Intent（なぜ存在するのか）** | なぜこの場所か / 粒度か / 文書か / generated でなく manual か / この checker が必要か / 既存の仕組みでは何が足りないか? | unjustified artifact（= AAG 上で要精査） |
| **3. Will（意思を持って選ばれているか）** | 惰性ではないか / 過去の名残ではないか / AI が流れで追加しただけではないか / 既存構造を正当化しているだけではないか / 本当に維持する意思があるか? | inertial artifact（= AAG が最も警戒する状態） |

### Mechanical（Gate scope = §A）vs Guidance（Review scope = §B）

最上位原則はすべてを機械判定できない。明示的に分離（既存 ADR-SCP-014 との上位定義）:

| Mechanical（Gate scope = §A、foul / finding 可能） | Guidance（Review scope = §B、AI / human review 判定） |
|---|---|
| owner / purpose / producer / lifecycle / rationale field の欠如 | purpose の妥当性 |
| exception reason / generated source / document kind / skeleton role field の欠如 | 意図の十分な強さ |
| undeclared 変更（= 意図 articulate なき diff） | 既存構造の正当化のみではないか |
| reason-less 例外 | artifact を維持する価値があるか |
| | 説明が後から読んでも納得できるか |
| | 「意思ある選択」かどうか / inertia / 名残 / 流れで追加 等の検出 |

### AI に期待される役割（最上位原則の operational implication）

> **AAG does not ask AI to preserve the current implementation. AAG asks AI to make intentional changes.**
> **The current implementation is not a preservation target. It is an observed state to be interpreted, challenged, revised, preserved, archived, or replaced with explicit rationale.**
>
> AAG は AI に **現在の実装維持**を求めない。AAG が AI に求めるのは、**意思のある変更**である。
> 現在の実装は **維持対象ではなく、観測対象**である。AI はそれを読み、意味を問い、意図を理解し、必要に応じて **維持・修正・移動・archive・置換**を判断し、その理由を未来へ継承する。

#### AI の望ましい行動モデル（9-step）

| step | 行動 |
|---|---|
| 1 | 現状を見る（observe） |
| 2 | 意味を問う（meaning?） |
| 3 | 意図を探す（intent?） |
| 4 | 意思があるか確認する（will?） |
| 5 | 骨格と照らす（compare to skeleton） |
| 6 | 差分を見つける（identify gap） |
| 7 | 残す / 変える / 移す / archive / tolerate を判断する（decide disposition） |
| 8 | 判断理由を残す（articulate rationale） |
| 9 | 必要なら設計そのものを再計画する（revise ideal if needed、CONTINUITY-002 整合） |

#### AAG が AI に期待しないもの / 期待するもの

| AAG が AI に期待しないもの | AAG が AI に期待するもの |
|---|---|
| 既存構造を壊さない | 現状に意味があるか問う |
| 既存ドキュメントを維持する | 意味がなければ残さない |
| 既存ルールに従う | 意図が弱ければ補強する |
| 既存の置き場所を尊重する | 意図が古ければ更新する |
| （= 現状維持の inertia） | 構造がずれていれば再設計する |
| | 必要なら現状を変える |
| | その変更理由を未来へ継承する |

最低限の安全性として「既存を壊さない」は必要だが、それは AAG の本質ではない。AAG の本質は **意思のある変更を可能にし、それに意味と説明を要求する**こと。

### 下位機能との関係

| 下位機能 | 最上位原則との関係 |
|---|---|
| ADR-SCP-014（Guidance over restriction） | 最上位原則の Mechanical / Guidance 分離を articulate |
| ADR-SCP-016（Wave restructuring） | 最上位原則を Wave 構造に reflect |
| ADR-SCP-018（DESIGN = Ideal-first / Gap-driven） | 最上位原則の **operational approach**（実装方法論） |
| ADR-SCP-019（PARSE2 = Skeleton-aware Parse） | DESIGN の **Tree Contract concrete application** |
| 不可侵原則 1〜14 | 最上位原則の **operational invariant**（不変制約） |
| Tree Contract / Document Contract / Skeleton / Inventory | 最上位原則の **structural articulation surface**（構造的 articulate 面） |
| Guidance / Gate / Contract | 最上位原則の **enforcement surface**（実施面） |

## 不可侵原則

1. **YAML authoring / JSON machine truth** — YAML は人間/AI が編集する authoring source としてのみ許可する。Detector / CI / AAG CLI / architecture-health は **generated JSON のみ** を読む。YAML を AAG machine truth にしない（ADR-SCP-001）。reposteward 不可侵原則 1（JSON-first）は AAG Parameters / Task Capsule / SourceFacts / Premise Contract / DetectorResult / generated artifact の **narrow scope** として再定義し、本 program の YAML 用法は同 scope 外（authoring source 層）として共存する。**normalize は deterministic**: object key alphabetical sort + array order-preserving + indent 2 spaces + final newline + metadata block（`schemaVersion` / `sourceSha` / `sourcePaths` / `generatedAt`）必須（詳細: inquiry/07 §8）。
2. **Document Contract は doc-registry.json の拡張層** — 新 namespace の Document ID（DOC-DEF-*）を既存 `docs/contracts/doc-registry.json` と並立させない。kind / temporalScope / requiredSections / forbiddenContent / owner / audience / granularity / lifecycle は doc-registry entry に additive 拡張する形で articulate する（ADR-SCP-002）。既存 `references/04-tracking/recent-changes.generated.md` 系の generator の後方互換（未知 field 無視）は Phase 0 で確認する。
3. **製本は present-only** — `canonical-doc` kind の文書は **現在有効な実装・契約・定義・ルール** のみを書く。過去の実装経緯 / 退役済み設計 / 移行ログは `archive-doc` へ。将来計画 / roadmap / TODO / Phase plan / project progress は `project-plan` へ。現在値の一覧 / 件数 / status は `generated-report` へ。製本に過去/未来が必要な場合は **本文展開せず、Document ID / Project ID で参照** する（ADR-SCP-003）。
4. **Tree Contract MVP scope は top-level + structural roots のみ** — Phase 1 では `references/` / `aag/` / `aag-engine/` / `projects/` / `docs/contracts/` / `app/src/{domain,application,infrastructure,presentation,features}` / `app/src/test/guards/` / `tools/` / `wasm/` のみを Tree Contract 対象とする。それ以外は `unmanaged-but-tolerated` 状態で許容する。粒度爆発を抑止するため、Phase 1 内で個別ディレクトリへ拡大しない（ADR-SCP-004）。`unmanaged-but-tolerated` の意味: inventory に載るが contract 必須対象ではない / 既存 unmanaged 配下への新規子 directory 追加は OK / **新規 top-level directory 追加は finding**（new-only gate 対象）/ baseline は単調減少のみ（unmanaged → managed への promotion は user 判断、新規 unmanaged 化は finding）。詳細: inquiry/07 §7。
5. **OBLIGATION_MAP / PATH_TO_REQUIRED_READS migration は 3 段階 shadow** — Phase 8a で YAML → generated JSON を追加（既存 TS 定数も維持）、TS 定数と generated JSON の正規化比較器で差分を shadow check。Phase 8b で collector を generated JSON 読みに切替（TS 定数は deprecated shim）。Phase 8c で TS 定数を削除。一発切替は禁止（ADR-SCP-005）。
6. **AI Instruction Pack は post-write validation 限定** — AI 執筆の pre-write 強制は機構上不可能。Phase 6 の完了条件は「AI が参照できる Instruction Pack JSON が生成される」 + 「Markdown 作成後に Document Contract 適合性を機械検証できる」のみ。pre-write 強制を完了条件にしない（ADR-SCP-006）。
7. **Existing Documentation Reading Pass を機械分類で代替しない** — Phase 2.5 で各既存 Markdown の `proposedKind` / `temporalScope` / `disposition` は **人間/AI の reading** で確定する。機械は candidate と finding を出すのみ。`generated-report`（producer 宣言済）と `archive-doc`（archive-manifest 存在）は machine inferred で accepted 扱いとする例外条項を持つ（ADR-SCP-008）。Reading Pass 期間中、対象 zone 内の文書本体は編集しない（frontmatter docId 付与は同時付与可）。
8. **Additive-only / Wave 1 milestone 到達前は hard gate 追加しない** — 全 Phase の checker は **advisory** で開始。Hard Gate 昇格は user 判断による別 program 候補（reposteward `aag-engine-hard-gate-promotion` 候補と並走しない）。新規 mechanism は既存 TS guard / docs:generate / aag-engine に **additive** 追加され、置換しない。
9. **Schema-first / Finding-first / Shadow / Ratchet / Gate の段階順序を逆行させない** — **Wave 順序 + Wave 内 Phase 順序の二重順序**（ADR-SCP-016）:
   - **Phase 0**（ADR + Existing Asset Mapping、本 program 完遂判定対象）→ **Wave 1: Structural Inventory MVP**（Phase 1 → Phase 2 → Phase 3）→ **Wave 2: Contract Pilot**（Phase 2.5 → Phase 4 → Phase 5）→ **Wave 3: Governance Migration**（Phase 6 → Phase 7 → Phase 9）
   - **Separate Program candidate**（Phase 8a/8b/8c = Obligation Migration、Phase 10 = Runner Parity Contract）は本 program scope 外、**reposteward Premise Contract（Wave 5）との責務重複の可能性** + **runner parity = reposteward の責務** のため archive 時に移譲先を決定
   - Wave / Phase の順序を逆行させない（例: Wave 1 Phase 1 Schema 前に Wave 2 Phase 5 Document Contract Declaration を始めない、Wave 1 完了前に Wave 2 着手しない）
10. **versionImpact は計画段階で declare 済（app: +0.0.0 / aag: +0.1）** — 実 archive 時に paradigm shift が surface したら DA entry を articulate して delta を escalate する。本 program は backward-compatible な additive mechanism のみで minor 想定。
11. **Guidance over restriction（AI を縛らず導く）** — AAG SCP の思想・Document Kind・Instruction Pack は、AI の能力を制限するためではなく、**AI が文脈・役割・粒度・時間軸を正しく把握し、より良い判断を行うための定性的ガイダンス**である。機械的 foul は **構造違反**（未登録 / 欠落 / 混入 / 生成物手編集 / 時間軸違反 / producer 不明 等）に限定し、**設計判断・表現品質・文脈解釈は AI / human review** で扱う。Gate は AI を失敗させる仕組みではなく、**構造的にありえないものだけを検出する安全網**（ADR-SCP-014 + AAG-SCP-GUIDANCE-001〜004）。
   - 思想 (= 不可変) → AI の判断を定性的に導く
   - Contract (= 構造的前提) → AI と repo が共有する前提
   - Guidance (= 文脈提供) → AI が良い判断をするための文脈・観点・参照先
   - Gate (= 構造破綻検出) → 構造的に判定可能な違反のみを foul する安全網
   - 合言葉: **`Plan → Context → Contract → Guidance → Gate`**（旧 `Plan → Contract → Rule → Gate` を更新）
12. **Meaning / Intent / Will continuity（最上位原則の operational summary）** — AAG は良い設計を保証しない。AAG は、repo 内の構造・文書・ルール・生成物・例外・行為について、**それが何であり、なぜ存在し、どの意図に基づき、誰が維持する意思を持つのか**を未来の AI / 人間に継承可能な形で残す。**意味がないものは置かない。意味のないことはしない。説明できないものは置かない。説明できないことはしない。** ただし、**意図や意思は固定物ではない。変化してよい**。変化する場合は、**何を継承し、何を捨て、なぜ変えたのか**を記録する。詳細根拠: 最上位原則 section + ADR-SCP-017（AAG-SCP-MEANING-001〜005 + AAG-SCP-CONTINUITY-001〜005）。
13. **Ideal-first / Gap-driven implementation（最上位原則の operational invariant）** — AAG SCP は、**現状を棚卸しして正当化する仕組みではない**。先に理想骨格・文書型・時間軸・責務境界を **設計意図として明文化**し、現状をその設計意図に照らして観察する。**Gap は即違反ではなく、調査対象**である。調査結果に基づき、**現状を修正する / 理想を修正する / 例外化する / archive する / move する / promote する**、のいずれかを意思決定する。AAG SCP の目的は、repo を機械的に理想へ寄せることではなく、**設計の意図を意思を持って実装する**ことである（最上位原則 + 不可侵原則 12 + ADR-SCP-018 AAG-SCP-DESIGN-001〜005 の operational invariant articulation）。
    - **8 step 標準フロー**（ADR-SCP-018 D2）: Ideal 設計 → Parse → Gap 抽出 → 調査 → 5 分類（A 現状が間違い / B 理想が粗い / C 例外として正当 / D 一時的移行 / E 新概念として Ideal 側に昇格）→ 意思決定 → 再計画 → Contract / Guidance / Gate へ落とす
    - **Inventory / Parse は approval ではない**（AAG-SCP-MEANING-002 + AAG-SCP-PARSE2-002 整合）
    - **Gap entry に「即違反」articulation を含めない**（candidate / candidateDisposition / needs-triage で articulate）
    - **5 areas application**（Tree Contract / Document Contract / AI Instruction / Generated Artifacts / Obligation Migration）すべてに本作法を適用（ADR-SCP-018 D3）
    - **Gap 7 分類**（Phase 2 出力の suggestedDisposition）: `fix`（現状を直す）/ `revise-skeleton`（理想骨格を見直す）/ `promote`（骨格外だったが新意味ある構造として昇格）/ `move`（既存 root へ移動）/ `archive`（過去資産として保存）/ `tolerate`（理由付きで unmanaged-but-tolerated）/ `delete-candidate`（初期段階では慎重に扱う）
14. **AI Expectation: Intentional Change over Preservation（最上位原則の AI 役割 articulate）** — AAG は AI に **現在の実装維持**を求めない。AAG が AI に求めるのは、**意思のある変更**である。**現在の実装は維持対象ではなく、観測対象**である。AI はそれを読み、意味を問い、意図を理解し、必要に応じて **維持・修正・移動・archive・置換**を判断し、その理由を未来へ継承する。AAG は **変更を抑止する仕組みではなく、変更に意思と説明を要求する仕組み**である（AAG-SCP-AI-EXPECTATION-001〜004、最上位原則 AI 期待役割 + ADR-SCP-017 整合）。
    - **AAG-SCP-AI-EXPECTATION-001**: AAG が AI に期待するのは、現在の実装を無批判に維持することではない。意味・意図・意思を理解した上で、必要な変更を説明可能に行うこと
    - **AAG-SCP-AI-EXPECTATION-002**: AI は現状を preservation target として扱ってはならない。現状は observation target であり、review / revise / preserve / replace / archive / remove の判断対象
    - **AAG-SCP-AI-EXPECTATION-003**: AI による変更は、**継承する意図、捨てる前提、新たに置く意味**を明示しなければならない
    - **AAG-SCP-AI-EXPECTATION-004**: AAG は変更を止める仕組みではなく、**変更に意思を要求する仕組み**である
    - **AI 行動モデル 9-step**: 観察 → 意味問 → 意図探 → 意思確認 → 骨格照合 → 差分検出 → disposition 判断 → 理由 articulate → 必要なら設計再計画
15. **Context Guidance Pipeline（最上位原則の context supply mechanism）** — AAG は **AI に判断を強制する仕組みではなく**、AI が **文脈を辿り、意味・意図・意思の連続性を理解し、意思ある変更を行えるようにする context pipeline** である。AAG が repo 側に用意するのは、良い判断に必要な文脈を **適切なタイミングで、必要な深さまで辿れる導線**である。Context Pack は **命令書ではなく、AI の思考を促進するための文脈面**（AAG-SCP-CONTEXT-001〜005、Wave 2/3 で full pipeline 実装、Wave 1 は hooks のみ）。
    - **AAG-SCP-CONTEXT-001**: AAG は、AI に判断を強制するのではなく、**判断に必要な文脈を適切なタイミングで提供**する
    - **AAG-SCP-CONTEXT-002**: AI が意思ある変更を行うには、**過去の文脈・現在の意味・未来へ継承する意図**を辿れる必要がある
    - **AAG-SCP-CONTEXT-003**: AAG は、AI が必要に応じて文脈を **深く（deep）、または広く（wide）辿れる Context Pipeline** を提供する
    - **AAG-SCP-CONTEXT-004**: Context Pack は **命令書ではない**。AI の思考を促進するための文脈面
    - **AAG-SCP-CONTEXT-005**: Context Pipeline は、**設計の正しさを保証しない**。判断に必要な意味・意図・意思の連続性を提示する
    - **Context layers L0〜L6**: L0 Immediate（artifact 自身）/ L1 Structural（Skeleton root 所属）/ L2 Contract（doc kind / temporalScope / owner / lifecycle）/ L3 Historical（decision-audit / archive / previous project）/ L4 Future（active project / planned migration / open issue）/ L5 Neighbor（近接 artifact / 同 kind / 重複候補）/ L6 System（AAG 全体原則 / 不可侵原則 / guidance）
    - **Wave 配置**: Wave 1 = Parse2 entry に context hooks 追加（contextPackRequired / contextDepthHint / contextQuestions）/ Wave 2 = context-trigger.yaml + context-pack.generated.json + doc-kind 別 guidance / Wave 3 = `aag context pack <path>` / `aag context expand --deep` / `aag context expand --wide` CLI + finding → context pack 自動接続

## Wave 構造（Phase 0 完了 → Wave 1/2/3 + Separate Program candidate）

> **正式採用**: ADR-SCP-016（2026-05-08）で Wave restructuring 採用。Phase 0 deliverable はすべて landed（本 commit が Phase 0 完遂判定）。Phase 0〜10 は Wave 1/2/3 + Separate Program candidate に再構成された。
>
> **想定 PR 数集計**: Wave 1 = 8〜12 PR / Wave 2 = 8〜12 PR / Wave 3 = 4〜6 PR / Separate Program candidate = 5〜8 PR（移譲先で）。元計画 30〜45 PR から本 program 範囲は 20〜30 PR に縮小（25〜35% 縮小）。

### Phase 0: ADR + Existing Asset Mapping（COMPLETE — 本 commit で完遂判定）

> **完遂状態**: ADR-SCP-001〜016（16 ADR）+ inquiry/01〜08 + projects/active/aag-structural-control-plane/ 8 ファイル + aag/scp-checkers/README.md がすべて landed。本 commit (ADR-SCP-016 landing) で Phase 0 acceptance criteria 全 36 項目が満足され、checklist Phase 0 section の checkbox は本 commit で `[x]` flip される。AI 自己レビュー / 最終レビュー section は Wave 3 完了 + 本 program archive 時に flip（不変）。

> **目的**: 実装開始前に **既存資産との接続関係を確定** する。型・schema・detector を増やす前に、既存 5 資産（doc-registry / docs/contracts/aag schemas / OBLIGATION_MAP / 既存 YAML / self-check substrate）との関係を articulate する。

含むもの:

- `projects/active/aag-structural-control-plane/` 配下 8 ファイル一式 landing（AI_CONTEXT / HANDOFF / plan / checklist / decision-audit / discovery-log / projectization / config/project.json）
- `inquiry/` 6 ファイル（Phase 0 で確定すべき既存資産マッピング項目の skeleton）
- `references/04-tracking/open-issues.md` の active projects 索引追加
- `cd app && npm run docs:generate` で project-health に新 project が `derivedStatus = in_progress` で登録されることを確認
- `cd app && npm run test:guards` PASS 確認（projectizationPolicyGuard / checklistFormatGuard / projectCompletionConsistencyGuard 等）
- DA-α-000（進行モデル）+ ADR-SCP-001〜009 を decision-audit.md に articulate

ADR 一覧（詳細は `decision-audit.md` 参照）:

| ADR | 主題 |
|---|---|
| ADR-SCP-001 | YAML authoring source / generated JSON machine truth（reposteward JSON-first 原則との narrow scope 再定義） |
| ADR-SCP-002 | Document Contract は doc-registry.json の拡張層（並立 namespace 禁止、配置は `docs/contracts/src/` + `docs/contracts/schema/` + `docs/contracts/generated/`） |
| ADR-SCP-003 | 製本 = 現在 / archive = 過去 / project = 未来 / generated report = 計算済み現在（時間軸 4 分類） |
| ADR-SCP-004 | Tree Contract MVP scope は top-level + structural roots のみ（粒度爆発抑止、unmanaged-but-tolerated 第 3 状態） |
| ADR-SCP-005 | OBLIGATION_MAP / PATH_TO_REQUIRED_READS は 3 段階 shadow migration（Phase 8a/8b/8c） |
| ADR-SCP-006 | AI Instruction Pack は post-write validation 限定（pre-write 強制を完了条件にしない） |
| ADR-SCP-007 | Reading Pass 成果物の保存規約（src/ = human authored、generated/ = machine candidate、merged は join projection） |
| ADR-SCP-008 | Machine inferred で accepted 扱いとする kind の例外条項（generated-report with producer / archive-doc with archive-manifest） |
| ADR-SCP-009 | Reading entry の stale 検出と再レビュー基準（reviewedAtCommit / reviewedAtSha、対象ファイルが reviewed-sha 以降に変更されたら再レビュー必須） |

完了条件: 上記すべて PASS かつ user 承認による checklist.md 最終レビュー [x] flip。

## Wave 1: Structural Inventory MVP（8〜12 PR）

> **目的**: 価値検証 critical path として最小スコープで start。repo topology 把握 + Finding schema 妥当性確認 + §A2 boundary checker 実行経路確立 を Wave 1 内で完遂。Wave 2 着手判断のための valid finding または verified-zero finding（ADR-SCP-016 D3）を獲得する。
>
> **Wave 1 narrowing**: managed zone 4 件（top-level tree + projects/ + references/04-tracking/ + docs/contracts/）+ 最小 3 schema + top-level tree のみ Tree Contract 対象 + advisory のみ。

### Wave 1 / Phase 1: Schema MVP（縮小: 最小 3 schema、3〜4 PR）

> **目的**: Finding-first migration の受け皿を最初に作る。検出結果の型を先に定義し、すべての checker が同一 Finding JSON を返せる状態を作る。
>
> **Wave 1 narrowing（ADR-SCP-016 D1）**: 元計画 5 schema → **最小 3 schema**（aag-finding + tree-contracts + 最小 doc-kind-registry）。document-contracts.schema.json + temporal-scope-policy.schema.json は **Wave 2** へ後ろ倒し（Phase 4 / Phase 5 着手時に同 phase で landing）。

成果物（Wave 1 範囲）:

- `docs/contracts/schema/aag-finding.schema.json`（Finding の共通 schema = id / severity / subject / problem / expected / suggestedDisposition / **result**（valid-finding / verified-zero、ADR-SCP-016 D3 整合））
- `docs/contracts/schema/tree-contracts.schema.json`
- `docs/contracts/schema/doc-kind-registry.schema.json`（最小 schema、Phase 4 で本宣言）
- `docs/contracts/src/repo/tree-contracts.yaml`（authoring source 雛形のみ、宣言は Phase 3 で確定）
- `docs/contracts/src/docs/doc-kind-registry.yaml`（authoring source 雛形のみ、宣言は Wave 2 Phase 4 で確定）

Wave 2 で landing する schema（ここでは記載のみ、実装は Wave 2）:

- `docs/contracts/schema/document-contracts.schema.json`（Wave 2 Phase 5）
- `docs/contracts/schema/temporal-scope-policy.schema.json`（Wave 2 Phase 4）

完了条件: 3 schema が JSON Schema として valid + Finding ID prefix が `FND-` で grep 可能（Document ID `DOC-` と区別）+ Finding result field が `valid-finding` / `verified-zero` を articulate（ADR-SCP-016 D3）+ hard gate 追加なし。

### Wave 1 / Phase 2: Skeleton-aware Parse（再定義 = ADR-SCP-019 PARSE2、4 sub-PR = Phase 2A/B/C/D）

> **目的（再定義、ADR-SCP-019 PARSE2 整合）**: 現状を棚卸しして承認することではない。**先に定義した Structural Skeleton に照らして repo を観察**し、in-skeleton / out-of-skeleton / missing-expected / unexpected-child / inside-unmanaged-zone / observed-only を分類する。**Gap は即違反ではなく、Phase 3 以降の調査・再計画対象として扱う**（最上位原則 MEANING + CONTINUITY 整合、不可侵原則 12 整合）。
>
> **AAG-SCP-PARSE2-001〜005 articulate（ADR-SCP-019 D1）**:
> - Parse2 は現状承認ではない。Structural Skeleton に対する観測である
> - Inventory entry は **observed-only** であり、declared / contracted / approved を意味しない
> - 先に Structural Skeleton を定義し、その後 repo topology を parse する
> - 骨格外 artifact は即削除せず、out-of-skeleton candidate として精査対象
> - 骨格外 artifact を declared に昇格するには、purpose / owner / consumer / lifecycle / promotion rationale が必要
>
> **中心 articulate**:
> > **Inventory is not approval. Correct location is not proof of necessity.**
> > 棚卸しは承認ではない。正しい場所に存在することは、必要性の証明ではない。
>
> **sub-PR 構造（ADR-SCP-019 D2、独立 rollback 可能）**:

| sub-PR | 名称 | 内容 |
|---|---|---|
| **Phase 2A** | Structural Skeleton declaration | tree-contracts.yaml を 1 entry 雛形 → top-level 8 root の declared 状態に拡張（元 Phase 3 で実施予定だった skeleton 宣言を前倒し） |
| **Phase 2B** | repo topology parser | repo-topology.generated.json を **top-level-only + observed-only field** にリファクタ（既存 commit `1918202` 出力を上書き、再帰 zone は Phase 2D に移管） |
| **Phase 2C** | skeleton diff generator | skeleton-diff.generated.json（in-skeleton / out-of-skeleton / missing-expected / unexpected-child / inside-unmanaged-zone / observed-only 6 分類 + meaningStatus / intentStatus / willStatus / requiredQuestion field） |
| **Phase 2D** | managed-zone inventories | markdown / yaml / generated-artifact 3 inventory（scope = projects/ + references/04-tracking/ + docs/contracts/、observed-only / contractStatus=unreviewed / promotionAllowed=false 全 entry articulate） |

#### Parse2 entry に必須の articulate field（ADR-SCP-017 D6 + ADR-SCP-019 D5 整合）

すべての Parse2 entry に approval 誤認 field + 現状維持誤認 field を含めない:

```json
{
  "path": "...",
  "observed": true,
  "inventoryStatus": "observed-only",
  "skeletonStatus": "in-skeleton | out-of-skeleton | missing-expected | unexpected-child | inside-unmanaged-zone | observed-only",
  "meaningStatus": "explained | candidate | unexplained",
  "meaningEvidence": ["..."],                   // status 根拠の articulate（D8.2 整合、空 array は low-confidence）
  "intentStatus": "declared | inferred | unknown | missing",
  "intentEvidence": ["..."],                    // status 根拠の articulate
  "continuityStatus": "active | inherited | stale | unreviewed | absent",
  "continuityEvidence": ["..."],                // status 根拠の articulate
  "candidateKind": "...",        // candidate のみ
  "candidateDisposition": "...", // candidate のみ (Gap 7 分類)
  "reasonCode": "OUT_OF_SKELETON | MISSING_EXPECTED | NO_PURPOSE | NO_OWNER | NO_CONSUMER | NO_LIFECYCLE | NO_PRODUCER | NO_KIND | STALE_INTENT | INHERITED_WITHOUT_RATIONALE | CORRECT_LOCATION_BUT_UNEXPLAINED | FUNCTIONING_BUT_INTENT_UNKNOWN | PRESENT_BUT_NOT_NECESSARY | EXISTS_BUT_NO_CONSUMER | GENERATED_BUT_NO_PRODUCER | DOCUMENTED_BUT_NO_CURRENT_ROLE",
  "contextQuestion": "このartifactは過去のどの文脈から来ているか?",
  "futureQuestion": "このartifactは未来に何を継承するために残すのか?",
  "changeQuestion": "維持・修正・移動・archive・削除候補のどれが妥当か?",
  "requiredQuestion": "このartifactは何の意味を持ち、どのrootに属すべきか?",
  "preservationAssumed": false,                  // 一律 false（現状維持の自動仮定を排除、AI-EXPECTATION-002 整合）
  "preferenceBasedDecisionAllowed": false,       // 一律 false（好き嫌いで決めない、CONTINUITY-006 整合）
  "localConvenienceDecisionAllowed": false,      // 一律 false（その場の都合で決めない、CONTINUITY-006/007 整合）
  "contractStatus": "unreviewed",
  "promotionAllowed": false,                     // 一律 false（自動昇格を排除、AAG-SCP-MEANING-002 + AAG-SCP-PARSE2-005 整合）
  "contextPackRequired": true,                   // CONTEXT-001 整合（判断時に context pack を要求、Wave 1 では hook articulate のみ、Wave 2 で生成）
  "contextDepthHint": "L0-L3"                    // CONTEXT-003 整合（推奨 context layer 範囲、Wave 2 context pack generator の消費 hint）
}
```

**field articulate（categorized）**:

| カテゴリ | field | 役割 |
|---|---|---|
| **Status** | `meaningStatus` | このartifactが何か説明できるか（explained / candidate / unexplained） |
| | `intentStatus` | なぜ存在するのか説明できるか（declared / inferred / unknown / missing） |
| | `continuityStatus` | 意図や意思が未来へ継承可能か（active / inherited / stale / unreviewed / absent）— **CONTINUITY 整合の最重要 field** |
| **Reason** | `reasonCode` | 機械的支援タグ。特に `CORRECT_LOCATION_BUT_UNEXPLAINED` は「正しい場所に見えても意味や意図が説明できないものは承認しない」（MEANING-004） |
| **Question**（Guidance 入力） | `contextQuestion` | 過去の文脈を問う（CONTINUITY-006） |
| | `futureQuestion` | 未来への継承意図を問う（CONTINUITY-007） |
| | `changeQuestion` | disposition 判断を促す（AI-EXPECTATION-002） |
| | `requiredQuestion` | 意味と所属を問う（MEANING-001） |
| **Constraint flags**（一律 false） | `preservationAssumed` | 現状維持の自動仮定を排除（AI-EXPECTATION-002） |
| | `preferenceBasedDecisionAllowed` | 好き嫌いでの判断を排除（CONTINUITY-006） |
| | `localConvenienceDecisionAllowed` | その場の都合での判断を排除（CONTINUITY-006/007） |
| | `promotionAllowed` | 自動昇格を排除（MEANING-002 + PARSE2-005） |

#### Operational decision criteria（抜け殻化防止、ADR-SCP-019 D8 整合）

最上位原則の Meaning / Intent / Continuity articulate を **AI が判定・質問・深掘りできる operational form** に落とすため、status enum に判定基準 + Evidence + Question templates + 昇格禁止条件を articulate（status 単独だと抜け殻ラベル化するため）:

##### status 判定基準（enum 値の operational definition）

**meaningStatus**: `explained` (1 文で説明 + root/kind/role 説明可能) / `candidate` (推定可能だが正本未articulate) / `unexplained` (説明不能)

**intentStatus**: `declared` (purpose/rationale/owner/consumer 明示) / `inferred` (周辺 context 推定可能、明示なし) / `unknown` (推定根拠薄) / `missing` (説明不能)

**continuityStatus**: `active` (現在維持意思 articulate) / `inherited` (過去継承だが維持意思未確認) / `stale` (過去の名残可能性高) / `unreviewed` (Reading Pass 未) / `absent` (継承意図見当たらず)

##### status 別 contextQuestion テンプレート（status / skeletonStatus / candidateKind 組み合わせ別）

固定 question では弱いため、状況別 question テンプレート articulate（Wave 1 articulation のみ、Wave 2 で context-trigger.yaml に institute）。例:

- `out-of-skeleton`: 既存 root へ移動 / 新 root 昇格 / 一時物・過去資産・外部 tool 由来 を問う
- `candidateKind: canonical-doc`: 現在正本か / 過去経緯混入か / 未来計画混入か / 維持意思を問う
- `candidateKind: generated-report`: producer 何か / 手編集なしか / 現在も必要 projection か を問う
- 詳細は ADR-SCP-019 D8.3 articulate

##### reasonCode 拡張（12 codes）

特に重要な 2 codes（誤認構造的検出）:

- `CORRECT_LOCATION_BUT_UNEXPLAINED`: 正しい場所にあるから OK 誤認の検出（MEANING-004 整合）
- `FUNCTIONING_BUT_INTENT_UNKNOWN`: 動いているから OK 誤認の検出（MEANING-004 整合）

その他: `NO_PURPOSE` / `NO_OWNER` / `NO_CONSUMER` / `NO_LIFECYCLE` / `NO_PRODUCER` / `NO_KIND` / `STALE_INTENT` / `INHERITED_WITHOUT_RATIONALE` / `PRESENT_BUT_NOT_NECESSARY` / `EXISTS_BUT_NO_CONSUMER` / `GENERATED_BUT_NO_PRODUCER` / `DOCUMENTED_BUT_NO_CURRENT_ROLE`

##### 昇格禁止条件（Wave 2 / Phase 5 declared 昇格判断 gate）

| 状態 | 昇格禁止 |
|---|---|
| `meaningStatus == unexplained` | declared / contracted / generated / archived 全て不可 |
| `intentStatus == missing` | いかなる promotion 不可 |
| `continuityStatus == absent` | preservation 不可、archive 候補へ |
| `meaningEvidence == [] && intentEvidence == []` | Wave 1→Wave 2 昇格判断保留 |
| `reasonCode includes CORRECT_LOCATION_BUT_UNEXPLAINED` | Reading Pass 必須 |
| `reasonCode includes FUNCTIONING_BUT_INTENT_UNKNOWN` | intent 調査必須 |

Wave 1 では **articulation のみ**（advisory）、Wave 2 / Phase 5 で gate として活性化。

#### Phase 2 でやらないこと（明示的禁止、ADR-SCP-019 D7）

| 禁止項目 | 理由 |
|---|---|
| Document Contract を確定 | Wave 2 / Phase 5 の責務 |
| 文書を移動 / archive / delete | Wave 2 / Phase 5 の責務 |
| hard gate を追加 | 不可侵原則 8 整合 |
| generated JSON を machine truth として consumer に読ませる | Phase 3+ で advisory checker が消費 |
| observed を approved に昇格 | AAG-SCP-PARSE2-002 違反 + AAG-SCP-MEANING-002 違反 |
| out-of-skeleton を即違反として fail | AAG-SCP-PARSE2-004 違反、advisory より前段の観測のみ |

#### `1918202` リファクタ方針（ADR-SCP-019 D6）

既存 commit `1918202` (= 旧 Phase 2 sub-PR 1、4 zone 横断観測 JSON) は Phase 2B 着手時に refactor:

- scope を `managed-zone-4` → `top-level-only` に narrow
- entry に `observed: true` / `inventoryStatus: "observed-only"` field 追加
- 再帰 zone (projects/ + references/04-tracking/ + docs/contracts/) を削除
- 出力 JSON を上書き
- 削除した再帰 zone の処理は Phase 2D で **file-level inventory** として再実装（topology ではなく markdown / yaml / generated-artifact）

`1918202` 自体は revert / amend しない（履歴保持、評価の進化を articulate）。

#### Phase 2 完了条件（ADR-SCP-019 整合）

- Structural Skeleton top-level 8 件が tree-contracts.yaml に declared（Phase 2A）
- repo-topology.generated.json が top-level-only + observed-only で生成（Phase 2B）
- skeleton-diff.generated.json が 6 分類で生成（Phase 2C）
- managed zone 3 件（projects/ + references/04-tracking/ + docs/contracts/）の Markdown / YAML / generated artifact 候補が observed-only として出力（Phase 2D）
- すべての inventory entry に approval 誤認 field が含まれない
- out-of-skeleton が fail ではなく needs-triage candidate として出力
- promotionAllowed は原則 false
- hard gate / new-only gate 追加なし
- Wave 1 / Phase 3 着手 user 承認

### Wave 1 / Phase 3: Tree Contract Shadow checker advisory（役割変更、ADR-SCP-019 D3）

> **目的（役割変更、ADR-SCP-019 D3）**: Phase 2A で skeleton 宣言済 + Phase 2C で skeleton-diff 生成済を前提に、**Tree Contract Shadow checker を advisory で稼働させる**。skeleton 宣言は Phase 2A に前倒し済のため、本 Phase は **checker / finding 化に集中**。
>
> **旧計画からの変更**: 元計画では Tree Contract 宣言 + advisory checker の両方を Phase 3 で実施。Wave restructuring (ADR-SCP-016) + Parse2 re-articulation (ADR-SCP-019) で skeleton 宣言を Phase 2A に前倒し、Phase 3 は advisory checker / finding emit に focus。

入力（Phase 2A / 2C で生成済の前提）:

- `docs/contracts/src/repo/tree-contracts.yaml`（top-level 8 件 declared、Phase 2A 確定）
- `docs/contracts/generated/repo-topology.generated.json`（Phase 2B 生成）
- `docs/contracts/generated/skeleton-diff.generated.json`（Phase 2C 生成、6 分類）

成果物:

- `docs/contracts/generated/tree-contracts.generated.json`（authoring source の normalize、Phase 2A 確定 → 本 Phase で generate）
- `docs/contracts/generated/tree-contract-findings.generated.json`（Phase 2C skeleton-diff を入力に、aag-finding.schema.json conform Finding を emit）
- `tools/governance/check-tree.ts`（advisory checker、aag scp check tree-contract）

完了条件:

- skeleton-diff.generated.json の 6 分類 entry を入力に、aag-finding.schema.json conform Finding を emit（valid-finding または verified-zero finding、ADR-SCP-016 D3 整合）
- `unmanaged-but-tolerated` 状態を Finding として表現できる
- new-only gate 設計が articulate されている（実装は別 program、Wave 1 不可侵原則 8 整合 + advisory のみ）

### Wave 1 exit criteria（数値化、ADR-SCP-016 D3 整合）

Wave 1 完了条件:

- managed zone == 4（top-level tree + projects/ + references/04-tracking/ + docs/contracts/）
- 追加 schema ≤ 3（aag-finding + tree-contracts + 最小 doc-kind-registry）
- 新 §A1 checker ≤ 3（check-yaml-machine-truth + check-tree + docs:check 拡張）+ 既存 mechanism 1（PZ-13 / C1）
- §A2 checker = 4（変更なし、boundary protection 維持）
- 誤検知レビューで未解決 == 0
- new-only gate 未導入（advisory のみ）
- **valid finding または verified-zero finding を出せる**（ADR-SCP-016 D3）:
  - A. 新しい structural drift を発見した（valid finding）
  - B. 対象範囲（managed zone 4 件）に structural drift がないことを **AAG 形式の Finding/Report で証明** した（verified-zero finding）
- 運用コスト articulate 済（AI session の探索 cost + user review cost）

### Wave 1 中止条件（inquiry/08 §6 整合）

以下のいずれかが Wave 1 で発生したら、本 program を **paused 状態** にして再評価:

1. **誤検知率が高い**: shadow check の false-positive rate > 30%、運用 cost 過大
2. **Reading Pass の人手負荷過大**: Wave 2 へ進む前に hot zone Reading Pass の cost が articulate 不能
3. **既存 program と責務衝突**: reposteward Premise Contract / Task Capsule と本 program Document Contract の境界が articulate 不能
4. **valid finding + verified-zero finding ともに不能**: 既存 governance（architecture-health / projectizationPolicyGuard / docRegistryGuard 等）で完全 carry されており、本 program の追加価値が articulate 不能
5. **他 active program の進行に影響**: 本 program review / merge / ratchet-down が他 program の archive を遅延

## Wave 2: Contract Pilot（8〜12 PR）

> **目的**: Wave 1 で articulate された managed zone 4 件 + Tree Contract baseline を入力に、Document Kind / Temporal Scope / Document Contract を hot zone 限定で pilot する。Wave 1 exit criteria 全件 PASS 後に着手判断。
>
> **Wave 2 narrowing**: Reading Pass + Document Contract Declaration を hot zone 4 件限定（references/04-tracking/, projects/active/, CLAUDE.md, docs/contracts/）。Phase 5 想定 PR 数を元計画 15〜25 から **5〜8 PR** に縮小。

### Wave 2 / Phase 2.5: Existing Documentation Reading Pass（縮小: hot zone 4 件限定、3〜5 PR）

> **目的**: 既存 Markdown を一度読み、各文書の意味・役割・時間軸・正本性を確定する。機械分類だけで contract 化しない（不可侵原則 7）。
>
> **AAG-SCP-MIGRATION-001〜006** をここで適用する（詳細は `decision-audit.md` の ADR-SCP-007〜009）。
>
> **Wave 2 narrowing（ADR-SCP-016 D1）**: 元計画「全 12 zone」→ **hot zone 4 件限定**:
> 1. `references/04-tracking/`（generated/ 配下は ADR-SCP-008 例外条項で machine inferred）
> 2. `projects/active/`（各 project の AI_CONTEXT / HANDOFF / plan / checklist は project-plan / project-checklist kind で固定）
> 3. `CLAUDE.md`（orchestration 層の確認）
> 4. `docs/contracts/`（schema は ADR-SCP-008 例外条項で machine inferred）
>
> 残 8 zone（`references/01-foundation/` / `references/03-implementation/` / `references/02-design-system/` / `references/05-aag-interface/` / `references/99-archive/` / `aag/` / `aag/_internal/` / `references/README.md` + `aag/README.md` + `projects/` root の README.md）は **Wave 3 以降または別 program 候補**。Wave 2 完了時の Reading Pass 価値検証を踏まえて user 判断。

成果物（hot zone 4 件 scope）:

- `docs/contracts/src/docs/document-reading-decisions.yaml`（**human/AI authored**、hot zone 4 件の各 docId に対する `proposedKind` / `temporalScope` / `disposition` / `reviewedBy` / `reviewedAtCommit` / `reviewedAtSha` / `rationaleSummary` / `alternativesConsidered`）
- `docs/contracts/generated/document-reading-candidates.generated.json`（**machine inferred**、heuristic candidate の集合）
- `docs/contracts/generated/document-reading-merged.generated.json`（src/ + generated/ の join projection、final disposition view）

disposition 4 分類:

- `keep-and-contract`: 現在の場所・内容で妥当。Document Contract だけ付与する
- `split`: 1 文書に複数責務（present + past + future）が混在 → Phase 5 で分割
- `move`: 内容は有効だが置き場所が違う → Phase 5 で move
- `archive`: 現行の正本ではない → Phase 5 で `references/99-archive/` または `projects/completed/` へ

完了条件（state-based）:

- `reading-coverage` ratio == 100% per **hot zone 4 件**（reading-decisions.yaml entry 数 / inventory entry 数）
- `false-positive` disposition rate < N%（shadow detection との突合）
- `needs-triage` 残数 == 0
- 各 disposition の根拠が `rationaleSummary` で 1〜2 文 articulate されている
- すべての decision に `reviewedBy` / `reviewedAtCommit` / `reviewedAtSha` 必須

### Wave 2 / Phase 4: Document Kind + Temporal Scope Shadow（2〜3 PR）

> **目的**: Document Kind Registry + Temporal Scope Policy を確定し、shadow checker で誤検知を回収する。

成果物:

- `docs/contracts/src/docs/doc-kind-registry.yaml`（宣言確定）
- `docs/contracts/src/docs/temporal-scope-policy.yaml`（宣言確定）
- `docs/contracts/generated/doc-kind-registry.generated.json`
- `docs/contracts/generated/temporal-scope-policy.generated.json`
- `docs/contracts/generated/temporal-scope-findings.generated.json`
- `tools/governance/check-doc-temporal-scope.ts`（advisory checker）

検出対象（不可侵原則 3 に従う）:

- canonical-doc に `History` / `Roadmap` / `Future` / `TODO` / `Phase` / `Migration Log` heading がある
- canonical-doc に checkbox がある
- canonical-doc に generated count / current status を手書きしている
- canonical-doc に project progress がある
- canonical-doc に旧実装の詳細説明（移行 history）がある

許可される参照（本文展開禁止 + Document ID / Project ID リンク許可）:

- 「詳細な移行履歴は DOC-ARCHIVE-XXX を参照」
- 「今後の再編計画は PROJECT-YYY を参照」

完了条件: 製本/archive/project/generated の分類候補が出る + 過去/未来混入 finding が一覧化される + 誤検知レビュー期間（state-based exit）を Phase 2.5 と並列で開始 + advisory のみ。

### Wave 2 / Phase 5: Document Contract Declaration + Rewrite/Move/Archive PRs（縮小: hot zone 限定、5〜8 PR）

> **目的**: Phase 2.5 Reading Pass で確定した disposition に基づき、(a) Document Contract を doc-registry に拡張宣言、(b) split / move / archive を実行する。
>
> **1 Finding group = 1 PR** を厳守。一括置換禁止（AAG-SCP-MIGRATION-005）。
>
> **Wave 2 narrowing（ADR-SCP-016 D1）**: 元計画「全文書一斉適用、15〜25 PR」→ **hot zone 4 件限定で 5〜8 PR に縮小**。zone × disposition partition は維持。残 zone は Wave 3 以降または別 program で扱う。

含むもの:

- `docs/contracts/src/docs/document-contracts.yaml`（宣言確定、hot zone 4 件の Reading Pass `keep-and-contract` 対象から順次）
- `docs/contracts/generated/document-contracts.generated.json`
- doc-registry.json への kind / temporalScope / requiredSections / forbiddenContent additive 拡張
- `tools/governance/check-doc-contracts.ts`（advisory checker）

**PR 分割単位 = zone × disposition**（ADR-SCP-012、AAG-SCP-MIGRATION-005）。具体例（hot zone 4 件）:

| PR タイトル | zone | disposition | 想定 PR 数 |
|---|---|---|---|
| `phase5(zone-04-tracking): generated-register` | references/04-tracking | generated-register | 1（一括） |
| `phase5(zone-04-tracking): keep-and-contract` | references/04-tracking | keep-and-contract | 1 |
| `phase5(zone-projects-active): keep-and-contract` | projects/active | keep-and-contract | 1 |
| `phase5(zone-projects-active): split-or-move` | projects/active | split / move | 1〜2 |
| `phase5(zone-claude-md): keep-and-contract` | CLAUDE.md | keep-and-contract | 1 |
| `phase5(zone-docs-contracts): keep-and-contract` | docs/contracts | keep-and-contract | 1 |
| `phase5(zone-docs-contracts): generated-register` | docs/contracts | generated-register | 1 |

想定 PR 数（hot zone scope）: **5〜8 PR**（4 zone × 関連 disposition、entry 数次第）。残 zone は Wave 3 以降または別 program で扱う。

完了条件（ratchet-down、hot zone 4 件 scope）:

- `document.unregistered.count` （hot zone 内）単調減少 → 0
- `canonical.temporalViolation.count` （hot zone 内）単調減少 → 0
- `disposition.unresolved.count` （hot zone 内）== 0
- 各 PR が Finding group 単位で独立 rollback 可能
- new-only gate 化（advisory → new violation のみ foul、hot zone 内）

## Wave 3: Governance Migration（4〜6 PR）

> **目的**: Wave 1 / Wave 2 で articulate された Tree Contract / Document Contract / Reading Pass を入力に、AI Instruction Pack + Required Docs Matrix + Artifact Coverage Gate を landing する。Wave 2 exit criteria PASS 後に着手判断。

### Wave 3 / Phase 6: AI Instruction Pack（2〜3 PR）

> **目的**: Document Kind ごとの AI 向け JSON guidance を生成する。**post-write validation 限定**（不可侵原則 6）+ **guidance であって命令書ではない**（不可侵原則 11、AAG-SCP-GUIDANCE-003）。
>
> Instruction Pack は AI の出力を機械的に拘束しない。文書 kind ごとに **目的・読者・必須観点・禁止混入・粒度・参照先** を明示し、AI が文脈を取り違えずに能力を発揮するための補助である。

成果物:

- `docs/contracts/src/docs/ai-doc-template-rules.yaml`
- `docs/contracts/generated/ai-doc-instructions.generated.json`
- `aag docs instruction <doc-id>` command（reposteward `aag-engine` に additive 追加、または `tools/governance/` に landing）
- `tools/governance/check-doc-postwrite.ts`（Markdown 作成後に Document Contract **構造的適合性**を機械検証）

完了条件（不可侵原則 11 整合）:

- AI が参照できる文脈パック（Instruction Pack JSON）が生成される
- AI が文書の目的・読者・時間軸・粒度を理解できる
- 作成後に **構造的欠落・混入** が検証できる（requiredSections 欠落 / forbiddenContent 混入 / kind / temporalScope mismatch）
- pre-write 強制機構は実装しない（AI session の自由度を確保）
- 「設計の良し悪し」「表現品質」「比喩の適切さ」は post-write validation の scope 外（AI / human review の責務）

### Wave 3 / Phase 7: Required Docs Matrix（2 PR）

> **目的**: repo 構造から必要 doc を導出。

成果物:

- `docs/contracts/src/docs/required-docs-matrix.yaml`
- `docs/contracts/generated/required-docs-matrix.generated.json`
- `tools/governance/check-required-docs.ts`（advisory checker）

検査対象:

- feature-slice (`app/src/features/*`) requires feature-contract
- wasm-module (`wasm/*`) requires calculation-contract + parity-policy
- active project (`projects/active/*`) requires plan / checklist / handoff / projectization / config/project.json（既存 projectDocStructureGuard と整合）
- source-layer requires layer contract

完了条件: missing required doc finding が一覧化される + 初期は advisory + new-only gate のみ foul。

### Wave 3 / Phase 9: Artifact Coverage Gate（2 PR）

> **目的**: 未管理 artifact をすべて declared / generated / archived / external / temporary-with-expiry / ignored-with-reason のいずれかに分類する。

成果物:

- `docs/contracts/src/governance/artifact-coverage.yaml`
- `docs/contracts/src/governance/generated-artifacts.yaml`
- `docs/contracts/generated/artifact-coverage.generated.json`
- `docs/contracts/generated/generated-artifacts.generated.json`
- `docs/contracts/generated/unmanaged-artifacts.generated.json`
- `tools/governance/check-coverage.ts`（advisory checker）

完了条件:

- generated artifact producer 不明を検出
- ignored / temporary には owner / reason / reviewAfter / expiresAt 必須
- 初期は inventory、次に new-only gate

## Separate Program candidate（5〜8 PR、移譲先で）

> **scope 外**: 以下 Phase は **本 program scope 外**。reposteward Premise Contract（Wave 5）との責務重複の可能性 + reposteward の責務（runner parity）のため、本 program archive 時に移譲先を決定する（ADR-SCP-016 D1）。
>
> **移譲先候補**:
> - **Phase 8a/8b/8c → reposteward Premise Contract 拡張**（path → required reads の universal contract が確立されれば、本 program で重複実装する意味は薄い。reposteward archive 後に再評価）
> - **Phase 10 → reposteward `aag-engine-runner-parity-extension`**（reposteward の self-check / chaos run の延長として実装）
>
> **代替案**: 本 program では「既存 OBLIGATION_MAP の値が drift していないか」の advisory check のみ実施し、migration は reposteward 系統に委ねる（inquiry/08 §2 整合）。
>
> **本 ADR 採用後は本 program では着手しない**。記載は移譲先 program articulate のための参照用。

### Separate Program candidate / Phase 8a/8b/8c: Obligation / Required Reads 3 段階 Shadow Migration

> **scope 外マーク**: 本 program では着手しない。reposteward Premise Contract (Wave 5) との責務重複の可能性、別 program で再評価（ADR-SCP-016 D1）。
>
> **目的**（移譲先 program で articulate 参照用）: 既存 `OBLIGATION_MAP` / `PATH_TO_REQUIRED_READS`（`tools/architecture-health/src/collectors/obligation-collector.ts`）を YAML authoring source へ慎重に移行（不可侵原則 5）。

#### Phase 8a（2 PR）: YAML 追加 + 正規化比較器

- `docs/contracts/src/governance/obligations.yaml`
- `docs/contracts/src/governance/required-reads.yaml`
- `docs/contracts/generated/obligations.generated.json`
- `docs/contracts/generated/required-reads.generated.json`
- 正規化比較器（オブジェクトキー順序 / 評価順を意味的に等価判定する diff checker）
- collector はまだ既存 TS 定数を読む

完了条件: TS 定数と generated JSON の意味的差分 == 0（正規化比較器で確認）+ shadow check で drift がないこと。

#### Phase 8b（1 PR）: collector 切替

- `obligation-collector.ts` を generated JSON 読みに切替
- TS 定数は **deprecated shim** として短期間残置（呼び出し側がまだ参照可能）
- new-only gate: 新規 obligation 追加は YAML のみ許可

完了条件: collector が generated JSON を入力に動作 + architecture-health pipeline が PASS 維持 + TS 定数は shim 状態。

#### Phase 8c（1 PR）: TS 定数削除

- `OBLIGATION_MAP` / `PATH_TO_REQUIRED_READS` の TS 定数を削除
- 呼び出し側が 0 件であることを grep で確認
- generated JSON が唯一 machine contract

完了条件: TS 定数削除 + 全テスト PASS + architecture-health pipeline 不変。

### Separate Program candidate / Phase 10: Runner Parity Contract（1〜2 PR）

> **scope 外マーク**: 本 program では着手しない。runner parity = reposteward の責務（self-check / chaos run の延長）、別 program で再評価（ADR-SCP-016 D1）。
>
> **目的**（移譲先 program で articulate 参照用）: pre-push / CI / npm scripts / aag-engine advisory checks の必須 step drift を検出する。

成果物:

- `docs/contracts/src/governance/runner-parity.yaml`
- `docs/contracts/generated/runner-parity.generated.json`
- `tools/governance/check-runner-parity.ts`（advisory checker）

対象:

- pre-push hook (`tools/git-hooks/pre-push`)
- CI workflow (`.github/workflows/`)
- package.json scripts
- aag-engine CI（reposteward 由来）
- 既存の `docs:check` / `test:guards` / `aag self-check` / `aag chaos run`

完了条件: pre-push / CI / npm scripts / aag-engine の必須 step drift を検出 + advisory から開始 + Core gate 成熟後に hard gate 化（user 判断、別 program 候補）。

## やってはいけないこと

> **CLAUDE.md G8 整合**: 「気をつける」（exhortation）ではなく **mechanism として運用** する。
> 仕組み化可能なものは **CI level で foul させる検出装置**を articulate し、仕組み化できないものは AI / human review の責務として明示する（不可侵原則 11 + ADR-SCP-014 + AAG-SCP-GUIDANCE-005）。

### A. CI level で foul させる仕組みあり（mechanism articulated、§A1 + §A2 に細分）

§A はさらに 2 分類（GUIDANCE-007）:

- **§A1: AAG Core 永続 checker** — 全 repo / 全 program に普遍適用、`tools/governance/` 配下、本 program archive 後も残置。parse-heavy も含む（schema validation / drift detection / phase ordering 等）
- **§A2: project-scoped boundary protection** — 本 program が約束する **「触ってはいけない / 変更してはいけない / 崩してはいけない」boundary protection に限定**（GUIDANCE-007）。**parse-free spirit**（`git` + `grep` + well-known config の field 抽出 only、Markdown semantic 解析 / TS AST 解析は禁止）、**phase 不変**（本 program 全期間を通じて一貫禁止）、`projects/active/aag-structural-control-plane/aag/scp-checkers/` 配下、archive で消失、AI が `aag scp check --project aag-structural-control-plane <checker>` で呼び出し可能。**実装方式 = declarative YAML + common runner**（ADR-SCP-015 D1）

#### §A1: AAG Core 永続 checker（`tools/governance/`、archive 後も残置）

> **Wave 配置**（ADR-SCP-016 D2）: §A1 11 件 → Wave 1 = 3 件 + Wave 2 = 3 件 + Wave 3 = 1 件 + 別 program 候補 = 3 件 + 既存 mechanism = 1 件。Wave 1 で landing する checker は 3 件に narrowing（Wave 1 exit criteria「新 §A1 checker ≤ 3」整合）。

| やってはいけないこと | 違反根拠 | 検出装置 | Wave / landing phase |
|---|---|---|---|
| **YAML を AAG machine truth として採用する** | 不可侵原則 1 / ADR-SCP-001 | `tools/governance/check-yaml-machine-truth.ts`（detector / CI / AAG CLI が `*.yaml` を直読する import を grep 検出） | **Wave 1** / Phase 1 |
| **Tree Contract MVP scope を超えて全ディレクトリを宣言する** | 不可侵原則 4 / ADR-SCP-004 | `tools/governance/check-tree.ts`（tree-contracts.yaml の declared directory 数が baseline + N を超えれば finding、ratchet-down） | **Wave 1** / Phase 3 |
| **YAML 変更後の generated JSON 未更新** | 不可侵原則 1 補強 | 既存 `docs:check` mechanism（pre-push hook で live recalc + semantic diff）に YAML→JSON normalize 検証を追加 | **Wave 1** / Phase 1 |
| **Document Contract を doc-registry.json と並立させる** | 不可侵原則 2 / ADR-SCP-002 | `tools/governance/check-doc-contracts.ts`（新 namespace `DOC-DEF-*` 等の prefix を doc-registry 外で検出すれば finding） | **Wave 2** / Phase 5 |
| **製本に過去/未来を本文展開する** | 不可侵原則 3 / ADR-SCP-003 | `tools/governance/check-doc-temporal-scope.ts`（canonical-doc kind の文書に History / Roadmap / Future / TODO / Phase / Migration Log heading + checkbox + 禁止表現 patterns 検出） | **Wave 2** / Phase 4 |
| **Reading Pass を機械分類で代替する** | 不可侵原則 7 / ADR-SCP-007 / ADR-SCP-008 / ADR-SCP-010 | `tools/governance/check-reading-pass-schema.ts`（document-reading-decisions.yaml の各 entry に reviewedBy / reviewedAtCommit / reviewedAtSha が必須、`generated-report` / `archive-doc` 例外条項該当外で machine-inferred 表記があれば finding）— **universal な reading-pass.schema.json validation** | **Wave 2** / Phase 2.5 |
| **AI Instruction Pack を pre-write 強制機構として実装する** | 不可侵原則 6 / ADR-SCP-006 / AAG-SCP-GUIDANCE-003 | `tools/governance/check-no-prewrite-hook.ts`（git pre-commit / pre-push hook に Markdown 編集前 instruction-pack 取得強制があれば finding） | **Wave 3** / Phase 6 |
| **OBLIGATION_MAP / PATH_TO_REQUIRED_READS を一発切替する** | 不可侵原則 5 / ADR-SCP-005 | `tools/governance/check-obligation-drift.ts`（Phase 8a で正規化比較器、TS 定数と generated JSON の意味的差分機械検証 + commit history で Phase 8a→8b→8c 段階順序検証）— **universal な migration safety pattern** | **別 program 候補** / Phase 8a/8b/8c |
| **Phase 順序を逆行させる** | 不可侵原則 9 | `tools/governance/check-phase-ordering.ts`（commit history で Phase N+1 の成果物が Phase N より前に landing していれば finding、各 phase の sentinel artifact 存在確認）— **多 phase project の universal pattern** | **別 program 候補** / Phase 1 |
| **既存 references/99-archive/ への大量 docs 移動を 1 PR で実行する** | AAG-SCP-MIGRATION-005 | `tools/governance/check-finding-group-pr.ts`（PR 内で異なる zone × disposition の Finding group が混在すれば finding、PR description の `Finding group:` annotation 必須）— **universal な migration PR convention** | **別 program 候補** / Phase 5 |
| **実装 AI による自己承認** | L3 + requiresHumanApproval=true | 既存 `projectizationPolicyGuard` PZ-13（最終レビュー section 存在 + ordering 検証）+ `projectCompletionConsistencyGuard` C1（completed 判定後の archive obligation） | **既存 mechanism 利用** |

#### §A2: project-scoped boundary protection（`projects/active/aag-structural-control-plane/aag/scp-checkers/`、archive で消失、4 件のみ）

> **boundary protection の image**: 触ってはいけない / 変更してはいけない / 崩してはいけない（GUIDANCE-007）。本 program の全期間（Phase 0〜10）を通じて一貫して禁止される事項に限定。**parse-free spirit**（`git` + `grep` + well-known config の field 抽出 only、Markdown semantic 解析 / TS AST 解析は禁止）。**実装は declarative YAML + common runner**（ADR-SCP-015 D1: `tools/governance/run-scp-checker.ts` が共通 runner、各 checker は `aag/scp-checkers/<id>.yaml`）。

各 checker は AI が `aag scp check --project aag-structural-control-plane <checker>` で呼び出し可能。Archive v2 §6.4 で project の `aag/` folder ごと物理削除されるため、archive 後は invocation 不能（restore 経由でのみ復活）。

| boundary protection | 違反根拠 | 検出装置（parse-free、`git` + `grep` only） | image |
|---|---|---|---|
| **app/src/ 配下を touch する** | projectization.md §4 nonGoal | `aag scp check app-untouched`（`git diff --name-only ${BASE_REF}..HEAD` で `^app/src/` patterns 検出。業務 logic / domain calculations / readModels への変更も同 checker で carry。baseRef は ADR-SCP-015 D2 の 4 段階解決） | 触ってはいけない（既存実装層） |
| **`docs/contracts/aag/*.schema.json` を再配置する** | ADR-SCP-002 / projectization.md §4 nonGoal | `aag scp check docs-contracts-aag-untouched`（`git diff --name-status -M ${BASE_REF}..HEAD` で `^docs/contracts/aag/` の move / delete / modify 検出） | 触ってはいけない（既存 reposteward AAG contract schemas） |
| **新 doc を references/ に新規追加する** | 本 program scope 外 | `aag scp check no-new-references-doc`（`git diff --name-status -M ${BASE_REF}..HEAD` で `^references/.*\.md$` の Addition 検出。rename `R<N>` は除外。5 例外: Reading Pass disposition target / generated-report / archive-target / readme-index-update / this-program-deliverable は許可。詳細 ADR-SCP-015 D4） | 触ってはいけない（既存 references/ への追加） |
| **Wave 1 milestone 到達前に Hard Gate を追加する** | 不可侵原則 8 | `aag scp check hard-gate-surface`（baseline file `aag/scp-checkers/hard-gate-surface.baseline.json` と現在の workflow / pre-push / package.json から収集した `hardGate.{workflowJobs, requiredChecks, prePushExitOneSteps, npmScriptGates}` を **意味的 set diff**、増加方向のみ finding。baseline schema = `{checker, baselineCommit, baselineAt, surfaces, knownHardGateSurfaces[]}`、詳細 ADR-SCP-016 D4） | 崩してはいけない（既存 advisory state） |

##### hard-gate-surface baseline 構造（ADR-SCP-016 D4 articulate）

baseline file path: `projects/active/aag-structural-control-plane/aag/scp-checkers/hard-gate-surface.baseline.json`（archive 時に物理削除、ADR-SCP-015 D1 整合）

minimum schema:

```json
{
  "checker": "hard-gate-surface",
  "baselineCommit": "<sha = baseline 確定 commit>",
  "baselineAt": "<ISO8601 timestamp>",
  "surfaces": [
    ".github/workflows/**",
    "tools/git-hooks/pre-push",
    "app/package.json#scripts"
  ],
  "knownHardGateSurfaces": [
    {
      "surface": ".github/workflows/ci.yml",
      "kind": "workflow-job",
      "name": "fast-gate",
      "exitOneSteps": ["lint", "format:check", "build", "test:guards"]
    },
    {
      "surface": "tools/git-hooks/pre-push",
      "kind": "pre-push-step",
      "exitOneSteps": ["docs:check", "tsc -b --noEmit", "lint", "format:check", "test:guards"]
    },
    {
      "surface": "app/package.json#scripts",
      "kind": "npm-script-gate",
      "names": ["docs:check"]
    }
  ]
}
```

判定ロジック: 単純 grep ではなく、現在の workflow / pre-push / package.json から `knownHardGateSurfaces` を意味的に再収集 → baseline と **set diff**、増加方向のみ finding。コメント文 / 説明文の揺れによる誤検知を抑制。減少方向（hard gate 撤去）は許容、ratchet-down 機能。

#### §A2 narrowing rationale（GUIDANCE-007）

§A2 を boundary protection 4 件に narrowing した理由:

- **「やってはいけない」より重い「不可触・不可変・不可崩」に限定** — 単なる手続き上の禁止（migration 一発切替 / 順序逆行 / Reading Pass 機械分類代替 等）は parse-heavy + phase 依存のため §A1 へ promote
- **parse-free 限定** — `git diff --name-only` / `grep` だけで動く。TypeScript AST / Markdown 構造解析 / YAML schema 解析 不要。reposteward Wave 1+ infrastructure 待ちなしで Phase 1 で landing 可能
- **phase 不変** — 本 program 全期間を通じて一貫して禁止される事項のみ。phase 別 transient rule（Reading Pass 中の zone 編集禁止 等）は §B に降格
- **AI tool として均質** — 4 checker すべて「path 集合の差分比較」と均質、AI が学ぶコストが小さい
- **archive 削除が文脈整合** — 本 program が完遂すれば boundary protection の約束も終わる、checker が消えるのが自然

§A2 → §A1 promotion: §A2 は boundary protection 限定のため、通常 promotion 候補にならない（universal rule にはなりにくい）。例外は archive 直前の user 判断による articulation。

### B. 仕組み化できない（AI / human review が判定する + 再チェック機会を提供する）

設計判断・表現品質・文脈解釈に属するもの。**Gate / checker の責務ではない**が、**AI / human review に放置せず、再チェック機会を構造的に提供する**（不可侵原則 11 / AAG-SCP-GUIDANCE-002〜004 / **GUIDANCE-006**）。

各項目に **再チェック trigger（いつ）+ 文脈提供 surface（どこで）** を articulate:

| やってはいけないこと | 違反根拠 | 再チェック trigger | 文脈提供 surface |
|---|---|---|---|
| 設計判断・表現品質・文脈解釈を機械検証 scope に含める | 不可侵原則 11 / GUIDANCE-002 | 新 checker 設計時 / new-only gate 昇格時 | `docs/contracts/src/governance/check-design-intent.yaml`（各 checker の design intent / scope 境界を articulate、checker 実装前に AI 確認） + ADR review window |
| Instruction Pack を AI への命令書として扱う | 不可侵原則 11 / GUIDANCE-003 | AI が Instruction Pack を初参照する時 / Markdown 作成前 | Instruction Pack JSON の頭に `philosophy` block を articulate（"This is guidance, not a command. Adapt to context."） + Instruction Pack の `requiredSections` は guideline であって template ではないと明示 |
| Gate を AI 失敗装置として設計する | 不可侵原則 11 / GUIDANCE-004 | 新 checker 設計時 / 既存 checker の severity 引き上げ時 | 同上 `check-design-intent.yaml`（"Gate detects structural break, not bad judgement"） + ADR-SCP-014 への back link |
| Reading Pass の `rationaleSummary` の内容妥当性 | GUIDANCE-002（schema は §A で構造検証、文章品質は §B） | Phase 5 PR review 時 / Reading Pass entry の stale 検出後の再 review 時 | Phase 5 PR description template の「rationaleSummary 妥当性確認」prompt + reading-decisions.yaml の `alternativesConsidered` field（ADR-SCP-010 既 articulate）が AI に「他案も検討した」事実を再認識させる |
| ADR の `rationale` / `alternatives` の articulation 品質 | GUIDANCE-002 | wrap-up commit 時の Lineage update / archive 時の `振り返り判定` articulation | ADR template の `振り返り判定` section（既存）+ 「alternatives は最低 2 件」guideline + archive.manifest.json `decisionEntries` への要約圧縮時の再評価 |
| 文書間の責務境界の妥当性 / kind 選択妥当性 | GUIDANCE-002（kind 設定は §A で構造検証、kind 選択妥当性は §B） | doc-registry kind 設定時 / Reading Pass disposition 確定時 / kind 変更 PR 時 | `docs/contracts/src/docs/doc-kind-registry.yaml` の各 kind に `discriminationGuide` field（"kind A vs kind B の判別観点"、Phase 4 で articulate） + Reading Pass の `alternativesConsidered` field |

> **soft mechanism の articulate**: §B は guard / CI で foul させないが、**再チェック機会を構造的に提供** することで AI session が defensive に振る舞わず、自由判断と妥当性確認を両立できる。AAG philosophy「製本されないものを guard 化しない」+「気をつけるではなく mechanism として運用」（CLAUDE.md G8）の両立。
>
> **AI 自己レビュー section（既存 PZ-13）との関係**: §B 全項目は archive 前に **AI 自己レビュー 5 軸**（総チェック / 歪み検出 / 潜在バグ確認 / ドキュメント抜け漏れ確認 / CHANGELOG 更新）で最終再評価される。本 program archive 時に必ず通過する gate であり、§B 項目の取りこぼしを抑止する最後の安全網。

### 機械検証する（Gate scope）vs 定性的に AI を導く（Guidance scope）

不可侵原則 11 / ADR-SCP-014 / AAG-SCP-GUIDANCE-005 に従う分離:

| 機械検証する（Gate scope = §A） | 定性的に AI を導く（Guidance scope = §B） |
|---|---|
| 未登録 Markdown | この文書は何のためにあるか |
| requiredSections 欠落 | 読者は誰か |
| generated artifact の producer 不明 | どの粒度で説明すべきか |
| generated file の手編集 | 何を判断材料として扱うか |
| doc kind / topology mismatch | 過去・現在・未来をどう分けるか |
| 製本に TODO / Roadmap section | どのような設計思想を優先するか |
| 例外に owner / reason / reviewAfter なし | どの文脈を参照すべきか |
| YAML 変更後の generated JSON 未更新 | 比喩 / 表現の適切さ |

左側 §A だけが foul 可能な構造ルールであり、本 program で **検出装置を articulate + 実装** する。右側 §B は AI / human review の責務であり、AAG が無理に数値化しない。

## 関連実装

| パス | 役割 |
|---|---|
| `docs/contracts/doc-registry.json` | 既存 document registry（Phase 5 で kind / temporalScope / requiredSections additive 拡張、置換しない） |
| `docs/contracts/aag/*.schema.json` | 既存 AAG contract schema（本 program で touch しない、`docs/contracts/schema/` への再配置はしない = ADR-SCP-002） |
| `docs/contracts/schema/` | 本 program で新設する schema 配置（`aag-finding` / `tree-contracts` / `doc-kind-registry` / `document-contracts` / `temporal-scope-policy` / `required-docs-matrix` / `artifact-coverage` / `generated-artifacts` / `obligations` / `required-reads` / `runner-parity`） |
| `docs/contracts/src/` | 本 program で新設する authoring source（`repo/` / `docs/` / `governance/` 配下に YAML） |
| `docs/contracts/generated/` | 本 program で新設する machine truth（detector / CI / AAG CLI / architecture-health の入力） |
| `tools/governance/` | 本 program で新設する checker / scaffolder / normalizer 群 |
| `tools/architecture-health/src/collectors/obligation-collector.ts` | 既存 `OBLIGATION_MAP` / `PATH_TO_REQUIRED_READS` 正本（Phase 8a で YAML 追加、Phase 8b で読み込み切替、Phase 8c で TS 定数削除） |
| `aag-engine/internal/selfcheck/selfcheck.go` | 既存 self-check（V1〜V7 の 7 軸、Phase 0 inquiry で正本照合） |
| `aag-engine/cmd/aag/command_selfcheck.go` | 既存 self-check command layer（Phase 0 inquiry で internal package との drift を Finding 化） |
| `app/src/test/guards/manifestGuard.test.ts` | 既存 manifest guard（`.claude/manifest.json` の検証、本 program は touch しない） |
| `app/src/test/guards/projectizationPolicyGuard.test.ts` | 既存 projectization policy guard（PZ-1〜PZ-14、本 program checklist は PZ 全準拠） |
| `app/src/test/guards/checklistFormatGuard.test.ts` | 既存 checklist format guard（F1〜F5、本 program checklist は F 全準拠） |
| `app/src/test/guards/projectCompletionConsistencyGuard.test.ts` | 既存 project completion consistency guard（C1〜C4 / L1〜L3、本 program は archive 移行時に C / L 準拠） |
| `references/05-aag-interface/operations/project-checklist-governance.md` | AAG Layer 4A 共通運用、本 program checklist は §3 / §6 / §10 / §13 全準拠 |
| `references/05-aag-interface/operations/projectization-policy.md` | AAG-COA 判定、本 program は Level 3 / governance-hardening / requiresHumanApproval=true |
| `aag/_internal/strategy.md` / `architecture.md` / `evolution.md` / `source-of-truth.md` | AAG 戦略 / 5 層構造 / 進化方針 / 正本ポリシー（本 program の判断土台） |
| `projects/active/reposteward-ai-ops-platform/` | substrate 提供 program（Task Capsule / Parameters / SourceFacts / DetectorResult を本 program が消費） |
