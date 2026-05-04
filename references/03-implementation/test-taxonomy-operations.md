# test-taxonomy-operations — テスト軸（T:\*）運用ガイド

> **役割**: テスト軸（T:\*）に固有の運用手順 + 提案事前情報 + impact CLI 軸別出力 + 兄弟（responsibility-taxonomy-v2）との同期 trigger をまとめる軸別正本。
>
> **位置付け**: 四半期 review window の **手続き** は `references/03-implementation/taxonomy-review-window.md` が正本。本ガイドはテスト軸固有の **入力情報 / 出力検証 / 同期通知** に特化（重複しない）。
>
> **改訂規律**: 軸固有手続きの改訂は本ガイドで完結（review window 不要）。判定基準（review-window.md §4）の改訂は review window 経由のみ（メタ運用）。
>
> **status**: **active（Phase 5 Operations 完了直後）**。初回 review window 開催で `final` 候補。

## 1. 本ガイドが扱う範囲（範囲分担）

| 範囲                                        | 正本                                                       |
| ------------------------------------------- | ---------------------------------------------------------- |
| review window 手続き（共通）                | `references/03-implementation/taxonomy-review-window.md`           |
| Constitution 7 不可侵原則                   | `references/01-foundation/taxonomy-constitution.md`        |
| T:kind schema 仕様                          | `references/01-foundation/test-taxonomy-schema.md`         |
| R⇔T Interlock マトリクス                   | `references/01-foundation/taxonomy-interlock.md`           |
| T:kind Origin 採取                          | `references/01-foundation/taxonomy-origin-journal.md` §T   |
| TSIG → v2 移行表                            | `references/03-implementation/test-tsig-to-v2-migration-map.md`    |
| **T:kind 提案テンプレ事前情報**             | **本ガイド §2**                                            |
| **T:kind 撤退テンプレ事前情報**             | **本ガイド §3**                                            |
| **responsibility-taxonomy-v2 との同期 trigger** | **本ガイド §4**                                            |
| **`taxonomy:impact` の T 軸出力仕様**       | **本ガイド §5**                                            |
| **PR レビュー時の T 軸確認項目**            | **本ガイド §6**                                            |

## 2. 新 T:kind 提案テンプレート（事前情報シート）

> review window 提案前の **セルフチェック + 事前情報整理**。本シートを埋めてから review-window.md §2.2 の提案 entry に転記する。

### 2.1. 事前セルフチェック（テスト軸固有）

review-window.md §2.1 の共通チェックに加え、テスト軸固有で確認すべき項目:

- [ ] **既存 15 T:kind で代替不可** — `testTaxonomyRegistryV2.ts` 登録済 + `T:unclassified` で表現不能
- [ ] **軸の単一性** — 提案タグが「テスト振る舞いの種類」のみを表現し、責務 / 層 / 性能等の他軸を内包しない（Constitution 原則 2）
- [ ] **対 R:tag 提示** — 検証対象 R:tag が responsibility-taxonomy-v2 registry に登録済 or 同 window で同時提案
- [ ] **配置 namespace** — `T:` 接頭辞のみ。複合接頭辞（`T-Unit:` 等）は禁止（Constitution 原則 2）
- [ ] **Cognitive Load Ceiling 残数 ≥ 提案件数** — 現語彙 15 + 提案 N ≤ 15（**現状 15/15 cap 到達のため新規追加は事実上 1:1 撤退とのセット必須**）
- [ ] **obligation tier 妥当性** — `must-have` / `should-have` / `may-have` のいずれが妥当か（Phase 1 schema §obligation-tier）

### 2.2. 提案テンプレ（テスト軸 sheet）

```markdown
## 新 T:kind 提案: T:<kind-name>

| 項目                | 値                                                                |
| ------------------- | ----------------------------------------------------------------- |
| 提案者              | <ロール>                                                          |
| 提案日              | YYYY-MM-DD                                                        |
| 種別                | 追加                                                              |
| Why                 | <なぜ既存 15 タグでは不足か / どんな振る舞い保証が欠落しているか> |
| Antibody Pair       | <対概念 T:kind、null 可: sentinel/lifecycle bookend のみ>          |
| 検証対象 R:tag      | <Interlock matrix で T → R 検証義務を発行する集合>                |
| obligation tier     | must-have / should-have / may-have                                 |
| 推定対象 test 数    | <inventory での候補 test 数>                                       |
| 推定 Evidence Level | guarded / asserted / reviewed                                      |
| 推定 promotionLevel | L1（採択時即時）                                                   |
| Sunset 条件         | <何が起きたら撤退するか>                                           |
| 既存タグへの影響    | <例: T:unit-numerical から N 件移行など>                           |
| 既存 test への影響  | <V2-T-1 ratchet 増加 / interlock 違反増加の有無>                  |
| 同 window 同時提案  | <responsibility-taxonomy-v2 側で必要な R:tag 提案>                |
| Cognitive Load 対策 | <現状 15/15 cap のため、撤退対象 1 件以上の同時提案>              |
```

### 2.3. 「過剰命名」リスクのセルフ排除

テスト軸の v2 は Phase 1 で 15 件 cap に到達しているため、追加提案は **同時撤退とのペア**が原則。提案前に以下を **事前否認**する:

- [ ] 既存 must-have 10 件の組み合わせで表現できないか
- [ ] obligation tier `should-have` / `may-have` への降格で代替できないか
- [ ] 単一の検証目的が説明できるか（C8 1 文説明）
- [ ] 検証対象 R:tag が **明確に 1-3 件**に絞れるか（曖昧な「全部」禁止）

該当する場合は提案を取り下げ、`T:unclassified` 退避 + 後続 window で再考。

### 2.4. TSIG global rule との関係（移行期間特有の考慮）

Phase 7（TSIG Deprecation）完了までは TSIG-\* global rule と T:kind が並行運用される。新 T:kind 提案時:

- [ ] 提案 T:kind が TSIG-\* の置換となるか確認（test-tsig-to-v2-migration-map.md §3 参照）
- [ ] 置換となる場合は対応 TSIG rule を Phase 7 撤退対象に追加
- [ ] 完全に新規振る舞い（TSIG にも対応がない）の場合のみ純粋な追加扱い

## 3. T:kind 撤退テンプレート（事前情報シート）

### 3.1. 撤退判断の事前条件

- [ ] **replacedBy 候補が 1 件以上存在** — 撤退対象を使用していた test の移行先 T:kind が registry 登録済
- [ ] **影響 test 数の見積** — `testTaxonomyGuardV2.test.ts` の inventory dump で対象件数を計測
- [ ] **撤退期限 90 日以上** — 対象 test の移行猶予を確保（review-window.md §4.2 採択条件）
- [ ] **対 R:tag の生存確認** — 撤退対象が verifies する R:tag が他 T:kind からも参照されているか（孤立 R:tag 化を防ぐ）
- [ ] **must-have 撤退時の代替必須** — must-have tier 撤退は obligation 欠落を意味するため、**新たな must-have 提案または既存 should-have 昇格** とのペア必須

### 3.2. 撤退テンプレ（テスト軸 sheet）

```markdown
## T:kind 撤退提案: T:<kind-name>

| 項目                  | 値                                                |
| --------------------- | ------------------------------------------------- |
| 提案者                | <ロール>                                          |
| 提案日                | YYYY-MM-DD                                        |
| 種別                  | 撤退（active → deprecated）                       |
| 撤退理由              | <Sunset 条件達成 / 別 T:kind への統合 / 用途消失> |
| replacedBy            | T:<別 kind>（複数可、移行先マップ併記）           |
| obligation tier       | must-have / should-have / may-have                 |
| 影響 test 数          | <inventory dump 計測値>                            |
| 撤退期限              | YYYY-MM-DD（提案日 + 90 日以上）                  |
| sunsetCondition       | <consumer 0 件 / 他 T:kind への完全移行 等>       |
| 対 R:tag の影響       | <verifies R:tag が他 T:kind で参照されているか>   |
| 移行戦略              | <一括 / 段階的 / per-test review window 経由>     |
| obligation 欠落補完   | <must-have 撤退時の代替 must-have または昇格提案> |
```

### 3.3. Lifecycle 遷移と本ガイド §3 の関係

| Lifecycle 遷移              | 本ガイドのアクション                            |
| --------------------------- | ----------------------------------------------- |
| `active` → `deprecated`     | §3.2 撤退テンプレ提案 → review window 採択      |
| `deprecated` → `sunsetting` | 自動（`sunsetCondition` 期限到達）              |
| `sunsetting` → `retired`    | 自動（consumer 0 件到達）— `testTaxonomyGuardV2` で監視 |
| `retired` → `archived`      | 自動（一定期間後）                              |

## 4. responsibility-taxonomy-v2 との同期手順

### 4.1. 同期が必要なイベント（テスト軸 → 責務軸 通知）

以下のイベント発生時、`projects/completed/responsibility-taxonomy-v2/HANDOFF.md` に同期通知を記載 + 兄弟ガイド `responsibility-taxonomy-operations.md` §4 の対応 trigger を参照する:

| イベント                          | 責務軸への影響                                          |
| --------------------------------- | ------------------------------------------------------- |
| 新 T:kind 提案                    | 検証対象 R:tag を同 window で同時確認する義務（Constitution 原則 4）|
| T:kind 撤退提案                   | verifies R:tag への obligation 欠落確認義務            |
| obligation tier 昇格 / 降格       | 対応 R:tag の必須 T:kind 集合変動を Interlock matrix で確認 |
| Antibody Pair 変更                | 対 R:tag の Antibody Pair も同期改訂                   |
| Cognitive Load Ceiling 引き上げ   | 責務軸も同等 Ceiling か確認（軸対称性）                |

### 4.2. 同期通知のフォーマット

提案 entry に以下のクロス参照行を追加:

```markdown
> **責務軸への同期**: responsibility-taxonomy-v2 / `responsibility-taxonomy-operations.md` §4 対応 trigger:
> <該当イベントのリンク>
```

### 4.3. 同 window で両軸同時裁定が必須なケース

- 新 T:kind + 検証対象 R:tag の追加（Constitution 原則 4）
- Interlock マトリクスの required 追加・削除（review-window.md §4.4）
- obligation tier `must-have` の追加・撤退（責務軸の R:tag obligation が変動）
- Antibody Pair の組み換え（軸間で対称性が必要な場合）

これらは **テスト軸単独で進めることが禁止**（review window で hard fail）。

## 5. `npm run taxonomy:impact` の T 軸出力仕様

> 詳細実装は `tools/scripts/taxonomy-impact.ts`（統合 branch で実装）。本ガイドは **T 軸出力 contract** の正本。

### 5.1. CLI invocation

```bash
npm run taxonomy:impact                              # default: --base main --head HEAD
npm run taxonomy:impact -- --base main --head HEAD   # PR レビュー用
npm run taxonomy:impact -- --axis test               # T 軸のみ
```

### 5.2. T 軸出力フィールド（contract 正本）

各変更 file（src or test）について以下を出力:

| フィールド             | 意味                                                                       |
| ---------------------- | -------------------------------------------------------------------------- |
| `path`                 | 変更 file の絶対パス（repo root 起点）                                      |
| `detectedTKinds`       | file 内 `@taxonomyKind T:*` の集合（test file の場合）                     |
| `linkedRTags`          | 同 file group（src ↔ test）の src に実在する R:tag                          |
| `expectedTKinds`       | Interlock matrix `requiredOf(linkedRTags)` の和集合（src 変更で要求される T:kind）|
| `presentTKinds`        | 同 file group の test に実在する T:kind の集合                              |
| `missingTKinds`        | `expectedTKinds - presentTKinds`                                            |
| `unverifiedTKinds`     | test の T:kind のうち linked src の R:tag が `verifies` 集合に該当しないもの |
| `result`               | `pass`（missing 空 + unverified 空）/ `warn`（unverified のみ）/ `fail`（missing 有）|

### 5.3. T 軸出力例（user-readable）

```
Changed file:
  app/src/test/guards/layerBoundaryGuard.test.ts
Detected T:kind:
  T:meta-guard
Linked R:tag (src side):
  R:guard
Expected T:kind (Interlock):
  T:meta-guard
Present T:kind:
  T:meta-guard
Missing:
  (none)
Unverified:
  (none)
Result:
  pass
```

### 5.4. T 軸 result が fail / warn のときの行動

**fail（missing T:kind あり）:**

1. 不足する T:kind を持つ test を **追加**（Constitution 原則 4）
2. 既存 test に T:kind を **追記**（既存検証ロジックの命名のみ）
3. 追加が困難な場合、対応する T:kind を **`T:unclassified` 退避** + review window 提案 entry 起草

**warn（unverified T:kind あり）:**

1. linked src の R:tag を確認 → Interlock matrix の verifies 集合に該当する R:tag を src に追加
2. 該当しない場合は test 側を `T:unclassified` 退避 + 後続 window で正規化
3. test の T:kind 命名が誤り（例: 検証対象が違う）の場合は test 側を訂正

`T:unclassified` 退避は AI 単独で許可（CLAUDE.md §taxonomy-binding）。

## 6. PR レビュー時の T 軸確認項目

> PR template の `taxonomy:check` / `taxonomy:impact` 確認項目（統合 branch で追加）に対する **テスト軸 reviewer 観点**。

### 6.1. T 軸 fast review（5 分）

- [ ] `taxonomy:check` PASS（hard fail 条件 §OCS.3 全クリア）
- [ ] `taxonomy:impact --axis test` で `result: fail` の file が無い
- [ ] 新規 test に `@taxonomyKind T:*` が付与されている（タグなし禁止）
- [ ] 既存 test の T:kind 変更は対 R:tag が依然満たされている

### 6.2. T 軸 deep review（必要時）

新 T:kind 追加 / 撤退 / obligation tier 変更 / Interlock 改訂を含む PR は **review window 採択待ち**:

- [ ] `taxonomy-review-journal.md` に対応 entry が存在
- [ ] 採択日が PR の最終 commit 日以前
- [ ] 採択 entry の Antibody Pair / 検証対象 R:tag / obligation tier / Origin が registry V2 + Origin Journal §T に転記済
- [ ] 責務軸 reviewer も同 window で承認済（Constitution 原則 4 双方向）
- [ ] Cognitive Load Ceiling 15 を維持（追加時は撤退とのペア）

### 6.3. 自動承認される T 軸変更（review window 不要）

- registry 登録済 T:kind の新規 test への付与
- T:kind の `lastReviewedAt` 更新
- `testTaxonomyGuardV2` baseline の **ratchet-down**（減少のみ、増加禁止）
- low-risk tag の prose 説明の文言修正

## 7. 関連文書

| 文書                                                               | 役割                                                |
| ------------------------------------------------------------------ | --------------------------------------------------- |
| `references/03-implementation/taxonomy-review-window.md`                   | review window 共通手続き正本（本ガイドの上位）      |
| `references/03-implementation/responsibility-taxonomy-operations.md`       | 責務軸 operations 兄弟ガイド（§4 同期対象）        |
| `references/03-implementation/test-tsig-to-v2-migration-map.md`            | TSIG → v2 移行表（Phase 7 撤退対象 mapping）        |
| `references/01-foundation/taxonomy-constitution.md`                | 7 不可侵原則（本ガイドは原則 2 + 4 + 6 + 7 の運用） |
| `references/01-foundation/test-taxonomy-schema.md`                 | T:kind schema 仕様正本                              |
| `references/01-foundation/taxonomy-interlock.md`                   | R⇔T Interlock マトリクス正本                       |
| `references/01-foundation/taxonomy-origin-journal.md` §T           | T:kind Origin 採取の正本                            |
| `references/04-tracking/taxonomy-review-journal.md`                  | review window 提案 / 採択 / 却下 journal           |
| `app/src/test/testTaxonomyRegistryV2.ts`                           | v2 T:kind registry 実装                             |
| `app/src/test/guards/testTaxonomyGuardV2.test.ts`                  | v2 T:kind guard（V2-T-* baseline）                  |
| `projects/completed/test-taxonomy-v2/plan.md`                                | 子 project plan（10 Phase + Phase 別禁止事項）      |
| `projects/completed/test-taxonomy-v2/checklist.md`                           | 子 project completion 入力                          |
| `projects/active/taxonomy-v2/plan.md` §OCS.3                              | `taxonomy:check` / `taxonomy:impact` 仕様正本       |
| `CLAUDE.md` §taxonomy-binding                                      | AI Vocabulary Binding（本ガイド §5.4 退避の根拠）  |
