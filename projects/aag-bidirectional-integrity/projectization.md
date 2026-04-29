# projectization — aag-bidirectional-integrity

> 役割: AAG-COA 判定結果。作業文脈に応じて、必要な project 化の重さと
> 不要な手続きを明示する。
>
> 規約: `references/03-guides/projectization-policy.md`

## 1. 判定結果

| 項目 | 値 |
|---|---|
| `projectizationLevel` | Level 3 |
| `changeType` | governance-hardening |
| `implementationScope` | `["principles", "test/architectureRules", "test/guards", "design-system-docs"]` |
| `breakingChange` | false |
| `requiresLegacyRetirement` | true |
| `requiresGuard` | true |
| `requiresHumanApproval` | true |

## 2. 判定理由

**Level 3** の根拠:

- AAG core (`adaptive-architecture-governance.md`) への章追加 + 既存 AR rule の audit +
  binding + 新 meta-guard 2 件 + display rule registry bootstrap + 5 DFR rule guards 実装
  = 複数 mechanism にまたがる architecture-level governance-hardening
- 既存 100+ AR rule の audit + binding は影響範囲が project 横断（content-spec /
  taxonomy / architecture rule 全カテゴリ）だが、ratchet-down で漸次対応するため即時範囲は
  分類 A の自明 binding に限定
- `requiresHumanApproval=true`: AAG core の章追加は Constitution 改訂と同等の慎重さで人間
  review が必須

**Level 4 (Umbrella) でない理由**:

- sub-project を持たない単独 active project（Phase 1〜7 は本 project 内で完結）
- `projectization-policy.md` Level 4 は umbrella 構造（複数 sub-project の coordination）
  に対応するため、本 project には不適合

**governance-hardening** の根拠:

- 機能追加でも legacy 撤退でも refactor でもない
- 既存 mechanism の **約束を強化** する（performative になり得る余地を構造的に塞ぐ）
- `references/03-guides/projectization-policy.md` の governance-hardening 定義に合致

**breakingChange=false** の根拠:

- 既存 AR rule の振る舞い変更なし（schema 拡張のみ、空 array で初期化）
- 既存 guard / migration / Constitution の意味改変なし
- 新 rule（DFR-NNN）追加は新規導入のみで既存 contract 破壊なし

**requiresLegacyRetirement=true** の根拠:

- Phase 3 網羅的 doc audit で発見された **不要 doc / 冗長 doc / 不足部分** を Phase 4 で
  cleaning する scope を含む
- 既存 reference doc 群（`references/01-principles/`, `03-guides/`, `04-design-system/`,
  `05-contents/`, `02-status/`, `99-archive/`）に対して redundancy / staleness / gap の
  audit + 段階的 sunset / consolidation / 補完を実施
- legacy doc cleaning は本 project の Phase 1〜2 (meta-rule 確立) と Phase 5〜9 (rule binding /
  guard 実装) の **間に挟まる前提整理** として位置付ける（汚れた基盤の上に整合性 mechanism を
  乗せても integrity が成立しない）

## 3. 必要な文書

| 文書 | 必要性 | 理由 |
|---|---:|---|
| `AI_CONTEXT.md` | required | Level 4 の standard、scope と read order の明示 |
| `HANDOFF.md` | required | 7 phase の execution を次セッション以降に handoff |
| `plan.md` | required | canonical 計画 doc、Phase 構造と不可侵原則 |
| `checklist.md` | required | 7 phase の completion 判定の入力 |
| `inquiry/` | optional | 必要な inquiry が発生したら追加（現時点不要） |
| `breaking-changes.md` | forbidden | breakingChange=false |
| `legacy-retirement.md` | required | requiresLegacyRetirement=true、Phase 4 doc cleaning の sunset / consolidation / 補完計画を記録 |
| `sub-project-map.md` | forbidden | sub-project なし、独立 active project |
| guard 設計 (plan.md 内) | required | Phase 5 (meta-guard 2 件) + Phase 7 (DFR guards) の設計が plan.md §4 に含まれる |
| 最終レビュー (人間承認) checkbox | required | requiresHumanApproval=true、Level 4 standard |

## 4. やらないこと (nonGoals)

- 既存 AR-NNN rule の振る舞い変更（Phase 5 で audit + binding のみ、enforcement logic 変更は別 project）
- 全 100+ AR-NNN rule の即座 100% 製本化（baseline ratchet-down で漸次対応、新 rule 追加時のみ即時必須）
- 本体アプリ（粗利管理ツール）の機能変更
- `phased-content-specs-rollout` の archive 判定への干渉（parent project は独立に archive process を進める）
- 新 AAG framework 構造変更（4 層 → N 層 等は別 project）
- DFR rule の即時 0 化（Phase 9 で baseline 確定、ratchet-down で漸次解消）
- 既存 `adaptive-architecture-governance.md` 章の意味改変（Phase 1 は新章追加のみ）
- audit で発見された全 gap の即時解消（重要度に応じて baseline / ratchet-down / sunset で漸次対応）
- doc cleaning で sunset 判定された doc の物理削除を遡及的に行う（各 sunset は migrationRecipe + 履歴付きで段階削除）

## 5. Escalation / De-escalation 条件

以下が発生した場合、`projectizationLevel` を再評価する:

- 既存 AR rule の意味改変が必要と判明 → Level 4 維持 + breaking-changes.md 追加検討
- 既存 100+ rule の audit が想定以上に時間を要する → Phase 3 を別 project に切り出し、本 project は Phase 1/2/4/5/6/7 に縮減
- DFR rule が発見した実 drift が業務影響を持つ severity と判明 → 別 active project (drift remediation) に escalate
- 双方向 integrity meta-rule の例外カテゴリが想定以上に広範 → meta-rule の有用性を再評価、scope 縮減
- AAG core 文書化（Phase 1）で Constitution 改訂相当の議論が発生 → Constitution 改訂 project に拡張

## 6. 履歴

| 日付 | 変更 | 理由 |
|---|---|---|
| 2026-04-29 | 初期判定 (Level 3) | `phased-content-specs-rollout` 末セッション dialog で発見された AAG 構造的弱点（双方向 integrity 不在）の根本対策として独立 active project で spawn。AAG core への章追加 + 既存 rule audit + 新 meta-guard 2 件 + DFR registry framework + 5 rule guards の複合 scope は Level 3 governance-hardening 相当（sub-project なしの単独 project のため Level 4 Umbrella ではない）。 |
| 2026-04-29 | scope 拡張 (requiresLegacyRetirement=true) | dialog 進展で「網羅的 doc audit + legacy 撤退 (不要 doc 整理 / 冗長性解消 / 不足補完)」を本 project の前提整理 phase として吸収。実 execution 順序: Phase 1〜2 (meta-rule) → Phase 3 (audit) → Phase 4 (legacy 撤退) → Phase 5〜9 (rule binding / guard 実装)。Level 3 governance-hardening のまま、`legacy-retirement.md` を追加 required 文書化。 |
