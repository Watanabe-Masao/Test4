# plan — quick-fixes

## 不可侵原則

1. **1 checkbox = 1 単発 fix** — 複数の作業を 1 行に詰めない
2. **見出しでカテゴリ分けしない** — カテゴリが必要になったら独立 project にする
3. **完了したら checked にする** — 削除しない（履歴になる）
4. **archive しない** — collection は終わらない
5. **大きい文脈を持ち込まない** — 独立 project に昇格させる

## checkbox の書き方

```
* [ ] (優先度) <ファイル or スコープ>: <一文の説明>
```

例:
- `* [ ] (中) app/src/utils/foo.ts: 未使用 export `bar` を削除`
- `* [ ] (低) references/02-status/recent-changes.md: 2026-04 セクションに最新コミットを追記`
- `* [x] (高) app/src/components/X.tsx: typo "calcuate" を "calculate" に修正`

優先度は `(高) (中) (低)` のいずれか。期限がある場合は `(期限: YYYY-MM-DD)` を追加する。

## 大きい project への昇格判断

以下のいずれかに該当したら quick-fixes ではなく独立 project にする:

- 複数 phase が必要
- 関連する checkbox が 5 個以上ある
- 不可侵原則を独自に持つ
- 他の作業者に context を引き継ぐ必要がある
- 文書の更新を伴う（plan / handoff が必要なレベル）
- ハマりポイントが事前に分かっている

判断に迷ったら governance ガイド §11 を参照。

## やってはいけないこと

- 複数 fix を 1 checkbox にまとめる → 進捗管理が崩れる
- 見出しで Phase を作る → 独立 project にすべき
- 大きな refactor を入れる → 独立 project にすべき
- 期限のない（期限: 未定）項目を入れる → architecture-decision-backlog の所掌
