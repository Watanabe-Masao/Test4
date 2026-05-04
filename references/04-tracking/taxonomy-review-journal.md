# taxonomy-review-journal — review window 記録

> **役割**: `taxonomy-v2` family の **review window**（四半期）の **提案 / 採択 / 条件付き採択 / 保留 / 却下 / 例外承認** の運用記録。
> Constitution 原則 3「語彙生成は高コスト儀式」+ 親 plan §OCS.4 Lifecycle / §OCS.8 Exception Policy の運用記録。
>
> **改訂規律**: 本 journal の改訂は **review window** 経由のみ（メタ運用は §改訂規律）。
> AI が単独で entry を追加・改変することは禁止（Constitution 原則 3 + AR-TAXONOMY-AI-VOCABULARY-BINDING）。
> **唯一例外**: AI が `R:unclassified` / `T:unclassified` 退避後に「提案 entry を起草」する行動。これは `references/03-implementation/taxonomy-review-window.md` §7.2 で許可される。
>
> **status**: **active（Phase 2 完了直後、初回 review window 待ち）**。

## 1. 本 journal が記録するもの

各 review window で発生した:

- **提案中（draft）**: 提案 entry がここに集積、開催前にレビュー対象として確定
- **採択（accepted）**: 全判定基準を満たし採択されたもの → registry / Constitution / Interlock 反映済
- **条件付き採択（conditional）**: 一部修正を経て次回 window で確認するもの
- **保留（postponed）**: 次回 window へ繰り越し
- **却下（rejected）**: 採択不可、却下理由を記録
- **例外承認（granted exception）**: TXE-NNN 例外（plan §OCS.8）の承認記録

### Lifecycle 遷移の記録範囲

タグの 6 状態 Lifecycle 遷移（plan §OCS.4 / Constitution）は本 journal が記録する:

```text
proposed → active → deprecated → sunsetting → retired → archived
```

| 遷移                                                        | window 記録対象? | 形式                               |
| ----------------------------------------------------------- | ---------------- | ---------------------------------- |
| `proposed` 状態の宣言（採択候補として journal §2.1 に登録） | **必須**         | §2.1 提案中 entry                  |
| `proposed` → `active`（採択）                               | **必須**         | §3 採択 entry（採択日 + 採択者）   |
| `active` → `deprecated`（撤退提案採択）                     | **必須**         | §3 採択 entry（種別=撤退）         |
| `deprecated` → `sunsetting`                                 | 不要（自動）     | `sunsetCondition` の期限到達で自動 |
| `sunsetting` → `retired`                                    | 不要（自動）     | consumer 0 件到達で自動            |
| `retired` → `archived`                                      | 不要（自動）     | 一定期間後                         |

形式の詳細は `references/03-implementation/taxonomy-review-window.md` §5「記録形式」+ §6.1「OCS.4 Lifecycle State Machine」を参照。

## 2. 次回 window（提案受付中）

> **次回開催予定**: 親 Phase 3（子 project 立ち上げ）と同期。具体的日程は別途確定。

### 2.1. 提案中（draft）

> AI / user reviewer の提案 entry を集積する場所。開催前に確定 → §3 各セクションへ移動。

（現状: 提案 entry なし）

### 2.2. 期限超過例外の確認

> 開催時に `taxonomy-health.json` の `taxonomy.exceptions.expired` 件数を確認し、すべての超過例外について撤回 / 期限延長 / sunsetCondition 達成のいずれかを記録する。

（現状: TXE 例外の発行なし。初回 window 開催後に追記）

## 3. 過去の window 記録

> 各 window 開催後、`references/03-implementation/taxonomy-review-window.md` §5 の形式に従って entry を追加する。

### 3.0. 開催情報

（初回 window 未開催）

### 3.1. 2026-Q2-1 ad-hoc human review（2026-04-27 開催）

> 通常の四半期 review window ではなく、**Phase 7 cooling 撤廃に対する単発承認**。Constitution 原則 3「語彙生成は高コスト儀式」+ AR-TAXONOMY-AI-VOCABULARY-BINDING への対応として、AI の保守的 default（90 日 cooling）を human reviewer が override する形式で記録する。

#### 開催情報

- 開催日: 2026-04-27
- 形式: ad-hoc human review（dialogue-based approval、AI 提案 + user 判断）
- 参加者: user（human reviewer / authority）+ claude（AI）
- 議事録参照: 本 entry が議事録を兼ねる

#### 採択（accepted）

##### v1 vocabulary / TSIG-\* global rule の cooling 期間撤廃

| 項目             | 値                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 種別             | 改訂（Phase 7 deprecation 期間の短縮 / 撤廃）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 採択日           | 2026-04-27                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 採択者           | user (human authority)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 提案者           | claude (AI)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Why              | Phase 7 で設定した 90 日 cooling 期間（2026-04-27 → 2026-07-26）の**実質的保護内容を本プロジェクト固有の文脈で再評価した結果**、儀式的要素が支配的と判定: ① external consumer 不在（internal-only codebase）→ migration time 不要、② grep / guard で全 v1 / TSIG 使用箇所を機械列挙済 → discovery time 不要、③ solo-maintainer + AI 運用 → communication time 不要、④ rollback safety は git revert で即時可能 → 90 日不要。残るのは ⑤ quarterly review-window 整合（90 日 = 1 四半期）+ ⑥ Constitution 原則 3「高コスト儀式」対称性 のみで、いずれも本プロジェクト固有の technical migration には影響しない。 |
| Antibody Pair    | —（既存タグの retirement、新規追加なし）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 必須対応         | (a) Phase 7.5 として v1-only file 259 件を v2 vocabulary に migration（Constitution 原則 1 適用、R:unclassified 退避）、(b) Phase 8 で v1 / TSIG 物理削除、(c) Phase 9 で legacy 参照 0 化                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| promotionLevel   | —（vocabulary 状態の変更なし、retirement 速度のみ変更）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Lifecycle status | v1 / TSIG: `deprecated` → `retired`（cooling 撤廃により sunsetting フェーズを skip）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 備考             | 本 ad-hoc review は通常の四半期 review window cadence の例外として記録。今後の同種ケース（cooling 短縮 / 撤廃 / Lifecycle 加速）も human reviewer 承認下で同形式で記録すること。Constitution 原則 3 + AR-TAXONOMY-AI-VOCABULARY-BINDING への compliance 経路として確立。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

#### 影響範囲（実装側）

- `responsibility-v1-to-v2-migration-map.md` §3.4 / `test-tsig-to-v2-migration-map.md` §3.5 の `@expiresAt` を 2026-07-26 → 2026-04-27 に短縮（同日撤退）
- `CLAUDE.md` §taxonomy-binding §「v1 / TSIG 撤去期限」表の expiresAt 更新
- v1 registry / guard 物理削除（Phase 8）+ TSIG-\* rule 物理削除（Phase 8 / Phase 9）
- `deprecatedMetadataGuard` DM2（@expiresAt 超過検出）が本同日中に発火 → Phase 8 retirement で対象 file 物理削除により解消

#### Context 前提と再評価 trigger（post-review 2026-04-27 追加、user judgment）

> 本 cooling 撤廃判断は **現時点の governance context** に依存する。一般則として cooling 不要 ではなく、以下の context が変化した場合は **cooling を再活性化** する判断 trigger とする。

| context 軸                | 現状値                                       | 再評価 trigger                                                              |
| ------------------------- | -------------------------------------------- | --------------------------------------------------------------------------- |
| Maintainer 体制           | solo (user)                                  | **team 化 (≥ 2 active maintainer)** 時に cooling 復活を検討                  |
| Consumer scope            | internal-only (本 SPA 自身が唯一 consumer)   | **external-facing API / library 化 / 公開 SDK 化** 時に cooling 必須化      |
| Migration verifiability   | machine-verifiable (grep + guard で全件特定可能) | **dynamic / runtime-only な consumer** 出現時に cooling 必須化              |
| Review window cadence     | ad-hoc (本 §3.1 が初回)                      | **四半期 cadence 確立後** は cooling 復活を再検討（cadence integrity の補完）|

> §3.2 改訂提案で `taxonomyContext` field を `projects/*/config/project.json` に導入することを提案中（context flag の機械化）。本提案が確定するまでは本 §3.1 の trigger 表が canonical reference。

### 3.2. 2026-Q2-2 Constitution context 改訂提案（提案中）

> **位置付け**: §3.1 の cooling 撤廃を踏まえ、Constitution 原則 3「語彙生成は高コスト儀式」が **internal-only codebase での儀式的時間制約**を持つことが事後判明した問題を体系的に解消する提案。次回 review window で確定予定。

#### 提案中（draft）

##### Constitution 原則 3 改訂（context-aware "高コスト儀式"）

| 項目                | 値                                                                                                                                 |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 提案者              | user (human reviewer / authority)                                                                                                  |
| AI 起草補助         | claude — post-review 2026-04-27 で本 entry の文案を起草、user が提案者として採択し journal に landing                                  |
| 提案日              | 2026-04-27                                                                                                                         |
| 種別                | 改訂（Constitution 原則 3 + 関連 review-window §4.2 採択条件）                                                                       |
| Why                 | 原則 3 の「高コスト儀式」が 90 日 cooling という時間制約として書かれていたが、internal-only codebase（外部 consumer 不在）では儀式的要素のみで実質的保護を持たない。§3.1 で具体的に override 経験を踏まえ、context-aware に再定義する必要がある。 |
| 改訂案              | 原則 3 を **「user 判断ゲート」を中核**として再定義。cooling 期間は **二次属性**（context dependent: external-facing なら必須、internal-only なら省略可）。具体的には: ① review-journal entry を必須とする「採択イベント」が中核、② cooling 期間は context flag (`projects.context.facing` = "internal" \| "external" \| "hybrid") によって自動算出、③ AR-TAXONOMY-AI-VOCABULARY-BINDING を retirement / lifecycle 改変にも拡張（`taxonomyLifecycleTransitionGuard` で機械検証） |
| 必須対応            | (a) `taxonomy-constitution.md` 原則 3 の rewrite、(b) `taxonomy-review-window.md` §4.2 採択条件から「90 日以上」を context-dependent に、(c) `projects/*/config/project.json` schema に `taxonomyContext` field 追加（推奨値: `internal-only` / `external-facing` / `hybrid`） |
| Antibody Pair       | —（原則の改訂、新タグ追加なし）                                                                                                      |
| 推定 promotionLevel | —（原則そのものは vocabulary なし、Constitution の bootstrap invariant として `constitutionBootstrapGuard` B11-B13 が機械検証）       |
| Sunset 条件         | 本改訂が更に context drift する場合（例: project が internal-only から external-facing に移行）の再改訂手続きを Constitution に明記 |
| 既存 entry への影響 | §3.1 ad-hoc review が **新 review-window cadence の正式 entry**として遡及承認される（context = internal-only の自動 cooling=0 に該当） |
| 影響範囲（実装側）  | `taxonomy-constitution.md` rewrite + `taxonomy-review-window.md` §4.2 改訂 + `_template/config/project.json` 拡張 + `constitutionBootstrapGuard` B11-B13 invariant 更新（context-aware）                                                                  |

#### 期待される結果

- 同種ケース（internal-only codebase で cooling 不要な retirement）が ad-hoc review なしで処理可能に
- AI が context flag を読んで自動的に cooling 値を算出 → 儀式的 review window の負荷削減
- Constitution が context drift に対する明示的な改訂手続きを持つ → メタ運用の安定性向上

#### 却下リスク（事前認識）

- context flag を AI が単独設定すれば AR-TAXONOMY-AI-VOCABULARY-BINDING 違反 → flag 設定も human approval 必須として明記
- "internal-only" → "external-facing" 移行時の cooling 再活性化を忘れる → 移行検出 guard も併設

> **次回開催予定**: 親 Phase 4 制度成立確認直後に開催予定。本改訂が確定するまでは §3.1 ad-hoc review を **暫定運用 precedent** として参照する。

### 3.3. 2026-Q2-3 Promotion Gate L6 取り扱い決定（提案中、user judgment 待ち）

> **位置付け**: post-review 2026-04-27 で「L6 (Health-tracked) を roadmap なしで残すのは制度負債」と指摘された問題への正式提案。実行せず human judgment のみを待つ。

#### 提案中（draft）

##### Promotion Gate L6 の二者択一

| 項目                | 値                                                                                                                                 |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 提案者              | user (human reviewer / authority)                                                                                                  |
| AI 起草補助         | claude — post-review 2026-04-27 で本 entry 文案を起草、user が提案者として journal に landing                                          |
| 提案日              | 2026-04-27                                                                                                                         |
| 種別                | 改訂（Constitution §6 / plan §OCS.5 Promotion Gate level 構造）                                                                     |
| Why                 | 現在 L5 (Coverage 100% Guarded) で実運用が成立しており、L6 (Health-tracked) は **未実装 + roadmap なし** の状態。aspiration として残すと「達成していない失敗」なのか「そもそも不要だった目標」なのか曖昧化する制度負債。誠実な選択肢は (1) 最小 schema + success criteria を確定する / (2) Constitution / plan から降格・削除する のどちらか |
| 二者択一の選択肢    | **(1) L6 最小実装**: registry V2 に `promotionFields: { healthTracked: bool }` 追加、taxonomy-collector で per-tag KPI を architecture-health.json に feed (e.g., `taxonomy.responsibility.tag.R:calculation.healthTracked: true`)。実装規模 ~50 行 / **(2) L6 削除**: Constitution §6 + plan §OCS.5 から L6 を削除、Promotion Gate を L0-L5 の 6 段階に再編。constitutionBootstrapGuard B12 + 関連文書を更新 |
| user lean           | (2) **L6 削除** に傾倒（post-review 2026-04-27 user 言: 「今の材料だと、L6 は aspiration であって plan ではない」）|
| 必須対応            | (1) 採択時: registry V2 schema 拡張 + collector 改修 + per-tag KPI 4 件追加 / (2) 採択時: Constitution §6 + plan §OCS.5 + B12 invariant 更新 + 関連 references の L0-L5 表記統一 |
| Antibody Pair       | —（vocabulary 構造の改訂、新タグ追加なし）                                                                                            |
| 推定 promotionLevel | —（Promotion Gate 自身の構造改訂）                                                                                                   |
| Sunset 条件         | (1) 採択時: per-tag KPI が 6 ヶ月運用で実用価値 0 と判定された場合に L6 削除 / (2) 採択時: 将来 per-tag tracking が必要になった場合に新規 level として再導入（Constitution 改訂経由） |
| 既存 entry への影響 | 親 Phase 4 OCS 稼働確認 checklist 「§OCS.5 Promotion Gate L6（Health-tracked）に全タグが到達している」を採択選択肢に応じて更新 ((1) 達成可能化 / (2) 削除) |
| 関連 forward commit  | 親 Phase 4 残 4 forward-looking 中の 1 件「Promotion Gate L6 全タグ到達」が本提案で解消                                              |

> **次回開催予定**: 親 Phase 4 制度成立確認直後に §3.2 と同 window で裁定。

---

> **以降、各 window 開催ごとに次の構造で追加:**

```markdown
## YYYY-Q-N （YYYY-MM-DD 開催）

### 開催情報

- 開催日: YYYY-MM-DD
- 参加者: <ロール一覧>
- 議事録参照: <link or 概要>

### 採択（accepted）

#### {R:|T:}{tag-name}

| 項目             | 値                            |
| ---------------- | ----------------------------- |
| 種別             | 追加 / 撤退 / 改訂 / 例外承認 |
| 採択日           | YYYY-MM-DD                    |
| 採択者           | <ロール>                      |
| 提案者           | <ロール>                      |
| Why              | <承認された Why>              |
| Antibody Pair    | <対概念タグ>                  |
| 必須対応         | <対応 T:kind / R:tag>         |
| promotionLevel   | L1 / L2 / ...                 |
| Lifecycle status | active / deprecated / ...     |
| 備考             | <承認時の注記>                |

### 条件付き採択（conditional）

（同上の形式 + `条件:` 行を追加 + `次回確認 window:` 行）

### 保留（postponed）

（同上 + `次回 window:` 行）

### 却下（rejected）

| 項目     | 値                                               |
| -------- | ------------------------------------------------ | ------------- |
| 提案     | {R:                                              | T:}{tag-name} |
| 種別     | 追加 / 撤退 / ...                                |
| 提案者   | <ロール>                                         |
| 却下理由 | <なぜ却下されたか、判定基準のどれに該当しないか> |

### 例外承認（granted exception）

| 項目            | 値                           |
| --------------- | ---------------------------- |
| TXE id          | TXE-NNN                      |
| rule            | AR-TAXONOMY-\*               |
| target          | <ファイルパス>               |
| reason          | <なぜ一時除外するか>         |
| owner           | <ロール>                     |
| expiresAt       | YYYY-MM-DD                   |
| sunsetCondition | <何が起きたら除外解除するか> |
```

## 4. 累積指標（generated 連動予定）

> Phase 親 4（制度成立確認）+ 子 Phase 6（Migration Rollout）で `taxonomy-health.json` collector を実装後、以下の指標を **generated section として本 journal に埋め込む**。

```yaml
reviewWindow:
  totalWindows: 0 # これまで開催された window 件数
  acceptedAdditions: 0 # 累積採択追加件数
  acceptedRetirements: 0 # 累積撤退件数
  rejected: 0 # 累積却下件数
  pendingProposals: 0 # 提案 entry 件数
  expiredProposals: 0 # 開催遅延で期限超過した提案件数
  outOfWindowAdditions: 0 # AR-TAXONOMY-AI-VOCABULARY-BINDING 違反件数
exceptions:
  granted: 0 # 累積例外承認件数
  active: 0 # 現在 active な例外件数
  expired: 0 # 期限超過例外件数
```

これらは制度成立 5 要件の判定材料（plan §OCS.4 / Constitution §9）。

## 5. 改訂規律（メタ運用）

本 journal 自身の改訂手順:

| 改訂内容                                 | review window 必須?                                          |
| ---------------------------------------- | ------------------------------------------------------------ |
| 過去 window entry の追加（採択結果記録） | 不要（自動。window 開催後 24 時間以内に追加）                |
| 提案 entry の追加                        | 不要（提案者が直接追加。AI は §taxonomy-window §7.2 に従う） |
| 過去 window entry の **改変**            | **必須**（履歴改竄防止）                                     |
| §1 / §2 / §5 の構造変更                  | **必須**（journal 自体の運用変更）                           |
| §4 累積指標 schema の変更                | **必須**（health collector への影響あり）                    |

## 6. 関連文書

| 文書                                                  | 役割                                                                              |
| ----------------------------------------------------- | --------------------------------------------------------------------------------- |
| `references/01-foundation/taxonomy-constitution.md`   | Constitution（本 journal は原則 3 + 5 + 7 の運用記録）                            |
| `references/01-foundation/taxonomy-interlock.md`      | Interlock マトリクス（追加 / 撤退で同期改訂）                                     |
| `references/01-foundation/taxonomy-origin-journal.md` | Origin Journal（採択で Origin entry 追加）                                        |
| `references/03-implementation/taxonomy-review-window.md`      | **window 手続き + 判定基準 + 形式の正本**                                         |
| `projects/active/taxonomy-v2/plan.md`                        | 親 plan §OCS.4 Lifecycle / §OCS.8 Exception Policy / §OCS.9 Human Review Boundary |
| `projects/active/taxonomy-v2/checklist.md` Phase 2           | 本 journal の本格 landing 完了条件                                                |
| `CLAUDE.md` §taxonomy-binding                         | AI が review window 経路でのみ提案できる制約の正本                                |
