# HANDOFF — aag-temporal-governance-hardening（SP-D）

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

**Phase 6 Wave 1 完遂 (4 ADR / Phase 1-4 全 [x])。status: `active` / parent: `architecture-debt-recovery`。Wave 2-3 は依存 sub-project 完了待ち。**

本 project は umbrella `architecture-debt-recovery` の **Lane D** sub-project として、governance の時間 / 構造 / 存在 3 軸の強化を一括で行う。Wave 1 で 4 ADR（D-001/002/005/006）先行 完了、Wave 2-3 で残 2 ADR（D-003/004）を依存解消後に実施予定。

### spawn 時 landed

- `config/project.json` / `AI_CONTEXT.md` / `HANDOFF.md`（本 file）/ `plan.md` / `checklist.md` / `aag/execution-overlay.ts`

### Wave 1 landed (Phase 1-4 全 [x]、checklist.md 参照)

- **Phase 1 ADR-D-006**: `projectDocConsistencyGuard` 4 step 完遂（HANDOFF/checklist 整合 / status vs derivedStatus / Phase 着手前 review checkbox / required inquiry 突合）
- **Phase 2 ADR-D-005**: remediation collector + project-health 連携 + docs:check drift 検出 (3 step)
- **Phase 3 ADR-D-001**: `reviewPolicyRequiredGuard` baseline 139→0 + BC-6 (RuleOperationalState.reviewPolicy required 昇格) + expired rule hard fail (4 step)
- **Phase 4 ADR-D-002**: `allowlistMetadataGuard` baseline=existing → BC-7 (ruleId/createdAt/reviewPolicy required 昇格) + expiresAt 超過 fail (4 step)

### 残タスク

- **Phase 5 ADR-D-004** (Wave 2): SP-C completed 後着手、4 PR 想定
- **Phase 6 ADR-D-003** (Wave 3): SP-B completed 後着手、3 step 想定
- **Phase 7 sub-project completion**: 全 Wave 完了後、umbrella inquiry/20 §completion テンプレ 7 step

## 2. 次にやること

### Wave 1 完遂済（参考）

1. ✅ **ADR-D-006 PR1-4**: projectDocConsistencyGuard 完成（即効性高、影響小）
2. ✅ **ADR-D-005 PR1-3**: remediation collector + drift 検出
3. ✅ **ADR-D-001 PR1-4**: reviewPolicyRequiredGuard baseline 139→0 + BC-6
4. ✅ **ADR-D-002 PR1-4**: allowlistMetadataGuard + BC-7

### Wave 2 着手（SP-C completed 後）

- **ADR-D-004**: @deprecated に @expiresAt + @sunsetCondition 必須（4 PR）

### Wave 3 着手（SP-B completed 後）

- **ADR-D-003**: G8 に P20（useMemo 内行数）+ P21（widget 直接子数）追加（3 step）

## 3. ハマりポイント

### 3.1. reviewPolicy owner 割当の決定

92 rule の `reviewPolicy.owner` は `architecture` / `implementation` / `specialist` のいずれかに振る。rule のカテゴリに応じて人間承認時に決定済み（umbrella `inquiry/15 §ADR-D-001` + Phase 5 承認）。bulk 整備 PR で一括反映。

### 3.2. BC-6 / BC-7 の breaking change 境界

BC-6 (reviewPolicy required) と BC-7 (allowlist metadata required) は**別 PR**で実施（umbrella plan.md §2 #3）。ratchet-down baseline が 0 到達した後に type required 昇格。

### 3.3. D-005 generated file の置き場

`references/02-status/generated/architecture-debt-recovery-remediation.{md,json}` は本 project active 期間中のみ生成。archive 時の扱い（`references/99-archive/` への snapshot 保存か削除か）は Phase 7 時点で再判断。

### 3.4. D-006 projectDocConsistencyGuard の初期 scope

HANDOFF と checklist の最大完了 Phase 整合 / config/project.json.status と derivedStatus の説明可能性 / phase 着手前の review checkbox 残存検出 / required inquiry file 欠落検出 の 4 check から開始。段階的に強化。

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| `AI_CONTEXT.md` | why / scope / parent / read order |
| `plan.md` | 6 ADR 実行計画 + Wave 別実施順 |
| `checklist.md` | Phase 別 completion 条件 |
| `config/project.json` | project manifest |
| `aag/execution-overlay.ts` | rule overlay（initial 空） |
| `projects/architecture-debt-recovery/inquiry/15-remediation-plan.md §Lane D` | 6 ADR 元台帳 |
| `projects/architecture-debt-recovery/inquiry/16-breaking-changes.md §BC-6 / §BC-7` | 破壊的変更 |
| `projects/architecture-debt-recovery/inquiry/14-rule-retirement-candidates.md §R-6` | Temporal Governance reformulate |
| `references/03-guides/architecture-rule-system.md` | Architecture Rule 運用 |
