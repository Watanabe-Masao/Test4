# PR レビューチェックリスト

> 正本化体系の維持を PR レビューで保証するためのチェックリスト。

## 必須チェック項目

### 1. 正本経由の確認

- [ ] 新規の数値ロジックは定義書（`references/01-foundation/`）を参照済みか
- [ ] 粗利の取得は `getEffectiveGrossProfitRate` / `getEffectiveGrossProfit` / `grossProfitFromStoreResult` 経由か
- [ ] 仕入原価の取得は `readPurchaseCost` / `usePurchaseCost` 経由か
- [ ] 要因分解は `calculateFactorDecomposition` 経由か
- [ ] PI値は `calculateQuantityPI` / `calculateAmountPI` 経由か

### 2. 独自計算の禁止

- [ ] presentation 層で率の直接計算（`a / b`）をしていないか
- [ ] `invMethodGrossProfit ?? estMethodMargin` の raw fallback パターンを使っていないか
- [ ] widget 内で business calculation を追加していないか
- [ ] 独自の fallback ルールを局所で持っていないか
- [ ] 旧 helper / 旧 query を復活させていないか

### 3. Zod 契約

- [ ] 新規の readModel / domain calculation に Zod スキーマがあるか
- [ ] readModel 生成時は `.parse()`（fail fast）を使用しているか
- [ ] 周辺 I/O は `.safeParse()` を使用しているか

### 4. ガードテスト

- [ ] 新規の正本に対応するパスガードがあるか
- [ ] 許可リスト（allowlist）のサイズ上限を超えていないか
- [ ] `npm run test:guards` が通るか

### 5. 率の計算

- [ ] 率は「額の積み上げ → 最後に1回だけ除算」パターンに従っているか
- [ ] 率のスコープ（daily / cumulative / monthly）が明示的か
- [ ] 比率プリミティブ（ACH / YOY / GPR 等）を使用しているか
- [ ] `safeDivide` を比率計算に直接使っていないか（意味的関数を使う）

### 6. 層境界

- [ ] presentation → domain/calculations の直接 import がないか（application 経由にする）
- [ ] widget が readModel / calculateModel を直接知らない構造か（VM / facade 経由）
- [ ] domain 層に副作用（fetch, localStorage, window）がないか

### 7. CI ゲート

```bash
cd app && npm run build       # tsc + vite build
cd app && npm run lint         # ESLint 0エラー
cd app && npm run format:check # Prettier 準拠
cd app && npm run test:guards  # ガードテスト全パス
cd app && npm test             # 全テスト通過
```
