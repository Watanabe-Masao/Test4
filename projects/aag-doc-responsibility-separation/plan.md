# plan — aag-doc-responsibility-separation

## 不可侵原則

1. **doc を split / move する場合、inbound 参照を全て co-update する** —
   guard 実装 / base-rules.ts `canonicalDocRef` / CLAUDE.md / 他 archived project plan の
   参照が未更新のまま残ると AAG の自己整合性を壊す。docs:generate + 関連 guard 全 PASS が
   完了条件。
2. **`aag/meta.md` → `aag/audit.md` split は本 project では判断のみ、実施しない** —
   Phase 5 は judgment gate。実施は escalate (Level 3 化) or 別 project に逃がす
   (Phase 0 判断 gate と同様の先回り実装禁止原則)。
3. **archived doc に live future work を書き戻さない** —
   `project-checklist-governance.md` §0 鉄則。Phase 2 で rescue 済の Project E candidate
   を archived row に future-follow-up note として書き戻さない。

## Phase 構造

### Phase 1: inventory

AAG 関連 doc 6 件 (meta.md / README.md / layer-map.md / ar-rule-audit.md /
open-issues.md / archived `aag-bidirectional-integrity` HANDOFF) の責務を分類し、
各 doc 内に「正本 (protocol)」「履歴」「status」「future work」「historical note」が
混在しているかを判定する。
完了条件: HANDOFF.md §3 に inventory 結果が articulate される。

### Phase 2: Project E rescue

archived AAG doc 内の "Project E candidate (DecisionTrace + AI utilization、9 insight 統合)"
を `projects/aag-decision-traceability/` として独立 active project に切り出す。
完了条件: `aag-decision-traceability` project が active 索引に登録され、archived row から
future-follow-up note が削除されている。

### Phase 3: ar-rule-audit split

`references/02-status/ar-rule-audit.md` を protocol (永続) と status (履歴 + future task) に
分離する。
- protocol → `references/03-guides/ar-rule-binding-quality-protocol.md` (新規 Create、
  §1〜§2 + §5 を移送)
- status → `references/02-status/ar-rule-audit.md` (残置、§3〜§4 + §6 = batch 履歴 +
  Discovery Review debt + selfHostingGuard 状態)
完了条件: 全 inbound 参照が co-update され、test:guards 全 PASS、docs:generate PASS。

### Phase 4: stale status refresh

`aag/README.md` / `aag/layer-map.md` の予定表現を実績表現に同期する。
- README: display-rule-registry.md `Project C 着手後` → archived、旧 AAG doc archive
  候補 → archive 完了
- layer-map: Phase 8 MVP meta-guard `Phase 4 で landing 予定` → 完遂、selfHostingGuard
  follow-up → 完遂

### Phase 5: meta.md → audit.md split 判断

`aag/meta.md` の audit framework / 達成判定 / orphan baseline を `aag/audit.md` に切り出すか、
meta.md に保持するかを人間が判断する。判断のみ、実施は scope 外 (不可侵原則 2)。
完了条件: 判断結果 (split / defer / scope out) が HANDOFF.md に articulate され、escalate
or defer の方針が確定。

## やってはいけないこと

- doc split / move を inbound 参照未更新で commit する → 不可侵原則 1 違反
- Phase 5 で meta.md / audit.md を実分割する → 不可侵原則 2 違反 (判断 gate のみ)
- Project E candidate の future-follow-up note を archived row に書き戻す → 不可侵原則 3 違反
- Phase 3 split で protocol / status の境界を曖昧にする (例: §5 meta-guard 運用方針を両方に
  copy する) → §0 鉄則違反 (重複 articulation の生成)

## 関連実装

| パス | 役割 |
|---|---|
| `references/01-principles/aag/meta.md` | Phase 5 split 判断対象 |
| `references/01-principles/aag/README.md` | Phase 4 refresh 対象 |
| `references/01-principles/aag/layer-map.md` | Phase 4 refresh 対象 |
| `references/02-status/ar-rule-audit.md` | Phase 3 split 対象 |
| `projects/aag-decision-traceability/` | Phase 2 で spawn 済の sibling project |
| `projects/completed/aag-bidirectional-integrity/` | parent framework (完遂済) |
| `app/src/test/guards/semanticArticulationQualityGuard.test.ts` | Phase 3 で comment / docRef 更新が必要な可能性 |
| `app-domain/gross-profit/rule-catalog/base-rules.ts` | Phase 3 で `canonicalDocRef` 更新が必要な可能性 |
