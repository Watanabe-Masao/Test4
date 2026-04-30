# legacy-retirement — aag-bidirectional-integrity

> 役割: Phase 5 (legacy 撤退) の sunset / consolidation / 補完計画を記録。
> Phase 3 (AAG Core doc audit) の findings + Phase 4 (新規書き起こし) を input に、
> 各旧 doc の判定理由 + migrationRecipe + 履歴を残す。
>
> 規約: `references/03-guides/projectization-policy.md` の Level 3 / requiresLegacyRetirement=true 対応。

## 1. 撤退対象の判定基準 (doc operation taxonomy 整合)

Phase 3 audit findings を **plan §3.5 の 7 operation taxonomy** に整合させて判定する:

| operation | 旧分類 (deprecated) | 定義 | 物理削除の trigger |
|---|---|---|---|
| **Archive** | L1 即時 sunset | 内容が完全に古い / superseded / 参照されていない | inbound 0 機械検証で確認された commit 直後 |
| **Rewrite + Archive (旧)** | L2 漸次 sunset | 内容を新名 doc で書き起こし、旧 doc は退役パス | 全 inbound reference が新 path を指し、旧 path への inbound が機械検証で 0 |
| **Merge + Archive (旧)** | L3 consolidation | 同一概念を複数 doc が articulate、1 つを正本化して他を back link 化 | 重複 doc 群が 100% back link 化、旧本体への inbound 0 |
| **Split + Rewrite** | (新規) | 1 doc に複数責務同居、複数の新 doc に分割 | 旧 doc への inbound 0 (全 inbound が新 doc 群に migrate) |
| **Rename + Relocate** | L2 / L4 部分対応 | doc 名 / 配置の変更 (内容は維持または rewrite) | 旧 path への inbound 0 |
| **Create** | L4 補完 | gap を埋める新規 doc | (退役対象なし、新規 only) |

## 1.5. archive 前 mapping 義務 (PR review #6 反映)

**重要原則**: 旧 doc を archive 移管する前に、**新 doc に「旧概念 → 新概念 mapping」を必ず articulate** すること。
特に旧 4 層 → 新 5 層への structural extension の場合、過去文脈の継承可読性を保つため:

| archive 候補 | mapping 必須先 | mapping 内容 |
|---|---|---|
| `aag-four-layer-archtecture.md` (旧 旧 4 層: Principles/Judgment/Detection/Response) | `aag/architecture.md` (新 5 層: 目的/要件/設計/実装/検証) | **2 重 mapping**: (1) 旧 4 層 (Principles等) → 新 4 層 (Constitution等)、(2) 新 4 層 → 新 5 層 (+ Layer 4 検証) |
| `aag-5-constitution.md` (新 4 層: Constitution/Schema/Execution/Operations) | `aag/architecture.md` (新 5 層) | 新 4 層 → 新 5 層 mapping (+ Layer 4 検証 = Operations subset + α) |
| `aag-5-layer-map.md` (旧 4 層 マッピング) | `aag/layer-map.md` (新 5 層 マッピング) | ファイル別 mapping の旧 → 新 transformation |
| その他 7 doc | 各新 doc | 旧概念 → 新概念 mapping (該当する場合) |

**archive 移管 trigger に追加**: 「新 doc に mapping table が landed されている」を必須条件 (inbound 0 確認と同列)。
mapping 不在で archive すると、後任が「旧 4 層 = 新 何?」「Operations は新 5 層のどこに?」を辿れない。

## 2. 段階削除原則 (anti-ritual、inbound 0 trigger)

> **絶対原則 (plan §2 不可侵原則 #7)**: 物理削除の trigger は **期間 (日数 / commits 数 等) を
> 一切使わず、参照場所が 0 になった瞬間** (inbound 0 機械検証) のみ。期間 buffer は儀式の再生産
> であり、発火条件に触れずに見落とす risk が残る。phased-content-specs-rollout Phase K Option 1
> で撤回した「90 日 review cadence」「30 commits 連続」の同型問題を本 project で再生産しない。

### 削除の 3 段階

1. **deprecation marker 段階**: `99-archive/` には移管せず、現位置に `deprecated: true` /
   `replacedBy: <new-path>` の frontmatter marker + redirect を追加。inbound reference は
   存続するが「ここは旧」を機械的に発信。
2. **archive 移管段階**: 全 inbound reference が新 path に migrate された **状態** で
   `99-archive/` へ移管。状態判定は `docRegistryGuard` / grep 等で旧 path への inbound 0 を機械確認。
3. **物理削除段階**: archive 移管後、99-archive 配下の file への inbound も 0 になった状態で物理削除。
   **即時、buffer なし**。

### 各段階の trigger 条件 (機械検証可能、期間縛り完全排除)

| 段階遷移 | trigger 条件 |
|---|---|
| 通常 → deprecation marker | Phase 3 audit で operation 判定 + 経緯 commit |
| deprecation marker → archive 移管 | **旧 path への inbound 0 (機械検証) + migrationRecipe 完備 + §1.5 mapping table が新 doc に landed (旧 4 層 → 新 5 層 等の概念継承を保つ)** |
| archive → 物理削除 | **(a) archive 配下 file への inbound 0 (機械検証、99-archive 内 reference も all clear) + (b) 人間 deletion approval** (PR review Review 3 P2 #8 反映、anti-ritual と orthogonal、grep できない参照 / 外部メモ / 過去 PR / 自然言語参照を考慮した安全装置) |

**人間 deletion approval の機械検証** (期間 buffer でなく state-based gate):
- archive file の frontmatter に `humanDeletionApproved: true` + `approvedBy: <reviewer>` + `approvedCommit: <SHA>` を必須化
- `legacyRetirementGuard.test.ts` (or 既存 docRegistryGuard 内) で物理削除前に approval 状態を機械検証
- approval なしの物理削除は hard fail
- これにより「期間 buffer なし (anti-ritual)」と「人間最終承認 (安全装置)」を両立

### 不可侵原則

- **遡及的物理削除を行わない**。3 段階を踏まずに直接 rm しない
- 各段階に独立した commit を打つ (後任が git log で経緯を追えるよう、parallel comparison 期間を確保)
- migrationRecipe を本 doc に記録 (消去 doc が指していた概念を、新どこに辿り着くべきかの指針)
- phased-content-specs-rollout の Phase K Option 1 物理削除パターン (`.skip` 化 → registry 削除 → 物理削除を別 commit) を踏襲
- **期間 (日数 / commits 数) のみで段階を進めない**。`30 日経ったから次へ` / `30 commits 連続` は anti-pattern (発火条件に触れずに見落とす risk)
- **inbound 0 が唯一の機械検証可能な archive trigger**。それ以外は禁止
- **物理削除は inbound 0 + 人間 deletion approval の両条件**。anti-ritual (期間 buffer なし) と orthogonal な安全装置として人間最終承認を保持

### observeForDays vs inbound 0 trigger 切り分け (PR review #6 反映)

既存 `app/src/test/architectureRules/defaults.ts` の `lifecyclePolicy.observeForDays` field との
衝突を回避するため、適用範囲を明示分離:

| context | trigger 種別 | 期間 buffer 許容? |
|---|---|---|
| **legacy doc 削除** (Phase 5 archive 移管 / 物理削除) | `inbound 0` 機械検証のみ + 人間 deletion approval | ❌ 禁止 (`AAG-REQ-NO-DATE-RITUAL` 適用) |
| **experimental rule 昇格 / 撤回** (既存 lifecyclePolicy) | 主 trigger は `sunsetCondition` 状態満足、`observeForDays` は **supplementary signal** (= 観測指標、trigger ではない) | ✅ 観測指標として許容、ただし trigger には使わない |
| **rule の deprecated 化** (proxy / performative 撤回) | Phase 6 audit 結果 (state-based 判定、proxy metric の articulate 等) | ❌ 期間 buffer 禁止 |

**aag/meta.md §2 で `AAG-REQ-NO-DATE-RITUAL` の説明欄に「期間ベース判断の禁止範囲」を articulate**:
- 禁止範囲: legacy doc 削除 / rule deprecated 化 / archive 移管 trigger
- 例外 (許容範囲): experimental rule 昇格 / 撤回観測 (supplementary signal、ただし trigger でなく観測のみ)

## 3. 撤退対象 list

> Phase 5 着手時に Phase 3 の `references/02-status/aag-doc-audit-report.md` を input として
> 本セクションを完全に埋める。spawn 時点では既知 archive 候補のみ pre-fill。

### 3.1. Archive (即時 archive、Phase 3 audit で確認後実施)

| doc path | 撤退理由 | 移管先 | redirect 先 |
|---|---|---|---|
| `references/99-archive/aag-four-layer-architecture.md` | 旧 4 層 (Principles/Judgment/Detection/Response) は新 4 層 (Constitution/Schema/Execution/Operations) で superseded、aag-5-constitution.md line 162 で明示済 | `99-archive/01-principles/aag-four-layer-architecture.md` | `aag/architecture.md` (新 4 層、Phase 4 で Create) |
| `references/01-principles/aag-rule-splitting-plan.md` | completed project (`projects/completed/aag-rule-splitting-execution/`、2026-04-13 archive) の execution 記録、doc 自身が冒頭で完了宣言 | `99-archive/01-principles/aag-rule-splitting-plan.md` | `projects/completed/aag-rule-splitting-execution/` |

### 3.2. Rewrite + Relocate + Rename → Archive (旧 path、Phase 4 で新規書き起こし完了後)

| 旧 path | 新 path (Phase 4 で Create) | 撤退理由 | inbound 0 機械検証対象 |
|---|---|---|---|
| `references/01-principles/aag-5-constitution.md` | `references/01-principles/aag/architecture.md` | `aag-5-` prefix 撤廃、旧 4 層構造定義 → 新 5 層構造定義に拡張 (Layer 4 検証追加、§4.1 mapping table 必須)、非目的は aag/meta.md §2.2 に移動 | grep 結果 0 件 |
| `references/99-archive/aag-5-layer-map.md` | `references/01-principles/aag/layer-map.md` | prefix 撤廃、ディレクトリ階層化 | grep 結果 0 件 |
| `references/99-archive/aag-5-source-of-truth-policy.md` | `references/01-principles/aag/source-of-truth.md` | prefix 撤廃、ディレクトリ階層化 | grep 結果 0 件 |
| `references/01-principles/aag-operational-classification.md` | `references/01-principles/aag/operational-classification.md` | ディレクトリ階層化 | grep 結果 0 件 |
| `references/99-archive/adaptive-governance-evolution.md` | `references/01-principles/aag/evolution.md` | `adaptive-` prefix 撤廃、ディレクトリ階層化 | grep 結果 0 件 |

### 3.3. Split + Rewrite + Archive (旧 path、Phase 4 で複数 doc に分割完了後)

| 旧 path | 新 path 群 (Phase 4 で Create) | Split 理由 | inbound 0 機械検証対象 |
|---|---|---|---|
| `references/01-principles/adaptive-architecture-governance.md` | `aag/strategy.md` (戦略マスター) + `aag/evolution.md` (進化動学、Merge 候補) + バージョン履歴は per-doc 分散 + 旧 4 層は Archive | 戦略 + 文化論 + 設計原則 + バージョン履歴 + 旧 4 層 + 関連文書 table が同居 (1 doc 1 責務違反、C1 違反)、責務分離のため Split | grep 結果 0 件 |

### 3.4. CLAUDE.md AAG セクション薄化 (Phase 4 で実施)

旧 「AAG を背景にした思考」 section の core 内容を `aag/meta.md` に逃がし、CLAUDE.md は
`aag/README.md` への 1 link 索引のみに薄化。retirement 対象は **section 内の content** であり
CLAUDE.md 全体の archive ではない。詳細: plan §6.3。

### 3.5. Phase 3 audit で追加識別される撤退候補 (TBD)

> Phase 3 audit 実施後、staleness / redundancy / 残存 gap 等を踏まえて本 list に追加。

| doc path | operation | 判断理由 | 機械検証 trigger |
|---|---|---|---|
| TBD | TBD | TBD | TBD |

## 4. migrationRecipe

各撤退対象の「消去された doc が指していた概念を、新たにどこから辿るべきか」を記録。

> Phase 5 実行時に、各 archive commit と同期して本セクションを埋める。

| 旧 path | 旧概念 | 新 path | 新概念 (もし変化していれば) | 移行 commit |
|---|---|---|---|---|
| `aag-four-layer-architecture.md` | 旧 4 層 (Principles/Judgment/Detection/Response) | `aag/architecture.md` | 新 4 層 (Constitution/Schema/Execution/Operations) | TBD (Phase 5) |
| `aag-rule-splitting-plan.md` | 旧 7 ルール分割計画 (G8 → 7 sub-rule) | `projects/completed/aag-rule-splitting-execution/` | 既 archive 済 execution 記録 | TBD (Phase 5) |
| `aag-5-constitution.md` | AAG 5.1.0 旧 4 層構造定義 + 非目的 | `aag/architecture.md` (新 5 層構造、§4.1 旧 4 層 → 新 5 層 mapping table 必須) + `aag/meta.md` §2.2 (非目的 → 要件 / 禁則) | 旧 4 層 → 新 5 層 (Layer 4 検証追加)、prefix 撤廃 + 責務分離 | TBD (Phase 5) |
| `aag-5-layer-map.md` | 既存 file の旧 4 層マッピング | `aag/layer-map.md` (新 5 層マッピング) | 旧 4 層 → 新 5 層 mapping、prefix 撤廃 | TBD (Phase 5) |
| `aag-5-source-of-truth-policy.md` | 正本 / 派生物 / 運用物 | `aag/source-of-truth.md` | 同概念、prefix 撤廃 | TBD (Phase 5) |
| `aag-operational-classification.md` | now/debt/review 運用区分 | `aag/operational-classification.md` | 同概念、ディレクトリ階層化 | TBD (Phase 5) |
| `adaptive-governance-evolution.md` | 進化動学 (Discovery/Accumulation/Evaluation) + ルール価値方程式 | `aag/evolution.md` | 同概念、prefix 撤廃 | TBD (Phase 5) |
| `adaptive-architecture-governance.md` | AAG マスター定義 + 文化論 + 設計原則 8 + バージョン履歴 + 旧 4 層 + 関連文書 table | Split: `aag/strategy.md` (戦略マスター) + `aag/meta.md` (一部 = AAG Meta 部分) + per-doc バージョン履歴 + Archive (旧 4 層) | 同概念群、Split で責務分離 (C1 適用) | TBD (Phase 5) |

## 5. 履歴

| 日付 | 操作 | 対象 | commit |
|---|---|---|---|
| 2026-04-29 | spawn skeleton | (本 doc) | TBD |
| 2026-04-30 | refine: inbound 0 trigger 厳格化 + 7 operation taxonomy 整合 + 既知 archive 候補 pre-fill (`aag-four-layer-architecture.md` / `aag-rule-splitting-plan.md`) + Rewrite/Relocate/Rename/Split 候補 articulate | (本 doc) | TBD (本 commit) |

## 6. 関連文書

| 文書 | 役割 |
|---|---|
| `plan.md` | Phase 5 の deliverable / 完了条件、§3.5 doc operation taxonomy + 操作順序原則 |
| `HANDOFF.md` §3.5 | 段階削除原則の経緯 (期間 buffer 不使用 = anti-ritual) |
| `references/02-status/aag-doc-audit-report.md` (Phase 3 で landing) | Phase 3 audit の input source |
| `references/99-archive/` | sunset 移管先 |
| `references/03-guides/projectization-policy.md` | requiresLegacyRetirement=true 対応 |
| `projects/completed/phased-content-specs-rollout/` Phase K Option 1 | 段階削除 pattern 参考 (`.skip` 化 → registry 削除 → 物理削除) |
| `projects/completed/aag-rule-splitting-execution/` | aag-rule-splitting-plan.md archive 後の参照先 |
