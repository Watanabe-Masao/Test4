# implementation — スキル（論理構造 + 方法論）

## SKILL-1: 機能実装

### 論理構造（なぜこの手順か）

- 設計判断書なしに実装すると → 依存方向違反や不適切なレイヤー配置が発生する → architectureGuard が FAIL する
- 既存パターンを無視して独自実装すると → コードベースの一貫性が崩れる → 保守コストが増大する
- specialist を召喚せずに計算変更すると → 不変条件が破壊される → シャープリー恒等式が崩れる

### 方法論（手順）

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
6. 成果物を review-gate に報告

### specialist 召喚の判断

| 変更内容 | 召喚先 | タイミング |
|---|---|---|
| `domain/calculations/` のファイル変更 | invariant-guardian | 実装前に相談 |
| 除算パターンの追加 | invariant-guardian | 実装前に相談 |
| DuckDB テーブル / クエリの追加・変更 | duckdb-specialist | 実装前に相談 |
| 新しい MetricId の追加 | explanation-steward | 実装後に確認 |
| 新チャートで usePeriodFilter 使用 | invariant-guardian | 実装後に登録依頼 |

## SKILL-2: DuckDB ウィジェット実装

### 論理構造（なぜこの手順か）

- `useAsyncQuery` を使わないと → 古いクエリ結果が新しい結果を上書きする（レースコンディション）
- `isVisible` ガードがないと → DuckDB 未準備時にエラーが表示される → UX が壊れる
- SQL クエリを presentation 層に書くと → レイヤー違反 → architectureGuard が FAIL する

### 方法論（手順）

#### ファイル構成

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

1. SQL クエリ関数を `infrastructure/duckdb/queries/` に追加
2. フックを `application/hooks/duckdb/` に追加（`useAsyncQuery` ベース）
3. `hooks/duckdb/index.ts` からエクスポート
4. ウィジェットを `presentation/components/charts/` に作成
5. `isVisible` ガードで `duckDataVersion === 0` 時に非表示

## SKILL-3: テスト追加

### 論理構造（なぜこの手順か）

- 実装の詳細をテストすると → リファクタリングでテストが壊れる → テストが足かせになる
- 不変条件（制約）をテストすると → 実装が変わっても制約が守られる → 安全にリファクタリングできる
- domain/ のテストを省略すると → 計算バグが出荷される → ユーザーの意思決定に誤ったデータが渡る

### 方法論（手順）

| 対象 | テスト種類 | 必須度 | ツール |
|---|---|---|---|
| domain/calculations/ | ユニットテスト | **必須** | vitest |
| application/hooks/ | integration テスト | 推奨 | vitest + testing-library |
| presentation/ | Storybook | 推奨（P1） | storybook |
| E2E フロー | E2E テスト | CI で実行 | playwright |

### 不変条件テストの書き方

```typescript
// NG: 実装の詳細をテスト（リファクタで壊れる）
expect(decompose2(100, 132, 100, 110).custEffect).toBe(11000)

// OK: 不変条件をテスト（実装に依存しない）
const r = decompose2(100, 132, 100, 110)
expect(r.custEffect + r.ticketEffect).toBeCloseTo(132 - 100, 2)
```

## SKILL-4: フォーマット修正

### 論理構造（なぜこの手順か）

- `eslint-disable` で修正すると → 根本原因のバグが隠蔽される（禁止事項 #1）
- `--fix` は安全な範囲のみ修正する → 意味を変える可能性がある修正は手動で行う

### 方法論（手順）

```bash
cd app && npm run format          # Prettier 自動修正
cd app && npm run lint -- --fix   # ESLint 自動修正（--fix が安全な範囲のみ）
```

**注意**: `eslint-disable` コメントでの修正は禁止（禁止事項 #1）。根本原因を修正すること。
