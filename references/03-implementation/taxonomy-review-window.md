# taxonomy-review-window — 四半期 review window 運用ガイド

> **役割**: `taxonomy-v2` family の review window（四半期開催）の **手続き + 判定基準 + 記録形式** の運用ガイド。
>
> **位置付け**: `taxonomy-constitution.md` 原則 3「語彙生成は高コスト儀式」+ 親 plan §OCS.4 Lifecycle / §OCS.8 Exception Policy / §OCS.9 Human Review Boundary の運用詳細。本ガイドが review window の **唯一の運用手順正本**。
>
> **改訂規律**: 本ガイドの改訂は **review window 自身**で行う（メタ運用）。AI が単独で手続きを変更することは禁止（Constitution 原則 3）。
>
> **status**: **draft（Phase 2 起草中）**。Phase 2 完了 + 初回 review window 開催で `final` 候補。

## 1. review window とは何か

**「語彙生成は高コスト儀式」**（Constitution 原則 3）を実装する四半期定例ゲート。

### 開催頻度と同期ルール

- **頻度**: 四半期ごと（年 4 回）
- **同期**: 責務軸（R:_）+ テスト軸（T:_）の両方を **同一 window で裁定**する（Constitution 原則 4 Tag↔Test 双方向契約 + 親 plan §Interlock）
- **遅延許容**: 開催が四半期末を 30 日超過すると `taxonomy-health.json` の `reviewWindow.expiredProposals` 指標で警告（プロセス自体の Drift Budget 監視）

### 何が行われるか

| 操作                            | 入力                                                                          | 出力                                                                        |
| ------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **追加（add）**                 | 新 R:tag / 新 T:kind / 新 Antibody Pair / Cognitive Load Ceiling 引き上げ提案 | 採択 → registry 登録 + Origin Journal entry 追加                            |
| **撤退（retire）**              | active タグの deprecated 提案                                                 | Lifecycle 遷移開始（active → deprecated → sunsetting → retired → archived） |
| **却下（reject）**              | 上記提案の不採択                                                              | journal に却下理由を記録                                                    |
| **改訂（amend）**               | Interlock マトリクスの required T:kind 追加・削除                             | マトリクス更新 + 関連 guard baseline 調整                                   |
| **例外承認（grant exception）** | TXE-NNN 例外申請                                                              | 承認 + sunsetCondition / expiresAt 確定                                     |

## 2. 提案手順（提案者向け）

### 2.1. 提案前のセルフチェック

提案前に以下を確認する（無価値な window 招集を防ぐ）:

- [ ] **既存タグでの代替不可** — registry 登録済タグ + `R:unclassified` / `T:unclassified` で対応できないか
- [ ] **Antibody Pair の併記** — 新タグ提案には対概念タグも併記（Constitution 原則 6）
- [ ] **Origin の準備** — Why（背景）/ When（提案日）/ Who（提案者）/ Sunset 条件（撤退条件）が事前整理されている
- [ ] **必須対応の併記** — 新 R:tag なら必須 T:kind（Interlock マトリクス上の required）も同一 window で提案
- [ ] **Cognitive Load Ceiling の確認** — 軸の現語彙数 + 提案件数が **15 以下**を維持できるか

### 2.2. 提案 entry の追加

提案時に `references/04-tracking/taxonomy-review-journal.md` の **次回 window 提案リスト** に entry を追加:

```markdown
## YYYY-Q-N （予定: YYYY-MM-DD 開催）

### 提案中（draft）

#### {R:|T:}{tag-name} — {追加 / 撤退 / 改訂} 提案

| 項目                | 値                            |
| ------------------- | ----------------------------- |
| 提案者              | <ロール>                      |
| 提案日              | YYYY-MM-DD                    |
| 種別                | 追加 / 撤退 / 改訂 / 例外承認 |
| Why                 | <なぜ必要か / 撤退理由>       |
| Antibody Pair       | <対概念タグ>                  |
| 必須対応            | <対応 T:kind / R:tag>         |
| 推定 promotionLevel | L1 / L2 / ...                 |
| Sunset 条件         | <何が起きたら撤退するか>      |
| 備考                | <制約・依存・参考>            |
```

### 2.3. AI による提案の制限

AI 単独での提案は **禁止**（Constitution 原則 3 + AR-TAXONOMY-AI-VOCABULARY-BINDING）。
AI は以下のいずれかでのみ提案を反映できる:

- user reviewer が AI の文案を承認 + 自身が提案者として journal に entry 追加
- AI が `R:unclassified` / `T:unclassified` で退避し、user が後続 window で正規化提案

詳細は `CLAUDE.md` §taxonomy-binding を参照。

## 3. 開催手順（reviewer 向け）

### 3.1. 開催前準備

- 提案 entry リストを journal から抽出
- `taxonomy-health.json` の現状指標（特に Cognitive Load / interlock violations / exception 件数）を確認
- 期限超過の例外（TXE-NNN expiresAt 超過）リストを準備

### 3.2. 開催中

提案ごとに **判定基準（§4）** に従い 4 分類で裁定:

- **採択（accepted）**: 全判定基準を満たす
- **条件付き採択（conditional）**: 一部修正を経て次回確認
- **保留（postponed）**: 次回 window へ繰り越し
- **却下（rejected）**: 採択不可、journal に理由記録

### 3.3. 開催後（24 時間以内）

採択された提案を実装に反映:

| 採択種別 | 反映先                                                                    |
| -------- | ------------------------------------------------------------------------- |
| 追加     | registry / Constitution / Interlock マトリクス / Origin Journal           |
| 撤退     | registry の Lifecycle status 更新 + `replacedBy` / `sunsetCondition` 確定 |
| 改訂     | Interlock マトリクス更新 + 関連 guard baseline 調整                       |
| 例外承認 | TXE-NNN 例外 entry 確定（reason / owner / expiresAt / sunsetCondition）   |

journal に最終的な裁定結果を記録（§5 形式）。

## 4. 判定基準

### 4.1. 追加（新タグ / Antibody Pair / Ceiling 引き上げ）

採択条件（**全て満たす**）:

- [ ] **代替不可性** — 既存タグでは表現できない（提案前セルフチェック §2.1）
- [ ] **軸の単一性** — 1 タグ = 1 軸（Constitution 原則 2、軸混在禁止）
- [ ] **Antibody Pair 提示** — 対概念タグが識別可能（Constitution 原則 6）
- [ ] **Origin 完全性** — Why / When / Who / Sunset が記入済（Constitution 原則 5）
- [ ] **Interlock 提示** — R:tag なら必須 T:kind / T:kind なら検証対象 R:tag（Constitution 原則 4）
- [ ] **Cognitive Load 維持** — 採択後も軸の語彙数 ≤ 15（Constitution 原則 7）
- [ ] **promotionLevel 妥当性** — 採択 → L1 即時昇格、L2 以上は別途条件

却下条件（**いずれか該当**）:

- 既存タグで表現可能（代替不可性違反）
- 「捨て場」化リスク（v1 `R:utility` 事例の再来）
- Antibody Pair が無い（識別力なし）
- Cognitive Load Ceiling 超過（15 < 採択後語彙数）
- AI が単独提案（user提案者の代理人不在）

### 4.2. 撤退（active → deprecated → sunsetting → retired → archived）

採択条件（**全て満たす**）:

- [ ] **撤退理由の妥当性** — Sunset 条件に該当 OR 別タグへの統合 / 分割が完了
- [ ] **replacedBy 提示** — 撤退対象を使用していたファイルの移行先タグ（撤退 = 「単に消す」ではない）
- [ ] **sunsetCondition 明示** — 何が起きたら `retired` に降格するか（消費者 0 件等）
- [ ] **撤退期限** — 90 日以上先（移行猶予期間）

### 4.3. 例外承認（TXE-NNN）

採択条件（**全て満たす**）:

- [ ] **理由の妥当性** — review window で確認可能な reason（一時的な実装制約等）
- [ ] **owner 明示** — `architecture` / `implementation` 等のロール
- [ ] **expiresAt 設定** — 90 日以内が原則（長期例外は不採択）
- [ ] **sunsetCondition 設定** — 何が起きたら例外を取り下げるか

却下条件:

- 期限のない「永久例外」
- sunsetCondition 不明（撤退条件不在）
- 過去に同種例外が連続している（恒久化の兆候）

### 4.4. 改訂（Interlock マトリクス変更）

採択条件:

- [ ] **両軸同期** — R:tag に必須 T:kind を追加 / 削除する場合、対応する子 plan の Phase 3 / 6 で baseline 調整可能
- [ ] **既存タグへの影響評価** — 既存使用箇所が新マトリクスで違反にならないか確認
- [ ] **AR-TAXONOMY-INTERLOCK baseline 戦略** — 違反増加を伴う場合は ratchet-down のみ許可

## 5. 記録形式（journal entry）

裁定後の最終 journal entry は以下の形式で記録する:

```markdown
## YYYY-Q-N （YYYY-MM-DD 開催）

### 開催情報

- 開催日: YYYY-MM-DD
- 参加者: <ロール一覧>
- 議事録参照: <link or 概要>

### 採択（accepted）

#### {R:|T:}{tag-name}

| 項目             | 値                            |
| ---------------- | ----------------------------- |
| 種別             | 追加 / 撤退 / 改訂 / 例外承認 |
| 採択日           | YYYY-MM-DD                    |
| 採択者           | <ロール>                      |
| 提案者           | <ロール>                      |
| Why              | <承認された Why>              |
| Antibody Pair    | <対概念タグ>                  |
| 必須対応         | <対応 T:kind / R:tag>         |
| promotionLevel   | L1 / L2 / ...                 |
| Lifecycle status | active / deprecated / ...     |
| 備考             | <承認時の注記>                |

### 条件付き採択（conditional）

（同上の形式 + `条件:` 行を追加）

### 保留（postponed）

（同上 + `次回 window:` 行）

### 却下（rejected）

| 項目     | 値                                               |
| -------- | ------------------------------------------------ | ------------- |
| 提案     | {R:                                              | T:}{tag-name} |
| 種別     | 追加 / 撤退 / ...                                |
| 提案者   | <ロール>                                         |
| 却下理由 | <なぜ却下されたか、判定基準のどれに該当しないか> |
```

## 6. OCS との接続（plan §OCS.4 / §OCS.8 / §OCS.9）

### 6.1. OCS.4 Lifecycle State Machine

review window が Lifecycle 遷移の **唯一のゲート**（一部例外を除く）:

```text
proposed → active → deprecated → sunsetting → retired → archived
```

| 遷移                        | review window 必須? | 備考                                   |
| --------------------------- | ------------------- | -------------------------------------- |
| `proposed` → `active`       | **必須**            | 採択イベント                           |
| `active` → `deprecated`     | **必須**            | 撤退提案イベント                       |
| `deprecated` → `sunsetting` | 不要（自動）        | `sunsetCondition` 不変、期限到達で自動 |
| `sunsetting` → `retired`    | 不要（自動）        | consumer 0 件到達で自動                |
| `retired` → `archived`      | 不要（自動）        | 一定期間後                             |

### 6.2. OCS.8 Exception Policy

例外（TXE-NNN）の承認は review window のみ（§4.3）。**期限超過例外は hard fail**（plan §OCS.8）。

journal の例外 entry は次の形式:

```yaml
exceptions:
  - id: TXE-001
    rule: AR-TAXONOMY-INTERLOCK
    target: <ファイルパス>
    reason: <なぜ一時除外するか>
    owner: architecture
    expiresAt: <YYYY-MM-DD>
    sunsetCondition: <何が起きたら除外解除するか>
    grantedAt: <window 開催日>
    grantedBy: <reviewer ロール>
```

### 6.3. OCS.9 Human Review Boundary

review window で扱う対象（必須）:

- 新 R:tag / T:kind の追加
- 既存タグの retirement
- Antibody Pair の組み換え
- Cognitive Load Ceiling 引き上げ
- AR-TAXONOMY-\* rule baseline の **緩和**（増加方向）
- Interlock マトリクスの required 追加・削除
- TXE-NNN 例外承認

review window で扱わない対象（自動承認）:

- registry 登録済タグの新規ファイルへの付与
- `lastReviewedAt` 更新
- guard baseline の **ratchet-down**（減少方向のみ、増加禁止）
- low-risk tag の prose 説明の軽微な文言修正
- Lifecycle の自動遷移（`deprecated` → `sunsetting` → `retired`）

## 7. AI が review window 外で新タグ追加を試みた場合の reject 手順

### 7.1. 検出

`AR-TAXONOMY-AI-VOCABULARY-BINDING`（plan §AR-TAXONOMY-\* 仕様正本）が:

- git diff で新タグの追加検出（`R:` / `T:` で始まるシンボルの新規出現）
- 同 commit 範囲内に対応する review window record（journal entry）の存在検証
- record 不在なら hard fail

### 7.2. CI fail 時の AI 行動

CI で `AR-TAXONOMY-AI-VOCABULARY-BINDING` 違反が検出された場合、AI は次の行動を取る:

1. **新タグを使った変更を撤回**（`R:unclassified` / `T:unclassified` に置換）
2. **review window 提案 entry を起草**（journal の「提案中」セクションに追加）
3. **commit を分離**（提案 entry の追加と、`unclassified` 退避を別 commit に）
4. **user reviewer に提案 entry の確認依頼**

### 7.3. レビュー時の reviewer 行動

AI 提案を受け取った reviewer は:

- 提案内容の妥当性確認（§4 判定基準）
- 自身が提案者として journal entry を update（AI 提案 → user提案へ昇格）
- 次回 review window の議題に追加
- 該当タグを使う commit は **review window 採択後** にのみ merge 可能

## 8. 改訂手続き（メタ運用）

本ガイド自身の改訂手順:

- 軽微な文言修正（typo / 文章整理）: 通常の commit で OK（review window 不要）
- 手続き変更（§2-§7 のいずれか）: review window で承認後に改訂
- 判定基準（§4）の変更: review window で承認 + Constitution との整合確認後に改訂

## 9. 関連文書

| 文書                                                  | 役割                                                                |
| ----------------------------------------------------- | ------------------------------------------------------------------- |
| `references/01-foundation/taxonomy-constitution.md`   | 7 不可侵原則（本ガイドは原則 3 + 4 + 5 + 6 + 7 の運用）             |
| `references/01-foundation/taxonomy-interlock.md`      | Interlock マトリクス（改訂手続き §3 と本ガイド §4.4 が対応）        |
| `references/01-foundation/taxonomy-origin-journal.md` | Origin 形式（採択 entry が本 journal の Origin に転記される）       |
| `references/04-tracking/taxonomy-review-journal.md`     | 提案 / 採択 / 却下 / 例外の journal（本ガイドが定義する形式の運用） |
| `projects/active/taxonomy-v2/plan.md`                        | 親 plan §OCS.4 / §OCS.8 / §OCS.9 の正本                             |
| `CLAUDE.md` §taxonomy-binding                         | AI Vocabulary Binding（本ガイド §7 の根拠）                         |
