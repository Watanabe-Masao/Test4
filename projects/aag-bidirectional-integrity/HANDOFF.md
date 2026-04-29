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

- **scope 内に 4 つの concrete deliverable**:
  1. AAG core 進化（双方向 integrity meta-rule + 既存 100+ AR rule の audit + binding）
  2. **網羅的 doc audit** + **legacy 撤退 cleaning**（Phase 3 + 4、汚れた基盤の上に integrity を乗せない前提整理）
  3. forward / reverse meta-guard（Phase 7、双方向 integrity の機械強制）
  4. **新規製本創出 (display-rule registry を含む)**（Phase 8、双方向 integrity の最初の concrete instances）+ DFR guards (Phase 9)
- **parent: なし**（`phased-content-specs-rollout` は独立に archive 進行）
- Level 3 / governance-hardening / requiresHumanApproval=true / **requiresLegacyRetirement=true**

## 2. 次にやること

> **状態 (2026-04-29 spawn)**: plan / checklist / projectization は landing 済、実 execution は次セッション。
> 計画段階の判断:
> - 網羅的 doc audit + legacy 撤退 cleaning を Phase 3 + 4 として吸収（汚れた基盤の上に integrity 不成立）
> - display-rule registry (DFR-NNN) は Phase 8 の最初の concrete instance として吸収
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
- [ ] schema migration: 既存全 rule 一旦 `canonicalDocRef: []`（空）で初期化、Phase 5 で順次埋める

### Phase 3: 網羅的 doc audit (rule canonization mapping + gap analysis)

- [ ] `references/` 配下全 doc inventory を作成（path / 役割 / 分類）
- [ ] 各 rule-defining doc が canonize している rule を抽出（人間語 → AR rule ID 候補マッピング）
- [ ] gap 識別（実装 / 慣習として確立しているが doc 化されていない rule）
- [ ] redundancy 識別（同一概念を複数 doc が説明、conflict があれば flag）
- [ ] staleness 識別（archived / superseded / 内容が古い doc）
- [ ] audit 結果を `references/02-status/doc-audit-report.md` に集約

### Phase 4: legacy 撤退 (不要 doc 整理 + 冗長性解消 + 不足補完)

- [ ] `legacy-retirement.md` に Phase 4 の sunset / consolidation / 補完計画を記録
- [ ] staleness 判定 doc の sunset（archived 移管 or 物理削除 with migrationRecipe）
- [ ] redundancy 解消（同一概念の複数 doc は 1 つを正本化、他を back link 化）
- [ ] gap の補完（必要最低限の新規 doc を Phase 8 と区別して即時補完）
- [ ] `99-archive/` への移管基準と履歴記録
- [ ] doc-registry.json の reflect

### Phase 5: 既存 AR-NNN rule の audit + binding

- [ ] Phase 3 の rule mapping を input に、既存 100+ AR-NNN rule を 4 分類で audit:
  - **A. 既製本済** — canonical doc 既存、binding を埋めれば完了
  - **B. 半製本** — note / コメントに rule の意図はあるが正本 doc が無い → 正本 doc を確定
  - **C. 製本されていない** — 純粋 mechanism rule で製本不要（meta-rule の例外）or 撤回検討
  - **D. 撤回判定** — proxy / performative と判定された rule
- [ ] 分類 A の `canonicalDocRef` を即時記入
- [ ] 分類 D の sunset trigger を確定
- [ ] audit 結果を `references/02-status/ar-rule-audit.md` に記録

### Phase 6: Layer 2 既存 doc に back link section 追加

- [ ] canonical doc 群（`04-design-system/docs/` 等）に `## Mechanism Enforcement` セクションを追加
- [ ] 各 section は対応 AR rule ID 一覧を保持
- [ ] 重複管理防止: doc が rule を述べるなら必ず enforcing rule への back link を持つ

### Phase 7: forward / reverse meta-guard 実装

- [ ] `canonicalDocRefIntegrityGuard.test.ts` (reverse): 各 AR rule の `canonicalDocRef` 必須 + path 実在 + doc 内に rule ID が出現
- [ ] `canonicalDocBackLinkGuard.test.ts` (forward): canonical doc の `## Mechanism Enforcement` section が指す AR rule ID が `architectureRules/defaults.ts` に存在
- [ ] 例外 list（meta-rule の C 分類）の機械管理（baseline / allowlist）

### Phase 8: 新規製本創出 (Phase 3 で identified gaps + display-rule registry)

- [ ] `references/01-principles/display-rule-registry.md` を新設（Phase 8 の最重要 instance）
- [ ] DFR-001 chart semantic color
- [ ] DFR-002 axis formatter via useAxisFormatter
- [ ] DFR-003 percent via formatPercent
- [ ] DFR-004 currency via formatCurrency（thousands separator 明文化）
- [ ] DFR-005 icon via pageRegistry / emoji canonical
- [ ] Phase 3 で gap 判定された他 rule に対する新規 doc（必要なものに限定、anti-bloat）
- [ ] `content-and-voice.md` の "thousands-separator convention is not enforced" 記述を更新

### Phase 9: 表示 rule guards 実装（rule registry framework + 各 DFR）

- [ ] `displayRuleGuard.test.ts` 新設、rule registry framework として実装
- [ ] DFR-001〜005 を `architectureRules/defaults.ts` + `guardCategoryMap.ts` に登録
- [ ] 各 rule の baseline 確定（観測済 drift から ratchet-down 開始）:
  - DFR-001: CHART-004 / CHART-005 の semantic 不使用 (2 件) を baseline
  - DFR-002: FactorDecomp / BudgetVsActual.builders 等の `toAxisYen` 直接呼び (≥5 件) を baseline
  - DFR-003: BudgetTrend / Seasonal 等の `Math.round(v * 100)` (≥3 件) を baseline
  - DFR-004 / DFR-005: 着手前に survey
- [ ] migrationRecipe を各 rule に記入（fix 方法を機械生成可能に）

### 最終 review + archive 承認

- [ ] 全 Phase (1〜9) の成果物を人間がレビュー → archive プロセスへ移行承認

## 3. ハマりポイント

### 3.1. AAG core への変更は慎重に

`adaptive-architecture-governance.md` は AAG 全体の正本。本 project の Phase 1 で章を
追加するのみで、既存章の **意味改変は禁止**。新章は明確に「双方向 integrity」と命名し、
既存内容と独立した位置に配置する。Constitution 改訂と同等の慎重さで扱う。

### 3.2. 既存 100+ AR rule の audit は ratchet-down で漸次対応

Phase 5 で全 rule を一気に分類しようとすると Level 3 project が膨張。次の戦略:

- **新 rule 追加時のみ `canonicalDocRef` 必須化** を Phase 7 meta-guard で hard fail
- 既存 rule は baseline で許容（`canonicalDocRef: []` 空でも違反なし）
- Phase 5 では分類 A（自明な既製本）のみ即時 binding、B/C/D は Phase 9 後の別 sprint で漸次対応

### 3.3. display rule (DFR) は Phase 8 まで開けない

dialog で観測された drift（CHART-004 semantic.customers 不使用 等）を即修正したくなるが、
**meta-rule (Phase 1〜2 + 7) が landing する前に DFR rule を guard 化すると Phase 7 meta-guard
で循環的に hard fail する**。順序遵守: meta-rule → audit → cleaning → registry → guards。

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
Phase 1 で **例外カテゴリ** を明示、Phase 7 meta-guard では allowlist で扱う。

### 3.7. Phase 3 audit と Phase 4 / 5 / 8 の責務分離

Phase 3 は **findings 集約のみ**で sunset / 修正実行はしない。実行 phase は:

- staleness / redundancy 撤退 → **Phase 4** (legacy 撤退)
- 既存 AR rule の binding → **Phase 5** (rule audit)
- gap への新規製本 → **Phase 8** (新規製本創出)

Phase 3 で「これ stale だから消そう」を即実行すると、後続 phase の input が消失して
order 崩壊。phase boundary を厳守する。

### 3.8. legacy 撤退 (Phase 4) の段階削除原則 — anti-ritual (state-based trigger)

Phase 4 で sunset 判定された doc は **遡及的物理削除を行わない**。`legacy-retirement.md`
に migrationRecipe + 履歴付きで段階削除（deprecation marker → archive 移管 → 物理削除 の
3 段階）。

**重要 (anti-ritual)**: 段階遷移の trigger は **時間経過 (date / cadence) でなく、
機械検証可能な状態条件 (state condition)** とする。phased-content-specs-rollout Phase K
Option 1 で撤回した「90 日 review cadence」と同型の儀式を本 project で再生産しない。

具体的には:
- archive 移管 trigger = 「機械検証で旧 path への inbound 0 + migrationRecipe 完備」
- 物理削除 trigger = 「inbound 0 が直近 N commits 連続 (例: 30 commits)」 AND 「同期間で
  新 doc が active に referenced」の両条件 — **日付でなく commit 数 + 0 reference の状態**
- 「30 日経ったから次へ」は禁止 (発火条件に触れずに見落とす risk、見落としで安全になっていない)

詳細: `legacy-retirement.md` §2 段階削除原則。
phased-content-specs-rollout Phase K Option 1 物理削除パターン（`.skip` 化 → registry 削除
→ 物理削除を別 commit）を踏襲。

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| `AI_CONTEXT.md` | why / scope / read order |
| **`plan.md`** | **canonical 計画 doc — Phase 1〜9** |
| `checklist.md` | Phase 1〜9 completion 条件 |
| `legacy-retirement.md` | Phase 4 sunset / consolidation / 補完計画 (requiresLegacyRetirement=true) |
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
