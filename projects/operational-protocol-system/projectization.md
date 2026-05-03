# projectization — operational-protocol-system

> 役割: AAG-COA 判定結果。
> 規約: `references/05-aag-interface/operations/projectization-policy.md`

## 1. 判定結果

| 項目 | 値 |
|---|---|
| `projectizationLevel` | Level 2 |
| `changeType` | governance-hardening |
| `implementationScope` | `["references/03-implementation/"]` |
| `breakingChange` | false |
| `requiresLegacyRetirement` | false |
| `requiresGuard` | false (M5 完了後に判断) |
| `requiresHumanApproval` | true |

## 2. 判定理由

本 project は AAG Platformization Pilot 完遂後の **post-Pilot 運用制度** を articulate する。AAG framework / Standard / drawer / 5 文書 / role / AAG-COA を破壊的変更せず、上に薄く載せる operational layer (= Task Protocol / Session Protocol / Complexity Policy)。

- **Level 2** — 単一 feature / bug fix に閉じない、複数 phase + multi-doc deliverable (= 4 doc 新設)。Level 3 (architecture-refactor) には該当しない (= AAG framework や主アプリ architecture 変更を含まない)。Level 4 (umbrella) にも該当しない (= sub-project への分割なし)
- **changeType=governance-hardening** — 既存制度 (= AAG 運用) を articulate 強化、新 framework ではない
- **breakingChange=false** — 既存 5 文書 / role / AAG-COA / drawer を破壊的変更しない (= 不可侵原則 1 整合)
- **requiresLegacyRetirement=false** — 既存 API / doc の物理削除は本 program scope ではない
- **requiresGuard=false** (M5 完了後に再判断) — M1-M3 は articulation のみ、M5 で session protocol violation 検出 guard 化 を value vs cost 評価 (= drawer Pattern 4 適用)
- **requiresHumanApproval=true** — 運用制度の改訂は user 領域 (= 不可侵原則 6)

## 3. 必要な文書

| 文書 | 必要性 | 理由 |
|---|---:|---|
| `AI_CONTEXT.md` | required | project 意味空間の入口 |
| `HANDOFF.md` | required | 起点文書、現在地 + 次アクション |
| `plan.md` | required | 不可侵原則 6 件 + Phase M1-M5 + scope 外 |
| `checklist.md` | required | completion 判定 + 観測点 articulate |
| `decision-audit.md` | required | 重判断 institution (= drawer Pattern 1 application instance、= 進行モデル + 各 Phase 判断) |
| `inquiry/` | optional | 判断分岐が多い場合のみ、現時点 forbid 寄り |
| `breaking-changes.md` | optional | breakingChange=false のため通常 forbid 寄り、ただし scope 逸脱発生時に articulate |
| `legacy-retirement.md` | forbidden | requiresLegacyRetirement=false |
| `sub-project-map.md` | forbidden | sub-project への分割なし |
| guard 設計 (plan.md 内) | optional | M5 で value vs cost 評価後判断 |
| 最終レビュー (人間承認) checkbox | required | requiresHumanApproval=true、checklist.md 末尾に配置済 |

## 4. やらないこと (nonGoals)

- AAG framework (`aag/_internal/` + `aag/core/`) の articulate 内容変更
- AAG drawer (`references/05-aag-interface/drawer/decision-articulation-patterns.md`) の改変
- Platformization Standard (`references/01-foundation/platformization-standard.md`) の改変
- 5 文書 template (= `projects/_template/`) の schema / 内容変更
- role identity (`roles/*`) の改変
- AAG-COA (`references/05-aag-interface/operations/projectization-policy.md`) の articulate 変更
- 主アプリ code (`app/src/`, `app-domain/`, `wasm/`) の touch
- AI Role Catalog の本実装 (= post-Pilot 別 program scope)
- 自動昇格判定の機械化 (= AI judgement に委ねる scope)
- 新概念 (= 既存 vocabulary 外) の追加

## 5. Escalation / De-escalation 条件

以下が発生した場合、`projectizationLevel` を再評価する:

- 破壊的変更が発覚した (例: 既存 5 文書 schema 変更が必要に判明) → Level 3 へ escalation
- guard 化が M5 で value > cost と判断された場合 → requiresGuard=true へ flip
- 複数 program に分割する必要 → Level 4 (umbrella) 検討
- references/ 階層境界 audit (= 別 program candidate) と統合判断必要 → 親 program 化検討
- 当初 nonGoals に含めた作業が必要になった → Phase 構造再評価
- 想定より影響範囲が小さく、Level 1 で収まると判明 → Level 1 へ de-escalation

## 6. 履歴

| 日付 | 変更 | 理由 |
|---|---|---|
| 2026-05-02 | 初期判定 (Level 2 + governance-hardening) | AAG Pilot 完遂後 user articulation を反映、charter draft (= references/04-tracking/operational-protocol-charter-draft.md、本 commit で plan.md に migrate + 削除) を起点に bootstrap |
