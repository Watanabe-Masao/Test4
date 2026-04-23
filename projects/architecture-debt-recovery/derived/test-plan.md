# test-plan — <PROJECT-ID>

> 役割: 本 project で追加・修正する test を、ガード（G0〜G6）と
> ロジック test（L0〜L4）に分類して計画する。
>
> いつ使うか: テスト計画を先に立ててから実装したいとき。
> 判断基準: `DERIVED.md` §Q4。

---

## ガードテスト（構造制約）

### G0: ファイル配置
* [ ] <ファイル配置の guard を追加する場合の説明>

### G1: 層境界
* [ ] <層境界 guard>

### G2: 純粋性
* [ ] <domain/ pure guard>

### G3: 正本化（readModel path）
* [ ] <readModel path guard>

### G4: 不変条件
* [ ] <invariant guard>

### G5: 責務分離
* [ ] <responsibility guard>

### G6: パフォーマンス
* [ ] <size / useMemo guard>

## ロジックテスト

### L0: 単体関数
* [ ] <pure 関数の単体 test>

### L1: 組み合わせ
* [ ] <複数関数の統合 test>

### L2: hook
* [ ] <hook の render test>

### L3: コンポーネント
* [ ] <component の render test>

### L4: E2E
* [ ] <E2E シナリオ>

---

## 実行計画

```bash
(cd app && npm run test:guards)        # G0-G6
(cd app && npx vitest run <path>)      # L0-L3 の特定 suite
(cd app && npm run test:e2e)           # L4
```

## 完了判定

- ガード test 全 PASS
- ロジック test 全 PASS
- 既存 test を破壊していない
