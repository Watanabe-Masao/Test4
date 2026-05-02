# AI_CONTEXT — aag-platformization

> 役割: project 意味空間の入口。
> 現在地・次の作業・ハマりポイントは `HANDOFF.md`。

## Project

AAG Platformization Program (`aag-platformization`)

## Supreme principle (唯一の禁則)

**AAG を「あるべき」で終わらさず、observable に機能させる**。
articulation without functioning は本 program の最大 violation (`references/01-principles/aag/strategy.md` §2.1「抽象化の過剰」AI 本質的弱点)。

## 本フェーズの位置づけ

「Go 移行を前に進める」ではなく、**「Go 実装を前に進める条件を固定する」**。Go 移行を止める必要はないが、TS の揺れ (merge policy 等) を未解決のまま Go に持ち込むと **二度手間**。条件を固定してから Go 実装に入る。

## Go 実装条件 (C1-C4)

`plan.md` §3。Phase 9 (Go 実装) の前提:

| # | 条件 | 該当 Phase |
|---|---|---|
| C1 | merge policy が一本化されている | Phase 2 |
| C2 | merged artifact が生成されている | Phase 3 |
| C3 | AagResponse / detector contract が独立 | Phase 4 |
| C4 | RuleBinding 境界が guard 化されている | Phase 5 |

4 件全 met → Phase 9 着手可。1 つでも未達なら block。

## Purpose

AAG は AI のための **context provision control system**。`strategy.md` §3.4 で既に「AI が判断基準を理解し、意図に沿った変更を行うためのインターフェース」と articulate 済。本 program は既存 AAG (12/12 `AAG-REQ-*` 達成 + 9 integrity guard) を **触らず**、(1) **Go 実装条件 C1-C4 を固定** (Phase 1-5) + (2) AI navigation 強化 (Phase 6) + (3) 既存負債削減 (Phase 7) + (4) verification (Phase 8) + (5) Go 実装 conditional (Phase 9) + (6) archive (Phase 10) を行う。新概念は導入しない。形式進化のみ。

## 守るべき functioning (F1〜F7)

`plan.md` §2 参照。簡潔には:

- F1: 必要 context だけ surface
- F2: 意味のある info に素早く reach
- F3: doc / 実装 / rule drift が機械検出
- F4: session 間で判断継承 (re-derive 不要)
- F5: 各 deliverable が 5 軸で grounded
- F6: 新概念追加が 5 軸 review を経る
- F7: 負債 ratchet-down (滞留しない)

## 5 軸 design articulation (lens)

全 deliverable / 既存 audit / restructure 判断が articulate する 5 軸:

- **製本** (canonical / derived) — `aag/source-of-truth.md`
- **依存方向** (一方向 acyclic) — `aag/architecture.md` + `AAG-REQ-LAYER-SEPARATION`
- **意味** (答える 1 問い) — `aag/meta.md`
- **責務** (single responsibility) — `aag/strategy.md` §1.1.3 (C1)
- **境界** (内 / 外) — `aag/layer-map.md` + `aag/core/principles/core-boundary-policy.md`

→ 5 軸は新概念ではなく既存 AAG articulation。本 program はそれを **lens として運用** する。

## Read Order

1. 本ファイル (project 文脈)
2. `HANDOFF.md` (現在地・次にやること)
3. `plan.md` (不可侵原則 + F1-F7 + Phase 構造 + 5 軸 lens)
4. `decision-audit.md` (判断履歴と振り返り)
5. `checklist.md` (機械的完了判定の input)
6. 必要に応じて `references/01-principles/aag/*` / `aag/core/*`

## Scope

**含む**:
- 派生 artifact 追加 (rules-by-path / rule-detail / rule-index / rule-by-topic)
- sync guard 追加 (artifact ↔ canonical drift 検出)
- 5 軸 articulation framework operational 化
- 既存 AAG corpus + 本 project の 5 軸 audit
- AI simulation による機能 verification

**含まない**:
- アプリ業務ロジック (gross-profit / sales / forecast 等) の意味変更
- 既存 9 integrity guard / 12 AAG-REQ の baseline 緩和
- `base-rules.ts` (10,805 行) の TS authoring を JSON 化
- 新 doc を増やす (gap fill は既存 doc 拡張、`strategy.md` §1.1「正本を増やさない」)
- Rust の本 program runtime 使用 (本体 WASM/Rust と境界混線、Go / Python / combo OK)
- 後続 cutover の本実装 (本 program は前提整備まで)

## 判断モデル

- AI-driven judgement、人間承認は archive 1 点のみ (`plan.md` 不可侵原則 6)
- 各判断は `decision-audit.md` に DA entry (判断時 + 5 軸 articulate + commit lineage + 振り返り観測点) で landing
- judgementCommit / preJudgementCommit + annotated tag で **判断単位 rollback** 経路保証
- 判定が "間違い" でも program 失敗ではなく **mechanism が機能した記録**

## 関連文書

| 文書 | 役割 |
|---|---|
| `references/03-guides/project-checklist-governance.md` | project lifecycle 規約 |
| `references/03-guides/projectization-policy.md` | AAG-COA Level 3 判定根拠 |
| `references/01-principles/aag/strategy.md` §3.4 / §2.1 | 本 program の supreme principle 上位根拠 |
| `references/01-principles/aag/source-of-truth.md` | 5 軸 「製本」articulate 場所 |
| `references/01-principles/aag/architecture.md` | 5 軸 「依存方向」articulate 場所 |
| `references/01-principles/aag/meta.md` | 5 軸 「意味」(AAG-REQ-*) articulate 場所 |
| `references/01-principles/aag/layer-map.md` | 5 軸 「境界」articulate 場所 |
| `aag/core/AAG_CORE_INDEX.md` | AAG Core 入口 |
| `aag/core/principles/core-boundary-policy.md` | Core 境界 5 原則 |
