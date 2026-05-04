# discovery-log — aag-self-hosting-completion

> **役割**: implementation 中に発見した **scope 外** / **改善必要** / **詳細調査要** 事項の蓄積 artifact (= DA-β-003 で institute)。
> AAG 4 系統 lens (= ログ / メトリクス / 手順書 / チェックリスト) に直交する **5 系統目: 発見蓄積**。
>
> **scope 含む**: 本 project の plan 範囲外で発見した事項 / 改善 candidate / 詳細調査要事項。
> **scope 外 (= 別 doc)**: 本 project plan 範囲内事項 (= `checklist.md` / `plan.md`)、判断履歴 (= `decision-audit.md`)、doc-improvement-backlog (= P1 batch tracking、本 program 限定 self-dogfood)。
>
> **本 program 特有 articulation**: `doc-improvement-backlog.md` (= 既存) は本 program 内で institute 前から self-dogfood として運用されており、R-phase 内 P1 batch を tracking。本 `discovery-log.md` は **DA-β-003 institute 後** の発見を articulate する一般 mechanism (= 横展開可能)。本 program archive 時に doc-improvement-backlog → discovery-log の merge / rename を検討。
>
> 機械検証: `projectizationPolicyGuard` PZ-14。

## priority

| priority | 性質 | 解消 timing |
|---|---|---|
| **P1 (high)** | 本 program 内吸収可能 | 該当 phase で batch 解消 |
| **P2 (med)** | post-archive 別 program candidate | archive 後、別 program 起動判断 (= user) |
| **P3 (low)** | 揮発 / 不要判定可 | 棚卸 phase で削除判定 |

## 発見済 entry

### 2026-05-03 P1: doc-improvement-backlog.md と discovery-log.md の重複 (= self-dogfood 整合)

- **場所**: `projects/completed/aag-self-hosting-completion/doc-improvement-backlog.md` + 本 `discovery-log.md`
- **現状**: 本 program で **doc-improvement-backlog.md** を self-dogfood で先行運用 (= P1-1 + P1-2 batch tracking)、後続 user articulation で **discovery-log.md** を per-project mechanism として institute (= DA-β-003)。同 program 内に類似 doc が 2 件並存。
- **改善 / 調査内容**: 本 program archive 時に 2 doc を merge (= doc-improvement-backlog 内 entry を discovery-log に migrate + 旧 doc retire)、または rename (= doc-improvement-backlog → discovery-log で 1 本化)。post-archive で別 program candidate にする判断は不要 (= 本 program 内 self-dogfood 整合 task)。
- **trigger**: DA-β-003 institute 時 (= 2026-05-03)
- **解消 timing**: 本 program archive 直前 (= R7) もしくは別 commit (= scope 軽微、本 program 内吸収可能)
- **影響**: 1 file rename / merge、本 program のみ scope

### 2026-05-03 P2: AAG 4 系統 lens → 5 系統 lens への articulate update (= ログ / メトリクス / 手順書 / チェックリスト + 発見蓄積)

- **場所**: `projects/completed/aag-self-hosting-completion/doc-improvement-backlog.md` (4 系統 lens articulate) + 関連 doc (`references/05-aag-interface/operations/projectization-policy.md` / `project-checklist-governance.md`)
- **現状**: 本 program は **4 系統 lens** (= ログ / メトリクス / 手順書 / チェックリスト) で articulate。DA-β-003 で discovery-log を新設 = 5 系統目 articulation 必要。
- **改善 / 調査内容**: 4 系統 lens → 5 系統 lens (= + 発見蓄積) への articulate update を policy doc 全件で実施。各 active project の doc-improvement-backlog や AI_CONTEXT.md にも反映。
- **trigger**: DA-β-003 institute 時
- **解消 timing**: 本 program R5-R6 (= operational-protocol-system resume + AAG self-hosting closure articulate update) で吸収可能。または post-archive 別 program candidate。
- **影響**: 5-10 doc update

## 別 program candidate (= P2、post-archive)

(現在: 該当なし、本 program 内吸収予定)

## status

- 2026-05-03 (DA-β-003 institute): 本 discovery-log landing
- 後続: R-phase 進行中に発見を随時追記、本 program archive 直前に doc-improvement-backlog と統合判断
