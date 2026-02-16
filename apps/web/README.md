# apps/web

Vite + TypeScript で既存 HTML の段階移行を行うための土台です。

## 構成

- `src/styles/`: 既存 HTML から抽出した CSS。
- `src/components/`: 画面部品（`renderDashboardV2` / `renderDaily` / `renderSummary` を移設）。
- `src/features/import/`: `processShiire` / `processUriage` / `processTenkanIn` などの取込処理。
- `src/domain/`: 集計・計算ロジック。

## 方針

見た目互換を優先し、最初は「見た目同一・内部差し替え」を目標に
既存関数を段階移動できるようにしています。
