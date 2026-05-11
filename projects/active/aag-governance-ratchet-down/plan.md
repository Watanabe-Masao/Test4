# plan — aag-governance-ratchet-down

## 不可侵原則

1. **新 articulate を加えない** — aag-structural-control-plane で完成した articulate を ratchet-down で converted する program。新 governance pattern / 新 schema / 新 Reading Pass batch の追加は scope 外
2. **即 Gate 化禁止** — AAG-SCP-DOC-LEARNING-002 整合、各 guard 昇格は 5 段階 maturity progression (= observed → pattern-articulated → guardrail-candidate-emitted → guardrail-shadow → guardrail-advisory) を経る。user 判断 gate を含む
3. **AI 単独 vocabulary 改変禁止** — AR-TAXONOMY-AI-VOCABULARY-BINDING 整合、Failure Loop maturity progression (= Sub-program 4) は taxonomy review window を経由
4. **Sub-program 独立性** — 4 sub-program は順序依存なし、parallel 進行可能 (= Sub-2 が最 leverage 高、Sub-1 と並走可、Sub-3+4 は順序自由)
5. **Separate Program candidate 不侵食** — Phase 8a/8b/8c + Phase 10 は reposteward 系統に移譲 articulate 済、本 program で着手しない
6. **app/src/ 配下 不変** — 業務 logic / domain calculations / readModels / presentation は touch しない (= app/src/test/guards/ の新 guard test 追加のみが exception)
7. **既存 advisory checker 継続運用** — aag-scp で landing した checker (= post-write checker / required-docs checker / coverage checker) は archive 後も advisory として継続。本 program は **追加 hard gate** を articulate するのみ (= 既存 advisory mechanism は不変)

## Phase 構造

本 umbrella project は **Phase ベースではなく Sub-program ベース** で運用 (= taxonomy-v2 と同 articulate)。
各 sub-program は spawn 後に独自 Phase 構造を articulate (= projects/_template/ から個別 bootstrap)。

### Phase 0: Bootstrap (= 本 PR、本 commit で完了予定)

- 8 ファイル一式 + sub-project-map.md landing
- AAG-COA Level 4 (Umbrella) 判定 articulate
- 4 sub-program articulate (= AI_CONTEXT / HANDOFF / sub-project-map で reference)
- 不可侵原則 7 件 articulate
- ADR-RAT-001〜005 initial articulate (= sub-program spawn 順序 + maturity progression 規律 + Separate Program 不侵食 等)

### Phase 1〜N: Sub-program spawn (= 各 sub-program の独立 program 化、user 判断で起動)

- **Sub-program 1**: aag-coverage-rule-expansion (C1) — **archived 2026-05-11** (= Archive v2 5 件目)
- **Sub-program 2**: aag-failure-pattern-guards (C2 + C3) — 最 leverage 高、**archived 2026-05-11** (= Archive v2 6 件目)
- **Sub-program 3**: aag-disposition-execution (C4) — **archived 2026-05-11** (= Archive v2 7 件目)
- **Sub-program 4**: aag-failure-pattern-maturity (C5) — **cancelled 2026-05-11** (= user 判断、observation phase に戻す、再起動 trigger は `sub-project-map.md §Sub-4 cancel 再起動 trigger` で state-based articulate)

詳細: `sub-project-map.md`

### Phase 完遂: 本 umbrella archive (= 2026-05-11)

3 sub-program archive 完遂 + Sub-4 cancellation articulate + 本 umbrella final review (= AI 自己
レビュー + user 承認) で本 umbrella も archive。`aag-decision-traceability` 2026-05-01 cancellation
precedent (= sub-program scope out 判断は state-based trigger で再起動 articulate) 整合。

## やってはいけないこと (= nonGoals 整合)

- 新 governance pattern の articulate (= aag-scp で完了済)
- Reading Pass の new batch (= 100% 完遂済)
- 新 schema 追加 (= aag-scp で 4 schema landing 済)
- AI 単独で advisory を hard gate に直接昇格 (= 5 段階 maturity progression 違反)
- AI 単独で taxonomy maturity 昇格 (= AR-TAXONOMY-AI-VOCABULARY-BINDING 違反)
- Phase 8a/8b/8c / Phase 10 への着手 (= reposteward 系統移譲)
- app/src/ business logic touch
- Sub-program の dependency 順序強制 (= 独立 spawn を articulate)
