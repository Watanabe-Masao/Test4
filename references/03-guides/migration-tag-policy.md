# 移行タグ運用ポリシー

## 1. 移行タグとは

移行タグ（MT-XXX）は、大規模移行作業中に一時的に Architecture Rule の例外を認める仕組み。

**「便利なダグ」ではない。** 以下を全て満たさないとタグを作れない:

1. なぜこのタグが今必要か（context）
2. 何が達成されたら外せるか（completionCriteria — 測定可能）
3. 外す時に何をすべきか（completionChecklist — 他人が迷わない精度）
4. いつまでに外すか（expiresAt）
5. 残り続けたらどうなるか（stalenessRisk）

## 2. CI の扱い

| 状態 | CI | マージ |
|------|-----|-------|
| active | warn（集計報告） | **block-merge**（入口で止める） |
| ready-to-remove | warn（除去催促） | **block-merge** |
| removed | pass | allow |

- CI は **落とさない**。作業中に CI が止まると移行が進まない
- ただし **マージは止める**。入口で見落としを防ぐ
- removed になって初めてマージが通る

## 3. タグを付ける人の責務

1. `migrationTagRegistry.ts` に全フィールドを埋めてエントリを追加する
2. `completionChecklist` は「自分以外の人が見て迷わず実行できる」レベルで書く
3. checklist の最後は必ず「除去後の確認」ステップを入れる
4. `expiresAt` は現実的な期限を設定する（最長 30 日推奨）
5. 関連する Architecture Rule の `exemptRuleId` を明記する

## 4. タグを外す人の責務

1. `completionCriteria` を全て確認する（全て true か？）
2. `completionChecklist` を **上から順に全て実行する**
3. `status` を `removed` に変更する
4. `removedAt` に日付を記入する
5. `removalNote` に簡潔な除去理由を記入する
6. `npm run test:guards` で全通過を確認する

**注意**: checklist を飛ばして status だけ変えてはならない。

## 5. ガード

`migrationTagGuard.test.ts` が以下を検証する:

| テスト | 内容 |
|-------|------|
| 期限切れ検出 | active かつ expiresAt < today → fail |
| ready-to-remove 放置 | ready-to-remove が残存 → fail |
| removed 完全性 | removed なのに removedAt なし → fail |
| completionCriteria 必須 | active で criteria 空 → fail |
| completionChecklist 最小 | active で checklist < 2 → fail |
| 確認ステップ必須 | checklist 末尾に確認なし → fail |
| 集計レポート | active/ready-to-remove の件数を報告 |

## 6. 禁止事項

1. completionCriteria なしでタグを作ってはならない
2. completionChecklist なしでタグを作ってはならない
3. expiresAt なしでタグを作ってはならない
4. checklist を実行せずに status を removed にしてはならない
5. タグを「最後まで残す」ことを前提にしてはならない

## 7. タグの寿命

- 推奨期限: 14-30 日
- 最長期限: 60 日
- 60 日を超えるタグは強制レビュー対象
- Phase 完了時に全 active タグを棚卸しする

## 8. 参照

- `app/src/test/migrationTagRegistry.ts` — タグレジストリ
- `app/src/test/guards/migrationTagGuard.test.ts` — ガード
- `references/01-principles/semantic-classification-policy.md` — 意味分類ポリシー
- `references/03-guides/directory-registry-ownership-policy.md` — レジストリ所有権
