# discovery-log — pure-calculation-reorg

> **役割**: implementation 中に発見した **scope 外** / **改善必要** / **詳細調査要** 事項の蓄積 artifact (= DA-β-003 で institute)。
> AAG 4 系統 lens (= ログ / メトリクス / 手順書 / チェックリスト) に直交する **5 系統目: 発見蓄積**。
>
> **scope 含む**: 本 project の plan 範囲外で発見した事項 / 改善 candidate / 詳細調査要事項。
> **scope 外 (= 別 doc)**: 本 project plan 範囲内事項 (= `checklist.md` / `plan.md`)、判断履歴 (= `decision-audit.md`)。
>
> 機械検証: `projectizationPolicyGuard` PZ-14 (= file 存在 + schema 軽量 check)。
> entry 内容妥当性は AI session 責任 (= 機械検証 scope 外、AAG philosophy「製本されないものを guard 化しない」と整合)。
>
> 詳細: `references/05-aag-interface/operations/project-checklist-governance.md` §3.3 + DA-β-003。

## priority

| priority | 性質 | 解消 timing |
|---|---|---|
| **P1 (high)** | 本 program 内吸収可能 | 該当 phase で batch 解消 |
| **P2 (med)** | post-archive 別 program candidate | archive 後、別 program 起動判断 (= user) |
| **P3 (low)** | 揮発 / 不要判定可 | 棚卸 phase で削除判定 |

## 発見済 entry

> entry template は `projects/_template/discovery-log.md` を参照。

### 2026-05-04 P2: ANA-005 (correlation) candidate / current 二重 entry articulation 不整合 (= 真昇格 scope の articulation gap)

- **場所**: `app/src/test/calculationCanonRegistry.ts` の `candidate/algorithms/correlation.ts` (line 498) + `algorithms/correlation.ts` (line 622)
- **現状**: ANA-003/004/007/009 と同様、ANA-005 にも candidate / current 両 entry が存在 (= migration plan §5.1 で 5 件 candidate migration track と articulate)。にもかかわらず `generateEvidencePack ANA-005` は `track: current-quality` と判定。**evidence pack generator の resolution logic が contractId 衝突時の選択を articulate していない**ため、運用上 ANA-005 が Phase 8 ceremony 対象から脱落
- **改善 / 調査内容**:
  1. evidence pack generator の resolution logic articulate (= contractId 衝突時に candidate path を優先する選択を明示)
  2. ANA-005 の真の Phase 8 ceremony 対象性判定 (= 真昇格対象なら 4 → 5 件に scope 拡大、既 current なら registry / migration plan articulation を update)
  3. 他 contract で同種衝突の有無を確認 (= 全 BIZ-XXX / ANA-XXX で candidate / current 両 entry 検査)
- **trigger**: 2026-05-04 Phase 8 entry articulate 中に発見 (= AI scaffold 4 件確定で ANA-005 が脱落)
- **解消 timing**: Phase 8 ANA-009 ceremony 完遂後、ANA-005 を 5 件目に追加するか別 phase に articulate するかを user 判断
- **影響**: evidence pack generator + registry articulation の整合性 (= 中規模)

### 2026-05-04 P1: ANA-007 Zod 契約未追加 + fallbackPolicy=none の二重 risk (= Phase 8 entry 前の決定事項)

- **場所**: `app/src/test/calculationCanonRegistry.ts` の `dowGapAnalysis.ts` entry (`zodAdded: false`, `fallbackPolicy: 'none'`)
- **現状**: ANA-007 は他 3 件 (003/004/009) と異なり Zod 契約未追加 + automatic fallback path なし。promote 前提として 2 つの判断必要:
  1. Zod 追加するか / shape 一致厳格運用で代替するか
  2. fallbackPolicy を `'current'` に articulate update するか / `'none'` のまま bridge mode 切替のみで rollback するか
- **改善 / 調査内容**: `phase-8/proposals/ANA-007-dowGapAnalysis.md` §「⚠️ 本 candidate 固有の risk articulation」で articulate 済。observation 開始前に user 判断が必要
- **trigger**: 2026-05-04 Phase 8 entry articulate 中に発見
- **解消 timing**: Phase 8 ANA-007 ceremony 着手前 (= 推奨順序で最後)
- **影響**: ANA-007 promote ceremony の安全性 evaluation (= 単件 scope)

## 別 program candidate (= P2、post-archive)

(現在: 該当なし、Phase 8 完遂後に再評価)

## status

- 2026-05-03 (DA-β-003 institute): 本 discovery-log landing (= retroactive bootstrap、本 project の既存 progress 中で発見した事項は追記対象)
- 2026-05-04 (Phase 8 entry articulate): P1 (ANA-007 二重 risk) + P2 (ANA-005 articulation gap) を articulate
