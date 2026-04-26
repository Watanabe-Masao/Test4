# plan — aag-temporal-governance-hardening（SP-D）

> umbrella `architecture-debt-recovery` の `inquiry/15 §Lane D` の詳細実行版。

## 不可侵原則

1. umbrella plan.md §2 不可侵原則 16 項を全て継承
2. 1 PR = 1 ADR step、6 ADR × 3-4 step = ~19 PR
3. BC-6（reviewPolicy required）と BC-7（allowlist metadata required）は別 PR、merge 順序は PR3（type 昇格）以降に連続禁止（間に Wave 別作業を挟むか、時間を空ける）
4. D-003 / D-004 は Wave 2 / 3 まで着手禁止（依存違反）
5. ratchet-down baseline を増加方向に戻さない（原則違反）

## 6 ADR 実行計画

### ADR-D-001. reviewPolicy required 昇格 + 92 件 bulk（BC-6）

| step | 内容 | 着手 Wave |
|---|---|---|
| PR1 | `reviewPolicyRequiredGuard` baseline=92 で追加（allowlist に現状 92 件登録） | 1 |
| PR2 | 92 rule に reviewPolicy (owner / lastReviewedAt / reviewCadenceDays) を bulk 追記 | 1 |
| PR3 | `RuleOperationalState.reviewPolicy` を type 定義で required 昇格（BC-6）、baseline=0 | 1 |
| PR4 | expired rule を docs:check で fail させる lifecycle 監視追加 | 1 |

### ADR-D-002. allowlist metadata required（BC-7）

| step | 内容 | 着手 Wave |
|---|---|---|
| PR1 | `allowlistMetadataGuard` baseline=existing で追加 | 1 |
| PR2 | 既存 allowlist entry に `ruleId` / `createdAt` / `reviewPolicy` / `expiresAt` metadata を bulk 追記 | 1 |
| PR3 | allowlist entry type を required 化（BC-7）、baseline=0 | 1 |
| PR4 | `expiresAt` 超過 entry を fail させる | 1 |

### ADR-D-003. G8 に P20（useMemo 内行数）+ P21（widget 直接子数）追加

| step | 内容 | 着手 Wave |
|---|---|---|
| PR1 | `responsibilitySeparationGuard` に P20 baseline=69（inquiry/05 最大値）+ P21 baseline=current max で追加 | **3（SP-B completed 後）** |
| PR2-3 | SP-B の ADR-B-001〜004 完了に応じて baseline 段階削減 | 3 |
| PR4 | baseline が各上限値（P20=20 / P21=5）到達、fail hard | 3 |

### ADR-D-004. @deprecated metadata 必須

| step | 内容 | 着手 Wave |
|---|---|---|
| PR1 | `deprecatedMetadataGuard` baseline=current @deprecated count で追加 | **2（SP-C ADR-C-004 完了後）** |
| PR2 | 既存 @deprecated に metadata bulk 追記 | 2 |
| PR3 | baseline=0 fixed mode | 2 |
| PR4 | @expiresAt 超過を docs:check で fail | 2 |

### ADR-D-005. generated remediation.{md,json}

| step | 内容 | 着手 Wave |
|---|---|---|
| PR1 | `tools/architecture-health/src/collectors/` に新 collector 実装 + initial generation | 1 |
| PR2 | project-health.json から参照追加 | 1 |
| PR3 | docs:check で drift 検出組み込み | 1 |

（3 step、PR4 不要）

### ADR-D-006. projectDocConsistencyGuard

| step | 内容 | 着手 Wave |
|---|---|---|
| PR1 | `projectDocConsistencyGuard.test.ts` 実装: HANDOFF 現在地 vs checklist 最大完了 Phase の整合 | 1 |
| PR2 | config/project.json.status vs derivedStatus 説明可能性 check 追加 | 1 |
| PR3 | Phase 着手前に前 Phase review checkbox 残存検出 追加 | 1 |
| PR4 | required inquiry file 一覧との突合 check 追加 | 1 |

## 依存関係

Wave 1 内部:
- D-001 / D-002 / D-005 / D-006 は互いに独立、並行 PR1 着手可
- D-001 PR3 と D-002 PR3（両方とも BC）は別 PR で merge 間を空ける

Wave 2:
- D-004: SP-C ADR-C-004 (barrel metadata) と metadata pattern を統一する必要があり、SP-C completion 後に着手

Wave 3:
- D-003: SP-B の Lane B 全 ADR 完了後に baseline 削減原資が確定

## 禁止事項

1. D-003 を Wave 1 / 2 で着手
2. D-004 を Wave 1 で着手
3. BC-6 と BC-7 を 1 PR に混ぜる
4. metadata 付記せずに新規 allowlist / @deprecated を追加
5. baseline を増加方向に戻す

## 参照

- umbrella: `projects/architecture-debt-recovery/plan.md`
- umbrella inquiry: `inquiry/15 §Lane D` / `inquiry/16 §BC-6/BC-7` / `inquiry/14 §R-6`
- 運用規約: `references/03-guides/project-checklist-governance.md`
- architecture-rule system: `references/03-guides/architecture-rule-system.md`
