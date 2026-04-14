# subproject-design — aag-format-redesign

> 役割: Phase 4 成果物。サブプロジェクト機能（P1 — 親子リンクのみ）の設計。
> 既存 project に影響しないことを設計レベルで示す。

---

## Goal（P1）

「親 project から派生した独立トピックを、文脈リンク付きで管理する」軽量機能。

- サブ project は通常 project と同じ構造（AI_CONTEXT / HANDOFF / plan /
  checklist / config / aag）
- `config/project.json` に `parent: "<parent-project-id>"` フィールドが付くだけ
- サブ project の AI_CONTEXT.md の Read Order に親 AI_CONTEXT.md を含める
- `project-health.json` collector に「parent 表示」だけを最小限追加
- 親 project は無変更（completely additive）

---

## 非スコープ（P2 以降）

- 親子の進捗統合
- 親完了の前提条件にサブを置く（blocking 依存）
- 親子のクロス guard
- サブ project の構造簡略化（通常 project と同じ構造でよい）

---

## 1. Schema 変更（`config/project.json`）

### 1.1 追加フィールド

```jsonc
{
  "projectId": "<sub-project-id>",
  "title": "<title>",
  "status": "active",
  "parent": "<parent-project-id>",  // ← optional。新規追加
  "projectRoot": "projects/<sub-project-id>",
  "overlayRoot": "projects/<sub-project-id>/aag",
  "overlayEntry": "projects/<sub-project-id>/aag/execution-overlay.ts",
  "entrypoints": { ... }
}
```

### 1.2 互換性

- `parent` は **optional**
- 既存 5 project は `parent` フィールドを持たない → 無変更で valid
- 新 project も `parent` なしで立ち上げ可能（通常 project）

---

## 2. Collector の変更

### 2.1 `project-checklist-collector.ts`

`ProjectJson` interface に `parent?: string` を追加:

```ts
interface ProjectJson {
  readonly projectId: string
  readonly title: string
  readonly status?: string
  readonly kind?: ProjectKind
  readonly parent?: string  // ← 追加
  readonly projectRoot: string
  readonly entrypoints: { ... }
}
```

`ProjectMeta` にも追加:

```ts
export interface ProjectMeta {
  readonly projectId: string
  readonly title: string
  readonly status: string
  readonly kind: ProjectKind
  readonly parent: string | undefined  // ← 追加
  readonly projectRoot: string
  readonly checklistPath: string
  readonly aiContextPath: string
  readonly handoffPath: string
  readonly planPath: string
}
```

`readProjectChecklist()` で parse し、`meta.parent` に詰める。

### 2.2 KPI 追加（最小限）

`collectFromProjectChecklists()` に 1 KPI を追加:

```ts
{
  id: 'project.checklist.subprojectCount',
  label: 'サブ project 数（parent フィールドあり）',
  category: 'docs',
  value: results.filter(r => r.meta.parent !== undefined).length,
  unit: 'count',
  status: 'ok',
  owner: 'documentation-steward',
  docRefs: [{ kind: 'definition', path: 'references/03-guides/project-checklist-governance.md' }],
  implRefs: projectImplRefs,
}
```

---

## 3. Guard 追加

### 3.1 `subprojectParentGuard.test.ts`（新設）

検証項目:
1. **親 project 実在**: `parent` で指定された project が `projects/<id>/`
   または `projects/completed/<id>/` に存在する
2. **自己参照禁止**: `parent` が自分自身でない
3. **循環禁止**: 親子関係が循環していない（A → B → A）
4. **深さ制限**: 親子階層は 2 段まで（親 → 子のみ、孫なし）
   - P1 は最小機能。孫を許すと collector / guard / UI の複雑度が跳ね上がる

```ts
describe('Subproject Parent Guard', () => {
  it('parent で指定された project が実在する', () => { ... })
  it('parent が自分自身ではない', () => { ... })
  it('親子関係が循環していない', () => { ... })
  it('親子階層が 2 段まで', () => { ... })
})
```

### 3.2 既存 guard への影響

- `projectDocStructureGuard` — 無変更（parent は 4-doc 構造に関係ない）
- `checklistFormatGuard` — 無変更
- `projectStructureGuard` — 無変更
- `projectCompletionConsistencyGuard` — 無変更（P1 は親子の完了連動なし）
- `executionOverlayGuard` — 無変更

---

## 4. サブ project の AI_CONTEXT.md 運用ルール

サブ project の `AI_CONTEXT.md` の Read Order に親 AI_CONTEXT.md を必ず含める:

```markdown
## Read Order

1. 本ファイル
2. **親 project: `projects/<parent-id>/AI_CONTEXT.md`**（文脈継承）
3. `HANDOFF.md`（残作業の優先順位）
4. `plan.md`（不可侵原則と Phase 構造）
5. `checklist.md`（completion 判定の入力）
6. 関連 references/
```

これは **運用ルール**（guard で強制しない）:
- guard 化すると「Read Order 書式」の強制が必要になり複雑度が増える
- サブ project の立ち上げ時に template が誘導する（`_template/derived/` の
  サブ project 用補助 template を作ってもよいが P1 では見送り）

---

## 5. `project-health.md` への parent 表示

`tools/architecture-health/src/renderers/project-health-renderer.ts` に
parent 表示を追加（1 行追加）:

```markdown
## project-health

| id | title | status | parent | checked/total |
|---|---|---|---|---|
| aag-format-redesign | AAG ... | in_progress | — | 5/28 |
| <sub-example> | ... | in_progress | aag-format-redesign | 0/3 |
```

`parent` 列が追加されるだけ（既存列は無変更）。

---

## 6. サブ project のライフサイクル

### 6.1 立ち上げ

通常 project と同じ bootstrap 手順（§10）で立ち上げ、`config/project.json` に
`parent: "<parent-id>"` を追記する。

### 6.2 完了

サブ project は通常 project と同じ completion 判定フロー（checklist 全 [x] →
人間レビュー → archive）。親 project は **無関係に動く**。

### 6.3 親の archive

P1 では親子の完了連動なし。親 project が先に archive されても、サブは
`in_progress` のまま残る。親を archive したら、サブの `parent` は
`projects/completed/<parent-id>/` を指すことになる（guard 検証対象）。

---

## 7. 既存 project への影響

| 項目 | 影響 |
|---|---|
| `pure-calculation-reorg` / `unify-period-analysis` 等の config/project.json | 無変更（parent なし） |
| 既存 collector 出力 | `parent` 列が追加されるが既存列は無変更 |
| 既存 KPI | 1 KPI 追加（`subprojectCount`） |
| 既存 guard | 無変更（新 guard `subprojectParentGuard` は additive） |
| bootstrap 手順 §10 | 無変更。サブ project 立ち上げは新ガイドで補足 |

---

## 8. 不可侵原則の遵守確認

| 原則 | 遵守 |
|---|---|
| 1. 既存 project に一切触らない | ✅ 既存 project は無変更 |
| 2. Additive only | ✅ 新フィールド optional / 新 guard / 新 KPI のみ |
| 3. 痛点先・設計後 | ✅ P-05 を根拠に設計 |
| 4. AAG 5 層を壊さない | ✅ Layer 4A（System Operations）のみ |
| 5. 既存 project 移行は scope 外 | ✅ サブ project の運用はガイドのみ |
