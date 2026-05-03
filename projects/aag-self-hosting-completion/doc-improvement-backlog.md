# doc-improvement-backlog — aag-self-hosting-completion

> **役割**: R-phase 進行中に発見した doc 改善 candidate の **live tracking artifact**。
> 本 phase は **調査 + 評価 + 検討** (= user articulation 反映)、即時 fix ではない。
> R3c (= 旧 mention 撤退 phase) で batch 解消、または P2-P3 は別 program candidate に逃がす。
> 本 backlog は user articulation (= 本 session、「もっと改修しながら探してまとめて直す」flow) を反映。

## 整理 lens (= user articulation 反映、本 session): doc 4 系統 articulate

doc は本質的に **4 系統** に articulate できる:

| 系統 | 性質 | 配置 (= 新構造前提) |
|---|---|---|
| **ログ** | 状態・現在地・判断履歴・変更履歴 (= 時系列記録) | HANDOFF.md (active project 配下) (現在地) + decision-audit.md (active project 配下) (判断履歴) + `references/04-tracking/recent-changes.generated.md` (変更履歴) |
| **メトリクス** | 健全性・進捗・品質・境界違反・coverage (= 機械観測 state) | `references/04-tracking/dashboards/*.generated.md` + `references/04-tracking/elements/<id>/quality-status.generated.md` + `references/04-tracking/elements/<id>/open-issues.generated.md` |
| **手順書** | 目的・scope・phase・実行順序・非目標 (= 計画 + protocol) | plan.md (active project 配下) (per-project) + AI_CONTEXT.md (active project 配下) (per-project) + `references/05-aag-interface/protocols/*.md` (= operational-protocol-system M1-M5 deliverable、共通 protocol) |
| **チェックリスト** | 完了条件・phase 別観測点・user 承認 (= verification spec) | checklist.md (active project 配下) |

### 役割分担の articulate (= 混同禁止)

| 重複 risk | 注意 |
|---|---|
| **ログ vs 手順書** | HANDOFF.md (= ログ) に手順を書きすぎると plan.md (= 手順書) と重複。HANDOFF = **現在地 + 次にやること** に純化、手順は plan.md に articulate |
| **手順書 vs ログ** | plan.md (= 手順書) に進捗を書きすぎると HANDOFF.md (= ログ) と checklist.md (= チェックリスト) と重複。plan = **計画 + 不可侵原則** に純化、進捗は HANDOFF.md / checklist.md に articulate |
| **ログ vs チェックリスト** | decision-audit.md (= 判断ログ) に完了条件を書きすぎると checklist.md (= チェックリスト) と重複。decision-audit = **判断履歴 + 振り返り** に純化、完了条件は checklist.md に articulate |
| **projects/ vs references/04-tracking/** | projects/ は **作業単位 lens** (= 進行管理)、メトリクス本体は **references/04-tracking/** に寄せる。active project directory (`projects/<active>/` R6 後) には **進行に必要な最低限の状態のみ** (= HANDOFF / checklist / decision-audit) を置く |

### 推奨 boundary articulate

```
active project directory (`projects/<active>/` R6 後)    = 作業単位ごとのログ + 計画 + チェックリスト
references/              = 正本・手順 + AI 向け knowledge interface
  04-tracking/           = メトリクス・状態観測 (= 機械生成 dashboard + per-element status)
  05-aag-interface/      = AAG public interface (= drawer + protocols + operations)
  01-foundation/         = 業務 domain 正本 (= 主アプリ業務知識)
  02-design-system/      = UI design system
  03-implementation/     = 実装ガイド
```

= **4 系統が物理 path で structural separation** された state が ideal。本 program R3-R6 で達成予定 (= 4 系統 lens は本 program の structural foundation と整合)。

### 3 layer articulate (= user articulation 反映、本 session): 分けるだけでなく機能 + 価値

4 系統 lens は **1 layer 目** に過ぎない。**完成形** には 3 layer 必要 (= user articulation で順次 refinement):

| layer | articulate | 本 program 内 達成 phase |
|---|---|---|
| **1. 分離** (= structural separation) | 4 系統を物理 path で structural separation | R3-R6 (= directory rename + relocate + per-element + projects split) |
| **2. 提供** (= AAG 基本機能 として provide) | 4 系統 boundary を **AAG 基本機能** として provide (= guard で機械検証 / collector で機械生成 dashboard / template で新規 bootstrap 強制 = AAG が boundary を **能動的に enforce + facilitate** する mechanism) | R6 + R7 (= 7 guard 集約 + boundaryIntegrityGuard + pre-commit hook 統合 + selfHostingGuard 拡張 + _template/ migrate) |
| **3. 価値** (= 実務で value 生成 mechanism) | 4 系統 boundary を **日常作業で actively used** にする mechanism (= AI session 開始時に正しい lens で reach / 改修中に boundary 違反を即時通知 / 改修完了時に該当 lens への成果物 articulate を促進 / 機械観測 metrics で日常的に boundary 健全性可視化) | post-R7 別 program (= operational-protocol-system M1-M5 が **value layer** の主実装、本 program は layer 1 + 2 の foundation のみ) |

= 本 program が達成するのは **layer 1 (分離)** + **layer 2 (提供)** の foundation。**layer 3 (価値)** は operational-protocol-system M1-M5 (= Task Protocol / Session Protocol / Complexity Policy) で **day-to-day workflow に組み込まれて value 生成**。

→ 順序: 本 program (layer 1+2 foundation) → operational-protocol-system (layer 3 value mechanism、= R5 で resume + 新構造前提 plan refinement で M1-M5 articulate) という flow が articulated 整合。

## scope

含む: 旧構造前提 articulate / 用語不統一 / AI parse 困難な構造 / 重複 / 過剰 / 情報欠落 / 別 doc 集中管理 candidate / **4 系統 lens 違反** (= ログ ↔ 手順書 混同 / metrics 配置違反 等)。
含まない: 内容追加 (= 不可侵原則 2a)、主アプリ business logic 変更 (= 不可侵原則 1)、AAG framework articulate 内容変更 (= R6 例外を除く)。

## 改善 priority

| priority | 性質 | timing |
|---|---|---|
| **P1 (high)** | 旧構造前提 doc / 用語不統一 (= R-phase 内で吸収可能) | R2 + R3c で実施 |
| **P2 (med)** | AI 向け改修 / 重複削減 (= scope 中) | post-R7 別 program candidate |
| **P3 (low)** | reader taxonomy 共通化 (= scope 大) | post-R7 別 program candidate |

## 発見済 improvement (= 2026-05-02 時点、R-phase 進行で随時追記)

### P1-1: 用語統一 (= 「人間」→ 「user」)

- **場所**: 全 doc 横断 (= references / aag/_internal / projects / CLAUDE.md)
- **現状**: 「人間」「人」「user」「reviewer」が混在 (= 同 doc 内でも混在 case あり)
- **改善**: 「**user**」に統一 (= 「user 承認」→「user 承認」、「user mandatory 点」→「user mandatory point」、etc.)
- **解消 phase**: R3c (= 旧 mention 撤退時に grep + sed bulk)
- **影響**: ~150 箇所推定

### P1-2: 「主アプリ改修 user」表記の冗長

- **場所**: aag/README.md / references/README.md / projects/ root README / CLAUDE.md / 各 plan
- **現状**: 「主アプリ改修 user」が長い、「主アプリ改修 user」「主アプリ改修 user」も併存
- **改善**: 「**主アプリ改修 user**」に統一 (= 上記 P1-1 と同 lens)
- **解消 phase**: R3c

### P1-3: 「ハマりポイント」表記の AI parse 性向上

- **場所**: 全 HANDOFF.md (= projects/_template + 各 active project)
- **現状**: 「ハマりポイント」section、prose 形式
- **改善**: **「想定 pitfall」 section** (= AI grep 容易) + 各 pitfall に **trigger keyword bold** + **avoid pattern** articulate
- **解消 phase**: R6 (= projects/_template/ migrate と同時)

### P1-4: drawer doc + AAG operations 4 doc の冒頭 reader articulate refine

- **場所**: `references/03-implementation/{decision-articulation-patterns,projectization-policy,project-checklist-governance,new-project-bootstrap-guide,deferred-decision-pattern}.md`
- **現状**: 旧構造 (= references/01-foundation/aag/ への back-link articulated、sed で path は update 済だが意味文脈は旧前提)
- **改善**: R2 で `references/05-aag-interface/` に移動時に冒頭で **reader = 主アプリ改修 user** + **新 3 tree boundary** 文脈を refine
- **解消 phase**: R2 (= relocate と同時)
- **影響**: 5 doc

### P1-5: aag/_internal/{meta,strategy,architecture}.md の冒頭 reader articulate refine

- **場所**: aag/_internal/ 9 doc
- **現状**: 旧 references/01-foundation/aag/ 配置前提で articulate (= aag/_internal/ への移動を反映していない)
- **改善**: 冒頭で **reader = AAG framework 改修者のみ** + **主アプリ改修 userは読まない** boundary 警告 articulate (= aag/README.md と整合)
- **解消 phase**: R2 もしくは R6 (= self-hosting closure update と同時)
- **影響**: 9 doc (ただし内容変更は不可侵原則 2a 違反 risk、冒頭注記のみ追加で対応)

### P2-1: 構造化 (= AI parse 容易な table / ID 化)

- **場所**: `references/03-implementation/coding-conventions.md` / `invariant-catalog.md` / 各業務 doc
- **現状**: prose 形式で規約 / 不変条件が articulate
- **改善**: **規約 ID** (= `CC-001`...) で table 化、grep-able + cross-reference 容易
- **解消 phase**: post-R7、別 program candidate
- **scope**: 主要 doc 10-15 件

### P2-2: 重複 articulation 削減

- **場所**: aag/_internal/{meta,strategy,architecture}.md (= AAG-REQ / 5 層 / 構造 articulate 重複)、各 program plan + checklist (= 不可侵原則 + Phase 構造重複)
- **改善**: canonical / derivation 分離 articulate (= meta = AAG-REQ canonical / strategy = 戦略 only / architecture = 構造 only、cross-link で connect)
- **解消 phase**: post-R7、別 program candidate (= 不可侵原則 2a 違反 risk 高、慎重に)

### P3-1: reader taxonomy 共通化

- **場所**: 全 doc 横断
- **現状**: 各 doc で「reader = ~」articulate が重複 articulate
- **改善**: 共通 doc で **reader taxonomy** (= 主アプリ改修 user / AAG framework 改修者 / 全 reader / etc.) を canonical articulate、各 doc は taxonomy 経由で reference
- **解消 phase**: post-R7、別 program candidate

## R-phase 内吸収 plan (= P1)

| Phase | 吸収する improvement | rationale |
|---|---|---|
| R2 | P1-4 (= 5 doc 移動時に冒頭 reader refine) | 移動 phase で内容軽微 update が低 cost |
| R3c | P1-1 + P1-2 (= 用語統一 grep + sed bulk) | 旧 mention 撤退 phase の natural extension |
| R6 | P1-3 (= HANDOFF template ハマりポイント refine) | _template/ migrate phase で同時実施 |
| R6 | P1-5 (= aag/_internal/ 9 doc 冒頭 refine、不可侵原則 2a 例外として meta.md self-hosting closure と同 batch) | self-hosting closure update と同 phase |

## 別 program candidate (= P2-P3、post-R7)

| candidate | scope | trigger 条件 |
|---|---|---|
| **doc structural refinement** | P2-1 (= 規約 ID 化、table 化、AI parse 改善) | 本 program R7 完了 + user 判断 |
| **重複 articulation 削減** | P2-2 (= AAG framework articulate 内 重複削減、不可侵原則 2a 例外として慎重) | 本 program archive 完了 + user 判断 |
| **reader taxonomy 共通化** | P3-1 (= 共通 doc + 全 doc reference 化) | 上記 doc structural refinement と統合 candidate |

## 追加発見 articulation (= R-phase 進行中に追記)

### R-phase 進行中に発見

R2 / R3 / R4 / R5 / R6 / R7 の各 phase で発見した improvement を本 section に追記。各 entry は priority + 場所 + 現状 + 改善 + 解消 phase で articulate。

(現在: R0 + R1 完了時点、追加発見なし。R2 着手時から本 section に accumulate)

## status

- 2026-05-02 (R0 + R1 完了): 本 backlog landing、user articulation (= 「もっと改修しながら探してまとめて直す」flow) 反映
- R2-R7 進行中: 改善発見を随時追記
- R3c 完了: P1-1 + P1-2 batch 解消
- 本 program archive: P1 全完遂、P2-P3 は別 program candidate に articulate
