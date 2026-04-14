# New Project Bootstrap Guide

> 役割: 新しい project を立ち上げる際の手順とチェックリスト。
> `project-checklist-governance.md` §10 を補完し、派生セット判定・
> overlay defaults・切替検証の順序を実行可能な粒度で定義する。
>
> 根拠: `projects/completed/aag-format-redesign/` Phase 2-4 設計（AAG format redesign）。

---

## 1. いつこのガイドを使うか

- 新しい大きな project（`kind: project`）を立ち上げるとき
- 既存 project からサブ project を切り出すとき（親子リンク — P1）
- 小さな fix は `quick-fixes` に追記するだけでよい（本ガイドは不要）

---

## 2. 必須セット vs 派生セット

### 2.1 必須セット（常に 6 ファイル）

| ファイル | 役割 |
|---|---|
| `AI_CONTEXT.md` | why / scope / read order（stable） |
| `HANDOFF.md` | 現在地 / 次にやること / ハマりポイント（volatile） |
| `plan.md` | 不可侵原則 / Phase 構造 / 禁止事項 |
| `checklist.md` | completion 判定の機械入力 |
| `config/project.json` | manifest |
| `aag/execution-overlay.ts` | 案件運用状態の override（空でよい） |

### 2.2 派生セット（必要時のみ）

派生セットは `projects/_template/DERIVED.md` の判断フローで決める。
全部足す必要はない — **必要なものだけ** root にコピーする。

| ファイル | いつ使うか |
|---|---|
| `pr-breakdown.md` | 3 PR 以上に分かれる |
| `review-checklist.md` | 複数カテゴリのレビュー観点を引き継ぐ |
| `acceptance-suite.md` | 受入条件を機械検証したい |
| `test-plan.md` | テスト計画を先に立てたい |
| `inventory/` | 棚卸し結果が 3 ファイル以上になる |

---

## 3. bootstrap 手順

### Step 1: テンプレートをコピーする

```bash
cp -r projects/_template projects/<新 project id>
```

これにより必須セット 6 ファイル（`aag/execution-overlay.ts` を含む）と
`derived/` サブディレクトリと `DERIVED.md` がコピーされる。

### Step 2: 必須セットを埋める

各ファイルの `<PROJECT-ID>` / `<TITLE>` / `<...>` プレースホルダを実値で置換する。
詳細は `project-checklist-governance.md` §10 Step 4 と同じ。

### Step 3: 派生セットを決める

`projects/<id>/DERIVED.md` の 5 つの質問に答え、必要な派生ファイルだけを
project root にコピーする:

```bash
cd projects/<id>
cp derived/pr-breakdown.md pr-breakdown.md    # 必要なら
cp derived/test-plan.md test-plan.md          # 必要なら
# 使わないものは derived/ に残しておく
```

派生ファイルを足したら `HANDOFF.md` の関連文書表に行を追加する。

### Step 4: AAG overlay の初期化

新 project の `aag/execution-overlay.ts` は **空の `EXECUTION_OVERLAY = {}`**
で動く。全 rule は `app/src/test/architectureRules/defaults.ts` の
`DEFAULT_EXECUTION_OVERLAY` から自動解決される。

案件固有の override が必要になったら、上書きしたい rule だけを明示的に書く:

```ts
export const EXECUTION_OVERLAY: ExecutionOverlay = {
  'AR-001': { fixNow: 'debt' }, // priority / effort は defaults を使う
}
```

### Step 5: サブ project の場合は parent を設定

親 project から切り出したサブ project なら `config/project.json` に `parent`
を追記する:

```jsonc
{
  "projectId": "<sub-id>",
  "parent": "<parent-project-id>",
  "projectRoot": "projects/<sub-id>",
  ...
}
```

さらにサブ project の `AI_CONTEXT.md` の Read Order に **親の AI_CONTEXT.md**
を必ず含める（文脈継承のため）。

### Step 6: CURRENT_PROJECT.md を切り替える

```markdown
active: <新 project id>
```

### Step 7: 切替検証（新設）

**切替直後に必ず以下の順序で実行する**。P-03（切替の副作用が暗黙）への対処。

```bash
cd app
npm run verify:project      # 1. CURRENT_PROJECT / manifest / overlay / alias 整合性
npm run test:guards         # 2. 全 guard が PASS（新 project の構造検証）
npm run docs:generate       # 3. generated section 更新
npm run docs:check          # 4. generated section の整合性（stale 時は再度 generate）
npm run lint                # 5. ESLint
npm run build               # 6. tsc + vite build
```

### Step 8: open-issues.md の索引に追加

`references/02-status/open-issues.md` の `## active projects` テーブルに
新 project の行を追加する。

---

## 4. 実行可能粒度判定チェックリスト

必須セットを埋めた直後、以下を確認する。**NG** が 1 つでもあれば派生セットを
追加するか、HANDOFF.md を補強する。

* [ ] `AI_CONTEXT.md` を読めば 1 分以内に「何を達成する project か」が分かる
* [ ] `plan.md` の不可侵原則に「何を触ってはいけないか」が具体的に書かれている
* [ ] `HANDOFF.md` の「次にやること」を読めば次の作業に着手できる
* [ ] `checklist.md` の各 checkbox が **機械的に検証可能** な粒度まで分解されている
* [ ] 3 PR 以上に分かれる場合は `pr-breakdown.md` を作成した
* [ ] 複数レビュー観点を引き継ぐ必要がある場合は `review-checklist.md` を作成した

---

## 5. bootstrap チェックリスト（コピペ用）

新 project の `checklist.md` Phase 1 に以下を貼り付けることができる:

```markdown
## Phase 1: Bootstrap

* [ ] `_template/` をコピーして必須セットを埋めた
* [ ] `DERIVED.md` の判断フローで派生セットを決定した
* [ ] 必要な派生ファイルを root にコピーした
* [ ] `aag/execution-overlay.ts` の初期状態（空 or 最小 override）を確定した
* [ ] `config/project.json` を実値に置換した（サブ project なら parent も）
* [ ] `CURRENT_PROJECT.md` を切り替えた
* [ ] `npm run verify:project` が PASS
* [ ] `npm run test:guards` が PASS
* [ ] `npm run docs:generate` + `docs:check` が PASS
* [ ] `npm run lint` + `npm run build` が PASS
* [ ] `open-issues.md` に行を追加した
```

---

## 6. workaround 集（本 project scope 外の既知事象）

### 6.1 `docs:check` が stale を返すとき（P-04）

`docs:generate` を実行した直後でも `docs:check` が "stale" を返すことがある。
原因未特定（別タスクでの調査対象）。**回避策**:

```bash
cd app && npm run docs:generate  # 1 回目
cd app && npm run docs:generate  # 2 回目
cd app && npm run docs:check     # PASS するはず
```

### 6.2 `tsc -b` の OOM（P-09）

手動で `npx tsc -b --noEmit` を叩いたときに OOM になる環境がある（pre-push
hook 内は発生しない）。**回避策**:

```bash
NODE_OPTIONS="--max-old-space-size=8192" npx tsc -b
```

### 6.3 ブランチ命名（P-08）

project 切替と branch 切替の連動ルールはない。**推奨**:
- ブランチ名に project id を含める（例: `claude/<project-id>-<hash>`）
- 複数 project の変更を同じ branch に混ぜない

---

## 7. 関連文書

| 文書 | 役割 |
|---|---|
| `references/03-guides/project-checklist-governance.md` | §10 の bootstrap 原典 / checklist 運用規約 |
| `projects/_template/DERIVED.md` | 派生セットの判断基準 |
| `projects/_template/derived/README.md` | 派生テンプレート集 |
| `projects/completed/aag-format-redesign/new-format-design.md` | 新フォーマット設計の根拠 |
| `projects/completed/aag-format-redesign/overlay-bootstrap-design.md` | overlay defaults の設計 |
| `projects/completed/aag-format-redesign/subproject-design.md` | サブ project 機能（P1）の設計 |
| `app/src/test/architectureRules/defaults.ts` | DEFAULT_EXECUTION_OVERLAY 正本 |
| `app/scripts/verify-project-switch.mjs` | `verify:project` 実装 |
