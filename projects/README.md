# projects/ — 作業単位 lens

> **役割 (= 3 tree boundary 第三階層)**: **作業単位の管理ビュー**。状態正本でも進捗集約でもない。
>
> 各 project は **active subdirectory** + **completed subdirectory** に分離して配置 (= aag-self-hosting-completion R6b で institute、2026-05-03 完了)。
>
> **本 tree に置かないもの**: 業務 domain knowledge (= `references/01-foundation/` 配下 R3 後)、AAG framework 内部 articulation (= `aag/_internal/`)、機械観測された動的 state (= `references/04-tracking/` 配下 R3 後)。

## 3 tree boundary (= references / aag / projects)

| tree | 役割 | reader |
|---|---|---|
| `references/` | 主アプリ改修 userの knowledge interface | 主アプリ改修 user |
| `aag/` | AAG framework 本体 | AAG framework 改修者のみ |
| **`projects/`** (本 tree) | **作業単位 lens** | 全 reader (= 作業 context 把握) |

## 作業 lens vs 状態 lens の articulate

| lens | 配置 | 性質 |
|---|---|---|
| **作業単位 lens** (= 本 tree) | `active/<id>/` + `completed/<id>/` (= R6b 後) | per-project 進行 context、HANDOFF / plan / checklist / decision-audit / projectization で articulate |
| 状態 lens (= 別 tree) | `references/04-tracking/` 配下 (R3 後) | 機械観測された動的 state、dashboard / per-element status |

= projects/ は「いま何を進めているか、何が完了したか」の管理ビュー。**正本** (= references/01-foundation/) でも **状態集約** (= references/04-tracking/) でもない。

## 構造

```
projects/
├── README.md                       (本 file、R0 で landing)
├── _template/                      (= 新規 project bootstrap template)
│   ├── AI_CONTEXT.md
│   ├── HANDOFF.md
│   ├── plan.md
│   ├── checklist.md
│   ├── decision-audit.md
│   ├── discovery-log.md
│   ├── projectization.md
│   ├── DERIVED.md
│   ├── derived/
│   ├── aag/execution-overlay.ts
│   └── config/project.json
├── active/                         (= active project 配置)
│   └── <active-id>/
│       ├── AI_CONTEXT.md
│       ├── HANDOFF.md
│       ├── plan.md
│       ├── checklist.md
│       └── ... (+ optional doc per AAG-COA)
└── completed/                      (= archived projects)
    └── <archived-id>/
```

## 必須セット 6 ファイル (= projects/_template/ 由来)

| ファイル | 役割 |
|---|---|
| `AI_CONTEXT.md` | project 意味空間 (= why / scope / read order) |
| `HANDOFF.md` | 現在地 + 次にやること + ハマりポイント |
| `plan.md` | 不可侵原則 + Phase 構造 + scope 外 |
| `checklist.md` | completion 判定 (= observable verification) |
| `decision-audit.md` | 重判断 institution (= drawer Pattern 1 application) |
| `config/project.json` | manifest |

詳細: `references/05-aag-interface/operations/new-project-bootstrap-guide.md`。

## active project 一覧

詳細: `references/04-tracking/open-issues.md` (R3 後 `references/04-tracking/open-issues.generated.md`)。

active project の active project pointer は repo root の `CURRENT_PROJECT.md` で articulate (= pointer 限定、詳細進捗・判断は per-project HANDOFF / decision-audit に集約)。

## status

- 2026-05-02: 本 README landing (= R0 境界定義先行)
- 2026-05-03: aag-self-hosting-completion R6b で active/ + completed/ split 完了 (= 全 active project が `projects/active/<id>/` に移動)
- 2026-05-04: aag-self-hosting-completion 完遂 + archive 移行 (= 本 program 完了、`projects/completed/aag-self-hosting-completion/`)
