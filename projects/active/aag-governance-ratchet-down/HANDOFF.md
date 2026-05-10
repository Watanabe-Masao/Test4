# HANDOFF — aag-governance-ratchet-down

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

**Phase 0 bootstrap 直後** (= 2026-05-10、aag-structural-control-plane archive 直後に spawn)。
本 PR で 8 ファイル一式 (= AI_CONTEXT / HANDOFF / plan / checklist / projectization / config /
discovery-log / decision-audit) + sub-project-map.md を landing。

**前駆 program**: `projects/completed/aag-structural-control-plane/` (= 2026-05-10 archive、
AAG 6.0 → 6.1)。aag-scp で **articulate 完成** した advisory infrastructure を本 program で
**ratchet-down 実装に converted**。

## 2. 次にやること

詳細は `checklist.md` + `plan.md` を参照。優先順位を 1-2 段で要約する。

### 高優先 (= bootstrap PR 内で完了)

- 8 ファイル一式 + sub-project-map.md landing (= 本 commit)
- `references/04-tracking/open-issues.md` の active projects 索引に本 program 追加
- `cd app && npm run docs:generate` で project-health に新 program が `derivedStatus = in_progress`
  で登録されることを確認
- `cd app && npm run test:guards` PASS 確認

### 中優先 (= 次セッション以降、各 sub-program spawn 判断)

- **Sub-program 1: aag-coverage-rule-expansion (C1)** — artifact-coverage rules 拡張で
  unmanaged 86.2% を ratchet-down (= app/src/ 等の zone を coverage に articulate)
- **Sub-program 2: aag-failure-pattern-guards (C2 + C3)** — 6 guard candidates の実 guard test
  articulate (= ratchet-down 完成、CLAUDE.md G8)。最 leverage 高 sub-program。
- **Sub-program 3: aag-disposition-execution (C4)** — Reading Pass 残 19 件 disposition の実 execution
  (= move 12 + split 3 + archive 3 + generated-register 1)
- **Sub-program 4: aag-failure-pattern-maturity (C5)** — Failure Loop maturity progression
  (= observed → guardrail-shadow → guardrail-advisory、taxonomy review window)

### 低優先 (= 本 umbrella 完遂後、別 program 候補)

- Archive v2 圧縮 PR (= aag-scp archive を圧縮形式に変換、optional optimization)
- Separate Program candidate 起票 (= Phase 8a/8b/8c / Phase 10、reposteward 系統移譲)

## 3. ハマりポイント

### 3.1. aag-scp で完成した articulate を再 articulate しない

aag-scp は **articulate 完成** で archive 済。本 program は **articulate された内容を ratchet-down**
するのみ。新 governance pattern 追加 / 新 schema 追加 / 新 Reading Pass batch は **scope 外**
(= projectization.md §4 nonGoals)。

### 3.2. 即 Gate 化禁止 (AAG-SCP-DOC-LEARNING-002 整合)

各 guard candidate の guard 化は **5 段階 maturity progression** を経る:
observed → pattern-articulated → guardrail-candidate-emitted → guardrail-shadow → guardrail-advisory

各昇格は user 判断 gate を含む。AI 単独で advisory を hard gate に直接昇格させることは禁止。
review window 経由で user 承認後にのみ昇格。

### 3.3. Sub-program 4 の review window 制約

C5 (= maturity progression) は **taxonomy review window** を経由。AI 単独で taxonomy maturity を
昇格させることは AR-TAXONOMY-AI-VOCABULARY-BINDING 違反候補。Sub-program 4 spawn 判断は user
review が必要。

### 3.4. Sub-program 独立性

各 sub-program は **独立 spawn 可能** (= 順序依存なし、parallel 進行可)。ただし Sub-2 (guard 化)
が最 leverage 高、Sub-1 (coverage 拡張) は Sub-2 と並走可、Sub-3 (disposition execution) と
Sub-4 (maturity) は順序自由。

### 3.5. Separate Program candidate の侵入禁止

Phase 8a/8b/8c (= Obligation Migration) と Phase 10 (= Runner Parity Contract) は
aag-scp plan.md §Separate Program candidate で reposteward 系統への移譲が articulate 済。
本 program で着手しない (= scope 違い、reposteward 重複 risk)。

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| `AI_CONTEXT.md` | project 意味空間の入口 (= why / scope / read order) |
| `plan.md` | 不可侵原則 + Phase 構造 + sub-program articulate |
| `checklist.md` | completion 判定の入力 (= Phase 0 のみ ticked-out) |
| `decision-audit.md` | DA-α-000 + ADR-RAT-001〜00X (本 commit で initial articulate) |
| `discovery-log.md` | scope 外発見の蓄積 inventory |
| `projectization.md` | AAG-COA 判定 (= Level 4 Umbrella / governance-hardening / requiresHumanApproval=true) |
| `sub-project-map.md` | 4 sub-program 一覧と依存関係 articulate |
| `projects/completed/aag-structural-control-plane/HANDOFF.md` | 前駆 program (= advisory infrastructure articulate 完成、本 program input) |

### 前駆 program landed deliverables (= 本 program の input)

| Wave / Phase | Deliverable (= aag-scp で landed) |
|---|---|
| Wave 2 / Phase 2.5 sub-PR 9 | document-failure-taxonomy.yaml (= 11 patterns、6 guard candidates) |
| Wave 3 / Phase 6 | ai-doc-template-rules.yaml (= 20 kinds) + post-write checker (= advisory) |
| Wave 3 / Phase 7 | required-docs-matrix.yaml (= 5 rules、46 targets、0 missing baseline) |
| Wave 3 / Phase 9 | artifact-coverage.yaml (= 17 rules、3704 tracked、86.2% unmanaged baseline) |
| Wave 2 Reading Pass | document-reading-decisions.yaml (= 398 docs、disposition articulate) |
