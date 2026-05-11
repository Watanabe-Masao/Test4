# HANDOFF — aag-governance-ratchet-down

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

**umbrella archive 完遂** (= 2026-05-11、Archive v2 8 件目)。Sub-1/2/3 全 archived + Sub-4 formally
cancelled で closure 成立。本 HANDOFF + plan + checklist + sub-project-map は本 commit を最後に
ARCHIVE.md + archive.manifest.json に圧縮、active 期 8 file は削除予定。

**前駆 program**: `projects/completed/aag-structural-control-plane/` (= 2026-05-10 archive、
AAG 6.0 → 6.1)。aag-scp で **articulate 完成** した advisory infrastructure を本 program で
**ratchet-down 実装に converted**。

### Sub-program 進捗

| ID | sub-program | 完遂状態 | archive |
|---|---|---|---|
| Sub-1 | aag-coverage-rule-expansion | **archived 2026-05-11** (= unmanaged 86.2% → 0%、84 rules) | `projects/completed/aag-coverage-rule-expansion/` (= Archive v2 5 件目) |
| Sub-2 | aag-failure-pattern-guards | **archived 2026-05-11** (= 6/6 guard candidates → guardrail-shadow stage) | `projects/completed/aag-failure-pattern-guards/` (= Archive v2 6 件目) |
| Sub-3 | aag-disposition-execution | **archived 2026-05-11** (= 19/19 disposition execution) | `projects/completed/aag-disposition-execution/` (= Archive v2 7 件目) |
| Sub-4 | aag-failure-pattern-maturity | **cancelled 2026-05-11** (= user 判断、observation phase に戻す) | (not-spawned、cancellation articulate のみで closure、再起動 trigger は sub-project-map §Sub-4 cancel 再起動 trigger) |

### Sub-4 cancellation rationale

user 判断 (= 2026-05-11)「Sub-4 を formally cancel + umbrella archive」 + 「shadow stage で観測
期間継続、advisory 昇格は今 spawn しない」。`aag-decision-traceability` 2026-05-01 cancellation
precedent (= speculative concept への先回り program 化を回避、state-based trigger で再起動 articulate)
整合。再起動 trigger は `sub-project-map.md §Sub-4 cancel 再起動 trigger` で 3 条件 articulate
(= 1 件でも advisory 昇格 / 新 pattern auto-promote + advisory 必要化 / taxonomy review window
例外承認)。

## 2. 次にやること

詳細は `checklist.md` + `plan.md` を参照。優先順位を 1-2 段で要約する。

### 高優先 (= Sub-3 全件完遂、本 session で sub-PR 3-5 landed)

- **Sub-3 sub-PR 3** = ar-rule-audit move + 18 inbound updates (= **完遂、commit f23062a**)
- **Sub-3 sub-PR 4** = split 3 件 execution (= **完遂、commit 87ca39e**)
  - engine-maturity-matrix.md: 旧 doc は ステージ定義 / 状態 / TODO 混在 → stable definitions のみ保持 (Aggregate Boundary + Bridge Infrastructure 含む)
  - engine-promotion-matrix.md: per-engine narrative 削除、current state summary + 更新ルール のみ保持
  - features-migration-status.md: 完遂記録 + Widget Ownership は code 正本への pointer + 別 Epic 候補 inventory
- **Sub-3 sub-PR 5** = generated-register 1 件 (= **完遂、本 sub-PR で landed**)
  - architecture-state-snapshot.md → .generated.md rename (= AR-DOC-NAMING-GENERATED 整合)
  - producer (architectureStateAudit.test.ts L414) write target を `.generated.md` に update
  - inbound (reading-decisions.yaml + doc-registry.json) path 整合

### 中優先 (= Sub-2 + Sub-3 完遂後、user 判断 gate)

- **Sub-2 guardrail-advisory 昇格判断** (= 6 guards の現 shadow stage → advisory stage)
- **Sub-4 spawn 判断** (= taxonomy review window 経由、user judgment required)

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

各 sub-program は **独立 spawn 可能** (= 順序依存なし、parallel 進行可、本 session で 3 sub-program
parallel 実装 = 実証済)。ただし Sub-2 (guard 化) が最 leverage 高、Sub-1 (coverage 拡張) は Sub-2 と
並走可、Sub-3 (disposition execution) と Sub-4 (maturity) は順序自由。

### 3.5. Separate Program candidate の侵入禁止

Phase 8a/8b/8c (= Obligation Migration) と Phase 10 (= Runner Parity Contract) は
aag-scp plan.md §Separate Program candidate で reposteward 系統への移譲が articulate 済。
本 program で着手しない (= scope 違い、reposteward 重複 risk)。

### 3.6. pre-existing time-based reviewPolicy stale (= 副次 fix experience)

pure-calculation-reorg/aag/execution-overlay.ts に reviewPolicy.lastReviewedAt が articulate されており、
cadenceDays 経過で overdue になる。本 session で Sub-3 sub-PR 2 着地時に 4 件 overdue (= cadence 30、
2026-04-10 + 30 = 2026-05-10、現在 2026-05-11 で 1 日超過) が hard gate fail を trigger、bump で unblock。

**注意**: pure-calc-reorg は別 project scope (= 本 umbrella 配下外)、bump は最小限 scope crossover。
今後 file 変更で hard gate fail trigger があった場合、まず reviewPolicy stale を疑う。

### 3.7. ar-rule-audit move の inbound complexity (= Sub-3 sub-PR 3 で完遂)

Sub-3 sub-PR 2 で当初 ar-rule-audit move を含めようとしたが、inbound 18 件 (= 5 guards + display-rule-registry +
principles.json + 各種 generated artifacts) のため deferred → **Sub-3 sub-PR 3 で実 execution 済**:
- git mv references/04-tracking/ar-rule-audit.md → references/03-implementation/ar-rule-binding-protocol.md
- guards の `@see` comment update (= 5 files: canonicalDocBackLinkGuard / canonicalDocRefIntegrityGuard / selfHostingGuard / semanticArticulationQualityGuard / statusIntegrityGuard)
- canonical-doc references (= display-rule-registry / principles.json / doc-registry.json / document-reading-decisions.yaml / document-failure-taxonomy.yaml)
- generated artifacts は docs:generate で自動更新

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| `AI_CONTEXT.md` | project 意味空間の入口 (= why / scope / read order) |
| `plan.md` | 不可侵原則 7 件 + Sub-program-based 運用 |
| `checklist.md` | sub-program spawn tracking (= 本 PR で sub-program 3 spawn checkbox flip 済) |
| `decision-audit.md` | ADR-RAT-* lineage template |
| `discovery-log.md` | scope 外発見の蓄積 inventory |
| `projectization.md` | AAG-COA 判定 (= Level 4 Umbrella / governance-hardening / requiresHumanApproval=true) |
| `sub-project-map.md` | 4 sub-program 一覧と依存関係 articulate (= Sub-1/2/3 active、Sub-4 not-spawned) |
| `projects/completed/aag-structural-control-plane/HANDOFF.md` | 前駆 program (= advisory infrastructure articulate 完成、本 program input) |

### 本 session で完遂した sub-programs (= 詳細は各 sub-program HANDOFF / commit message)

- **`projects/completed/aag-coverage-rule-expansion/`**: artifact-coverage rules 17 → 84 (= 67 new rules)、unmanaged 86.2% → 0%
- **`projects/completed/aag-failure-pattern-guards/`**: 6 guards 全件 guardrail-shadow stage 着地 (= docDuplicateResponsibilityGuard + docFailurePatternBaselineGuard 5 patterns)
- **`projects/completed/aag-disposition-execution/`**: 19/19 disposition execution 完遂 (= archive 3 + move 12 + split 3 + generated-register 1)

### 前駆 program landed deliverables (= 本 program の input)

| Wave / Phase | Deliverable (= aag-scp で landed) |
|---|---|
| Wave 2 / Phase 2.5 sub-PR 9 | document-failure-taxonomy.yaml (= 11 patterns、6 guard candidates) |
| Wave 3 / Phase 6 | ai-doc-template-rules.yaml (= 20 kinds) + post-write checker (= advisory) |
| Wave 3 / Phase 7 | required-docs-matrix.yaml (= 5 rules、46 targets、0 missing baseline) |
| Wave 3 / Phase 9 | artifact-coverage.yaml (= 17 rules、3704 tracked、86.2% unmanaged baseline) |
| Wave 2 Reading Pass | document-reading-decisions.yaml (= 398 docs、disposition articulate) |

## 5. session 引き継ぎ checklist

次 session 開始時に確認:

1. [ ] `git log --oneline -5` で最新 commits 確認 (= 本 sync 時点で feac2b9 + 引き継ぎ commit)
2. [ ] `cd app && npm run docs:generate` で current health 確認 (= Hard Gate PASS が baseline)
3. [ ] `references/04-tracking/generated/project-health.generated.md` で 4 active project の状態確認
4. [ ] `projects/active/aag-governance-ratchet-down/sub-project-map.md` で sub-program status 確認
5. [x] Sub-1 + Sub-2 + Sub-3 全 archived (= Archive v2 5/6/7 件目、2026-05-11 user 代行 delegation で transition)
6. [ ] **本 umbrella の archive 判断** (= Sub-4 deferred 扱いの user 判断 gate、本 HANDOFF §1 の option (a)/(b)/(c))
7. [ ] Sub-2 guardrail-advisory 昇格判断は本 session scope 外、別 user 判断 gate
