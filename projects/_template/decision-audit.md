# decision-audit — &lt;PROJECT-ID&gt;

> 役割: L3 重判断 institution (= drawer Pattern 1 application、複数 Phase に跨る判断の lineage articulation)。
>
> 規約: `references/05-aag-interface/protocols/complexity-policy.md` §3.4 + `references/05-aag-interface/drawer/decision-articulation-patterns.md` Pattern 1。
>
> **テンプレートの使い方:**
> 1. `projects/_template/` を `projects/active/<新 project id>/` にコピーする
> 2. 各セクションの `<PROJECT-ID>` / `<DA-α-N>` / `<...>` プレースホルダを実値で置換する
> 3. 必要なら DA-α-000 (= 進行モデル decision) を最初の entry として articulate する
> 4. 後続 DA-α-001〜N は各 Phase landing commit 時に追記する
> 5. 本コメントブロックを削除する
>
> **L 別必要性** (= `projectization-policy.md` §4 早見表):
> - L0 / L1: 不要 (= 本 file 自体を作らない)
> - L2: 任意 (= L3 寄りなら articulate 推奨)
> - L3 / L4: 推奨 (= guard 強制はないが、L3 重変更 routing が発生したら DA institute 必須、`complexity-policy.md` §3.4)

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
> - 完遂後の archive 時に `archive.manifest.json` の `decisionEntries` (= id + title + commitSha) に圧縮される (= Archive v2)
>
> **参考実装** (= active 期 articulation のリッチ例は archive 圧縮済のため、archive.manifest.json の decisionEntries で id + title + commitSha を確認):
>
> - `projects/completed/aag-platformization/archive.manifest.json` (= AAG Pilot first instance、8 DA entry / 14 commitLineage)
> - `projects/completed/aag-self-hosting-completion/archive.manifest.json`
> - `projects/completed/operational-protocol-system/archive.manifest.json` (= 6 DA entry / 14 commitLineage)

## DA-α-000: 本 project の進行モデル決定 (= テンプレート例、必要に応じて articulate)

> **note**: DA-α-000 は「本 project をどう進めるか」の進行モデル decision を articulate する慣例 entry。
> AAG Pilot 以降の L3 project で institute されており、後続 DA-α-001〜N の判断土台となる。
> 進行モデルが既存 program と同一 (= 領域 agnostic) で articulate 不要な場合は本 entry を skip してよい。

### status

- 着手判断: **&lt;active / closed&gt;** (= 仮 sha 段階 / 振り返り判定済み)
- 振り返り判定: **&lt;未確定 / 正しい / 部分的 / 間違い&gt;**

### context

&lt;本 project が L3 architecture-refactor (= projectization.md §2 判定理由) で、Phase 構成と判断点の articulate が必要な背景。&gt;

### decision

&lt;進行モデルとして採用する pattern。例:&gt;

1. AI judgement + retrospective + commit-bound rollback (= drawer Pattern 1 application)
2. §13.1 Phase landing + wrap-up 二段 commit pattern を全 Phase で適用
3. §13.2 Atomic dependent update commit pattern を references/ 配下新 doc 追加時に適用
4. §13.3 Post-flip regen pattern を checkbox flip を含む全 commit に適用

### rationale

- &lt;なぜこの decision を採用するか。drawer Pattern 整合 / 過去 program での実証 / §13 commit pattern integration / 不可侵原則整合 等。&gt;

### alternatives

- (a) &lt;代替案 1 と却下理由&gt;
- (b) &lt;代替案 2 と却下理由&gt;
- (c) &lt;代替案 3 と却下理由&gt;

### 観測点 (= 判断後に true となるべき検証可能 observation)

1. &lt;観測点 1 = 機械検証可能 or 完了基準&gt;
2. &lt;観測点 2&gt;
3. &lt;観測点 3&gt;
4. &lt;観測点 4&gt;
5. &lt;観測点 5&gt;

### Lineage

- **preJudgementCommit**: `&lt;SHA&gt;` (= judgement 直前の commit、rollback target)
- **judgementCommit**: `&lt;TBD&gt;` (= landing commit SHA、wrap-up commit で update)
- **retrospectiveCommit**: `&lt;TBD&gt;` (= wrap-up commit SHA、振り返り判定 articulate 時に確定)
- **judgementTag**: 未設定 (= AI infrastructure で annotated tag 不可なら SHA 直接参照で代替)
- **rollbackTag**: 未設定 (= 同上)

### 振り返り判定

- **判定**: `&lt;未確定 / 正しい / 部分的 / 間違い&gt;`
- **観測点達成状況**: &lt;各観測点が達成されたか / 未達なら理由&gt;
- **学習**: &lt;後続 Phase / 後続 program に継承すべき学習&gt;

---

## DA-α-N: &lt;Phase N 着手判断 タイトル&gt; (= テンプレート例、各 Phase landing で追加)

### status

- 着手判断: **&lt;active / closed&gt;**
- 振り返り判定: **&lt;未確定 / 正しい / 部分的 / 間違い&gt;**

### context

&lt;Phase N 着手前の状況 + 何を判断する必要があったか。&gt;

### decision

&lt;採用した方針。&gt;

### rationale

- &lt;判断理由&gt;

### alternatives

- (a) &lt;代替案と却下理由&gt;

### 観測点

1. &lt;観測点&gt;

### Lineage

- **preJudgementCommit**: `&lt;SHA&gt;`
- **judgementCommit**: `&lt;TBD&gt;`
- **retrospectiveCommit**: `&lt;TBD&gt;`

### 振り返り判定

- **判定**: `&lt;未確定&gt;`
- **観測点達成状況**: &lt;TBD&gt;
- **学習**: &lt;TBD&gt;
