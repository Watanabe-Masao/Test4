# Chart Input Builder Pattern

> unify-period-analysis Phase 5 で確立した chart 薄化の標準パターン。
> 新しい chart を作るとき、および既存 chart を触るときは本パターンに従う。

## 目的

chart / widget から「query input を組み立てる責務」と「domain 内部を読む責務」を
剥がし、application 層の pure builder に集約する。これにより:

- `ComparisonScope` / `PeriodSelection` の内部フィールドが presentation に漏れない
- query input 組み立てが 1 箇所に集約され、再利用・テスト・変更が容易になる
- chart は「入力 → 描画」の薄いレンダラーに収斂する
- Phase 2b で導入した `ComparisonResolvedRange` 単一契約が本当に単一の読み口になる

関連原則: `data-pipeline-integrity.md` / `temporal-scope-semantics.md` /
`runtime-data-path.md`

## 4 層の責務分離

```
periodSelection / storeIds / scope / prevYearScope
  ↓
application pure builder (build<Name>Input.ts)
  ↓ returns XxxQueryInput | null
plan hook (use<Name>Plan.ts) → QueryHandler
  ↓ returns readModel / ViewModel
chart component (Xxx.tsx)
  ↓ renders EChart / UI
```

| 層 | 責務 | 禁止 |
|---|---|---|
| **application builder** | query input 組み立て、scope 内部フィールド参照、日付変換、store id 配列化 | React hooks / store 参照 / side effect |
| **plan hook** | handler 実行、debounce / cache / profiling | input 組み立て / domain 計算 |
| **chart component** | builder 出力を plan hook に渡す、readModel を描画 | scope 内部参照 / query input の ad hoc 組み立て / PeriodSelection / store の直接参照 |

## chart 側の禁止事項

chart component (`presentation/components/charts/` および widget) では次を禁止する:

1. **ComparisonScope 内部フィールド参照** — `scope?.alignmentMap / effectivePeriod2 / queryRanges / sourceMonth`
2. **PeriodSelection store 直接参照** — `usePeriodSelectionStore` の直接 import（widget を除く）
3. **query input の ad hoc 組み立て** — `dateRangeToKeys` を chart 内で呼んで query input を作る
4. **query input 型の直接 literal 構築** — `{ curDateFrom: ..., prevDateFrom: ... }` のような形
5. **alignmentMode / compareMode 変換** — chart 側で `'sameDayOfWeek' → 'sameDate'` などを判定しない

## 見本実装: `YoYChart.tsx`

### before (Phase 5 前)

```tsx
export const YoYChart = memo(function YoYChart({ queryExecutor, scope, selectedStoreIds, prevYearScope }) {
  // ❌ scope 内部フィールドを直接参照
  const scopePeriod1 = scope?.effectivePeriod1
  const scopePeriod2 = scope?.effectivePeriod2
  const scopeAlignmentMode = scope?.alignmentMode
  const prevYearDateRange = prevYearScope?.dateRange

  // ❌ chart 内で query input を組み立てる
  const input = useMemo<YoyDailyInput | null>(() => {
    if (!scopePeriod1 || !scopePeriod2) return null
    const cur = dateRangeToKeys(scopePeriod1)
    const prevRange = prevYearDateRange ?? scopePeriod2
    const prev = dateRangeToKeys(prevRange)
    return {
      curDateFrom: cur.fromKey,
      curDateTo: cur.toKey,
      prevDateFrom: prev.fromKey,
      prevDateTo: prev.toKey,
      storeIds: selectedStoreIds.size > 0 ? [...selectedStoreIds] : undefined,
      compareMode: scopeAlignmentMode === 'sameDayOfWeek' ? 'sameDayOfWeek' : 'sameDate',
    }
  }, [...])

  const { data } = useYoYChartPlan(queryExecutor, input)
  // ... 描画
})
```

### after (Phase 5 見本)

```tsx
// application/hooks/plans/buildYoyDailyInput.ts (pure builder, application 層)
export function buildYoyDailyInput(
  scope: ComparisonScope | null,
  prevYearScope: PrevYearScope | undefined,
  selectedStoreIds: ReadonlySet<string>,
): YoyDailyInput | null {
  if (!scope) return null
  const cur = dateRangeToKeys(scope.effectivePeriod1)
  const prev = dateRangeToKeys(prevYearScope?.dateRange ?? scope.effectivePeriod2)
  return {
    curDateFrom: cur.fromKey, curDateTo: cur.toKey,
    prevDateFrom: prev.fromKey, prevDateTo: prev.toKey,
    storeIds: selectedStoreIds.size > 0 ? [...selectedStoreIds] : undefined,
    compareMode: toCompareMode(scope.alignmentMode),
  }
}
```

```tsx
// presentation/components/charts/YoYChart.tsx (薄い chart)
export const YoYChart = memo(function YoYChart({ queryExecutor, scope, selectedStoreIds, prevYearScope }) {
  // ✅ scope は「存在判定」と builder への pass-through のみ
  const input = useMemo(
    () => buildYoyDailyInput(scope, prevYearScope, selectedStoreIds),
    [scope, prevYearScope, selectedStoreIds],
  )
  const { data } = useYoYChartPlan(queryExecutor, input)
  // ... 描画
})
```

### 変わったこと

| 項目 | Before | After |
|---|---|---|
| scope 内部参照 | chart 内 3 箇所 | application builder 1 箇所 |
| query input 組み立て | chart 内 useMemo | application pure builder |
| `dateRangeToKeys` 呼び出し | chart | application builder |
| `compareMode` 変換 | chart ローカル helper | builder 内 |
| chart の useMemo 数 | 5 | 3 |
| unit test | 困難 (hook 必要) | builder 単体で 8 test |

## 5 ステップ移行手順

既存 chart を薄化するときは次の手順:

1. **scope 内部アクセスの洗い出し** — `grep "scope\?\.\|comparisonScope\?\." chart.tsx`
2. **application 層に pure builder を作る** — `application/hooks/plans/build<Name>Input.ts`
   - 入力は (scope, prevYearScope, storeIds, ...)
   - 出力は plan hook の input 型
   - `@responsibility R:query-plan` タグ
3. **widget を builder 呼び出しに置換** — useMemo で builder を呼び、結果を plan hook に渡す
4. **存在判定は scope の null チェックに限定** — empty state 判定など
5. **guard を更新** — `chartInputBuilderGuard` allowlist から対象 chart を削除、baseline を減らす

## 関連 guard

| Guard | 責務 |
|---|---|
| `presentationComparisonMathGuard` | presentation での比較先日付独自計算禁止（Phase 2） |
| `presentationPeriodStoreAccessGuard` | presentation からの `usePeriodSelectionStore` 直接 import を allowlist 管理（Phase 1） |
| `comparisonResolvedRangeSurfaceGuard` | presentation での `scope.alignmentMap / effectivePeriod2 / queryRanges / sourceMonth` 直接参照禁止（Phase 3 封じ手、baseline 0） |
| `chartInputBuilderGuard` | chart 配下での `dateRangeToKeys` / query input 組み立て禁止（Phase 5 本ルール、baseline は現状 chart 数から ratchet-down） |

## 新規 chart を作るとき

最初から本パターンで実装する:

1. `application/hooks/plans/build<Name>Input.ts` を先に作る
2. `application/hooks/plans/use<Name>Plan.ts` を用意する
3. `presentation/components/charts/<Name>.tsx` は上記 2 つを呼ぶだけの薄い component に
4. scope / selection を chart 内で直接読まない

この順序で作れば `chartInputBuilderGuard` は最初から fail せず、`comparisonResolvedRangeSurfaceGuard` の allowlist にも載らない。

## 関連文書

- `references/03-guides/runtime-data-path.md` — 正本 lane / Screen Plan lane の 2 系統
- `references/01-principles/free-period-analysis-definition.md` — 自由期間データレーンの唯一経路
- `projects/completed/unify-period-analysis/HANDOFF.md` — Phase 5 chart 薄化テンプレート（5 ステップ）
- `app/src/application/hooks/plans/buildYoyDailyInput.ts` — 見本実装
- `app/src/presentation/components/charts/YoYChart.tsx` — 見本 chart
