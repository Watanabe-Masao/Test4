# projectization — aag-governance-ratchet-down

> 役割: AAG-COA 判定結果。作業文脈に応じて、必要な project 化の重さと
> 不要な手続きを明示する。
>
> 規約: `references/05-aag-interface/operations/projectization-policy.md`

## 1. 判定結果

| 項目 | 値 |
|---|---|
| `projectizationLevel` | Level 4 (Umbrella) |
| `changeType` | governance-hardening |
| `implementationScope` | `["app/src/test/guards", "tools/governance", "docs/contracts/src", "references/04-tracking/generated"]` |
| `breakingChange` | false |
| `requiresLegacyRetirement` | false |
| `requiresGuard` | true |
| `requiresHumanApproval` | true |

## 2. 判定理由

aag-structural-control-plane (= 2026-05-10 archive、AAG 6.0 → 6.1) で **articulate 完成** した
advisory infrastructure を **ratchet-down で実装に converted** する後段 Umbrella program。
4 sub-program (= coverage / guards / dispositions / maturity) を articulate、各 sub-program は
独立 program として spawn。

- **Level 4 (Umbrella)**: 4 sub-program を束ねる umbrella governance。taxonomy-v2 に続く Level 4
  Umbrella 2 例目。各 sub-program は独立 spawn 可、依存順序なし。
- **changeType: governance-hardening**: 既存 advisory mechanism を hard gate に昇格 + ratchet-down
  baseline 確立。新 governance pattern 追加なし、既存 articulate を実装に converted のみ。
- **breakingChange: false**: advisory → guard 昇格は既存検出 mechanism に hard gate 追加で、
  既存挙動の破壊ではない。advisory checker は archive 後も継続運用。
- **requiresLegacyRetirement: false**: 既存 advisory checker / Reading Pass result / Failure Loop
  taxonomy はすべて継続運用。撤退対象なし。
- **requiresGuard: true**: 本 program 自体が guard 拡張 program。各 sub-program で新 guard test
  articulate + ratchet-down baseline 確立 + maturity progression。
- **requiresHumanApproval: true**: Level 4 Umbrella + 各 sub-program spawn 判断 + 各 guard 昇格
  の 3 段で user 判断 gate を要求 (= AAG-SCP-DOC-LEARNING-002 整合、即 Gate 化禁止)。

## 3. AAG-COA mandatory artifacts (= 本 projectization.flag に基づく要求)

| flag | mandatory artifact | landed? |
|---|---|---|
| breakingChange: true | breaking-changes.md | (false なので不要) |
| requiresLegacyRetirement: true | legacy-retirement.md | (false なので不要) |
| projectizationLevel: 4 | sub-project-map.md | ✓ 本 PR で landing |

## 4. nonGoals

- **新 governance pattern の articulate** (= aag-scp で完了済、本 program は articulate を ratchet-down するのみ)
- **Reading Pass の new batch** (= 100% 完遂済、新 reading 不要)
- **新 schema 追加** (= aag-scp で 4 schema landing 済)
- **AI 単独で advisory を hard gate に直接昇格** (= AAG-SCP-DOC-LEARNING-002 違反、5 段階 maturity progression 必須)
- **AI 単独で taxonomy maturity 昇格** (= AR-TAXONOMY-AI-VOCABULARY-BINDING 違反、review window 必須)
- **Phase 8a/8b/8c / Phase 10 への着手** (= reposteward 系統移譲 articulate 済)
- **app/src/ business logic touch**
- **Sub-program の dependency 順序強制** (= 独立 spawn を articulate)

## 5. 関連 program

| 関係 | program | role |
|---|---|---|
| 前駆 | `projects/completed/aag-structural-control-plane/` | advisory infrastructure articulate 完成 (= 本 program の input) |
| parallel umbrella | `projects/active/taxonomy-v2/` | Level 4 Umbrella 1 例目 |
| 並走 substrate provider | `projects/active/reposteward-ai-ops-platform/` | Task Capsule / SourceFacts / DetectorResult substrate |

## 6. spawn 履歴 (= 本 PR で initial articulate)

| timing | event | rationale |
|---|---|---|
| 2026-05-10 | umbrella spawn (= 本 PR) | aag-scp archive 直後、ratchet-down 実装フェーズへの transition |

各 sub-program の spawn 履歴は `sub-project-map.md` で track。
