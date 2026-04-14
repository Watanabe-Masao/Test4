# strengths — aag-format-redesign

> 役割: Phase 0 棚卸しの 1 次資料。現行 AAG / project 文書体系の良い点を
> 事実ベースで記録する。新フォーマットはこれらを **維持** することが前提。
>
> 形式: `[S-NN] 一文サマリ` / 事実 / なぜ良いか / 維持すべき理由

---

## S-01 AAG 5 層モデルが明確に分離されている

### 事実

- `references/01-principles/aag-5-constitution.md` で 5 層が定義:
  - Layer 1 Authority（人間）
  - Layer 2 Orchestration（CLAUDE.md）
  - Layer 3 Identity（ROLE.md）
  - Layer 4 Execution（SKILL.md / architectureRules / overlay）
  - Layer 4A System Operations（projects/*/checklist.md）
- 各層の責務と更新主体が明示されている
- 改修するときに「触ってよい層」と「触らない層」が判別できる

### なぜ良いか

- 改修の影響範囲を構造的に閉じ込められる
- 本 project（aag-format-redesign）も「Layer 4 と 4A だけ触る」と明示できた
- スコープ hijack を構造的に防ぐ

### 維持すべき理由

- 層を曖昧にすると、改修のたびに全層が同時に動いて事故が増える
- 本 project の不可侵原則 4 にも「AAG 5 層を壊さない」と書いた

---

## S-02 architectureRules の facade 設計

### 事実

- `app/src/test/architectureRules/index.ts` が consumer facade
- consumer は必ず facade 経由で参照する（`from '../architectureRules'`）
- `app/src/test/guards/aagDerivedOnlyImportGuard.test.ts` が direct import
  （`architectureRules/rules` / `@project-overlay/execution-overlay`）を禁止
- BaseRule（`app-domain/gross-profit/rule-catalog/base-rules.ts`）と
  Project Overlay（`projects/<id>/aag/execution-overlay.ts`）が
  `architectureRules/index.ts` で merge される

### なぜ良いか

- consumer 側から見ると「ルールは 1 箇所から取得」で済む
- App Domain と Project Overlay の境界が consumer に漏れない
- merge 経路を変更しても consumer は無変更

### 維持すべき理由

- facade を壊すと、ルール参照箇所全てに直接の merge 知識が漏れる
- サブプロジェクト機能を追加する際も、この facade 経路は維持する

---

## S-03 `executionOverlayGuard` の防御機能（仕様としては正しい）

### 事実

- `app/src/test/guards/executionOverlayGuard.test.ts` (7 tests) が:
  - 全 base rule に overlay があること
  - overlay に orphan ruleId がないこと
  - merge 後の全 rule が executionPlan と fixNow を持つこと
  - overlay の effort / priority / fixNow が妥当であること
- ルール追加時に overlay 漏れを構造的に防ぐ

### なぜ良いか

- BaseRule に新しいルールを追加したとき、overlay 漏れが必ず検出される
- merge 後の不完全状態を防ぐ
- 「動いているがメタデータが欠けている」状態を許さない

### 維持すべき理由

- 痛点 P-01 は「初期化時の負荷」の話であって、この防御機能自体は維持必須
- 緩和案は「初期化時の負荷を下げつつ、本来の防御は維持する」両立でなければ
  ならない

---

## S-04 ratchet-down 方式による段階的品質改善

### 事実

- 未分類数（BASELINE = 400）、タグ不一致数（BASELINE = 51）が
  `ratchet-down: 減少のみ許可`
- 減ったらベースライン更新を促す
- 増えると CI が落ちる
- `responsibilityTagGuard.test.ts` 等で実装

### なぜ良いか

- 「徐々に良くする」を制度として強制できる
- 「気をつける」を「機械的に減るしかない」に変換している
- 急いで全部直す必要がなく、トリガーは新規追加時に発動

### 維持すべき理由

- 段階的改善の唯一の構造的手段
- 新フォーマット導入時にも ratchet-down は使えるはず

---

## S-05 AAG ルールの双方向リンク（doc / impl / migration）

### 事実

- 各ルールが以下を持つ:
  - `what` / `why` / `doc` — 学習コスト削減
  - `correctPattern` / `example` — 自己修復
  - `outdatedPattern` / `codeSignals` — 検出
  - `migrationRecipe` — 修正手順
  - `executionPlan` — 工数 + 優先度
  - `decisionCriteria` — 判断の脱属人化
  - `relationships` — ルール間の因果
- ルールから文書・実装・移行手順に飛べる

### なぜ良いか

- ルールの存在理由とフィックス手順が同居している
- 「なぜダメか」と「どう直すか」が分離しない
- 学習コストが低い

### 維持すべき理由

- 新ルールを追加するときも、このフォーマットを踏襲する
- BaseRule のスキーマは触らない（本 project の不可侵原則）

---

## S-06 `docs:generate` による生成セクションの機械化

### 事実

- `references/02-status/generated/architecture-health.json` が KPI 正本
- generated section が古いと CI が落ちる（`docs:check` が差分を検出）
- prose に現在値を書かない原則
- パス変更に doc 更新義務がある（obligation map で自動検出）

### なぜ良いか

- 文書と実態の乖離を防ぐ
- 「数値だけ古い文書」が発生しない
- 文書もコードレビューの対象になる

### 維持すべき理由

- 痛点 P-04（直後の stale）は冪等性の話であって、機械化自体は維持必須
- 新フォーマットの導入時もこの仕組みを使う

---

## S-07 `project-checklist-governance` の品質

### 事実

- `references/03-guides/project-checklist-governance.md` が:
  - checklist の形式（`* [ ]` / `* [x]`）を機械検証
  - 最終レビューセクションの必須化
  - `derivedStatus = completed` への遷移を人間レビューで gate
  - bootstrap 手順 §10
- `app/src/test/guards/checklistFormatGuard.test.ts` で形式検証
- `app/src/test/guards/checklistGovernanceSymmetryGuard.test.ts` で
  governance との整合検証

### なぜ良いか

- 完了判定が機械化されている
- 人間レビューを必ず経由する構造的な gate がある
- archive プロセスへの遷移が制御されている

### 維持すべき理由

- 新フォーマットでも completion 判定の機械化は必須
- 派生セットを追加するときも、この gate は壊さない

---

## S-08 3 層分離（定義 / 実態 / 判断）

### 事実

- 定義層（人が更新、変わりにくい）: 原則・正本定義・受け入れ基準・invariant
- 実態層（機械が更新）: health metrics / snapshot / coverage / bundle size
- 判断層（人が更新、方針のみ）: roadmap / tradeoff / 移行方針
- prose に現在値を書かないルール

### なぜ良いか

- 文書の更新主体（人 vs 機械）が明確
- documentation rot を構造的に防ぐ
- 各層で更新頻度が違うことを認めている

### 維持すべき理由

- 新フォーマットの設計文書も同じ 3 層に従う
- 痛点（実態値の混入）を生まない設計の基盤

---

## S-09 `CURRENT_PROJECT.md` 1 行による project 切替

### 事実

- `CURRENT_PROJECT.md` の 1 行（`active: <project-id>`）で project を切替できる
- resolver / vite / vitest / collector が同期して動く
- `tools/architecture-health/src/project-resolver.ts:88-99` が解決ロジック

### なぜ良いか

- 切替コストが極小（1 行書き換え）
- 切り戻しも同じ 1 行
- 複数 project を並行で active にしておき、operationally 切替のみで動かせる

### 維持すべき理由

- 痛点 P-03 は「副作用検証手順」の話であって、切替の容易さ自体は維持必須
- サブプロジェクト機能でも、この切替経路は壊さない

---

## S-10 `AI_CONTEXT` / `HANDOFF` / `plan` / `checklist` の 4 文書分離

### 事実

- `AI_CONTEXT.md` — why（project の存在理由・scope）
- `HANDOFF.md` — now（現在地・次の作業・ハマりポイント）
- `plan.md` — how（不可侵原則・Phase 構造・禁止事項）
- `checklist.md` — what（completion の機械判定 input）
- `_template/` で枠組みが提供される

### なぜ良いか

- 文書ごとに役割が明確
- 「何を読めば何が分かるか」が予測可能
- 後任者が `HANDOFF.md` だけ読めば次の作業に着手できる

### 維持すべき理由

- 痛点 P-02 は「これ以上に派生セットも必要」という話であって、4 文書分離
  自体は維持必須
- 新フォーマットも `必須セット = 4 文書 + config` を維持する

---

## S-11 guard test の網羅性と速度

### 事実

- 68 files / 603 tests のガードが約 30 秒で走る
- `npm run test:guards` で構造制約を即時検証
- pre-push hook で全 guard が走る

### なぜ良いか

- 構造違反を即座に検出できる
- ローカルでも CI でも同じ結果
- 30 秒なので開発の妨げにならない

### 維持すべき理由

- 新 guard を追加する場合も、この速度を維持する
- 重い guard は別 lane に分離する文化がある

---

## S-12 不可侵原則の文書化習慣

### 事実

- 各 project の `plan.md` 冒頭に「不可侵原則」を必ず書く
- 「やってはいけないこと」セクションも必ず書く
- `unify-period-analysis` でも、本 project（aag-format-redesign）でも踏襲

### なぜ良いか

- scope hijack を文書レベルで防ぐ
- 後から「ついでにこれもやりたい」誘惑を構造的に却下できる
- 不可侵原則の違反が起きたら、それ自体がレビュー指摘になる

### 維持すべき理由

- 新フォーマットの必須セットに「不可侵原則」を残す
- 派生セットを追加する判断にも、不可侵原則を基準として使える

---

## S-13 Architecture Health の Hard Gate と KPI 集約

### 事実

- `architecture-health.json` が KPI 正本
- Hard Gate: PASS/FAIL を全 KPI 集約で判定
- 39 KPIs を `tools/architecture-health/src/main.ts` が collect → evaluate → render
- generated section が CLAUDE.md / technical-debt-roadmap.md / project-structure.md に埋め込まれる

### なぜ良いか

- 全体の健康状態が 1 ファイルから取得できる
- prose と数値が機械的に同期する
- KPI 追加時も collector を増やすだけ

### 維持すべき理由

- サブプロジェクト機能で `parent` 表示を追加する場合も、この collector
  パターンに従う（破壊的変更を加えない）

---

## まとめ — 維持すべき設計の核

1. **層の分離**（S-01, S-08）
2. **facade 経由の参照**（S-02）
3. **構造的防御 + ratchet-down**（S-03, S-04, S-11）
4. **機械化された生成・検証**（S-06, S-07, S-13）
5. **1 行切替の容易さ**（S-09）
6. **役割が明確な文書セット**（S-10, S-12）
7. **双方向リンク**（S-05）

新フォーマットはこれら全てを **壊さず**、痛点（pain-points.md）に対する
応答だけを additive に追加する。
