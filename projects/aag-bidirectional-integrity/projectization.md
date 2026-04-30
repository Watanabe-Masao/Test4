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
| `implementationScope` | `["principles", "test/architectureRules", "test/guards", "design-system-docs", "docs/contracts", "CLAUDE.md"]` |
| `breakingChange` | **true** (2026-04-30 update: 破壊的変更前提に方針転換) |
| `requiresLegacyRetirement` | true |
| `requiresGuard` | true |
| `requiresHumanApproval` | true |

## 2. 判定理由

**Level 3** の根拠:

- AAG Meta doc (`aag/meta.md`) 新規創出 + AAG Core 8 doc の 7 operation refactoring (Split / Merge /
  Rewrite / Rename / Relocate / Archive) + ディレクトリ階層化 (`aag/`) + 既存 AR rule の audit +
  schema 拡張 (semantic articulation 構造) + 双方向 integrity meta-guard 2 件 + display rule
  registry + DFR guards 実装 = 複数 mechanism にまたがる architecture-level governance-hardening
- 既存 100+ AR rule の audit + binding は影響範囲が project 横断 (content-spec / taxonomy /
  architecture rule 全カテゴリ)、ratchet-down で漸次対応するが破壊的変更前提のため一括実施も許容
- `requiresHumanApproval=true`: AAG Meta + Constitution 改訂レベルの dialog で人間 review 必須

**Level 4 (Umbrella) でない理由**:

- sub-project を持たない単独 active project (Phase 1〜10 は本 project 内で完結)
- `projectization-policy.md` Level 4 は umbrella 構造 (複数 sub-project の coordination) に対応するため、本 project には不適合

**governance-hardening** の根拠:

- 機能追加でも legacy 撤退でも refactor でもない
- 既存 mechanism の **約束を強化** する (performative になり得る余地を構造的に塞ぐ)
- AAG architecture pattern (5 層 × 5 縦スライス matrix) を確立して structural articulation を整える
- `references/03-guides/projectization-policy.md` の governance-hardening 定義に合致

**breakingChange=true** の根拠 (2026-04-30 update):

- 0 ベース re-derivation で「破壊的変更前提」が原則化 (plan §1.2 #10、§2 不可侵原則 #11)
- 既存 AR-NNN rule の振る舞い変更を許容 (Phase 6 で binding 一括実施可、必要なら enforcement logic 変更も)
- 5 縦スライス境界の reshape を許容 (新スライス追加 / 分割 / merge)
- 4 層 → 5 層への structural extension (検証層 = Layer 4 を追加、Phase 4 doc refactor 必須)
- AAG Core 8 doc の prefix (`aag-5-` / `adaptive-`) 撤廃 + ディレクトリ階層化 (`aag/`)
- inbound link 全数の migration、registry / contract path の全 update
- 旧 doc の archive 移管 + 物理削除 (inbound 0 trigger)

**requiresLegacyRetirement=true** の根拠:

- Phase 3 AAG Core doc audit で identify される **旧 doc 群 (8 doc)** + Phase 4 で **新規書き起こし** された新 doc が landing 後、旧 doc を Phase 5 で archive 移管 + 物理削除
- 既知 archive 候補: `aag-four-layer-architecture.md` (旧 4 層、superseded) / `aag-rule-splitting-plan.md` (completed project execution 記録)
- 全 8 doc 群が ditectory 階層化 (`aag/`) + prefix 撤廃 + responsibility 再定義で再構築
- legacy doc cleaning は本 project の Phase 1〜2 (Meta articulation + schema 拡張) と Phase 6〜10 (rule binding / guard 実装) の **間に挟まる前提整理** として Phase 3〜5 に配置

## 3. 必要な文書

| 文書 | 必要性 | 理由 |
|---|---:|---|
| `AI_CONTEXT.md` | required | Level 4 の standard、scope と read order の明示 |
| `HANDOFF.md` | required | 10 phase の execution を次セッション以降に handoff |
| `plan.md` | required | canonical 計画 doc、Phase 構造 (1〜10) + 不可侵原則 + §8 確認・調査事項 |
| `checklist.md` | required | 10 phase の completion 判定の入力 |
| `inquiry/` | optional | 必要な inquiry が発生したら追加 (現時点不要) |
| `breaking-changes.md` | **required** (2026-04-30 update: breakingChange=true) | 破壊的変更前提のため別途記録 (Phase 3 audit findings + Phase 4 refactor 完了時に landing) |
| `legacy-retirement.md` | required | requiresLegacyRetirement=true、Phase 5 archive 計画 (inbound 0 trigger) |
| `sub-project-map.md` | forbidden | sub-project なし、独立 active project |
| guard 設計 (plan.md 内) | required | Phase 8 (meta-guard 2 件) + Phase 10 (DFR guards) の設計が plan.md §4 に含まれる |
| 最終レビュー (人間承認) checkbox | required | requiresHumanApproval=true、Level 4 standard |

## 4. やらないこと (nonGoals)

> **方針 (plan §1.2 #10 + §2 不可侵原則 #11)**: 本 project は破壊的変更前提。既存 AAG 構造の
> 変更は積極的に許容される。以下の制約は依然として absolute:

- **本体アプリ (粗利管理ツール) の機能変更** (AAG governance の対象は AAG 自身、業務 logic は別 project)
- **`phased-content-specs-rollout` の archive 判定への干渉** (parent project は独立に archive process を進める)
- **Layer 0 (目的) を機械検証可能 condition に変換しようとする** (Layer 0 は人間判断のみ、Layer 1 以下が機械検証)
- **Layer 0 / Layer 1 を contradicting 形で update する** (Constitution 改訂と同等の慎重さ、人間 review 必須)
- **下位 doc に上位 content を copy する形での「説明強化」** (重複禁止、参照のみ可、§3.4.2 anti-duplication 原則)
- **期間 buffer (日数 / commits 数) を sunset / archive trigger に使う** (anti-ritual、inbound 0 のみ)
- **Phase 順序の violation** (例: Phase 9 を Phase 8 より先 = 循環 fail / Phase 5 legacy 撤退 を Phase 4 refactor より先 = inbound migration 不能)

## 5. Escalation / De-escalation 条件

以下が発生した場合、`projectizationLevel` を再評価する:

- 既存 AR rule の意味改変範囲が想定を超える → Level 4 維持 + sub-project 切り出し検討
- Phase 3 AAG Core doc audit で予想以上の sprawl 発見 (8 doc → 15 doc 以上の implication) → Phase 4 を別 project に切り出し
- DFR rule が発見した実 drift が業務影響を持つ severity と判明 → 別 active project (drift remediation) に escalate
- 双方向 integrity meta-rule の例外カテゴリが想定以上に広範 → meta-rule の有用性を再評価、scope 縮減
- aag/meta.md (Layer 0+1) の articulation で Constitution 改訂相当の議論が発生 → Constitution 改訂 project に拡張
- 5 層モデル (検証層 Layer 4 追加) で既存 guard / health / certificate 全体に影響波及が想定以上 → Phase 4 doc refactor を別 project に切り出し

## 6. 履歴

| 日付 | 変更 | 理由 |
|---|---|---|
| 2026-04-29 | 初期判定 (Level 3) | `phased-content-specs-rollout` 末セッション dialog で発見された AAG 構造的弱点 (双方向 integrity 不在) の根本対策として独立 active project で spawn。AAG core への章追加 + 既存 rule audit + 新 meta-guard 2 件 + DFR registry framework + 5 rule guards の複合 scope は Level 3 governance-hardening 相当 (sub-project なしの単独 project のため Level 4 Umbrella ではない)。 |
| 2026-04-29 | scope 拡張 (requiresLegacyRetirement=true) | dialog 進展で「網羅的 doc audit + legacy 撤退」を本 project の前提整理 phase として吸収。 |
| 2026-04-29 | Phase 1 deliverable 再構築 (AAG Meta charter doc 創出方針) | AAG Core (operational) / Meta (statics) / Evolution (dynamics) の 3 doc 構造で orthogonal な責務分離を articulate。aag-meta.md は 7 section (identity / goals / limits / invariants / non-goals / boundaries / 他 doc 境界)。 |
| **2026-04-30** | **plan refinement: 0 ベース re-derivation で 5 層モデル + 4 層 × 縦スライス matrix + 破壊的変更前提 + 検証層 + 7 operation taxonomy + 階層化 + 10 Phase に再構成** | dialog で次の本質要件が articulate された: (1) AAG Meta は包括概念であり既存 doc と層が違う、(2) AAG Meta は持つ課題 / 役割を達成する mechanism doc、(3) AAG Meta = 目的 / AAG Core = 対象 / AAG Audit = 第三者監査 (3 軸)、(4) 4 層 drill-down (目的 / 要件 / 設計 / 実装) + 検証層 (= 外部監査) を Layer 4 として追加 (= 5 層モデル)、(5) 5 縦スライス × 5 層 matrix で AAG architecture pattern を確立 (modular monolith evolution と parallel)、(6) 重複と参照の切り分け + drill-down chain semantic management (problemAddressed + resolutionContribution の必須 field 化)、(7) 7 operation taxonomy (Create / Split / Merge / Rename / Relocate / Rewrite / Archive) + 操作順序原則、(8) ディレクトリ階層化 (`references/01-principles/aag/`) + 命名規則刷新 (`aag-5-` / `adaptive-` prefix 撤廃)、(9) 期間 buffer 完全排除 (inbound 0 trigger のみ、anti-ritual)、(10) 破壊的変更前提 (追加コスト / 変更コストを考慮せず必要な変更を遂行)。breakingChange=false → true に変更、Phase 構造を 9 → 10 に拡張 (Phase 4 doc content refactoring 新規追加)、§8 「実装セッションで確認・調査が必要な事項」を新設。 |
