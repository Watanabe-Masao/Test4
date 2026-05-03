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

## TS suppression directive の書き方

`@ts-ignore` / `@ts-expect-error` / `eslint-disable` を使う場合は、本セクションのルールに従う。

### 鉄則: 通常コメントに directive の literal を書かない

通常の単一行コメント (`//`) や複数行コメント (`/* */`) に `@ts-ignore` /
`@ts-expect-error` の **文字列 literal** を書くと、TypeScript の directive
scanner が **説明文か命令か区別せず** これを directive として扱う。次の行に
TS error が無ければ TS2578 (Unused '@ts-expect-error' directive) を発火し
build が落ちる。

JSDoc (`/** */`) 内、および string literal 内の literal は scanner の対象外なので安全。

#### Bad

```tsx
// reason: webkitdirectory は HTML5 標準ではないが Chrome / Firefox / Safari で
//   実装されている非標準属性。TypeScript の DOM 型定義に存在しないため
//   @ts-expect-error が必要。  ← ★ TS が directive と認識する
//   この comment 自体が unused directive 扱いになり TS2578 が発火する
// @ts-expect-error webkitdirectory is non-standard
webkitdirectory=""
```

#### Good

```tsx
// reason: webkitdirectory は HTML5 標準ではないが Chrome / Firefox / Safari で
//   実装されている非標準属性。TypeScript の DOM 型定義に存在しないため
//   TS suppression directive が必要。  ← ★ literal を書かず言い換える
//   ファイルアップロード UX の要件
// removalCondition: TS DOM lib に webkitdirectory が追加される、または
//   File System Access API への移行で folder picker を再実装する
// @ts-expect-error webkitdirectory is a non-standard HTML attribute
webkitdirectory=""
```

### `@ts-expect-error` vs `@ts-ignore`

| directive | 動作 | 推奨 |
|---|---|---|
| `@ts-expect-error` | 次行に **必ず TS エラーが存在する** ことを要求。無ければ TS2578 で fail | デフォルト推奨。型システムが「やっぱり通る」状態になったら通知してくれる |
| `@ts-ignore` | 次行のエラーを silently 無視。エラーが無くても fail しない | 上流型の不安定さで `@ts-expect-error` が誤検知する場面のみ |

### `eslint-disable-line` vs `eslint-disable-next-line`

- `eslint-disable-line` — その行末にあれば、その行のみを suppress
- `eslint-disable-next-line` — 直後の **1 行のみ** を suppress
- 複数行の構文 (e.g. `useEffect(() => { ... }, [deps])`) で rule が
  closing line 側に発火する場合、`-next-line` を opening line の直前に
  書いても効かない。**実際に rule が発火する行に対応する形式** を選ぶ

#### Bad

```tsx
// rule (react-hooks/exhaustive-deps) は }, [themeName]) で発火するので
// -next-line が useEffect 開始行に効いても closing line を suppress できない
// eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => {
  /* ... */
}, [themeName])  // ← ここで rule が発火 → unused directive warning
```

#### Good

```tsx
useEffect(() => {
  /* ... */
}, [themeName]) // eslint-disable-line react-hooks/exhaustive-deps
```

### 構造化 rationale (AR-G3-SUPPRESS-RATIONALE)

`app/src/test/allowlists/signalIntegrity.ts` に登録される suppression は、
allowlist エントリと source code コメントの両方で構造化された
`reason:` / `removalCondition:` を必須とする
(`AR-G3-SUPPRESS-RATIONALE` が機械検証)。

```tsx
// reason: <なぜ抑制が必要か (library 制約 / 上流型の問題 / migration 等)>
// removalCondition: <いつ削除可能になるか (バージョン / PR / イベント)>
// 構造化 rationale 正本: app/src/test/allowlists/signalIntegrity.ts
// @ts-expect-error <directive 自体に短い description を 3 文字以上で>
suppressed_code_here()
```

### 関連

- [`references/01-foundation/test-signal-integrity.md`](../01-principles/test-signal-integrity.md) §TSIG-COMP-01〜03 と AR-G3-SUPPRESS-RATIONALE
- [`references/03-implementation/test-signal-integrity-advisory.md`](./test-signal-integrity-advisory.md) — Advisory レーン運用
- 機械検証: `app/src/test/guards/codePatternGuard.test.ts` G3 / `app/src/test/guards/testSignalIntegrityGuard.test.ts` AR-G3-SUPPRESS-RATIONALE

## 数値表示ルール

- **パーセント表示は小数第2位まで**（`formatPercent(value)` — デフォルト `decimals=2`）
- `formatPercent(value, 1)` のように小数点以下を減らしてはならない
- 金額は `formatCurrency()` で整数表示（四捨五入 → カンマ区切り）
- ポイント差は `formatPointDiff()` で `±N.Npt` 表示

## スタイリング

- styled-components 6（テーマトークン経由、ダーク/ライト対応）
- Prettier: `semi: false` / `singleQuote: true` / `printWidth: 100` / `endOfLine: "lf"`
