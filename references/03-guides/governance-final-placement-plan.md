# Governance 最終配置方針

> governance の意味分離を物理配置へ落とす設計。
> 型分離（MigrationRecipe / ExecutionPlan / RuleOperationalState）は完了済み。
> 本文書は「どこに何を置くか」「実行時にどう合成するか」を固定する。

## 現時点の実装マップ（Phase C 進捗反映）

| 概念 | ファイル | 役割 | 正本区分 |
|---|---|---|---|
| BaseRule 配列 | `app-domain/gross-profit/rule-catalog/base-rules.ts` | semantics + governance + detection + binding + migrationRecipe | App Domain 正本 |
| BaseRule 旧位置（re-export facade） | `app/src/test/architectureRules/rules.ts` | `@app-domain/...` からの re-export のみ（後方互換） | Facade |
| ExecutionOverlay | `projects/pure-calculation-reorg/aag/execution-overlay.ts` | ruleId → fixNow / executionPlan / reviewPolicy / lifecyclePolicy | Project Overlay 正本 |
| derived merge | `app/src/test/architectureRules/merged.ts` | BaseRule + ExecutionOverlay を ruleId キーで合成 | Derived Artifact |
| consumer facade | `app/src/test/architectureRules/index.ts` + `app/src/test/architectureRules.ts` | consumer が触る唯一の入口 | Facade |
| 整合検証 | `app/src/test/guards/executionOverlayGuard.test.ts` | BaseRule ↔ Overlay の欠損・orphan 検出 | Guard |
| 入口強制 | `app/src/test/guards/aagDerivedOnlyImportGuard.test.ts` | consumer が merged 以外を直接 import していないか検出 | Guard |
| project 解決 | `tools/architecture-health/src/project-resolver.ts` + `app/scripts/resolve-project-overlay.mjs` | `CURRENT_PROJECT.md` → `projects/<id>/config/project.json` → overlayRoot | Resolver |

### 三分割の責務境界

```
BaseRule（rules.ts）
   └─ 「何を守るか」「なぜ」「どう直すか」— 案件が変わっても同じ

ExecutionOverlay（execution-overlay.ts）
   └─ 「今この案件でどう扱うか」— fixNow / priority / reviewCadence

merged.ts
   └─ 両者を ruleId で合成して ArchitectureRule[] を返す

architectureRules/index.ts（facade）
   └─ consumer は ARCHITECTURE_RULES（merged 後）と helpers のみ触る
```

## 前提

### 完了済み

- RuleGovernance = App Domain 側（decisionCriteria, migrationRecipe, sunsetCondition）
- RuleOperationalState = Project Overlay 側（fixNow, executionPlan, reviewPolicy, lifecyclePolicy）
- MigrationPath は完全削除済み
- ArchitectureRule = 5 層 intersection 合成
- derived merge ロジック（merged.ts）が consumer に正本を配信
- direct import 禁止 guard（AR-AAG-DERIVED-ONLY-IMPORT）が入口を強制
- project 参照点が `project-resolver` 経由に集約

### 物理移動 — 完了

- BaseRule 配列は `app-domain/gross-profit/rule-catalog/base-rules.ts` に物理移動済み
- 旧位置 `app/src/test/architectureRules/rules.ts` は `@app-domain/...` からの thin re-export として後方互換を保持
- `@app-domain/*` path alias + vite/vitest alias 追加済み
- collectors / 整合検証 guards のパス追随済み

---

## 論点 1: migrationRecipe をどこに置くか

**結論: App Domain の rule-catalog 内に同居させる。**

migrationRecipe は「どう直すか」の安定知識であり、ルールの意味と不可分。
ルール定義（semantics + binding + migrationRecipe）を分離するメリットはない。

```
app-domain/gross-profit/
  rule-catalog/          ← 将来の物理配置先
    rules.ts             ← ARCHITECTURE_RULES（semantics + migrationRecipe + binding）
```

現時点の物理配置:
```
app/src/test/architectureRules/rules.ts  ← 現在ここ（移動は後続フェーズ）
```

**判断理由:**
- migrationRecipe.steps はルールの what/why と同じ粒度で変わる
- 案件が変わっても「この違反をどう直すか」は基本的に同じ
- 別ファイルに切り出す分離利益がない（参照が 1:1）

---

## 論点 2: executionPlan をどこに置くか

**結論: projects/<project-id>/aag/ 配下に、ルール ID をキーとした overlay ファイルとして置く。**

```
projects/pure-calculation-reorg/
  aag/
    execution-overlay.ts   ← ruleId → ExecutionPlan のマップ
```

executionPlan は「今この案件でどの重さで扱うか」の運用判断であり、
案件が変われば priority も effort も変わる。rule-catalog と同居させると、
案件固有の判断がアプリ正本に混入する。

**判断理由:**
- effort / priority は案件のリソース・進捗・優先順で変わる
- 案件 A で priority=1 のルールが案件 B では priority=3 になりうる
- Project Overlay に置くことで、案件終了時に丸ごと差し替えできる

---

## 論点 3: merge 方式をどうするか

**結論: ruleId をキーに derived merge する。**

```typescript
// 概念的な合成フロー
function mergeRule(
  rule: AppDomainRule,      // semantics + migrationRecipe + binding
  overlay: ExecutionOverlay  // ruleId → ExecutionPlan
): ArchitectureRule {
  return {
    ...rule,
    executionPlan: overlay[rule.id],  // Project Overlay から注入
  }
}
```

### 合成の層

```
App Domain (rule-catalog)
  ├─ semantics (id, what, why, guardTags, slice, ...)
  ├─ governance (decisionCriteria, migrationRecipe, sunsetCondition)
  ├─ detection (detection, thresholds, correctPattern, outdatedPattern)
  └─ binding (doc, imports, codeSignals, example)

Project Overlay (execution-overlay)
  └─ operational (fixNow, executionPlan, reviewPolicy, lifecyclePolicy)

Derived Merge (実行時)
  └─ ArchitectureRule = App Domain + Project Overlay
```

### 移行戦略

**当面**: rules.ts に全フィールドが同居する現状を維持。
物理分離は、App Domain への rule-catalog 移動と同時に行う。

**理由**: 今の段階で overlay merge ロジックを入れると、
guard test の全 consumer が merge 後の配列を参照する必要があり、
影響範囲が大きい。Exit A の barrel facade がこの移行を吸収できるタイミングで実施する。

---

## 論点 4: fallback を持つか

**結論: Overlay に executionPlan がないルールはエラーにする。**

```typescript
// overlay に未定義のルールがあれば guard が検出する
it('全ルールに executionPlan がある', () => {
  const missing = ARCHITECTURE_RULES.filter(
    (r) => !r.executionPlan || !r.executionPlan.effort || r.executionPlan.priority == null,
  )
  expect(missing.map((r) => r.id)).toEqual([])
})
```

**このガードは既に存在する**（architectureRuleGuard.test.ts で実装済み）。

**判断理由:**
- default executionPlan を許すと、案件運用状態が曖昧になる
- 「この案件でどう扱うか」は明示的に決定すべき
- 140 ルール全件に executionPlan が付与済みなので、欠損は構造エラー

---

## 物理配置の目標構造

```
app-domain/gross-profit/
  rule-catalog/
    rules.ts               ← semantics + governance + detection + binding
    helpers.ts              ← getRuleById, formatViolationMessage
    types.ts                ← ArchitectureRule, RuleBinding, PrincipleId

projects/<project-id>/
  aag/
    execution-overlay.ts    ← ruleId → { fixNow, executionPlan, reviewPolicy, lifecyclePolicy }
```

### 現在の配置（移行前）

```
app/src/test/
  architectureRules/        ← 全フィールド同居（移行前の barrel 構造）
    rules.ts                ← semantics + governance + operational + detection + binding
    helpers.ts
    types.ts
    index.ts
  architectureRules.ts      ← 互換 facade
```

---

## 実施順序

### Step 1: Overlay 型定義（型のみ）

```typescript
// projects 側で使う overlay 型
export interface ExecutionOverlay {
  readonly [ruleId: string]: {
    readonly fixNow: FixNowClassification
    readonly executionPlan: ExecutionPlan
    readonly reviewPolicy?: ReviewPolicy
    readonly lifecyclePolicy?: LifecyclePolicy
  }
}
```

この型を aag-core-types.ts に追加する。

### Step 2: Overlay データファイル作成

projects/pure-calculation-reorg/aag/execution-overlay.ts を作成し、
現在 rules.ts にある operational フィールドを抽出する。

### Step 3: merge ロジック実装

rules.ts から operational フィールドを除去し、
index.ts の barrel re-export で App Domain + Overlay を合成した
ARCHITECTURE_RULES を提供する。

### Step 4: consumer 検証

全 45 consumer が無修正で動くことを確認。
barrel facade が合成後の配列を提供するため、consumer 変更 0 件。

---

## まだやらないこと

- rule-catalog の app-domain/ への物理移動（別フェーズ）
- overlay merge ロジックの本格実装（Step 3 は小さく始める）
- 過去フェーズの履歴文書の全面改稿

---

## 完了条件

- [ ] 4 論点が固定されている
- [ ] 物理配置の目標構造が明示されている
- [ ] 実施順序が定義されている
- [ ] 当面の移行戦略が「rules.ts に同居」であることが明記されている
- [ ] fallback ポリシーが「エラー」であることが明記されている

---

## 一文で固定すると

migrationRecipe は App Domain の rule-catalog に同居させ、executionPlan は
projects/<project-id>/aag/execution-overlay.ts に置き、ruleId をキーに
derived merge する。Overlay 未定義はエラー。
