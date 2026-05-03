# element-index (generated)

> **役割 (= aag-self-hosting-completion R4 で landing)**: 全 element の機械生成索引。
> 各 category の現状 ID リスト + lifecycleStatus + 配置 (= flat-file vs per-element directory) を articulate。
>
> **正本性**: 本 file は **機械生成** (= 手編集禁止、`generatedFileEditGuard` で機械検証)。
> collector 実装は post-R4 別 program candidate (= 現在は skeleton landing のみ、`generatedFileEditGuard.test.ts` G1-G3 を満たす最低限の状態)。
>
> 詳細: `references/04-tracking/elements/element-taxonomy.md`

> 生成: 2026-05-03 — skeleton (= R4 landing 時点、collector 未実装。後続 commit で content collector 実装予定)

## widgets (= `WID-*`)

> 詳細は `references/04-tracking/elements/widgets/README.md` 参照。

(現時点: skeleton、collector 実装は post-R4)

## charts (= `CHART-*`)

> per-element directory pilot。詳細は `references/04-tracking/elements/charts/README.md` 参照。

| ID | exportName | lifecycleStatus | 配置 |
|---|---|---|---|
| `CHART-001` | SalesPurchaseComparisonChart | active | `charts/CHART-001/` |
| `CHART-002` | (TBD) | active | `charts/CHART-002/` |
| `CHART-003` | (TBD) | active | `charts/CHART-003/` |
| `CHART-004` | (TBD) | active | `charts/CHART-004/` |
| `CHART-005` | (TBD) | active | `charts/CHART-005/` |

## read-models (= `RM-*` 候補、prefix 未制定)

(現時点: skeleton、collector 実装は post-R4)

## calculations (= `CALC-*` / 将来 `ENG-*`)

(現時点: skeleton、collector 実装は post-R4)

## ui-components (= `UIC-*` 候補、prefix 未制定)

(現時点: skeleton、collector 実装は post-R4)

## status

- 2026-05-03 (DA-α-005 で landing): skeleton landed (= 後続 collector 実装で auto-fill 予定)
