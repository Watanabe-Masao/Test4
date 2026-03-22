# 許可リスト運用ガイド

## 概要

全ガードテストの許可リスト（allowlist）は `app/src/test/allowlists.ts` に一元管理されている。
各エントリには `reason`（理由）、`category`（分類）、`removalCondition`（削除条件）が付与される。

## 型定義

```typescript
interface AllowlistEntry {
  readonly path: string
  readonly reason: string
  readonly category: 'adapter' | 'bridge' | 'lifecycle' | 'legacy' | 'structural' | 'migration'
  readonly removalCondition: string
}

interface QuantitativeAllowlistEntry extends AllowlistEntry {
  readonly limit: number
}
```

## カテゴリの意味

| category | 意味 | 例 |
|---|---|---|
| `adapter` | adapter パターンによる正当な境界越え | application/adapters/*.ts |
| `bridge` | 層間ブリッジ（型参照等） | IndexedDBRawDataAdapter |
| `lifecycle` | ライフサイクル管理 | useDataRecovery |
| `legacy` | 次回改修時に解消すべきもの | 大型コンポーネント Tier 2 |
| `structural` | 構造上不可避な正当な例外 | domain 300行超ファイル |
| `migration` | 移行完了待ち（V2比較/QueryHandler等） | DuckDB hook 直接使用 |

## エントリの追加手順

1. `allowlists.ts` の該当リストにエントリを追加
2. `reason` に追加理由を記載
3. `category` を上記から選択
4. `removalCondition` に「いつ削除できるか」を明記
5. architecture ロールの承認を得る
6. 対応するガードテストの上限値（`toBeLessThanOrEqual`）を更新

## エントリの削除手順

1. `removalCondition` が満たされたことを確認
2. `allowlists.ts` からエントリを削除
3. 対応するガードテストの上限値を減らす
4. テスト通過を確認

## 原則

- **例外が 0 であること ≠ 良いこと。** 例外を解消することで全体の設計が改善されることが重要
- 許可リストを管理する（エントリを増減する）のではなく、**許可リストが不要になる構造**を目指す
- 便宜的例外は許可理由にならない。構造で解消するか、移行計画に載せる

## CI 検証

`documentConsistency.test.ts` が以下を自動検証する：
- `@guard` タグが `GUARD_TAG_REGISTRY` に登録済みであること
- レジストリの全タグがコードベースで使用されていること
- 許可リストのファイルが実在すること（`layerBoundaryGuard.test.ts`）
