# review-gate — スキル（論理構造 + 方法論）

## SKILL-1: PR レビュー

### 論理構造（なぜこの手順か）

- 禁止事項違反を見逃すと → 過去に発生したバグが再発する → 禁止事項は全て実際のバグから生まれた制約
- CI ゲートを確認しないと → ビルド不能・テスト失敗のコードがマージされる → 全開発者に影響
- チェック順序を守らないと → 重大な違反の前に軽微な問題で時間を浪費する → 効率的なレビューができない

### 方法論（手順）

1. 変更内容を確認する（git diff）
2. ROLE.md のチェックリストを**禁止事項 → ガードテスト → CI ゲート**の順に確認する
3. PASS / FAIL を判定する
4. 結果を pm-business に報告する

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

### 論理構造（なぜこの手順か）

- architecture の承認なしに許可リストを変更すると → 依存方向の例外が無審査で増える → 境界が形骸化する
- ファイルパスが実在しないと → INV-ARCH-06 が FAIL する → CI が壊れる
- 理由が文書化されないと → 「なぜこの例外があるのか」が不明になる → 将来の整理が困難になる

### 方法論（手順）

1. 追加理由が文書化されているか確認
2. architecture ロールの承認があるか確認
3. 追加されたファイルパスが実在するか確認
4. `npm test` で INV-ARCH-06（ファイル実在確認）が通ること確認
