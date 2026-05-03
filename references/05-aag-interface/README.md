# references/05-aag-interface/ — AAG public interface

> **役割**: AAG framework が **主アプリ (粗利管理ツール) 改修 user** に提供する public interface。AAG framework 内部 (= `aag/_internal/`) を読まずに、本 directory 内 doc のみで AAG が提供する pattern / operations / protocols に reach 可能。
>
> **reader**: 主アプリ改修 user。AAG framework 改修者は別途 `aag/_internal/` を read。
>
> **境界 (= 不可侵原則)**: 本 directory 配下 doc は **AAG framework 内部 (= aag/_internal/) を読む必要なく適用可能**。AAG-specific term (= AAG-REQ-* / 5 軸 / 8 軸 / DA-α-NNN / 不可侵原則 N) を pattern body に持ち込まない (= AAG self-application application instance のみ articulate)。

## 構造

```
references/05-aag-interface/
├── README.md                              ← 本 file
├── drawer/                                ← AI ↔ AAG primary interface (= 領域 agnostic な change articulation pattern 集)
│   └── decision-articulation-patterns.md
├── protocols/                             ← AAG が提供する Task / Session / Complexity protocol (= operational-protocol-system M1-M5 deliverable、R5 で fill)
│   └── README.md (R2 = skeleton)
└── operations/                            ← AAG 運用 guide (= AAG-COA / project-checklist-governance / new-project-bootstrap-guide / deferred-decision-pattern)
    ├── projectization-policy.md
    ├── project-checklist-governance.md
    ├── new-project-bootstrap-guide.md
    └── deferred-decision-pattern.md
```

## 使い分け

| trigger | reach 先 |
|---|---|
| change-bearing 作業全般で reusable な articulation pattern 必要 | `drawer/decision-articulation-patterns.md` (= 6 pattern + abstraction self-test) |
| 新 project 立ち上げ判断 (= AAG-COA Level 0-4) | `operations/projectization-policy.md` |
| project 進行管理 (= checklist governance) | `operations/project-checklist-governance.md` |
| 新 project bootstrap 手順 | `operations/new-project-bootstrap-guide.md` |
| 計画段階で判断保留 (= deferred decision) | `operations/deferred-decision-pattern.md` |
| Task / Session / Complexity protocol (= R5 完了後) | `protocols/<protocol>.md` (R5 fill 予定) |

## 3 tree boundary integration (= aag-self-hosting-completion R0 articulate と整合)

- `references/` (本 tree) = 主アプリ改修 userの knowledge interface
- `aag/` = AAG framework 本体 (= 主アプリ改修 user は通常 not read)
- `projects/` = 作業単位 lens

本 `05-aag-interface/` は references/ 配下に置かれることで、**主アプリ改修 user が AAG framework 内部を読まずに reach 可能** な structural articulate を realize する (= 不可侵原則 4 + reader-別 separation 整合)。

## status

- 2026-05-02: 本 README + drawer + operations landed (R2)
- protocols/ skeleton (= README のみ) は R5 で operational-protocol-system M1-M5 deliverable で fill 予定
