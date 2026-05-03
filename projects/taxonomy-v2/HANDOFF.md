# HANDOFF — taxonomy-v2

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

**Phase 1 + Phase 2 + Phase 3 + Phase 4（実装完遂、観察期間中）。両子 archive 済、親は active 維持で連続 2 四半期観察フェーズへ移行（2026-04-27〜）。**

> **2026-04-27 親 Phase 4 部分完遂 (本 branch):**
>
> - 両子 archive 完遂: `projects/{responsibility,test}-taxonomy-v2/` → `projects/completed/{responsibility,test}-taxonomy-v2/` (両子 checklist 全 [x] + 最終レビュー [x])
> - 親 Phase 4 制度成立 5 要件: **4/6 [x]**（残 2 = 「四半期 review window 2 回以上」+ 「interlock マトリクス違反 0 連続 2 四半期」、forward-looking commitment）
> - 親 Phase 4 OCS 稼働確認: **5/7 [x]**（残 2 = 「Promotion Gate L6 全タグ到達」+ 「Drift Budget 連続 2 四半期」、いずれも観察フェーズ依存）
> - 親 Phase 4 Anchor Slice 拡大: **3/3 [x]**（段階 1 / 2 / 3 全完遂）
> - 親 最終レビュー (人間承認): **[ ] 観察期間後に [x]**（次回 review window 2026-Q3 で 2 件目 entry 確定 + interlock 違反 0 連続 2 四半期到達後）

### 観察期間中の到達条件 (2026-Q3 review window 想定)

1. `taxonomy-review-journal.md` に 2 件目の review window entry が landing (§3.2 Constitution context 改訂提案の確定 + 新規提案いずれかで)
2. `taxonomyInterlockGuard` 9/9 PASS が 2026-Q2 〜 2026-Q3 の連続 2 四半期維持
3. `taxonomy-health.json` の Drift Budget が連続 2 四半期 0 維持
4. 残検討: registry V2 frontmatter に per-tag promotion field 拡張（L6 Health-tracked 到達）— §3.2 改訂提案の implementation 候補

> **2026-04-27 子 project 全 Phase 完遂 (子 retrospective fixes 含む):**
>
> - 責務軸: Phase 0-9 + retrospective fixes 完遂、`projects/completed/responsibility-taxonomy-v2/` へ archive
> - テスト軸: Phase 0-9 + retrospective fixes 完遂、`projects/completed/test-taxonomy-v2/` へ archive
> - retrospective fixes A+D+B+I+G で dead code purge + collector live count + lifecycle transition guard + Constitution context 改訂提案 を landing
> - 関連 PR: #1172 〜 #1187（16 PR）



> **最新セッション履歴 (2026-04-26):**
>
> 1. 親 plan に Operational Control System §OCS.1〜§11 + AR-TAXONOMY-\* 7 件 + taxonomy-health.json schema 追加（main merge 済 / PR #1172）
> 2. Phase 1 Constitution 5 deliverables landing
> 3. Phase 2 Review Window 仕様 landing
> 4. constitutionBootstrapGuard に 13 invariants（B1〜B13）を実装、real drift 2 件を発見・修正
> 5. **Phase 3 子立ち上げ完遂**: 親 plan に §Common Inventory Schema（CanonEntry shape）追加 / 両子 plan の Phase 0 + Phase 3 を §OCS.6 / §OCS.7 / §OCS.5 と接続 / 両子 HANDOFF を「Phase 0 着手承認済」に更新
>
> **作業 branch:** `claude/taxonomy-v2-phase3-setup-4TGS2`
> **本セッション着手前の HEAD:** Phase 1+2 が main マージ済（PR #1172）

### Phase 進捗（親 checklist）

```
✅ Phase 1: Constitution 起草           — 18/20 [x] (Origin Journal v1 20 タグ採取は子 Phase 0 担当)
✅ Phase 2: Review Window 仕様          — 8/8 [x]
✅ Phase 3: 子 project 立ち上げ         — 9/9 [x] (Anchor Slice 確定 + 子 kickoff + Common Inventory Schema 合意)
□  Phase 4: 制度成立確認 + archive      — 0/14 [ ] (子 archive 後)
```

### 3 project の役割（再掲）

```
taxonomy-v2 (親)
  ├─ Phase 1: Constitution 起草          ← ✅ 完遂
  ├─ Phase 2: review window 仕様         ← ✅ 完遂
  ├─ Phase 3: 子 project 立ち上げ         ← ✅ 完遂
  └─ Phase 4: 制度成立確認 + archive     ← 子 archive 後

responsibility-taxonomy-v2 (子: 責務軸)
  └─ Phase 0-9（Inventory → Legacy Collection まで）

test-taxonomy-v2 (子: テスト軸)
  └─ Phase 0-9（Inventory → Legacy Collection まで）
```

### Phase 1 + Phase 2 で landing したもの

| 領域                         | 成果物                                                                                                                                                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **App Domain 層 (仕様正本)** | `references/01-foundation/taxonomy-constitution.md` (7 原則 + OCS 統合 + 制度成立 5 要件) / `taxonomy-interlock.md` (R⇔T 完全マトリクス) / `taxonomy-origin-journal.md` (Origin 形式 + Anchor Slice skeleton) |
| **運用ガイド**               | `references/03-implementation/taxonomy-review-window.md` (四半期 window 手続き + 判定基準 + AI reject §7)                                                                                                             |
| **運用記録**                 | `references/04-tracking/taxonomy-review-journal.md` (skeleton + Lifecycle 遷移範囲表)                                                                                                                           |
| **AI 制約**                  | `CLAUDE.md` §taxonomy-binding (AI Vocabulary Binding)                                                                                                                                                         |
| **検証 guard**               | `app/src/test/guards/constitutionBootstrapGuard.test.ts` (B1〜B13 = 13 invariants)                                                                                                                            |
| **doc-registry**             | AAG カテゴリに 4 件登録 (constitution / interlock / origin-journal / review-journal / review-window)                                                                                                          |

### constitutionBootstrapGuard が catch する 13 シナリオ

| 範囲     | 件数 | カバー軸                                                                             |
| -------- | ---- | ------------------------------------------------------------------------------------ |
| B1〜B7   | 7    | 静的（file 存在 + section heading + canonical link integrity）                       |
| B8〜B10  | 3    | 意味的（原則↔AR mapping 双方向 / Interlock §2.1↔§2.2 / Anchor Slice 4 文書一致）     |
| B11〜B13 | 3    | token-level drift（Lifecycle 6 states / Promotion Gate L0-L6 / Review Window §1-§9） |

各 invariant の「何を弾くか / 何が壊れている可能性」は `app/src/test/guards/constitutionBootstrapGuard.test.ts` 冒頭 JSDoc table を参照。

### Phase 3 で landing したもの（本セッションで完遂）

| 領域                        | 成果物                                                                                                                            |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Common Inventory Schema** | 親 `projects/taxonomy-v2/plan.md` §Common Inventory Schema（CanonEntry shape） — 両子 Phase 0 出力の正本 shape                    |
| **子 plan の Phase 0 接続** | 両子 plan.md Phase 0 を §OCS.6 Drift Budget baseline + §OCS.7 Anchor Slice + §OCS.5 L2 Origin-linked に接続                       |
| **子 plan の Phase 3 接続** | 両子 plan.md Phase 3 を §AR-TAXONOMY-\* active 化 + Anchor Slice §OCS.5 L4（Guarded） + taxonomy-health.json collector 実装に接続 |
| **子 kickoff 承認の記録**   | 両子 HANDOFF.md を「Phase 0 着手承認済（kicked off, 2026-04-26）」+ 着手承認の根拠 4 項目に更新                                   |
| **親文書の links**          | 親 AI_CONTEXT.md に「子 project の現状」表 / 親 HANDOFF.md に Phase 進捗 9/9 [x] と Phase 3 改訂履歴 entry 追加                   |
| **親 checklist 9 件 [x]**   | Anchor Slice 確定 (3) + 子 kickoff (4) + OCS baseline 約束 (2) — 全件 [x]                                                         |

### 検出された real drift（2 件、本セッションで修正済）

1. **review-journal.md §1 が 4 lifecycle states (proposed / sunsetting / retired / archived) を欠落** — B11 が発見。§1 に Lifecycle 遷移範囲表を追加して対応
2. **plan §OCS.5 Promotion Gate が canonical 英語名と drift** — B12 が発見。`Registered / Origin-linked / Interlock-bound / Guarded / Coverage / Health-tracked` に揃えて修正

これらは「テストがなければ silent drift で残った」典型例（TSIG H1 False Green）。

### 着手順序（残り）

1. ~~**親 Phase 3**（子 2 件を同時着手） — Anchor Slice 5 R:tag + 6 T:kind を確定承認 + 子の Phase 0 Inventory キックオフ~~ ✅ 本セッションで完遂
2. **長期並行運用** — 子 Phase 0-9 は並列で進行（両軸の review window を同期）
3. **親 Phase 4**（両子 archive 確認 + 親 archive） — 制度成立 5 要件達成

## 2. 次にやること

### セッション開始時の確認コマンド

```bash
# branch 確認
git status -sb

git log --oneline -8

# ヘルスチェック
cd app && npm run docs:generate
# → Healthy / Hard Gate PASS

# 親 + 子 plan / checklist の現状把握
cat projects/taxonomy-v2/HANDOFF.md                    # ← 本ファイル
cat projects/taxonomy-v2/checklist.md                  # Phase 進捗
cat projects/completed/responsibility-taxonomy-v2/checklist.md   # 子: 責務軸 Phase 0
cat projects/completed/test-taxonomy-v2/checklist.md             # 子: テスト軸 Phase 0
```

### 高優先（次セッション = 子 Phase 0 Inventory）

親 Phase 3 が完了したため、次は両子の Phase 0 Inventory に着手する。
両子は **並列進行可能**（vocabulary 設計のみ同期 review window が必要）。

#### 子: 責務軸（responsibility-taxonomy-v2）Phase 0

- 35+ 対象ファイルの現 v1 タグを CanonEntry shape で `references/04-tracking/responsibility-taxonomy-inventory.yaml` に出力
- 既存 v1 の 20 タグを Origin Journal §R に転記（親 Phase 1 残 2 checkbox の解消）
- §OCS.6 Drift Budget の責務軸 baseline（`untagged` / `unknownVocabulary` / `missingOrigin`）を計測
- §OCS.7 Anchor Slice 5 R:tag に対応する file を `anchorSlice.anchorTag` field で識別

#### 子: テスト軸（test-taxonomy-v2）Phase 0

- 既存テスト全件の粗分類を CanonEntry shape で `references/04-tracking/test-taxonomy-inventory.yaml` に出力
- 既存 TSIG-\* rule を Origin Journal §T に転記
- §OCS.6 Drift Budget のテスト軸 baseline を計測
- §OCS.7 Anchor Slice 6 T:kind に対応する test を `anchorSlice.anchorTag` field で識別

#### Anchor Slice 確定（親 Phase 3 で承認済 — 参照のみ）

両子 Phase 0 が baseline 対象とする Anchor Slice:

- **5 R:tag**: `R:calculation` / `R:bridge` / `R:read-model` / `R:guard` / `R:presentation`
- **6 T:kind**: `T:unit-numerical` / `T:boundary` / `T:contract-parity` / `T:zod-contract` / `T:meta-guard` / `T:render-shape`

両子 Phase 3（Guard 実装）の完了条件として「Anchor Slice §OCS.5 Promotion Gate L4（Guarded）到達」が checklist 化されていることを確認。

### 中優先（次セッション = 子 project 進行中）

- 子 Phase 0 Inventory 完了 → 子 Phase 1 Schema 設計に進む
- Origin Journal の v1 20 タグ採取（子 Phase 0 の deliverable、親 Phase 1 残 2 checkbox がここで [x] になる）
- 初回 review window 開催準備（Phase 2 Review Window 仕様に従う）

### 低優先（子 project 進行が安定後）

- 子 Phase 3 で AR-TAXONOMY-\* 7 件の active 化
- 子 Phase 6 で全タグ §OCS.5 L5（Coverage 100%）到達
- 親 Phase 4 で taxonomy-health.json + architecture-health 統合

### Phase 3 で穴の可能性がある領域（深掘りテスト未対応）

ユーザー指摘の「穴チェック」継続項目（次セッション以降で B14+ として追加候補）:

| 領域                                                                    | 検出されていない drift               |
| ----------------------------------------------------------------------- | ------------------------------------ |
| Constitution 原則ごとの 3 要素 (何が壊れる/どう守る/判断) 構造一貫性    | 1 要素だけ消されても気付かない       |
| CLAUDE.md §taxonomy-binding ↔ review-window.md §9 OCS.9 boundary 一貫性 | AI 制約の 2 文書間齟齬               |
| TXE 例外形式 (review-window §4.3 vs journal §3) 一致                    | 形式齟齬で TXE-NNN 採番ルール混乱    |
| AR-TAXONOMY-\* baseline 戦略 (Constitution §8 + plan)                   | rule によって戦略が抜ける silent gap |
| doc-registry 4 entries each ↔ Constitution/plan 双方向 link             | doc-registry 登録だけして孤立        |

これらは Phase 3 着手後、必要に応じて追加（過剰に増やすと **テスト自身が cognitive load 違反**になる、原則 7）。

## 3. ハマりポイント

### 3.1. 「移行コストを考えない」= Phase が長大になる

本 project は migration cost を度外視した設計のため、短期で見ると成果が
見えにくい。「Phase 1 Constitution だけで 1 ヶ月」といった時間配分を
最初から覚悟する必要がある。

**対策:**

- 子 project は独立に `in_progress` カウントされるため、全体の進捗は
  `project-health.json` で可視化される
- 四半期ごとに「Constitution landed / schema v2 landed / R:unclassified 能動付与率」
  等の milestone で成果を確認

### 3.2. 親が "制度設計" に偏ると実装が進まない

親 project は Constitution 起草が scope だが、実装のないまま文書だけ増えると
制度が absolute になりがち。

**対策:**

- 親 Phase 1 完了時点で「子 Phase 0 が実行可能な状態」を必達
- Constitution は "子が読めば実装を起動できる" 精度で書く（抽象論に閉じない）

### 3.3. 2 軸の同期 review window

responsibility-taxonomy-v2 と test-taxonomy-v2 の vocabulary 追加・撤退は
**同一 review window で同時裁定** するのが原則。片軸だけ先行すると interlock が
崩れる。

**対策:**

- 親 Phase 2 で「四半期の同期 review window」を明文化
- 各子 Phase 5 の Operations で同じ window 手続きを参照
- 片軸単独の window 裁定は許容するが、直後の同期 window で他軸に連動効果を確認

### 3.4. Cognitive Load Ceiling と現実の衝突

原則 7「Vocabulary は認知上限以下に保つ」を守ると、実際のコードパターンが
vocabulary を超過する可能性がある（統合を強制される）。

**対策:**

- 認知上限は "1 人が把握できる範囲" を基準にする（現状 15 程度）
- 子 project で upper bound 超過が起きた場合、統廃合 or 親 Constitution 変更の
  2 択を Discovery Review で裁定（親の権限）

### 3.5. AI Vocabulary Binding の徹底

本 repo は AI が主要開発者の一角。AI が勢いで新タグを作ると原則 3（タグ生成は
高コスト）が崩壊する。

**対策（実装済 + 残作業）:**

- ✅ 親 Phase 1 で `CLAUDE.md` に §taxonomy-binding を追記（landing 済）
- ✅ Constitution §3 原則 3 + review-window.md §2.3 + §7 で AI 制限を明文化
- ✅ AI は既存タグ or `R:unclassified` のみ許容、新タグ提案は禁止
- ⏳ AI 提案の新タグが git diff に現れたら `AR-TAXONOMY-AI-VOCABULARY-BINDING` で block（**子 Phase 3 で実装**）

### 3.6. principles.json の obligation.principles.contracts 発火

`references/01-foundation/` 編集時、`docs/contracts/principles.json` の
更新義務（obligation.principles.contracts）が発火する。本 project は A-I+Q 9
カテゴリ設計原則そのものを追加・変更しないが、$comment 末尾に landing 経緯を
追記して obligation を解消する運用が確立済（既存パターン: test-signal-integrity /
aag-projectization-policy / **本 taxonomy-v2 Phase 1**）。

**対策:**

- `references/01-foundation/taxonomy-*.md` を編集したら必ず `principles.json`
  $comment に「設計原則そのものは不変」を明記する 1 文を追加
- `docs:generate` で Hard Gate FAIL → $comment に経緯追記 → 再 docs:generate で PASS

### 3.7. pre-push hook の docs:check 自動実行

新しい pre-push hook が docs:check を強制する。新規ファイル追加時の format:check
失敗が頻出するため:

**対策:**

- 新規 `.md` / `.ts` を作成したら `cd app && npx prettier --write <file>` を即実行
- 新規 test ファイルは TSIG self-check（existence-only 回避）を満たすこと
- principles.json $comment 更新を忘れない（上記 3.6）

### 3.8. テストの「穴チェック」継続方針

ユーザー指摘の通り、テストは「何を通すか」だけでなく「**何を弾くか / 何が壊れている可能性があるか**」を
明示する必要がある。

**現状の constitutionBootstrapGuard は 13 invariants で**:

- 静的 (B1-B7) / 意味的 (B8-B10) / token-level drift (B11-B13) の 3 軸で網羅
- 各 invariant の **失敗シナリオ**を JSDoc table で documentation-as-test 化
- 完全な「変更 source → 影響 spec → tag → test obligation → 欠落 guard → CI/health」chain は taxonomy:impact CLI（Phase I-equivalent、子 Phase 5 Operations）で実現

**継続方針:**

- 新セクション / 新概念を Constitution / Interlock / Origin Journal に追加した場合、
  **対応する invariant を constitutionBootstrapGuard に追加**する（drift 自動検出のため）
- ただし invariant を増やしすぎない（**テスト自身が cognitive load 違反**になる、原則 7）
- 「穴の可能性」候補は §2「次にやること」末尾の表に列挙済

## 4. 関連文書

### 親 project 内

| ファイル              | 役割                                                                                                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `AI_CONTEXT.md`       | プロジェクト意味空間の入口（why / scope）                                                                                                                          |
| **`plan.md`**         | **7 不可侵原則 + Phase 構造 + Interlock 仕様 + 8 昇華メカニズム + Operational Control System §OCS.1〜§11 + AR-TAXONOMY-\* 7 件仕様 + taxonomy-health.json schema** |
| **`checklist.md`**    | **Phase 1 (18/20 [x]) / Phase 2 (8/8 [x]) / Phase 3 (9/9 [x]) / Phase 4 (0/14 [ ])**                                                                               |
| `config/project.json` | project 設定                                                                                                                                                       |

### Phase 1 + Phase 2 で landing した正本（App Domain 層）

| ファイル                                                     | 役割                                                                                         |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| **`references/01-foundation/taxonomy-constitution.md`**      | **7 不可侵原則 + OCS 統合 + 制度成立 5 要件**（Phase 1 deliverable）                         |
| **`references/01-foundation/taxonomy-interlock.md`**         | **R⇔T 完全マトリクス + Anchor Slice + 検証ロジック**（Phase 1 deliverable）                  |
| **`references/01-foundation/taxonomy-origin-journal.md`**    | **Origin 形式 + Anchor Slice skeleton + R/T:unclassified 確定 entry**（Phase 1 deliverable） |
| **`references/03-implementation/taxonomy-review-window.md`**         | **四半期 window 手続き + 判定基準 + AI reject 手順**（Phase 2 deliverable）                  |
| **`references/04-tracking/taxonomy-review-journal.md`**        | **review window 記録 skeleton + Lifecycle 遷移範囲表**（Phase 2 deliverable）                |
| **`CLAUDE.md` §taxonomy-binding**                            | **AI Vocabulary Binding**（Phase 1 deliverable）                                             |
| **`app/src/test/guards/constitutionBootstrapGuard.test.ts`** | **B1〜B13 = 13 invariants**（Phase 1 deliverable + B8-B13 深掘り追加）                       |

### 既存 AAG / governance 関連

| ファイル                                                       | 役割                                                                                   |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `references/05-aag-interface/operations/project-checklist-governance.md`         | 運用ルール（AAG Layer 4A）                                                             |
| `references/99-archive/adaptive-architecture-governance.md` | AAG 5.2 Constitution（思想的根拠）                                                     |
| `app/src/test/responsibilityTagRegistry.ts`                    | 現行 v1 の正本（子 Phase 0 で v2 化）                                                  |
| `app/src/test/guards/testSignalIntegrityGuard.test.ts`         | 現行 TSIG（子 Phase 0 で T:kind 認識化）                                               |
| `docs/contracts/principles.json`                               | A-I+Q 9 カテゴリ設計原則の正本（taxonomy-v2 は不変、$comment に landing 経緯のみ追記） |

### 子 project（Phase 0 着手承認済）

| ファイル                                                | 役割                                            |
| ------------------------------------------------------- | ----------------------------------------------- |
| **`projects/completed/responsibility-taxonomy-v2/AI_CONTEXT.md`** | **子: 責務軸**（Phase 0 着手可能 2026-04-26）   |
| `projects/completed/responsibility-taxonomy-v2/HANDOFF.md`        | kickoff 承認の根拠を記載                        |
| `projects/completed/responsibility-taxonomy-v2/plan.md`           | Phase 0 / Phase 3 を §OCS.6 / §OCS.7 接続済     |
| `projects/completed/responsibility-taxonomy-v2/checklist.md`      | 子: 責務軸 Phase 0-9                            |
| **`projects/completed/test-taxonomy-v2/AI_CONTEXT.md`**           | **子: テスト軸**（Phase 0 着手可能 2026-04-26） |
| `projects/completed/test-taxonomy-v2/HANDOFF.md`                  | kickoff 承認の根拠を記載                        |
| `projects/completed/test-taxonomy-v2/plan.md`                     | Phase 0 / Phase 3 を §OCS.6 / §OCS.7 接続済     |
| `projects/completed/test-taxonomy-v2/checklist.md`                | 子: テスト軸 Phase 0-9                          |

### 関連姉妹 project

| ファイル                                        | 役割                                                    |
| ----------------------------------------------- | ------------------------------------------------------- |
| `projects/completed/phased-content-specs-rollout/plan.md` | 同じ運用制御 pattern を採用する姉妹 project（先行採用） |
| `projects/pure-calculation-reorg/HANDOFF.md`    | 姉妹 project（同じ制度化フレーム）                      |

## 5. 改訂履歴

| 日付       | 変更                                                                                        | branch / commit                                                            |
| ---------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 2026-04-21 | 親 + 子 2 件の雛形作成（scheduled）                                                         | `claude/...` (archive 済)                                                  |
| 2026-04-26 | Operational Control System §OCS.1〜§11 + AR-TAXONOMY-\* + taxonomy-health.json schema 追加  | `claude/taxonomy-v2-operational-control` (origin push 済、main merge 待ち) |
| 2026-04-26 | Phase 1 Constitution 5 deliverables landing                                                 | `claude/taxonomy-v2-phase1-constitution` `e90286a`                         |
| 2026-04-26 | Phase 2 Review Window 仕様 landing                                                          | `claude/taxonomy-v2-phase1-constitution` `0464c76`                         |
| 2026-04-26 | constitutionBootstrapGuard B8/B9/B10 + 原則 6 alt-path 文書化                               | `claude/taxonomy-v2-phase1-constitution` `8bc0585`                         |
| 2026-04-26 | constitutionBootstrapGuard B11/B12/B13 + real drift 2 件修正                                | `claude/taxonomy-v2-phase1-constitution` `d6d1bfc`                         |
| 2026-04-26 | Phase 3 子 project 立ち上げ完遂（Anchor Slice 確定 + Common Inventory Schema + 子 kickoff） | `claude/taxonomy-v2-phase3-setup-4TGS2` (本セッション)                     |
