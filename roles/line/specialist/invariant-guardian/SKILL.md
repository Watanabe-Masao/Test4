# invariant-guardian — スキル（手順書）

## SKILL-1: 不変条件の検証

計算ロジックの変更時に、全不変条件が維持されることを確認する。

### 手順

1. 変更対象のファイルを特定する
2. `references/invariant-catalog.md` で関連する不変条件 ID を確認
3. 対応するガードテストを実行:
   ```bash
   cd app && npx vitest run src/presentation/pages/Dashboard/widgets/__tests__/factorDecomposition.test.ts
   cd app && npx vitest run src/domain/calculations/__tests__/calculationRules.test.ts
   cd app && npx vitest run src/presentation/components/charts/__tests__/divisorRules.test.ts
   ```
4. 全テストが通れば OK。失敗した場合は変更を差し戻すか修正する
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

新しい計算パターンが追加された場合に、不変条件をテストとして定式化する。

### 判断基準

以下に該当する場合、ガードテストの追加が必要:
- 新しい除算パターンが 2箇所以上で使用される → RULE-D1 相当のパターン検出テスト
- 新しいフォーマット関数が作成される → 重複定義禁止テスト
- 新しいチャートが `usePeriodFilter` を使用する → `CHART_FILES_USING_PERIOD_FILTER` への登録

### 追加手順

1. 不変条件を数式または構造ルールとして定義する
2. 対応する既存テストファイルにテストケースを追加する（新ファイル作成は最終手段）
3. パラメトリックテスト（複数シナリオ）で頑健性を確認
4. `references/invariant-catalog.md` に新しい不変条件 ID を追加
5. `references/guard-test-map.md` を更新

## SKILL-3: usePeriodFilter 使用ファイルの登録

新しいチャートコンポーネントが `usePeriodFilter` を使用する場合の手順。

### 手順

1. `divisorRules.test.ts` の `CHART_FILES_USING_PERIOD_FILTER` にファイル名を追加
2. チャートが `computeDivisor` を `periodFilterUtils.ts` から import していることを確認
3. 店舗フィルタ対象なら `filterByStore` も import していることを確認
4. `npm test` で RULE-1〜6 + 網羅性テストが通ることを確認
