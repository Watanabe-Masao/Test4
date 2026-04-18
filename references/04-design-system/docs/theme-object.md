# Theme Object — `AppTheme`

`app/src/presentation/theme/theme.ts` が定義する `AppTheme` の構造と、
styled-components 内でのアクセス方法を解説します。

---

## なぜ 2 種類の theme 定義を持つか

Test4 には theme 関連ファイルが複数あります。それぞれ役割が違います。

| ファイル | 役割 | import 先 |
| --- | --- | --- |
| `tokens.ts` | Layer 1: palette + 数値トークンの**定義** | theme.ts が import |
| `theme.ts` | Layer 2: `AppTheme` 型と `createTheme()` 関数、`darkTheme` / `lightTheme` の**生成** | BootstrapProviders がここから import |
| `semanticColors.ts` | `sc.*` ヘルパー（theme 外で使うトレンド色） | 呼び出し元で直接 import |
| `colorSystem.ts` | `statusAlpha()` (ECharts 用動的 alpha) | 呼び出し元で直接 import |
| `GlobalStyle.ts` | `body` の `color` / `background` を theme 経由で注入 | BootstrapProviders が `<GlobalStyle />` を配置 |
| `index.ts` | 上記全てを束ねた barrel export | 外部は `@/presentation/theme` だけを見る |

---

## `AppTheme` 型の全体

```ts
export interface AppTheme {
  mode: 'dark' | 'light'
  colors: ThemeColors
  interactive: InteractiveColors
  chart: ChartColors             // see chart-semantic-colors.md
  elevation: ElevationTokens
  categoryGradients: typeof categoryGradients
  typography: typeof typography
  spacing: typeof spacing
  radii: typeof radii
  shadows: typeof shadows
  transitions: typeof transitions
  layout: typeof layout
  breakpoints: typeof breakpoints
  chartFontSize: typeof chartFontSize
  chartStyles: typeof chartStyles
  zIndex: typeof zIndex
  modal: typeof modal
  interaction: typeof interaction
}
```

`categoryGradients` 以下は `tokens.ts` のオブジェクトがそのまま入ります。
`mode / colors / interactive / chart / elevation` だけが `theme.ts` で
「作られる」値です。

---

## `ThemeColors` — ページの chrome

```ts
interface ThemeColors {
  bg: string    // L0 ページ
  bg2: string   // L1 ナビ・サイドバー
  bg3: string   // L2 カード
  bg4: string   // L3 hover / popover
  text: string
  text2: string
  text3: string
  text4: string
  border: string
  palette: typeof palette  // Layer 1 を丸ごと保持
}
```

`colors.palette` は「theme の中に Layer 1 もまとめて閉じ込めたい」という
Test4 の選択。styled-components 内では `theme.colors.palette.successDark`
のように hop が 2 つありますが、命名の一貫性を優先したトレードオフです。

---

## `InteractiveColors` — state 背景

```ts
interface InteractiveColors {
  hoverBg: string    // 任意要素の hover 背景
  activeBg: string   // 選択中タブ、チップ、ナビの背景
  subtleBg: string   // パネル、非強調ゾーン
  mutedBg: string    // 入力、フィルタの静的背景
  backdrop: string   // モーダルオーバーレイ
}
```

**dark/light 両方で宣言されている**のが v1 DS の想定を上回っている点です
(v1 DS README は「ライト未実装の可能性」を匂わせていましたが、ここが
実装済みでした)。

---

## `ElevationTokens` — popup/tooltip 影

```ts
interface ElevationTokens {
  popup: string    // ドロップダウン・ポップオーバー
  tooltip: string  // ツールチップ
  overlay: string  // 画像上の文字用
}
```

`shadows.*` (カード用) とは別系統。α=15% で dark 背景でも見えるように
強めです。

---

## `createTheme(mode)` の中身

```ts
function createTheme(mode: ThemeMode): AppTheme {
  const modeColors      = mode === 'dark' ? darkColors      : lightColors
  const modeInteractive = mode === 'dark' ? darkInteractive : lightInteractive
  return {
    mode,
    colors: { ...modeColors, palette },
    interactive: modeInteractive,
    chart: chartColors,              // mode 非依存
    elevation: elevationTokens,      // mode 非依存
    categoryGradients, typography, spacing, radii, shadows,
    transitions, layout, breakpoints, chartFontSize, chartStyles,
    zIndex, modal, interaction,
  }
}

export const darkTheme  = createTheme('dark')
export const lightTheme = createTheme('light')
```

mode 依存の値だけ切替、それ以外は共通オブジェクト参照。lightTheme /
darkTheme はモジュールロード時に一度だけ生成され、`ThemeProvider` に
渡されます。

---

## `BootstrapProviders` — ThemeProvider 注入点

```tsx
// app/src/BootstrapProviders.tsx
import { ThemeProvider } from 'styled-components'
import { darkTheme, lightTheme, GlobalStyle } from '@/presentation/theme'

export function BootstrapProviders({ children }: Props) {
  const [themeMode, setThemeMode] = useState<ThemeMode>(getInitialTheme)
  // ... toggleTheme / saveRaw 省略 ...
  const theme = themeMode === 'dark' ? darkTheme : lightTheme
  return (
    <ThemeToggleContext.Provider value={{ mode: themeMode, toggle: toggleTheme }}>
      <ThemeProvider theme={theme}>
        <GlobalStyle />
        <I18nProvider>{children}</I18nProvider>
      </ThemeProvider>
    </ThemeToggleContext.Provider>
  )
}
```

意味的な構造：

```
App root
└── ThemeToggleContext      (mode state と toggle 関数を配布)
    └── ThemeProvider        (theme オブジェクトを全 styled-components に配布)
        ├── GlobalStyle       (body の background / color を theme 経由で設定)
        └── I18nProvider
            └── children
```

**`document.documentElement.setAttribute('data-theme', ...)` は本体には存在しません。**
切替は純粋に JS / styled-components 経由です。`[data-theme='light']` は
この DS の preview HTML でのみ使います。

---

## styled-components でのアクセス

### 基本

```ts
import styled from 'styled-components'

const Card = styled.div`
  background: ${({ theme }) => theme.colors.bg3};
  color:      ${({ theme }) => theme.colors.text};
  border:     1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding:    ${({ theme }) => theme.spacing['6']};
  box-shadow: ${({ theme }) => theme.shadows.sm};
`
```

### hover / active

```ts
const Button = styled.button`
  background: transparent;
  &:hover  { background: ${({ theme }) => theme.interactive.hoverBg}; }
  &:active { transform: ${({ theme }) => theme.interaction.pressScale}; }
`
```

### チャート系列色

```ts
const SalesLine = styled.div`
  color: ${({ theme }) => theme.chart.semantic.sales};
`
```

`theme.chart.semantic.*` は業務概念ごとに予め割り当てられています。
新規チャートを作るときは、対応する概念を探して参照するのが正解。無ければ
`theme.ts` に追加提案する PR を立てます。

### カテゴリグラデーション

```ts
const CategoryChip = styled.div<{ kind: keyof typeof categoryGradients }>`
  background: ${({ theme, kind }) => theme.categoryGradients[kind]};
  color: #fff;
  padding: ${({ theme }) => `${theme.spacing['2']} ${theme.spacing['5']}`};
  border-radius: ${({ theme }) => theme.radii.pill};
`
```

---

## `ThemeToggleContext` — toggle 関数の配布

```tsx
// 使用例
import { useContext } from 'react'
import { ThemeToggleContext } from '@/appContextDefs'

function ThemeToggleButton() {
  const { mode, toggle } = useContext(ThemeToggleContext)
  return (
    <button onClick={toggle}>
      {mode === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}
```

永続化は `uiPersistenceAdapter` の `saveRaw(STORAGE_KEYS.THEME, next)` で
自動的に `localStorage` に。ユーザーは次回起動時も前回のモードで開けます。

---

## TypeScript module augmentation

styled-components の `DefaultTheme` を `AppTheme` で上書きしている場合、
`theme.colors.bg` のように型補完が効きます。

```ts
// theme/theme.d.ts (存在する前提)
import 'styled-components'
import type { AppTheme } from './theme'
declare module 'styled-components' {
  export interface DefaultTheme extends AppTheme {}
}
```

この declaration が無いと `theme` が `any` になります。Test4 には入っている
はずです（存在確認はできていません）。

---

## CSS 変数との対応早見表

DS preview 用 CSS 変数と `AppTheme` フィールドの対応：

| CSS 変数 | AppTheme フィールド |
| --- | --- |
| `--theme-bg` ... `--theme-bg4` | `colors.bg` ... `colors.bg4` |
| `--theme-text` ... `--theme-text4` | `colors.text` ... `colors.text4` |
| `--theme-border` | `colors.border` |
| `--theme-hover-bg` ... `--theme-muted-bg` | `interactive.hoverBg` ... `interactive.mutedBg` |
| `--theme-backdrop` | `interactive.backdrop` |
| `--theme-elev-popup/tooltip/overlay` | `elevation.popup/tooltip/overlay` |
| `--chart-series-N` | `chart.series[N-1]` |
| `--chart-<concept>` | `chart.semantic.<concept>` |
| `--gradient-<kind>` | `categoryGradients.<kind>` |

CSS 変数は本体 Test4 には存在しません。DS preview のために
`colors_and_type.css` が重複定義しているだけです。本番コードは必ず
`theme` オブジェクト経由で書きます。
