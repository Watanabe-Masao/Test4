# HANDOFF — aag-bidirectional-integrity

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

**spawn 直後（2026-04-29、plan のみ landing）**。実 execution は次セッション以降。

`phased-content-specs-rollout` 末セッション dialog で発見された **AAG の構造的弱点**
（双方向 integrity 不在で performative rule が混入する余地）の根本対策として、本 project
が独立 active project で spawn された。

### spawn の trigger

`phased-content-specs-rollout` で次の 2 件を撤回した経験:

| 撤回 | 理由（reverse 方向の弱点） |
|---|---|
| visual evidence selection rule (consumer 数 / 365d commits / severity color / optionBuilder) | 製本されていない proxy metric を guard 化していた |
| Phase L spawn (PIPE / QH / PROJ) | spec 化されるべき実 drift / risk が validate されていない状態で spec authoring を guard 化しようとしていた |

これらは AAG rule が製本（canonical doc）に紐付かず、**guard が performative になる構造的余地**
が AAG 自体に内包されていることを示す。本 project はこの余地を **forward + reverse
双方向 integrity の meta-rule** で構造的に塞ぐ。

### 本 project の特徴

- **scope 内に 2 つの concrete deliverable**:
  1. AAG core 進化（双方向 integrity meta-rule + 既存 100+ AR rule の audit + binding）
  2. display-rule registry (DFR-001〜005) — 双方向 integrity の最初の concrete application
- **parent: なし**（`phased-content-specs-rollout` は独立に archive 進行）
- Level 3 / governance-hardening / requiresHumanApproval=true

## 2. 次にやること

> **状態 (2026-04-29 spawn)**: plan / checklist / projectization は landing 済、実 execution は次セッション。
> 計画段階の判断:
> - display-rule registry (DFR-NNN) は本 project の concrete application として吸収
> - DFR-005 thousands separator は明文化方向で進む（content-and-voice.md の "not enforced" 記述は更新対象）

### Phase 1: 双方向 integrity meta-rule の AAG core 文書化

- [ ] `adaptive-architecture-governance.md` に「双方向 integrity」章を追加
  - forward 方向: 製本 → AAG（製本 rule は全て AAG 検証される、装飾化禁止）
  - reverse 方向: AAG → 製本（AAG rule は全て製本に存在する、performative 禁止）
- [ ] meta-rule の例外（pure mechanism rule、製本不要なケース）を明示
- [ ] human review 経路の明示（meta-rule の例外は review window 経由）

### Phase 2: AAG rule metadata 拡張

- [ ] `architectureRules/defaults.ts` の rule entry schema に `canonicalDocRef: string[]` を追加（既存 fixNow / executionPlan に並列）
- [ ] `guardCategoryMap.ts` の rule entry schema に対応 field を追加（または上記と統合）
- [ ] schema migration: 既存全 rule 一旦 `canonicalDocRef: []`（空）で初期化、Phase 3 で順次埋める

### Phase 3: 既存 AR-NNN rule の audit + binding

- [ ] 既存 100+ AR-NNN rule を 4 分類で audit:
  - **A. 既製本済** — canonical doc 既存、binding を埋めれば完了
  - **B. 半製本** — note / コメントに rule の意図はあるが正本 doc が無い → 正本 doc を確定
  - **C. 製本されていない** — 純粋 mechanism rule で製本不要（meta-rule の例外）or 撤回検討
  - **D. 撤回判定** — proxy / performative と判定された rule
- [ ] 各 rule に `canonicalDocRef` を埋める
- [ ] 撤回判定 rule を ratchet-down + sunset

### Phase 4: Layer 2 既存 doc に back link section 追加

- [ ] canonical doc 群（`04-design-system/docs/` 等）に `## Mechanism Enforcement` セクションを追加
- [ ] 各 section は対応 AR rule ID 一覧を保持
- [ ] 重複管理防止: doc が rule を述べるなら必ず enforcing rule への back link を持つ

### Phase 5: forward / reverse meta-guard 実装

- [ ] `canonicalDocRefIntegrityGuard.test.ts` (reverse): 各 AR rule の `canonicalDocRef` 必須 + path 実在 + doc 内に rule ID が出現
- [ ] `canonicalDocBackLinkGuard.test.ts` (forward): canonical doc の `## Mechanism Enforcement` section が指す AR rule ID が `architectureRules/defaults.ts` に存在
- [ ] 例外 list（meta-rule の C 分類）の機械管理（baseline / allowlist）

### Phase 6: 表示 rule 製本化（DFR-001〜005 を Layer 3 として登録）

- [ ] `references/01-principles/display-rule-registry.md` を新設（Layer 3 = AAG rule registry）
- [ ] DFR-001 chart semantic color
- [ ] DFR-002 axis formatter via useAxisFormatter
- [ ] DFR-003 percent via formatPercent
- [ ] DFR-004 currency via formatCurrency（thousands separator 明文化）
- [ ] DFR-005 icon via pageRegistry / emoji canonical
- [ ] `content-and-voice.md` の "thousands-separator convention is not enforced" 記述を更新（明文化方針）

### Phase 7: 表示 rule guards 実装（rule registry framework + 各 DFR）

- [ ] `displayRuleGuard.test.ts` 新設、rule registry framework として実装
- [ ] DFR-001〜005 を `architectureRules/defaults.ts` + `guardCategoryMap.ts` に登録
- [ ] 各 rule の baseline 確定（観測済 drift から ratchet-down 開始）:
  - DFR-001: CHART-004 / CHART-005 の semantic 不使用 (2 件) を baseline
  - DFR-002: FactorDecomp / BudgetVsActual.builders 等の `toAxisYen` 直接呼び (≥5 件) を baseline
  - DFR-003: BudgetTrend / Seasonal 等の `Math.round(v * 100)` (≥3 件) を baseline
  - DFR-004 / DFR-005: 着手前に survey
- [ ] migrationRecipe を各 rule に記入（fix 方法を機械生成可能に）

### 最終 review + archive 承認

- [ ] 全 Phase (1〜7) の成果物を人間がレビュー → archive プロセスへ移行承認

## 3. ハマりポイント

### 3.1. AAG core への変更は慎重に

`adaptive-architecture-governance.md` は AAG 全体の正本。本 project の Phase 1 で章を
追加するのみで、既存章の **意味改変は禁止**。新章は明確に「双方向 integrity」と命名し、
既存内容と独立した位置に配置する。Constitution 改訂と同等の慎重さで扱う。

### 3.2. 既存 100+ AR rule の audit は ratchet-down で漸次対応

Phase 3 で全 rule を一気に分類しようとすると Level 4 project が膨張。次の戦略:

- **新 rule 追加時のみ `canonicalDocRef` 必須化** を Phase 5 meta-guard で hard fail
- 既存 rule は baseline で許容（`canonicalDocRef: []` 空でも違反なし）
- Phase 3 では分類 A（自明な既製本）のみ即時 binding、B/C/D は Phase 7 後の別 sprint で漸次対応

### 3.3. display rule (DFR) は Phase 6 まで開けない

dialog で観測された drift（CHART-004 semantic.customers 不使用 等）を即修正したくなるが、
**meta-rule (Phase 1〜5) が landing する前に DFR rule を guard 化すると Phase 5 meta-guard で
循環的に hard fail する**。順序遵守: meta-rule → registry → guards。

### 3.4. parent project (phased-content-specs-rollout) の archive process と独立

本 project の spawn は parent project の archive を妨げない。parent は人間 review + archive
承認 gate のみで進行。本 project の Phase 進捗は parent の status に影響しない設計。

### 3.5. content-and-voice.md の "not enforced" 記述

`04-design-system/docs/content-and-voice.md` に「thousands-separator convention is not
enforced」と明記されている。Phase 6 で DFR-004 を登録する際、この記述を **撤回** する
必要がある（「明文化されていない事実の記述」→「明文化された rule への back link」）。
撤回は文書の意思決定変更なので Phase 1 で human review trigger を定義しておく。

### 3.6. meta-rule の例外（純粋 mechanism rule）の境界

「製本されていない rule = performative」と単純化すると、純粋に mechanism として動作する
rule（例: `AR-G3-SUPPRESS-RATIONALE` のような suppress directive 規律）が誤って撤回判定される。
Phase 1 で **例外カテゴリ** を明示、Phase 5 meta-guard では allowlist で扱う。

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| `AI_CONTEXT.md` | why / scope / read order |
| **`plan.md`** | **canonical 計画 doc — Phase 1〜7** |
| `checklist.md` | Phase 1〜7 completion 条件 |
| `projectization.md` | AAG-COA 判定 (Level 3 / governance-hardening) |
| `config/project.json` | project manifest (`status: "active"` / parent なし) |
| `aag/execution-overlay.ts` | rule overlay (initial 空) |
| `references/01-principles/adaptive-architecture-governance.md` | AAG core 正本（本 project が双方向 integrity 章を追加） |
| `references/01-principles/adaptive-governance-evolution.md` | AAG 進化方針 |
| `projects/phased-content-specs-rollout/HANDOFF.md` | parent dialog の経緯 |
| `references/04-design-system/docs/chart-semantic-colors.md` | DFR-001 Layer 2 製本 |
| `references/04-design-system/docs/echarts-integration.md` | DFR-002 Layer 2 製本 |
| `references/03-guides/coding-conventions.md` | DFR-003/004 Layer 2 製本 |
| `references/04-design-system/docs/iconography.md` | DFR-005 Layer 2 製本 |
| `references/03-guides/project-checklist-governance.md` | AAG Layer 4A 運用ルール |
