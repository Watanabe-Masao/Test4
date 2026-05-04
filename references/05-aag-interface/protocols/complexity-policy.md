# Complexity Policy — L1 / L2 / L3 (= operational-protocol-system M1 fill)

> **landed**: 2026-05-04 (= operational-protocol-system M1)
>
> **役割**: 「いまの作業はどの重さで進めるか」の判定 policy。L1 軽修正 / L2 通常変更 / L3 重変更 の 3 level + 各 level で使う既存 5 文書 + 起動条件 articulate。
>
> **位置付け**: [`task-protocol-system.md`](./task-protocol-system.md) §5 で referenced、本 doc が canonical 詳細。Task Class との関係は `task-class-catalog.md` §1 参照。

## 1. 3 level summary

| level | 性質 | 使う既存 5 文書 | DA 必須 | typical scope |
|---|---|---|---|---|
| **L1** 軽修正 | 単発 fix / typo / 軽量 doc update | `checklist.md` のみ | ❌ 不要 | 1-3 file change / 1 session 完結 |
| **L2** 通常変更 | 新機能 / 構造改善 / multi-file change | `plan.md` + `checklist.md` | △ 任意 (= L3 寄りなら articulate 推奨) | 5-30 file change / 1-3 session |
| **L3** 重変更 | architecture 変更 / breaking change / multi-program | `plan.md` + `checklist.md` + `decision-audit.md` まで | ✅ **必須** | 30+ file change / multi-session / 1,000+ inbound update |

## 2. AAG-COA との関係 (= 立ち上げ前判定)

`references/05-aag-interface/operations/projectization-policy.md` (AAG-COA) は **立ち上げ前** に「どの重さの project にすべきか」を Level 0-4 で判定。本 policy は **立ち上げ後 + 1 task 単位** で「どの重さで進めるか」を L1-L3 で判定。

| AAG-COA Level | typical Complexity Level | 性質 |
|---|---|---|
| Level 0 (Task) | L1 | task 化不要 (= quick fix 級) |
| Level 1 (Lightweight Project) | L1-L2 | 軽量 project (= 1 deliverable) |
| Level 2 (Standard Project) | L2 | 標準 project (= 5 文書揃い) |
| Level 3 (Architecture Refactor) | L3 | architecture 変更 |
| Level 4 (Critical Project) | L3 | 不可侵原則 articulate 必須 |

= AAG-COA Level は project 全体の重さ、Complexity Level は 1 task の重さ (= 同 project 内で task 別に L1-L3 が混在し得る)。

## 3. 各 level の routing

### 3.1 入口判定 flow

```
[task 着手]
  │
  ├── 1 file 内修正 + behavior 不変 + 1 session で完遂可能？ ─ YES → L1
  │
  ├── 5-30 file change or multi-Phase plan が必要？ ── YES → L2
  │
  └── 30+ file change or breaking change or 1,000+ inbound update？ ── YES → L3
```

= 判定迷ったら **L1 → L2 → L3** の昇格方向で進める (= drawer Pattern 4 honest articulation、無理に L1 で進めず必要に応じて昇格)。

### 3.2 L1 軽修正 routing

**使う文書**: `checklist.md` のみ (= per-project)

**手順**:
```
1. 修正対象 articulate (= 1 文)
2. 修正実施 (= 1 file 内が原則)
3. 関連 test PASS 確認
4. checklist.md update (= 当該 checkbox を [x])
5. atomic commit + push
```

**触らない**: `plan.md` / `decision-audit.md` / `discovery-log.md` (= over-ritual 回避)

**典型例**:
- typo 修正 (= 1 file)
- comment update (= 1 file)
- inbound reference fix (= 1-3 file)
- guard baseline ratchet-down (= 1 file、numeric only)
- quick-fixes project の 1 entry

**antipattern**:
- L1 で plan.md を articulate (= over-ritual、L2 に escalate すべき)
- L1 で multi-file change (= L2 に昇格判定必要)

### 3.3 L2 通常変更 routing

**使う文書**: `plan.md` + `checklist.md` (= per-project)

**手順**:
```
1. plan.md を読む (= 不可侵原則 + Phase 構造 + 観測点)
2. 該当 Phase の checklist 確認
3. Phase 着手判断 articulate (= 1-2 文 articulate、DA 不要)
4. 実装 + 検証 (= test:guards + lint + build)
5. checklist.md update + plan.md status update (該当時)
6. atomic commit + push
```

**触らない判断**: `decision-audit.md` (= L2 で DA 不要、L3 寄りなら articulate 推奨)

**典型例**:
- 新 feature 追加 (= 5-30 file)
- refactor (= 構造改善、behavior 不変)
- 新 doc 追加 (= references/ 配下 1-3 doc)
- 新 guard 追加 (= 単一 guard、ratchet-down 制度的)
- multi-Phase project の 1 Phase 完遂

**antipattern**:
- L2 で plan.md なし着手 (= scope discipline 不在、drawer Pattern 2 違反)
- L2 で behavior change (= TC-3 Bug Fix or TC-4 New Capability に escalate)
- L2 で multi-program scope に拡大 (= L3 に escalate)

### 3.4 L3 重変更 routing

**使う文書**: `plan.md` + `checklist.md` + `decision-audit.md` まで (= per-project) + 必要に応じて `discovery-log.md`

**手順**:
```
1. plan.md 通読 (= 不可侵原則 + Phase 構造)
2. 該当 Phase の checklist 確認
3. decision-audit.md に DA entry articulate (= 5 軸 + 観測点 + Lineage 仮 sha)
4. judgement commit に annotated tag landing
5. rollback-target commit に annotated tag landing
6. 実装 + 検証 (= test:guards + lint + build + observation tests)
7. checklist.md update + decision-audit.md Lineage 実 sha update
8. discovery-log.md に scope 外発見追記 (該当時)
9. atomic commit + push (= drawer Pattern 1 application)
```

**必須**: DA institute (= drawer Pattern 1)、観測点 articulate、振り返り判定 (= 正しい / 部分的 / 間違い)

**典型例**:
- structural reorganization (= directory rename + 1,000+ inbound update)
- module split (= L3 refactor)
- breaking change (= API 互換性破壊)
- multi-program coordination (= cross-program structural change)
- new framework / new architecture institute

**antipattern**:
- L3 で DA articulate 漏れ (= drawer Pattern 1 違反、rollback path 不在)
- L3 で振り返り判定 skip (= 学習 lose)
- L3 で 1 commit 完遂試行 (= rollback 不可、small atomic commits 整合違反)

## 4. 動的昇格・降格 (= M3 で詳細化、AI judgement)

> **scope 外**: 自動昇格判定 (= AI が機械的に昇格判断、guard 化) は本 protocol scope 外。各 trigger は **AI judgement に委ねる** = AI が trigger 該当を発見したら user に articulate して判断 escalate (= drawer Pattern 4 honest articulation 整合)。

### 4.1 昇格 trigger (= L1 → L2 / L2 → L3)

session 進行中に以下のいずれかが判明したら、現 level を一段昇格する判断を user に articulate:

| # | trigger | from → to | 該当例 |
|---|---|---|---|
| **P1** | **Authority に touch** (= unwritten rule / norm / 主管 user 領域に近づく) | L1 → L2 / L2 → L3 | rollback / archive / migration 判断 / 不可侵原則改変 |
| **P2** | **plan.md non-goal / 不可侵原則 に近づく** | L1 → L2 / L2 → L3 | scope 拡大 / 既存 articulate 改変要請 / 副次 program scope に侵入 |
| **P3** | **schema / contract / merge policy 変更**が必要 | L2 → L3 | API 互換性破壊 / DB schema 変更 / Standard 8 軸 articulate 改変 |
| **P4** | **generated artifact / sync guard 整合** が必要 | L1 → L2 / L2 → L3 | docs:generate 反映必須 / ratchet-down baseline 改変 / merged artifact 再生成 |
| **P5** | **当初想定より複数軸にまたがる** (= cross-program / cross-feature scope) | L2 → L3 | 想定 1 program → 2+ program / 想定 1 feature → multiple feature impact |
| **P6** | **checklist 局所項目で閉じなくなった** (= 複数 phase に跨る or DA 起票必須) | L1 → L2 / L2 → L3 | 1 checkbox 追加で済まない / Phase 着手判断必要 / DA institute 必須 |
| **P7** | **multi-file change が必要と判明** | L1 → L2 | 1 file 修正 → 5+ file 修正に拡大 |
| **P8** | **behavior change が含まれると判明** | TC-2 Refactor → TC-3/TC-4、L 不問で task class 切替 | refactor が parity 維持できない / spec 変更含む |
| **P9** | **1,000+ inbound update / structural reorganization** が判明 | L2 → L3 | directory rename / module split / 大規模 path migration |
| **P10** | **breaking change** が判明 | L2 → L3 | API 後方互換性破壊 / public interface 変更 |

= **昇格 trigger 10 件** articulate (= M3 観測点 1 「≥ 6 件」を 4 件超過で達成)。

### 4.2 降格 trigger (= L2 → L1 / L3 → L2)

session 進行中に以下のいずれかが判明したら、現 level を一段降格する判断を user に articulate:

| # | trigger | from → to | 該当例 |
|---|---|---|---|
| **D1** | **既存方針の範囲内** で完遂可能 (= 新規 articulate 不要) | L2 → L1 / L3 → L2 | 想定変更が既 articulate された pattern 内 / 既存 contract で吸収可能 |
| **D2** | **Authority / Contract に touch しない** (= 不可侵境界に侵入なし) | L3 → L2 | structural reorganization 想定が patch level 修正に縮小 |
| **D3** | **checklist 局所項目だけで閉じる** (= 単一 phase / 単一 checkbox 完遂) | L2 → L1 | 想定 plan refactor が 1 file edit で完遂 |
| **D4** | **候補比較不要** (= 採用案が一意確定、判断 alternatives 不要) | L3 → L2 | 既知 pattern 適用が唯一の合理的選択 |
| **D5** | **想定より scope 小と判明** | L2 → L1 | 想定 5 file change → 1 file change |
| **D6** | **1 file 内で完遂可能** | L2 → L1 | multi-file change 想定 → 1 file 抽象化で吸収 |
| **D7** | **architecture 影響なしと判明** | L3 → L2 | structural change 想定 → contract 内吸収 |

= **降格 trigger 7 件** articulate (= M3 観測点 2 「≥ 4 件」を 3 件超過で達成)。

### 4.3 昇格時手順 (= 途中で plan.md / decision-audit を起こす経路)

session 進行中に昇格 trigger 該当が判明した場合の手順:

#### 4.3.1 L1 → L2 昇格手順

```
1. trigger を articulate (= 上記 P1-P10 のどれが該当か 1 文)
2. user に切替 escalate (= 「L1 で進めていましたが、〜のため L2 に切り替えます」)
3. user 承認後:
   a. 該当 project に plan.md が存在するか確認 (= L2 で plan.md 必須)
   b. plan.md 存在しない場合: 簡易 plan.md を articulate (= 不可侵原則 + Phase 構造 + scope 外、最小 3 section)
   c. plan.md 存在する場合: 該当 Phase の checklist を確認、Phase 着手判断 articulate
4. 以降は session-protocol.md §3.3 L2 routing で実行
5. session 終了時に session-protocol.md §4.1 L2 required artifacts で update
```

#### 4.3.2 L2 → L3 昇格手順

```
1. trigger を articulate (= P1-P10 のどれが該当か 1 文)
2. user に切替 escalate
3. user 承認後:
   a. decision-audit.md に DA entry articulate (= 5 軸 + 観測点 + Lineage 仮 sha)
   b. judgement commit 予定 / preJudgement commit 予定を articulate
   c. (任意) judgement / rollback-target tag を articulate (= AI infrastructure で tag 不可なら SHA 直接参照で代替)
4. 以降は session-protocol.md §3.4 L3 routing で実行
5. session 終了時に session-protocol.md §4.1 L3 required artifacts (= decision-audit.md DA Lineage update 含む) で update
6. Phase 完遂時に DA 振り返り判定 (= 正しい / 部分的 / 間違い)
```

#### 4.3.3 L1 → L3 直接昇格 (= 稀 case)

L1 開始 task が突然 L3 trigger (= P3 / P5 / P9 / P10 等) 該当する場合:

```
1. trigger 重大性を articulate (= なぜ L1 → L3 直接昇格が必要か 2-3 文)
2. user に切替 escalate (= 通常は L1 → L2 → L3 段階的が望ましい、直接昇格は exceptional)
3. user 承認後:
   a. 即座に session pause (= 部分 commit or stash で working state 保護)
   b. plan.md 起票 (= L2 昇格手順 §4.3.1 step 3b)
   c. decision-audit.md 起票 (= L3 昇格手順 §4.3.2 step 3a)
   d. (推奨) 別 session に分離 (= L3 重変更を 1 session で完遂試行は L3 antipattern §3.4)
```

### 4.4 降格時手順 (= 単純化、artifact retire は不要)

降格は新 artifact 起票なし、**既存 artifact の使い方を簡素化** する:

```
1. trigger を articulate (= D1-D7 のどれが該当か 1 文)
2. user に切替 escalate (= 「L2 で進めていましたが、〜のため L1 に切り替えます」)
3. user 承認後:
   a. 既起票 plan.md / decision-audit.md は retire しない (= 既起票なら fact、削除すると lose)
   b. 以降の session 進行を新 level の routing で実行
4. session 終了時に新 level の required artifacts で update (= L1 なら checklist のみ)
```

= 降格は「既起票 artifact の追加 update を skip する」だけで、retire / 削除は不要。

### 4.5 動的判定の articulation (= drawer Pattern 4 self-application)

昇格・降格時に user に articulate する template:

```
「現状を L<旧> で進めていましたが、<P/D-番号> trigger (= <trigger 内容 1 文>)
 のため L<新> に切り替えます。
 必要な追加 artifact: <plan.md / decision-audit.md / 等 or なし>。
 続行してよいですか？」
```

= scope discipline (= drawer Pattern 2) 整合、user に判断を escalate (= AAG-REQ-NO-AI-HUMAN-SUBSTITUTION)。

### 4.6 trigger 該当時の AI judgement 範囲

AI が **自動判定** してよいこと:
- trigger 該当の **発見** (= P1-P10 / D1-D7 のいずれかが当てはまるか観察)
- user への **escalate** (= 切替提案を articulate)

AI が **自動判定してはいけない** こと:
- trigger 該当の **確定** (= user 承認なしに level 切替実行)
- 切替後の **新 artifact 自動起票** (= plan.md / decision-audit.md は user 承認後のみ起票)
- trigger 該当の **無視** (= 「軽微」judgement で escalate skip、AAG-REQ-NO-AI-HUMAN-SUBSTITUTION 違反)

= scope discipline (= drawer Pattern 2) 整合、user に判断を escalate。

## 5. 既存 5 文書との use-case mapping

| 文書 | L1 | L2 | L3 |
|---|---|---|---|
| `AI_CONTEXT.md` | 読 (= bootstrap 時のみ) | 読 (= bootstrap 時のみ) | 読 |
| `HANDOFF.md` | 読 + 必要時 update | 読 + update | 読 + update |
| `plan.md` | 触らない | **読 + Phase status update** | **読 + Phase status update** |
| `checklist.md` | **update** | **update** | **update** |
| `decision-audit.md` | 触らない | 触らない (= L3 寄りなら articulate) | **DA entry + Lineage** |
| `discovery-log.md` | 必要時 entry | 必要時 entry | 必要時 entry |

## 6. AAG-REQ との整合

| 関連 AAG-REQ | 本 policy での適用 |
|---|---|
| AAG-REQ-NO-PERFECTIONISM | over-ritual 回避 (= L1 で plan.md 触らない) |
| AAG-REQ-NON-PERFORMATIVE | observable functioning 確保 (= 全 level で test PASS / observable verify) |
| AAG-REQ-NO-DATE-RITUAL | 期間 buffer なし (= state-based 進行、calendar 観測なし) |
| AAG-REQ-ANTI-DUPLICATION | 既存 mechanism 優先 (= 新 doc 追加は不可侵原則 articulate) |
| AAG-REQ-SEMANTIC-ARTICULATION | 軽さ・重さの articulation (= L1/L2/L3 で読む文書を articulate) |

## 7. 判定迷う case の handling

### 7.1 「L1 か L2 か」迷う

→ **L1 で着手**、scope 拡大が判明したら昇格 (= drawer Pattern 4 application)。

### 7.2 「L2 か L3 か」迷う

→ **L3 寄りなら DA articulate** (= drawer Pattern 1 application、psychological safety 確保)。後で「不要だった」判定でも institution は機能 (= AAG Pilot 19 reframes / rollback 0 件で実証済)。

### 7.3 「complexity 不明確 + scope 不明確」

→ user に articulate を escalate (= 「scope を articulate してから level 判定したい」)。AI 単独判断を避ける (= AAG-REQ-NO-AI-HUMAN-SUBSTITUTION 整合)。

## 8. status

- 2026-05-04: M1 fill (= 本 doc landing、4 doc 同時)
- M3: 動的昇格・降格ルール詳細化 (= §4 trigger を articulate refine)
- M5: drawer `_seam` を使った最小統合 (= taskHint / consumerKind / sourceRefs 経由で本 policy へ reach)
