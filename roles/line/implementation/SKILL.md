# implementation — スキル（手順書）

## SKILL-1: 機能実装

設計判断書に従い、機能を実装する標準手順。

### 手順

1. 設計判断書を確認（影響レイヤー、エンジン選択、依存方向）
2. 影響するファイルを特定し、既存コードを読む
3. 既存パターンに従って実装する（独自パターンの導入は architecture に相談）
4. テストを追加する:
   - domain/calculations/ の変更 → ユニットテスト必須
   - hooks の変更 → integration テスト推奨
   - presentation/ の変更 → Storybook ストーリー推奨
5. CI ゲートを通す:
   ```bash
   cd app && npm run lint && npm run format:check && npm run build && npm test
   ```
6. 成果物を review-gate に提出

### specialist 召喚の判断

| 変更内容 | 召喚先 | タイミング |
|---|---|---|
| `domain/calculations/` のファイル変更 | invariant-guardian | 実装前に相談 |
| 除算パターンの追加 | invariant-guardian | 実装前に相談 |
| DuckDB テーブル / クエリの追加・変更 | duckdb-specialist | 実装前に相談 |
| 新しい MetricId の追加 | explanation-steward | 実装後に確認 |
| 新チャートで usePeriodFilter 使用 | invariant-guardian | 実装後に登録依頼 |

## SKILL-2: DuckDB ウィジェット実装

DuckDB ベースのチャートウィジェットを追加する手順。

### ファイル構成

```
presentation/components/charts/
├── DuckDB[Name]Chart.tsx           — 描画コンポーネント（React.memo）
├── DuckDB[Name]Chart.styles.ts     — styled-components（必要な場合）
└── useDuckDB[Name]Data.ts          — データフック（useAsyncQuery ベース）

application/hooks/duckdb/
└── use[Category]Queries.ts         — クエリフック（既存ファイルに追加 or 新規）

infrastructure/duckdb/queries/
└── [queryModule].ts                — SQL クエリ関数
```

### 手順

1. SQL クエリ関数を `infrastructure/duckdb/queries/` に追加
2. フックを `application/hooks/duckdb/` に追加（`useAsyncQuery` ベース）
3. `hooks/duckdb/index.ts` からエクスポート
4. ウィジェットを `presentation/components/charts/` に作成
5. `isVisible` ガードで `duckDataVersion === 0` 時に非表示

## SKILL-3: テスト追加

### テストの種類と基準

| 対象 | テスト種類 | 必須度 | ツール |
|---|---|---|---|
| domain/calculations/ | ユニットテスト | **必須** | vitest |
| application/hooks/ | integration テスト | 推奨 | vitest + testing-library |
| presentation/ | Storybook | 推奨（P1） | storybook |
| E2E フロー | E2E テスト | CI で実行 | playwright |

### 不変条件テストの書き方

不変条件テストは「実装が正しい」ではなく「制約が成り立つ」をテストする:

```typescript
// NG: 実装の詳細をテスト
expect(decompose2(100, 132, 100, 110).custEffect).toBe(11000)

// OK: 不変条件をテスト
const r = decompose2(100, 132, 100, 110)
expect(r.custEffect + r.ticketEffect).toBeCloseTo(132 - 100, 2)
```

## SKILL-4: フォーマット修正

Prettier / ESLint のフォーマット問題を修正する手順。

```bash
cd app && npm run format          # Prettier 自動修正
cd app && npm run lint -- --fix   # ESLint 自動修正（--fix が安全な範囲のみ）
```

**注意**: `eslint-disable` コメントでの修正は禁止（禁止事項 #1）。
根本原因を修正すること。
