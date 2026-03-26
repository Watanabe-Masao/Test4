# コーディング規約

> 管理責任: implementation ロール

## 命名規則

| 対象 | 規則 | 例 |
|---|---|---|
| 型・インターフェース | PascalCase | `StoreResult`, `DailyRecord` |
| 変数・関数 | camelCase | `totalSales`, `calculateGrossProfit` |
| 定数 | UPPER_SNAKE_CASE | `COST_RATE_MIN`, `ALL_STORES_ID` |
| コンポーネント | PascalCase | `DashboardPage`, `KpiCard` |
| テストファイル | `*.test.ts(x)` | `factorDecomposition.test.ts` |
| Boolean | is/has/should/needs 接頭辞 | `isCalculated`, `hasPrevYear` |

## TypeScript

- **strict mode 有効**（tsconfig.app.json）
- `noUnusedLocals: true` / `noUnusedParameters: true` — ビルドで強制
- パスエイリアス: `@/` → `src/`（import は `@/domain/...` の形式）
- `readonly` を積極的に使用（イミュータブル設計）
- `@typescript-eslint/no-explicit-any: 'error'` — `any` 型は lint エラー

## 数値表示ルール

- **パーセント表示は小数第2位まで**（`formatPercent(value)` — デフォルト `decimals=2`）
- `formatPercent(value, 1)` のように小数点以下を減らしてはならない
- 金額は `formatCurrency()` で整数表示（四捨五入 → カンマ区切り）
- ポイント差は `formatPointDiff()` で `±N.Npt` 表示

## スタイリング

- styled-components 6（テーマトークン経由、ダーク/ライト対応）
- Prettier: `semi: false` / `singleQuote: true` / `printWidth: 100` / `endOfLine: "lf"`
