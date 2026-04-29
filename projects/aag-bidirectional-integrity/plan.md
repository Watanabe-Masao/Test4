# plan — aag-bidirectional-integrity

> **canonical 計画 doc**（2026-04-29 spawn）。
> AAG 双方向 integrity meta-rule + 表示 rule 製本化の段階展開計画。
> **status**: active（plan のみ landing、execution は次セッション）。

## 1. 経緯と現在地

### 1.1. spawn の trigger

`phased-content-specs-rollout` 末セッションの dialog（2026-04-29）で次の構造的問題が
表面化した:

| 問題 | 構造的弱点 |
|---|---|
| visual evidence selection rule が proxy metric (consumer 数 / 365d commits) で guard 化されていた | reverse: AAG → 製本 が不在、guard が performative になる余地 |
| Phase L spawn (PIPE / QH / PROJ) が drift validation 抜きで spec authoring 計画されていた | reverse: AAG → 製本 が不在、guard が「あるかもしれない」を guard 化する余地 |

これらは AAG の 4 層構造（Constitution / rule / guard / migration）には組み込まれて
いない、より深層の **製本 ↔ AAG binding** の不在を示す。本 project は AAG core 自体に
**双方向 integrity** の meta-rule を確立し、display rule registry (DFR-NNN) を最初の
concrete application として実証する。

### 1.2. 関連既存資産

- **AAG core**: `references/01-principles/adaptive-architecture-governance.md` (本 project が章追加)
- **AAG 進化方針**: `references/01-principles/adaptive-governance-evolution.md` (本 project の動線)
- **rule registry**: `app/src/test/architectureRules/defaults.ts` + `guardCategoryMap.ts` (本 project が schema 拡張)
- **既存 canonical doc**: `04-design-system/docs/`, `01-principles/`, `03-guides/` (Phase 4 で back link 追加)
- **CHART semantic 実 drift 観測**: CHART-004 / CHART-005 (Phase 7 baseline)
- **axis formatter 実 drift**: FactorDecomp / BudgetVsActual.builders (Phase 7 baseline)
- **formatPercent 実 drift**: BudgetTrend / Seasonal (Phase 7 baseline)

## 2. 不可侵原則

1. **「やらないこと」ではなく「順番を後にすること」として明記する**。Phase 2〜9 を放棄しない
2. 各 Phase は **依存 Phase が完了基準を満たしてから着手** する（Wave 構造）
3. Phase 1（AAG core 文書化）は **既存章の意味改変禁止**。新章を独立追加するのみ
4. Phase 3（網羅的 doc audit）は **findings 集約のみで sunset / 修正実行はしない**。実行は Phase 4 / 5 / 8
5. Phase 4（legacy 撤退）は **migrationRecipe + 履歴付きで段階削除**。段階遷移の trigger は **時間経過でなく機械検証可能な状態条件** (state-based、Phase K Option 1 の anti-ritual 思想を継承)。即時物理削除を遡及的に行わない
6. Phase 5（既存 rule audit）は **ratchet-down で漸次対応**。一括 100% 製本化は scope creep
7. Phase 8（新規製本創出）は **Phase 7 meta-guard が landing してから**着手（順序遵守、循環 fail 防止）
8. Phase 9（DFR guards）は **observed drift を baseline として ratchet-down 起点に**。即時 0 化を試みない
9. AAG framework そのものの構造変更（4 層 → N 層 等）は本 project scope 外
10. ratchet-down baseline を増加方向に戻さない
11. parent project (`phased-content-specs-rollout`) の archive process に干渉しない（独立進行）

## 3. 設計思想

### 3.1. 双方向 integrity meta-rule の構造

```
forward: 製本 → AAG
  「canonical doc で定義された rule は、必ず enforcing AAG rule (AR-NNN) を持つ」
  違反例: doc に "X すべき" と書いてあるが guard が無い → 装飾化
  検出: canonicalDocBackLinkGuard が doc の Mechanism Enforcement section を parse、
        指す AR ID が architectureRules.ts に存在することを検証

reverse: AAG → 製本
  「AAG rule (AR-NNN) は、必ず canonical doc で定義された rule を enforcing する」
  違反例: rule の意図が doc に存在しない proxy / 派生 metric → performative
  検出: canonicalDocRefIntegrityGuard が各 rule の canonicalDocRef を parse、
        path 実在 + doc 内に rule ID が出現することを検証
```

### 3.2. meta-rule の例外（純粋 mechanism rule）

次のような rule は製本不要で許容される（Phase 5 meta-guard の allowlist で管理）:

- **suppress directive 規律** (例: `AR-G3-SUPPRESS-RATIONALE`) — コード品質 hygiene
- **size guard** (例: `AR-FILE-SIZE-LIMIT`) — 純粋 mechanism、業務 rule 不在
- **lint / format 連携 rule** — 外部 tool との binding

例外判定の軸: 「rule が無くてもプロダクトの **業務的意味** が壊れない」「pure mechanism として
完結する」「人間の意思決定でなく数値閾値 / pattern matching で完結する」。

例外 list の追加 / 削除は **review window 経路** で人間判断（Phase 1 で経路を明示）。

### 3.3. Layer 構造（製本の 3 層 + AAG）

```
Layer 1: 真の正本 (source code)
  formatPercent / formatCurrency / useAxisFormatter / ChartSemanticColors

Layer 2: 製本 description (既存 canonical doc)
  04-design-system/docs/, 01-principles/, 03-guides/
  → Phase 4 で Mechanism Enforcement section 追加

Layer 3: AAG rule registry (Layer 2 の rule を ID 化)
  display-rule-registry.md (DFR-NNN), 既存 architectureRules.ts (AR-NNN)
  → Phase 6 で DFR-001〜005 登録

Layer 4: AAG enforcement (機械検証)
  guards/*Guard.test.ts
  → Phase 5 で meta-guard 2 件、Phase 7 で displayRuleGuard
```

### 3.4. display rule (DFR) を本 project に吸収する理由

- 双方向 integrity の **最初の concrete application** として実証価値が高い
- DFR は新規 rule であり、Phase 5 meta-guard の **forward 方向** を初日から強制適用できる
- dialog で発見された CHART-004/005 の実 drift がそのまま baseline として活用可能
- 別 project に切り出すと「概念実証なき meta-rule」になり、abstract 化 risk

## 4. Phase 構造

### Phase 1: 双方向 integrity meta-rule の AAG core 文書化

**目的**: AAG core に双方向 integrity の章を追加、meta-rule の正本化。

**deliverable**:
- `adaptive-architecture-governance.md` 新章「双方向 integrity」
- meta-rule の例外カテゴリ定義（pure mechanism rule の allowlist 基準）
- review window 経路（例外 list の改廃）

**完了条件**: 章の人間 review + Constitution 改訂と同等の慎重さでの確定。

### Phase 2: AAG rule metadata 拡張

**目的**: rule entry に `canonicalDocRef: string[]` を追加、schema migration。

**deliverable**:
- `architectureRules/defaults.ts` schema 拡張
- 既存全 rule に `canonicalDocRef: []` 初期化（後続 Phase で順次埋める）
- TypeScript 型定義の整合

**完了条件**: 既存全 rule が空 array で初期化、build / lint / 既存 guard 全て PASS。

### Phase 3: 網羅的 doc audit (rule canonization mapping + gap analysis)

**目的**: `references/` 配下全 doc を網羅的に scan し、rule canonization の現状把握 +
gap 識別 + redundancy / staleness 検出。Phase 4 (legacy 撤退) と Phase 5 (AR rule binding)
の両方の input を産出する集約 phase。

**deliverable**:
- 全 doc inventory（path / 役割 / 分類: rule-defining / rule-using / status-status /
  archive / template / etc.）
- 各 rule-defining doc が canonize している rule の抽出（人間語の rule statement → AR rule
  ID 候補のマッピング）
- gap 識別（実装 / 慣習として確立しているが doc 化されていない rule の候補）
- redundancy 識別（同一概念を複数 doc が説明している箇所、conflict があれば flag）
- staleness 識別（archived / superseded / 内容が古い doc）
- audit 結果を `references/02-status/doc-audit-report.md` に集約（generated section と
  prose の両形式）

**完了条件**: doc inventory + rule mapping + gap list + redundancy list + staleness list
の 5 件が aggregated artifact として成立、Phase 4/5 への hand-off が可能。

### Phase 4: legacy 撤退 (不要 doc 整理 + 冗長性解消 + 不足補完)

**目的**: Phase 3 audit findings に基づき既存 doc 群の cleaning。**汚れた基盤の上に
整合性 mechanism を乗せても integrity は成立しない** という前提整理。

**deliverable**:
- `legacy-retirement.md` (Phase 4 の sunset / consolidation / 補完計画)
- staleness 判定 doc の sunset（archived 移管 or 物理削除 with migrationRecipe）
- redundancy 解消（同一概念の複数 doc は 1 つを正本化、他を back link 化）
- gap の補完（必要最低限の新規 doc を Phase 8 と区別して即時補完）
- `99-archive/` への移管基準と履歴記録
- doc-registry.json の reflect

**完了条件**: Phase 3 の staleness / redundancy 全件が status 判定済（即時撤退 / 漸次撤退 /
維持）、`legacy-retirement.md` で各判定の理由 + migrationRecipe が記録、ratchet-down baseline 確定。

### Phase 5: 既存 AR-NNN rule の audit + binding (partial)

**目的**: Phase 3 の rule mapping を input に、既存 100+ AR rule を 4 分類で binding。
自明な既製本 rule（分類 A）を即時 binding、B/C/D は後続 sprint。

**deliverable**:
- 既存 100+ rule を A/B/C/D 4 分類に audit
  - **A. 既製本済**: Phase 3 mapping で対応 doc が確定
  - **B. 半製本**: doc に rule の意図はあるが正本確定が必要
  - **C. 製本されていない**: 純粋 mechanism rule（meta-rule の例外）or 撤回検討
  - **D. 撤回判定**: proxy / performative
- 分類 A の `canonicalDocRef` 即時記入
- 分類 D の sunset 計画
- audit 結果を `references/02-status/ar-rule-audit.md` に記録

**完了条件**: 分類 A の binding 100%、分類 D の sunset trigger 確定。

### Phase 6: Layer 2 既存 doc に back link section 追加

**目的**: canonical doc 群に `## Mechanism Enforcement` section を追加、双方向 binding 構築。

**deliverable**:
- `04-design-system/docs/` の関連 doc に section 追加
- `01-principles/` / `03-guides/` の rule 定義 doc に section 追加
- 各 section が指す AR rule ID 一覧

**完了条件**: Phase 5 分類 A の rule が、Layer 2 doc 側からも back link で見える状態。

### Phase 7: forward / reverse meta-guard 実装

**目的**: 双方向 integrity を機械検証する 2 件の meta-guard を landing。

**deliverable**:
- `canonicalDocRefIntegrityGuard.test.ts` (reverse): 各 AR rule の `canonicalDocRef` 必須 + path 実在 + doc 内に rule ID 出現
- `canonicalDocBackLinkGuard.test.ts` (forward): canonical doc の Mechanism Enforcement section が指す AR ID が実在
- 例外 allowlist の機械管理（baseline）
- 新 rule 追加時の immediate enforcement（baseline 増加方向は禁止、ratchet-down のみ）

**完了条件**: 既存 baseline で PASS、新 rule 追加 PR で immediate enforcement、循環 fail なし。

### Phase 8: 新規製本創出 (Phase 3 で identified gaps への対応)

**目的**: Phase 3 で識別された gap（実装 / 慣習として確立しているが doc 化されていない rule）
に対して新規 canonical doc を作成。display-rule registry はその最初の concrete instance。

**deliverable**:
- `references/01-principles/display-rule-registry.md` 新設（最重要 instance）
  - DFR-001 chart semantic color
  - DFR-002 axis formatter via useAxisFormatter
  - DFR-003 percent via formatPercent
  - DFR-004 currency via formatCurrency（thousands separator 明文化）
  - DFR-005 icon via pageRegistry / emoji canonical
- Phase 3 で gap 判定された他 rule に対する新規 doc（必要なものに限定、anti-bloat 適用）
- `content-and-voice.md` の "thousands-separator convention is not enforced" 記述を更新
- doc-registry.json への registry 登録

**完了条件**: 新規製本対象 doc 全件が rule entry として完全（Layer 1 source link /
Layer 2 doc link / bypass pattern / 適用 path / migrationRecipe）、Phase 7 forward
meta-guard で integrity 成立。

### Phase 9: 表示 rule guards 実装 (Phase 8 instances を Layer 4 で機械検証)

**目的**: DFR-001〜005 + Phase 8 で創出した他新規 rule を Layer 4 で機械検証、observed
drift を baseline 化。

**deliverable**:
- `displayRuleGuard.test.ts` 新設（rule registry framework）
- DFR-001〜005 を `architectureRules/defaults.ts` + `guardCategoryMap.ts` に登録
- 各 rule の baseline 確定（観測済 drift を ratchet-down 起点に）
- migrationRecipe の各 rule への記入

**完了条件**: 全 DFR rule が active、baseline で PASS、新規 drift は immediate fail、
Phase 7 reverse meta-guard で全 DFR rule の `canonicalDocRef` 整合成立。

## 5. やってはいけないこと

- **既存 AR-NNN rule の振る舞い変更** (Phase 5 で audit + binding のみ、enforcement logic 変更は別 project)
- **全 100+ rule の即座 100% 製本化** (scope creep、ratchet-down で漸次対応)
- **Phase 8 を Phase 7 より先にやる** (循環 fail、meta-guard が registry を hard fail させる)
- **dialog で観測された drift の即時修正** (Phase 9 まで開けない、順序遵守)
- **AAG framework 構造変更** (4 層 → N 層 等は別 project)
- **parent project の archive process への干渉** (parent は独立進行)
- **`adaptive-architecture-governance.md` 既存章の意味改変** (Phase 1 は新章追加のみ、Constitution 改訂相当の慎重さ)
- **Phase 4 で sunset 判定された doc の遡及的物理削除** (migrationRecipe + 履歴付きで段階削除、後任が経緯を追える状態を維持)
- **Phase 3 audit の段階で sunset / 修正を実行する** (audit は findings 集約のみ、実行は Phase 4 / 5 / 8 で別 wave)

## 6. 関連実装

| パス | 役割 |
|---|---|
| `references/01-principles/adaptive-architecture-governance.md` | AAG core 正本（Phase 1 で双方向 integrity 章を追加） |
| `references/01-principles/adaptive-governance-evolution.md` | AAG 進化方針（本 project の位置付け確認） |
| `references/01-principles/display-rule-registry.md` | Phase 8 で新設、DFR-NNN registry |
| `references/02-status/doc-audit-report.md` | Phase 3 audit findings 集約 |
| `references/02-status/ar-rule-audit.md` | Phase 5 既存 AR rule audit 結果 |
| `references/04-design-system/docs/chart-semantic-colors.md` | DFR-001 Layer 2 製本（Phase 6 で back link 追加） |
| `references/04-design-system/docs/echarts-integration.md` | DFR-002 Layer 2 製本（Phase 6 で back link 追加） |
| `references/04-design-system/docs/iconography.md` | DFR-005 Layer 2 製本（Phase 6 で back link 追加） |
| `references/04-design-system/docs/content-and-voice.md` | thousands-separator 記述更新（Phase 8） |
| `references/03-guides/coding-conventions.md` §数値表示ルール | DFR-003/004 Layer 2 製本（Phase 6 で back link 追加） |
| `references/99-archive/` | Phase 4 sunset doc の移管先 |
| `app/src/test/architectureRules/defaults.ts` | rule registry（Phase 2 で schema 拡張、Phase 5/9 で entry 追加） |
| `app/src/test/guardCategoryMap.ts` | rule category（同上） |
| `app/src/test/guards/canonicalDocRefIntegrityGuard.test.ts` | Phase 7 reverse meta-guard |
| `app/src/test/guards/canonicalDocBackLinkGuard.test.ts` | Phase 7 forward meta-guard |
| `app/src/test/guards/displayRuleGuard.test.ts` | Phase 9 DFR guards |
| `projects/aag-bidirectional-integrity/legacy-retirement.md` | Phase 4 sunset / consolidation / 補完計画 |

## 7. 成功判定

- AAG core に「双方向 integrity」章が landing
- Phase 3 doc audit の findings (inventory / rule mapping / gap / redundancy / staleness) が aggregated artifact として landing
- Phase 4 legacy 撤退で staleness / redundancy 全件が status 判定済 + `legacy-retirement.md` に migrationRecipe 記録
- 既存 AR-NNN rule のうち分類 A（自明な既製本）が 100% binding 済
- forward / reverse meta-guard が active で違反 0
- DFR-001〜005 が registry に登録、各 baseline で PASS
- 新規 AR rule 追加時、`canonicalDocRef` 必須化が機械強制される（PR 経路で hard fail）
- parent project (`phased-content-specs-rollout`) の archive 進行に干渉なし
