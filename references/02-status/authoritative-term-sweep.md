# authoritative 用語スイープ結果

> 生成日: 2026-04-10
> 方針: `references/01-principles/semantic-classification-policy.md`

## 概要

`authoritative` 単独使用を全件洗い出し、意味分類を付与した。

- **対象外**: `business-authoritative`, `analytic-authoritative`, `candidate-authoritative`, `non-authoritative` は修飾済みのため対象外
- **合計**: 279 箇所 / 65 ファイル

## 分類

### A. UI displayMode 系（修正不要 — 別概念）

UI の `displayMode = 'authoritative'` は意味分類の `authorityKind` とは別概念。
`authoritativeAccepted`, `authoritativeOwner` 等の UI プロパティ名も同様。
将来的に `displayMode = 'accepted'` 等へのリネームを検討するが、本計画の Phase 0 では手をつけない。

| ファイル | 件数 | 内容 |
|---------|------|------|
| `app/src/domain/constants/metricResolver.ts` | 13 | displayMode 解決ロジック |
| `app/src/domain/constants/metricResolver.test.ts` | 29 | displayMode テスト |
| `app/src/domain/constants/resolverIntegration.test.ts` | 24 | displayMode 統合テスト |
| `app/src/domain/constants/metricDefs.ts` | 8 | authoritativeOwner 等メタ定義 |
| `app/src/domain/models/Explanation.ts` | 4 | authoritativeAccepted プロパティ |
| `app/src/presentation/components/common/KpiCard.tsx` | 3 | UI 表示分岐 |
| `references/03-guides/authoritative-display-rules.md` | 10 | displayMode 文書 |

**小計**: 91 箇所 — **legacy-authoritative-usage (display)** として ratchet 管理

### B. Bridge / WASM 系（段階的に修正）

bridge ファイルの JSDoc や WASM エンジン状態の記述。
business-authoritative / analytic-authoritative に書き分けるべき箇所。

| ファイル | 件数 | あるべき修飾 |
|---------|------|------------|
| `app/src/application/services/grossProfitBridge.ts` | 10 | business-authoritative |
| `app/src/application/services/budgetAnalysisBridge.ts` | 5 | business-authoritative |
| `app/src/application/services/factorDecompositionBridge.ts` | 2 | business-authoritative |
| `app/src/application/services/forecastBridge.ts` | 4 | analytic-authoritative |
| `app/src/application/services/timeSlotBridge.ts` | 2 | analytic-authoritative |
| `app/src/application/services/wasmEngine.ts` | 5 | mixed (module ごとに分ける) |
| `app/src/application/readModels/factorDecomposition/*.ts` | 6 | business-authoritative |

**小計**: 34 箇所 — **Phase 3 (bridge 境界定義) で修正**

### C. Observation テスト系（段階的に修正）

WASM 不変条件テスト。全5 engine を `authoritative` と呼んでいるが、
forecast / timeSlot は `analytic-authoritative` に修正すべき。

| ファイル | 件数 | あるべき修飾 |
|---------|------|------------|
| `app/src/test/observation/grossProfitObservation.test.ts` | 8 | business-authoritative |
| `app/src/test/observation/budgetAnalysisObservation.test.ts` | 4 | business-authoritative |
| `app/src/test/observation/factorDecompositionObservation.test.ts` | 4 | business-authoritative |
| `app/src/test/observation/forecastObservation.test.ts` | 4 | analytic-authoritative |
| `app/src/test/observation/timeSlotObservation.test.ts` | 4 | analytic-authoritative |
| `app/src/test/observation/wasmOnlyTrial.test.ts` | 2 | mixed |

**小計**: 26 箇所 — **Phase 4 (current 再分類) で修正**

### D. 文書系（段階的に修正）

references/ 配下の文書。用語を business/analytic で修飾すべき箇所。

| ファイル | 件数 | 備考 |
|---------|------|------|
| `references/02-status/engine-promotion-matrix.md` | 25 | 全5 engine を区別なく authoritative と記載 |
| `references/01-principles/engine-boundary-policy.md` | 14 | Phase 0 で主要箇所を修正済み |
| `references/02-status/promotion-criteria.md` | 12 | 昇格条件定義。Phase 4 で修正 |
| `references/03-guides/rollback-policy.md` | 7 | rollback 方針。Phase 7 で修正 |
| `references/02-status/recent-changes.md` | 5 | 変更履歴。必要時に修正 |
| `CLAUDE.md` | 5 | Phase 0 で修正 |
| `references/README.md` | 4 | 参照索引。必要時に修正 |
| `references/02-status/frozen-list.md` | 4 | 凍結リスト。Phase 4 で修正 |
| その他文書 | 18 | 各 Phase で段階的に修正 |

**小計**: 94 箇所

### E. Guard / Architecture 系

| ファイル | 件数 | 備考 |
|---------|------|------|
| `app/src/test/guards/factorDecompositionPathGuard.test.ts` | 3 | business-authoritative |
| `app/src/test/guards/dualRunExitCriteriaGuard.test.ts` | 3 | mixed |
| `app/src/application/stores/dataStore.ts` | 4 | bridge 経由に修正予定 |
| その他 | 24 | 各 Phase で段階的に修正 |

**小計**: 34 箇所

## 対応方針

| 分類 | 件数 | 対応 | タイミング |
|------|------|------|-----------|
| A. UI displayMode | 91 | ratchet 管理（新規追加禁止、既存は維持） | 将来リネーム検討 |
| B. Bridge / WASM | 34 | business/analytic 修飾に修正 | Phase 3-4 |
| C. Observation テスト | 26 | business/analytic 修飾に修正 | Phase 4 |
| D. 文書 | 94 | 段階的に修飾を追加 | Phase 0-7 |
| E. Guard / Architecture | 34 | 段階的に修飾を追加 | Phase 2-4 |
| **合計** | **279** | | |

## Guard

`AR-TERM-AUTHORITATIVE-STANDALONE` (ratchet):
- baseline: 279
- 新規追加禁止
- 既存は段階的に削減
