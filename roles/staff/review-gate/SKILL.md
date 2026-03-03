# review-gate — スキル（手順書）

## SKILL-1: PR レビュー

成果物の品質を検査する標準手順。

### 手順

1. 変更内容を確認する（git diff）
2. ROLE.md のチェックリストを順に確認する
3. CI ゲートの結果を確認する
4. PASS / FAIL を判定する

### CI 実行コマンド

```bash
cd app && npm run lint
cd app && npm run format:check
cd app && npm run build
cd app && npm test
cd app && npm run test:e2e  # ローカルでは npx playwright install --with-deps が必要
```

### 出力テンプレート

```
## レビュー結果: PASS / FAIL

### 禁止事項チェック
- [x] #1 コンパイラ警告の黙殺なし
- [x] #2 引数無視の再計算なし
- [x] #3 依存配列の省略なし
- [x] #4 合計不一致なし
- [x] #5 domain 外部依存なし
- [x] #6 UI 生データ参照なし
- [x] #7 God Component なし

### ガードテスト
- [x] architectureGuard.test.ts: PASS
- [x] calculationRules.test.ts: PASS
- [x] divisorRules.test.ts: PASS
- [x] factorDecomposition.test.ts: PASS

### CI ゲート
- [x] lint: PASS
- [x] format: PASS
- [x] build: PASS
- [x] test: PASS (coverage: XX%)
- [x] e2e: PASS

### FAIL の場合の違反箇所
-（なし / 違反箇所リスト）
```

## SKILL-2: 許可リスト変更のレビュー

architectureGuard.test.ts の許可リスト変更を検証する。

### 確認事項

1. 追加理由が文書化されているか
2. architecture ロールの承認があるか
3. 追加されたファイルパスが実在するか
4. `npm test` で INV-ARCH-06（ファイル実在確認）が通ること
