# AI_CONTEXT — aag-platformization

> 役割: project 意味空間の入口。
> 現在地・次の作業・ハマりポイントは `HANDOFF.md`。

## Project

AAG Platformization Pilot (`aag-platformization`)

`references/01-principles/platformization-standard.md` の **Pilot Application**。Standard が articulate する 8 軸 (Authority / Derivation / Contract / Binding / Generated / Facade / Policy / Gate) を AAG に最初に適用 + 実バグ修復。

## Supreme principle (唯一の禁則)

「あるべき」で終わらさず observable に機能させる (`references/01-principles/aag/strategy.md` §2.1「抽象化過剰」AI 弱点対策)。articulation without functioning は本 program 最大の violation。

## 本 program scope

| 含む | 含まない |
|---|---|
| AAG を 8 軸 articulate complete (Phase 1) | 横展開 (docs / app / health 等) — post-Pilot、別 program |
| 実バグ 3 件修復 (merge policy 揺れ / bootstrap 破綻 / 三重定義) | アプリ業務ロジック (gross-profit / sales / forecast 等) の意味変更 |
| AI navigation drawer 追加 (rules-by-path / rule-detail 等) | 既存 9 integrity guard / 12 AAG-REQ baseline 緩和 |
| AI simulation で機能 verify (Phase 2) | calendar-time observation (`AAG-REQ-NO-DATE-RITUAL` 違反) |
| Standard と同 lens で記述 | 新 AAG doc 増設 (gap fill は既存 doc 拡張) |

## Pilot 完了 criterion

`plan.md` §2 参照:

1. AAG が Standard 8 軸 articulate complete
2. 実バグ 3 件修復済
3. AI simulation で F1〜F5 verify
4. DA entry 履歴 landing (DA-α-001〜005)
5. System Inventory に AAG "Pilot complete" entry

## 二段 lens

| 段 | scope | 軸 | location |
|---|---|---|---|
| **subsystem** | subsystem 全体構造 | 8 軸 (Authority / Derivation / Contract / Binding / Generated / Facade / Policy / Gate) | `references/01-principles/platformization-standard.md` §2 |
| **component** | 各 component の design property | 5 軸 (製本 / 依存方向 / 意味 / 責務 / 境界) | 既存 5 doc (`aag/source-of-truth.md` / `aag/architecture.md` / `aag/meta.md` / `aag/strategy.md` §1.1.3 / `aag/layer-map.md`) |

両者は補完: subsystem が 8 軸の component を持ち、各 component が 5 軸を articulate。

## 機能 (F1〜F5)

| # | 機能 | 観測 |
|---|---|---|
| F1 | 必要 context だけ surface | tool call precision |
| F2 | 意味のある info に素早く reach | tool call 数 / time-to-context |
| F3 | doc / 実装 / rule drift 機械検出 | guard hard fail Y/N |
| F4 | session 間で判断継承 (re-derive 不要) | DA entry re-build 必要性 |
| F5 | 全 deliverable が 5 軸 + 8 軸で grounded | articulation 存在 + 整合 |

## 判断モデル

- AI-driven judgement、人間承認は最終 archive 1 点のみ
- 各判断は `decision-audit.md` に DA entry (5 軸 articulate + commit lineage + 振り返り観測点)
- judgementCommit / preJudgementCommit + annotated tag で **判断単位 rollback** 経路保証

## CLAUDE.md との関係

CLAUDE.md は「このレポでは AAG を利用する」を articulate する meta-instruction (= AAG capability/limit articulate)。**AAG 入口 ではない**。AAG 入口 = `aag/` + `references/01-principles/aag/`。本 program で CLAUDE.md は触らない。

## Read Order

1. 本ファイル
2. `HANDOFF.md` (現在地・次にやること)
3. `plan.md` (3 Phase + 1 Gate + 8 軸 deliverable)
4. `decision-audit.md` (DA template + 判断履歴)
5. `checklist.md` (機械的完了判定)
6. 必要に応じて `references/01-principles/platformization-standard.md` (上位 Standard) / `references/01-principles/aag/*` (AAG 既存 articulate)
