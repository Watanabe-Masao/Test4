# references/05-aag-interface/protocols/ — AAG protocols (filled)

> **status**: filled (= operational-protocol-system project M1-M5 で 9 protocols 全 landed、2026-05-04 完遂)。
> **役割**: AAG が day-to-day workflow に value を生成する protocol 集 (= Task Protocol / Session Protocol / Complexity Policy + Task Class Catalog + 5 Protocol = Planning / Refactor / Bug Fix / New Capability + Seam Integration)。
> **reader**: 主アプリ改修 user (= AAG が提供する Task / Session / Complexity protocol を引き出して使う)。

## 役割 (= layer 3 value mechanism)

本 directory は **AAG が day-to-day workflow に value を生成する protocol 集**:

| protocol | 性質 | landed |
|---|---|---|
| `task-protocol-system.md` | M1-M5 全体 index | 2026-05-04 (M1) |
| `task-class-catalog.md` | 6 類型 (= Planning / Refactor / Bug Fix / New Capability / Incident Discovery / Handoff) | 2026-05-04 (M1) |
| `session-protocol.md` | Session 開始 / 実行中 / 終了 / 引き継ぎ + L1/L2/L3 別 read order | 2026-05-04 (M1+M2) |
| `complexity-policy.md` | L1 軽修正 / L2 通常変更 / L3 重変更 + 動的昇格・降格 trigger | 2026-05-04 (M1+M3) |
| `planning-protocol.md` | Planning task class (TC-1) standard 手順 | 2026-05-04 (M4) |
| `refactor-protocol.md` | Refactor task class (TC-2) standard 手順 | 2026-05-04 (M4) |
| `bug-fix-protocol.md` | Bug Fix task class (TC-3) standard 手順 | 2026-05-04 (M4) |
| `new-capability-protocol.md` | New Capability task class (TC-4) standard 手順 | 2026-05-04 (M4) |
| `seam-integration.md` | AAG drawer `_seam` × Task Protocol System integration | 2026-05-04 (M5) |

## boundary (= aagBoundaryGuard sub-invariant (d) で機械検証)

- 本 directory 外への operational-protocol-system M1-M5 deliverable 配置は **Hard fail**
- 本 directory 内への 別 program deliverable 混在も **Hard fail** (= reader-別 separation 整合)

## 関連

- 親 directory: `references/05-aag-interface/` (= AAG public interface root)
- landing program: `projects/completed/aag-self-hosting-completion/` (= 本 protocols/ landing 場所を articulate した program、completed)
- M1-M5 deliverable 実装 program: `projects/completed/operational-protocol-system/` (= 9 protocols を fill した program、completed 2026-05-04)

## status

- 2026-05-02: skeleton landed (R2)
- 2026-05-04: M1-M5 fill 完遂 (= 9 protocols all landed)
- 2026-05-10: rewrite (= staleness 解消、Wave 3 / Phase 6 sub-PR 4、'skeleton + R5 で fill 予定' → 'filled')
