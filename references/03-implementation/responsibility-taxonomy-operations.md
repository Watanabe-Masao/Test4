# responsibility-taxonomy-operations — 責務軸（R:\*）運用ガイド

> **役割**: 責務軸（R:\*）に固有の運用手順 + 提案事前情報 + impact CLI 軸別出力 + 兄弟（test-taxonomy-v2）との同期 trigger をまとめる軸別正本。
>
> **位置付け**: 四半期 review window の **手続き** は `references/03-implementation/taxonomy-review-window.md` が正本。本ガイドは責務軸固有の **入力情報 / 出力検証 / 同期通知** に特化（重複しない）。
>
> **改訂規律**: 軸固有手続きの改訂は本ガイドで完結（review window 不要）。判定基準（review-window.md §4）の改訂は review window 経由のみ（メタ運用）。
>
> **status**: **active（Phase 5 Operations 完了直後）**。初回 review window 開催で `final` 候補。

## 1. 本ガイドが扱う範囲（範囲分担）

| 範囲                                 | 正本                                                       |
| ------------------------------------ | ---------------------------------------------------------- |
| review window 手続き（共通）         | `references/03-implementation/taxonomy-review-window.md`           |
| Constitution 7 不可侵原則            | `references/01-foundation/taxonomy-constitution.md`        |
| R:tag schema 仕様                    | `references/01-foundation/responsibility-taxonomy-schema.md` |
| R⇔T Interlock マトリクス            | `references/01-foundation/taxonomy-interlock.md`           |
| R:tag Origin 採取                    | `references/01-foundation/taxonomy-origin-journal.md` §R   |
| **R:tag 提案テンプレ事前情報**       | **本ガイド §2**                                            |
| **R:tag 撤退テンプレ事前情報**       | **本ガイド §3**                                            |
| **test-taxonomy-v2 との同期 trigger**| **本ガイド §4**                                            |
| **`taxonomy:impact` の R 軸出力仕様**| **本ガイド §5**                                            |
| **PR レビュー時の R 軸確認項目**     | **本ガイド §6**                                            |

## 2. 新 R:tag 提案テンプレート（事前情報シート）

> review window 提案前の **セルフチェック + 事前情報整理**。本シートを埋めてから review-window.md §2.2 の提案 entry に転記する。

### 2.1. 事前セルフチェック（責務軸固有）

review-window.md §2.1 の共通チェックに加え、責務軸固有で確認すべき項目:

- [ ] **既存 10 R:tag で代替不可** — `responsibilityTaxonomyRegistryV2.ts` 登録済 + `R:unclassified` で表現不能
- [ ] **軸の単一性** — 提案タグが「責務 (responsibility)」のみを表現し、純粋性 / 層 / 性能等の他軸を内包しない（Constitution 原則 2）
- [ ] **対 T:kind 提示** — 必須 T:kind が test-taxonomy-v2 registry に登録済 or 同 window で同時提案
- [ ] **配置 namespace** — `R:` 接頭辞のみ。複合接頭辞（`R-Pure:` 等）は禁止（Constitution 原則 2）
- [ ] **Cognitive Load 残数 ≥ 提案件数** — 現語彙 10 + 提案 N ≤ 15

### 2.2. 提案テンプレ（責務軸 sheet）

```markdown
## 新 R:tag 提案: R:<tag-name>

| 項目                | 値                                                   |
| ------------------- | ---------------------------------------------------- |
| 提案者              | <ロール>                                             |
| 提案日              | YYYY-MM-DD                                           |
| 種別                | 追加                                                 |
| Why                 | <なぜ既存 10 タグでは不足か / どんなドリフトを救うか>|
| Antibody Pair       | <対概念 R:tag、null 不可>                             |
| 必須 T:kind         | <Interlock matrix で R → T 義務を発行する集合>       |
| 任意 T:kind         | <推奨 obligation>                                    |
| 推定対象 file 数    | <inventory での候補 file 数>                         |
| 推定 Evidence Level | guarded / asserted / reviewed                        |
| 推定 promotionLevel | L1（採択時即時）                                      |
| Sunset 条件         | <何が起きたら撤退するか>                              |
| 既存タグへの影響    | <例: R:adapter から N 件移行など>                     |
| 既存 file への影響  | <V2-R-1 ratchet 増加 / interlock 違反増加の有無>     |
| 同 window 同時提案  | <test-taxonomy-v2 側で必要な T:kind 提案>            |
```

### 2.3. 「捨て場」化リスクのセルフ排除

v1 `R:utility`（33 件）の再来を防ぐため、提案前に以下を **事前否認**する:

- [ ] 「分類に迷ったらここ」という用途を持たないか
- [ ] 単一の振る舞いが説明できるか（C1 1 ファイル 1 変更理由 + C8 1 文説明）
- [ ] 対 T:kind が **個別の振る舞い**を検証するか（メタ guard だけでなく）

該当する場合は提案を取り下げ、`R:unclassified` 退避 + 後続 window で再考。

## 3. R:tag 撤退テンプレート（事前情報シート）

### 3.1. 撤退判断の事前条件

- [ ] **replacedBy 候補が 1 件以上存在** — 撤退対象を使用していた file の移行先 R:tag が registry 登録済
- [ ] **影響 file 数の見積** — `responsibilityTagGuardV2.test.ts` の inventory dump で対象件数を計測
- [ ] **撤退期限 90 日以上** — 対象 file の移行猶予を確保（review-window.md §4.2 採択条件）
- [ ] **対 T:kind の生存確認** — 撤退対象が verifies する T:kind が他 R:tag からも参照されているか（孤立 T:kind 化を防ぐ）

### 3.2. 撤退テンプレ（責務軸 sheet）

```markdown
## R:tag 撤退提案: R:<tag-name>

| 項目              | 値                                                |
| ----------------- | ------------------------------------------------- |
| 提案者            | <ロール>                                          |
| 提案日            | YYYY-MM-DD                                        |
| 種別              | 撤退（active → deprecated）                       |
| 撤退理由          | <Sunset 条件達成 / 別 R:tag への統合 / 用途消失>  |
| replacedBy        | R:<別 tag>（複数可、移行先マップ併記）            |
| 影響 file 数      | <inventory dump 計測値>                            |
| 撤退期限          | YYYY-MM-DD（提案日 + 90 日以上）                  |
| sunsetCondition   | <consumer 0 件 / 他 R:tag への完全移行 等>        |
| 対 T:kind の影響  | <verifies T:kind が他 R:tag で参照されているか>   |
| 移行戦略          | <一括 / 段階的 / per-file review window 経由>     |
```

### 3.3. Lifecycle 遷移と本ガイド §3 の関係

| Lifecycle 遷移              | 本ガイドのアクション                            |
| --------------------------- | ----------------------------------------------- |
| `active` → `deprecated`     | §3.2 撤退テンプレ提案 → review window 採択      |
| `deprecated` → `sunsetting` | 自動（`sunsetCondition` 期限到達）              |
| `sunsetting` → `retired`    | 自動（consumer 0 件到達）— `responsibilityTagGuardV2` で監視 |
| `retired` → `archived`      | 自動（一定期間後）                              |

## 4. test-taxonomy-v2 との同期手順

### 4.1. 同期が必要なイベント（責務軸 → テスト軸 通知）

以下のイベント発生時、`projects/completed/test-taxonomy-v2/HANDOFF.md` に同期通知を記載 + 兄弟ガイド `test-taxonomy-operations.md` §4 の対応 trigger を参照する:

| イベント                          | テスト軸への影響                                        |
| --------------------------------- | ------------------------------------------------------- |
| 新 R:tag 提案                     | 必須 T:kind を同 window で同時提案する義務（Constitution 原則 4）|
| R:tag 撤退提案                    | verifies T:kind が孤立化しないか確認義務               |
| Antibody Pair 変更                | 対 T:kind の Antibody Pair も同期改訂                  |
| Cognitive Load Ceiling 引き上げ   | テスト軸も同等 Ceiling か確認（軸対称性）              |

### 4.2. 同期通知のフォーマット

提案 entry に以下のクロス参照行を追加:

```markdown
> **テスト軸への同期**: test-taxonomy-v2 / `test-taxonomy-operations.md` §4 対応 trigger:
> <該当イベントのリンク>
```

### 4.3. 同 window で両軸同時裁定が必須なケース

- 新 R:tag + 新 必須 T:kind の追加（Constitution 原則 4）
- Interlock マトリクスの required 追加・削除（review-window.md §4.4）
- Antibody Pair の組み換え（軸間で対称性が必要な場合）

これらは **責務軸単独で進めることが禁止**（review window で hard fail）。

## 5. `npm run taxonomy:impact` の R 軸出力仕様

> 詳細実装は `tools/scripts/taxonomy-impact.ts`（統合 branch で実装）。本ガイドは **R 軸出力 contract** の正本。

### 5.1. CLI invocation

```bash
npm run taxonomy:impact                              # default: --base main --head HEAD
npm run taxonomy:impact -- --base main --head HEAD   # PR レビュー用
npm run taxonomy:impact -- --axis responsibility     # R 軸のみ
```

### 5.2. R 軸出力フィールド（contract 正本）

各変更 file について以下を出力:

| フィールド               | 意味                                                          |
| ------------------------ | ------------------------------------------------------------- |
| `path`                   | 変更 file の絶対パス（repo root 起点）                         |
| `detectedResponsibility` | file 内 `@responsibility R:*` の集合（複数可）                 |
| `requiredTKinds`         | Interlock matrix `requiredOf(R:*)` の和集合                   |
| `optionalTKinds`         | 同 `optionalOf(R:*)` の和集合                                 |
| `foundTKinds`            | 同 file group（src ↔ test）の test に実在する T:kind の集合   |
| `missingTKinds`          | `requiredTKinds - foundTKinds`                                |
| `result`                 | `pass`（missing 空）/ `warn`（optional 不足）/ `fail`（required 不足）|

### 5.3. R 軸出力例（user-readable）

```
Changed file:
  app/src/domain/calculations/grossProfit/calculateGrossProfit.ts
Detected responsibility:
  R:calculation
Required tests (from Interlock matrix):
  T:unit-numerical
  T:boundary
Optional tests:
  T:invariant-math
Found tests:
  T:unit-numerical
Missing:
  T:boundary
Result:
  fail
```

### 5.4. R 軸 result が fail のときの行動

1. 不足する T:kind を持つ test を **追加**（Constitution 原則 4）
2. 追加が困難な場合、対応する R:tag を **`R:unclassified` 退避** + review window 提案 entry 起草
3. 既存 test に T:kind を **追記**（既存検証ロジックの命名のみ）

`R:unclassified` 退避は AI 単独で許可（CLAUDE.md §taxonomy-binding）。

## 6. PR レビュー時の R 軸確認項目

> PR template の `taxonomy:check` / `taxonomy:impact` 確認項目（統合 branch で追加）に対する **責務軸 reviewer 観点**。

### 6.1. R 軸 fast review（5 分）

- [ ] `taxonomy:check` PASS（hard fail 条件 §OCS.3 全クリア）
- [ ] `taxonomy:impact --axis responsibility` で `result: fail` の file が無い
- [ ] 新規 file に `@responsibility R:*` が付与されている（タグなし禁止）
- [ ] 既存 file の R:tag 変更は対 T:kind が依然満たされている

### 6.2. R 軸 deep review（必要時）

新 R:tag 追加 / 撤退 / Antibody Pair 変更 / Interlock 改訂を含む PR は **review window 採択待ち**:

- [ ] `taxonomy-review-journal.md` に対応 entry が存在
- [ ] 採択日が PR の最終 commit 日以前
- [ ] 採択 entry の Antibody Pair / 必須 T:kind / Origin が registry V2 + Origin Journal §R に転記済
- [ ] テスト軸 reviewer も同 window で承認済（Constitution 原則 4 双方向）

### 6.3. 自動承認される R 軸変更（review window 不要）

- registry 登録済 R:tag の新規 file への付与
- R:tag の `lastReviewedAt` 更新
- `responsibilityTagGuardV2` baseline の **ratchet-down**（減少のみ、増加禁止）
- low-risk tag の prose 説明の文言修正

## 7. R:unclassified の意味負債 (semantic debt) 認識

> **post-review 2026-04-27 追加 (user judgment)**: Phase 7.5 mass migration で v1-only 259 file を **R:unclassified に一律退避**した結果、現在の registry 集計は **R:unclassified が 90%+ を占める**。この状態は「タグが付いている率 100%」だが「意味的に分類されている率」ではないため、**semantic debt として明示的に認識**する。

### 7.1. semantic debt の所在

| 項目                  | 値                                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------- |
| 影響 file 数          | 259（Phase 7.5 mass migration 対象、v1-only → R:unclassified 一律置換）                           |
| 喪失した意味情報      | v1 の `R:state-machine` / `R:transform` / `R:chart-view` / `R:utility` 等の **粗いが意味あった分類** |
| migration map §1 mapping | per-tag remap (R:state-machine → R:store / R:transform → context-judged 等) は **適用されなかった**（一律 R:unclassified） |
| 復元可能性            | git history 経由で参照可能（Phase 7.5 commit hash 範囲を `git log -p` で読む）                     |
| 通常 reviewer 判読性  | **低**（registry V2 だけ見ても `R:unclassified` としか分からない）                                 |

### 7.2. v1 provenance の参照経路

R:unclassified file の元 v1 タグを参照したい場合:

```bash
# Phase 7.5 mass migration の commit hash を特定
git log --oneline --grep="Phase 7.5"

# 特定 file の v1 タグ (置換前) を確認
git log -p --follow <file-path> | grep "@responsibility R:" | head

# 一括 inventory 参照 (Phase 0 baseline 残存)
cat references/04-tracking/responsibility-taxonomy-inventory.yaml | grep -B 1 -A 1 <file-path>
```

### 7.3. semantic debt の解消経路（forward-looking）

R:unclassified 退避は **暫定避難先** であり、本番運用上は具体タグへの promotion が望ましい。解消手順:

1. **review window 経由の per-file promotion**（review-window.md §4）
   - 候補 R:tag を Interlock matrix から選定
   - 必須 T:kind を満たすか確認
   - review-journal に提案 entry → 採択
   - registry V2 で当該 file の `@responsibility R:unclassified` → 具体タグに置換
   - V2-R-1 baseline は変動なし (R:unclassified も v2 vocabulary なので unchanged)

2. **bulk promotion（複数 file の同 R:tag への一括 migration）**
   - PR per 50 file 程度を上限とする（review 可能性確保）
   - 例: presentation/components/charts/ 配下の `R:unclassified` → `R:presentation` 一括
   - migration map §1 の v1 → v2 mapping を adoption の根拠とする

### 7.4. semantic debt baseline の追跡

- 現状 R:unclassified 件数: `taxonomy-health.json` の `taxonomy.responsibility.tagDistribution["R:unclassified"]`
- 解消目標: **設定なし**（原則 1「未分類は能動タグ」により R:unclassified は恒久 sentinel として留まる file が存在する）
- ratchet 戦略: 「R:unclassified 件数を ratchet-down」は強制せず、review window で個別判断

> **重要**: 本 §7 の存在は「semantic loss は既知の負債である」という運用 acknowledgement であり、解消は incremental に行う。Coverage 100% (V2-R-1 baseline=0) は **「タグの存在保証」** であって **「意味分類の完成」** ではないことを reviewer に明示する。

## 8. mass migration script の retry / rollback 方針 (gap 5 deferred memo)

> **post-review 2026-04-27 追加 (gap 5 deferred)**: `tools/scripts/phase6a2-mass-tagging.ts` / `phase7.5-v1-migration.ts` の partial failure 時の手順。次回 mass migration 時に再発防止メモとして参照。

### 8.1. 部分失敗時の対処

mass-tagging script が途中エラーで一部 file のみ更新した場合:

1. **rollback**: `git checkout -- <affected-files>` で uncommitted 変更を破棄。commit 済の場合は `git revert <commit-sha>`
2. **retry**: idempotent 設計（既に `@responsibility` ある file は skip）のため、同 script を再実行で残り file を処理
3. **分析**: error log から失敗 file 群を特定し、edge case (single-line JSDoc / shebang / 'use client' / 多重 annotation) を script に反映

### 8.2. 次回 migration 時の事前確認

- `--dry-run` で影響範囲事前確認
- 大規模 migration (>100 file) は layer 別 commit に分離（Phase 6a-2 の前例: domain → application → ... の 6 commit 分割）
- script は **一回限り使用** が原則。再利用が必要な場合は `tools/scripts/_lib/inject-annotation.ts` への共通 helper 抽出を検討

## 9. 関連文書

| 文書                                                               | 役割                                                |
| ------------------------------------------------------------------ | --------------------------------------------------- |
| `references/03-implementation/taxonomy-review-window.md`                   | review window 共通手続き正本（本ガイドの上位）      |
| `references/03-implementation/test-taxonomy-operations.md`                 | テスト軸 operations 兄弟ガイド（§4 同期対象）      |
| `references/01-foundation/taxonomy-constitution.md`                | 7 不可侵原則（本ガイドは原則 2 + 4 + 6 の運用）     |
| `references/01-foundation/responsibility-taxonomy-schema.md`       | R:tag schema 仕様正本                               |
| `references/01-foundation/taxonomy-interlock.md`                   | R⇔T Interlock マトリクス正本                       |
| `references/01-foundation/taxonomy-origin-journal.md` §R           | R:tag Origin 採取の正本                             |
| `references/04-tracking/taxonomy-review-journal.md`                  | review window 提案 / 採択 / 却下 journal           |
| `app/src/test/responsibilityTaxonomyRegistryV2.ts`                 | v2 R:tag registry 実装                              |
| `app/src/test/guards/responsibilityTagGuardV2.test.ts`             | v2 R:tag guard（V2-R-* baseline）                   |
| `projects/completed/responsibility-taxonomy-v2/plan.md`                      | 子 project plan（10 Phase + Phase 別禁止事項）      |
| `projects/completed/responsibility-taxonomy-v2/checklist.md`                 | 子 project completion 入力                          |
| `projects/taxonomy-v2/plan.md` §OCS.3                              | `taxonomy:check` / `taxonomy:impact` 仕様正本       |
| `CLAUDE.md` §taxonomy-binding                                      | AI Vocabulary Binding（本ガイド §5.4 退避の根拠）  |
