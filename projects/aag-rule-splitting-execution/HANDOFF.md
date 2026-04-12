# HANDOFF — aag-rule-splitting-execution

> 役割: 起点文書。後任者が最初に読む。

## 1. 現在地

`aag-rule-splitting-plan.md` の分割計画は完成済み (2026-04)。実装は **未着手**:

```
$ grep -c "AR-RESP-" app/src/test/architectureRules/rules.ts
0
```

現状の AR-STRUCT-RESP-SEPARATION:
- guardTag: G8 (P2/P7/P8/P10/P12/P17/P18 の 7 種が同居)
- 例外数: 4（全て permanent/module-scope let → P7 / AR-RESP-MODULE-STATE 候補）

## 2. 次にやること

詳細は `checklist.md`。Phase は 3 段:

### Phase 1: 7 ルールの定義追加

`app/src/test/architectureRules/rules.ts` (もしくは facade 経由で参照される
正本ファイル) に AR-RESP-* 7 ルールを追加する。各ルールに `what` / `correctPattern`
/ `outdatedPattern` / `migrationRecipe` を持たせる。

### Phase 2: ガードの分離

現行 `responsibilitySeparationGuard.test.ts` で 7 種のパターンを 1 つの test として
回しているのを、ルール ID ごとに violation を出す形にする。

### Phase 3: 例外圧の再分類

現行の AR-STRUCT-RESP-SEPARATION 例外 4 件を AR-RESP-MODULE-STATE に再帰属
させる。これにより他 6 ルールの例外圧が 0 であることが可視化される。

## 3. ハマりポイント

### 3.1. AR-STRUCT-RESP-SEPARATION の即時削除はしない

7 ルールが安定するまで AR-STRUCT-RESP-SEPARATION を平行運用する。
ratchet-down で例外圧が新ルール側に移ったことを確認してから旧ルールを削除する。

### 3.2. ratchet baseline の引継ぎ

P7 (module-scope let) の現行 baseline を AR-RESP-MODULE-STATE にそのまま移し、
他 6 ルールは新規ルールとして baseline 0 で始める。途中で新たな違反が混入しない
ことを CI で保証する。

### 3.3. 関連 doc の更新

`references/01-principles/aag-rule-splitting-plan.md` 自身が live plan ではなく
「決定済みの計画書」になるため、本 project の Phase 完了後に doc 冒頭に
「本 plan の実行は projects/aag-rule-splitting-execution で完了済み」を追記する。

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| `references/01-principles/aag-rule-splitting-plan.md` | 分割案の正本（背景） |
| `app/src/test/architectureRules/rules.ts` | 追加ルールの置き場 |
| `app/src/test/guards/responsibilitySeparationGuard.test.ts` | G8 の現行実装 |
