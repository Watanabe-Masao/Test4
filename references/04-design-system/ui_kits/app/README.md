# UI Kit — Full App Prototype (v2.1)

ダッシュボード全体を通して確認できる React クリックスルー試作機です。
DS v1 時代から続いている JSX をそのまま流用し、CSS トークン参照のみを
v2.1 (Test4 本体の `theme.ts` に準拠) に合わせて差し替えました。

---

## 何が含まれているか

| ファイル | 役割 |
| --- | --- |
| `index.html` | ブラウザ起動の入口。CDN から React / ReactDOM / Babel を読み込み、JSX を inline で処理 |
| `App.jsx` | ルートレイアウト (NavRail + Sidebar + Main) |
| `NavRail.jsx` | 左ナビレール |
| `DataSidebar.jsx` | データ管理サイドバー |
| `Toolbar.jsx` | 上部ツールバー |
| `KpiCard.jsx` | KPI カード (売上・粗利・客数・売変) |
| `ChartCard.jsx` | チャートカード (SVG 折れ線/棒) |
| `CategoryTable.jsx` | カテゴリ別実績テーブル |
| `FactorDecomp.jsx` | 要因分解ボード |
| `app.css` | DS v2.1 準拠の全体スタイル |

---

## v2.1 での変更

試作機のソースコード (JSX) 自体は **v1 と同一**です。変更したのは
`app.css` 内の CSS 変数参照のみ:

- v1 の単純な `background: #09090b` などハードコード参照だったのを、v2.1 の
  Layer 2 トークン `var(--theme-bg)` / `var(--theme-text)` / `var(--theme-border)`
  に全面置換
- トレンド色 (↑↓) は `var(--c-positive)` / `var(--c-negative)` (CUD) を使用。
  Test4 本体の `sc.positive` / `sc.negative` と同じ値
- カテゴリ色は `var(--cat-*)` を撤廃し、`var(--gradient-*)` (Test4 の
  `categoryGradients` に対応) に変更。試作機では `ti/to/bi/bo` の 4 区分で
  サンプル表示していますが、本番画面はさらに多軸で使い分けます

> 色味を v1 の緑/赤に戻したい場合は、`colors_and_type.css` の
> `--c-positive` / `--c-negative` を `var(--c-success-dark)` /
> `var(--c-danger-dark)` に上書きしてください。ただし色覚多様性対応が
> 下がるため、基本は CUD を推奨します。

---

## 既知の制限

- ブラウザで直接 `file://` では React が CORS エラーを出すことがあります。
  `python3 -m http.server` のようなローカルサーバで配信してください
- ReCharts / ECharts は含まれていません。チャート描画は SVG を直接書いた
  簡易版で、実際の Test4 の ECharts 描画とは別物です (色とサイズ感だけ
  参考になります)
- `theme-toggle` ボタンは preview ナビ側にあり、本試作機には直結していません。
  preview ナビのトグルを動かせば iframe 内の `[data-theme='light']` が反映
  されます

---

## 本番コードとの関係

このディレクトリはあくまで **DS preview 用の試作機**です。
Test4 の実装は styled-components ベースで、このような素の JSX / CSS は
使っていません。本番の書き方は `docs/theme-object.md` を参照してください。

ブランド感・密度感・KPI カードの並び方・モーダル/トーストの入場アニメを
「画面として」確認したいときの参照用です。
