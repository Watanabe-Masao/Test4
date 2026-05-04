# projectization — aag-engine-readiness-refactor

> 役割: AAG-COA 判定結果。作業文脈に応じて、必要な project 化の重さと
> 不要な手続きを明示する。
>
> 規約: `references/05-aag-interface/operations/projectization-policy.md`

## 1. 判定結果

| 項目 | 値 |
|---|---|
| `projectizationLevel` | Level 3 (Architecture Project) |
| `changeType` | architecture-refactor |
| `implementationScope` | `["tools/architecture-health/", "app/src/test/guards/", "references/03-implementation/aag-engine-readiness-inventory.md", "fixtures/aag/"]` |
| `breakingChange` | false |
| `requiresLegacyRetirement` | false |
| `requiresGuard` | false |
| `requiresHumanApproval` | true |

## 2. 判定理由

### Level 3 を採用する理由

`projectization-policy.md` §3 Level 3 条件のうち、以下が該当する:

- **「型境界 / registry / context / data pipeline を変える」**: collector / detector / renderer / evaluator の責務分離は AAG framework 内部の type boundary を articulate し直す変更。DetectorResult / AagResponse 系の output schema を新設する。
- **「複数 feature に影響する」**: `tools/architecture-health/` の構造変更は health KPI / docs:check / project-health collector など複数領域に波及する。

L2 では収まらない理由:

- pure detector 抽出 + fixture corpus 整備 + path normalization 共通化は、単一機能の refactor に閉じない multi-axis な構造変更。
- engine 移行可能性という architecture-level の readiness 判定が成果物に含まれる。

L4 でない理由:

- sub-project を spawn しない（単一 program で完遂）。
- 破壊的変更は含まない（既存 guard の意味は維持）。
- legacy retirement なし。

### changeType = architecture-refactor の理由

意味は変えず構造（responsibility boundary / output shape / file layout）だけを
engine 移行可能形に寄せる。`bug-fix` でも `new-feature` でもなく、明確に
architecture refactor。

### breakingChange = false の理由

- 既存 guard の検出条件 / hard gate / KPI 閾値は変えない（不可侵原則 2 で禁止）。
- public API（`tools/architecture-health/` の export）は維持。新 helper を追加しても既存 API は break しない。
- DetectorResult 型を **新設** するが、既存 output 形式と並行して提供する（段階移行）。

### requiresLegacyRetirement = false の理由

何も retire しない。新しい detector 構造を **追加** で導入し、既存 guard は
そのまま動作させる（pure detector 抽出時も Vitest wrapper 経由で同じ test が
走る）。

### requiresGuard = false の理由

新 hard gate / 新 invariant は追加しない。本 project 自身は、将来 engine
実装 project で hard gate 化が必要かを判断する **準備段階**。Phase 7 の
engine readiness report で「どの detector を hard gate 化してよいか」を
articulate するが、guard 化そのものは別 project の所掌。

### requiresHumanApproval = true の理由

L3 必須（policy §3 Level 3）。さらに、engine readiness report（Phase 7）の
最終承認は user 判断（= Authority layer）。

## 3. 必要な文書

| 文書 | 必要性 | 理由 |
|---|---:|---|
| `AI_CONTEXT.md` | required | L3 必須、project 意味空間の入口 |
| `HANDOFF.md` | required | L3 必須、後任者の起点 |
| `plan.md` | required | L3 必須、不可侵原則 + Phase 構造 + commit pattern |
| `checklist.md` | required | L3 必須、completion 判定の入力（最終レビュー user 承認 checkbox 必須） |
| `projectization.md` | required | L3 必須、本ファイル |
| `discovery-log.md` | required | L2+ 必須、scope 外発見蓄積 |
| `decision-audit.md` | required | L3 重変更 routing で DA institute 必須（complexity-policy.md §3.4） |
| `inquiry/` | optional | Phase 1 の AAG Input Inventory が `references/03-implementation/aag-engine-readiness-inventory.md` として permanent doc に landing するため、project 内 `inquiry/` は不要 |
| `breaking-changes.md` | forbidden | breakingChange=false のため作らない |
| `legacy-retirement.md` | forbidden | requiresLegacyRetirement=false のため作らない |
| `sub-project-map.md` | forbidden | umbrella ではないため作らない（PZ-6） |
| guard 設計 (plan.md 内) | forbidden | requiresGuard=false |
| 最終レビュー (user 承認) checkbox | required | L3 必須（PZ-10） |
| AI 自己レビュー section | required | L3 必須（PZ-13） |

## 4. やらないこと (nonGoals)

scope 逸脱の抑止と escalation 判定の基準として機能する。
詳細は `config/project.json` の `projectization.nonGoals` も参照（同期されている）。

- Go engine の実装
- Rust engine の実装
- aag generate の他言語への移管
- 既存 guard の意味変更（検出条件 / hard gate / KPI 閾値）
- 新 hard gate の追加（必要なら別 project）
- rule semantics を TS と別言語に複製する
- app-specific TS guard（calculation / presentation / domain 系）を engine 化対象にする
- 実装 AI による自己承認（最終レビュー = user 承認 必須）

## 5. Escalation / De-escalation 条件

以下が発生した場合、`projectizationLevel` を再評価する。

### Escalation（L3 → L4）

- 本 project が複数 sub-project を spawn する必要が出た（例: collector 系と detector 系で別 program 化が必要と判明）→ umbrella 化を検討
- engine 実装そのものを本 project に取り込む必要が出た → nonGoals 違反、別 project 起票が原則だが scope 拡大時は再評価

### De-escalation（L3 → L2）

- 当初 7 Phase 構想が「実は collector 純化だけで足りる」と判明 → L2 へ降格、Phase を 2-3 に縮小
- DetectorResult / fixture / pure detector 抽出のいずれかが不要と判明 → scope を絞り L2 化

### 不可侵境界

- breakingChange=true への変更（= 既存 guard 意味変更が必要と判明）が発生した場合、即座に user に escalate して別 project 起票を判断（本 project には混ぜない）。

## 6. 履歴

| 日付 | 変更 | 理由 |
|---|---|---|
| 2026-05-04 | 初期判定 (Level 3, architecture-refactor, requiresHumanApproval=true) | engine 移行前 readiness の事前リファクタリング、複数領域に波及するため L3 |
