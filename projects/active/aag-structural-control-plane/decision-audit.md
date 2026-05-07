# decision-audit — aag-structural-control-plane

> 役割: L3 重判断 institution (= drawer Pattern 1 application、複数 Phase に跨る判断の lineage articulation)。
>
> 規約: `references/05-aag-interface/protocols/complexity-policy.md` §3.4 + `references/05-aag-interface/drawer/decision-articulation-patterns.md` Pattern 1。

> **DA entry 構造** (= 各 entry が以下を articulate):
>
> 1. **5 軸** = status / context / decision / rationale / alternatives (= 標準 ADR 軸)
> 2. **観測点** = 判断後に true となるべき検証可能な observation 集合
> 3. **Lineage** = judgementCommit (= 実 sha、wrap-up commit で update) + preJudgementCommit (= judgement 直前の commit、rollback target) + (任意) retrospectiveCommit
> 4. **振り返り判定** = 正しい / 部分的 / 間違い + 学習 (= Phase 完遂時に articulate)
>
> **flow** (= §13.1 Phase landing + wrap-up 二段 commit pattern):
>
> - landing commit で entry を articulate (= 5 軸 + 観測点 + Lineage 仮 sha)
> - landing commit SHA 確定後、wrap-up commit で Lineage 実 sha update + 振り返り判定
> - 完遂後の archive 時に `archive.manifest.json` の `decisionEntries` に圧縮される (= Archive v2)

## DA-α-000: 本 project の進行モデル決定

### status

- 着手判断: **active** (= 仮 sha 段階)
- 振り返り判定: **未確定**

### context

本 project は L3 governance-hardening (= projectization.md §2 判定理由) で、Phase 0〜10 の長期戦 + 9 ADR + Reading Pass + 3 段階 shadow migration を含む。reposteward-ai-ops-platform の substrate 提供と並走する後段 program として位置付けるため、進行モデルを明示的に articulate する必要がある。

### decision

進行モデルとして以下を採用:

1. **AI judgement + retrospective + commit-bound rollback** (= drawer Pattern 1 application、`references/05-aag-interface/drawer/decision-articulation-patterns.md` Pattern 1 整合)
2. **§13.1 Phase landing + wrap-up 二段 commit pattern** を全 Phase で適用 (= 各 Phase は landing commit + wrap-up commit の 2 commit、Lineage 実 sha は wrap-up で確定)
3. **§13.2 Atomic dependent update commit pattern** を新 doc 追加時に適用 (= doc-registry / README.md index update を 1 atomic commit に統合、push fail 事前回避)
4. **§13.3 Post-flip regen pattern** を checkbox flip を含む全 commit に適用 (= flip commit + 別 regen commit、KPI drift を機械同期)
5. **Schema-first / Finding-first / Shadow / Ratchet / Gate の段階順序を逆行させない** (= 不可侵原則 9)
6. **1 Finding group = 1 PR** を Phase 5 / 8 / 9 / 10 で厳守 (= AAG-SCP-MIGRATION-005、肥大化抑止 + rollback granularity)

### rationale

- **drawer Pattern 1 整合**: landing commit = judgement commit、wrap-up commit = retrospective commit。各 commit が独立 rollback unit
- **過去 program での実証**: aag-platformization / aag-self-hosting-completion / operational-protocol-system / reposteward-ai-ops-platform で複数 instance 観測、再発 0 件
- **§13 commit pattern integration**: Phase 0〜10 の各 phase 完遂 + checkbox flip + 新 doc 追加すべてで pattern 適用可能
- **不可侵原則 8 (additive-only) 整合**: 各 phase が既存 substrate に additive、Hard Gate 化は別 program 候補
- **不可侵原則 9 (順序逆行禁止) 整合**: Schema → Inventory → Reading Pass → Shadow → Triage → Declaration → Ratchet → Gate の段階を articulate

### alternatives

- (a) **Phase 並列実行**（複数 Phase を 1 PR に統合） — 却下: 不可侵原則 9 違反、肥大化、rollback 不能
- (b) **Reading Pass を機械分類で代替**（Phase 2.5 を Phase 3 に統合） — 却下: 不可侵原則 7 違反、AAG-REQ-NO-AI-HUMAN-SUBSTITUTION 違反
- (c) **Hard Gate を Phase 1 から導入**（advisory phase なし） — 却下: 不可侵原則 8 違反、既存 references/ の violation candidate が多すぎて誤検知整理が破綻

### 観測点 (= 判断後に true となるべき検証可能 observation)

1. Phase 0 の全 checkbox（27 個）が `[x]` になり、user 承認後に Phase 1 へ進む
2. 各 Phase の landing commit + wrap-up commit が独立 rollback 可能（git log で 2 commit 確認可能）
3. 新 doc 追加時に doc-registry.json + references/README.md の同 atomic commit 統合が pre-push hook を pass
4. checkbox flip を含む commit の後、別 regen commit が landing して KPI drift が解消される
5. Phase 5 / 8 / 9 / 10 の PR が Finding group 単位で独立 rollback 可能（git log で個別 PR 確認可能）

### Lineage

- **preJudgementCommit**: `c0f7823de95e9c119e872435788deb8ed93ce959` (= 本 project bootstrap landing 直前の commit)
- **judgementCommit**: `<TBD>` (= bootstrap landing commit SHA、wrap-up commit で update)
- **retrospectiveCommit**: `<TBD>` (= wrap-up commit SHA、Phase 0 振り返り判定 articulate 時に確定)
- **judgementTag**: 未設定 (= AI infrastructure で annotated tag 不可なら SHA 直接参照で代替)
- **rollbackTag**: 未設定 (= 同上)

### 振り返り判定

- **判定**: `<未確定>`
- **観測点達成状況**: `<TBD、Phase 0 完遂時に articulate>`
- **学習**: `<TBD>`

---

## ADR-SCP-001: YAML authoring source / generated JSON machine truth

### status

- 着手判断: **active**
- 振り返り判定: **未確定**

### context

本 program では Tree Contract / Document Contract / Temporal Scope 等の宣言を **YAML で authoring** することを想定する。一方、reposteward-ai-ops-platform 不可侵原則 1 は「全 AAG Parameters / SourceFacts / Task Capsule / Premise Contract / DetectorResult / generated artifact は JSON。**YAML 採用禁止**」と明文化している（`projects/active/reposteward-ai-ops-platform/plan.md` L5）。

両者の scope を切り分けないと、本 program 着手時点で reposteward 原則 1 違反として検出される。

### decision

YAML 採用を以下のように再定義する:

- **reposteward 原則 1 の narrow scope**: AAG Parameters / SourceFacts / Task Capsule / Premise Contract / DetectorResult / generated artifact は JSON 限定 (= 不変)
- **本 program の scope**: YAML を **人間/AI が編集する authoring source** としてのみ採用
- **machine truth は JSON**: Detector / CI / AAG CLI / architecture-health は **generated JSON のみ** を読む
- **配置**: `docs/contracts/src/*.yaml`（authoring source）→ normalize → `docs/contracts/generated/*.generated.json`（machine truth）

### rationale

- reposteward 原則 1 は「machine truth = JSON」を保証するための原則であり、authoring source 層の YAML 使用は同原則の意図と衝突しない
- YAML は人間/AI の編集容易性が高く、コメント / 階層 / 参照記法が表現力豊か
- generated JSON への一方向 normalization により、JSON-only consumer 側の不変性は保たれる

### alternatives

- (a) **YAML を全面禁止し JSON authoring**（reposteward 原則 1 をそのまま適用） — 却下: authoring 効率低下、コメント / 階層表現の不足、人間/AI の編集ミスが増える
- (b) **YAML を machine truth として採用**（detector も YAML を直読） — 却下: reposteward 原則 1 違反、Go MVP 実装の jsonschema validator が YAML 対応のため 2 系統化
- (c) **TOML / HCL 等の中間形式** — 却下: ecosystem サポート不足、JSON への正規化コスト同等以上

### 観測点

1. `docs/contracts/src/*.yaml` が landing しても、reposteward 原則 1 違反検出が発火しない（reposteward 側で本 ADR を参照する narrow scope 再定義が articulate される）
2. detector / CI / AAG CLI / architecture-health が `*.generated.json` のみを読む（grep で確認可能）
3. YAML の手編集と generated JSON の同期が pre-push / CI で機械検証される（Phase 1 schema MVP 完成後）

### Lineage

- **preJudgementCommit**: `c0f7823de95e9c119e872435788deb8ed93ce959`
- **judgementCommit**: `<TBD>`
- **retrospectiveCommit**: `<TBD>`

### 振り返り判定

- **判定**: `<未確定>`
- **観測点達成状況**: `<TBD>`
- **学習**: `<TBD>`

---

## ADR-SCP-002: Document Contract は doc-registry.json の拡張層

### status

- 着手判断: **active**
- 振り返り判定: **未確定**

### context

本 program の Document Contract は kind / temporalScope / requiredSections / forbiddenContent / owner / audience / granularity / lifecycle 等を articulate する。一方、既存 `docs/contracts/doc-registry.json`（138KB）には references/ 配下の全 Markdown が登録済み。

新 namespace（DOC-DEF-* 等）を作って doc-registry.json と並立させると、`references/04-tracking/recent-changes.generated.md` 系の既存 generator pipeline と食い違う。

### decision

- doc-registry.json を **Document Registry v1** とみなし、Document Contract はその **上位互換** として扱う
- 既存 doc-registry.json entry に kind / temporalScope / requiredSections / forbiddenContent を **additive 拡張**
- 新規 namespace は作らない（DOC-DEF-* prefix を導入しない、既存 docId を使う）
- 配置:
  - `docs/contracts/doc-registry.json` = 既存（base registry、本 program で拡張）
  - `docs/contracts/src/docs/document-contracts.yaml` = 拡張 metadata の authoring source（doc-registry entry を join key とする）
  - `docs/contracts/generated/document-contracts.generated.json` = doc-registry + YAML の正規化済み join projection
  - `docs/contracts/aag/*.schema.json` = 既存 AAG contract schema、**touch しない**
  - `docs/contracts/schema/*.schema.json` = 本 program で新設する schema、既存 `aag/` 配下とは並列配置

### rationale

- 既存 generator pipeline の後方互換性を維持（未知 field 無視で既存動作不変）
- doc-registry.json を base registry として正本性を維持し、本 program は metadata 層を additive 拡張
- 並立 namespace を避けることで「どちらが正本か」の混乱を防ぐ
- `docs/contracts/aag/` を触らないことで、reposteward AAG contract の不変性を保つ

### alternatives

- (a) **新 namespace で並立**（DOC-DEF-* prefix） — 却下: 既存 generator pipeline と食い違い、正本が 2 つに分裂
- (b) **doc-registry.json を全面置換**（kind / temporalScope を必須 field 化） — 却下: 後方互換破壊、既存 entry の必須 field を変更すると既存 reader が壊れる
- (c) **`docs/contracts/aag/` 配下に集約**（既存 schema と同居） — 却下: AAG contract schema は reposteward 不可侵原則整合のため touch 禁止、新 schema を追加すると AAG contract scope 境界が曖昧になる

### 観測点

1. `docs/contracts/doc-registry.json` の既存 entry の必須 field（path / label 等）が変更されない
2. 本 program で追加する kind / temporalScope / requiredSections / forbiddenContent が optional field として additive 拡張される
3. 既存 generator pipeline（`references/04-tracking/recent-changes.generated.md` 系）が未知 field を無視して動作する
4. `docs/contracts/aag/*.schema.json`（10 schemas）が本 program 期間中に touch されない（git log で確認可能）

### Lineage

- **preJudgementCommit**: `c0f7823de95e9c119e872435788deb8ed93ce959`
- **judgementCommit**: `<TBD>`
- **retrospectiveCommit**: `<TBD>`

### 振り返り判定

- **判定**: `<未確定>`
- **観測点達成状況**: `<TBD>`
- **学習**: `<TBD>`

---

## ADR-SCP-003: 製本は present-only / 時間軸 4 分類

### status

- 着手判断: **active**
- 振り返り判定: **未確定**

### context

ドキュメントが古くなる最大の原因は「そのドキュメントが何なのか」が定義されていないこと。特に製本（canonical-doc）に過去の実装経緯や未来の計画が混入すると、文書の正本性が壊れ、肥大化し、責務が混在する。

CLAUDE.md §ドキュメント運用原則の「prose に現在値を書かない」原則を Document Contract 側へ昇格させ、機械検証可能にする。

### decision

時間軸を 4 分類で articulate する:

| 時間軸 | 置き場所 | 内容 |
|---|---|---|
| **Past** | `archive-doc` (= `references/99-archive/` または `projects/completed/`) | 退役済み設計、過去の実装経緯、移行ログ、retrospective |
| **Present** | `canonical-doc` (= 製本、references/01-foundation / references/03-implementation / references/05-aag-interface 等) | 現在の実装、現在の契約、現在の責務境界、現在有効な設計原則、現在有効な用語定義、現在守るべき invariant、現在の正しい実装パターン、現在の禁止パターン |
| **Future** | `project-plan` (= `projects/active/<id>/plan.md`) | 計画、未確定方針、移行予定、作業中タスク、roadmap |
| **Computed Present** | `generated-report` (= `references/04-tracking/generated/*.generated.md`) | 件数、一覧、health、coverage、status、KPI |

製本に書いてはいけないもの:

- 過去の実装経緯
- 退役済み設計の詳細
- 「昔はこうだった」という履歴説明
- 将来こうしたい、という計画
- 未確定方針
- 作業中 TODO
- 移行中チェックリスト
- Phase 計画
- retrospective
- changelog
- AI セッションの作業メモ
- 現在値・件数・一覧の手書き（generated-report に置く）

製本に過去/未来が必要な場合は **本文展開禁止 + Document ID / Project ID リンクのみ許可**:

> 詳細な移行履歴は DOC-ARCHIVE-XXX を参照。
> 今後の再編計画は PROJECT-YYY を参照。

### rationale

- 各 doc kind の責務が一意になり、drift / 肥大化 / 責務混在を構造的に防げる
- 機械検証可能（heading 検出 + checkbox 検出 + 特定 keyword 検出）
- CLAUDE.md §ドキュメント運用原則と整合
- 過去の Phase 完了時に「Project の内容をそのまま製本へコピーしてはいけない」を機械保証

### alternatives

- (a) **時間軸を区別しない**（製本 = 1 種類、過去/未来も書ける） — 却下: drift / 肥大化 / 責務混在の温床
- (b) **3 分類**（Past / Present / Future、Computed Present を Present に含める） — 却下: 現在値の手書きが製本に混入し続ける、機械検証で区別不能
- (c) **5 分類**（Past / Past-recent / Present / Future-near / Future-far） — 却下: 粒度過剰、機械検証コスト増、運用判断のばらつき

### 観測点

1. canonical-doc kind の文書に History / Roadmap / Future / TODO / Phase / Migration Log heading がない（Phase 4 shadow check で確認）
2. canonical-doc kind の文書に checkbox がない（Phase 4 shadow check で確認）
3. canonical-doc kind の文書に generated count / current status の手書きがない（Phase 4 shadow check で確認）
4. 過去/未来への参照が Document ID / Project ID リンク形式である（本文展開していない）
5. 移行作業中（Phase 5）に製本から history / future-plan を移動する PR が個別 Finding group として独立する

### Lineage

- **preJudgementCommit**: `c0f7823de95e9c119e872435788deb8ed93ce959`
- **judgementCommit**: `<TBD>`
- **retrospectiveCommit**: `<TBD>`

### 振り返り判定

- **判定**: `<未確定>`
- **観測点達成状況**: `<TBD>`
- **学習**: `<TBD>`

---

## ADR-SCP-004: Tree Contract MVP scope は top-level + structural roots のみ

### status

- 着手判断: **active**
- 振り返り判定: **未確定**

### context

repo 全ディレクトリ（数百件規模）に kind / owner / intent / allowedChildren を付けると、宣言爆発で運用不能になる。一方で、top-level + 主要 layer の境界は確実に統制したい。

`unmanaged-but-tolerated` という第 3 状態を導入し、明示的に許容する範囲を articulate する。

### decision

Phase 1 MVP 対象（不可侵原則 4）:

- repo root top-level
- `app/src/{domain,application,infrastructure,presentation,features}` 5 layer
- `app/src/test/guards/` (= guard 配置)
- `references/{01-foundation,02-design-system,03-implementation,04-tracking,05-aag-interface,99-archive}` 6 zone
- `docs/contracts`
- `aag` (= AAG framework 内部)
- `aag-engine` (= reposteward / Go MVP)
- `projects` (= active + completed + _template)
- `tools`
- `wasm`

それ以外は **`unmanaged-but-tolerated`** 状態で許容する。

ただし、新規 top-level directory 追加は **new-only gate** で foul 候補とする（Phase 3 完了後）。

### rationale

- 粒度爆発の抑止: 数百件の宣言を維持する運用コストは長期戦で破綻
- 重要な境界（layer / zone / framework）だけ統制すれば、構造的な drift は防げる
- `unmanaged-but-tolerated` 第 3 状態は AAG-REQ-RATCHET-DOWN と整合（baseline は単調減少、新規違反のみ foul）
- 個別ディレクトリへの拡大は別 program 候補（必要時に user 判断で escalate）

### alternatives

- (a) **全ディレクトリ宣言**（粒度最大） — 却下: 運用不能、宣言ファイル爆発、AI session の認知負荷増
- (b) **top-level のみ**（最小粒度） — 却下: 主要 layer / zone の境界が機械検証されない、層境界違反の検出が機能しない
- (c) **動的宣言**（実行時に推定） — 却下: 「宣言」の意味が失われる、機械検証 trace が断絶

### 観測点

1. Phase 3 で Tree Contract MVP scope 内のディレクトリが全て宣言される（10〜20 件規模）
2. それ以外のディレクトリが `unmanaged-but-tolerated` として明示的に articulate される
3. 新規 top-level directory 追加が new-only gate で finding 化される
4. 既存ディレクトリの違反（forbidden child / declared path missing）が advisory finding として一覧化される

### Lineage

- **preJudgementCommit**: `c0f7823de95e9c119e872435788deb8ed93ce959`
- **judgementCommit**: `<TBD>`
- **retrospectiveCommit**: `<TBD>`

### 振り返り判定

- **判定**: `<未確定>`
- **観測点達成状況**: `<TBD>`
- **学習**: `<TBD>`

---

## ADR-SCP-005: OBLIGATION_MAP / PATH_TO_REQUIRED_READS は 3 段階 shadow migration

### status

- 着手判断: **active**
- 振り返り判定: **未確定**

### context

既存 `tools/architecture-health/src/collectors/obligation-collector.ts` L43 / L201 の `OBLIGATION_MAP` / `PATH_TO_REQUIRED_READS` は TS 定数として実装されており、宣言と実装が混在している。これを YAML authoring source へ移行したいが、collector は architecture-health pipeline の入力なので、いきなり JSON 読みに切り替えると pipeline 全体が一時不整合になる。

### decision

3 段階 shadow migration を採用:

#### Phase 8a: YAML 追加 + 正規化比較器

- `docs/contracts/src/governance/obligations.yaml` + `required-reads.yaml` を landing
- generated JSON を生成
- TS 定数と generated JSON の **正規化比較器**（オブジェクトキー順序 / 評価順を意味的に等価判定する diff checker）を landing
- collector は **まだ既存 TS 定数を読む**
- Shadow check で意味的差分 == 0 を確認

#### Phase 8b: collector 切替

- `obligation-collector.ts` を generated JSON 読みに切替
- TS 定数は **deprecated shim** として短期間残置（呼び出し側がまだ参照可能）
- new-only gate: 新規 obligation 追加は YAML のみ許可

#### Phase 8c: TS 定数削除

- TS 定数を削除
- 呼び出し側が 0 件であることを grep で確認
- generated JSON が唯一 machine contract

### rationale

- 一発切替は AAG-REQ-RATCHET-DOWN 違反（破壊的 + rollback 困難）
- architecture-health pipeline の不整合期間を 0 にする
- 正規化比較器で意味的等価を保証することで、文字列差分による永遠の「差分あり」状態を回避

### alternatives

- (a) **一発切替**（TS 定数を削除して collector を generated JSON 読みに切替を 1 PR で） — 却下: pipeline 一時不整合、rollback 困難
- (b) **TS 定数を恒久維持**（YAML は補助のみ、source of truth は TS） — 却下: 宣言と実装の混在を解消できない、本 program の目的に反する
- (c) **collector を全面書き直し**（YAML 直読） — 却下: ADR-SCP-001 違反（YAML を machine truth に昇格）

### 観測点

1. Phase 8a 完了時、TS 定数と generated JSON の意味的差分 == 0
2. Phase 8b 完了時、collector が generated JSON を入力に動作 + architecture-health pipeline が PASS 維持
3. Phase 8c 完了時、TS 定数の grep 結果 == 0 件
4. Phase 8a 〜 8c の各 phase が独立 rollback 可能（git log で 3 phase 確認可能）

### Lineage

- **preJudgementCommit**: `c0f7823de95e9c119e872435788deb8ed93ce959`
- **judgementCommit**: `<TBD>`
- **retrospectiveCommit**: `<TBD>`

### 振り返り判定

- **判定**: `<未確定>`
- **観測点達成状況**: `<TBD>`
- **学習**: `<TBD>`

---

## ADR-SCP-006: AI Instruction Pack は post-write validation 限定

### status

- 着手判断: **active**
- 振り返り判定: **未確定**

### context

「AI は Instruction Pack なしに doc を書かない」を機械的に強制する経路がない（書かれた後に検証はできるが、書く前に強制はできない）。CLAUDE.md と manifest 経由で AI に指示は伝わるが、それは規範であって機構ではない。

Phase 6 の完了条件を pre-write 強制とすると、達成不能になる。

### decision

Phase 6 の完了条件を **post-write validation 限定** とする:

- AI が参照できる Instruction Pack JSON が生成される
- Markdown 作成後に Document Contract 適合性を機械検証できる
- pre-write 強制は完了条件にしない

### rationale

- 機構的に強制不能なものを完了条件にすると achievable でなくなる
- post-write validation で十分（不適合な doc は検証で finding 化され、修正される）
- AI session の self-discipline + CLAUDE.md guidance + manifest discovery で pre-write 推奨は可能

### alternatives

- (a) **pre-write 強制機構を実装**（git hook で Markdown 編集前に Instruction Pack 取得を強制） — 却下: 機構的に困難、AI session の自由度を過剰に制限
- (b) **Instruction Pack を生成しない**（CLAUDE.md だけで運用） — 却下: 文書 kind ごとの差異を AI が学べない、scaffold が機能しない

### 観測点

1. Phase 6 完了時、`aag docs instruction <doc-id>` で Instruction Pack JSON を取得できる
2. Phase 6 完了時、Markdown 作成後に Document Contract 適合性を機械検証する `tools/governance/check-doc-postwrite.ts` が動作する
3. Phase 6 完了時、AI が新規 doc を Instruction Pack から scaffold する例が articulate されている

### Lineage

- **preJudgementCommit**: `c0f7823de95e9c119e872435788deb8ed93ce959`
- **judgementCommit**: `<TBD>`
- **retrospectiveCommit**: `<TBD>`

### 振り返り判定

- **判定**: `<未確定>`
- **観測点達成状況**: `<TBD>`
- **学習**: `<TBD>`

---

## ADR-SCP-007: Reading Pass 成果物の保存規約

### status

- 着手判断: **active**
- 振り返り判定: **未確定**

### context

Phase 2.5 Reading Pass の出力は **人間/AI の判断結果** であり、機械生成物ではない。にもかかわらず、`*.generated.json` 命名にすると、AAG SCP で定義する「generated artifact は producer を持つ」原則と衝突する。

### decision

3 file 構造で articulate:

- `docs/contracts/src/docs/document-reading-decisions.yaml` = **human/AI authored**、各 docId に対する `proposedKind` / `temporalScope` / `disposition` / `reviewedBy` / `reviewedAtCommit` / `reviewedAtSha` / `rationaleSummary` / `alternativesConsidered`
- `docs/contracts/generated/document-reading-candidates.generated.json` = **machine inferred**、heuristic candidate の集合
- `docs/contracts/generated/document-reading-merged.generated.json` = src/ + generated/ の join projection、final disposition view

human authored は src/、machine inferred は generated/、join は generated/ という配置。

### rationale

- AAG SCP の「generated = producer を持つ」原則と整合
- human authored と machine inferred を物理的に分離することで、再生成時に human note を上書きするリスクを排除
- merged JSON が detector / CI / AAG CLI の入力として機能（machine truth は merged JSON）

### alternatives

- (a) **`document-reading-inventory.generated.json` 1 file**（混在） — 却下: 再生成時に human note 上書きリスク、AAG SCP 原則違反
- (b) **YAML だけで完結**（generated JSON なし） — 却下: detector / CI / AAG CLI が YAML を直読することになり、ADR-SCP-001 違反

### 観測点

1. Phase 2.5 完了時、3 file が landing + 各 file の役割が明確に articulate
2. `document-reading-decisions.yaml` の手編集と generated/ の同期が pre-push hook で機械検証される
3. 再生成時に generated/ の human note 上書きが発生しない（src/ は touch されない）

### Lineage

- **preJudgementCommit**: `c0f7823de95e9c119e872435788deb8ed93ce959`
- **judgementCommit**: `<TBD>`
- **retrospectiveCommit**: `<TBD>`

### 振り返り判定

- **判定**: `<未確定>`
- **観測点達成状況**: `<TBD>`
- **学習**: `<TBD>`

---

## ADR-SCP-008: Machine inferred で accepted 扱いとする kind の例外条項

### status

- 着手判断: **active**
- 振り返り判定: **未確定**

### context

Reading Pass を全 doc に一律適用すると、`references/04-tracking/generated/architecture-health.generated.md` のような **明確に producer を持つ generated report** まで読む対象になり、コストが膨れる。同様に、archive-manifest が存在する archive doc は時間軸が確定しているため、reading pass で disposition を再判定する意味が薄い。

### decision

以下の kind は **machine inferred で accepted** 扱いとする例外条項を持つ:

- `generated-report`: producer が宣言済み（generated-artifacts.yaml に entry 存在）
- `archive-doc`: archive-manifest が存在（`projects/completed/<id>/archive.manifest.json` または `references/99-archive/` 内の archive doc）

それ以外の kind（`canonical-doc` / `domain-definition` / `implementation-guide` / `operation-protocol` / `project-plan` / `project-checklist` / `index` / `ai-entrypoint`）は Reading Pass で人間/AI 判定必須。

### rationale

- generated-report は producer JSON から機械再生成可能であり、temporal scope は computed-present で確定
- archive-doc は archive-manifest により past 時間軸が確定
- Reading Pass コストを必要な場所だけに集中させる
- AAG-SCP-MIGRATION-001 を「全 doc 必須」とすると Phase 2.5 が破綻

### alternatives

- (a) **例外なし、全 doc を Reading Pass 必須** — 却下: コスト過大、generated-report に Reading Pass を適用する意味が薄い
- (b) **より広い例外**（`index` / `ai-entrypoint` も machine inferred） — 却下: index / ai-entrypoint は responsibility 集約の判断が必要、機械分類リスク高

### 観測点

1. Phase 2.5 で `generated-report` kind の doc が Reading Pass 対象から除外される（producer 宣言済の場合）
2. Phase 2.5 で `archive-doc` kind の doc が Reading Pass 対象から除外される（archive-manifest 存在の場合）
3. それ以外の kind は人間/AI 判定の `reviewedBy` / `reviewedAtCommit` / `reviewedAtSha` 必須

### Lineage

- **preJudgementCommit**: `c0f7823de95e9c119e872435788deb8ed93ce959`
- **judgementCommit**: `<TBD>`
- **retrospectiveCommit**: `<TBD>`

### 振り返り判定

- **判定**: `<未確定>`
- **観測点達成状況**: `<TBD>`
- **学習**: `<TBD>`

---

## ADR-SCP-009: Reading entry の stale 検出と再レビュー基準

### status

- 着手判断: **active**
- 振り返り判定: **未確定**

### context

Phase 2.5 終了時点での disposition と、Phase 5（実際の split / move / archive PR）実行時点との間に編集が入ると判断が古くなる。各 reading entry に reviewed-sha がないと、Phase 5 PR を機械的に drift 検出できない。

### decision

各 reading entry に必須 field:

- `reviewedBy`: AI session ID または human reviewer ID
- `reviewedAtCommit`: review 実施時の HEAD commit SHA
- `reviewedAtSha`: 対象ファイルの blob SHA（当該 commit 時点）
- `rationaleSummary`: 1〜2 文の判断根拠
- `alternativesConsidered`: 検討した別 kind / disposition の list（最低 1 件）

stale 検出ルール:

- 対象ファイルが reviewed-sha 以降に変更された場合、**再レビュー必須**
- Phase 5 PR 実行時に stale entry が含まれていれば、PR は finding として fail（再レビュー後に再 PR）

### rationale

- Reading Pass 結果と物理移動の間で drift が起きると、disposition が無効化される
- reviewedBy / reviewedAtCommit / reviewedAtSha により、AI session 別 / commit 別の trace が可能
- alternativesConsidered があると「他の kind も妥当だったが選択しなかった」情報が保持される

### alternatives

- (a) **stale 検出なし**（Reading Pass 一回で完了扱い） — 却下: drift で無効化された disposition で Phase 5 PR が実行されるリスク
- (b) **reviewedAt timestamp**（commit SHA ではなく時刻） — 却下: AAG-REQ-NO-DATE-RITUAL 違反、state-based ではない
- (c) **alternativesConsidered なし** — 却下: AI session の決定根拠が失われ、再現性低下

### 観測点

1. Phase 2.5 で全 reading entry が reviewedBy / reviewedAtCommit / reviewedAtSha を持つ
2. Phase 5 PR 実行時に stale entry が finding として検出される
3. 再レビュー後の reading entry が新 sha で更新され、Phase 5 PR が再実行可能

### Lineage

- **preJudgementCommit**: `c0f7823de95e9c119e872435788deb8ed93ce959`
- **judgementCommit**: `<TBD>`
- **retrospectiveCommit**: `<TBD>`

### 振り返り判定

- **判定**: `<未確定>`
- **観測点達成状況**: `<TBD>`
- **学習**: `<TBD>`
