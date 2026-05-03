# 実装チェックリスト

## 0. 着手前の固定事項

- [x] 主役が粗利管理ツール本体で、AAG は保護機構であることを明記した
- [x] 分離対象が pure・deterministic・UI 非依存の計算責務だけであることを明記した
- [x] hook / store / QueryHandler / ViewModel / DuckDB query 実行が非対象であることを明記した
- [x] `factorDecomposition` を `semanticClass=business`、`methodFamily=analytic_decomposition` として固定した
- [x] registry 方針を **Master + Derived View** に固定した
- [x] 物理ディレクトリ分離は後ろ倒しにし、先に論理分離と guard を入れる方針を固定した

---

## Phase 0: 前提固定・用語スイープ

- [x] `references/01-foundation/semantic-classification-policy.md` を作成した
- [x] `references/01-foundation/engine-boundary-policy.md` を business / analytic 用語へ整合させた
- [x] `CLAUDE.md` に意味分類方針への参照を追加した
- [x] `references/04-tracking/authoritative-term-sweep.md` を作成した
- [x] 既存コード・コメント・テスト・文書内の `authoritative` 単独使用を洗い出した
- [x] 直せる `authoritative` 単独使用を修正した
- [x] 直せないものを `legacy-authoritative-usage` として ratchet 管理にした
- [x] `AR-TERM-AUTHORITATIVE-STANDALONE` を即時導入した
- [x] `npm run test:guards` で Phase 0 guard が通ることを確認した

---

## Phase 1: 意味分類 inventory

- [x] `references/03-implementation/semantic-inventory-procedure.md` を作成した
- [x] `references/04-tracking/semantic-inventory.yaml` を作成した
- [x] domain/calculations 配下 35 ファイルを inventory 化した
- [x] 各項目に `semanticClass` を付与した
- [x] 各項目に `authorityKind` / `runtimeStatus` / `migrationTier` を付与した
- [x] `factorDecomposition` を business として分類した
- [x] WASM 7 modules の意味再分類を反映した
- [x] non-target 一覧を固定した
- [x] `review-needed` 項目に理由を全件書いた

---

## Phase 2: CanonEntry 完全定義 + Derived View + 互換移行

- [x] `calculationCanonRegistry` を **唯一の master registry** として拡張した
- [x] `CanonEntry` に最終形フィールドを一括追加した
- [x] `SemanticClass` / `AuthorityKind` / `RuntimeStatus` / `OwnerKind` を定義した
- [x] `contractId` / `bridgeKind` / `rateOwnership` / `fallbackPolicy` / `migrationTier` を optional で先に入れた
- [x] Phase 2A: optional 追加を完了した
- [x] Phase 2B: warning + ratchet 移行を完了した
- [x] Phase 2C: required 項目の必須化を完了した
- [x] `app/src/test/semanticViews.ts` を作成した
- [x] `BUSINESS_SEMANTIC_VIEW` / `ANALYTIC_KERNEL_VIEW` / `MIGRATION_CANDIDATE_VIEW` を master から導出した
- [x] derived view を手編集禁止にした
- [x] `calculationCanonGuard.test.ts` に derived view 一致テストを追加した
- [x] Phase 2 guard 5件を前倒し導入した
- [x] 既存 guard テスト互換性を壊していないことを確認した (`npm run test:guards`)

---

## Phase 3: 契約固定 + bridge 境界

- [x] `references/03-implementation/contract-definition-policy.md` を作成した
- [x] Business Contract テンプレートを定義した
- [x] Analytic Contract テンプレートを定義した
- [x] 対象計算に `contractId` を採番した
- [x] `bridgeKind` を business / analytics に分けた
- [x] 各 bridge に JSDoc で `semanticClass` と `contractId` を記載した
- [x] `wasmEngine.ts` に `semanticClass` + `bridgeKind` メタデータを追加した
- [x] `rateOwnership = engine` を固定した
- [x] direct import 禁止方針を文書化した
- [x] Phase 3 guard 6件を前倒し導入した
- [x] `factorDecomposition` を business / analytic_decomposition として契約に反映した

---

## Phase 4: 既存 Rust/current 群の意味再分類・保守対象化

- [x] current 群一覧を作成した
- [x] 各 current 項目に `semanticClass` と `authorityKind` を付与した
- [x] `factorDecomposition` を current/business として固定した
- [x] `forecast` / `time-slot` を current/analytics として整理した
- [x] `Cargo.toml` に semantic metadata を追加した
- [x] current/business と current/analytics の運用 view を分けた
- [x] current に candidate 状態遷移を持たせないことを guard 化した
- [x] current 群の保守ポリシーを作成した (`references/03-implementation/current-maintenance-policy.md`)

---

## Phase 5: Tier 1 Business 候補移行

- [x] Tier 1 business 候補一覧を作成した
- [x] 各候補に Business Contract を付与した
- [x] `businessMeaning` を書けない候補を対象外にした
- [x] JS current reference を固定した
- [x] candidate/business 実装を追加した
- [x] business bridge に接続した
- [x] dual-run compare を実装した
- [x] rollback を実装した
- [x] promotion-ready 判定表を作成した
- [x] Phase 5 guard を導入した

---

## Phase 6: Analytic 候補移行

- [x] analytic 候補一覧を作成した
- [x] 各候補に Analytic Contract を付与した
- [x] `methodFamily` と `invariantSet` を定義した
- [x] JS current reference を固定した
- [x] candidate/analytics 実装を追加した
- [x] analytics bridge に接続した
- [x] dual-run compare を実装した
- [x] invariant 検証を追加した
- [x] rollback を実装した
- [x] promotion-ready 判定表を作成した
- [x] Phase 6 guard を導入した

---

## Phase 7: guard 統合整理 + JS 正本縮退方針

- [x] Hard / Soft / Ratchet の3分類を整理した
- [x] Phase 0〜6 の guard 重複を統合した
- [x] violation message の標準形式を定義した
- [x] JS 正本縮退 4段階（current reference / compare reference / fallback-only / retired-js）を定義した
- [x] JS 撤去条件を定義した
- [x] master / derived view 整合性 guard を確認した
- [x] rule 追加条件 / 不要化条件を定義した

---

## Phase 8: Promote Ceremony

- [ ] promote 提案書のフォーマットを作成した
- [ ] 判定主体が「AAG 証拠収集 → AI 提案 → 人間承認」であることを固定した
- [ ] dual-run 安定期間を満たした
- [ ] null / warning / methodUsed / scope 一致を確認した
- [ ] rollback 実演を確認した
- [ ] direct import 逸脱がないことを確認した
- [ ] AAG hard guard 全通過を確認した
- [ ] registry / contract / bridge metadata 更新準備を完了した
- [ ] promote 実施手順を実行した
- [ ] promote 失敗時の巻き戻し手順を準備した

---

## Phase 9: JS retired-js 化

- [ ] current 昇格済み責務だけを対象にした
- [ ] dual-run 安定を再確認した
- [ ] rollback 方針固定を確認した
- [ ] 旧 JS path 禁止 guard を入れた
- [ ] direct import 残存を除去した
- [ ] JS reference を compare-reference → fallback-only → retired-js の順に下げた

---

## Phase 10: 物理構造の収束

- [ ] `semanticClass` 棚卸しが一巡している
- [ ] `review-needed` 主要対象が解消している
- [ ] master + derived view が安定している
- [ ] direct import guard が十分効いている
- [ ] small-batch で import 移動計画を作成した
- [ ] 必要範囲だけ物理移動した
- [ ] 必要なら Cargo workspace 再構成条件を満たしていることを確認した

---

## Phase 11: 意味拡張 + UI 進化

- [ ] Business Semantic Core の境界が安定している
- [ ] Analytic Kernel の境界が安定している
- [ ] bridge / contract / fallback が安定している
- [ ] JS 正本縮退が主要対象で完了している
- [ ] 新しい KPI / 新しい説明指標 / 新しい業務意味の導入仕様を作成した
- [ ] UI 導入前に contract / registry / AAG への接続を確認した
