# projectization — aag-temporal-governance-hardening

> 役割: AAG-COA 判定結果。
> 規約: `references/03-guides/projectization-policy.md`

## 1. 判定結果

| 項目 | 値 |
|---|---|
| `projectizationLevel` | Level 3 |
| `changeType` | governance-hardening |
| `implementationScope` | `["app/src/test/guardTagRegistry.ts", "app/src/test/allowlists/", "app/src/test/guards/", "tools/architecture-health/src/collectors/"]` |
| `breakingChange` | true |
| `requiresLegacyRetirement` | false |
| `requiresGuard` | true |
| `requiresHumanApproval` | true |

## 2. 判定理由

umbrella `architecture-debt-recovery` の **Lane D sub-project**。AAG 基盤の強化
（reviewPolicy required 昇格 / allowlist metadata 必須化 / G8 拡張 / @deprecated metadata
必須化 / generated remediation / projectDocConsistencyGuard）を 6 ADR × 3-4 step = 約 19 PR
で実施する。

- **Level 3** — 複数 guard + schema + collector にまたがる architecture level の改修。
  Umbrella ではなく単一 sub-project のため Level 4 ではない
- **changeType=governance-hardening** — AAG 基盤のみの強化。本体アプリの機能には無影響
- **breakingChange=true** — BC-6 (reviewPolicy required 昇格) + BC-7 (allowlist metadata
  required 昇格) の 2 件の type 定義破壊的変更を含む
- **requiresLegacyRetirement=false** — 本 project は governance 強化のみで legacy 撤退ではない
  （parent project の AI_CONTEXT.md に明記）
- **requiresGuard=true** — 5 guard 新設（reviewPolicyRequiredGuard / allowlistMetadataGuard /
  deprecatedMetadataGuard / responsibilitySeparationGuard P20/P21 / projectDocConsistencyGuard）
- **requiresHumanApproval=true** — 破壊的 type 昇格を含むため archive 前に人間承認必須

## 3. 必要な文書

| 文書 | 必要性 | 理由 |
|---|---:|---|
| `AI_CONTEXT.md` | required | Level 3 必須 |
| `HANDOFF.md` | required | Level 3 必須 |
| `plan.md` | required | 6 ADR × 3-4 step の実行計画 |
| `checklist.md` | required | completion 判定入力 |
| `inquiry/` | forbidden | parent umbrella inquiry/ に依存（単独 inquiry は作らない） |
| `breaking-changes.md` | required | BC-6 / BC-7 の運用（umbrella inquiry/16 への pointer + local summary） |
| `legacy-retirement.md` | forbidden | requiresLegacyRetirement=false |
| `sub-project-map.md` | forbidden | 本 project 自体が sub-project。さらに spawn しない |
| guard 設計 (plan.md 内) | required | 5 guard の baseline 戦略 |
| 最終レビュー (人間承認) checkbox | required | requiresHumanApproval=true |

## 4. やらないこと (nonGoals)

- 他 Lane（SP-A / SP-B / SP-C）の item
- 本 ADR 6 件に載らない governance 強化（新規は `15a-*.md` addendum で umbrella 側承認後）
- 本体アプリ（粗利管理ツール）のコード変更
- 設計原則（A-I+Q taxonomy）の追加・変更

## 5. Escalation / De-escalation 条件

- 6 ADR を超えて governance 強化が必要になった場合 → umbrella に戻って scope 拡張承認
- 本体アプリに影響する変更が必要になった場合 → 新 sub-project を spawn
- Wave 2/3 の ADR-D-003 / ADR-D-004 が独立 project 化した方がよいと判明した場合 → 再 spawn

## 6. 履歴

| 日付 | 変更 | 理由 |
|---|---|---|
| 2026-04-23 | spawn（SP-D Wave 1） | umbrella Phase 6 Wave 1 |
| 2026-04-24 | AAG-COA 遡及判定 (Level 3) | projectization-policy 導入後の retroactive 付与 |
