# projectization — aag-engine-go-mvp

> 役割: AAG-COA 判定結果。作業文脈に応じて、必要な project 化の重さと
> 不要な手続きを明示する。
>
> 規約: `references/05-aag-interface/operations/projectization-policy.md`

## 1. 判定結果

| 項目 | 値 |
|---|---|
| `projectizationLevel` | Level 3 (Architecture Project) |
| `changeType` | architecture-refactor |
| `implementationScope` | `["aag-engine/", "projects/active/aag-engine-go-mvp/"]` |
| `breakingChange` | false |
| `requiresLegacyRetirement` | false |
| `requiresGuard` | false |
| `requiresHumanApproval` | true |

## 2. 判定理由

### Level 3 を採用する理由

`projectization-policy.md` §3 Level 3 条件のうち、以下が該当する:

- **「型境界 / registry / context / data pipeline を変える」**: 新言語 (Go) engine 導入、新 module (= aag-engine/) 新設、DetectorResult 出力経路の二重化 (= TS + Go shadow)
- **「複数 feature に影響する」**: 5 detector + fixture corpus + path-helpers + schema + Logic Boundary Reference を input として読む engine、CI / shadow mode / hard gate 化判定など複数領域に波及

L2 では収まらない理由:

- 新言語 module 導入は単一機能 refactor に閉じない multi-axis architecture 変更
- shadow mode / CI advisory / hard gate 昇格 など architecture-level の readiness 判定が成果物
- readiness refactor (= L3) と sibling な architecture program

L4 でない理由:

- sub-project を spawn しない (= 単一 program で 13 Phase を完遂)
- 破壊的変更は含まない (= TS guard / docs:check / architecture-health は不変)
- legacy retirement なし

### changeType = architecture-refactor の理由

意味は変えず、**外部 engine の同型実装** (= TS detector と同 input → 同 output) を
Go で articulate する。`new-feature` ではない (= 機能追加ではなく既存 detector の
言語横断 parity)、`bug-fix` でもない、明確に architecture refactor。

### breakingChange = false の理由

- TypeScript guard / docs:check / architecture-health は不変 (= 本 MVP は parallel implementation、置き換えない)
- DetectorResult schema は canonical (= aag-platformization Pilot で landed)、Go 側は同 schema に conformant、schema 自体は変えない
- 既存 fixture / path-helpers / detectors は read-only で参照、不変

### requiresLegacyRetirement = false の理由

何も retire しない。本 MVP は **追加** で Go engine を導入する。
TS detector / Vitest wrapper は維持。Phase 11 hard gate 昇格時にも legacy retirement
は行わない (= TS と Go の二重実行が hard gate 体制の articulation)。

### requiresGuard = false の理由

新 hard gate / 新 invariant は本 MVP では追加しない。Phase 11 で **既存 TS detector
の hard gate 化判定を Go engine に補完的に articulate** することは検討するが、
guard 実装は別 program 所掌 (= readiness refactor 不可侵原則 3 継承)。

### requiresHumanApproval = true の理由

L3 必須 (= policy §3 Level 3)。さらに、Phase 11 (hard gate 昇格) と Phase 12
(closure / next architecture decision) は user 判断 (= Authority layer)。

## 3. 必要な文書

| 文書 | 必要性 | 理由 |
|---|---:|---|
| `AI_CONTEXT.md` | required | L3 必須、project 意味空間の入口 |
| `HANDOFF.md` | required | L3 必須、後任者の起点 |
| `plan.md` | required | L3 必須、不可侵原則 + Phase 0〜12 構造 |
| `checklist.md` | required | L3 必須、completion 判定の入力 |
| `projectization.md` | required | L3 必須、本ファイル |
| `discovery-log.md` | required | L2+ 必須、scope 外発見蓄積 |
| `decision-audit.md` | required | L3 重変更 routing で DA institute 必須 |
| `inquiry/` | optional | Phase 1 の Go skeleton 自体が "inquiry" の役割を果たすため不要 |
| `breaking-changes.md` | forbidden | breakingChange=false |
| `legacy-retirement.md` | forbidden | requiresLegacyRetirement=false |
| `sub-project-map.md` | forbidden | umbrella ではない |
| guard 設計 (plan.md 内) | forbidden | requiresGuard=false |
| 最終レビュー (user 承認) checkbox | required | L3 必須 (= PZ-10) |
| AI 自己レビュー section | required | L3 必須 (= PZ-13) |

## 4. やらないこと (nonGoals)

scope 逸脱の抑止と escalation 判定の基準として機能する。
詳細は `config/project.json` の `projectization.nonGoals` も参照 (同期されている)。

- Rust engine の実装 (= Phase 12 で必要性再評価)
- generated artifact の生成機能 (= MVP は validator のみ、generator ではない)
- docs:generate を Go に移管
- TypeScript guard を削除 (= 全廃しない方針、AAG Engine は「全 guard の置換」ではなく外部 governance validator)
- AAG rule semantics を Go 側に複製
- calculation / presentation / WASM / TS AST 系 guard を移植
- CI hard gate を即時置換 (= shadow mode 期間後に user 判断、Phase 11 で段階昇格)
- 実装 AI による自己承認

## 5. Escalation / De-escalation 条件

以下が発生した場合、`projectizationLevel` を再評価する。

### Escalation (L3 → L4)

- 本 MVP が複数 sub-project を spawn する必要 (= 例: Go MVP 単独で完結しない、Rust MVP 並行実装が必要と判明)
- TS guard 削除を本 MVP scope に取り込む必要 (= 不可侵原則違反、user escalate 必須)

### De-escalation (L3 → L2)

- 5 detector のうち一部のみ実装で sufficient と判明 (= scope 縮小、L2 化)
- shadow mode が不要と判明 (= CI advisory 化を直接判断、Phase 構造縮小)

### 不可侵境界

- TS detector の意味変更を本 MVP scope に取り込む (= readiness refactor 不可侵原則 2 違反、別 project 起票必須)
- generated artifact の generator 化 (= 本 MVP non-goal、別 program 起票必須)
- Rust engine の同時実装 (= Phase 12 で再評価まで本 MVP scope 外)

## 6. 履歴

| 日付 | 変更 | 理由 |
|---|---|---|
| 2026-05-05 | 初期判定 (Level 3, architecture-refactor, requiresHumanApproval=true) | 新言語 (Go) engine 導入による architecture 変更、複数 boundary に波及するため L3 |
