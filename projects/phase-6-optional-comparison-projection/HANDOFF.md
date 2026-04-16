# HANDOFF — phase-6-optional-comparison-projection

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。
>
> **Parent**: `unify-period-analysis` (Phase 6 optional として切り出し)

## 1. 現在地

**Status**: active、未着手 (2026-04-16)

親 project `unify-period-analysis` は Phase 6 / Phase 6.5 全 step クローズ
済み。親 `HANDOFF.md` の高優先セクションに「**Phase 6 optional**」1 項目
だけが残っており、本サブ project がその 1 項目を閉じる。

本 project は 4 つの entry point + config の計画ドキュメントのみを持ち、
実装コードには一切触れていない。Phase O1 から着手することで実装フェーズが
始まる。

## 2. 次にやること

詳細は `plan.md` と `checklist.md` を参照。7 sub-phase 構造:

### 高優先 (次に着手するもの)

- **Phase O1**: `ComparisonProjectionContext` 型契約の定義。
  `app/src/features/comparison/application/ComparisonProjectionContext.ts` を
  型定義のみで新設し、`PeriodSelection` から必要な sub-fields を抽出する
  最小面を固定する。実装コード (builder / hook / caller) には触らない

### 中優先

- **Phase O2**: `buildComparisonProjectionContext` pure builder の追加
- **Phase O3**: `buildKpiProjection` の parity test 先行 (実装変更の前)
- **Phase O4**: `comparisonProjections.ts` から `PeriodSelection` import を削除
- **Phase O5**: `useComparisonModuleCore` + 旧 hook の wrapper 化
- **Phase O6**: `useComparisonSlice` を新 core 経路に移行
- **Phase O7**: 親 project の HANDOFF 更新 + 本サブ project クローズ

### PR 切り分け (推奨 3 本)

| PR | 含む phase | 変更規模 |
|---|---|---|
| PR 1 | O1 + O2 + O3 | 小 (型 + pure helper + parity test) |
| PR 2 | O4 + O5 | 中 (`comparisonProjections.ts` + hook 二層化) |
| PR 3 | O6 + O7 | 小 (caller 1 件 + 文書更新) |

## 3. ハマりポイント

### 3.1. parity を先に凍結しないと意味が subtle に変わる

現行 `buildKpiProjection` は `PeriodSelection` を入力に
`buildComparisonScope({...periodSelection, period1: fullMonthPeriod1, ...})`
で月全体用の scope を再構築している。ここを `PeriodSelection` 非依存に
書き換える過程で、**見た目は通るが意味が subtle に変わる** ケースが発生
しうる。特に `sameDow` の曜日 offset 計算と fullMonth period の境界。

**対策**: Phase O3 で先に parity test を固定する。Step B / Step C で同じ
パターンを経験済みで、このやり方が最も安全。fixture matrix には最低
8 ケース (典型月 / 月跨ぎ / 年跨ぎ / **elapsedDays cap 月** /
**2 月 leap year** / sameDow+sameDate 両ルート / 複数店舗 / 単一店舗) を含める。

**注意**: `comparisonEnabled=false` は `buildKpiProjection` の scope 外
(O5 の disable-path regression で検証)。O3 は pure 関数 parity のみ。

### 3.2. `ComparisonProjectionContext` を大きくしすぎる誘惑

`PeriodSelection` の 20+ fields をそのまま薄くコピーして
`ComparisonProjectionContext` にすると、optional phase の意味が完全に
失われる。コピーなら作業する意味がない。

**対策**: Phase O1 で棚卸しを徹底し、現行 `buildKpiProjection` 内の
`periodSelection.*` 参照箇所を全て列挙してから、その中で **本当に必要な
数個のみ** を抽出する。「念のため持っておく」フィールドは全て削る。
具体例: `activePreset` は現行コードで `prevYearSameDow` / `prevYearSameMonth`
に上書きされており、元値を context に含める必要はない (再監査済み)。
Phase O2 で `comparisonProjectionContextFieldGuard` を追加し、key 数上限 +
許可フィールド名 snapshot で field creep を機械的に防ぐ。

### 3.6. wrapper を features/ 内に残すと唯一 import 原則が崩れる

O5 の旧 signature wrapper は `PeriodSelection` を型として import する。
これを `features/comparison/` 内に配置すると、O2 の import guard
(allowlist = builder 1 ファイルのみ) と矛盾する。

**対策**: wrapper は `app/src/application/hooks/useComparisonModule.ts` に配置
する (現行は pure re-export のみ)。これにより `features/comparison/` 内部は
`PeriodSelection` を一切知らない状態を維持できる。

### 3.7. O3 parity に disable-path を混ぜると境界が曖昧になる

`comparisonEnabled=false` や `scope === null` の idle-path は
`useComparisonModule` 側の責務であり、`buildKpiProjection` (pure 関数) の
parity 対象ではない。混ぜるとテスト失敗時にどちらの変更が原因か判別できない。

**対策**: O3 は buildKpiProjection の pure 関数 parity のみ。
disable-path (externalScope null / comparisonEnabled=false / idle status) と
wrapper-core 出力一致は O5 の regression test で別途検証する。

### 3.3. 全 caller 一斉移行の誘惑

3 caller (`useComparisonSlice` / `usePageComparisonModule` / `useComparisonModule`
wrapper) を全て一気に新 core に寄せたくなるが、本 phase は **optional**
であり、primary path (`useComparisonSlice`) だけの移行で十分。
`usePageComparisonModule` は wrapper 経由のまま温存し、全 caller 削除は
別 phase (Phase 7 以降の legacy cleanup) 候補として残す。

### 3.4. `buildComparisonScope` の signature を触ってしまう

`buildKpiProjection` 内で `buildComparisonScope({...periodSelection,
period1: fullMonthPeriod1, ...})` が呼ばれているが、ここで
`buildComparisonScope` 側の signature を変更すると **比較 subsystem の外側
への波及** が発生する。本 phase の scope 超過。

**対策**: 呼び出し側だけを薄くする。`buildComparisonScope` に渡す
`PeriodSelection` の minimal 形を `ComparisonProjectionContext` から構築
する helper を作り、`buildComparisonScope` 自体は触らない。

### 3.5. Step B permanent floor を動かしてしまう

`storeDailyLaneSurfaceGuard` baseline=1 (`computeEstimatedInventory`) と
`categoryDailyLaneSurfaceGuard` baseline=6 (Shapley 5-factor leaf-grain)
は親 project `unify-period-analysis/inventory/05` §4 で **intentional
permanent floor** として確定している。本 phase の実装途中で触れる必要は
一切ない。

**対策**: guard baseline は一切触らない。触ろうと思ったら設計ミスの兆候。

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| `AI_CONTEXT.md` | project の why / what / what-not / 背景 |
| `plan.md` | 不可侵原則と Phase 構造 |
| `checklist.md` | 完了判定の入力 (機械判定用 required set) |
| `config/project.json` | project config (parent = `unify-period-analysis`) |

## 5. 親 project との連動

本サブ project の archive が完了した時点で、親 `unify-period-analysis`
の `HANDOFF.md` の高優先セクションから「Phase 6 optional」を除去し、完了済み
リストに本サブ project への参照を追加する。これにより親 project の
「Phase 6 全体」が optional まで含めて完全クローズ状態になる。

ただし親 project の `inventory/05` の 2 系統 permanent floor は本 phase
では動かさない。それらは Phase 7 以降の別判断。

## 6. 関連実装ファイル (参照)

| パス | 現状 | Phase |
|---|---|---|
| `app/src/features/comparison/application/hooks/useComparisonModule.ts` | `PeriodSelection` 直接受領 | O5 で二層化 |
| `app/src/features/comparison/application/comparisonProjections.ts` | `PeriodSelection` を import + 使用 | O4 で削除 |
| `app/src/features/comparison/application/ComparisonProjectionContext.ts` | 未存在 | O1 で新設 |
| `app/src/features/comparison/application/buildComparisonProjectionContext.ts` | 未存在 | O2 で新設 |
| `app/src/features/comparison/application/__tests__/buildKpiProjection.parity.test.ts` | 未存在 | O3 で新設 |
| `app/src/presentation/hooks/slices/useComparisonSlice.ts` | 旧 signature 経由 | O6 で移行 |
| `app/src/application/hooks/usePageComparisonModule.ts` | 旧 signature wrapper | 温存 (移行しない) |
