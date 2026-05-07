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

1. Phase 0 の全 checkbox（36 個）が `[x]` になり、user 承認後に Phase 1 へ進む
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

---

## ADR-SCP-010: Reading Pass 記録フォーマット最小 schema

### status

- 着手判断: **active**
- 振り返り判定: **未確定**

### context

ADR-SCP-007 で Reading Pass 成果物の保存規約を articulate（src = human authored / generated = machine candidate / merged = join）したが、各 entry 内の **必須 field** が未定義。Reading Pass を AI session 単独で進めると、entry 形式が session ごとに drift し、後段 Phase 5（Rewrite/Move/Archive PR）で参照不能になる。

### decision

`docs/contracts/src/docs/document-reading-decisions.yaml` の各 entry は以下を必須とする:

```yaml
- path: <doc path from repo root>
  currentZone: <現在配置 zone path>
  proposedKind: <doc-kind-registry 登録済 kind>
  temporalScope: <present | past | future | computed-present>
  disposition: <ADR-SCP-011 6 分類のいずれか>
  contains:
    presentContract: <bool>
    implementationHistory: <bool>
    futurePlan: <bool>
    generatedState: <bool>
    taskList: <bool>
  review:
    reviewedBy: <session ID or human ID>
    reviewedAtCommit: <commit SHA>
    reviewedAtSha: <file blob SHA at commit>
    rationaleSummary: <1-2 文>
    alternativesConsidered:
      - kind: <alt kind>
        rejectedBecause: <却下理由>
```

disposition 別の追加 field:

- `disposition: split` → `splitTargets: { present, past, future, rationale }`
- `disposition: move` → `moveTo: <new path>`、`rationale`
- `disposition: archive` → `archiveTo: <archive path>`、`archiveManifest: <bool>`、`rationale`
- `disposition: generated-register` → `producer: <generator path or command>`
- `disposition: needs-triage` → `triageReason: <文脈>`、`expectedResolutionPhase: 2.5`

詳細: inquiry/07 §3 を参照。

### rationale

- AI session ごとの drift を抑止（必須 field により形式が固定）
- alternativesConsidered の articulate により、判断根拠が trace 可能（再現性確保）
- disposition 別の追加 field により、Phase 5 PR が機械的に生成可能（zone × disposition で grouping）

### alternatives

- (a) **必須 field なし、自由形式** — 却下: drift 発生、Phase 5 で参照不能
- (b) **alternativesConsidered を optional** — 却下: 判断根拠の trace が失われ、再 review 時に再現困難
- (c) **disposition 別 field を unified field** — 却下: 各 disposition の固有情報（splitTargets / moveTo / archiveTo / producer）を articulate 不能

### 観測点

1. Phase 1 で `docs/contracts/schema/reading-pass.schema.json` が landing し、上記 field を JSON Schema として articulate
2. Phase 2.5 開始時に `docs/contracts/src/docs/document-reading-decisions.yaml` の最初の entry が上記形式で landing
3. Phase 5 PR 生成時に zone × disposition の機械 grouping が動作（PR タイトル自動推定可能）

### Lineage

- **preJudgementCommit**: `<TBD = inquiry/07 + ADR-SCP-010〜013 landing 直前の commit SHA、wrap-up commit で update>`
- **judgementCommit**: `<TBD>`
- **retrospectiveCommit**: `<TBD>`

### 振り返り判定

- **判定**: `<未確定>`
- **観測点達成状況**: `<TBD>`
- **学習**: `<TBD>`

---

## ADR-SCP-011: disposition taxonomy を 6 分類に拡張

### status

- 着手判断: **active**
- 振り返り判定: **未確定**

### context

ADR-SCP-007 / plan.md Phase 2.5 で disposition は 4 分類（keep-and-contract / split / move / archive）と articulate していた。ただし、実運用で以下 2 分類が必要と判明:

- `references/04-tracking/generated/` 配下の generated report は Reading Pass で「machine inferred で auto-accept」(ADR-SCP-008) するが、disposition として明示的に articulate しないと doc-registry 拡張時の処理が曖昧
- AI session が判断保留する状況は実務上必ず発生（複数の kind が妥当に見える doc 等）。「needs-triage」状態を articulate しないと、AI session が無理に判断して低 confidence の disposition を articulate するリスク

### decision

disposition を **6 分類**に拡張:

| disposition | 性質 | 採否根拠 |
|---|---|---|
| `keep-and-contract` | 現在の場所・内容で妥当、Document Contract のみ付与 | 既存 |
| `split` | 1 文書に複数責務混在、本文を分割 | 既存 |
| `move` | 内容は有効、置き場所が違う | 既存 |
| `archive` | 現行の正本ではない、archive へ移動 | 既存 |
| `generated-register` | **新規**: generated report として登録（ADR-SCP-008 例外条項で auto-accept） | 機械再生成可能、Reading Pass コスト不要 |
| `needs-triage` | **新規**: 判断保留、Phase 2.5 内で再 review | AI session の自由度確保、Phase 2.5 完了条件「needs-triage 残数 == 0」で必ず解消 |

採用しない candidate:

- `delete-candidate`: archive にも残さない candidate → 却下: 本 program scope 外（archive 廃止は別 program 候補）
- `external-reference`: repo 内正本ではなく外部参照 → 却下: 本 program 対象は repo 内 doc のみ、外部 reference は ADR-SCP-002 で扱う doc-registry に登録しない方針
- `project-owned`: projects/active 配下の作業文脈 → 却下: project doc は kind=`project-plan` / `project-checklist` / `ai-entrypoint` で articulate するため、disposition で別扱いする必要なし

### rationale

- `generated-register` 追加で ADR-SCP-008 例外条項の機械処理が明確化
- `needs-triage` 追加で AI session が低 confidence で disposition を articulate するリスクを抑止
- 6 分類を超えると分類自体の運用 cost が増えるため、最小 set で start

### alternatives

- (a) **4 分類のまま** — 却下: generated report の処理が曖昧、判断保留の articulate 経路なし
- (b) **8+ 分類**（delete-candidate / external-reference / project-owned 等を全採用） — 却下: 分類 cost 過大、実運用で混同リスク

### 観測点

1. Phase 1 で `docs/contracts/schema/reading-pass.schema.json` の disposition enum に 6 分類が articulate
2. Phase 2.5 で `generated-register` disposition が `references/04-tracking/generated/` 配下に machine inferred で auto-accept される
3. Phase 2.5 完了時に `needs-triage` 残数 == 0
4. Phase 5 で 6 分類すべての PR が Finding group 単位で landing 可能

### Lineage

- **preJudgementCommit**: `<TBD>`
- **judgementCommit**: `<TBD>`
- **retrospectiveCommit**: `<TBD>`

### 振り返り判定

- **判定**: `<未確定>`
- **観測点達成状況**: `<TBD>`
- **学習**: `<TBD>`

---

## ADR-SCP-012: Phase 5 PR 分割基準 = zone × disposition

### status

- 着手判断: **active**
- 振り返り判定: **未確定**

### context

plan.md Phase 5 で「1 Finding group = 1 PR」と articulate（AAG-SCP-MIGRATION-005）したが、Finding group の単位が未定義。zone 単位 / kind 単位 / disposition 単位 / owner 単位の選択肢がある。

肥大化抑止 + rollback granularity 確保 + review しやすさを満たす分割が必要。

### decision

Finding group の単位 = **zone × disposition**。

具体例:

```
phase5(zone-01-foundation): keep-and-contract
phase5(zone-01-foundation): split-history-to-archive
phase5(zone-01-foundation): move-to-project
phase5(zone-03-implementation): keep-and-contract
phase5(zone-03-implementation): move-project-plan-to-projects
phase5(zone-04-tracking): generated-register
phase5(zone-99-archive): archive-manifest-add
```

例外:

- 同 zone 同 disposition で entry 数が多い場合（split 等で 10+）は doc kind 単位で分割可（zone × disposition × kind）
- `disposition: needs-triage` は Phase 5 PR 対象外（Phase 2.5 で残数 0 にする）

想定 PR 数: 15〜25（6 zone × 6 disposition - 空組み合わせ）。

詳細: inquiry/07 §10 を参照。

### rationale

- **rollback granularity**: zone × disposition で独立 rollback 可能、影響範囲が局所化
- **review しやすさ**: 同 zone + 同 disposition のため reviewer の認知負荷が均一
- **肥大化抑止**: 1 PR が 1 zone の 1 disposition のみなので、自然と diff サイズが制限される
- **機械生成**: reading-decisions.yaml から zone × disposition で grouping し、PR タイトル / branch 名を auto 推定可能

### alternatives

- (a) **zone 単位のみ**（zone 内の全 disposition を 1 PR） — 却下: zone あたり 100+ files diff の可能性、review 困難
- (b) **disposition 単位のみ**（disposition 内の全 zone を 1 PR） — 却下: zone 跨ぎで影響範囲が広い、rollback 不能
- (c) **kind 単位のみ**（kind 内の全 zone × disposition を 1 PR） — 却下: kind が同じでも zone / disposition が異なる作業を混ぜる
- (d) **owner 単位**（同 owner の作業を 1 PR） — 却下: owner が repo 全体に跨ると PR が肥大化

### 観測点

1. Phase 5 開始時に reading-decisions.yaml から zone × disposition の grouping が機械生成される
2. 各 PR の diff size が中央値で 200 行以下に収まる（rollback 可能性確保）
3. 同 zone 同 disposition で entry 数 > 10 の場合に kind 単位の更なる分割が機械検出される
4. needs-triage 残数 == 0 で Phase 5 へ進む

### Lineage

- **preJudgementCommit**: `<TBD>`
- **judgementCommit**: `<TBD>`
- **retrospectiveCommit**: `<TBD>`

### 振り返り判定

- **判定**: `<未確定>`
- **観測点達成状況**: `<TBD>`
- **学習**: `<TBD>`

---

## ADR-SCP-013: Finding schema 最小 field set

### status

- 着手判断: **active**
- 振り返り判定: **未確定**

### context

Phase 1 で `docs/contracts/schema/aag-finding.schema.json` を landing するが、初期 schema が貧弱だと Phase 3〜10 の checker / triage / ratchet で field 不足が露呈し、後付けで schema 拡張が頻発する。最初から triage / ratchet / status trace が可能な field set を articulate すべき。

### decision

Finding schema 最小 field set:

```jsonc
{
  "id": "FND-DOC-TEMPORAL-001",
  "schemaVersion": "aag-finding-v1",
  "severity": "warn",
  "phase": "shadow",
  "subject": {
    "kind": "document",
    "path": "references/...",
    "lineRange": "84-90"
  },
  "rule": {
    "id": "DOC-TEMPORAL-PRESENT-ONLY",
    "category": "temporal-scope"
  },
  "problem": "<観測した現象 1 文>",
  "expected": "<期待される状態 1 文>",
  "suggestedDisposition": "move-to-project",
  "confidence": "medium",
  "falsePositiveAllowed": true,
  "detectedBy": "check-doc-temporal-scope",
  "detectedAt": {
    "commit": "<SHA>",
    "phase": "phase-2-5-reading-pass"
  },
  "status": "open"
}
```

特に必須 3 field:

- `confidence`: high | medium | low（shadow phase で low / medium 許容、hard-gate で high のみ）
- `suggestedDisposition`: triage candidate を機械提示（reading-decisions.yaml の disposition と同 enum）
- `status`: open | acknowledged | resolved | wontfix | superseded（lifecycle trace）

ID prefix:

- Finding ID は `FND-` prefix（Document ID の `DOC-` と区別、grep で識別可能）
- rule ID は `<CATEGORY>-<NAME>` 形式（例: `DOC-TEMPORAL-PRESENT-ONLY` / `TREE-UNMANAGED-TOPLEVEL` / `OBLIGATION-DRIFT-SHADOW`）

詳細: inquiry/07 §5 を参照。

### rationale

- **confidence**: shadow → hard-gate へ昇格時に false positive を機械 filter 可能
- **suggestedDisposition**: AI session の triage 工数を削減
- **status**: 同 finding が複数 phase で再検出された際に重複処理を抑止（superseded により旧 finding を closed 化）
- **FND- prefix**: grep / regex で Document ID と区別、誤参照を抑止

### alternatives

- (a) **最小 field のみ**（id / severity / problem / expected） — 却下: triage / ratchet / lifecycle trace が機能不全
- (b) **より多くの field**（component / module / urgency / impact 等） — 却下: 初期 schema が肥大化、運用 cost 増、後付け拡張で十分
- (c) **prefix なし**（Finding ID と Document ID を区別しない） — 却下: grep / regex 誤参照リスク

### 観測点

1. Phase 1 で `docs/contracts/schema/aag-finding.schema.json` が上記最小 set で landing
2. Phase 3〜10 の各 checker が Finding schema を共通 output として使用
3. shadow → new-only-gate → hard-gate の昇格時に confidence で filter 可能
4. status: superseded により、同種 finding の重複処理が抑止される

### Lineage

- **preJudgementCommit**: `<TBD>`
- **judgementCommit**: `<TBD>`
- **retrospectiveCommit**: `<TBD>`

### 振り返り判定

- **判定**: `<未確定>`
- **観測点達成状況**: `<TBD>`
- **学習**: `<TBD>`


---

## ADR-SCP-014: Guidance over restriction（AAG SCP 思想の articulate）

### status

- 着手判断: **active**
- 振り返り判定: **未確定**

### context

ADR-SCP-001〜013 で本 program の構造（Schema / Contract / Rule / Gate）が articulate されたが、それらが「AI を縛る管理システム」として読まれるリスクがある。実際には、AAG Structural Control Plane の目的は **AI が迷わず、余計な推測を減らし、より高い判断能力を発揮するための構造的補助**であり、AI を細かく拘束するものではない。

このリスクを放置すると、後続 phase で「AAG 違反 = AI 失敗」「Instruction Pack = AI 命令書」という誤解が institute され、実装 AI が defensive に振る舞う / 創造的判断を回避する / 表面的に compliance するだけ等の機能不全が起きる。

### decision

AAG SCP の思想を次のように articulate する:

#### 思想層別

```
思想 (= 不可変)
  → AI の判断を定性的に導くもの
  例: 「製本は現在の正本」「過去 = archive / 未来 = project / 計算済み現在 = generated」

Contract (= 構造的前提)
  → AI と repo が共有する構造的な前提
  例: doc-registry の kind / temporalScope / requiredSections

Guidance (= 文脈提供)
  → AI が良い判断をするための文脈・観点・参照先
  例: AI Instruction Pack（旧名「AI 命令書」ではなく「文書kindごとの guidance」）

Gate (= 構造破綻検出)
  → 構造的に判定可能な違反のみを foul する安全網
  例: 未登録 Markdown / generated 手編集 / 製本に Roadmap section
```

#### 合言葉の更新

- 旧: `Plan → Contract → Rule → Gate`（構造統制を強調するが「Rule」が拘束的）
- **新: `Plan → Context → Contract → Guidance → Gate`**（Context = AI が読む文脈、Guidance = 定性的補助、Gate = 構造破綻検出）

#### 4 sub-principle（GUIDANCE 系列）

##### AAG-SCP-GUIDANCE-001: 思想は AI を導く、能力を制限しない

AAG の思想・原則・文書型は、AI の能力を制限するためではなく、AI がより正確に判断するための **定性的ガイダンス** である。

##### AAG-SCP-GUIDANCE-002: 定性を定量に無理変換しない

定性的判断を定量ルールへ無理に変換してはならない。機械検証するのは、**未登録・欠落・混入・生成物手編集・時間軸違反など、構造的に判定可能なものに限定** する。「設計の良し悪し」「比喩の適切さ」「判断の妥当性」は機械検証 scope 外。

##### AAG-SCP-GUIDANCE-003: Instruction Pack は guidance、命令書ではない

AI に与える Instruction Pack は、出力を狭めるためではなく、**文書の目的・読者・粒度・時間軸・書くべき観点を明確にするための補助** である。Instruction Pack は AI の出力を機械的に拘束しない。

##### AAG-SCP-GUIDANCE-004: Gate は判断を代替しない

AAG Gate は AI の創造的判断や設計判断を代替しない。**Gate は構造破綻を防ぎ、判断すべき対象を明確化** する。設計判断・表現品質・文脈解釈は AI / human review の責務であり、Gate の責務ではない。

##### AAG-SCP-GUIDANCE-005: 仕組み化可能なものは仕組み化する（exhortation を mechanism に変換）

「やってはいけないこと」は **2 分類** する:

- **§A: 仕組み化できるもの** = 構造的に判定可能。**検出ロジック（検出装置 + landing phase）をセットで articulate + 実装** する。仕組み化せずに exhortation（「気をつける」）に留めない
- **§B: 仕組み化できないもの** = 設計判断 / 表現品質 / 文脈解釈 / mindset / design intent。AI / human review の責務として明示し、guard 化しない

判定 flow:

```
やってはいけないこと candidate
  ↓
構造的に判定可能か?
  Yes → §A: CI level で foul させる検出ロジックを articulate + 実装（mechanism）
  No  → §B: AI / human review の責務として明示、guard 化しない（review）
```

CLAUDE.md G8（「気をつける」ではなく mechanism として運用）と同じ思想。本 program では plan.md 「やってはいけないこと」section を §A / §B に分割し、§A の各項目に **検出装置 + landing phase + 違反根拠** を必須記述する。

§A の検出装置は本 program で **新設**（`tools/governance/check-*.ts` 群）または **既存 mechanism の拡張**（`docs:check` / `projectizationPolicyGuard` / `projectCompletionConsistencyGuard` 等）として実装する。

§B の項目は plan.md / inquiry / decision-audit に articulate するが、guard 化を試みない（AAG philosophy「製本されないものを guard 化しない」整合）。

##### AAG-SCP-GUIDANCE-006: 仕組み化できないものは AI 再チェック機会を提供する

§B（仕組み化できないもの）は **AI / human review に放置しない**。各項目に対し、AI が **判断の妥当性を再チェックできる文脈** を articulate する:

- **再チェック trigger**: いつ AI が再評価するか（PR review 時 / Instruction Pack 初参照時 / ADR landing 時 / Reading Pass disposition 確定時 等）
- **文脈提供 surface**: どこで AI に文脈が渡されるか（PR description template / Instruction Pack JSON の `philosophy` block / doc-kind-registry の `discriminationGuide` field 等）

判定 flow（GUIDANCE-005 + GUIDANCE-006 統合）:

```
やってはいけないこと candidate
  ↓
構造的に判定可能か?
  Yes → §A: 検出装置 + landing phase を articulate + 実装（CI foul）
  No  → §B: AI / human review の責務として明示
         + 再チェック trigger を articulate
         + 文脈提供 surface を articulate
         （= AI が判断妥当性を見直せる機会を構造的に確保）
```

**なぜ単なる "AI / human review に任せる" では不十分か**:

- AI は文脈なしには再評価できない（推測で判断する → 低 confidence）
- 「気をつける」だけでは drift する（CLAUDE.md G8 / GUIDANCE-005 と同じ理由）
- §B 項目を articulate しないまま放置すると、AI session が defensive に振る舞う / 自由判断を回避する

§B 項目は **soft mechanism** で運用する:

- soft = guard / CI で foul させない
- mechanism = 再チェック機会を構造的に提供する（template / philosophy block / discrimination guide 等）

具体的な context surface 例:

- **Instruction Pack JSON の `philosophy` block**: AI が初参照時に「This is guidance, not a command. Adapt to context.」を読む
- **PR description template**: Phase 5 PR で「rationaleSummary の妥当性確認」prompt を含める
- **ADR template の `振り返り判定` section**: wrap-up commit 時に rationale / alternatives 品質を AI が再評価
- **doc-kind-registry の `discriminationGuide` field**: kind 選択時に「kind A vs kind B の判別観点」を AI が読む
- **Reading Pass の `alternativesConsidered` field**（ADR-SCP-010 既 articulate）: AI が「他の kind / disposition も検討した」根拠を articulate
- **AI 自己レビュー section（既存 PZ-13、5 軸）**: 総チェック / 歪み検出 / 潜在バグ確認 / ドキュメント抜け漏れ確認 / CHANGELOG 更新 で archive 前の最終再評価

##### AAG-SCP-GUIDANCE-007: project-scoped 検出装置は **boundary protection に限定** + AI tool として提供 + archive で消失

§A（仕組み化可能）はさらに **§A1（AAG Core 永続）** と **§A2（project-scoped、AI tool、archive で消失）** に分けるが、§A2 は **「触ってはいけない / 変更してはいけない / 崩してはいけない」boundary protection に限定** する。

§A2 = boundary protection の image:

```
触ってはいけない   = 既存正本 / 既存実装層 / 既存 schema directory への変更を禁止
変更してはいけない = 既存正本の意味 / 既存契約 / 既存 invariant への破壊的変更を禁止
崩してはいけない   = 既存 governance 状態（advisory のみ等）/ 既存 boundary を崩さない
```

これらは **本 program の全期間（Phase 0〜10）を通じて一貫して禁止** される事項であり、phase 不変・parse 不要・`git` + `grep` だけで検出可能。

| 軸 | §A1: AAG Core 永続 | §A2: project-scoped boundary protection |
|---|---|---|
| **scope** | 全 repo / 全 program に普遍適用される構造ルール | 本 program 固有の **boundary protection**（既存正本 / 既存実装層 / 既存 governance 状態の不可触・不可変・不可崩） |
| **対象範囲** | parse-heavy も含む（schema validation / drift detection / phase ordering 等） | **parse-free 限定**。`git diff --name-only` / `grep` で検出可能なものに限る |
| **phase 依存** | 個別 phase（Phase 1 / 2.5 / 4 / 5 / 6 / 8a 等）に landing | **phase 不変**。本 program 全期間（Phase 0〜10）を通じて一貫して禁止 |
| **配置** | `tools/governance/check-*.ts`（既存 architecture-health pipeline 拡張も含む） | `projects/active/aag-structural-control-plane/aag/scp-checkers/` |
| **lifecycle** | 永続。本 program archive 後も残置 | 本 program archive 時に物理削除（Archive v2 §6.4 で `aag/` folder ごと削除対象） |
| **invocation** | pre-push / CI / docs:check に統合 | **AI tool として明示的に提供**（reposteward `aag scp check --project aag-structural-control-plane <checker>` 経由、または project's aag-engine subcommand として articulate） |
| **promotion path** | — | 通常は不要（boundary protection は本 program 固有 nonGoal、universal rule にはなりにくい） |

§A2 narrowing rationale:

- **「やってはいけない」より重い**: 単なる手続き上の禁止（一発切替禁止 / 順序逆行禁止 等）は phase 依存で parse-heavy になるため §A1 へ promote。§A2 は **本 program が約束する不可触・不可変・不可崩 boundary** に限定
- **AI tool として一貫**: §A2 は全 checker が `git` + `grep` 均質、AI が学ぶコストが小さい
- **archive 削除が文脈整合**: §A2 は本 program が archive されれば「約束が完遂された」状態であり、checker が消えるのが自然

##### §A2 の image: AI が安心してアクセルを踏むための事前ガードレール

§A2 boundary protection の本質は、**AI が事前にガードレールを敷いておくことで、本筋（Tree / Document / Temporal の構造補助設計）でアクセルを踏める**ことにある。

```
ガードレールなし:
  AI は自分が脱線していないか毎ステップ確認 (= defensive)
  → 創造的判断を回避 / 表面的 compliance / 速度低下

ガードレールあり (§A2):
  AI は本筋でアクセルを踏める
  → 万一脱線したら §A2 が catch
  → 速度と妥当性の両立
```

メタファー対応:

| 要素 | metaphor | 役割 |
|---|---|---|
| §A1（AAG Core 永続） | 道路交通法 / 高速道路の構造 | 全 program / 全 repo に適用される普遍ルール |
| **§A2（project-scoped guardrail）** | **このコース固有のガードレール** | 本 program の boundary protection、archive で撤去 |
| §B（再チェック trigger + 文脈提供） | 助手席の運転教官 / カーナビ | AI が判断時に参照する文脈 |
| Guidance（Instruction Pack） | 道路標識 / コース案内 | AI が文脈を取り違えないための補助 |
| Gate（構造破綻検出） | 崖際の鉄柵 | 本当に脱線した時だけ catch |

§A2 の存在意義は「AI を縛る」ではなく「**AI が安心してアクセルを踏めるように、事前にコースの境界を物理的に articulate する**」こと。これにより AI は本筋（構造補助の設計判断）に集中でき、boundary 逸脱の不安に認知資源を奪われない。

archive 時に §A2 が消えるのも、この metaphor で整合する: 本 program という「特定のコース」を走り終えれば、そのコース固有のガードレールは撤去される（次の program は別のコースなので、別のガードレールが要る）。

§A2 を AI tool として提供する理由:

- **AI が能動的に self-check 可能**: AI session が「app/src/ を touch していないか」「docs/contracts/aag/ を再配置していないか」等を自分で確認可能（reposteward `aag where-am-i` / `aag context --project` の延長線上）
- **CI の暗黙の foul ではない**: 隠れた制約として AI を defensive にせず、explicit な tool として AI が認識する
- **archive 後の削除が自然**: project の aag/ folder 自体が Archive v2 で削除されるため、§A2 checker が自動的に消える（恒久 dead code 化を防ぐ）

§A2 invocation 例（articulation only、Phase 1+ で実装。**4 件の boundary protection checker のみ**）:

```bash
# 本 program が active な間、AI が呼び出せる (= parse-free、git + grep only):
aag scp check --project aag-structural-control-plane app-untouched               # 触ってはいけない: app/src/
aag scp check --project aag-structural-control-plane docs-contracts-aag-untouched # 触ってはいけない: docs/contracts/aag/
aag scp check --project aag-structural-control-plane no-new-references-doc       # 触ってはいけない: references/ への新 .md 追加
aag scp check --project aag-structural-control-plane hard-gate-count             # 崩してはいけない: pre-push/CI advisory state
aag scp check --all  # = 本 program の全 §A2 checker (4 件) を一括実行

# archive 後（projects/completed/aag-structural-control-plane/）:
# aag/ folder が削除されているため、上記 command は該当 checker not found を返す
# (= 本 program が完遂すれば boundary protection の約束も終わる、文脈整合)
```

判定 flow（GUIDANCE-005〜007 統合）:

```
やってはいけないこと candidate
  ↓
構造的に判定可能か?
  No  → §B: AI / human review + 再チェック trigger + 文脈提供 surface（GUIDANCE-006）
  Yes ↓
       本 program 固有の制約か?
       No  → §A1: AAG Core 永続 checker（tools/governance/、pre-push/CI）
       Yes → §A2: project-scoped AI tool（projects/active/<id>/aag/、aag command、archive で消失）
```

archive 時の処理:

- §A1 checker: 残置（永続）
- §A2 checker: `projects/active/<id>/aag/` ごと物理削除（Archive v2 §6.4 既存 mechanism）
- §A2 → §A1 promotion 候補: 本 program 期間中に user 判断で promote 候補を articulate（archive 直前に決定、§A2 から §A1 に移動 + tools/governance/ に landing）

#### 定量・定性の分離（機械検証 scope の articulate）

| 機械検証する（Gate scope） | 定性的に AI を導く（Guidance scope） |
|---|---|
| 未登録 Markdown | この文書は何のためにあるか |
| requiredSections 欠落 | 読者は誰か |
| generated artifact の producer 不明 | どの粒度で説明すべきか |
| generated file の手編集 | 何を判断材料として扱うか |
| doc kind / topology mismatch | 過去・現在・未来をどう分けるか |
| 製本に TODO / Roadmap section | どのような設計思想を優先するか |
| 例外に owner / reason / reviewAfter なし | どの文脈を参照すべきか |
| YAML 変更後の generated JSON 未更新 | 比喩 / 表現の適切さ |

左側だけが foul 可能な構造ルール。右側は AI / human review の責務であり、AAG が無理に数値化しない。

### rationale

- AAG SCP の目的は **構造補助** であり、AI 拘束ではない（aag/_internal/strategy.md / meta.md の AAG 思想と整合: 「AI judgement + retrospective + commit-bound rollback」が前提、AI を信頼する設計）
- 定量・定性を混ぜると、定性領域に foul が侵入し AI session が defensive に振る舞う / 創造的判断を回避する / 表面的 compliance に陥る
- Instruction Pack を「命令書」と扱うと、AI が文脈無視で template 機械適用するだけになり、本来の「文脈把握 → 良い判断」が機能しない
- Gate を「失敗させる仕組み」と扱うと、Gate を回避する loophole 探しが発生し、構造統制の意図が腐敗する
- 「縛る」設計は短期的に compliance を高めるが、長期的に AI / human の創造性を毀損する。AAG philosophy「製本されないものを guard 化しない」「期間 buffer は anti-ritual」と同じ思想（信頼前提）

### alternatives

- (a) **思想を articulate しない** — 却下: 後続 phase で「AAG 違反 = AI 失敗」誤解が institute される
- (b) **GUIDANCE 系列を ADR ではなく plan.md 不可侵原則のみで articulate** — 却下: 思想の根拠（rationale / alternatives / 観測点）が trace 不能、後続 program で「なぜそうしたか」が失われる
- (c) **Instruction Pack を「Writing Context Pack」「Document Guidance Pack」に rename** — 却下: 既存 articulation（reposteward 等）との name continuity 喪失、本 ADR で「定義を再 articulate」する方が低 cost

### 観測点

1. plan.md 不可侵原則 11（Guidance over restriction）が landing
2. plan.md の合言葉が `Plan → Context → Contract → Guidance → Gate` に update
3. plan.md / inquiry/07 に定量・定性分離 table が landing
4. Phase 6 AI Instruction Pack の完了条件が「AI が文脈を取り違えずに能力を発揮するための guidance」として articulate（pre-write 拘束ではない）
5. Phase 3〜10 の各 checker の foul scope が「構造的に判定可能なもの」に限定される（設計判断・表現品質・文脈解釈は scope 外）
6. 後続 phase で AI session が defensive に振る舞わず、創造的判断を行える状態が維持される（state-based、Phase 5+ の各 PR で AI session の自由度が articulate される）

### Lineage

- **preJudgementCommit**: `<TBD = 760013c の次の commit、本 ADR landing 直前>`
- **judgementCommit**: `<TBD>`
- **retrospectiveCommit**: `<TBD>`

### 振り返り判定

- **判定**: `<未確定>`
- **観測点達成状況**: `<TBD>`
- **学習**: `<TBD>`

---

## ADR-SCP-015: Phase 1 implementation prep（§A2 scp-checkers の実装方式 + git diff baseRef + hard-gate-surface refactor + rename detection）

### status

- 着手判断: **active**
- 振り返り判定: **未確定**

### context

ADR-SCP-014 GUIDANCE-007 で §A2 を boundary protection 4 件に narrowing したが、Phase 1 着手前に **実装方式の詰めるべき 4 点** が user review で identify された:

1. aag-engine（Go binary）が TypeScript checker module をどう実行するか — Go から TS module を直接 load する設計は重い
2. `git diff` の baseRef 規約 — local pre-push / CI / fallback で異なる挙動になり得る
3. `hard-gate-count` は誤検知しやすい — `grep -c "hard.\?gate"` だとコメントや README 内 mention でも増える
4. `no-new-references-doc` の例外条件 — generated report / Reading Pass disposition / archive target / index update / rename detection の扱い

これらを Phase 1 着手前に articulate しないと、checker 実装が drift する / ローカルと CI で異なる finding が出る / 誤検知で advisory が機能不全になる。

### decision

#### D1: §A2 checker の実行方式 = **declarative YAML + TypeScript common runner**

- §A2 checker は **TypeScript module ではなく宣言的 YAML** として articulate
- 配置: `projects/active/aag-structural-control-plane/aag/scp-checkers/<checker>.yaml`（per-checker 1 ファイル）
- YAML schema 例:

```yaml
schemaVersion: scp-checker-v1
id: app-untouched
description: 触ってはいけない: app/src/ 配下の touch
imageMetaphor: must-not-touch
violationBasis: projectization.md §4 nonGoal
detectionMethod: git-diff
spec:
  diffMode: name-only  # name-only | name-status
  baseRefResolver: scp-baseRef  # ADR-SCP-015 D2 に従う
  pathPatterns:
    forbidden:
      - ^app/src/
    allowedExceptions: []
findingTemplate:
  ruleId: SCP-A2-APP-UNTOUCHED
  severity: warn
  suggestedDisposition: out-of-scope-for-this-program
```

- Common runner: `tools/governance/run-scp-checker.ts`（Phase 1 で landing）
  - YAML を parse → git diff 実行 → pattern match → Finding JSON 出力（ADR-SCP-013 schema）
  - Common runner 自体は §A1 配置（永続）。runner は project-specific 知識を持たない
- aag CLI（aag-engine、Go）: 薄い dispatcher。`aag scp check --project <id> <checker>` を `node tools/governance/run-scp-checker.mjs --project <id> --checker <checker>` に変換するだけ
- 利点:
  - parse-free 整合（`git` + `grep` ベースの宣言的 spec）
  - aag-engine（Go）が TS module を load する複雑さを回避
  - 新 checker 追加 = YAML 1 ファイル（runner 変更不要）
  - archive 時の削除 = YAML 削除のみ（runner は §A1 で永続）

#### D2: git diff baseRef 規約

baseRef 解決順序:

1. **環境変数 `SCP_BASE_REF`**（明示指定、最優先）
2. **CI 環境変数**（github.event.pull_request.base.sha or `${{ github.base_ref }}` の SHA 解決）
   - GitHub Actions: `GITHUB_BASE_REF` + `git merge-base origin/$GITHUB_BASE_REF HEAD`
3. **local pre-push**: `git rev-parse @{upstream} 2>/dev/null` → 失敗なら `origin/main`
4. **fallback**: `HEAD~1`

実行 command 規約:

- 通常: `git diff --name-only ${BASE_REF}..HEAD`
- 追加検出: `git diff --name-only --diff-filter=A ${BASE_REF}..HEAD`
- rename 含む: `git diff --name-status -M ${BASE_REF}..HEAD`（D4 で使用）

scp-checker.yaml の `baseRefResolver: scp-baseRef` は上記 4 段階を common runner が共通解決する。各 checker で個別実装しない。

#### D3: hard-gate-count → **hard-gate-surface** に rename + baseline 比較方式

`hard-gate-count`（grep -c）は誤検知が多いため廃止。代わりに `hard-gate-surface`:

- baseline file: `projects/active/aag-structural-control-plane/aag/scp-checkers/hard-gate-surface.baseline.json`（Phase 1 開始時に landing、ratchet-down 対象）
- 構造:

```jsonc
{
  "$comment": "本 program 開始時の hard gate surface baseline。Wave 1 milestone 到達まで増やさない。",
  "schemaVersion": "scp-baseline-v1",
  "capturedAtCommit": "<SHA at Phase 1 start>",
  "hardGate": {
    "workflowJobs": [],         // .github/workflows/ から hard gate として動く job 名
    "requiredChecks": [],       // GitHub branch protection で required と articulate される check
    "prePushExitOneSteps": [],  // tools/git-hooks/pre-push 内で exit 1 する step ID
    "npmScriptGates": []        // package.json scripts で gate として呼ばれる script 名
  }
}
```

- 検出ロジック（hard-gate-surface.yaml）:
  1. baseline file を読む
  2. 現在の `.github/workflows/` / `tools/git-hooks/pre-push` / `package.json` から `hardGate.*` を再収集
  3. baseline と現在を意味的 diff（set 比較）
  4. **増加方向のみ finding**（減少 = ratchet-down OK）

- workflow / pre-push / package.json は parse 必要だが、**well-known config file** であり Markdown semantic 解析や TS AST 解析ではない（§A2 parse-free 原則の精神は「内容意味の解析を避ける」であり、構造化 config の field 抽出は許容）
- baseline の更新: Wave 1 milestone 到達後の user 判断でのみ可（parse-free を maintain しつつ ratchet-down で hard gate 追加）

#### D4: no-new-references-doc の例外条件 + rename detection

許可される例外:

1. **Reading Pass disposition target**: `document-reading-decisions.yaml` 内の `disposition: split | move | archive` に対応する `splitTargets` / `moveTo` / `archiveTo` path（生成された path）
2. **generated report**: file path が `*.generated.md` / `*.generated.json` パターンに一致 AND `docs/contracts/src/governance/generated-artifacts.yaml` に producer 宣言済み（Phase 9 以降）
3. **archive target**: file path が `^references/99-archive/` 配下 AND 同一 directory 内に `archive-manifest.json` 存在（または `references/99-archive/` 配下 zone semantics で暫定許可）
4. **index update**: file 名が `README.md` AND modification（addition ではない）— rename / addition 検出から exclude
5. **本 program 自身の inquiry / Phase 0 deliverable**: `^projects/active/aag-structural-control-plane/` 配下は本 checker scope 外

rename detection 規約:

- `git diff --name-status -M ${BASE_REF}..HEAD` を使用（`-M` で similarity-based rename detection）
- `R<N>` status の場合（rename 検出）: addition としてカウントしない
- `A` status のみが addition として finding 対象
- Reading Pass `disposition: move` の `moveTo` path は rename として記録される想定（git mv 相当）

検出 flow（no-new-references-doc.yaml）:

```yaml
schemaVersion: scp-checker-v1
id: no-new-references-doc
description: 触ってはいけない: references/ への新 .md 追加
imageMetaphor: must-not-touch
detectionMethod: git-diff
spec:
  diffMode: name-status  # rename 検出のため
  diffOptions: -M
  baseRefResolver: scp-baseRef
  pathPatterns:
    forbidden:
      - ^references/.*\.md$
    forbiddenStatuses: [A]  # Addition のみ。R (rename) / M (modify) は許可
    allowedExceptions:
      - reading-pass-disposition  # document-reading-decisions.yaml と join
      - generated-report          # *.generated.{md,json} pattern + producer 宣言確認
      - archive-target            # ^references/99-archive/ + archive-manifest.json 存在
      - readme-index-update       # README.md の modification only
      - this-program-deliverable  # ^projects/active/aag-structural-control-plane/
```

### rationale

- **D1（declarative YAML + common runner）**: Go から TS module load の重さを回避 + parse-free 原則整合 + checker 追加コスト最小化 + archive 削除が file 削除のみで完結
- **D2（baseRef 4 段階解決）**: ローカルと CI で同じ finding を返す保証（drift 防止）+ `SCP_BASE_REF` 環境変数で test 容易
- **D3（hard-gate-surface + baseline）**: grep -c の誤検知を解消 + ratchet-down で hard gate 追加を抑止 + baseline で観測可能
- **D4（5 例外 + rename detection）**: 例外条件の articulate により誤検知を抑止 + Reading Pass disposition との join で「許可される追加」を機械判定可能 + rename detection で git mv が誤検知されない

### alternatives

- **D1 alternative (a)**: TypeScript module を直接 load（AAG CLI が Go → TS bridge を持つ） — 却下: Go binary の責務肥大化、test 困難
- **D1 alternative (b)**: 各 checker を独立 shell script で実装 — 却下: parse-free 維持できるが、共通 logic（baseRef 解決 / Finding JSON 出力 / 例外条件 join）の重複
- **D2 alternative (a)**: `HEAD~1..HEAD` のみ — 却下: PR 全体でなく直近 commit のみ check、PR 単位 finding 不能
- **D2 alternative (b)**: `main..HEAD` 固定 — 却下: feature branch から feature branch への分岐で誤動作
- **D3 alternative (a)**: 全 hard gate を grep で count — 却下: 誤検知過多
- **D3 alternative (b)**: hard gate 検出を完全に手動化 — 却下: drift 検出機能を失う
- **D4 alternative (a)**: 例外条件なし、references/ への新 doc 一律禁止 — 却下: Reading Pass split target の追加が永久に禁止される、機能不全
- **D4 alternative (b)**: rename を addition として扱う — 却下: Reading Pass `disposition: move` が誤検知される

### 観測点

1. Phase 1 で `tools/governance/run-scp-checker.ts` (common runner) と各 §A2 checker YAML が landing
2. `aag scp check --project aag-structural-control-plane <checker>` 呼び出しが local pre-push と CI で同じ Finding JSON を返す
3. `hard-gate-surface` が baseline file を持ち、ratchet-down 検証で動作
4. `no-new-references-doc` が 5 例外条件を機械判定し、Reading Pass disposition target / rename を誤検知しない
5. archive 時に `aag/scp-checkers/` 配下 YAML + baseline ごと削除されるが、`tools/governance/run-scp-checker.ts` (common runner) は §A1 として残置

### Lineage

- **preJudgementCommit**: `<TBD = 78d265c の次の commit、本 ADR landing 直前>`
- **judgementCommit**: `<TBD>`
- **retrospectiveCommit**: `<TBD>`

### 振り返り判定

- **判定**: `<未確定>`
- **観測点達成状況**: `<TBD>`
- **学習**: `<TBD>`
