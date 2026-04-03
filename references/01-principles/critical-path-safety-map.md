# Critical Path Safety Map

> **目的:** 重要領域を Safety Tier で分類し、改善の優先度と影響範囲を可視化する。

## Safety Tier 定義

| Tier | 対象 | 影響 | 失敗時のコスト |
|------|------|------|----------------|
| **A** | Authoritative business value | 数値の正確さが直接影響 | 業務判断の誤り |
| **B** | Comparison semantics | 比較の正しさが分析品質に影響 | 分析結果の信頼性低下 |
| **C** | Persistence / recovery | データ喪失・復旧に影響 | データ損失・復旧不能 |
| **D** | UI-only orchestration | 表示の利便性に影響 | UX 劣化 |

## Tier A: Authoritative Business Value

数値の正確さが業務判断に直結する領域。最も厳密な安全設計が必要。

| 領域 | 正本 | ガード | リスク |
|------|------|--------|--------|
| 仕入原価 | `readPurchaseCost()` | purchaseCostPathGuard (9) + importGuard (15) | `countMissingDays()` の day-only ロジック |
| 粗利計算 | `calculateGrossProfit()` | grossProfitPathGuard (6) | WASM dual-run 依存 |
| 要因分解 | `calculateFactorDecomposition()` | factorDecompositionPathGuard (5) | Shapley 恒等式は堅牢 |
| 売上・販売点数 | `readSalesFact()` | salesFactPathGuard (5) | — |
| 値引き | `readDiscountFact()` | discountFactPathGuard (5) | — |
| 自由期間分析 | `readFreePeriodFact()` | freePeriodPathGuard (7) | — |
| PI 値 | `calculateQuantityPI()` / `calculateAmountPI()` | — | — |
| 客数 GAP | `calculateCustomerGap()` | — | — |

### 安全設計の方向

- authoritative algorithm に reference implementation + property test + metamorphic test を持たせる
- fallback を silent にしない（`meta.usedFallback` パターンを全正本に展開）
- 日付処理を ISO 日付キー / `CalendarDate` ベースに統一

## Tier B: Comparison Semantics

比較の正しさが分析品質を左右する領域。型安全による防御が必要。

| 領域 | 現状 | リスク |
|------|------|--------|
| 期間比較 | `isPrevYear` ベース | WoW / YoY / fallback-aware が単一 abstraction に収まらない |
| pair handler | `pairExceptionDesign` | 構造例外として管理中 |
| 日別詳細 | `useDayDetailData.ts` | 複合 query が bundled handler 化されていない |
| clip export | `useClipExport.ts` | `queryExecutor.execute()` 直呼び |
| 時間帯計画 | `useTimeSlotPlan.ts` | comparison / weather / hourly が未分離 |

### 安全設計の方向

- 比較契約を Window 型（Current / Aligned / WoW / YoY / FallbackAware）で分離
- comparison output に provenance（sourceDate, mappingKind, fallbackApplied, confidence）を持たせる
- `isPrevYear` ベースから Window 型ベースへ移行

## Tier C: Persistence / Recovery

データの永続化と復旧に関わる領域。障害時の壊れ方を限定する設計が必要。

| 領域 | 現状 | リスク |
|------|------|--------|
| DuckDB lifecycle | Application 層に混在 | engine 失敗が責務汚染 |
| DuckDB recovery | `applicationToInfrastructure` 例外 | 復旧パスが implicit |
| IndexedDB 原本 | 派生キャッシュとしての DuckDB | rebuild 保証が未明示 |
| i18n bootstrap | Application 層に混在 | runtime 責務の越境 |
| UI persistence | render 中の `saveLayout()` | レンダーと副作用の結合 |

### 安全設計の方向

- Runtime state machine（idle → booting → loading-cache → ready / recovering / degraded / failed）
- `application/runtime-adapters/` への runtime 責務集約
- persistence 書き込みの idempotent 化 + schema version + safe fallback

## Tier D: UI-only Orchestration

表示の利便性に関わる領域。壊れても業務データに影響しない。

| 領域 | 現状 | リスク |
|------|------|--------|
| Unified Context | 責務過集中 | 変更波及の中心 |
| widget auto inject | localStorage ベース | React StrictMode との不整合 |
| dashboard layout | render 中の保存 | レンダー依存の副作用 |
| chart interaction | context 内に混在 | 分離可能 |

### 安全設計の方向

- Context を 5 slice に分解（Comparison / Query / Weather / ChartInteraction / PageSpecific）
- localStorage 直書きを facade に寄せる
- widget auto inject を pure 判定関数 + effect 反映に分離

## Tier 間の依存関係

```
Tier A (Authoritative) ← 最優先で安全化
    ↑
Tier B (Comparison) ← A の値を比較する層
    ↑
Tier C (Persistence) ← A/B のデータを保持・復旧する層
    ↑
Tier D (UI Orchestration) ← A/B/C の結果を表示する層
```

**原則:** 上位 Tier の安全性を下位 Tier の不具合が侵食しない構造にする。

## Allowlist との対応

| Allowlist | 主な Tier | 改善 Phase |
|-----------|----------|-----------|
| `applicationToInfrastructure` | C | Phase 1 |
| `ctxHook` | D | Phase 2 |
| `pairExceptionDesign` / `isPrevYearHandlers` | B | Phase 3 |
| `useMemoLimits` / `useStateLimits` / `hookLineLimits` | B, D | Phase 3, 5 |
| `presentationMemoLimits` / `presentationStateLimits` | D | Phase 5 |
| `infraLargeFiles` / `usecasesLargeFiles` | A, C | Phase 4 |
| `vmReactImport` | D | Phase 2 |
| `sideEffectChain` | B | Phase 3 |
