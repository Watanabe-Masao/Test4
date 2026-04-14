# current-state-survey — aag-format-redesign

> 役割: Phase 1 成果物。`pain-points.md` の各痛点（P-01〜P-09）に対応する
> 現行コードの箇所（ファイル・行）と解決経路を特定する。設計（Phase 2-4）は
> ここで整理した事実に対する応答として書く。
>
> 形式: `## 痛点` → `### 現行の該当箇所` → `### 解決経路（additive 方針）`

---

## P-01 新 project の overlay は全 140 ルール分を用意しないと guard で落ちる

### 現行の該当箇所

- `app/src/test/guards/executionOverlayGuard.test.ts:25-36` — BaseRule 全 rule に
  overlay があることを検査
- `app/src/test/architectureRules/merged.ts:28-46` — `EXECUTION_OVERLAY[rule.id]`
  が undefined なら throw（default 補完しない）
- `projects/aag-format-redesign/aag/execution-overlay.ts` 全 1425 行 —
  `pure-calculation-reorg` から継承された案件運用状態が混入している
- `projects/_template/` には `aag/execution-overlay.ts` が **存在しない**
  → コピーしただけでは build も test:guards も通らない

### 解決経路（additive 方針）

1. `app/src/test/architectureRules/defaults.ts`（新設）に BaseRule カテゴリ別
   デフォルト overlay を定義する
2. `merged.ts` の `mergeRules()` を変更し、overlay 未定義時は defaults を
   適用する（構造エラーから「明示 override 可能なデフォルト」へ）
3. `executionOverlayGuard.test.ts` は緩和せず、**derived merge 後**の全 rule が
   `executionPlan` / `fixNow` を持つことだけを検査する（現在の test 4-7 番は既にそうなっている）
4. test 1（BaseRule 全 rule に overlay がある）は「defaults を含めた実効 overlay」
   に対する検査に書き換え、**本来の防御機能（rule 追加時の overlay 漏れ）は維持**する
   （BaseRule 側で `defaultOverlayCategory` を定義し、defaults で全カバーすることで漏れ防止）
5. `projects/_template/aag/execution-overlay.ts` は **空の `EXECUTION_OVERLAY = {}`**
   を置き、defaults だけで動く状態を保証する
6. 既存 project（`pure-calculation-reorg` / `unify-period-analysis` / 本 project）の
   overlay はそのまま動く（明示 override が defaults を上書きする既存動作を保つ）

---

## P-02 `_template/` だけでは実行可能粒度に届かない

### 現行の該当箇所

- `projects/_template/` — `AI_CONTEXT.md` / `HANDOFF.md` / `plan.md` /
  `checklist.md` / `config/project.json` のみ
- `projects/unify-period-analysis/` には `pr-breakdown.md` / `review-checklist.md` /
  `acceptance-suite.md` / `test-plan.md` / `inventory/` が後付けで作られた
- `references/03-guides/project-checklist-governance.md:440-528` (§10) — 必須セット
  だけを bootstrap 手順として記述し、派生セットの判断基準がない

### 解決経路（additive 方針）

1. 必須セット（現行 5 ファイル）は触らない — これは S-10 の維持すべき核
2. `projects/_template/derived/` を新設し、派生セットのテンプレートを配置
   - `pr-breakdown.md` — PR 単位の分解
   - `review-checklist.md` — レビュー観点
   - `acceptance-suite.md` — 受入条件
   - `test-plan.md` — テスト計画
   - `inventory/README.md` — 棚卸し結果の固定先
3. 各派生テンプレートの冒頭に「このファイルを **いつ足すべきか** の判断基準」を
   明記する
4. `projects/_template/DERIVED.md` を新設し、派生セット全体の説明と判断フロー
   を集約する
5. `references/03-guides/new-project-bootstrap-guide.md` を新設し、§10 を補完する
   形で「必須セットだけで足りるケース vs 派生セットも必要なケース」を図示する

---

## P-03 `CURRENT_PROJECT.md` 切替の副作用が暗黙

### 現行の該当箇所

- `CURRENT_PROJECT.md` — 1 行 `active: <project-id>`
- `tools/architecture-health/src/project-resolver.ts:49-60` — active id 抽出
- `app/scripts/resolve-project-overlay.mjs:25-36` — vite/vitest alias 用
- `app/vite.config.ts:85` — `@project-overlay` alias
- `app/vitest.config.ts:46` — 同上
- 切替後の検証手順は全て手動。スクリプト化されていない

### 解決経路（additive 方針）

1. `app/scripts/verify-project-switch.mjs`（新設）を作り、以下を連続実行:
   - `CURRENT_PROJECT.md` のパース成否
   - `projects/<id>/config/project.json` の実在確認
   - overlay root（`aag/execution-overlay.ts`）の実在確認
   - resolver 出力の整合性チェック
2. `app/package.json` に `"verify:project": "node scripts/verify-project-switch.mjs"`
   を追加
3. `references/03-guides/new-project-bootstrap-guide.md` に「切替後の検証順序」を
   明記: `verify:project` → `test:guards` → `docs:check` → `lint` → `build`
4. 既存の resolver / alias 経路は無変更

---

## P-04 `docs:generate` 直後に `docs:check` が stale を出すことがある

### 現行の該当箇所

- `tools/architecture-health/src/main.ts`（入口）
- `tools/architecture-health/src/writers/`（generated section 書き込み）
- 実行時観測: 1 回目の `docs:generate` で更新したが、2 回目の `docs:check` で
  "stale" が出る現象が複数回発生

### 解決経路（additive 方針）

本 project の scope は「additive 改修」なので冪等性バグの原因特定は別タスクに
譲る。ただし以下は本 project で行う:

1. `current-state-survey.md` に「冪等性の調査が必要」と記録
2. `new-project-bootstrap-guide.md` の検証順序に「`docs:generate` を 2 回叩き、
   2 回目で差分が出なければ OK」という workaround を記載
3. 調査タスクを `quick-fixes` または別 project 化する方針を documentation-steward
   への集約課題として記録

---

## P-05 派生トピックの行き場がない

### 現行の該当箇所

- `projects/*/config/project.json` schema — `parent` field は未定義
- `tools/architecture-health/src/collectors/project-checklist-collector.ts` —
  親子関係の概念なし
- 既存 project を新規 bootstrap するコストが重く、派生トピックの行き場がない

### 解決経路（additive 方針）

1. `config/project.json` schema に `parent?: string` フィールドを optional で追加
2. `project-checklist-collector.ts` の `ProjectMeta` / `ProjectJson` に
   `parent?: string` を optional で追加
3. `project-health.json` / `project-health.md` に parent 表示を追加（最小限）
4. 新 guard `subprojectParentGuard.test.ts` を追加:
   - `parent` で指定された project が `projects/<id>/` 配下に実在する
   - 親子が循環していない
5. 既存 project は `parent` なしで動き続ける（optional なので破壊変更なし）
6. サブ project の AI_CONTEXT.md の Read Order に「親 project の AI_CONTEXT.md」
   を含めることを運用ルールとして明文化（guard は作らない — 運用ガイドで十分）

---

## P-06 `inventory/` のような派生ファイルセットの命名・配置が暗黙

### 現行の該当箇所

- `projects/unify-period-analysis/inventory/` — 連番+スラッグで自由命名
- 命名規約は project 間で共有されていない
- `projects/_template/` に inventory の雛形が存在しない

### 解決経路（additive 方針）

P-02 の解決経路と統合:
- `projects/_template/derived/inventory/README.md` に命名規約を記載:
  - `NN-<slug>.md`（NN は 2 桁連番）
  - 棚卸しセクションの標準見出し（事実 / 影響 / 設計案）
- guard は作らず、テンプレート遵守の努力義務とする（強制するには inventory の
  有無・数に揺れがあり過ぎる）

---

## P-07 「実行可能粒度に達した」ことを判定する仕組みがない

### 現行の該当箇所

- `project-checklist-collector.ts:228-279` — 必須 5 ファイルが揃えば
  `derivedStatus = in_progress` になる（= bootstrap 完了扱い）
- 派生セットの有無は derivedStatus に反映されない
- 「実行可能粒度」の機械判定はない

### 解決経路（additive 方針）

「実行可能粒度」は主観評価であり機械化は困難。以下で **判断を明示化** する:

1. `checklist.md` の Phase 1 相当に「準備」フェーズを置き、派生セットの有無を
   checkbox で管理する運用を新テンプレートで推奨する
2. `new-project-bootstrap-guide.md` に「実行可能粒度判定チェックリスト」を載せる
   （derived/README.md の DERIVED.md と相互参照）
3. 機械化は scope 外（Phase 7 以降の別 project）

---

## P-08 ブランチ名と project の対応が暗黙

### 現行の該当箇所

- ブランチ命名は運用慣習（`claude/<project-id>-<hash>`）
- project 切替と branch 切替の連動ルールはない

### 解決経路（additive 方針）

本 project の scope 外と判断する。`new-project-bootstrap-guide.md` に
「ブランチ命名は project id を含めることを推奨」と運用ヒントを載せるのみ。
guard は作らない。

---

## P-09 tsc OOM（pre-push hook 関連）

### 現行の該当箇所

- 環境問題であり、AAG / project 文書体系とは直接関係がない
- pre-push hook 内では OOM が出ない（複数回確認）

### 解決経路（additive 方針）

本 project の scope 外。`new-project-bootstrap-guide.md` に「手動 tsc 実行時は
`NODE_OPTIONS=--max-old-space-size=8192` を付与」と workaround を記載するのみ。

---

## 解決経路サマリ

| 痛点 | 本 project での解決 | scope 外 |
|---|---|---|
| P-01 | ✅ defaults overlay を新設し、merge で補完 | — |
| P-02 | ✅ `_template/derived/` を新設 | — |
| P-03 | ✅ `verify:project` script を追加 | — |
| P-04 | ⚠️ workaround を文書化（原因特定は別 project） | 原因調査 |
| P-05 | ✅ `parent` field + collector + guard | — |
| P-06 | ✅ `_template/derived/inventory/README.md` に規約 | — |
| P-07 | ⚠️ 運用ガイドで推奨（機械化なし） | 機械判定 |
| P-08 | ⚠️ 運用ヒントのみ | 強制化 |
| P-09 | ⚠️ workaround のみ | 原因解消 |

---

## 解決経路が触る層（AAG 5 層モデルへのマッピング）

| 層 | 触る / 触らない | 内容 |
|---|---|---|
| Layer 1 Authority | 触らない | — |
| Layer 2 Orchestration (CLAUDE.md) | 触らない | — |
| Layer 3 Identity (ROLE.md) | 触らない | — |
| Layer 4 Execution | **触る** | `architectureRules/defaults.ts` / `merged.ts` / guard 追加 |
| Layer 4A System Operations | **触る** | `_template/derived/` / bootstrap ガイド / `verify:project` |

不可侵原則 4（AAG Layer 1〜3 を触らない）を遵守。
