# AAG Core doc audit report — Phase 3 deliverable

> **役割**: AAG 関連 doc 群 (`references/01-foundation/` 配下 8 doc + `CLAUDE.md` AAG セクション) の **5 層位置付け / 責務 / write/non-write list / drill-down pointer / 必要 operation / 影響範囲 inventory / migration order** を articulate する Phase 3 audit findings。
>
> **規約**: `projects/completed/aag-bidirectional-integrity/plan.md` §4 Phase 3 + `projects/completed/aag-bidirectional-integrity/checklist.md` Phase 3 deliverable + `references/05-aag-interface/operations/deferred-decision-pattern.md` (本 audit は AI 自主判断、collection sources = grep / line count / doc 内容)。
>
> **次工程**: Phase 3 完了 hard gate decision (Phase 4〜10 split、default = follow-up project 分割) → 本 audit findings を input に Phase 1 §3 fill (cyclic refinement) + Phase 4 doc refactoring 着手。

## §0 audit summary

### §0.1 inventory (8 AAG doc + CLAUDE.md AAG セクション)

| # | doc path | inbound 数 | 行数 | 5 層位置付け | 必要 operation |
|---|---|---:|---:|---|---|
| 1 | `references/99-archive/adaptive-architecture-governance.md` | 36 | 531 | Layer 2 戦略マスター + 文化論 + 設計原則 + バージョン履歴 + 旧 4 層 (混在) | **Split + Rewrite + 部分 Archive** |
| 2 | `references/99-archive/aag-5-constitution.md` | 27 | 208 | Layer 2 構造設計 (旧 4 層) + Layer 1 非目的 (混在) | **Rewrite + Relocate + Rename + 内容分散** |
| 3 | `references/99-archive/aag-5-layer-map.md` (Phase 5.1 archived) | 10 | 174 | Layer 2 reference (ファイル別 4 層 mapping) | Rewrite + Relocate + Rename |
| 4 | `references/99-archive/aag-5-source-of-truth-policy.md` | 16 | 148 | Layer 2 reference (正本/派生物/運用物 ポリシー) | Rewrite + Relocate + Rename |
| 5 | `references/99-archive/aag-four-layer-architecture.md` | 15 | 100 | (旧 4 層 = Principles/Judgment/Detection/Response、superseded) | **即 Archive** |
| 6 | `references/99-archive/aag-operational-classification.md` | 17 | 197 | Layer 2-3 境界 (now/debt/review 運用区分) | Rewrite + Relocate |
| 7 | `references/99-archive/aag-rule-splitting-plan.md` | 21 | 174 | (completed project execution 記録) | **即 Archive** |
| 8 | `references/99-archive/adaptive-governance-evolution.md` | 18 | 214 | Layer 2 進化動学 (3 層サイクル + 価値方程式) | Rewrite + Relocate + Rename |
| 9 | `CLAUDE.md` AAG セクション | (CLAUDE.md 内 inline) | — | section-level (Layer 0+1 dynamic thinking 誘導) | **Phase 4 で薄化** (§8.13 判断 B、鉄則 quote + link) |

**合計 inbound link**: 160 file references (重複あり、unique inbound はより少)。詳細は §1.X 各 doc audit 参照。

### §0.2 主要 findings (Phase 3 audit 結論)

1. **adaptive-architecture-governance.md** が責務肥大 (戦略 + 文化論 + 設計原則 + バージョン履歴 + 旧 4 層 + 関連文書 table = 531 行)、**1 doc 1 責務 (C1) 違反**。Split 必須
2. **aag-five-layer-architecture.md** + **aag-rule-splitting-plan.md** は **即 Archive 候補** (前者は superseded、後者は completed project execution 記録)
3. **5 縦スライス境界の reshape は不要** (§4 詳細)、既存 5 スライスで十分
4. **Layer 3 / Layer 4 混在 guard は識別済** (§5 詳細)、`architectureRuleGuard.test.ts` を Phase 4 で責務分離
5. **新 5 層 ↔ 旧 4 層 mapping** は §6 で確定、Phase 4 で `aag/architecture.md` に landing
6. **Phase 3 hard gate decision (default B = follow-up project 分割) を推奨** (§7 詳細、scope 規模が Level 4 寄り)

## §1 各 doc audit (8 AAG doc + CLAUDE.md AAG セクション)

### §1.1 `adaptive-architecture-governance.md` (Split + Rewrite + 部分 Archive 候補)

- **5 層位置付け**: Layer 2 戦略マスター (混在: 文化論 + 設計原則 8 + バージョン履歴 + 旧 4 層 + 関連文書 table)
- **責務 (現状)**: 1 doc 1 責務 (C1) 違反 — **6 責務同居** (戦略 + 文化 + 設計原則 + 履歴 + 旧 4 層 + 関連文書)
- **書くべきこと (Phase 4 後の `aag/strategy.md`)**:
  - 概要 + AAG Response フロー + 4 層 (Constitution/Schema/Execution/Operations) の operational articulation
  - AAG の本質 (機械検証 + 言語化、AI との対話 interface、AI 弱点の 3 層防御)
  - 設計原則 8 件 (ルール仮説性 / Detection 交換可能 / 不可逆改善 / 回避はルール疑い / pre-commit 自動修復 / Response 薄さ / 自己品質基準 / user / AI 間 interface)
  - バージョン履歴 (v0.x〜v4.3.0) — ただし AAG v5.x 以降の articulation は本 audit 後に再構成
- **書かないこと (= 他 doc / archive に逃がす)**:
  - 旧 4 層 (Principles/Judgment/Detection/Response) section → **即 Archive** (`aag-four-layer-architecture.md` と統合 archive)
  - 「意図的に残す弱さ」 table → `aag/meta.md §1 末尾` または `aag/meta.md §2.1` (boundary articulation)
  - 「AAG が防ぐ AI の本質的弱点」 (3 層防御) → `aag/strategy.md` または `aag/meta.md §1` (目的の補強)
  - 「関連文書」 table → `aag/README.md` で代替 (本 audit で確認済)
- **drill-down pointer**: 上位 = `aag/meta.md` (要件 + 目的) ← `aag/strategy.md` (戦略実装) → 下位 = AR-rule 群 (実装) + Layer 4 audit (検証)
- **必要 operation**: **Split** (戦略 + 文化論 + 設計原則 = `aag/strategy.md` / 進化動学 = `aag/evolution.md` / 旧 4 層 = Archive) + **Rewrite** + **部分 Archive**
- **影響範囲 inventory**: inbound 36 file references (主に AAG-* AR-rule の `doc` field、CLAUDE.md AAG セクション、既存 doc 群の back link)
- **migration order**: 1. `aag/strategy.md` Create (Layer 2、戦略マスター集中) → 2. 文化論 + 設計原則 を Rewrite で含める → 3. 旧 4 層 section を archive → 4. `aag-four-layer-architecture.md` と同 archive batch で移管 → 5. inbound link 全数 migration → 6. 旧 doc archive 移管 (Phase 5)

### §1.2 `aag-5-constitution.md` (Rewrite + Relocate + Rename + 内容分散候補)

- **5 層位置付け**: Layer 2 構造設計 (旧 4 層 = Constitution/Schema/Execution/Operations) + Layer 1 非目的 (混在)
- **責務 (現状)**: 1 doc 1 責務違反 — **3 責務同居** (4 層構造定義 + 非目的 + 前提)
- **書くべきこと (Phase 4 後の `aag/architecture.md`)**:
  - 5 層構造 (Layer 0/1/2/3/4 = 目的/要件/設計/実装/検証) の articulation
  - **§4.1 (新規) 旧 4 層 → 新 5 層 mapping table** (§6 mapping を fill)
  - 各 Layer の含むもの / 責務 / 変更条件
  - 旧 AAG (v4.x) との関係 (旧 Principles/Judgment/Detection/Response → 新 Constitution/Schema/Execution/Operations)
  - 層間の依存ルール (上位 → 下位 / 下位 → 上位の双方向)
- **書かないこと (= 他 doc に逃がす)**:
  - 「非目的」 (6 項目) → `aag/meta.md §2.2 禁則` (既に `AAG-REQ-NO-*` namespace で landing 済)
  - 「前提」 (5 項目) → `aag/meta.md §1 目的` または `aag/strategy.md`
- **drill-down pointer**: 上位 = `aag/meta.md` (要件 = LAYER-SEPARATION) ← `aag/architecture.md` (構造設計) → 下位 = `aag/layer-map.md` (ファイル別 mapping) + `aag/strategy.md` (戦略マスター)
- **必要 operation**: **Rewrite + Relocate (`aag/architecture.md`) + Rename + 内容分散** (非目的 + 前提を移動)
- **影響範囲 inventory**: inbound 27 file references
- **migration order**: 1. `aag/architecture.md` Create + 5 層構造 articulate → 2. §4.1 mapping table fill → 3. 非目的 + 前提 を `aag/meta.md` に移動 (重複なし、参照 link で繋ぐ) → 4. inbound link migration → 5. 旧 doc archive 移管 (Phase 5)

### §1.3 `references/99-archive/aag-5-layer-map.md` (Phase 5.1 archived) (Rewrite + Relocate + Rename)

- **5 層位置付け**: Layer 2 reference (ファイル別 4 層 mapping)
- **責務 (現状)**: 1 doc 1 責務 (ファイル別 mapping のみ、既に clean)
- **書くべきこと (Phase 4 後の `aag/layer-map.md`)**: 全 AAG アーティファクトの **5 層 mapping** (旧 4 層から拡張、Layer 4 audit 行追加)
- **書かないこと**: なし (現状 articulate された scope を維持)
- **drill-down pointer**: 上位 = `aag/architecture.md` (5 層構造定義) ← `aag/layer-map.md` (具体 file mapping) → 下位 = 各 file (= AAG アーティファクト)
- **必要 operation**: **Rewrite (4 層 → 5 層 拡張) + Relocate + Rename**
- **影響範囲 inventory**: inbound 10 file references (相対的に少、独立性高)
- **migration order**: 1. `aag/architecture.md` の 5 層構造定義完了後 → 2. `aag/layer-map.md` Create + 4 層 mapping を 5 層に拡張 → 3. inbound migration → 4. 旧 doc archive (Phase 5)

### §1.4 `aag-5-source-of-truth-policy.md` (Rewrite + Relocate + Rename)

- **5 層位置付け**: Layer 2 reference (正本/派生物/運用物 ポリシー)
- **責務 (現状)**: 1 doc 1 責務 (正本性の判定基準 + 連鎖更新マップ、clean)
- **書くべきこと (Phase 4 後の `aag/source-of-truth.md`)**: 現状の articulation を維持 (正本 / 派生物 / 運用物 の 3 区分定義 + 一覧 + 連鎖更新マップ + 手編集禁止強制 + 正本性判定基準) + Phase 1 で landing した `aag/meta.md` を Constitution 層 正本一覧に追加
- **書かないこと**: なし (scope 維持)
- **drill-down pointer**: 上位 = `aag/architecture.md` (Schema 層定義) ← `aag/source-of-truth.md` (ポリシー詳細) → 下位 = 各正本 file
- **必要 operation**: **Rewrite (aag/meta.md 追加) + Relocate + Rename**
- **影響範囲 inventory**: inbound 16 file references
- **migration order**: 1. `aag/source-of-truth.md` Create → 2. `aag/meta.md` を Constitution 層正本に追加 articulate → 3. inbound migration → 4. 旧 doc archive (Phase 5)

### §1.5 `aag-four-layer-architecture.md` (即 Archive 候補)

- **5 層位置付け**: superseded (旧 4 層 = Principles/Judgment/Detection/Response、aag-5-constitution.md で置換済 = `aag-5-constitution.md` line 162-167 で「置換する再定義」と明示)
- **責務 (現状)**: 旧 4 層定義の articulation (現行 5 層モデルでは superseded)
- **書くべきこと**: なし (即 Archive)
- **書かないこと**: 全内容を archive 移管
- **drill-down pointer**: なし (legacy doc、新 5 層モデルでは relevance なし)
- **必要 operation**: **即 Archive** (Phase 5 で `references/99-archive/` に移管、mapping 義務 §1.5 = `aag/architecture.md` §4.1 旧 4 層 → 新 5 層 mapping table が landed されてから移管)
- **影響範囲 inventory**: inbound 15 file references (主に `aag-5-constitution.md` + `references/99-archive/aag-5-layer-map.md` (Phase 5.1 archived) + 設計 doc 群、historical 参照)
- **migration order**: 1. `aag/architecture.md` §4.1 mapping table landing → 2. inbound 15 件の参照を新 path or mapping へ migrate → 3. archive 移管 (Phase 5)

### §1.6 `aag-operational-classification.md` (Rewrite + Relocate)

- **5 層位置付け**: Layer 2-3 境界 (now/debt/review 運用区分、84 ルール内訳)
- **責務 (現状)**: 1 doc 1 責務 (rule 運用区分のみ、clean)
- **書くべきこと (Phase 4 後の `aag/operational-classification.md`)**: now/debt/review 3 区分定義 + 各区分のルール一覧 (現行 166 ルール内訳に update) + ruleClass 対応 (invariant/default/heuristic) + 集計 table
- **書かないこと**: なし (scope 維持)
- **drill-down pointer**: 上位 = `aag/strategy.md` (運用区分の意味付け、now=hard gate / debt=ratchet-down / review=Discovery Review 入力) ← `aag/operational-classification.md` (具体 rule 列挙)
- **必要 operation**: **Rewrite (ルール件数 update、84 → 166) + Relocate**
- **影響範囲 inventory**: inbound 17 file references
- **migration order**: 1. `aag/operational-classification.md` Create → 2. ルール件数 update → 3. inbound migration → 4. 旧 doc archive (Phase 5)

### §1.7 `aag-rule-splitting-plan.md` (即 Archive 候補)

- **5 層位置付け**: 旧 project execution 記録 (completed = `projects/completed/aag-rule-splitting-execution/` 2026-04-13 archive 済)、現行 design ではなく historical record
- **責務 (現状)**: doc 自身が冒頭で「completed」と articulate 済 = self-archived
- **書くべきこと**: なし (即 Archive)
- **書かないこと**: 全内容を archive 移管
- **drill-down pointer**: なし (legacy execution 記録)
- **必要 operation**: **即 Archive** (Phase 5 で `references/99-archive/` に移管、redirect 先 = `projects/completed/aag-rule-splitting-execution/`)
- **影響範囲 inventory**: inbound 21 file references (主に `architectureRules.ts` の AR-RESP-* rule の `doc` field、historical 参照)
- **migration order**: 1. AR-RESP-* rule の `doc` field を新 path (`projects/completed/aag-rule-splitting-execution/`) に migrate → 2. 他 inbound migration → 3. archive 移管 (Phase 5)

### §1.8 `adaptive-governance-evolution.md` (Rewrite + Relocate + Rename)

- **5 層位置付け**: Layer 2 進化動学 (3 層サイクル = Discovery → Accumulation → Evaluation + ルール価値方程式)
- **責務 (現状)**: 1 doc 1 責務 (進化設計、clean)
- **書くべきこと (Phase 4 後の `aag/evolution.md`)**: 現状の articulate を維持 (3 層サイクル + 蓄積プロセス + 検出精度段階 Stage 0-3 + 評価制度 + 退役条件 4 種 + 既存仕組みとの接続 table) + 新 5 層モデルとの整合 articulation
- **書かないこと**: なし (scope 維持)
- **drill-down pointer**: 上位 = `aag/meta.md` (要件 = RATCHET-DOWN + STATE-BASED) ← `aag/evolution.md` (進化動学詳細) → 下位 = Discovery Review checklist (Operations 層)
- **必要 operation**: **Rewrite + Relocate + Rename**
- **影響範囲 inventory**: inbound 18 file references
- **migration order**: 1. `aag/evolution.md` Create → 2. 5 層モデルとの整合 articulation 追加 → 3. inbound migration → 4. 旧 doc archive (Phase 5)

### §1.9 `CLAUDE.md` AAG セクション (Phase 4 で薄化、§8.13 判断 B 適用)

- **5 層位置付け**: section-level (Layer 0+1 dynamic thinking 誘導、CLAUDE.md 全体は project 全体ルール)
- **責務 (現状)**: AI session 開始時の AAG context articulate (役割の質的差異 + AAG が PASS した後の問い + dynamic thinking 誘導)
- **書くべきこと (Phase 4 後の薄化版、§8.13 判断 B 適用)**:
  - 鉄則 quote 3-5 行: 「製本されないものを guard 化しない」「期間 buffer は anti-ritual」「重複と参照を切り分ける」「AI が PASS した後に critical thinking」
  - `aag/README.md` への 1 link 索引 (Phase 1 で既に追加済)
  - `aag/meta.md` への詳細 link
- **書かないこと (= aag/meta.md に逃がす)**:
  - 「役割の質的差異」 table → `aag/meta.md §1 目的` または `aag/strategy.md`
  - 「AAG が守る範囲」 → `aag/meta.md §2 要件`
  - 「AAG が PASS した後に立ち上がる問い」 → `aag/strategy.md` (dynamic thinking のための critical thinking trigger)
  - 「動的思考の材料 (hint)」 → `aag/README.md` または `aag/strategy.md`
  - 「思考の保存方法」 → `aag/strategy.md` (manifest.activeContext 連携)
- **drill-down pointer**: CLAUDE.md (project 全体) ← AAG セクション (3-5 行 鉄則) → `aag/README.md` → `aag/meta.md` (詳細)
- **必要 operation**: **Rewrite (薄化、§8.13 判断 B)**
- **影響範囲 inventory**: CLAUDE.md 内 inline section、外部 inbound link は CLAUDE.md 自体に対するもの
- **migration order**: 1. Phase 4 で `aag/strategy.md` + `aag/meta.md` 内容確定 → 2. CLAUDE.md AAG セクションを薄化 (鉄則 quote + link) → 3. 移管した content の検索性確認 (manifest discovery hint) → 4. test-contract.json 整合性確認 (`canonicalization-tokens` 等が CLAUDE.md に依然 articulated されているか)

## §2 AR-rule canonization mapping

> 既存 100+ AR-NNN rule の **canonicalDocRef binding 候補** (= rule の意図を articulate する canonical doc を identify する mapping)。Phase 6 audit + binding 記入の input。

### §2.1 既存 AR-rule の canonical doc 紐付け状態 (architectureRuleGuard.test.ts より既測定)

166/166 ルールが doc 参照あり、46 種類のドキュメントを参照 (architectureRuleGuard.test.ts 「doc 参照カバレッジ」 出力より)。主要参照先 top 10:

| 参照 doc | rule 数 |
|---|---:|
| `references/01-foundation/design-principles.md` | 27 |
| `references/03-implementation/responsibility-separation-catalog.md` | 23 |
| `references/03-implementation/coding-conventions.md` | 13 |
| `references/03-implementation/analytic-kernel-migration-plan.md` | 7 |
| `references/03-implementation/current-maintenance-policy.md` | 7 |
| `references/03-implementation/tier1-business-migration-plan.md` | 7 |
| `references/03-implementation/contract-definition-policy.md` | 6 |
| `references/01-foundation/safe-performance-principles.md` | 6 |
| `references/01-foundation/semantic-classification-policy.md` | 5 |
| `references/04-tracking/elements/widgets/README.md` | 5 |

### §2.2 Phase 6 audit 4 分類予測 (Phase 6.1 初期 batch 候補)

| 分類 | 説明 | 推定件数 (audit 前) |
|---:|---|---:|
| **A. 既製本済 (binding 即時可)** | canonical doc 既存 + rule の意図が明示されている | ~50 件 (path guard / layer-boundary / size guard 等の自明 rule) |
| **B. 半製本** | doc に意図はあるが正本確定が必要 (例: 複数 doc に articulate 分散) | ~80 件 (responsibility / canonicalization 系 rule) |
| **C. 製本されていない (純粋 mechanism)** | 製本不要、`status='not-applicable'` で justify | ~25 件 (suppress directive / size guard / lint 連携 rule) |
| **D. 撤回判定 (proxy / performative)** | 製本されていない proxy metric を guard 化 | ~10 件 (Phase 6 audit で identify) |

**Phase 6.1 初期 batch 候補** (5-10 rule で articulation draft 生成 protocol 確定):
- AR-PATH-SALES, AR-PATH-DISCOUNT, AR-PATH-GROSS-PROFIT, AR-PATH-PURCHASE-COST, AR-PATH-CUSTOMER (path guard 5 件、自明な分類 A、各々の `*-definition.md` を canonical doc として articulate)

### §2.3 Phase 1 Requirement ID (`AAG-REQ-*`) との binding 候補

`metaRequirementRefs` field で各 AR-rule が realize する `aag/meta.md §2` 要件を articulate する。binding 候補:

| AAG-REQ | binding 候補 AR-rule (主要) |
|---|---|
| `AAG-REQ-BIDIRECTIONAL-INTEGRITY` | (Phase 8 で landing する canonicalDocRefIntegrityGuard / canonicalDocBackLinkGuard、現状 0 件) |
| `AAG-REQ-STATE-BASED-GOVERNANCE` | (Phase 5 で landing する legacyRetirementGuard 系、現状 0 件) |
| `AAG-REQ-SELF-HOSTING` | AR-AAG-DERIVED-ONLY-IMPORT, AR-AAG-NO-BASE-RULES-CONSUMER-IMPORT, AR-AAG-NO-DIRECT-OVERLAY-IMPORT (3 件) |
| `AAG-REQ-RATCHET-DOWN` | health-rules.ts 内 baseline ratchet (rule ではなく KPI レベル) |
| `AAG-REQ-LAYER-SEPARATION` | AR-A1-* (層境界 invariant 7 件) + AR-STRUCT-TOPOLOGY |
| `AAG-REQ-ANTI-DUPLICATION` | AR-CONVENTION-CONTEXT-SINGLE-SOURCE, AR-STRUCT-CANONICALIZATION |
| `AAG-REQ-SEMANTIC-ARTICULATION` | (Phase 8 で landing する semanticArticulationQualityGuard、現状 0 件) |
| `AAG-REQ-NON-PERFORMATIVE` | (Phase 8 で landing する canonicalDocRefIntegrityGuard、現状 0 件) |
| `AAG-REQ-NO-DATE-RITUAL` | (Phase 5 で legacy retirement で trigger 検証、rule ベースでは null/not-applicable) |

## §3 gap / redundancy / staleness 識別

### §3.1 staleness (古い doc、archive 候補)

| doc | staleness 理由 | 対応 |
|---|---|---|
| `aag-four-layer-architecture.md` | 旧 4 層 (Principles/Judgment/Detection/Response) は新 4 層 (Constitution/Schema/Execution/Operations) で superseded | **即 Archive** (§1.5、Phase 5) |
| `aag-rule-splitting-plan.md` | completed project execution 記録 (2026-04-13 archive 済)、現行 design ではない | **即 Archive** (§1.7、Phase 5) |

### §3.2 redundancy (重複 articulation、anti-duplication 違反候補)

| 概念 | 重複箇所 | 集約先 (Phase 4) |
|---|---|---|
| AAG identity (何であるか) | `adaptive-architecture-governance.md §概要` + `aag-5-constitution.md §前提` + `CLAUDE.md §AAG を背景にした思考` | **`aag/meta.md §1 目的`** (集約)、他 doc は pointer + 解決 articulation |
| AAG が解決する害 | `adaptive-architecture-governance.md §AAG が防ぐ AI の本質的弱点` (3 層防御) | **`aag/meta.md §1 目的`** + `aag/strategy.md` (戦略マスターでの実現方法) |
| 非目的 / してはいけないこと | `aag-5-constitution.md §非目的` + `adaptive-architecture-governance.md §意図的に残す弱さ` + `CLAUDE.md §AAG が PASS した後の問い` | **`aag/meta.md §2.2 禁則`** (既に landing 済、`AAG-REQ-NO-*` namespace) |
| 4 層構造定義 | `aag-5-constitution.md §4層定義` + `aag-five-layer-architecture.md` (旧 4 層) + `adaptive-architecture-governance.md §4 層アーキテクチャ` | **`aag/architecture.md`** (新 5 層) + §4.1 旧 4 層 → 新 5 層 mapping、他は archive |
| 進化サイクル | `adaptive-governance-evolution.md` + `adaptive-architecture-governance.md §3 層サイクル` | **`aag/evolution.md`** (集約)、他は pointer |
| 設計原則 8 | `adaptive-architecture-governance.md §設計原則` (8 原則) + `design-principles.md` (A-I+Q taxonomy) | **`aag/strategy.md` §設計原則** (8 原則 = AAG framework 自身の design principle) と `design-principles.md` (= application logic の design principle) を **責務分離** で維持 |
| ファイル別 4 層 mapping | `references/99-archive/aag-5-layer-map.md` (Phase 5.1 archived) + `aag-5-constitution.md §含むもの` (各 Layer の含む doc 例) | **`aag/layer-map.md`** (新 5 層) で集約 (Phase 4)、`aag/architecture.md` は概念定義のみ |

### §3.3 gap (articulate されていない rule / 概念)

| gap | 説明 | 解消責務 |
|---|---|---|
| Layer 4 検証 = 外部監査 lens | 旧 4 層には Layer 4 検証なし、新 5 層で追加 | `aag/meta.md §3.2` で 5 sub-audit framework articulate 済 (Phase 1)、`aag/architecture.md` で Layer 4 章として articulate (Phase 4) |
| AAG-REQ-* namespace | 旧 doc では articulate されていない (慣習的に articulate) | `aag/meta.md §2` で 12 件 landing 済 (Phase 1) |
| double-binding meta-guard | forward / reverse 双方向 integrity の機械検証 | Phase 8 MVP で landing 予定 (canonicalDocRefIntegrityGuard + canonicalDocBackLinkGuard) |
| status field (pending/not-applicable/bound) | Phase 2 schema 拡張で landing | Phase 2 で SemanticTraceBinding<T> 型として landing 予定 |
| Discovery Review checklist (新 5 層対応) | 旧 4 層 base、新 5 層対応未済 | `aag/evolution.md` Phase 4 Rewrite で 5 層対応 |

## §4 5 縦スライス境界 reshape 必要性判定

### §4.1 既存 5 縦スライス (architectureRuleGuard.test.ts より、現行 166 ルール内訳)

| スライス | rule 数 | 関心 |
|---|---:|---|
| `layer-boundary` | 12 | 層境界、依存方向、描画専用原則 |
| `canonicalization` | 62 | 正本経路、readModel、Zod、path guard |
| `query-runtime` | 7 | QueryHandler、AnalysisFrame、ComparisonScope |
| `responsibility-separation` | 36 | size / hook complexity / responsibility tags |
| `governance-ops` | 49 | allowlist、health、obligation、conventions |

(166 ルール total = 12 + 62 + 7 + 36 + 49)

### §4.2 reshape 必要性判定

**結論: 5 縦スライスの reshape は不要** (= 既存スライスで十分)。

判定 rationale:
- 各スライスが orthogonal な責務を持つ (重複なし)
- ルール件数が 7〜62 で分散、極端な過密スライス (= 分割推奨) は `canonicalization` (62) のみだが、内部の sub-domain (path guard / Zod / readModel) は AAG framework 全体の正本性に関わるため一体管理が clean
- ルール件数が極端に少ない `query-runtime` (7) は **Q カテゴリ** (Query Access Architecture) と整合、専門 scope のため統合不要
- 新スライス追加候補 (例: `doc-governance` for Phase 8 meta-guard) は **既存 governance-ops に統合** で十分 (`aag/source-of-truth.md` + `aag/meta.md` 自身の articulation で governance-ops scope に含まれる)

**Phase 3 hard gate decision の input**: 5 縦スライス境界の reshape は不要 = scope 増加の risk なし、Phase 4〜10 を本 project 内で継続するか分割するかの判断材料には影響しない。

## §5 Layer 3 / Layer 4 混在 guard identify

### §5.1 混在 guard (= Phase 4 で責務分離対象)

| guard | 現状責務 | Layer 3 (実装) 部分 | Layer 4 (検証) 部分 | Phase 4 / 8 での分離方針 |
|---|---|---|---|---|
| `architectureRuleGuard.test.ts` | rule schema 整合性 + claim/actual 照合 | rule schema の structural 整合 (id 一意 / guardTag 存在 / migrationRecipe 必須等) | doc 参照実在 / allowlist 卒業候補 / 例外圧 / sunsetCondition レビュー / 入口品質 | **Phase 8 MVP** で sub-audit に分離 (4.1 境界 = Layer 3 schema 整合 / 4.4 完備性 = Layer 4 doc 参照実在) → 一部は follow-up project |
| `docRegistryGuard.test.ts` | registry ↔ ファイル ↔ README の整合 | registry schema 整合 (構造) | claim/actual 照合 (registry 参照先 path 実在 + README inbound 双方向) | **Phase 8 MVP** で 4.4 完備性に分類 (現状の articulation 維持、責務分離不要) |
| `docCodeConsistencyGuard.test.ts` | 定義書 ↔ 実装関数 双方向リンク | (なし、純 Layer 4) | 双方向リンク機械検証 | **Phase 8 MVP** で 4.4 完備性に分類 (純 Layer 4、責務分離不要) |
| `docStaticNumberGuard.test.ts` | ハードコード数値 drift 検出 | (なし、純 Layer 4) | claim vs actual 照合 (静的数値が現実 KPI と一致) | **Phase 8 MVP** で 4.5 機能性に分類 (Phase 8 follow-up project) |
| `health-rules.ts` | KPI 評価 + Hard Gate | (なし、純 Layer 4) | KPI 閾値 (claim) vs 現実値 (actual) | **Phase 8 follow-up** で 4.5 機能性に分類 (rule baseline 維持の audit 機能) |

### §5.2 純 Layer 3 guard (実装、変更不要)

`layerBoundaryGuard.test.ts` / `topologyGuard.test.ts` / `purityGuard.test.ts` / 各 `*PathGuard.test.ts` 群 / `comparisonScopeGuard.test.ts` 等 — これらは **能動的に違反を防ぐ guard** (rule violation で hard fail)、Layer 3 implementation。

### §5.3 純 Layer 4 guard (検証、Phase 8 で sub-audit 分類のみ)

`metaRequirementBindingGuard.test.ts` (Phase 8 follow-up) / `selfHostingGuard.test.ts` (Phase 8 follow-up) / `canonicalDocRefIntegrityGuard.test.ts` (Phase 8 MVP) / `canonicalDocBackLinkGuard.test.ts` (Phase 8 MVP) — 全て新規 Create、Layer 4 検証として position。

## §6 新 5 層 ↔ 旧 4 層 (Constitution/Schema/Execution/Operations) mapping

### §6.1 mapping table

| 新 5 層 (本 project) | 旧 AAG 5.1.0 4 層 (`aag-5-constitution.md`) | 旧 AAG 4.x 4 層 (`aag-four-layer-architecture.md`、superseded) |
|---|---|---|
| **Layer 0 目的** (Purpose) | (旧 4 層に存在せず、新規) | (旧 4 層に存在せず、新規) |
| **Layer 1 要件** (Requirements) | Constitution (思想 / 不変条件 / 禁則) | Principles (思想) |
| **Layer 2 設計** (Design) | Schema + Operations 4A System Operations の structural 部分 | Judgment (判断 / 運用) + 一部 Detection |
| **Layer 3 実装** (Implementation) | Execution (検出 / 実行) + Schema の rule 仕様部分 | Detection (検出手段) |
| **Layer 4 検証** (Verification、新規) | (旧 4 層に存在せず、新規) — 一部 Operations の audit subset と重なる | Response (違反 UI) — Layer 4 とは異なる responsibility (Response = 出口 fmt、Layer 4 = 第三者監査) |

### §6.2 mapping rationale (Phase 4 で `aag/architecture.md` §4.1 に landing)

- **Layer 0 目的** は新規概念 (旧 4 層では Constitution に内包されていた「why」を独立層として articulate)
- **Layer 1 要件** は旧 Constitution の不変条件 + 禁則部分を抽出 (旧 Constitution は構造 + 不変条件混在 → 新 5 層で構造 = Layer 2 設計に分離)
- **Layer 2 設計** は旧 Schema + 旧 Operations 4A の構造的部分 (= rule 仕様 + 運用ガイド) を集約
- **Layer 3 実装** は旧 Execution + 旧 Schema の rule 検出 logic を集約 (= guard test 実装)
- **Layer 4 検証** は新規層、旧 Operations の audit subset (= Discovery Review / health 評価) を独立 layer として articulate (= AAG が AAG を audit する self-hosting の structural support)

### §6.3 旧 4 層 (Principles/Judgment/Detection/Response) との関係 (`aag-four-layer-architecture.md`、superseded)

旧 AAG 4.x の 4 層 (Principles/Judgment/Detection/Response) は AAG 5.1.0 (`aag-5-constitution.md`) で「置換する再定義」と articulated。本 audit 後の新 5 層 (目的/要件/設計/実装/検証) との 2 重 mapping:

```
旧 AAG 4.x (Principles/Judgment/Detection/Response)
  → 旧 AAG 5.1.0 (Constitution/Schema/Execution/Operations) [aag-5-constitution.md で superseded 宣言済]
  → 新 AAG 5.x (目的/要件/設計/実装/検証) [本 project で landing]
```

`aag-four-layer-architecture.md` は **即 Archive** (§1.5)、archive 移管前に `aag/architecture.md` §4.1 mapping table 内に旧 4 層 → 新 5 層の mapping を articulate (legacy-retirement.md §1.5 archive 前 mapping 義務 適用)。

## §7 Phase 3 hard gate decision input

> Phase 3 完了後 hard gate: Phase 4〜10 を本 project 内で継続 (A) or follow-up project に分割 (B、default)。

### §7.1 scope 規模 evaluation

| 指標 | 値 | 評価 |
|---|---|---|
| audit 対象 doc 数 | 9 (8 doc + CLAUDE.md AAG section) | 想定通り (8 doc 想定、CLAUDE.md 追加で 9) |
| Phase 4 doc operation 数 | Create 7 (aag/strategy + architecture + evolution + layer-map + source-of-truth + operational-classification + display-rule-registry) + Split 1 + Rewrite 6 + Archive 2 即時 + Archive 6 順次 = 22 operation | **想定超過 (10+ operation 想定)** |
| Phase 4 commit 数見積もり | 各 operation 独立 commit (parallel comparison) → 15-20 commits | **想定超過 (10+ commits)** |
| Phase 6 既存 AR-rule binding | 166 rule 全数 audit、Phase 6.1 初期 batch 5-10 → ratchet-down 漸次対応 | **想定超過 (100+ 想定だが 166 rule)** |
| 影響範囲 (inbound link 全数) | 160+ file references | **想定通り** |

### §7.2 hard gate decision 推奨

**default = B (sub-project / follow-up project に分割) を推奨**。

rationale:
- Phase 4 doc operation 22 件 + commit 15-20 件は単一 project の Phase で扱うには重い (本 project は Level 3 articulate だが実体は Level 4 寄り)
- Phase 6 既存 166 rule binding は ratchet-down で漸次対応する設計だが、scope creep の risk が現実的
- Phase 8 MVP (4.2 + 4.4) を超えた sub-audit (4.1 / 4.3 / 4.5 + selfHosting + metaRequirementBinding) は既に follow-up project に逃がす方針

**推奨分割案** (Project A〜D):

| Project | scope | 推定 size |
|---|---|---|
| Project A: AAG Core doc refactor | Phase 4 (doc Create / Split / Rewrite / Rename / Relocate) + Phase 5 (legacy 撤退) | Level 3 (15-20 commits、本 project と同等) |
| Project B: rule schema + meta-guard | Phase 2 (schema 拡張、`SemanticTraceBinding<T>`) + Phase 6 (AR-rule binding) + Phase 8 MVP (canonicalDocRefIntegrityGuard + canonicalDocBackLinkGuard + semanticArticulationQualityGuard + statusIntegrityGuard) | Level 3 |
| Project C: DFR registry + display guards | Phase 9 (DFR registry) + Phase 10 (DFR guards) | Level 2 (smaller scope) |
| Project D: legacy retirement (Phase 5 拡張版) | Phase 5 で完遂しない複雑な archive 案件 (例: `adaptive-architecture-governance.md` の Split + 部分 Archive) | Level 2 |

**本 project の MVP scope**: Phase 1 (完了) + Phase 3 (本 audit、完了予定) で **MVP 完遂**。Phase 4 以降は follow-up project (A〜D) で展開。

### §7.3 単一 project 継続 (A) を選ぶ条件

以下が全て満たされる場合のみ A を選択:
- Phase 4 commit 数を 10 件以内に圧縮できる ratiocale が articulate される (例: 各 doc Create を batch 化)
- Phase 6 binding を Phase 6.1 (5-10 rule) のみで完結させる (残 156 rule は別 project)
- Phase 8 を MVP scope (4.2 + 4.4) のみに厳格に絞る

audit findings からは A を正当化する rationale はなく、**B (分割) を推奨**。

## §8 audit 完了 articulation

本 audit (Phase 3 deliverable) は **AI 自主判断** (deferred-decision-pattern §3.1 適用) で完遂:

- **判断材料の収集元**: 各 doc の実 inbound link grep (8 doc 全件確認) + 行数 (wc -l) + content 要約 (Read) + architectureRuleGuard.test.ts 出力 (rule 数 + slice 内訳 + doc 参照カバレッジ)
- **判断者**: AI session (本 commit)
- **rationale**: 各 doc の content + scope + responsibility + redundancy を criteria として 7 項目 articulate

**Phase 3 完了確認** (checklist Phase 3 [x] flip):
- [x] 全 AAG 関連 doc に対して 7 項目 articulate (§1.1〜§1.9)
- [x] AR-rule canonization mapping (§2)
- [x] gap / redundancy / staleness 識別 (§3)
- [x] 5 縦スライス境界 reshape 判定 (§4、reshape 不要)
- [x] Layer 3 / Layer 4 混在 guard identify (§5)
- [x] 新 5 層 ↔ 旧 4 層 mapping (§6)
- [x] Phase 3 hard gate decision input (§7、default B 推奨)

**次工程** (§8.14 順序付き 3 段階の第 3 段):
- Phase 1 §3 fill (cyclic refinement、本 audit findings を `aag/meta.md §3` に反映)
- Phase 3 完了 hard gate decision (user 判断 = ユーザー review):
  - **B (分割) を AI 推奨**: Project A〜D に follow-up 分離
  - **A (単一継続)** を選ぶ場合: §7.3 条件を articulate
