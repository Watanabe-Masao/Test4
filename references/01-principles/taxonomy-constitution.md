# taxonomy-constitution — 分類体系 v2 の Constitution

> **役割**: `taxonomy-v2` family（責務軸 + テスト軸）の **7 不可侵原則** + **Operational Control System** + **制度成立 5 要件** の Constitution。
>
> **位置付け**: 設計原則（規範）。`projects/taxonomy-v2/plan.md` の §不可侵原則 / §Interlock / §OCS は本文書を canonical source として参照する。
>
> **改訂規律**: 本文書は **review window 経由でのみ改訂**可能（原則 3 + AR-TAXONOMY-AI-VOCABULARY-BINDING）。AI が単独で原則を書き換えることは禁止。
>
> **status**: **draft（Phase 1 起草中）**。Constitution 本体 landed → Origin Journal + Interlock + bootstrap guard 完成で `final` に昇格。

## 1. なぜ Constitution が必要か（前段）

責務分類は **AAG 第 3 の柱** として運用される（第 1 = Architecture Rule、第 2 = Principles、第 3 = Taxonomy）。第 1・第 2 と異なり、Taxonomy は語彙そのものが時間とともに腐敗する性質を持つ:

- 新タグが「捨て場」化する（v1 では `R:utility` が 33 件、軸の混在で意味喪失）
- タグなしと未分類の区別がなくなる（v1: 未分類 400 件 + タグ不一致 48 件）
- 軸が混在する（責務 × 純粋性 × 層が 1 タグに押し込まれる）
- 採択経緯が忘却される（誰が・なぜ・いつのタグかが分からない）
- AI が ad-hoc にタグを増やす（語彙爆発）

これらは guard だけでは防げない。**「語彙そのものをどう扱うか」の制度** が必要。本 Constitution はその制度を明文化する。

## 2. 3 種類の正しさを分離する（OCS.1）

Constitution + Taxonomy が **何を保証し、何を保証しないか** を 3 層に分離する。これを混同すると過剰期待が起こる。

| 正しさの種類 | 保証する仕組み | 本 Constitution が触るか |
|---|---|---|
| **State Correctness** — registry と実装ファイルのタグが一致 | registry / inventory / co-change guard | **触る**（子 Phase 3 + 6 が保証主体） |
| **Constitutional Correctness** — タグが 7 原則と Interlock を満たす | constitutionBootstrapGuard / interlock guard / vocabulary guard | **触る**（本 Constitution + AR-TAXONOMY-* で確定） |
| **Decision Correctness** — そのタグ・追加判断・撤退判断が業務上妥当 | review window / Origin Journal / 人間承認 | **触らない**（review window 経路で別管理） |

> **重要**: タグ付けが green でも behavior が正しいとは限らない（State Correctness は behavior を保証しない）。タグが原則に従っていても判断が業務上妥当とは限らない（Constitutional Correctness は Decision を保証しない）。3 層を混同せず、各々の保証経路を別々に評価する。

## 3. 7 不可侵原則

原則違反は全て AAG guard で hard fail。例外許容パターンなし（ratchet も設けない）。

### 原則 1: 未分類は分類である

`R:unclassified` / `T:unclassified` を **能動タグ** として扱う。タグなし（タグの欠落）は CI fail。

- **何が壊れるか**: タグなしを許すと「未分類は debt である」という誤った認識が生まれ、未分類 0 件が目標となる。これは Cognitive Load Ceiling（原則 7）と衝突する。判断保留も能動的選択として価値がある
- **どう守るか**: `AR-TAXONOMY-NO-UNTAGGED`（plan §AR-TAXONOMY-* 仕様正本）。タグなし検出で hard fail、`R:unclassified` / `T:unclassified` のみ許可
- **判断**: 「分かる前に決めない」「決めるまで `unclassified` で保留」を制度化する

### 原則 2: 1 タグ = 1 軸

責務 × 純粋性 × 層を 1 つのタグに押し込めない。軸ごとに別 namespace（`R:` / `T:` / etc.）。

- **何が壊れるか**: 軸の混在は v1 の `R:utility`（33 件 = 「その他」捨て場）を生んだ。役割と純度と層が 1 タグに混じると、guard 検証で何を見ればよいか定義不能になる
- **どう守るか**: `AR-TAXONOMY-ONE-TAG-ONE-AXIS`。1 ファイルのタグが複数 namespace を含むと hard fail
- **判断**: 軸を増やすときは新 namespace prefix を導入（review window 必須）

### 原則 3: 語彙生成は高コスト儀式

新タグ追加は **review window** のみ。日常作業では `R:unclassified` に退避。

- **何が壊れるか**: ad-hoc にタグを増やすと語彙爆発（Cognitive Load Ceiling 突破）+ 採択経緯忘却（Origin 記録欠落）+ 軸の混在（捨て場タグ生成）
- **どう守るか**: `AR-TAXONOMY-AI-VOCABULARY-BINDING`。git diff で新タグ追加が検出され、対応 review window record（journal entry）がない場合 hard fail
- **判断**: 「困ったら新タグ」ではなく「困ったら `unclassified`」。新タグの提案は四半期 review window のみ

### 原則 4: Tag ↔ Test は双方向契約

タグが test obligation を発行し、test が tag contract を検証する（Interlock マトリクス）。

- **何が壊れるか**: 片方向だけだとタグの意味が runtime で検証されない（記述だけの飾り）。R:tag が「このファイルは X 責務」と主張しても、対応する T:kind の test がなければ実態保証なし
- **どう守るか**: `AR-TAXONOMY-INTERLOCK`。R:tag を持つファイルが Interlock 上の required T:kind を持つ test を持たないと hard fail
- **判断**: R:tag 追加は対応 T:kind の追加と **同じ review window** で裁定する。片軸だけの追加禁止

### 原則 5: Origin は記録する

全タグに **Why（導入理由）+ When（採択日）+ Who（採択者）+ Sunset 条件** を持たせる。

- **何が壊れるか**: 経緯不明のタグは「なぜそれがあるか」「いつ消せるか」が分からなくなり、永遠に温存される（archive できない）
- **どう守るか**: `AR-TAXONOMY-ORIGIN-REQUIRED`。registry entry に origin metadata（Why/When/Who/Sunset）が欠落すると hard fail
- **判断**: 過去の v1 タグ（経緯不明）は `legacy-unknown` を Origin として記録（Phase 0 Inventory で実施）。新タグは review window で必ず Origin 記録

### 原則 6: Antibody Pair を持つ

各タグは **対概念タグ** と相互制約を持つ（例: `R:authoritative` ↔ `R:bridge`、`T:contract-parity` ↔ `T:fallback-path`）。

- **何が壊れるか**: 対概念がないタグは「全部に付けてもいい」状態になり、識別力を失う（識別力 = "X" であることは "non-X" でないこと）
- **どう守るか**: registry の Antibody Pair 整合性を guard で検証（`taxonomy-pairs.json` 正本）。pair の片側だけ存在する状態を block
- **判断**: 新タグ提案時に「対概念は何か」を必ず併記する。pair 不在のタグは review window で reject

### 原則 7: Cognitive Load Ceiling

1 人が把握できる語彙量を超えない（運用上限 = **15 前後 / 軸**）。

- **何が壊れるか**: 語彙が膨張すると「どのタグを使えばよいか」を毎回考えるコストが accumulate し、結局誰も使わなくなる（v1 の責務軸 20 タグでも既に飽和傾向）
- **どう守るか**: `AR-TAXONOMY-COGNITIVE-LOAD`。registry の R:* または T:* が 15 を超過すると fail または review required
- **判断**: 上限を引き上げる場合は review window で承認（OCS.9 Human Review Boundary 必須対象）。日常は「新タグを増やす前に既存タグの統合 / `unclassified` で保留」を優先

### 原則の位相

- 原則 1〜3: **語彙の扱い方**（create / retire / unclassified）
- 原則 4: **軸間 interlock**（responsibility ↔ test）
- 原則 5〜7: **語彙の寿命管理**（record / pair / ceiling）

## 4. Interlock 仕様（責務軸 × テスト軸）

責務タグは **test obligation** を発行する。テストタグは **tag contract** を検証する。
詳細マトリクスは `taxonomy-interlock.md` を canonical source とする。本節は要約のみ。

| R:tag | 必須 T:kind | 任意 T:kind | 備考 |
|---|---|---|---|
| `R:calculation` | `T:unit-numerical`, `T:boundary` | `T:invariant-math` | 数値的契約を持つため invariant を推奨 |
| `R:bridge` | `T:contract-parity` | `T:fallback-path` | current ⇔ candidate 境界 |
| `R:read-model` | `T:zod-contract`, `T:null-path` | — | parse fail fast + 欠損正常系 |
| `R:guard` | `T:meta-guard` | `T:allowlist-integrity` | guard 自身の契約テスト |
| `R:presentation` | `T:render-shape` | `T:side-effect-none` | 描画形状のみ検証 |
| `R:store` | `T:state-transition` | — | state のみ保有するため |
| `R:hook` | `T:dependency-list`, `T:unmount-path` | — | deps 完全性・unmount safety |
| `R:unclassified` | なし（`T:unclassified` が対応） | — | review window 待ち |

- マトリクス未登録の組み合わせは guard で block（`AR-TAXONOMY-INTERLOCK`）
- R:tag 追加は T:kind 追加と **同じ review window** で裁定する（原則 4）
- 片軸だけの追加は禁止（interlock 崩壊を防ぐ）

詳細マトリクス + AR-TAXONOMY-INTERLOCK 検証ロジックは `taxonomy-interlock.md` を参照。

## 5. Evidence Level（OCS.2）

各 R/T tag に `evidenceLevel` を frontmatter で付与する。タグそのものの **証拠の強さ** を 6 段階で示す。

| Level | 意味 | 運用 |
|---|---|---|
| `generated` | registry から機械生成された事実 | **最強**。CI で保証 |
| `tested` | T:kind obligation が満たされている | Interlock 保証 |
| `guarded` | guard で違反が検出される | 構造保証 |
| `reviewed` | review window で承認済 | Decision の証跡 |
| `asserted` | Origin Journal にだけ記載 | 許すが high-risk では禁止 |
| `unknown` | 根拠不明 | 原則 5 違反、禁止 |

### high-risk タグの判定基準（`asserted` 禁止対象）

以下のいずれかを満たすタグは high-risk と判定し、`asserted` を禁止する。少なくとも `reviewed` 以上を必須とする:

- Antibody Pair を持つタグ（原則 6）
- Interlock マトリクスで required T:kind を発行するタグ（原則 4）
- Cognitive Load Ceiling 残数 ≤ 3 のタグ（原則 7）

frontmatter 例:

```yaml
tag: R:calculation
evidenceLevel: tested
evidence:
  origin: references/01-principles/taxonomy-origin-journal.md#R-calculation
  interlock: references/01-principles/taxonomy-interlock.md#R-calculation
  guards:
    - app/src/test/guards/responsibilityTagGuardV2.test.ts
  tests:
    - <T:unit-numerical を満たす test>
```

### Phase J 段階導入（plan §OCS.2 + 子 plan）

Evidence Level の運用は子 Phase J で段階導入する:

- J1: `evidenceLevel` 任意項目として導入
- J2: 6 分類を確定
- J3: high-risk tag の `asserted` 禁止
- J4: `tested` claim の test 参照欠落 = 0
- J5: `guarded` claim の guard 参照欠落 = 0

## 6. Promotion Gate L0〜L6（OCS.5）

タグの運用成熟度を Level で表現する。新タグは L0 から始まり、review window 経由で昇格する。

| Level | 条件 | 何が達成済か |
|---|---|---|
| **L0** | proposed only（registry 登録なし） | 提案のみ |
| **L1** | registry 登録済（Registered） | vocabulary 登録 |
| **L2** | Origin Journal に Why/When/Who 記録（Origin-linked） | 採択経緯記録（原則 5） |
| **L3** | Interlock マトリクスに required T:kind 登録（Interlock-bound） | 軸間契約（原則 4） |
| **L4** | guard で違反検出可（Guarded） | 機械検証稼働 |
| **L5** | 全対象ファイルに付与済（Coverage 100%） | 実態 100% タグ付け |
| **L6** | architecture-health KPI に入っている（Health-tracked） | 長期運用監視 |

### Phase 別到達目標（plan §OCS.5）

| Phase | 到達目標 |
|---|---|
| 親 Phase 1（Constitution）完遂時 | 既存 v1 タグ 20 件が **L2** 到達（Origin 記録） |
| 子 Phase 3（Guard 実装）完遂時 | Anchor Slice 5 R:tag + 6 T:kind が **L4** 到達（Guard active） |
| 子 Phase 6（Migration Rollout）完遂時 | 全タグが **L5** 到達（Coverage 100%） |
| 親 Phase 4（制度成立確認）完遂時 | 全タグが **L6** 到達（Health KPI 統合） |

各 R/T spec frontmatter に `promotionLevel: L4` を持たせ、子 Phase 3 で baseline を計測する。

## 7. 4-Loop Operational Model（OCS.10）

Constitution が **継続的に正しく使われる** ためには、以下の 4 ループが同時に回る必要がある:

| ループ | 構成 | 担う品質 |
|---|---|---|
| **Capture Loop** | source → registry → inventory → graph | State Correctness |
| **Verification Loop** | guard → test obligation → CI | Constitutional + Interlock |
| **Change Loop** | taxonomy:impact → review window → merge | Decision の証跡 |
| **Governance Loop** | Origin Journal → Cognitive Load → health KPI | 長期運用の制御 |

この 4 ループが回ると、taxonomy-v2 は「制度文書」から **継続稼働する運用制御システム** に昇華する。

各ループの実装は子 Phase 0〜9 + 親 Phase 4（制度成立確認）で段階的に稼働する。詳細は `projects/taxonomy-v2/plan.md` §OCS.10 / §OCS.11 を参照。

## 8. AR-TAXONOMY-* rule（仕様正本へのリンク）

7 件の Architecture Rule で 7 不可侵原則 + Interlock + OCS の各契約を機械検証する。
**rule の詳細仕様 + 受け入れ条件は `projects/taxonomy-v2/plan.md` §AR-TAXONOMY-* を canonical source とする**。本節は原則との対応 map のみ。

| AR rule ID | 対応原則 / OCS | 一行要約 |
|---|---|---|
| `AR-TAXONOMY-NO-UNTAGGED` | 原則 1 | タグなし禁止（`R:unclassified` / `T:unclassified` は許可） |
| `AR-TAXONOMY-KNOWN-VOCABULARY` | 原則 3 | registry 未登録タグ禁止 |
| `AR-TAXONOMY-ONE-TAG-ONE-AXIS` | 原則 2 | 軸の混在禁止 |
| `AR-TAXONOMY-INTERLOCK` | 原則 4 | R:tag ↔ required T:kind の存在検証 |
| `AR-TAXONOMY-ORIGIN-REQUIRED` | 原則 5 | Why/When/Who/Sunset 必須 |
| `AR-TAXONOMY-COGNITIVE-LOAD` | 原則 7 | 軸ごとの語彙 ≤ 15 |
| `AR-TAXONOMY-AI-VOCABULARY-BINDING` | 原則 3 + 8 昇華メカニズム #7 | review window 外の新タグ追加禁止 |

### baseline 戦略

- 子 Phase 3（Guard 実装）で baseline=current 値で追加
- 子 Phase 6（Migration Rollout）/ 親 Phase 4（制度成立確認）で 0 到達
- ratchet-down のみ許可、増加方向に戻さない

## 9. 制度成立 5 要件

`taxonomy-v2` family（親 + 子 2 件）が archive 可能と判定される条件。**5 要件全てを満たした上で人間レビュー承認**で初めて archive に進む。

1. **両子 Phase 9（Legacy Collection）完了**
   - `projects/responsibility-taxonomy-v2/` archive 済（Phase 0-9 全 [x]）
   - `projects/test-taxonomy-v2/` archive 済（Phase 0-9 全 [x]）

2. **未分類件数 baseline 安定（両軸）**
   - `taxonomy-health.json` の `responsibility.untagged` / `test.untagged` が baseline 以下で **連続 2 四半期** 安定
   - `unclassified` 件数の変動が monotonic（ad-hoc な急増がない）

3. **Cognitive Load Ceiling 維持（原則 7）**
   - `taxonomy-health.json` の `vocabulary.responsibilityCount` ≤ 15
   - `taxonomy-health.json` の `vocabulary.testCount` ≤ 15
   - 両方とも **連続 2 四半期** 維持

4. **四半期 review window が 2 回以上記録**
   - `references/02-status/taxonomy-review-journal.md` に独立した 2 回の window record
   - 各 window record に追加 / 撤退 / 却下が少なくとも 1 件以上記載されている（運用実績の確認）

5. **Interlock マトリクス違反件数 = 0（連続 2 四半期）**
   - `taxonomy-health.json` の `interlock.violations` = 0
   - `taxonomy-health.json` の `interlock.missingObligations` = 0
   - **連続 2 四半期** 維持

### Operational Control System 稼働確認（追加要件）

上記 5 要件に加え、plan §OCS.10 4-Loop Operational Model が実際に稼働していることを確認する:

- Capture Loop: `source → registry → inventory → graph` が稼働
- Verification Loop: `guard → test obligation → CI` が稼働（`AR-TAXONOMY-*` 7 件 active）
- Change Loop: `taxonomy:impact → review window → merge` が稼働（`taxonomy:impact` CLI 動作）
- Governance Loop: `Origin Journal → Cognitive Load → health KPI` が稼働（`taxonomy-health.json` 生成）

## 10. 関連文書

| 文書 | 役割 |
|---|---|
| `references/01-principles/taxonomy-interlock.md` | R ⇔ T マトリクス（本 Constitution §4 の詳細） |
| `references/01-principles/taxonomy-origin-journal.md` | 全タグの Why/When/Who/Sunset（本 Constitution §3 原則 5 の正本） |
| `projects/taxonomy-v2/plan.md` | 親 plan（本 Constitution を canonical source として参照） |
| `projects/responsibility-taxonomy-v2/plan.md` | 子: 責務軸の Phase 0-9 |
| `projects/test-taxonomy-v2/plan.md` | 子: テスト軸の Phase 0-9 |
| `app/src/test/guards/constitutionBootstrapGuard.test.ts` | 本 Constitution + 関連 4 ファイルの存在検証 |
| `references/02-status/taxonomy-review-journal.md` | review window 記録（Phase 2 で skeleton landing） |
| `references/02-status/generated/taxonomy-health.json` | health KPI（Phase 3 + Phase 4 で landing） |
| `CLAUDE.md` §taxonomy-binding | AI Vocabulary Binding（review window 外の新タグ提案禁止） |
| `references/01-principles/adaptive-architecture-governance.md` | AAG 全体（本 Constitution は AAG 第 3 の柱） |
