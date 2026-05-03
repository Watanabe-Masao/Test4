# projects/ — 作業単位 lens

> **役割 (= 3 tree boundary 第三階層)**: **作業単位の管理ビュー**。状態正本でも進捗集約でもない。
>
> 各 project は本 directory 直下に配置 (= 現状)、R6 で **active subdirectory** + **completed subdirectory** に分離予定 (= 配下 active project は active 配下に移動、archived は completed 配下に維持)。
>
> **本 tree に置かないもの**: 業務 domain knowledge (= `references/01-foundation/` 配下 R3 後)、AAG framework 内部 articulation (= `aag/_internal/`)、機械観測された動的 state (= `references/04-tracking/` 配下 R3 後)。

## 3 tree boundary (= references / aag / projects)

| tree | 役割 | reader |
|---|---|---|
| `references/` | 主アプリ改修 AI / 人間の knowledge interface | 主アプリ改修 AI / 人間 |
| `aag/` | AAG framework 本体 | AAG framework 改修者のみ |
| **`projects/`** (本 tree) | **作業単位 lens** | 全 reader (= 作業 context 把握) |

## 作業 lens vs 状態 lens の articulate

| lens | 配置 | 性質 |
|---|---|---|
| **作業単位 lens** (= 本 tree) | 本 directory 直下 `<id>` directory (R6 後 active subdirectory 配下) | per-project 進行 context、HANDOFF / plan / checklist / decision-audit / projectization で articulate |
| 状態 lens (= 別 tree) | `references/04-tracking/` 配下 (R3 後) | 機械観測された動的 state、dashboard / per-element status |

= projects/ は「いま何を進めているか、何が完了したか」の管理ビュー。**正本** (= references/01-foundation/) でも **状態集約** (= references/04-tracking/) でもない。

## 構造 (= 現状、R6 で active/ + completed/ split 予定)

```
projects/
├── README.md                       (本 file、R0 で landing)
├── _template/                      (= 新規 project bootstrap template)
│   ├── AI_CONTEXT.md
│   ├── HANDOFF.md
│   ├── plan.md
│   ├── checklist.md
│   ├── decision-audit.md
│   ├── projectization.md
│   ├── DERIVED.md
│   ├── derived/
│   ├── aag/execution-overlay.ts
│   └── config/project.json
├── <active-id>/                    (= 現状 root 直下、R6 で active/<id>/ に move 予定)
│   ├── AI_CONTEXT.md
│   ├── HANDOFF.md
│   ├── plan.md
│   ├── checklist.md
│   └── ... (+ optional doc per AAG-COA)
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

詳細: `references/05-aag-interface/operations/new-project-bootstrap-guide.md` (R2 で landing 予定)。

## active project 一覧

詳細: `references/02-status/open-issues.md` (R3 後 `references/04-tracking/open-issues.generated.md`)。

active project の active project pointer は repo root の `CURRENT_PROJECT.md` で articulate (= pointer 限定、詳細進捗・判断は per-project HANDOFF / decision-audit に集約)。

## R6 で予定の split

```
projects/
├── _template/
├── active/                         (R6 で新設、現 root 直下 active project を移動)
│   └── <active-id>/
└── completed/                      (= 既存維持)
    └── <archived-id>/
```

詳細: `projects/aag-self-hosting-completion/plan.md` §3 R6。

## status

- 2026-05-02: 本 README landing (= R0 境界定義先行)
- R6 で active subdirectory 新設 + active project 移動予定 (= scope discipline、本 program R6 で実施)
