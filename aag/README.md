# aag/ — AAG Framework 本体

> **🚧 reader 別 boundary 警告**:
>
> **主アプリ (粗利管理ツール) 改修 AI / 人間は本 tree を通常 not read。**
>
> AAG が AI に提供する **drawer (= 引き出し)** + **protocols** + **operations** は **`references/05-aag-interface/`** (R2 で landing 予定) に articulated。主アプリ改修時は **drawer 経由で必要な Pattern を引き出す** だけで済み、本 tree を読む必要はない。
>
> 本 tree を読むべき reader = **AAG framework 自身を改修する者** (= AAG core 改修 / Standard 改訂 / drawer Pattern 追加判断 / AAG-REQ 追加判断 / framework 実装 (rules / collectors / generators / schemas) 改修)。

## 役割 (= 3 tree boundary 第二階層)

本 tree は **AAG framework 本体** (= 内部 articulation + framework 実装):

- `_internal/` (R1 で fill 予定) — AAG framework 内部 articulation (= meta / strategy / architecture / evolution / source-of-truth / operational-classification / layer-map / display-rule-registry)
- `_framework/` (R1 で skeleton 新設、後続 phase で fill) — AAG framework 実装 (= rules / collectors / generators / schemas / fixtures)
- `core/` (= 既存) — AAG core implementation

## 3 tree boundary (= references / aag / projects)

| tree | 役割 | reader |
|---|---|---|
| `references/` | 主アプリ改修 AI / 人間の knowledge interface | 主アプリ改修 AI / 人間 |
| **`aag/`** (本 tree) | **AAG framework 本体** | AAG framework 改修者のみ |
| `projects/` | 作業単位 lens | 全 reader |

## 主アプリ改修時の reach 経路 (= 主アプリ改修者は本 tree を読まない)

主アプリ改修 AI / 人間は以下経路で AAG が提供する pattern / operation を reach:

| 必要 | reach 先 (= references/ tree 内、`aag/` tree 不要) |
|---|---|
| change articulation pattern (= commit-bound rollback / scope discipline / clean rewrite / honest limitation / rationale skip / state-based verification) | `references/05-aag-interface/drawer/decision-articulation-patterns.md` (R2 で landing) |
| AAG-COA / project-checklist-governance / new-project-bootstrap-guide / deferred-decision-pattern | `references/05-aag-interface/operations/<doc>.md` (R2 で landing) |
| Task Protocol / Session Protocol / Complexity Policy (= operational-protocol-system M1-M5 deliverable) | `references/05-aag-interface/protocols/<doc>.md` (R5 完了後 fill 予定) |

= 主アプリ改修者は **`references/05-aag-interface/` のみ** を reach 先とすれば、AAG framework が提供する全 interface に到達可能。本 `aag/` tree を読む必要は通常ない。

## 構造 (= R1 で fill 予定の skeleton)

```
aag/
├── README.md                       (本 file、R0 で landing)
├── _internal/                      (R1 で fill — AAG framework 内部 articulation)
│   ├── README.md
│   ├── meta.md                     (= AAG-REQ-* charter)
│   ├── strategy.md
│   ├── architecture.md
│   ├── evolution.md
│   ├── source-of-truth.md
│   ├── operational-classification.md
│   ├── layer-map.md
│   └── display-rule-registry.md
├── _framework/                     (R1 で skeleton 新設、後続 phase で fill)
│   ├── README.md
│   ├── rules/                      (= AAG rule definition、後続 phase で物理移動)
│   ├── collectors/
│   ├── generators/
│   ├── schemas/
│   └── fixtures/
└── core/                           (= 既存維持)
    └── AAG_CORE_INDEX.md
```

## 関連 (= 主アプリ改修者は読まない、AAG 改修者向け)

- AAG Pilot 完遂 program: `projects/completed/aag-platformization/`
- 進行中 structural reorganization: `projects/aag-self-hosting-completion/`
- AAG self-hosting closure 達成は本 program R6 で AAG-REQ-SELF-HOSTING を「code-level + entry navigation rigor 完全達成」に articulate 予定

## status

- 2026-05-02: 本 README landing (= R0 境界定義先行)、`_internal/` + `_framework/` skeleton は R1 で fill 予定
- R1-R7 進行は `projects/aag-self-hosting-completion/plan.md` §3 参照
