# Governance 最終配置方針

> AAG ルール正本の三分割配置を説明する現行正本文書。
> Phase C / Phase 6 を経て、BaseRule の物理移動・derived merge・入口強制・
> collector 契約まで完了済み。本文書は「今どこに何が置かれ、なぜそうなったか」を固定する。

## 現行実装マップ

| 概念 | ファイル | 役割 | 正本区分 |
|---|---|---|---|
| **BaseRule 配列** | `app-domain/gross-profit/rule-catalog/base-rules.ts` | semantics + governance + detection + binding + migrationRecipe | **App Domain 正本** |
| BaseRule 旧位置（re-export facade） | `app/src/test/architectureRules/rules.ts` | `@app-domain/...` からの thin re-export（後方互換） | Facade |
| **ExecutionOverlay** | `projects/pure-calculation-reorg/aag/execution-overlay.ts` | ruleId → fixNow / executionPlan / reviewPolicy / lifecyclePolicy | **Project Overlay 正本** |
| **Derived merge** | `app/src/test/architectureRules/merged.ts` | BaseRule + ExecutionOverlay を ruleId キーで合成 | **Derived Artifact** |
| **Consumer facade** | `app/src/test/architectureRules/index.ts` + `app/src/test/architectureRules.ts` | consumer が触る唯一の入口 | **Single Entry** |
| 整合検証 | `app/src/test/guards/executionOverlayGuard.test.ts` | BaseRule ↔ Overlay の欠損・orphan 検出 | Guard |
| 入口強制 | `app/src/test/guards/aagDerivedOnlyImportGuard.test.ts` | consumer が merged 以外を直接 import していないか検出 | Guard |
| 配線 smoke | `app/src/test/guards/architectureRulesMergeSmokeGuard.test.ts` | 全経路（barrel / index / merged / re-export / 互換 facade）の同値検証 | Guard |
| Collector 契約 | `app/src/test/tools/*ContractTest.ts` | guard / temporal collector の KPI を fixture で契約固定 | Test |
| project 解決 | `tools/architecture-health/src/project-resolver.ts` + `app/scripts/resolve-project-overlay.mjs` | `CURRENT_PROJECT.md` → `projects/<id>/config/project.json` → overlayRoot | Resolver |

### 三分割の責務境界

```
BaseRule（base-rules.ts） — App Domain 正本
   └─ 「何を守るか」「なぜ」「どう直すか」— 案件が変わっても同じ

ExecutionOverlay（execution-overlay.ts） — Project Overlay 正本
   └─ 「今この案件でどう扱うか」— fixNow / priority / reviewCadence

merged.ts — Derived Artifact
   └─ 両者を ruleId で合成して ArchitectureRule[] を返す

architectureRules/index.ts — Single Entry
   └─ consumer は ARCHITECTURE_RULES（merged 後）と helpers のみ触る
```

### 物理ツリー

```
app-domain/gross-profit/
  rule-catalog/
    base-rules.ts              ← App Domain 正本（BaseRule[]）

projects/<active>/
  aag/
    execution-overlay.ts       ← Project Overlay 正本（operational state）
  config/
    project.json               ← resolver の入力

app/src/test/
  architectureRules/
    rules.ts                   ← thin re-export（旧位置、後方互換）
    merged.ts                  ← derived merge 実装
    index.ts                   ← consumer facade（barrel）
    helpers.ts                 ← getRuleById, formatViolationMessage, ...
    types.ts                   ← ArchitectureRule / BaseRule / PrincipleId
  architectureRules.ts         ← 互換 facade（旧 consumer との後方互換）

tools/architecture-health/src/
  project-resolver.ts          ← tools 側の project 解決点

app/scripts/
  resolve-project-overlay.mjs  ← vite / vitest alias 解決点
```

---

## 設計判断の記録

以下は三分割に至った設計判断の要約。結論は現行実装に反映済み。

### 判断 1: migrationRecipe は BaseRule と同居させる

**結論**: App Domain の rule-catalog 内（base-rules.ts）に同居。

migrationRecipe は「どう直すか」の安定知識であり、ルールの意味と不可分。
案件が変わっても「この違反をどう直すか」は基本的に同じで、別ファイルに切り出す分離利益がない（参照が 1:1）。

### 判断 2: executionPlan は Project Overlay に分離する

**結論**: `projects/<id>/aag/execution-overlay.ts` に ruleId → ExecutionPlan のマップとして配置。

effort / priority は案件のリソース・進捗・優先順で変わる。rule-catalog と同居させると、案件固有の判断がアプリ正本に混入する。Project Overlay に置くことで、案件終了時に丸ごと差し替えできる。

### 判断 3: 合成は ruleId をキーに derived merge する

**結論**: `app/src/test/architectureRules/merged.ts` が runtime 合成点。

```typescript
// merged.ts の合成フロー
function mergeRules(): readonly ArchitectureRule[] {
  return BASE_RULES.map((rule): ArchitectureRule => {
    const overlay = EXECUTION_OVERLAY[rule.id]
    if (!overlay) throw new Error(`Missing overlay for rule: ${rule.id}`)
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

合成の層:

```
App Domain (base-rules.ts)
  ├─ semantics (id, what, why, guardTags, slice, ...)
  ├─ governance (decisionCriteria, migrationRecipe, sunsetCondition)
  ├─ detection (detection, thresholds, correctPattern, outdatedPattern)
  └─ binding (doc, imports, codeSignals, example)

Project Overlay (execution-overlay.ts)
  └─ operational (fixNow, executionPlan, reviewPolicy, lifecyclePolicy)

Derived Merge (merged.ts, 実行時)
  └─ ArchitectureRule = App Domain + Project Overlay
```

### 判断 4: Overlay 欠損は fallback ではなくエラー

**結論**: `merged.ts` が欠損時に `throw` し、`executionOverlayGuard.test.ts` が静的に検出する。

default executionPlan を許すと案件運用状態が曖昧になるため、「この案件でどう扱うか」は明示的に決定させる。

---

## Consumer の入口規約

consumer は以下の facade のみを経由する:

```ts
import { ARCHITECTURE_RULES, getRuleById, formatViolationMessage } from '../architectureRules'
```

**禁止**（`AR-AAG-DERIVED-ONLY-IMPORT` 系で強制）:

- `from '../architectureRules/rules'` — BaseRule の直参照
- `from '@project-overlay/execution-overlay'` — Project Overlay の直参照

**例外**（直参照を許すファイル）:

- `app/src/test/architectureRules/merged.ts` — 正本合成点
- `app/src/test/architectureRules/` 配下のファイル全般 — 内部実装
- `app/src/test/guards/executionOverlayGuard.test.ts` — BaseRule ↔ overlay 整合検証
- `app/src/test/guards/architectureRulesMergeSmokeGuard.test.ts` — 全経路 smoke
- `app/src/test/guards/aagDerivedOnlyImportGuard.test.ts` — 本ガード自身

---

## Project 切替点

project の差し替えは次の 2 ファイルで完結する:

1. **`CURRENT_PROJECT.md`**: `active: <project-id>` 1 行
2. **`projects/<id>/config/project.json`**: `projectId` / `overlayRoot` / `overlayEntry` / `entrypoints`

vite / vitest / tools はすべて resolver 経由で解決する:

- vite / vitest: `app/scripts/resolve-project-overlay.mjs` （`resolveProjectOverlayRoot(appDir)`）
- health tools: `tools/architecture-health/src/project-resolver.ts` （`resolveActiveProject(repoRoot)`）

### C1 の暫定事項

`app/tsconfig.app.json` の `@project-overlay/*` と `include` は依然として
`pure-calculation-reorg` 直書き（静的 JSON のため動的解決不能）。

- 現状: build / test / health tools は resolver 経由で一元化済み、TypeScript 解決だけは project 切替時に手動更新が必要
- 次の改善候補: tsconfig 生成スクリプト化、または multi-project 解決の再設計

---

## 保証レイヤー（Phase 6）

配置を支える保証は collector / resolver / merge / generated の 4 レイヤーに分離される:

| レイヤー | 実装 | 役割 |
|---|---|---|
| Collector 契約 | `app/src/test/tools/guardCollectorContract.test.ts` / `temporalGovernanceCollectorContract.test.ts` | fixture 経由で KPI 出力を契約固定。quote-agnostic 検証を含む |
| Resolver 契約 | `app/src/test/tools/projectResolverContract.test.ts` / `resolveProjectOverlayScript.test.ts` | CURRENT_PROJECT.md + project.json の解決規約を固定 |
| Merge / Facade smoke | `app/src/test/guards/architectureRulesMergeSmokeGuard.test.ts` | 全 5 経路（barrel / index / merged / re-export / 互換 facade）が同じ rule 集合を返すことを配線レベルで確認 |
| Generated smoke | `npm run docs:check` | live 計算と committed health.json の一致、generated section の鮮度を検査 |

**原則**: 正本の実装が正しいだけでなく、それを読む仕組み（collector / resolver / facade）も正しいことを CI で保証する。

---

## 完了条件

- [x] BaseRule が `app-domain/gross-profit/rule-catalog/base-rules.ts` に物理配置されている
- [x] ExecutionOverlay が `projects/<active>/aag/execution-overlay.ts` に分離されている
- [x] merged.ts が derived artifact として consumer に配信する
- [x] consumer は facade 経由のみで参照する（guard で強制）
- [x] Overlay 欠損は runtime エラー（fallback なし）
- [x] project 切替点が resolver 経由で一元化されている（tsconfig 除く）
- [x] collector / resolver / merge の契約テストが配線を保証する

---

## 一文で固定すると

BaseRule は App Domain 正本、ExecutionOverlay は Project Overlay 正本、両者は merged.ts で derived merge され、consumer は facade 経由のみで参照する。直参照は guard で禁止され、配線は collector / resolver / merge の 3 層の契約テストで保証される。
