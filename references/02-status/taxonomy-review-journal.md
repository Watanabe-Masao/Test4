# taxonomy-review-journal — review window 記録

> **役割**: `taxonomy-v2` family の **review window**（四半期）の追加 / 撤退 / 却下記録の正本。
> Constitution 原則 3「語彙生成は高コスト儀式」+ 親 plan §OCS.4 Lifecycle State Machine の運用記録。
>
> **位置付け**: Phase 1 Constitution で **placeholder** として landing。
> 本格的な journal 形式 + 初回 review window 開催手順は **親 Phase 2（Review Window 仕様）**で確定する。
> 本 placeholder は doc-registry / Constitution / Origin Journal / CLAUDE.md §taxonomy-binding からの link 整合を保つ目的で先行配置。
>
> **改訂規律**: 本 journal の改訂は **review window** 経由のみ。
> AI が単独で entry を追加・改変することは禁止（Constitution 原則 3 + AR-TAXONOMY-AI-VOCABULARY-BINDING）。
>
> **status**: **placeholder（Phase 1 起草中、Phase 2 で本格 landing）**。

## 1. 本 journal が記録するもの

各 review window で発生した:

- **追加**: 新 R:tag / 新 T:kind / 新 Antibody Pair / Cognitive Load Ceiling 引き上げ
- **撤退**: タグの `active → deprecated → sunsetting → retired → archived` Lifecycle 遷移
- **却下**: 提案された追加・撤退・改変が承認されなかった記録

## 2. 形式（Phase 2 で確定予定）

Phase 2 で `references/03-guides/taxonomy-review-window.md` に手続き + 判定基準を確定後、本 journal の entry 形式を fixed する。

暫定 skeleton:

```markdown
## YYYY-Q-N （YYYY-MM-DD 開催）

### 追加

- **{R:|T:}{tag-name}**
  - Why: <なぜ追加するか>
  - 採択者: <ロール>
  - Antibody Pair: <対概念タグ>
  - 必須対応 T:kind / R:tag: <Interlock 上の必須対応>
  - 推定 promotionLevel: L1 / L2 / ...
  - 採択日: YYYY-MM-DD

### 撤退（active → deprecated）

- **{R:|T:}{tag-name}**
  - 撤退理由: <なぜ撤退するか>
  - replacedBy: <置換先タグ>
  - sunsetCondition: <何が起きたら retired に降格するか>
  - 撤退期限: YYYY-MM-DD（90 日以上先）

### 却下

- 提案: **{R:|T:}{tag-name}**
  - 提案者: <ロール>
  - 却下理由: <なぜ却下されたか>
```

## 3. 過去の window 記録

> Phase 2 完了 + 初回 review window 開催後に entry 追加。

（現状: entry なし。初回 window は親 Phase 2 完了後）

## 4. 関連文書

| 文書 | 役割 |
|---|---|
| `references/01-principles/taxonomy-constitution.md` | Constitution（本 journal は原則 3 + 5 + 7 の運用記録） |
| `references/01-principles/taxonomy-interlock.md` | Interlock マトリクス（追加 / 撤退で同期改訂） |
| `references/01-principles/taxonomy-origin-journal.md` | Origin Journal（追加で Origin entry 追加） |
| `references/03-guides/taxonomy-review-window.md`（Phase 2 で landing） | review window 手続き + 判定基準 |
| `projects/taxonomy-v2/plan.md` | 親 plan §OCS.4 Lifecycle / §OCS.8 Exception Policy / §OCS.9 Human Review Boundary |
| `projects/taxonomy-v2/checklist.md` Phase 2 | 本 journal の本格 landing 完了条件 |
| `CLAUDE.md` §taxonomy-binding | AI が review window 経路でのみ提案できる制約の正本 |
