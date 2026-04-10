# 実装チェックリスト

## 0. 着手前の固定事項

* [ ] 主役が粗利管理ツール本体で、AAG は保護機構であることを明記した
* [ ] 分離対象が pure・deterministic・UI 非依存の計算責務だけであることを明記した
* [ ] hook / store / QueryHandler / ViewModel / DuckDB query 実行が非対象であることを明記した
* [ ] `factorDecomposition` を `semanticClass=business`、`methodFamily=analytic_decomposition` として固定した
* [ ] registry 方針を **Master + Derived View** に固定した
* [ ] 物理ディレクトリ分離は後ろ倒しにし、先に論理分離と guard を入れる方針を固定した

---

## Phase 0: 前提固定・用語スイープ

* [ ] `references/01-principles/semantic-classification-policy.md` を作成した
* [ ] `references/01-principles/engine-boundary-policy.md` を business / analytic 用語へ整合させた
* [ ] `CLAUDE.md` に意味分類方針への参照を追加した
* [ ] `references/02-status/authoritative-term-sweep.md` を作成した
* [ ] 既存コード・コメント・テスト・文書内の `authoritative` 単独使用を洗い出した
* [ ] 直せる `authoritative` 単独使用を修正した
* [ ] 直せないものを `legacy-authoritative-usage` として ratchet 管理にした
* [ ] `AR-TERM-AUTHORITATIVE-STANDALONE` を即時導入した
* [ ] `npm run test:guards` で Phase 0 guard が通ることを確認した

**やってはいけないこと**

* [ ] `authoritative` を単独語のまま新規追加していない

---

## Phase 1: 意味分類 inventory

* [ ] `references/03-guides/semantic-inventory-procedure.md` を作成した
* [ ] `references/02-status/semantic-inventory.yaml` を作成した
* [ ] domain/calculations 配下 36 ファイルを inventory 化した
* [ ] 各項目に `semanticClass` を付与した
* [ ] 各項目に `authorityKind` / `runtimeStatus` / `migrationTier` を付与した
* [ ] `factorDecomposition` を business として分類した
* [ ] WASM 7 modules の意味再分類を反映した
* [ ] non-target 一覧を固定した
* [ ] `review-needed` 項目に理由を全件書いた

**やってはいけないこと**

* [ ] pure だからという理由だけで business / analytic を決めていない
* [ ] Rust にあることを意味分類の根拠にしていない

---

## Phase 2: CanonEntry 完全定義 + Derived View + 互換移行

* [ ] `calculationCanonRegistry` を **唯一の master registry** として拡張した
* [ ] `CanonEntry` に最終形フィールドを一括追加した
* [ ] `SemanticClass` / `AuthorityKind` / `RuntimeStatus` / `OwnerKind` を定義した
* [ ] `contractId` / `bridgeKind` / `rateOwnership` / `fallbackPolicy` / `migrationTier` を optional で先に入れた
* [ ] Phase 2A: optional 追加を完了した
* [ ] Phase 2B: warning + ratchet 移行を完了した
* [ ] Phase 2C: required 項目の必須化を完了した
* [ ] `app/src/test/semanticViews.ts` を作成した
* [ ] `BUSINESS_SEMANTIC_VIEW` / `ANALYTIC_KERNEL_VIEW` / `MIGRATION_CANDIDATE_VIEW` を master から導出した
* [ ] derived view を手編集禁止にした
* [ ] `calculationCanonGuard.test.ts` に derived view 一致テストを追加した
* [ ] Phase 2 guard 5件を前倒し導入した
* [ ] 既存 guard テスト互換性を壊していないことを確認した (`npm run test:guards`)

**やってはいけないこと**

* [ ] business / analytic / candidate を別の編集正本に分割していない
* [ ] derived view を手編集していない

---

## Phase 3: 契約固定 + bridge 境界

* [ ] `references/03-guides/contract-definition-policy.md` を作成した
* [ ] Business Contract テンプレートを定義した
* [ ] Analytic Contract テンプレートを定義した
* [ ] 対象計算に `contractId` を採番した
* [ ] `bridgeKind` を business / analytics に分けた
* [ ] 各 bridge に JSDoc で `semanticClass` と `contractId` を記載した
* [ ] `wasmEngine.ts` に `semanticClass` + `bridgeKind` メタデータを追加した
* [ ] `rateOwnership = engine` を固定した
* [ ] direct import 禁止方針を文書化した
* [ ] Phase 3 guard 6件を前倒し導入した
* [ ] `factorDecomposition` を business / analytic_decomposition として契約に反映した

**やってはいけないこと**

* [ ] 契約未固定のまま candidate 化を進めていない
* [ ] UI / VM / SQL で rate を再計算していない

---

## Phase 4: 既存 Rust/current 群の意味再分類・保守対象化

* [ ] current 群一覧を作成した
* [ ] 各 current 項目に `semanticClass` と `authorityKind` を付与した
* [ ] `factorDecomposition` を current/business として固定した
* [ ] `forecast` / `time-slot` を current/analytics として整理した
* [ ] `Cargo.toml` に semantic metadata を追加した
* [ ] current/business と current/analytics の運用 view を分けた
* [ ] current に candidate 状態遷移を持たせないことを guard 化した
* [ ] current 群の保守ポリシーを作成した (`references/03-guides/current-maintenance-policy.md`)

**やってはいけないこと**

* [ ] current 群を staging area として使っていない
* [ ] current に `dual-run` や `promotion-ready` を付けていない

---

## Phase 5: Tier 1 Business 候補移行

* [ ] Tier 1 business 候補一覧を作成した
* [ ] 各候補に Business Contract を付与した
* [ ] `businessMeaning` を書けない候補を対象外にした
* [ ] JS current reference を固定した
* [ ] candidate/business 実装を追加した
* [ ] business bridge に接続した
* [ ] dual-run compare を実装した
* [ ] rollback を実装した
* [ ] promotion-ready 判定表を作成した
* [ ] Phase 5 guard を導入した

**やってはいけないこと**

* [ ] candidate/business を current/business に直接混ぜていない
* [ ] analytics bridge に接続していない

---

## Phase 6: Analytic 候補移行

* [ ] analytic 候補一覧を作成した
* [ ] 各候補に Analytic Contract を付与した
* [ ] `methodFamily` と `invariantSet` を定義した
* [ ] JS current reference を固定した
* [ ] candidate/analytics 実装を追加した
* [ ] analytics bridge に接続した
* [ ] dual-run compare を実装した
* [ ] invariant 検証を追加した
* [ ] rollback を実装した
* [ ] promotion-ready 判定表を作成した
* [ ] Phase 6 guard を導入した

**やってはいけないこと**

* [ ] `factorDecomposition` を analytic 候補へ移していない
* [ ] business bridge に接続していない

---

## Phase 7: guard 統合整理 + JS 正本縮退方針

* [ ] Hard / Soft / Ratchet の3分類を整理した
* [ ] Phase 0〜6 の guard 重複を統合した
* [ ] violation message の標準形式を定義した
* [ ] JS 正本縮退 4段階（current reference / compare reference / fallback-only / retired-js）を定義した
* [ ] JS 撤去条件を定義した
* [ ] master / derived view 整合性 guard を確認した
* [ ] rule 追加条件 / 不要化条件を定義した

**やってはいけないこと**

* [ ] Phase 7 を guard 導入の開始点にしていない
* [ ] JS を一気に削除していない

---

## Phase 8: Promote Ceremony

* [ ] promote 提案書のフォーマットを作成した
* [ ] 判定主体が「AAG 証拠収集 → AI 提案 → 人間承認」であることを固定した
* [ ] dual-run 安定期間を満たした
* [ ] null / warning / methodUsed / scope 一致を確認した
* [ ] rollback 実演を確認した
* [ ] direct import 逸脱がないことを確認した
* [ ] AAG hard guard 全通過を確認した
* [ ] registry / contract / bridge metadata 更新準備を完了した
* [ ] promote 実施手順を実行した
* [ ] promote 失敗時の巻き戻し手順を準備した

**やってはいけないこと**

* [ ] 実装AIが自己承認していない
* [ ] promotion-ready だけで current 扱いにしていない

---

## Phase 9: JS retired-js 化

* [ ] current 昇格済み責務だけを対象にした
* [ ] dual-run 安定を再確認した
* [ ] rollback 方針固定を確認した
* [ ] 旧 JS path 禁止 guard を入れた
* [ ] direct import 残存を除去した
* [ ] JS reference を compare-reference → fallback-only → retired-js の順に下げた

**やってはいけないこと**

* [ ] repo 全体一括削除をしていない

---

## Phase 10: 物理構造の収束

* [ ] `semanticClass` 棚卸しが一巡している
* [ ] `review-needed` 主要対象が解消している
* [ ] master + derived view が安定している
* [ ] direct import guard が十分効いている
* [ ] small-batch で import 移動計画を作成した
* [ ] 必要範囲だけ物理移動した
* [ ] 必要なら Cargo workspace 再構成条件を満たしていることを確認した

**やってはいけないこと**

* [ ] 意味分類が揺れている状態で大規模リネームしていない

---

## Phase 11: 意味拡張 + UI 進化

* [ ] Business Semantic Core の境界が安定している
* [ ] Analytic Kernel の境界が安定している
* [ ] bridge / contract / fallback が安定している
* [ ] JS 正本縮退が主要対象で完了している
* [ ] 新しい KPI / 新しい説明指標 / 新しい業務意味の導入仕様を作成した
* [ ] UI 導入前に contract / registry / AAG への接続を確認した

---

## 常時チェック

* [ ] `npm run lint`
* [ ] `npm run format:check`
* [ ] `npm run build`
* [ ] `npm run test:guards`
* [ ] `npm test`
* [ ] `npm run docs:generate`

---

## 4つだけ毎回見る最重要項目

* [ ] `semanticClass` が正しいか
* [ ] current と candidate が混ざっていないか
* [ ] bridge を bypass していないか
* [ ] JS に新しい正本ロジックを足していないか
