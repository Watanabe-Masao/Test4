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

1. **「やらないこと」ではなく「順番を後にすること」として明記する**。Phase 2〜7 を放棄しない
2. 各 Phase は **依存 Phase が完了基準を満たしてから着手** する（Wave 構造）
3. Phase 1（AAG core 文書化）は **既存章の意味改変禁止**。新章を独立追加するのみ
4. Phase 3（既存 rule audit）は **ratchet-down で漸次対応**。一括 100% 製本化は scope creep
5. Phase 6（DFR registry）は **Phase 5 meta-guard が landing してから**着手（順序遵守、循環 fail 防止）
6. Phase 7（DFR guards）は **observed drift を baseline として ratchet-down 起点に**。即時 0 化を試みない
7. AAG framework そのものの構造変更（4 層 → N 層 等）は本 project scope 外
8. ratchet-down baseline を増加方向に戻さない
9. parent project (`phased-content-specs-rollout`) の archive process に干渉しない（独立進行）

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

### Phase 3: 既存 AR-NNN rule の audit + binding（partial）

**目的**: 自明な既製本 rule（分類 A）を即時 binding、B/C/D は後続 sprint。

**deliverable**:
- 既存 100+ rule を A/B/C/D 4 分類に audit
- 分類 A の `canonicalDocRef` 即時記入
- 分類 D（撤回判定）の sunset 計画
- audit 結果を `references/02-status/` に記録

**完了条件**: 分類 A の binding 100%、分類 D の sunset trigger 確定。

### Phase 4: Layer 2 既存 doc に back link section 追加

**目的**: canonical doc 群に `## Mechanism Enforcement` section を追加、双方向 binding 構築。

**deliverable**:
- `04-design-system/docs/` の関連 doc に section 追加
- `01-principles/` / `03-guides/` の rule 定義 doc に section 追加
- 各 section が指す AR rule ID 一覧

**完了条件**: Phase 3 分類 A の rule が、Layer 2 doc 側からも back link で見える状態。

### Phase 5: forward / reverse meta-guard 実装

**目的**: 双方向 integrity を機械検証する 2 件の meta-guard を landing。

**deliverable**:
- `canonicalDocRefIntegrityGuard.test.ts` (reverse): 各 AR rule の `canonicalDocRef` 必須 + path 実在 + doc 内に rule ID 出現
- `canonicalDocBackLinkGuard.test.ts` (forward): canonical doc の Mechanism Enforcement section が指す AR ID が実在
- 例外 allowlist の機械管理（baseline）
- 新 rule 追加時の immediate enforcement（baseline 増加方向は禁止、ratchet-down のみ）

**完了条件**: 既存 baseline で PASS、新 rule 追加 PR で immediate enforcement、循環 fail なし。

### Phase 6: 表示 rule registry 製本化（Layer 3）

**目的**: `display-rule-registry.md` を Layer 3 として新設、DFR-001〜005 を登録。

**deliverable**:
- `references/01-principles/display-rule-registry.md` 新設
- DFR-001 chart semantic color
- DFR-002 axis formatter via useAxisFormatter
- DFR-003 percent via formatPercent
- DFR-004 currency via formatCurrency（thousands separator 明文化）
- DFR-005 icon via pageRegistry / emoji canonical
- `content-and-voice.md` の "not enforced" 記述を更新

**完了条件**: DFR-001〜005 が rule entry として完全（Layer 1 source link / Layer 2 doc link / bypass pattern / 適用 path / migrationRecipe）。

### Phase 7: 表示 rule guards 実装

**目的**: DFR-001〜005 を Layer 4 で機械検証、observed drift を baseline 化。

**deliverable**:
- `displayRuleGuard.test.ts` 新設（rule registry framework）
- DFR-001〜005 を `architectureRules/defaults.ts` + `guardCategoryMap.ts` に登録
- 各 rule の baseline 確定（観測済 drift を ratchet-down 起点に）
- migrationRecipe の各 rule への記入

**完了条件**: 全 DFR rule が active、baseline で PASS、新規 drift は immediate fail。

## 5. やってはいけないこと

- **既存 AR-NNN rule の振る舞い変更** (Phase 3 で audit + binding のみ、enforcement logic 変更は別 project)
- **全 100+ rule の即座 100% 製本化** (scope creep、ratchet-down で漸次対応)
- **Phase 6 を Phase 5 より先にやる** (循環 fail、meta-guard が registry を hard fail させる)
- **dialog で観測された drift の即時修正** (Phase 7 まで開けない、順序遵守)
- **AAG framework 構造変更** (4 層 → N 層 等は別 project)
- **parent project の archive process への干渉** (parent は独立進行)
- **`adaptive-architecture-governance.md` 既存章の意味改変** (Phase 1 は新章追加のみ、Constitution 改訂相当の慎重さ)

## 6. 関連実装

| パス | 役割 |
|---|---|
| `references/01-principles/adaptive-architecture-governance.md` | AAG core 正本（Phase 1 で双方向 integrity 章を追加） |
| `references/01-principles/adaptive-governance-evolution.md` | AAG 進化方針（本 project の位置付け確認） |
| `references/01-principles/display-rule-registry.md` | Phase 6 で新設、DFR-NNN registry |
| `references/04-design-system/docs/chart-semantic-colors.md` | DFR-001 Layer 2 製本（Phase 4 で back link 追加） |
| `references/04-design-system/docs/echarts-integration.md` | DFR-002 Layer 2 製本（Phase 4 で back link 追加） |
| `references/04-design-system/docs/iconography.md` | DFR-005 Layer 2 製本（Phase 4 で back link 追加） |
| `references/04-design-system/docs/content-and-voice.md` | thousands-separator 記述更新（Phase 6） |
| `references/03-guides/coding-conventions.md` §数値表示ルール | DFR-003/004 Layer 2 製本（Phase 4 で back link 追加） |
| `app/src/test/architectureRules/defaults.ts` | rule registry（Phase 2 で schema 拡張、Phase 3/7 で entry 追加） |
| `app/src/test/guardCategoryMap.ts` | rule category（同上） |
| `app/src/test/guards/canonicalDocRefIntegrityGuard.test.ts` | Phase 5 reverse meta-guard |
| `app/src/test/guards/canonicalDocBackLinkGuard.test.ts` | Phase 5 forward meta-guard |
| `app/src/test/guards/displayRuleGuard.test.ts` | Phase 7 DFR guards |

## 7. 成功判定

- AAG core に「双方向 integrity」章が landing
- 既存 AR-NNN rule のうち分類 A（自明な既製本）が 100% binding 済
- forward / reverse meta-guard が active で違反 0
- DFR-001〜005 が registry に登録、各 baseline で PASS
- 新規 AR rule 追加時、`canonicalDocRef` 必須化が機械強制される（PR 経路で hard fail）
- parent project (`phased-content-specs-rollout`) の archive 進行に干渉なし
