# HANDOFF — test-taxonomy-v2

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

**プロジェクト準備完了、着手前（scheduled / not yet kicked off）。**

親 `taxonomy-v2` の Phase 1（Constitution 起草）完了後に本 project の Phase 0
（Inventory）に着手する。特に interlock マトリクス（R:tag ⇔ T:kind）の雛形が
ないと本 project の T:kind 設計が start できない。

### Phase 体系

```
Phase 0: Inventory（現行 TSIG + テストの種類分類の棚卸し）
Phase 1: Schema 設計（T:kind vocabulary / obligation 種類定義）
Phase 2: Migration Path（TSIG-TEST-* → T:kind + T:unclassified 段階導入）
Phase 3: Guard 実装（testTaxonomyGuard + interlock 検証）
Phase 4: Pilot（少数テストで試験運用）
Phase 5: Operations（review window のテスト軸固有部分）
Phase 6: Migration Rollout（全テストへの T:kind 付与）
Phase 7: TSIG Global Rule Deprecation
Phase 8: TSIG Retirement（global 撤去 + T:kind ベース置換）
Phase 9: Legacy Collection（旧コメント / guard / 文書の掃除）
```

## 2. 次にやること

詳細は `checklist.md` を参照。

### 高優先（Phase 0 キックオフ時）

- 親 Phase 1 の Constitution + interlock 仕様の確定を待つ
- 現行 TSIG-TEST-01 / TSIG-COMP-03 / TSIG-TEST-04 等の global rule を棚卸し
- 既存テストを「何を検証しているか」で粗分類（unit / contract / invariant / parity / boundary 等）

### 中優先（Phase 1 以降）

- T:kind vocabulary 設計（Cognitive Load ≤ 15）
- R:tag ⇔ T:kind 対応（responsibility-taxonomy-v2 と同期 review window で合意）
- obligation の種類（must-have / should-have / may-have）定義

### 低優先（Phase 5 以降）

- TSIG global rule の分解計画
- Legacy Collection の掃除対象リスト作成

## 3. ハマりポイント

### 3.1. 「テスト = unit test だけ」という前提を置かない

v1 の TSIG は "テストが存在するか" しか見ていない。v2 は**何を保証するテストか**を
T:kind で分類する。unit / contract / invariant / parity / boundary / render-shape /
state-transition / null-path 等、種類別に obligation が異なる。

**対策:** Phase 1 Schema で T:kind を「証明する対象」で分類（テストの書き方ではない）。

### 3.2. R:tag を勝手に参照しない

interlock 仕様（R ⇔ T マトリクス）は親の所掌。本 project で T:kind を決める際、
「この R:tag に対応」と仮置きしてはいけない（同期 review window で裁定）。

**対策:** 本 project の T:kind 提案時、対応 R:tag は "TBD: see responsibility-taxonomy-v2
Phase 1" と記録。実値は親 Phase 2 review window で両軸同時裁定。

### 3.3. 既存テストを一斉に書き直さない

Phase 6 Migration Rollout で全テストに T:kind 付与する際、テストのロジックを同時に
直したくなる誘惑がある。これをやると T:kind 付けの観点とテスト品質改善の観点が
混線し、review がブロックされる。

**対策:** Phase 6 は T:kind 付けのみ。テスト品質修正は別 PR / 別 Phase で。

### 3.4. TSIG global rule を早期撤去しない

v2 の T:kind ベース guard が安定運用されるまで TSIG global rule は動かす。
Phase 7 で deprecation、Phase 8 で retirement。撤去を早めるとテスト品質の回帰が起きる。

**対策:** responsibility-taxonomy-v2 と同じ「新 guard 即時導入 / 旧 guard は最後に撤去」
原則。Phase 3 で v2 guard 並行運用、Phase 8 で TSIG 撤去。

### 3.5. `T:unclassified` も能動タグ（親原則 1）

テストにタグがないことと `T:unclassified` は違う。タグなしは CI fail、
`T:unclassified` は review window 待ちの active 状態。

**対策:** Phase 2 Migration Path で「タグなしテスト → `T:unclassified` 明示付与」を
mechanical 変換。Phase 6 Rollout 後はタグなしテストが 0 件であることを guard で強制。

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| `AI_CONTEXT.md` | プロジェクト意味空間の入口 |
| `plan.md` | 10 Phase 構造 + Phase 別禁止事項 |
| `checklist.md` | Phase 完了条件 |
| 親: `projects/taxonomy-v2/plan.md` | 7 不可侵原則 + interlock 仕様（制約元） |
| `app/src/test/guards/testSignalIntegrityGuard.test.ts` | 現行 TSIG（Phase 8 で T:kind ベースに置換） |
| 兄弟: `projects/responsibility-taxonomy-v2/HANDOFF.md` | 責務軸（同期 window 運用） |
