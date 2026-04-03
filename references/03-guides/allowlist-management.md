# 許可リスト運用ガイド

## 概要

全ガードテストの許可リスト（allowlist）は `app/src/test/allowlists/` ディレクトリに分割管理されている。
各エントリには `reason`（理由）、`category`（分類）、`removalCondition`（削除条件）が付与される。

### ファイル構成

> **件数の一次情報源:** `architectureStateAudit.test.ts` の snapshot 出力を参照。

| ファイル | 管理対象 |
|---|---|
| `allowlists/architecture.ts` | レイヤー境界例外 |
| `allowlists/duckdb.ts` | DuckDB hook 直接使用（凍結） |
| `allowlists/complexity.ts` | useMemo/useState/行数上限の例外 |
| `allowlists/size.ts` | ファイルサイズ上限の例外 |
| `allowlists/performance.ts` | Screen Runtime（isPrevYear, pair handler） |
| `allowlists/migration.ts` | 比較アクセスパターン（凍結） |
| `allowlists/misc.ts` | VM React import、ctx hook 等 |
| `allowlists/types.ts` | 型定義 |
| `allowlists/index.ts` | バレル re-export |

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

### Lifecycle 分類（allowlist エントリ単位）

| lifecycle | 意味 | 削除 |
|---|---|---|
| `permanent` | 構造的必然（DI adapter, 固有複雑性） | アーキテクチャ変更が必要 |
| `active-debt` | 設計作業が必要（リファクタリング, 分割, plan hook 化） | 改善計画で対応 |
| `retirement` | 互換 re-export, 移行ブリッジ | 条件達成で削除 |

> **改善計画との対応:** `references/03-guides/safety-first-architecture-plan.md` の
> Allowlist 改善計画セクションで Phase 別の削減目標を定義。

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

## P5 Migration 運用（DuckDB hook 移行）

### 移行パターン

DuckDB hook の直接使用を `useQueryWithHandler` + `QueryHandler` に移行する。

```
Before: Chart → useDuckDBXxx() → infrastructure/duckdb/queries/
After:  Chart → useQueryWithHandler(ctx.queryExecutor, xxxHandler, input) → handler → queries/
```

### 移行手順

1. `application/queries/` に QueryHandler を作成
2. Chart の DuckDB hook import を `useQueryWithHandler` に置換
3. `allowlists/duckdb.ts` の `presentationDuckdbHook` からエントリを削除
4. guard テストの `MAX_ALLOWLIST_SIZE` を減らす
5. テスト通過を確認

### 現在の状態

- **移行完了:** QueryHandler + facade hook への移行完了
- **作成済み handler:** `application/queries/` 配下に集約済み
- **最新件数:** `architectureStateAudit.test.ts` の snapshot 出力を参照

### admin 操作の分離

StorageManagementTab のような DuckDB 管理操作は query access migration の対象外。
`presentationDuckdbAdmin` として別 allowlist で管理する方針。

## CI 検証

`documentConsistency.test.ts` が以下を自動検証する：
- `@guard` タグが `GUARD_TAG_REGISTRY` に登録済みであること
- レジストリの全タグがコードベースで使用されていること
- 許可リストのファイルが実在すること（`layerBoundaryGuard.test.ts`）
