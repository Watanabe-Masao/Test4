# pm-business — スキル（手順書）

## SKILL-1: タスク分解

人間からのタスクを受け取り、ロール別の作業に分解する。

### 手順

1. タスクの内容を理解する
2. CLAUDE.md §ルーティング表 で主ロールと連携先を特定する
3. 受入基準を定義する（測定可能な条件にする）
4. 作業項目と順序を決定する

### 出力テンプレート

```
## タスク分解書

### タスク概要
（人間からの依頼内容）

### 受入基準
- [ ] （測定可能な条件1）
- [ ] （測定可能な条件2）
- [ ] CI 5段階ゲート通過

### 作業分解
1. [architecture] （設計判断の内容）
2. [implementation] （実装内容）
3. [invariant-guardian] （不変条件の確認）← 該当する場合のみ
4. [review-gate] 禁止事項チェック + CI 確認
5. [documentation-steward] ドキュメント更新 ← 該当する場合のみ

### 連携順序
architecture → implementation → review-gate
```

## SKILL-2: 完了判定

review-gate の結果と受入基準を照合し、タスクの完了を判定する。

### 手順

1. review-gate の結果（PASS / FAIL）を確認する
2. PASS の場合、受入基準の各項目が満たされているか確認する
3. 全項目 OK → 完了
4. 不足がある場合 → implementation に追加作業を指示する

## SKILL-3: 用語統一チェック

UI テキストや変数名がドメイン用語規則に従っているか確認する。

### チェックリスト

- [ ] 推定法の文脈で「粗利」を使っていないか（→「推定マージン」を使う）
- [ ] 在庫法のカードが緑系アクセント（sc.positive）を使っているか
- [ ] 推定法のカードがオレンジ系アクセント（palette.warningDark）を使っているか
- [ ] KpiCard に badge prop（actual / estimated）が設定されているか
