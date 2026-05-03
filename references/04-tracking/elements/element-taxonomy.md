# element-taxonomy — ID prefix 正本

> **役割 (= aag-self-hosting-completion R4 で landing)**: 全 element ID prefix の正本。
> `references/04-tracking/elements/` 配下の 5 category + 各 ID prefix の **唯一の articulation source**。
>
> **正本性**: 本 doc が canonical。各 category README + 各 element doc は本 taxonomy を参照。
> **検証**: 機械検証は将来的に `elementTaxonomyGuard.test.ts` で実装可能 (= 本 program post-archive 別 program candidate)。

## 5 prefix articulation

| prefix | category | 意味 | 物理配置 | reader |
|---|---|---|---|---|
| **`WID-*`** | UI widget | dashboard 内 UI widget (= isVisible predicate + children + ctx) | `references/04-tracking/elements/widgets/<id>/` | 主アプリ改修 user (UI / data flow) |
| **`CHART-*`** | chart / visualization | グラフ / chart コンポーネント (= chart input builder + view model + styles) | `references/04-tracking/elements/charts/<id>/` | 主アプリ改修 user (UI / chart 専門) |
| **`ENG-*`** | engine / calculation runtime | 計算 engine / domain calculation / pure function (= authoritative / candidate / analytic) | `references/04-tracking/elements/calculations/<id>/` | invariant-guardian / 主アプリ改修 user (計算正確性) |
| **`PAGE-*`** | application page | 1 URL = 1 page = 1 plan (= screen plan + page meta + route) | (R4 では未配備、scope 外) | 主アプリ改修 user (画面構成) |
| **`FLOW-*`** | user / data flow | data fetching pipeline / user interaction flow (= query handler + plan + 取得経路) | (R4 では未配備、scope 外) | 主アプリ改修 user / duckdb-specialist |

## category と ID prefix の対応

| category directory | ID prefix | 現在の元素数 (= R4 時点) |
|---|---|---|
| `references/04-tracking/elements/widgets/` | `WID-*` | 45 件 (`WID-001` ~ `WID-045`) |
| `references/04-tracking/elements/charts/` | `CHART-*` | 5 件 (`CHART-001` ~ `CHART-005`) |
| `references/04-tracking/elements/read-models/` | (= `RM-*` 候補、未制定) | 10 件 |
| `references/04-tracking/elements/calculations/` | `CALC-*` (= 既存)、将来 `ENG-*` 移行候補 | 24 件 (`CALC-001` ~ `CALC-024`) |
| `references/04-tracking/elements/ui-components/` | (= `UIC-*` 候補、未制定) | 5 件 |

> **note**: 既存 `CALC-*` prefix は taxonomy 制定 **前** に flat-file articulate された経緯。本 taxonomy の `ENG-*` prefix への移行は post-archive 別 program candidate (= scope 大、breaking change)。
> `RM-*` / `UIC-*` の正本制定も同様 (= 本 R4 では articulate のみ、prefix 制定は別 program)。

## ID 命名 規約

- **形式**: `<PREFIX>-<3 桁数字>` (例: `WID-001`、`CHART-005`、`CALC-024`)
- **数字は連番** (= 欠番禁止、retire は `lifecycleStatus: retired` で articulate)
- **prefix と category directory は 1:1 対応** (= `WID-*` は必ず `widgets/` 配下、cross-directory 配置禁止)
- **大文字** (= grep ability + AI parse 容易)

## per-element directory 構造 (= R4 で migration 開始、charts/ 5 element pilot)

```
references/04-tracking/elements/<category>/<id>/
├── README.md                       # 手書き、overview + 1 行定義 + upstream 定義への pointer
├── implementation-ledger.md        # 手書き、改修履歴 / commit lineage / 変更 rationale
├── quality-status.generated.md     # 機械生成、test coverage / health metrics / 制約状態
└── open-issues.generated.md        # 機械生成、guard / collector からの active issue surface
```

> **既存 single-file spec** (= `widgets/WID-001.md` 等) からの migration は段階適用:
> - **R4**: `charts/` 5 element を pilot として per-element directory 化
> - **post-R4**: `widgets/` (45 件) / `read-models/` (10 件) / `calculations/` (24 件) / `ui-components/` (5 件) は別 commit で段階適用 (= drawer Pattern 5 意図的 skip + rationale: pilot で mechanism value verify 後段階適用)

## status

- 2026-05-03 (DA-α-005 で landing): 本 taxonomy 制定 (= 5 prefix articulation + per-element directory 構造 articulate)
- 後続: post-R7 で全 category 展開判断 (= user 判断、別 program candidate)
