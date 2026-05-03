# AAG Evolution — 進化動学 (Discovery / Accumulation / Evaluation)

> **位置付け**: AAG architecture pattern の **Layer 1+2** (= 要件 + 設計) の進化動学 articulate doc。`architecture.md` (5 層構造定義) を realize する **進化 mechanism** の正本。
>
> **役割**: AAG (Architecture Rule / Guard / Allowlist / Health KPI / Obligation Map から成る Governance System) が「ルールは仮説」として継続検証される **3 層サイクル** (Discovery / Accumulation / Evaluation) を articulate。
>
> **drill-down pointer**:
> - 上位 (back-pointer): [`meta.md`](./meta.md) §1 (目的) + §2 (要件、`AAG-REQ-RATCHET-DOWN` + `AAG-REQ-NO-PERFECTIONISM`) / [`strategy.md`](./strategy.md) §4 (戦略の進化方針)
> - 下位 (drill-down): `references/99-archive/adaptive-architecture-governance.md` §進化動学 (旧 articulate、Phase 5 で archive) / [`operational-classification.md`](./operational-classification.md) (now/debt/review 区分)
>
> **5 層位置付け** (本 doc 自身): Layer 1+2 (要件 + 設計、進化動学 articulate)
>
> **§1.5 archive 前 mapping 義務**: 旧 `adaptive-governance-evolution.md` の archive 前提は本 doc に「旧進化動学 → 新進化動学 mapping」が landed 済 (= 本 doc §5)。

## §1 進化動学の 3 層サイクル

AAG の rule / guard / allowlist は **仮説** として運用され、3 層サイクルで継続検証される:

```
  ┌─────────────┐
  │   発見       │  人 / AI が現実を観察し、新パターンを発見
  │  Discovery   │  「これは分割すべき」「この混在は危険」
  └──────┬──────┘
         ▼
  ┌─────────────┐
  │   蓄積       │  発見を機械検証ルールに変換
  │ Accumulation │  AR-rule + guard + allowlist baseline
  └──────┬──────┘
         ▼
  ┌─────────────┐
  │   評価       │  ルール自体の価値を継続検証
  │  Evaluation  │  「このルールは改善を生んだか / 阻害したか」
  └──────┬──────┘
         │
         ├─→ ルールが有効 → 検出精度改善 → 蓄積に戻る
         ├─→ ルールが陳腐化 → 退役 (sunset、state-based trigger)
         └─→ 新パターン発見 → 発見に戻る
```

## §2 第 1 層: 発見 (Discovery)

### §2.1 原則

> **偶然の発見に頼らない。定期的に現実を観察する制度を持つ。**

AI / 人間が新パターン (responsibility 混在 / 重複 articulation / proxy metric / orphan canonical doc 等) を発見するための **Discovery Review** を制度化。

### §2.2 制度: Discovery Review

| 要素 | 内容 |
|---|---|
| **頻度** | マイルストーン完了時 (Project archive 時 / Phase 完了時) |
| **方法** | allowlist 全 entry / AR-rule binding / canonical doc registry を「本当にこの articulate で正しいか」実コードで検証 |
| **観点** | ① 分類の正確性 ② 新しい責務混在 ③ 正本経路の完全性 ④ semantic articulation の意味品質 (機械では判定不可能な「それっぽい空文」検出) |
| **成果物** | 発見した新パターンを Issue / `manifest.activeContext.workingNotes` に articulate → Accumulation phase へ |

> **注**: 期間 buffer (例: 月次 / 四半期) を **trigger には使わない** (`AAG-REQ-NO-DATE-RITUAL`)。Discovery Review の頻度は「観測 cadence」であり、archive / sunset 等の判定 trigger は state-based のみ。

### §2.3 Discovery の入力源

- **Allowlist 棚卸し** — 分類が実態と合っているか
- **Guard 回避パターンの検出** — alias 化 / rename が発生していたら、ルールの目的と手段がずれている兆候
- **新規 file の傾向分析** — 最近追加 file に新責務パターン
- **Hotspot 分析** — 変更頻度が高い file の責務混在
- **AR-rule binding 状態** — `pending` rule の長期残留 / `not-applicable` の justification 妥当性
- **PR review feedback** — review で identify された pattern を articulate

## §3 第 2 層: 蓄積 (Accumulation)

### §3.1 原則

> **ルールの目的を正本にし、検出手段は交換可能にする。**

発見したパターンは **AR-rule (`base-rules.ts`)** に articulate、guard で機械検証。検出 logic (regex / AST / 型情報) は **交換可能**、ルールの目的 (`why`) と意味 (`canonicalDocRef.refs[].problemAddressed` + `resolutionContribution`) が正本。

### §3.2 蓄積 mechanism

| 蓄積対象 | 配置先 | 検証 |
|---|---|---|
| **AR-rule 仕様** (`what` / `why` / `correctPattern` / `outdatedPattern`) | `app-domain/gross-profit/rule-catalog/base-rules.ts` (BaseRule 物理正本) | `architectureRuleGuard` |
| **検出実装** (手続的 logic) | `app/src/test/guards/<rule-name>.test.ts` | `test:guards` |
| **allowlist baseline** (例外管理) | `app/src/test/allowlists/*.ts` | `health-rules.ts` ratchet-down |
| **canonical doc 製本** (rule の supports doc) | `aag/_internal/<doc>.md` 等 | `docRegistryGuard` / `canonicalDocRefIntegrityGuard` (Phase 8 MVP) |
| **semantic binding** (AR-rule → canonical doc / requirement) | `base-rules.ts` の `canonicalDocRef` + `metaRequirementRefs` (Project B Phase 1〜2) | `semanticArticulationQualityGuard` (Phase 8 MVP) |

### §3.3 蓄積の段階

新ルールは次の段階を経て蓄積される:

```
Discovery (発見) → AR-rule articulate (Layer 2 schema) → guard 実装 (Layer 3) →
allowlist baseline 設定 (現在 violation 数を baseline に) → ratchet-down 開始 (改善は不可逆)
```

baseline は **下がる方向のみ** (`AAG-REQ-RATCHET-DOWN`)。増加方向は構造禁止。

## §4 第 3 層: 評価 (Evaluation)

### §4.1 原則

> **ルール自体が価値を持ち続けているか検証する。**

蓄積された AR-rule / guard が **改善を生んでいるか / 阻害していないか** を継続評価。陳腐化したルールは **退役 (sunset)**。

### §4.2 評価 mechanism

| 評価軸 | 判定基準 | 行先 |
|---|---|---|
| **ルールが有効** | baseline が下がっている / 新規違反が hard fail で防がれている | 検出精度改善 → 蓄積に戻る |
| **ルールが陳腐化** | baseline が長期間 0 で運用無く / 別 mechanism で防がれるようになった | 退役 (sunset)、`AR-rule` を `deprecated` 化 → 物理削除 |
| **proxy metric / performative** | 「製本されていない rule が guard 化されている」を identify | `AAG-REQ-NON-PERFORMATIVE` 違反、撤回 trigger |
| **重複 articulation** | 上位 content の copy / 下位 doc に redundant articulate | `AAG-REQ-ANTI-DUPLICATION` 違反、deduplication |

### §4.3 退役 (Sunset) の trigger

退役は **state-based trigger** のみ (`AAG-REQ-NO-DATE-RITUAL`):

| 退役対象 | trigger |
|---|---|
| **legacy doc archive** (旧 path → 99-archive 移管) | inbound 0 機械検証 + §1.5 archive 前 mapping 義務 PASS |
| **legacy doc 物理削除** (99-archive 配下 file の物理削除) | archive 配下 file への inbound 0 機械検証 + 人間 deletion approval (frontmatter `humanDeletionApproved: true`) |
| **rule deprecated 化** (proxy / performative 撤回) | audit 結果 (state-based 判定、proxy metric の articulate 等) |
| **experimental rule 撤回** | `sunsetCondition` 状態満足 (例: 関連 file 0 件 / 関連 pattern 0 件) |

期間 buffer (例: 30 日待機) は **絶対禁止** (anti-ritual)。

## §5 旧 進化動学 → 新 進化動学 mapping (`§1.5 archive 前 mapping 義務`)

旧 `adaptive-governance-evolution.md` から新 doc への概念 mapping:

| 旧 doc 内 概念 | 新 doc 内 概念 |
|---|---|
| 3 層サイクル (Discovery / Accumulation / Evaluation) | 本 doc §1 (構造維持、5 層 articulate に整合) |
| Discovery Review (月 1 回 / マイルストーン完了時) | 本 doc §2.2 (期間 buffer 禁止 = `AAG-REQ-NO-DATE-RITUAL` 反映、頻度は「観測 cadence」のみ、trigger は state-based) |
| Discovery 入力源 (Allowlist 棚卸し / Guard 回避 / Hotspot) | 本 doc §2.3 (AR-rule binding 状態 + PR review feedback を追加) |
| 蓄積 (AR-rule + guard + allowlist baseline) | 本 doc §3.2 (semantic binding の supports 追加、Project B 連携) |
| 評価 (有効 / 陳腐化 / 新パターン) | 本 doc §4 (proxy metric + performative + 重複 articulation を追加) |
| Sunset (退役) | 本 doc §4.3 (state-based trigger のみ articulate、期間 buffer 禁止を strict 化) |

## §6 非目的 (Non-goals)

本 doc は次を **articulate しない** (= 別 doc の責務):

- **5 層構造定義 + 旧 4 層 → 新 5 層 mapping** → [`architecture.md`](./architecture.md)
- **戦略 / 文化論 / 意図的に残す弱さ** → [`strategy.md`](./strategy.md)
- **ファイル別 5 層マッピング** → [`layer-map.md`](./layer-map.md)
- **正本 / 派生物 / 運用物 区分ポリシー** → [`source-of-truth.md`](./source-of-truth.md)
- **now / debt / review 運用区分** → [`operational-classification.md`](./operational-classification.md)
- **AR-rule schema (`SemanticTraceBinding<T>` 型 family)** → Project B 所掌
- **個別 rule の articulate** (検出ロジック / pattern / migrationRecipe) → `references/03-implementation/architecture-rule-system.md` + `base-rules.ts`

## §7 関連 doc

| doc | 役割 |
|---|---|
| [`meta.md`](./meta.md) | AAG Meta charter — 本 doc の上位 (§1 目的 / §2 要件) |
| [`strategy.md`](./strategy.md) | 戦略マスター — 戦略 axis での進化方針 (本 doc §1 と相補) |
| [`architecture.md`](./architecture.md) | 5 層構造定義 — 本 doc が進化させる構造 |
| [`operational-classification.md`](./operational-classification.md) | now/debt/review 区分 — Discovery 入力源の 1 つ |
| [`README.md`](./README.md) | aag/ ディレクトリ index |
| `references/03-implementation/architecture-rule-system.md` | AR-rule 運用ガイド (Layer 4A System Operations) |
| `references/03-implementation/allowlist-management.md` | allowlist 管理手順 |
| `references/03-implementation/promote-ceremony-template.md` | 昇格手順 (実験 → 正規) |
| `projects/completed/aag-bidirectional-integrity/plan.md` | 親 project の正本 |
| `projects/completed/aag-core-doc-refactor/plan.md` | 本 doc を landing する project の plan |
