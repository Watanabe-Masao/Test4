# overlay-bootstrap-design — aag-format-redesign

> 役割: Phase 3 成果物。`executionOverlayGuard` を壊さずに、新 project 立ち上げ時の
> overlay 全 140 ルール要件を緩和する設計。3 案を比較し、採用案を確定する。

---

## 前提と制約

- `executionOverlayGuard.test.ts` の防御機能（BaseRule 追加時に overlay 漏れを
  防ぐ）は **維持必須**（S-03）
- 既存 project の `execution-overlay.ts` は無変更で動き続ける（不可侵原則 1）
- `merged.ts` の consumer facade 経由ルールは維持する（S-02）
- 新 project の bootstrap は「空 overlay + defaults」で test:guards が通ることを
  goal とする

---

## 3 案の比較

### 案 A: `defaults` overlay 継承（**採用**）

```ts
// app/src/test/architectureRules/defaults.ts
export const DEFAULT_EXECUTION_OVERLAY: ExecutionOverlay = {
  // BaseRule カテゴリ別のデフォルト値
  // 全 140 ルール分を 1 箇所に集約
  'AR-001': { fixNow: 'now', executionPlan: { effort: 'small', priority: 2 } },
  // ...
}
```

`merged.ts` が:
1. project overlay を読む
2. undefined なら defaults を使う
3. どちらにもなければエラー

**長所:**
- 既存 project の overlay は完全に無変更（undefined な entry は存在しない）
- 新 project は空 `EXECUTION_OVERLAY = {}` で defaults が全適用される
- defaults を 1 箇所に集約するので「BaseRule 追加時の defaults 漏れ」は
  新 guard（`defaultOverlayCompletenessGuard`）で検出できる
- 新 project がカスタマイズしたいルールだけを overlay で override できる

**短所:**
- defaults ファイルの初期値をどうするか決める必要がある（後述）
- defaults と BaseRule カテゴリの対応を維持する責務が増える

---

### 案 B: `inherits` フィールド

```ts
// projects/<new>/aag/execution-overlay.ts
export const EXECUTION_OVERLAY_META = {
  inherits: 'projects/pure-calculation-reorg/aag/execution-overlay.ts',
}
export const EXECUTION_OVERLAY: ExecutionOverlay = {
  // override のみ
}
```

`merged.ts` が:
1. inherits の overlay を読む
2. 本 project の overlay を重ね合わせる

**長所:**
- 既存 overlay を正本として継承できる
- 実装が軽い

**短所:**
- **案件運用状態の継承** が起きる（`lastReviewedAt` が継承される）
- 継承元が archive されたら壊れる
- 複数段の継承チェーンが生じるリスク
- 「この project ではこのルールをどう扱うか」を本 project 自身では決めにくい
- P-01 の問題（案件運用状態の混入）が **解消されない**

---

### 案 C: `optionalRuleIds`

```ts
// projects/<new>/aag/execution-overlay.ts
export const OPTIONAL_RULE_IDS: readonly string[] = ['AR-005', 'AR-007', ...]
export const EXECUTION_OVERLAY: ExecutionOverlay = { ... }
```

`merged.ts` が:
1. optional 指定されたルールは overlay 未定義でも許容する
2. merge 時は baseline default value を使う

**長所:**
- project が明示的に「このルールは使わない」と宣言できる

**短所:**
- 140 ルールのうちどれを optional にするかを新 project 側で判断する負荷が大きい
- 実質「全部 optional」にすると案 A と同じだが仕組みが複雑
- 「本 project でこのルールは不要」という宣言が本来なら不要
- overlay 完全省略ができない

---

## 採用: 案 A（defaults overlay 継承）

採用理由:
1. **既存 project を 1 行も触らない**（不可侵原則 1）
2. **案件運用状態の継承を起こさない**（P-01 の根本原因の解消）
3. **新 project は空 overlay で動く**（bootstrap 負荷が最小）
4. **defaults の漏れは新 guard で検出**（S-03 の防御機能を維持）

---

## 実装詳細

### 1. `app/src/test/architectureRules/defaults.ts`（新設）

```ts
/**
 * Default Execution Overlay
 *
 * BaseRule 全 rule 分のデフォルト運用状態を 1 箇所に集約する。
 * project overlay が明示的に override しない rule は、ここから値を取る。
 *
 * 配置ポリシー: App Domain（安定知識）
 * - defaults は「標準的な扱い」であり、project 案件運用状態ではない
 * - project overlay は「この案件ではこう扱う」という override
 *
 * @responsibility R:utility
 * @see projects/aag-format-redesign/overlay-bootstrap-design.md
 */
import type { ExecutionOverlay } from '@project-overlay/execution-overlay'

export const DEFAULT_EXECUTION_OVERLAY: ExecutionOverlay = {
  'AR-001': { fixNow: 'now', executionPlan: { effort: 'small', priority: 2 } },
  // ... 全 140 ルール分
}
```

### 2. `merged.ts` の変更

```ts
import { DEFAULT_EXECUTION_OVERLAY } from './defaults'
import { EXECUTION_OVERLAY } from '@project-overlay/execution-overlay'
import { ARCHITECTURE_RULES as BASE_RULES } from './rules'

function mergeRules(): readonly ArchitectureRule[] {
  return BASE_RULES.map((rule): ArchitectureRule => {
    // project overlay を優先、未定義なら defaults を使う
    const overlay = EXECUTION_OVERLAY[rule.id] ?? DEFAULT_EXECUTION_OVERLAY[rule.id]
    if (!overlay) {
      throw new Error(
        `[execution-overlay] Missing overlay for rule: ${rule.id}. ` +
          `Either project overlay or DEFAULT_EXECUTION_OVERLAY must define it.`,
      )
    }
    return {
      ...rule,
      fixNow: overlay.fixNow,
      executionPlan: overlay.executionPlan,
      reviewPolicy: overlay.reviewPolicy,
      lifecyclePolicy: overlay.lifecyclePolicy,
    }
  })
}
```

### 3. `executionOverlayGuard.test.ts` の変更

既存 7 テストは維持しつつ、test 1（全 rule に overlay がある）の対象を
「**effective overlay = project overlay ∪ defaults**」に変更する:

```ts
it('rules.ts の全 rule に effective overlay が存在する', () => {
  const missing: string[] = []
  for (const rule of BASE_RULES) {
    if (!EXECUTION_OVERLAY[rule.id] && !DEFAULT_EXECUTION_OVERLAY[rule.id]) {
      missing.push(rule.id)
    }
  }
  expect(missing).toEqual([])
})
```

### 4. 新 guard: `defaultOverlayCompletenessGuard.test.ts`

`DEFAULT_EXECUTION_OVERLAY` が **BaseRule 全 rule をカバー** することを検証。
これにより defaults の漏れを防ぐ。

```ts
it('DEFAULT_EXECUTION_OVERLAY が BaseRule 全 rule をカバーする', () => {
  const missing = BASE_RULES.filter((r) => !DEFAULT_EXECUTION_OVERLAY[r.id])
  expect(missing.map((r) => r.id)).toEqual([])
})
```

### 5. `projects/_template/aag/execution-overlay.ts`（新設）

```ts
/**
 * Template Project Overlay — 空 overlay
 *
 * 新 project は全 rule を defaults で動かせる。
 * 案件固有の override が必要な rule だけを明示的に書く。
 */
import type { ExecutionOverlay } from '@/test/aag-core-types-types'

export type { ExecutionOverlay } from './...types'
export const EXECUTION_OVERLAY: ExecutionOverlay = {}
```

---

## defaults 値の決め方

`pure-calculation-reorg` の既存 overlay を基準値として採用する:
- 最も大きな overlay であり、全 140 ルールに運用状態が入っている
- 「標準的な扱い」として流用できる
- ただし `reviewPolicy.lastReviewedAt` のような時刻値は defaults には **含めない**
  （案件固有の状態であり、defaults には入れるべきでない）

### defaults に含める
- `fixNow`
- `executionPlan` (effort + priority)
- `lifecyclePolicy`（case-by-case で判断）

### defaults に含めない
- `reviewPolicy`（案件固有の状態 — project overlay で明示的に管理）

---

## 互換性

| 項目 | 影響 |
|---|---|
| 既存 5 project の overlay | 無変更で動作（override が defaults より優先） |
| 既存 7 tests（executionOverlayGuard） | test 1 のみ effective overlay に対応。残り 6 は無変更 |
| `merged.ts` の consumer facade | 入出力型は無変更 |
| vite/vitest alias | 無変更 |
| `project-resolver.ts` | 無変更 |

---

## 移行（既存 project、本 project scope 外）

既存 project が defaults に完全依存することで重複 entry を削減できるが、
**本 project では実行しない**。`migration-guide.md` に記載のみ。
