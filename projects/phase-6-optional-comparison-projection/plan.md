# plan — phase-6-optional-comparison-projection

> 役割: 不可侵原則と phase 構造の定義。
> 完了判定の入力は `checklist.md` を参照。

## 不可侵原則

1. **parity 先行** — 実装変更の前に旧/新入力の parity test を先に置く。
   これは Step B / Step C で確立した成功パターンを踏襲する。
2. **caller 互換を壊さない** — 旧 `useComparisonModule(periodSelection, ...)`
   は wrapper として残し、既存 3 caller
   (`useComparisonSlice` / `usePageComparisonModule` / test) が動作継続する
3. **`PeriodSelection` 知識の集約点は 1 つ** — `buildComparisonProjectionContext`
   のみが `PeriodSelection` を import する。`features/comparison/` 内部は
   すべて最小 contract 経由。旧 signature の wrapper は
   `app/src/application/hooks/` 側に置くことで feature 内部の invariant を
   完全に守る (§wrapper 配置方針 参照)
4. **最小面徹底** — `ComparisonProjectionContext` は `PeriodSelection` の
   sub-fields を薄くコピーするのではなく、projection で必要な数個のみを抽出する。
   field creep を機械的に防ぐため guard を併設する
5. **Step B permanent floor を動かさない** — `storeDailyLaneSurfaceGuard` /
   `categoryDailyLaneSurfaceGuard` の baseline 縮退は本 phase の scope 外

## Phase 構造

### Phase O1 — 最小契約の型定義

**目的**: `comparison` feature が projection で本当に必要とする
`PeriodSelection` sub-fields を明確化し、`ComparisonProjectionContext` 型を
固定する。

**成果物**:
- `app/src/features/comparison/application/ComparisonProjectionContext.ts`
  (型定義のみ、実装なし)

**棚卸し項目** (現行 `buildKpiProjection` 内の `periodSelection.*` 参照):
- `periodSelection.period1.from.year` / `period1.from.month`
  → **必要** (basisMonth として保持。fullMonthPeriod1 の構築に使用)
- `periodSelection.period2`
  → **必要** (sameDow / sameDate scope 再構築で `applyPreset()` の入力)
- `periodSelection.activePreset`
  → **不要** (2026-04-16 再監査済み)。現行 `buildKpiProjection` は `activePreset`
    を `prevYearSameDow` / `prevYearSameMonth` に**上書き**して
    `buildComparisonScope` に渡しており、元の `periodSelection.activePreset`
    を参照していない。context に含めると最小面違反になる
- `periodSelection` spread → `buildComparisonScope({...periodSelection, ...})`
  → **要注意** — spread で渡している残余 fields のうち、`buildComparisonScope`
    が内部で実際に消費する sub-fields の洗い出しが O4 の実装で必要。
    ただし `buildComparisonScope` の signature 自体は本 phase では触らない
- `periodSelection.comparisonEnabled` / その他
  → **不要** (scope は externalScope で既に解決されているため。
    `comparisonEnabled` は `useComparisonModule` 側の disable-path であり
    `buildKpiProjection` の責務ではない)

**完了条件**:
- 型の全フィールドに JSDoc で「なぜ必要か」を明記
- `PeriodSelection` の全フィールドを薄くコピーした形になっていない

### Phase O2 — pure builder + import guard 追加

**目的**: `PeriodSelection → ComparisonProjectionContext` の唯一の構築経路を
作り、それを **guard で機械的に保証** する。

**成果物**:
- `app/src/features/comparison/application/buildComparisonProjectionContext.ts`
  (pure function)
- 単体 test (空ケース + 典型ケース 3-5 件)
- `comparisonProjectionContextImportGuard.test.ts` — `features/comparison/application/**`
  配下での `PeriodSelection` import を禁止。allowlist は
  `buildComparisonProjectionContext.ts` の 1 ファイルのみ
- `comparisonProjectionContextFieldGuard.test.ts` — `ComparisonProjectionContext`
  の field creep 防止。key 数上限 + 許可フィールド名 snapshot +
  `PeriodSelection` と同名の大きい塊を持ち込み禁止

**配置根拠**: `features/comparison/application/` 配下に置くことで、この
builder が feature 内で唯一 `PeriodSelection` を import する境界点になる。
手作業確認ではなく guard で再発を防ぐ。

**完了条件**:
- builder が存在し、単体 test が green
- import guard が green (allowlist 1 件のみ)
- field guard が green
- `buildKpiProjection` からはまだ使われていない (parallel 状態)

### Phase O3 — parity test 先行 (buildKpiProjection のみ)

**目的**: 実装変更の前に期待値を凍結する (Step B / Step C と同じ順序)。
**注意**: `comparisonEnabled=false` や `scope === null` の idle-path は
`buildKpiProjection` の責務ではなく `useComparisonModule` 側の責務。
disable-path の regression は Phase O5 で別途検証する。

**成果物**:
- `app/src/features/comparison/application/__tests__/buildKpiProjection.parity.test.ts`

**凍結対象** (minimum):
1. `sameDow.sales` / `sameDow.customers` / `sameDow.transactionValue` /
   `sameDow.ctsQuantity` の一致
2. `sameDate.sales` / `sameDate.customers` / `sameDate.transactionValue` /
   `sameDate.ctsQuantity` の一致
3. `monthlyTotal.*` の一致
4. `sourceYear` / `sourceMonth` / `dowOffset` の一致
5. `buildDowGapProjection` 出力の一致 (kpi を入力とするため連鎖で検証)

**fixture matrix** (8 ケース):
- 典型月 (月内 31 日、fullMonth データ揃い)
- 月跨ぎ (前月末〜当月頭)
- 年跨ぎ (12 月 → 1 月)
- sameDow / sameDate 両方のルート
- **elapsedDays cap 月** — 当期 `period1` が月途中で切れている状態で、
  `fullMonthPeriod1` への拡張が正しく動作することの検証。
  `buildKpiProjection` が壊しやすい最重要ケース
- **2 月 / leap year (29 日)** — 28→29 日の月末境界で fullMonth 再構築の
  正確性を検証
- 複数店舗 / 単一店舗

**除外 (O3 scope 外)**:
- `comparisonEnabled=false` → O5 disable-path regression で検証
- `scope === null` の idle status → O5 disable-path regression で検証
- wrapper と core の出力一致 → O5 regression で検証

**完了条件**:
- 全 parity test が現行 signature で green
- 新 signature 用のテストは skip で待機 (Phase O4 で unskip)

### Phase O4 — projection の入力差し替え

**目的**: `buildKpiProjection` を `ComparisonProjectionContext` 入力に
refactor し、`comparisonProjections.ts` から `PeriodSelection` import を削除
する。

**成果物**:
- `buildKpiProjection(sourceIndex, targetIds, scope, context, sourceMonthCtx)`
  (新 signature)
- `comparisonProjections.ts` の `import type { PeriodSelection }` / `applyPreset`
  import を最小化
- Phase O3 の parity test が新 signature で全 green

**注意点**:
- `buildComparisonScope({...periodSelection, period1: fullMonthPeriod1, ...})`
  の呼び出しは、`ComparisonProjectionContext` から必要な情報を抜き出した
  最小引数で呼ぶ形に refactor する
- `applyPreset` 呼び出しは `context.period2Hint` から構築した最小 period2 を
  使う

**完了条件**:
- `comparisonProjections.ts` に `PeriodSelection` の文字列参照が無い
  (import も型引数も)
- parity test が全 green
- `buildDowGapProjection` は変更なし (kpi の出力を受けるだけのため)

### Phase O5 — hook の core/wrapper 分離

**目的**: `useComparisonModule` の core 経路を `PeriodSelection` 非依存にし、
旧 signature を互換 wrapper として残す。

#### wrapper 配置方針

**方針**: 旧 signature の wrapper は `features/comparison/` の**外側**
(`app/src/application/hooks/useComparisonModule.ts`) に配置する。

**理由**: 不可侵原則 3「`PeriodSelection` 知識の集約点は 1 つ」との整合。
wrapper は `buildComparisonProjectionContext(periodSelection)` を呼ぶため
`PeriodSelection` を型として import する。これを `features/comparison/` 内部に
残すと、O2 の import guard (allowlist = builder 1 ファイルのみ) が崩れる。

現行 `app/src/application/hooks/useComparisonModule.ts` は pure re-export のみ
なので、ここを legacy facade の受け皿にするのが自然。`features/comparison/`
内部には core hook だけが残り、`PeriodSelection` を知らない状態が完全に維持される。

**成果物**:
- `features/comparison/application/hooks/useComparisonModuleCore.ts`
  (新 core hook: `{ scope, projectionContext, currentAverageDailySales }`)
- `features/comparison/application/hooks/useComparisonModule.ts` を
  core hook の re-export のみに縮退 (旧 signature は削除)
- `app/src/application/hooks/useComparisonModule.ts` を legacy wrapper に書き換え:

  ```ts
  // Legacy facade — features/ 外で PeriodSelection を受け、
  // buildComparisonProjectionContext で最小 contract に変換して core に委譲
  export function useComparisonModule(
    periodSelection: PeriodSelection,
    elapsedDays: number | undefined,
    currentAverageDailySales: number,
    externalScope?: ComparisonScope | null,
  ): ComparisonModule {
    const projectionContext = useMemo(
      () => buildComparisonProjectionContext(periodSelection),
      [periodSelection],
    )
    const scope = externalScope ?? buildComparisonScope(periodSelection, elapsedDays)
    return useComparisonModuleCore({
      scope,
      projectionContext,
      currentAverageDailySales,
    })
  }
  ```

#### disable-path regression (O3 から分離)

O3 は `buildKpiProjection` の pure 関数 parity のみを凍結する。
一方、以下の disable-path / idle-path は `useComparisonModule` 側の責務であり、
O5 で wrapper/core 分離の regression として別途検証する:

- `externalScope === undefined` のとき内部で `buildComparisonScope` 構築
- `externalScope === null` のとき比較無効 (scope=null)
- `!periodSelection.comparisonEnabled` のとき idle status / dailyDefault / kpiDefault
- wrapper 経由と core 直接呼び出しの出力一致

**完了条件**:
- core hook が `periodSelection` を引数に取らない
- core hook が `features/comparison/` 内に存在し、`PeriodSelection` を import しない
- legacy wrapper が `app/src/application/hooks/` に存在する
- 既存 3 caller が全て wrapper 経由で動作継続
- disable-path regression test が green
- `useComparisonModuleLegacyCallerGuard` baseline 0 維持
- O2 の import guard が依然 green (features/ 内 allowlist = builder 1 件のまま)

### Phase O6 — primary caller の最小移行

**目的**: primary caller を新 core 経路に直接寄せる。wrapper は optional
phase の安全網として残す。

**成果物**:
- `useComparisonSlice` が `useComparisonModuleCore` を直接呼ぶ
  (frame.comparison + projectionContext 経由)
- `usePageComparisonModule` は wrapper 継続使用 (移行必須ではない)

**完了条件**:
- `useComparisonSlice` の呼び出しが `useComparisonModuleCore` になっている
- legacy guard が依然 green

### Phase O7 — guard / docs クローズ

**目的**: 親 project の `HANDOFF.md` から Phase 6 optional を完了済みに移し、
本サブ project を archive 準備状態にする。

**成果物**:
- 親 `unify-period-analysis/HANDOFF.md` の高優先セクションから「Phase 6
  optional」を除去し、「完了済み」リストに移動
- 本サブ project の `HANDOFF.md` を最終状態に更新
- `checklist.md` の全 checkbox を `[x]` に
- `doc-registry.json` に changelog エントリ追加

**完了条件**:
- 親 project の Phase 6 全景ブロックが「全 step 完了」となる
- 本サブ project の status が archive 候補状態 (全 checkbox green)

## Critical Path / Done の定義

実装の正しさは **parity test** で担保される。guard は補完的な signal
にすぎない。

**Done 条件**:
1. `comparisonProjections.ts` から `PeriodSelection` import が消えている
2. `buildKpiProjection` が最小 contract 受領
3. `useComparisonModuleCore` が `periodSelection` 非依存
4. parity test 全通 (fixture matrix 最低 6 件)
5. 全 caller の旧 wrapper 経由動作が壊れていない
6. `useComparisonModuleLegacyCallerGuard` baseline 0 維持
7. 親 `HANDOFF.md` Phase 6 optional が完了済みに移動

## やってはいけないこと

- **`PeriodSelection` を部分コピーした大きい型を作る** → 最小面の意図が壊れる。
  field creep guard で機械的に防ぐ
- **`activePreset` を `ComparisonProjectionContext` に含める** → 現行コードは
  `prevYearSameDow` / `prevYearSameMonth` に上書きしており元値は不要 (O1 再監査済み)
- **旧 signature wrapper を `features/comparison/` 内に置く** → 「唯一 import
  原則」が崩れる。wrapper は `app/src/application/hooks/` 側に寄せる
- **全 caller を一斉に新 core に移行する** → optional phase の scope 超過。
  wrapper 温存で十分
- **`buildComparisonScope` の signature を触る** → comparison subsystem の
  外側への波及。本 phase では呼び出し側の入力だけを薄くする
- **parity test を後回しにする** → 意味の subtle な変更を検出できない。
  Step B の失敗パターンを繰り返さない
- **O3 parity に disable-path (comparisonEnabled=false) を混ぜる** →
  `buildKpiProjection` は projection pure 関数であり disable-path は
  `useComparisonModule` 側の責務。テスト境界を混ぜると失敗原因が不明瞭になる
- **`PeriodSelection` store 自体を改変する** → UI 層影響範囲外
- **Step B permanent floor を動かす** → 別 phase の領域

## PR 切り分け (推奨 3 本)

| PR | scope | 変更規模 |
|---|---|---|
| **PR 1**: 契約 + parity | Phase O1 + O2 + O3 | 小 (型 + pure helper + test) |
| **PR 2**: projection / core hook | Phase O4 + O5 | 中 (hook 層 + `comparisonProjections.ts`) |
| **PR 3**: caller 移行 + docs | Phase O6 + O7 | 小 (caller 1 件 + 文書) |

## 関連

- `AI_CONTEXT.md` — why / what / what-not / 背景
- `checklist.md` — phase 別の required checkbox
- `HANDOFF.md` — 起点文書 (完了状況 / 残タスク / ハマりポイント)
- 親 project `unify-period-analysis/HANDOFF.md` §Phase 6 optional
