# projectization — aag-self-hosting-completion

> 役割: AAG-COA 判定結果。
> 規約: `references/05-aag-interface/operations/projectization-policy.md`

## 1. 判定結果

| 項目 | 値 |
|---|---|
| `projectizationLevel` | **Level 3** |
| `changeType` | **architecture-refactor** |
| `implementationScope` | `["references/", "aag/", "projects/operational-protocol-system/", "docs/contracts/", "app/src/test/guards/"]` |
| `breakingChange` | **true** |
| `requiresLegacyRetirement` | false |
| `requiresGuard` | true |
| `requiresHumanApproval` | true |

## 2. 判定理由

本 project は AAG framework の **structural reorganization** により AAG-REQ-SELF-HOSTING の真の closure 達成 (= code-level + entry navigation rigor 完全達成) を目的とする。references/ + aag/ + projects/ の 3 tree にまたがる cross-tree restructure で、1,000+ inbound update + 138 guard / collector path 変更を伴う。

- **Level 3** — 単一 feature / layer に閉じない architecture-level の reorganization。AAG framework + references + projects + guard + doc-registry すべてに横断。Level 4 (umbrella) には該当しない (= 単一 program で覆う、sub-project への分割は計画してない)
- **changeType=architecture-refactor** — AAG framework の物理 location を再編、references/ directory rename、per-element directory + dashboard layer 新設、operational-protocol-system M1 deliverable を aag/interface/protocols/ に landing する architecture-level の境界 articulation
- **breakingChange=true** — 1,000+ inbound link path 変更 = 既存 doc / code 内 reference の path string が全 update。consumer facade からは透明だが、direct path reference を持つ test / doc / generator に影響
- **requiresLegacyRetirement=false** — 既存 API / doc 内容の物理削除なし、location 移動のみ。content 100% preservation
- **requiresGuard=true** — 各 R-phase で boundary 検証 guard が必要 (= aag-related guard 群は path constants update、selfHostingGuard.test.ts は R6 で entry navigation rigor 検証項目追加)
- **requiresHumanApproval=true** — 大規模 structural change、最終 archive で人間承認必須 (= 不可侵原則 7)

## 3. 必要な文書

| 文書 | 必要性 | 理由 |
|---|---|---|
| `AI_CONTEXT.md` | required | project 意味空間入口 |
| `HANDOFF.md` | required | 起点文書、現在地 + 次アクション |
| `plan.md` | required | 不可侵原則 7 件 + Phase R1-R7 + scope 外 |
| `checklist.md` | required | completion 判定 + 各 R-phase 観測点 |
| `decision-audit.md` | required | 重判断 institution (= drawer Pattern 1 application instance、各 R-phase で DA entry) |
| `inquiry/` | optional | 判断分岐多い場合のみ、R3 で directory rename 影響範囲評価で使う可能性 |
| `breaking-changes.md` | required | breakingChange=true、各 R-phase の breaking 点 articulate (例: R1 で AAG path 変更、R3 で directory rename) |
| `legacy-retirement.md` | forbidden | requiresLegacyRetirement=false |
| `sub-project-map.md` | forbidden | sub-project 分割なし |
| guard 設計 (plan.md 内) | required | requiresGuard=true、§5「物理 location 移動」+ §3「§観測点」内で articulate |
| 最終レビュー (人間承認) checkbox | required | requiresHumanApproval=true、checklist.md 末尾配置 |

## 4. やらないこと (nonGoals)

- 主アプリ code (`app/src/`, `app-domain/`, `wasm/`) の touch
- AAG framework articulate **内容** の改変 (= 物理 location のみ移動、R6 例外を除く)
- Standard / drawer / 5 文書 template の articulate **内容** 改変
- 機能 loss を伴う migration (= 内容 100% 維持、location 移動のみ)
- 単一 commit で 2 R-phase まとめる (= rollback 境界 articulate 不能化)
- 観測点 < 5 件 / 反証可能 0 件 で R-phase landing
- AI 単独 archive
- AI Role Catalog 本実装 (= post-Pilot 別 program scope)
- per-element 全 89 element 一括 full 適用 (= R4 は pilot subset で start、段階適用)
- dashboard layer の手書き化 (= 機械生成 mandatory)
- inbound update を後回しに R-phase landing (= broken link 大量発生 risk)

## 5. Escalation / De-escalation 条件

- 主アプリ code に touch 必要発覚 → escalation (= 不可侵原則 1 違反、scope 再評価)
- AAG framework articulate 内容改変 必要発覚 → R6 例外で articulate or escalation
- 機能 loss 発生 → 即 revert + DA 軌道修正
- inbound update が予想超過 (例: 1,000+ → 5,000+) → Phase 分割検討
- per-element pilot subset で value verify 失敗 → R4 scope 縮小 or 中止
- operational-protocol-system R5 統合不能発覚 → R5 scope 再設計
- selfHostingGuard 検証拡張で false positive 大量 → R6 articulate 修正
- 想定より影響範囲小 → de-escalation (Level 2)

## 6. 履歴

| 日付 | 変更 | 理由 |
|---|---|---|
| 2026-05-02 | 初期判定 (Level 3 + architecture-refactor) | AAG Pilot 完遂 + operational-protocol-system bootstrap 後 user articulation 反映、AAG framework の entry navigation level での self-hosting failure を解消する structural reorganization として bootstrap |
