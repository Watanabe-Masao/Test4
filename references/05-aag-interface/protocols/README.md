# references/05-aag-interface/protocols/ — AAG protocols (skeleton)

> **status**: skeleton (= R2 で landed)、R5 で fill 予定。
> **役割**: operational-protocol-system project の M1-M5 deliverable (= Task Protocol / Session Protocol / Complexity Policy + Task Class Catalog + 5 Protocol = Planning / Refactor / Bug Fix / New Capability / Handoff) の landing 場所。
> **reader**: 主アプリ改修 user (= AAG が提供する Task / Session / Complexity protocol を引き出して使う)。

## 役割 (= layer 3 value mechanism、本 program R5 で resume trigger)

本 directory は **AAG が day-to-day workflow に value を生成する protocol 集** の receiving location:

| protocol | 性質 | landing timing |
|---|---|---|
| `task-protocol-system.md` | M1-M5 全体 index | R5 完了後 operational-protocol-system M1 で fill |
| `task-class-catalog.md` | 6 類型 (= Planning / Refactor / Bug Fix / New Capability / Incident Discovery / Handoff) | M1 で fill |
| `session-protocol.md` | Session 開始 / 実行中 / 終了 / 引き継ぎ + L1/L2/L3 別 read order | M1 + M2 で fill |
| `complexity-policy.md` | L1 軽修正 / L2 通常変更 / L3 重変更 + 動的昇格・降格 trigger | M1 + M3 で fill |
| `<protocol>-protocol.md` (5 件) | Task Class ごとの標準手順 (Planning / Refactor / Bug Fix / New Capability / Handoff) | M4 で fill |

## scope (= 本 R2 = skeleton landing のみ)

含む:

- 本 README (= landing 受け入れ structure articulate)
- 主アプリ改修 user 向け reach 経路 articulate (= 本 directory 内 doc のみで Task / Session / Complexity protocol を引き出す)

含まない (= aag-self-hosting-completion R2 scope 外):

- M1-M5 deliverable の articulate 自体 (= operational-protocol-system project R5 resume 後に fill)
- 内容追加 (= 不可侵原則 8 articulate、本 program は trigger only)

## boundary (= aagBoundaryGuard sub-invariant (d) で機械検証、R5 で active 化)

- 本 directory 外への operational-protocol-system M1-M5 deliverable 配置は **Hard fail**
- 本 directory 内への 別 program deliverable 混在も **Hard fail** (= reader-別 separation 整合)

## 関連

- 親 directory: `references/05-aag-interface/` (= AAG public interface root)
- 上位 program: `projects/completed/aag-self-hosting-completion/` (= 本 protocols/ landing 場所を articulate する program)
- M1-M5 deliverable 実装 program: `projects/active/operational-protocol-system/` (= 本 program R5 resume 後 user 判断で起動)

## status

- 2026-05-02: skeleton landed (= R2)
- R5 (= aag-self-hosting-completion R5) で operational-protocol-system project resume + M1-M5 fill 予定
