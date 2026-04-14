# migration-guide — aag-format-redesign

> 役割: Phase 6 成果物。既存 project を新フォーマットに移行する際の手順書。
> **本ガイドは実行しない**。移行は本 project 完了後の別タスク。
>
> 不可侵原則 5（既存 project の移行は本 project の scope 外）を遵守。

---

## 1. 対象 project と現状

| projectId | kind | 現状 | overlay 行数 | 派生ファイル |
|---|---|---|---|---|
| `aag-format-redesign` | project | active（本 project） | 1425（継承） | 本 project が作成した design docs |
| `pure-calculation-reorg` | project | active | 1425（正本） | 複数（独自配置） |
| `unify-period-analysis` | project | 凍結 | 1425（継承） | 後付け 5 セット |
| `quick-fixes` | collection | 継続 | — | — |
| `completed/*` | — | archive 済み | — | — |

---

## 2. 移行による利得

各 project が得るもの:

| 痛点 | 移行後の状態 |
|---|---|
| P-01 overlay 全 140 要件 | 空 overlay + defaults で動く。案件固有 override のみ残る |
| P-02 実行可能粒度 | 派生セット判定フローで補足ファイルが標準化 |
| P-03 切替副作用 | `verify:project` で切替検証が定型化 |
| P-05 派生トピック | `parent` field でサブ project 化可能 |
| P-06 命名規約 | `inventory/NN-<slug>.md` が template で提示される |

---

## 3. 移行の判断基準

移行は以下のいずれかを満たす project から順に実施する:

1. **active かつ着手前**: 次に触るとき最小コストで移行できる
2. **overlay が正本から乖離**: `lastReviewedAt` 等の時刻フィールドが古い
3. **派生ファイルの命名がばらついている**: inventory の命名規約を適用したい

逆に **以下の project は移行しない**:

- `projects/completed/*`（archive 済み — 凍結）
- `quick-fixes`（collection — 派生セット対象外）

---

## 4. 移行手順（project 単位）

### Step 1: 移行前の snapshot

```bash
git log --oneline projects/<id>/ | head -20 > /tmp/<id>-pre-migration.log
```

### Step 2: overlay の重複 entry 削除

`projects/<id>/aag/execution-overlay.ts` の entry で、`fixNow` /
`executionPlan` / `lifecyclePolicy` が `DEFAULT_EXECUTION_OVERLAY` と同じ値の
ものを削除する。`reviewPolicy` は案件固有なので残す。

**削減の目安**: 1425 行 → `pure-calculation-reorg` 基準なら 300 行程度
（`reviewPolicy` のみ残る状態）

```ts
// 移行前
"AR-001": {
  fixNow: "now",
  executionPlan: { effort: "small", priority: 1 },
  reviewPolicy: { owner: "solo-maintainer", lastReviewedAt: "2026-04-11", reviewCadenceDays: 90 },
},

// 移行後（fixNow / executionPlan を削除、reviewPolicy のみ残す）
"AR-001": {
  reviewPolicy: { owner: "solo-maintainer", lastReviewedAt: "2026-04-11", reviewCadenceDays: 90 },
},
```

### Step 3: 派生ファイルの標準化

既存の後付け派生ファイル（例: `unify-period-analysis/pr-breakdown.md`）を
`_template/derived/` の形式に合わせる。ファイル名が一致すれば再配置不要。

`inventory/` については:
- 既存ファイル名が `NN-<slug>.md` 形式なら無変更
- そうでなければ renaming を検討（git mv）

### Step 4: `config/project.json` の確認

- `parent` フィールドが必要なら追加（サブ project に該当する場合のみ）
- それ以外は無変更

### Step 5: 検証

```bash
cd app
npm run verify:project
npm run test:guards
npm run docs:generate
npm run docs:check
npm run lint
npm run build
```

### Step 6: commit

```
migrate <project-id>: to new format (overlay defaults + derived set)
```

---

## 5. project 別移行計画

### 5.1 `pure-calculation-reorg`

**移行優先度**: 中（active）

- overlay が正本 → defaults への重複 entry 削減が最大の恩恵
- 派生ファイルの命名は既に統一されている
- 既存の作業中 PR とバッティングする可能性 → 完了後に実施

### 5.2 `unify-period-analysis`

**移行優先度**: 高（凍結中）

- 凍結中なので破壊的変更のリスクが低い
- overlay が継承（pure-calculation-reorg のコピー）なので重複が大きい
- 後付け派生ファイル（pr-breakdown / review-checklist / acceptance-suite /
  test-plan / inventory）が既にあり、命名規約との差分を測りやすい

### 5.3 `aag-format-redesign`（本 project）

**移行優先度**: 自己移行

- 本 project の完了後、自身の overlay を空にすることで設計が自己整合する
- overlay 空 + defaults で test:guards が通ることを示すショーケースになる
- ただし **本 project の成果物を commit した後** にすること

### 5.4 `completed/*`

**移行しない**。archive 済みで凍結。参照のみ。

### 5.5 `quick-fixes`

**移行しない**。collection は派生セット対象外。`aag/execution-overlay.ts` も
defaults で動くならそのままでよい。

---

## 6. 互換性保証（移行実行時）

- 移行は project 単位で独立に実施でき、他 project の動作に影響しない
- 移行後も既存 consumer（`ARCHITECTURE_RULES` facade 経由）は無変更で動く
- overlay 縮小による値の変化は **ない**（defaults が同じ値を返す）
- 各 project の移行 commit は `test:guards` と `docs:check` で検証される

---

## 7. 移行実施のトリガー（提案）

本 project の archive 後に、以下の順序で別タスクとして実施する:

1. `unify-period-analysis` の解凍タイミングで同時に移行
2. `pure-calculation-reorg` の次 PR 切れ目で移行
3. `aag-format-redesign`（本 project）の archive タイミングで自己移行

各 project は独立タスクとして扱い、`quick-fixes` または新 project として
新規 checklist を切る。

---

## 8. 移行しない場合のリスク

移行しなくても大きな破壊は起きない（defaults は additive なので既存 overlay が
正常に動く）。ただし以下のドリフトが蓄積する:

- `lastReviewedAt` の古い値が project 間で継承され続ける
- overlay サイズが肥大化する
- 新 project 立ち上げ時に「defaults で動くのに、既存 project は違う形式」という
  認知負荷が増える

これらは **構造的バグではなく品質劣化** なので、急いで移行する必要はない。

---

## 9. 関連

| 文書 | 役割 |
|---|---|
| `projects/aag-format-redesign/new-format-design.md` | 新フォーマット設計の根拠 |
| `projects/aag-format-redesign/overlay-bootstrap-design.md` | overlay defaults の設計 |
| `projects/aag-format-redesign/subproject-design.md` | サブ project 機能の設計 |
| `references/03-guides/new-project-bootstrap-guide.md` | 新 project bootstrap ガイド |
| `app/src/test/architectureRules/defaults.ts` | DEFAULT_EXECUTION_OVERLAY 正本 |
