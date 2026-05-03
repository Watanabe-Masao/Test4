# plan — taxonomy-v2（親: 分類体系の制度化）

> 本 project は **responsibility-taxonomy-v2 / test-taxonomy-v2 の 2 軸を束ねる親**。
> Constitution（7 不可侵原則）と interlock 仕様を固定し、両軸が相互契約を持つ
> 状態を AAG 第 3 の柱として恒久化する。実装は子 project が担う。

## 7 不可侵原則（両軸共通）

| #   | 原則                        | 短い意味                                                                       |
| --- | --------------------------- | ------------------------------------------------------------------------------ |
| 1   | **未分類は分類である**      | `R:unclassified` / `T:unclassified` を能動タグとして扱う。タグなしは CI fail   |
| 2   | **1 タグ = 1 軸**           | 責務 × 純粋性 × 層を 1 つのタグに押し込めない。軸ごとに別 namespace            |
| 3   | **語彙生成は高コスト儀式**  | 新タグ追加は review window のみ。日常作業では `R:unclassified` に退避          |
| 4   | **Tag ↔ Test は双方向契約** | タグが test obligation を発行し、test が tag contract を検証する               |
| 5   | **Origin は記録する**       | 全タグに Why（導入理由）+ When（採択日）+ Who（採択者）+ Sunset 条件を持たせる |
| 6   | **Antibody Pair を持つ**    | 各タグは対概念タグと相互制約を持つ（例: `R:authoritative` ↔ `R:bridge`）       |
| 7   | **Cognitive Load Ceiling**  | 1 人が把握できる語彙量を超えない（運用上限 = 15 前後）                         |

### 原則の位相

- 原則 1〜3: **語彙の扱い方**（create / retire / unclassified）
- 原則 4: **軸間 interlock**（responsibility ↔ test）
- 原則 5〜7: **語彙の寿命管理**（record / pair / ceiling）

原則違反は全て AAG guard で hard fail。例外許容パターンなし（ratchet も設けない）。

---

## Interlock 仕様（責務軸 × テスト軸）

責務タグは **test obligation** を発行する。テストタグは **tag contract** を検証する。
親の Phase 1 で以下のマトリクスを正本化する（値は子 Phase 0 で精査）:

| R:tag            | 必須 T:kind                           | 任意 T:kind             | 備考                                  |
| ---------------- | ------------------------------------- | ----------------------- | ------------------------------------- |
| `R:calculation`  | `T:unit-numerical`, `T:boundary`      | `T:invariant-math`      | 数値的契約を持つため invariant を推奨 |
| `R:bridge`       | `T:contract-parity`                   | `T:fallback-path`       | current ⇔ candidate 境界              |
| `R:read-model`   | `T:zod-contract`, `T:null-path`       | —                       | parse fail fast + 欠損正常系          |
| `R:guard`        | `T:meta-guard`                        | `T:allowlist-integrity` | guard 自身の契約テスト                |
| `R:presentation` | `T:render-shape`                      | `T:side-effect-none`    | 描画形状のみ検証                      |
| `R:store`        | `T:state-transition`                  | —                       | state のみ保有するため                |
| `R:hook`         | `T:dependency-list`, `T:unmount-path` | —                       | deps 完全性・unmount safety           |
| `R:unclassified` | なし（**T:unclassified** が対応）     | —                       | review window 待ち                    |

- マトリクス未登録の組み合わせは guard で block
- R:tag 追加は T:kind 追加と**同じ review window**で裁定する
- 片軸だけの追加は禁止（interlock 崩壊を防ぐ）

---

## 8 昇華メカニズム（継続監視）

| #   | メカニズム                      | 正本                                                  | 何を観測                                |
| --- | ------------------------------- | ----------------------------------------------------- | --------------------------------------- |
| 1   | **Origin Journal**              | `references/01-foundation/taxonomy-origin-journal.md` | 全タグの Why/When/Who/Sunset            |
| 2   | **Antibody Pairs**              | `taxonomy-pairs.json`                                 | 対概念タグの相互制約                    |
| 3   | **Cognitive Load Ceiling**      | health KPI                                            | 語彙総数 ≤ 15（軸ごと）                 |
| 4   | **Bidirectional Contract**      | `taxonomy-interlock.json`                             | R ⇔ T マトリクス整合                    |
| 5   | **Entropy Monitoring**          | health KPI                                            | 未分類件数・未分類比率・タグ使用偏り    |
| 6   | **Review Journal**              | `references/04-tracking/taxonomy-review-journal.md`     | 各 review window の追加・撤退・却下記録 |
| 7   | **AI Vocabulary Binding**       | `CLAUDE.md` §taxonomy-binding                         | AI が新タグを勝手に作らない制約         |
| 8   | **Constitution Bootstrap Test** | `constitutionBootstrapGuard.test.ts`                  | 7 原則ファイルの存在・参照整合          |

---

## 親 Phase 構造（4 Phase）

### Phase 1: Constitution 起草

**目的:** 7 不可侵原則と interlock 仕様を固定する。子 project が実装を起動できる状態を必達。

**成果物:**

- `references/01-foundation/taxonomy-constitution.md`（7 原則）
- `references/01-foundation/taxonomy-interlock.md`（R ⇔ T マトリクス仕様）
- `references/01-foundation/taxonomy-origin-journal.md`（初期記入: 現行 v1 の 20 タグ）
- `CLAUDE.md` §taxonomy-binding 追記（AI Vocabulary Binding）
- `constitutionBootstrapGuard.test.ts`（原則文書の存在検証）

**受け入れ条件:** 子 Phase 0 Inventory が Constitution を参照して開始可能。

### Phase 2: Review Window 仕様

**目的:** 語彙の追加・撤退・却下を扱う四半期 review window の運用を明文化する。

**成果物:**

- `references/03-implementation/taxonomy-review-window.md`（手続き + 判定基準 + 記録形式）
- `references/04-tracking/taxonomy-review-journal.md`（journal skeleton）
- 同期 window ルール: 両軸の追加・撤退は同一 window で裁定

**受け入れ条件:** 初回 review window の開催手順が記述されている。

### Phase 3: 子 project 立ち上げ（承認ゲート）

**目的:** 両子 project の Phase 0 着手を承認し、並行進行を起動する。

**成果物:**

- 子 2 件の Phase 0 キックオフ承認記録
- 共通 Inventory Schema（両軸が同じ CanonEntry 形を使う合意）

**受け入れ条件:** 両子 Phase 0 が Constitution + interlock 仕様に基づき着手されている。

### Phase 4: 制度成立確認 + archive

**目的:** 制度成立 5 要件を満たし、親・子を archive する。

**制度成立 5 要件:**

1. 両子 Phase 9（Legacy Collection）完了
2. health KPI: 未分類件数 ≤ baseline（両軸）+ 未分類比率 安定
3. Cognitive Load Ceiling 維持（語彙 ≤ 15 / 軸）
4. 四半期 review window が 2 回以上記録されている
5. interlock マトリクスの違反件数 = 0（連続 2 四半期）

**受け入れ条件:** 5 要件全クリア + 人間レビュー承認 → archive。

---

## やってはいけないこと

- **親で実装を持つ** → Constitution / 仕様のみ。タグ書き換え等の個別作業は子に委譲
- **片軸だけ先行する** → interlock が崩れる。両子は同期進行
- **review window 外での新タグ追加** → 原則 3 違反。例外なし
- **未分類を "debt" として扱う** → 原則 1 違反。未分類は能動的分類であり eliminate 目標ではない
- **"authoritative" と同じ語を意味違いで併用** → semantic-classification-policy.md と同じ轍を踏まない
- **AI が自発的に新タグを提案** → CLAUDE.md §taxonomy-binding で block。提案は review window でのみ

---

## 関連実装

| パス                                                   | 役割                               |
| ------------------------------------------------------ | ---------------------------------- |
| `app/src/test/responsibilityTagRegistry.ts`            | 現行 v1 正本（子で v2 に拡張）     |
| `app/src/test/guards/responsibilityTagGuard.test.ts`   | 現行 v1 guard                      |
| `app/src/test/guards/testSignalIntegrityGuard.test.ts` | 現行 TSIG（v2 でタグ認識化）       |
| `projects/completed/responsibility-taxonomy-v2/`                 | 子: 責務軸（Phase 0-9）            |
| `projects/completed/test-taxonomy-v2/`                           | 子: テスト軸（Phase 0-9）          |
| `projects/pure-calculation-reorg/`                     | 姉妹 project（同じ制度化フレーム） |

---

## Operational Control System（運用制御システム — 仕様正本）

> **位置付け**: 本 § は **親 project の正本仕様**。実装は子 project（responsibility-taxonomy-v2 / test-taxonomy-v2）が担う（不可侵原則「親で実装を持つ禁止」を維持）。
>
> 7 不可侵原則 + Interlock + 8 昇華メカニズムは **Constitutional Correctness** を保証する。本 § はそれが「継続的に正しく使われる運用モデル」を定義し、Constitution を **継続稼働する運用制御システム** に昇華させる。
>
> 同様のパターンを phased-content-specs-rollout（content state layer）が先行採用済。本 § はその taxonomy 軸への適用（仕様正本のみを持ち、実装は子に委譲）。

### §OCS.1. 3 種類の正しさを分離する

| 正しさの種類                                                        | 保証する仕組み                                                  | taxonomy-v2 系が触るか                     |
| ------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------ |
| **State Correctness** — registry と実装ファイルのタグが一致         | registry / inventory / co-change guard                          | **触る（子の Phase 3 + 6 が保証主体）**    |
| **Constitutional Correctness** — タグが 7 原則 + Interlock を満たす | constitutionBootstrapGuard / interlock guard / vocabulary guard | **触る（親 Phase 1 + 子 Phase 3 で確定）** |
| **Decision Correctness** — そのタグ・追加・撤退判断が業務上妥当     | review window / Origin Journal / 人間承認                       | 触らない（review window 経路で別管理）     |

**運用ルール**: 親 Constitution + 子 Schema + 各 R/T tag spec の冒頭にこの 3 層分離を明記する。

### §OCS.2. Evidence Level（Origin Journal の拡張）

各 R/T tag に `evidenceLevel` を frontmatter で付与する。

```yaml
tag: R:calculation
evidenceLevel: tested
evidence:
  origin: references/01-foundation/taxonomy-origin-journal.md#R-calculation
  interlock: references/01-foundation/taxonomy-interlock.md#R-calculation
  guards:
    - app/src/test/guards/responsibilityTagGuardV2.test.ts
  tests:
    - <T:unit-numerical を満たす test>
```

| Level       | 意味                               | 運用                      |
| ----------- | ---------------------------------- | ------------------------- |
| `generated` | registry から機械生成された事実    | **最強**。CI で保証       |
| `tested`    | T:kind obligation が満たされている | Interlock 保証            |
| `guarded`   | guard で違反が検出される           | 構造保証                  |
| `reviewed`  | review window で承認済             | Decision の証跡           |
| `asserted`  | Origin Journal にだけ記載          | 許すが high-risk では禁止 |
| `unknown`   | 根拠不明                           | 原則 5 違反、禁止         |

**high-risk tag の判定基準**（`asserted` 禁止対象）:

- Antibody Pair を持つタグ（`R:authoritative ↔ R:bridge` 等）
- Interlock マトリクスで required T:kind を発行するタグ
- Cognitive Load Ceiling 残数 ≤ 3 のタグ

### §OCS.3. taxonomy:check / taxonomy:impact 仕様

```bash
npm run taxonomy:check                                  # CI hard fail 条件
npm run taxonomy:impact -- --base main --head HEAD      # PR レビュー用
```

`taxonomy:check` の hard fail 条件（仕様正本）:

| 条件                                                         | 対応 AR rule                        |
| ------------------------------------------------------------ | ----------------------------------- |
| 未登録タグの検出                                             | `AR-TAXONOMY-KNOWN-VOCABULARY`      |
| タグなしの検出（`R:unclassified` / `T:unclassified` は許可） | `AR-TAXONOMY-NO-UNTAGGED`           |
| R:tag に対応する required T:kind の欠落                      | `AR-TAXONOMY-INTERLOCK`             |
| Origin metadata 欠落                                         | `AR-TAXONOMY-ORIGIN-REQUIRED`       |
| review window 外の新タグ追加                                 | `AR-TAXONOMY-AI-VOCABULARY-BINDING` |
| 1 タグに複数軸混在                                           | `AR-TAXONOMY-ONE-TAG-ONE-AXIS`      |
| Cognitive Load Ceiling 超過                                  | `AR-TAXONOMY-COGNITIVE-LOAD`        |

`taxonomy:impact` 出力例:

```
Changed file:
  app/src/domain/calculations/foo.ts
Detected responsibility:
  R:calculation
Required tests (from Interlock matrix):
  T:unit-numerical
  T:boundary
Found tests:
  T:unit-numerical
Missing:
  T:boundary
Result:
  fail
```

**PR テンプレ追加項目**（本 § 完成後）:

- [ ] `npm run taxonomy:check` が PASS
- [ ] `npm run taxonomy:impact` で affected R:tag / T:kind を確認
- [ ] high-risk tag の追加・撤退は review window で承認済

### §OCS.4. Lifecycle State Machine（review window との接続）

各タグは次の 6 状態を持つ。状態遷移は review window でのみ承認される。

```text
proposed → active → deprecated → sunsetting → retired → archived
```

| 状態         | 意味                             | review window で必要な記録          |
| ------------ | -------------------------------- | ----------------------------------- |
| `proposed`   | review window で提案中           | Why / When / Who（提案者）          |
| `active`     | 採択済、現役                     | 採択日 + 採択 window 番号           |
| `deprecated` | 新規使用禁止、既存 consumer あり | `replacedBy` 必須                   |
| `sunsetting` | consumer 撤退中、期限あり        | `sunsetCondition` + `deadline` 必須 |
| `retired`    | source 削除済、ID は欠番保持     | retired 日 + 撤退 window 番号       |
| `archived`   | 歴史参照のみ                     | —                                   |

**guard で守ること**（`AR-TAXONOMY-LIFECYCLE`、後続案）:

- `deprecated` には `replacedBy` 必須
- `sunsetting` には `sunsetCondition` + `deadline` 必須
- `retired` には active consumer 0 必須
- `active` なのに registry にない → fail
- registry にあるのに `archived` → fail

子 Phase 7（v1 Deprecation）/ Phase 8（v1 Retirement）/ Phase 9（Legacy Collection）が
本 Lifecycle に従う。

### §OCS.5. Promotion Gate（成熟度レベル）

タグの運用成熟度を Level で表現する。新タグは L0 から始まり、review window 経由で昇格する。

| Level  | 条件                                                             |
| ------ | ---------------------------------------------------------------- |
| **L0** | Not tracked（提案 only、registry 登録なし）                      |
| **L1** | Registered（registry 登録済）                                    |
| **L2** | Origin-linked（Origin Journal に Why/When/Who 記録済）           |
| **L3** | Interlock-bound（Interlock マトリクスに required T:kind 登録済） |
| **L4** | Guarded（guard で違反検出可）                                    |
| **L5** | Coverage 100%（全対象ファイルに付与済）                          |
| **L6** | Health-tracked（architecture-health KPI に入っている）           |

> **canonical 名**: 各 Level の英語名 (`Not tracked` / `Registered` / `Origin-linked` / `Interlock-bound` / `Guarded` / `Coverage` / `Health-tracked`) は **Constitution §6 と本節で同一**。drift は `constitutionBootstrapGuard.test.ts` B12 が機械検証する。

**Phase 別到達目標**:

- 親 Phase 1 完遂時: 既存 v1 タグ 20 件が L2 到達（Origin 記録）
- 子 Phase 3 完遂時: Anchor Slice 5 R:tag + 6 T:kind が L4 到達（Guard active）
- 子 Phase 6 完遂時: 全タグが L5 到達（Coverage 100%）
- 親 Phase 4 制度成立時: 全タグが L6 到達（Health KPI 統合）

各 R/T spec frontmatter に `promotionLevel: L4` を持たせ、子 Phase 3 で baseline を計測する。

### §OCS.6. Drift Budget（許容予算 + Cognitive Load Ceiling との接続）

```json
{
  "taxonomy": {
    "responsibility": {
      "untagged": { "budget": 0 },
      "unknownVocabulary": { "budget": 0 },
      "missingOrigin": { "budget": 0 },
      "vocabularyCount": { "ceiling": 15 }
    },
    "test": {
      "untagged": { "budget": 0 },
      "unknownVocabulary": { "budget": 0 },
      "missingOrigin": { "budget": 0 },
      "vocabularyCount": { "ceiling": 15 }
    },
    "interlock": {
      "missingObligations": { "budget": 0 },
      "violations": { "budget": 0 }
    },
    "reviewWindow": {
      "expiredProposals": { "budget": 0 },
      "outOfWindowAdditions": { "budget": 0 }
    }
  }
}
```

| 指標                                     | 推奨 budget    | 理由                                     |
| ---------------------------------------- | -------------- | ---------------------------------------- |
| `untagged`（responsibility / test 両軸） | 0              | 原則 1: 未分類は能動タグ、タグなしは禁止 |
| `unknownVocabulary`                      | 0              | 原則 3: 語彙生成は儀式、ad-hoc 追加禁止  |
| `missingOrigin`                          | 0              | 原則 5: Origin は記録する                |
| `vocabularyCount.ceiling`                | 15 / 軸        | 原則 7: Cognitive Load Ceiling           |
| `interlock.violations`                   | 0              | 原則 4: 双方向契約                       |
| `reviewWindow.outOfWindowAdditions`      | 0              | 原則 3 + 8 昇華メカニズム #7             |
| `reviewWindow.expiredProposals`          | 一時 budget 可 | review window 開催遅延の許容             |

子 Phase 3 で baseline 計測 → Phase 6 で 0 到達 → 親 Phase 4 で health KPI へ反映。

### §OCS.7. Children への absorption 戦略（Anchor Slice）

本 § で **Anchor Slice** を指定する。Anchor Slice は両子で同じ R/T 組合せ。

**Anchor Slice 5 R:tag**（責務軸）:

| R:tag            | 選定理由                                        |
| ---------------- | ----------------------------------------------- |
| `R:calculation`  | 数値契約 + invariant、test obligation が明確    |
| `R:bridge`       | current ⇔ candidate 境界、Antibody Pair 顕著    |
| `R:read-model`   | parse fail fast + 欠損正常系、Zod contract 顕著 |
| `R:guard`        | meta-guard 必要、自己契約の archetype           |
| `R:presentation` | 描画形状のみ、side-effect-none 顕著             |

**対応 T:kind 6 件**（テスト軸、Interlock マトリクス上の required）:

- `T:unit-numerical`（R:calculation 必須）
- `T:boundary`（R:calculation 必須）
- `T:contract-parity`（R:bridge 必須）
- `T:zod-contract`（R:read-model 必須）
- `T:meta-guard`（R:guard 必須）
- `T:render-shape`（R:presentation 必須）

**absorption の段階**:

| 段階                  | 子 Phase                              | 何が起きるか                                    |
| --------------------- | ------------------------------------- | ----------------------------------------------- |
| 1: Anchor 着手        | responsibility-Phase 3 + test-Phase 3 | Anchor 5+6 のみで guard active 化、保証経路完成 |
| 2: 全 vocabulary 拡大 | 両子 Phase 6                          | 残全 R:tag / T:kind に対象拡大                  |
| 3: Health KPI 接続    | 親 Phase 4                            | taxonomy-health.json + architecture-health 統合 |

> **目的**: Anchor Slice の目的は「対象網羅」ではなく **「保証経路完成」**。
> 5 R:tag + 6 T:kind で Constitution → registry → guard → CI → health KPI の
> end-to-end が動作することを確認する。これが動けば、後続は同じ仕組みの拡大。

### §OCS.8. Exception Policy

review window 外で例外的にタグ追加・撤退・guard 緩和が必要な場合の形式。

```yaml
exceptions:
  - id: TXE-001
    rule: AR-TAXONOMY-NO-UNTAGGED
    target: app/src/<path>
    reason: "<なぜ許容するか>"
    owner: architecture
    expiresAt: 2026-05-15
    sunsetCondition: "<何が起きたら例外を取り下げるか>"
```

**例外に必須**: `reason` / `owner` / `expiresAt` / `sunsetCondition`。
**期限超過例外は hard fail**。例外数も `architecture-health.json` の
`taxonomy.exceptions.{total, expired}` に出す。

### §OCS.9. Human Review Boundary（粒度固定）

#### review window 必須

- 新 R:tag / T:kind の追加（原則 3）
- 既存タグの retirement（active → deprecated）
- Antibody Pair の組み換え
- Cognitive Load Ceiling の引き上げ
- AR-TAXONOMY-\* rule baseline の緩和
- Lifecycle 状態遷移（active → deprecated 等）

#### review window 不要（自動承認）

- registry 登録済タグの新規ファイルへの付与
- Origin Journal の `lastReviewedAt` 更新
- guard baseline の ratchet-down（増加方向は禁止）
- low-risk tag の prose 説明の軽微な文言修正

### §OCS.10. 4 ループの Operational Model

| ループ                | 構成                                         | 担う品質                   |
| --------------------- | -------------------------------------------- | -------------------------- |
| **Capture Loop**      | source → registry → inventory → graph        | State Correctness          |
| **Verification Loop** | guard → test obligation → CI                 | Constitutional + Interlock |
| **Change Loop**       | taxonomy:impact → review window → merge      | Decision の証跡            |
| **Governance Loop**   | Origin Journal → Cognitive Load → health KPI | 長期運用の制御             |

この 4 ループが回ると、taxonomy-v2 は「制度文書」から
**継続稼働する運用制御システム** に昇華する。

### §OCS.11. Phase との対応マッピング

親 Phase 1〜4 + 子 Phase 0〜9 の各 dimension への対応:

| 親 Phase                                          | 主に活性化する OCS dimension                                                               |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **親 Phase 1: Constitution**                      | §OCS.1（3 層分離）/ §OCS.2 Evidence Level skeleton / §OCS.3 仕様明文化 / §OCS.5 L0-L2 定義 |
| **親 Phase 2: Review Window**                     | §OCS.4 Lifecycle / §OCS.8 Exception Policy / §OCS.9 Human Review Boundary                  |
| **親 Phase 3: 子立ち上げ**                        | §OCS.7 children absorption（Anchor Slice 確定）/ §OCS.5 baseline 約束                      |
| **親 Phase 4: 制度成立**                          | §OCS.5 L6 到達 / §OCS.6 Drift Budget / §OCS.10 4 ループ稼働                                |
| **子 responsibility Phase 3 / test Phase 3**      | §OCS.5 L3-L4 到達（Anchor Slice）/ §OCS.10 Capture + Verification                          |
| **子 両 Phase 5 Operations**                      | §OCS.3 taxonomy:impact / §OCS.10 Change Loop                                               |
| **子 両 Phase 6 Migration Rollout**               | §OCS.5 L5 到達（Coverage 100%）                                                            |
| **子 両 Phase 7-9 Deprecation/Retirement/Legacy** | §OCS.4 Lifecycle 適用 / §OCS.8 Exception 撤退                                              |

---

## AR-TAXONOMY-\* rule 仕様（仕様正本）

> **位置付け**: 本 § は親 plan が **rule 名 + 受け入れ条件**を確定する。registry 登録 + active 化は子 Phase 3（Guard 実装）が担う（実装は子）。
>
> 7 件は Constitution + Interlock + Operational Control System のすべての契約を機械検証する。

| AR rule ID                          | 検証内容                                                     | hard fail 条件                                                                | 関連原則 / OCS               |
| ----------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------- | ---------------------------- |
| `AR-TAXONOMY-NO-UNTAGGED`           | タグなしを禁止（`R:unclassified` / `T:unclassified` は許可） | 対象 file が R:_ または T:_ タグを持たない                                    | 原則 1                       |
| `AR-TAXONOMY-KNOWN-VOCABULARY`      | registry 未登録タグを禁止                                    | 対象 file が registry に存在しない R:_ / T:_ を使用                           | 原則 3                       |
| `AR-TAXONOMY-ONE-TAG-ONE-AXIS`      | 責務 × 純粋性 × 層を 1 タグに混在させない                    | タグが複数 namespace（R:_ / P:_ / L:\* 等）を含む                             | 原則 2                       |
| `AR-TAXONOMY-INTERLOCK`             | R:tag に対応する required T:kind が存在                      | 対象 file が R:tag を持つが Interlock 上の required T:kind を持つ test がない | 原則 4                       |
| `AR-TAXONOMY-ORIGIN-REQUIRED`       | Why / When / Who / Sunset 条件の欠落を禁止                   | registry entry に origin metadata が欠落                                      | 原則 5                       |
| `AR-TAXONOMY-COGNITIVE-LOAD`        | 軸ごとの語彙数が上限を超えたら fail または review required   | registry の R:_ または T:_ が 15 を超過                                       | 原則 7                       |
| `AR-TAXONOMY-AI-VOCABULARY-BINDING` | review window 外の新タグ追加を block                         | git diff で新タグ追加が検出され、対応 review window record がない             | 原則 3 + 8 昇華メカニズム #7 |

**baseline 戦略**: 子 Phase 3 で baseline=current 値で追加 → Phase 6 / 親 Phase 4 で 0 到達。
ratchet-down のみ許可、増加方向に戻さない。

---

## taxonomy-health.json schema（仕様正本）

> **位置付け**: 親 plan が schema を確定する。collector 実装は子 Phase 3（Guard 実装）+ 親 Phase 4（health KPI 統合）が担う。
>
> 出力先: `references/04-tracking/generated/taxonomy-health.json`。`architecture-health.json` summary に `taxonomy.*` カテゴリとして反映。

```json
{
  "taxonomy": {
    "responsibility": {
      "totalTargets": 0,
      "tagged": 0,
      "untagged": 0,
      "unclassified": 0,
      "unknownVocabulary": 0,
      "missingOrigin": 0,
      "vocabularyCount": 0,
      "promotionLevel": {
        "L0": 0,
        "L1": 0,
        "L2": 0,
        "L3": 0,
        "L4": 0,
        "L5": 0,
        "L6": 0
      }
    },
    "test": {
      "totalTargets": 0,
      "tagged": 0,
      "untagged": 0,
      "unclassified": 0,
      "unknownVocabulary": 0,
      "missingOrigin": 0,
      "vocabularyCount": 0,
      "promotionLevel": {
        "L0": 0,
        "L1": 0,
        "L2": 0,
        "L3": 0,
        "L4": 0,
        "L5": 0,
        "L6": 0
      }
    },
    "interlock": {
      "requiredObligations": 0,
      "missingObligations": 0,
      "violations": 0
    },
    "vocabulary": {
      "responsibilityCount": 0,
      "testCount": 0,
      "responsibilityOverCeiling": false,
      "testOverCeiling": false
    },
    "reviewWindow": {
      "pendingProposals": 0,
      "accepted": 0,
      "rejected": 0,
      "retired": 0,
      "outOfWindowAdditions": 0
    },
    "exceptions": {
      "total": 0,
      "expired": 0
    },
    "lifecycle": {
      "proposed": 0,
      "active": 0,
      "deprecated": 0,
      "sunsetting": 0,
      "retired": 0,
      "archived": 0
    }
  }
}
```

**threshold / budget は §OCS.6 を正本とする**。collector はその値を読み出して violation を判定する。

---

## Common Inventory Schema（CanonEntry — 仕様正本）

> **位置付け**: 親 Phase 3 で確定する **両軸共通の CanonEntry 形**。
> 子 Phase 0 Inventory が出力する `references/04-tracking/responsibility-taxonomy-inventory.yaml`
> および `references/04-tracking/test-taxonomy-inventory.yaml` の各 entry が本 schema に
> 適合する。両軸が同じ shape を使うことで、§OCS.7 Anchor Slice 段階 1（保証経路完成）と
> §OCS.10 Capture Loop（source → registry → inventory → graph）を機械的に接続できる。

### CanonEntry shape

```yaml
# 1 entry = 1 (axis, target) ペア
- axis: responsibility | test
  target: <relative path to file or test ID>
  # 責務軸: app/src/domain/calculations/foo.ts のような file path
  # テスト軸: app/src/test/guards/foo.test.ts#describe-block のような test 識別子

  # === 現状（v1 / TSIG での分類）===
  currentTag: R:* | T:* | "untagged" | "mismatch"
  # 責務軸: 現行 responsibilityTagRegistry の R:tag、または "untagged"（タグなし）/ "mismatch"（registry と実装の不一致）
  # テスト軸: 現行 TSIG-* rule の適用名、または "untagged"

  # === 親 plan §OCS.5 Promotion Gate（初期到達 Level）===
  promotionLevel: L0 | L1 | L2 | L3 | L4 | L5 | L6
  # Phase 0 Inventory 完了時点では既存 v1 タグは L1（Registered）または L2（Origin-linked）が初期値
  # 未分類は L0（proposed）

  # === 親 plan §OCS.4 Lifecycle State Machine ===
  lifecycle: proposed | active | deprecated | sunsetting | retired | archived
  # 既存 v1 タグは active が初期値、未分類は proposed

  # === 親 plan §OCS.2 Evidence Level ===
  evidenceLevel: generated | tested | guarded | reviewed | asserted | unknown

  # === 親 plan §OCS.5 L2 Origin-linked の入力 ===
  origin:
    why: <なぜこのタグを付与したか> # legacy で不明なら "legacy, origin unknown"
    when: <採択日 YYYY-MM-DD or commit/PR 番号> # legacy で不明なら "legacy, origin unknown"
    who: <提案者 / 承認者 username> # legacy で不明なら "legacy, origin unknown"
    sunsetCondition: <何が起きたら撤退するか> # 撤退条件が不明なら null

  # === 親 plan §OCS.7 Anchor Slice 帰属 ===
  anchorSlice:
    inAnchor: true | false
    # 責務軸 Anchor 5 R:tag: R:calculation / R:bridge / R:read-model / R:guard / R:presentation
    # テスト軸 Anchor 6 T:kind: T:unit-numerical / T:boundary / T:contract-parity / T:zod-contract / T:meta-guard / T:render-shape
    anchorTag: R:* | T:* | null

  # === 親 plan §Interlock 仕様の入口（Phase 0 では空でも許容）===
  interlock:
    requiredObligations: [<対応軸のタグ>]
    # 責務軸 entry → 対応 required T:kind list
    # テスト軸 entry → 対応 R:tag list
    foundObligations: [<対応軸のタグ>]
    # Phase 0 baseline では実態を記録するのみ。違反 0 化は子 Phase 6 / 親 Phase 4 で達成

  # === 親 plan §OCS.6 Drift Budget の baseline 入力 ===
  driftBudget:
    untagged: <0 or 1> # currentTag == "untagged" なら 1
    unknownVocabulary: <0 or 1> # currentTag が registry 未登録なら 1
    missingOrigin: <0 or 1> # origin.why / when / who のいずれかが null なら 1
```

### Phase 0 Inventory の必達品

両子 Phase 0 完了時点で以下が成立すること:

| 項目                          | 責務軸                                                                       | テスト軸                                         |
| ----------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------ |
| Schema 適合 entry 件数        | 35+ 対象 file 全件                                                           | 既存 test 全件                                   |
| `anchorSlice.inAnchor: true`  | Anchor 5 R:tag に該当する entry を最低 1 件ずつ                              | Anchor 6 T:kind に該当する entry を最低 1 件ずつ |
| `driftBudget` baseline        | 軸全体の untagged / unknownVocabulary / missingOrigin の合計が記録されている | 同左                                             |
| `promotionLevel: L2` の entry | 既存 v1 の 20 タグ（親 Phase 1 残 2 checkbox）                               | 既存 TSIG-\* rule の全件                         |

### consume 経路

```
[子 Phase 0 Inventory]
       ↓ 出力
inventory.yaml（CanonEntry 配列）
       ↓ 入力
[子 Phase 1 Schema 設計]   ← currentTag 分布から v2 vocabulary を導出
[子 Phase 3 Guard 実装]    ← anchorSlice.inAnchor + driftBudget で baseline ratchet-down
[親 Phase 4 制度成立確認]   ← driftBudget 合計 → taxonomy-health.json → architecture-health.json
```

### 整合検証の責務分担

| 検証内容                                            | 担い手                                             |
| --------------------------------------------------- | -------------------------------------------------- |
| YAML schema 適合（field 名・型）                    | 子 Phase 0 deliverable（手動 or schema validator） |
| `anchorSlice.anchorTag` が §OCS.7 で定義された値か  | 子 Phase 3 guard（Anchor Slice path guard）        |
| `promotionLevel` 値が L0-L6 のいずれかか            | 子 Phase 3 guard（taxonomy:check）                 |
| `evidenceLevel` 値が §OCS.2 の 6 値のいずれかか     | 子 Phase 3 guard（taxonomy:check）                 |
| `driftBudget` 合計が §OCS.6 budget を超えていないか | 親 Phase 4 collector（taxonomy-health.json）       |
