# invariant-guardian — スキル（論理構造 + 方法論）

## SKILL-1: 不変条件の検証

### 論理構造（なぜこの手順か）

- 不変条件テストが落ちたのに実装を採用すると → 数学的保証が崩れる → ウォーターフォールの合計が売上差と不一致になる
- テストを緩和して通すと → 不変条件が弱体化する → 将来のバグを検出できなくなる
- 全テストを実行せずに部分テストで判断すると → 他の不変条件への波及を見落とす

### 方法論（手順）

1. 変更対象のファイルを特定する
2. `references/03-guides/invariant-catalog.md` で関連する不変条件 ID を確認
3. 対応するガードテストを実行:
   ```bash
   cd app && npx vitest run src/presentation/pages/Dashboard/widgets/__tests__/factorDecomposition.test.ts
   cd app && npx vitest run src/domain/calculations/__tests__/calculationRules.test.ts
   cd app && npx vitest run src/presentation/components/charts/__tests__/divisorRules.test.ts
   ```
4. 全テストが通れば OK。失敗した場合は変更を差し戻すか修正する（テストを緩和しない）
5. 結果を implementation に報告

### 出力テンプレート

```
## 不変条件検証結果

### 対象変更
- ファイル:
- 変更内容:

### 検証結果
- INV-SH-01〜03（シャープリー恒等式）: PASS / FAIL
- INV-SH-04（2↔3↔5 一貫性）: PASS / FAIL
- INV-DIV-01（safeDivide 経由）: PASS / FAIL
- INV-PF-01〜08（除数ルール）: PASS / FAIL / N/A

### 追加テストの必要性
- なし / あり（詳細）
```

## SKILL-2: 新ガードテストの追加

### 論理構造（なぜこの手順か）

- 新しい除算パターンが2箇所以上に存在すると → 片方だけ修正され不整合が生まれる → ガードテストで統一を強制する
- 新しいフォーマット関数が重複定義されると → 結果が微妙に異なる可能性がある → 重複禁止テストで一元化を保証する
- パラメトリックテストでないと → 特定入力でのみ成立する偽の不変条件を見逃す → ランダムデータで頑健性を確認する

### 方法論（手順）

1. 不変条件を数式または構造ルールとして定義する
2. 対応する既存テストファイルにテストケースを追加する（新ファイル作成は最終手段）
3. パラメトリックテスト（複数シナリオ）で頑健性を確認
4. `references/03-guides/invariant-catalog.md` に新しい不変条件 ID を追加
5. `references/03-guides/guard-test-map.md` を更新

### ガードテスト追加の判断基準

- 新しい除算パターンが 2箇所以上で使用される → RULE-D1 相当のパターン検出テスト
- 新しいフォーマット関数が作成される → 重複定義禁止テスト
- 新しいチャートが `usePeriodFilter` を使用する → `CHART_FILES_USING_PERIOD_FILTER` への登録

## SKILL-3: usePeriodFilter 使用ファイルの登録

### 論理構造（なぜこの手順か）

- 登録されていないチャートは → divisorRules.test.ts の網羅性テストをすり抜ける → RULE-1〜6 の遵守が検証されない
- `computeDivisor` を使わず独自に除算すると → ゼロ除算やロジック不整合のリスク → ガードテストで検出不能

### 方法論（手順）

1. `divisorRules.test.ts` の `CHART_FILES_USING_PERIOD_FILTER` にファイル名を追加
2. チャートが `computeDivisor` を `periodFilterUtils.ts` から import していることを確認
3. 店舗フィルタ対象なら `filterByStore` も import していることを確認
4. `npm test` で RULE-1〜6 + 網羅性テストが通ることを確認
