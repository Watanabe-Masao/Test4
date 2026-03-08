# CLAUDE.md - 開発ルール

## プロジェクト概要

仕入荒利管理システム（shiire-arari）。小売業の仕入・売上・在庫データから粗利計算・
予算分析・売上要因分解・需要予測を行うSPA。

## ロール・スキルシステム

本プロジェクトでは開発タスクの品質を構造的に保証するために
ロールベースの作業システムを導入している。
アプリの4層（Presentation → Application → Domain ← Infrastructure）と同様、
開発体制も4層で構成する。

### 4層モデル

| 層 | 担い手 | 責務 |
|---|---|---|
| Authority | 人間 | 何をやるか・やらないか（最終意思決定） |
| Orchestration | CLAUDE.md（本セクション） | タスク→ロール→連携の自動ルーティング |
| Identity | roles/*/ROLE.md | 各ロールの前提・価値基準・判断基準 |
| Execution | roles/*/SKILL.md | 論理構造（因果関係）と方法論（手順） |

### 組織構造: スタッフ部門 + 実務部門

**スタッフ部門（staff/）** — 報告を受けて自律的に品質責任を果たす

| ロール | 位置づけ | 品質責任 |
|---|---|---|
| pm-business | **指示者** 兼 要件の入口。タスク分解→作業者決定→完了判定 | 要件の正確さ・受入基準の測定可能性 |
| review-gate | 品質の出口。成果物を受けて PASS/FAIL を自律判定 | 7禁止事項・ガードテスト・CI 6段階ゲート |
| documentation-steward | 記録の出口。pm-business の報告を受けて更新要否を自律判断 | CLAUDE.md・roles/・references/ とコードの整合性 |

**実務部門（line/）** — 設計→実装→専門検証

| ロール | 位置づけ | 渡し先 |
|---|---|---|
| architecture | 設計判断（**設計思想10原則の管理者**） | → implementation |
| implementation | コーディング | → review-gate |
| specialist/invariant-guardian | 数学検証 | ← → implementation |
| specialist/duckdb-specialist | DuckDB専門 | ← → implementation |
| specialist/explanation-steward | 説明責任 | ← → implementation |

### タスク完遂フロー

```
人間 → pm-business（★指示者: タスク分解・作業者決定）
          │
          ├→ architecture（設計判断）        ← Large のみ
          │      │  報告↑ ↓連携
          │      ▼
          └→ implementation ← → specialist/*  ← 全規模
                    │  相談↑↓連携     ↑報告
                    ▼
              review-gate（自律判断: PASS/FAIL）
                 報告→ pm-business
                 FAIL → implementation（差し戻し）
                 PASS → pm-business が変更内容を報告
                           ▼
                    documentation-steward（自律判断: 更新要否）
                           │
                    更新結果を報告→ pm-business
                           │
                    pm-business → 人間（意思決定動線の最終報告）
```

### 連携プロトコル（報告・連携・相談）

全ロール間のコミュニケーションは3種類に分類される。
各ロールの ROLE.md に具体的なプロトコルテーブルが定義されている。

| 種類 | 定義 | 例 |
|---|---|---|
| **報告** | 完了・状態・リスクの一方向通知 | implementation → review-gate（成果物提出） |
| **連携** | 成果物の引き渡し・共同作業 | implementation ←→ specialist/*（計算変更の共同検証） |
| **相談** | 境界を越える前の事前確認 | implementation → architecture（独自パターン導入の可否） |

### タスク規模別フロー

**全タスクは必ず pm-business（指示者）を経由する。** pm-business がタスクを分析し、
規模に応じてタスクに必要な作業者を決定する。

| 規模 | 判定基準 | フロー |
|---|---|---|
| **Small** | 1ファイル変更、既存パターン踏襲 | pm-business → implementation → review-gate セルフチェック |
| **Medium** | 複数ファイル、既知パターン | pm-business → implementation ← → specialist → review-gate |
| **Large** | 層跨ぎ、新パターン導入 | pm-business → architecture → implementation ← → specialist → review-gate |

### 指示者と作業者

pm-business は**指示者**であり、実務部門の各ロールは**作業者**である。
タスクが主語であり、pm-business はタスクに必要な作業者を決定する。

スタッフ部門（review-gate / documentation-steward）は pm-business の下請けではない。
pm-business からの**報告を受けて**、各自の品質領域で**自律的に判断する**。

| 区分 | pm-business との関係 | 判断の主体 |
|---|---|---|
| 実務部門（line/） | pm-business が作業を指示する | pm-business |
| review-gate | pm-business が受入基準を提供。PASS/FAIL は review-gate が判断する | review-gate |
| documentation-steward | pm-business が変更内容・集約課題を報告。更新要否は documentation-steward が判断する | documentation-steward |

**原則:**
- pm-business をスキップしてはならない（規模が Small でも必ず経由する）
- 作業者は、自分の ROLE.md の Scope 内でのみ作業する
- エージェントにタスクを割り当てるのではなく、タスクにエージェントを割り当てる

### ルーティング表

| 作業内容 | 主ロール | 連携先 |
|---|---|---|
| 新機能の要件整理 | pm-business | → architecture |
| 層跨ぎのリファクタリング | architecture | → implementation |
| 計算ロジックの変更 | implementation | ← → invariant-guardian |
| DuckDB クエリの追加・変更 | implementation | ← → duckdb-specialist, architecture |
| Explanation 拡張 | implementation | ← → explanation-steward |
| PR レビュー・品質確認 | review-gate | ← implementation |
| ガードテスト追加・修正 | invariant-guardian | → implementation |
| 作業中に発見した課題・リスク | 全作業者 | → pm-business → documentation-steward |
| ドキュメント更新 | documentation-steward | ← pm-business、更新結果→ pm-business |
| タスク完了の最終報告 | pm-business | → 人間（意思決定動線の説明） |

### ファイルパスベース自動ルーティング

変更対象のパスから読むべき ROLE.md を自動判定する:

| 変更対象パス | 読む ROLE.md |
|---|---|
| `domain/calculations/` | `roles/line/specialist/invariant-guardian/` |
| `infrastructure/duckdb/` | `roles/line/specialist/duckdb-specialist/` |
| `application/usecases/explanation/` | `roles/line/specialist/explanation-steward/` |
| 複数層にまたがる変更 | `roles/line/architecture/` |
| `presentation/components/` のみ | `roles/line/implementation/` で十分 |

### 知識の3層分類

| 層 | 配置先 | 読むタイミング |
|---|---|---|
| **全員必読** | CLAUDE.md（本ファイル） | 常に（セッション開始時） |
| **ロール固有** | roles/*/ROLE.md + SKILL.md | タスク開始時（1-2ロール分） |
| **必要時参照** | references/ | 実装中に必要な箇所だけ |

### ロールファイルの構造

ROLE.md と SKILL.md は以下の5層で思想を構造化する:

| 層 | 配置先 | 内容 |
|---|---|---|
| 前提 | ROLE.md | このロールが所与とする事実 |
| 価値基準 | ROLE.md | このロールが最適化する対象 |
| 判断基準 | ROLE.md | 選択肢の間で何を基準に判断するか |
| 論理構造 | SKILL.md | 因果関係（XならYが壊れる、なぜならZ） |
| 方法論 | SKILL.md | 具体的手順 |

### 越境検出

作業完了時、以下を自己チェックする:
- 自分の ROLE.md の Scope に含まれる作業だけを行ったか？
- Boundary に該当する作業をしていないか？
- Output の形式に従い、正しい渡し先に渡したか？

### フィードバックスパイラル

品質を継続的に向上させるために、以下のループを回す:

```
実装 → review-gate → PASS/FAIL
                        │
           FAIL: 原因を分析 → 以下のいずれかを更新
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
  禁止事項に追加    ガードテスト追加   ROLE/SKILL 改善
  (CLAUDE.md)     (invariant-guardian) (documentation-steward)
```

**トリガー:**
- review-gate が FAIL を出したとき → 原因が構造的なら禁止事項/ガードテストに昇格
- 同じ種類のバグが2回発生したとき → 機械的検出手段（テスト）を追加
- ロールの判断に迷いが生じたとき → ROLE.md の判断基準を明確化

**原則:** 「気をつける」で終わらせない。再発を防ぐ構造（テスト、禁止事項、ROLE 改善）に変換する。

## プロジェクト構成

```
app/src/
├── domain/           # ドメイン層（フレームワーク非依存、純粋関数）
├── application/      # アプリケーション層（hooks, stores, usecases, workers）
├── infrastructure/   # インフラ層（DuckDB, storage, export, i18n, pwa）
├── presentation/     # プレゼンテーション層（components, pages, theme）
├── stories/          # Storybook
└── test/             # テストユーティリティ
```

### レイヤー間の依存ルール

`Presentation → Application → Domain ← Infrastructure`

- **domain/** はどの層にも依存しない（純粋なビジネスロジック）
- **application/** は domain/ のみに依存
- **infrastructure/** は domain/ のみに依存
- **presentation/** は application/ と domain/ に依存
- infrastructure/ と presentation/ は直接依存しない

## コマンド

```bash
cd app && npm run lint          # ESLint（エラー0で通ること）
cd app && npm run build         # tsc -b（型チェック）+ vite build
cd app && npm test              # vitest run（全テスト）
cd app && npx vitest run <path> # 特定テスト実行
cd app && npm run format:check  # Prettier フォーマットチェック
cd app && npm run test:e2e      # Playwright E2Eテスト
cd app && npm run test:coverage # vitest + カバレッジレポート
cd app && npm run dev           # Vite 開発サーバー
```

### CI パイプライン（6段階ゲート）

1. `npm run lint` — ESLint（**エラー0必須**）
2. `npm run format:check` — Prettier（**準拠必須**）
3. `npm run build` — tsc -b + vite build（**strict mode**）
4. `npm run build-storybook` — Storybook ビルド（**ストーリーの型・import 健全性**）
5. `npx vitest run --coverage` — vitest + カバレッジ（**lines 55%**）
6. `npm run test:e2e` — Playwright E2E（**全シナリオ通過**）

## コーディング規約

### 命名規則

| 対象 | 規則 | 例 |
|---|---|---|
| 型・インターフェース | PascalCase | `StoreResult`, `DailyRecord` |
| 変数・関数 | camelCase | `totalSales`, `calculateGrossProfit` |
| 定数 | UPPER_SNAKE_CASE | `COST_RATE_MIN`, `ALL_STORES_ID` |
| コンポーネント | PascalCase | `DashboardPage`, `KpiCard` |
| テストファイル | `*.test.ts(x)` | `factorDecomposition.test.ts` |
| Boolean | is/has/should/needs 接頭辞 | `isCalculated`, `hasPrevYear` |

### TypeScript

- **strict mode 有効**（tsconfig.app.json）
- `noUnusedLocals: true` / `noUnusedParameters: true` — ビルドで強制
- パスエイリアス: `@/` → `src/`（import は `@/domain/...` の形式）
- `readonly` を積極的に使用（イミュータブル設計）
- `@typescript-eslint/no-explicit-any: 'error'` — `any` 型は lint エラー

### 数値表示ルール

- **パーセント表示は小数第2位まで**（`formatPercent(value)` — デフォルト `decimals=2`）
- `formatPercent(value, 1)` のように小数点以下を減らしてはならない
- 金額は `formatCurrency()` で整数表示（四捨五入 → カンマ区切り）
- ポイント差は `formatPointDiff()` で `±N.Npt` 表示

### スタイリング

- styled-components 6（テーマトークン経由、ダーク/ライト対応）
- Prettier: `semi: false` / `singleQuote: true` / `printWidth: 100` / `endOfLine: "lf"`

## 設計思想 — 10原則（要約）

詳細と適用例は `references/design-principles.md` を参照。管理責任: architecture ロール。

1. **機械で守る** — ルールはテストに書く。文書だけでは守られない
2. **境界で検証** — 外部入力は Branded Type で検証済みを型保証
3. **エラーは伝播** — catch で握り潰さない。壊れたなら表示する
4. **変更頻度で分離** — 1ファイル = 1つの変更理由。300行超は分割検討
5. **不変条件テスト** — 実装ではなく制約をテストする
6. **DI はコンポジションルート** — 具体実装を知るのは App.tsx のみ
7. **バレルで後方互換** — ファイル移動で外部 import を壊さない
8. **文字列はカタログ** — UI 文字列は messages.ts に一元管理
9. **描画は純粋** — memo + フックで描画と計算を分離
10. **最小セレクタ** — ストアはスライスで購読。広すぎる購読は禁止

## モジュール構造の進化方針（要約）

詳細は `references/module-structure-evolution.md` を参照。

現在の**層別構造（横スライス）** から、業務ドメイン境界による**機能別構造（縦スライス）** へ
段階的に移行する。各機能スライス（sales / inventory / category / customer / forecast）が
内部に4層（Presentation → Application → Domain ← Infrastructure）を持つ。

- **縦の壁:** 機能間の直接依存は禁止。共通基盤は `shared/` 経由
- **横の壁:** 各スライス内部の層間依存は従来通り維持
- **移行原則:** 新規は縦スライスで作り、既存は改修タイミングで移動。バレル re-export で後方互換

## UI/UX 4原則（要約）

詳細は `references/uiux-principles.md` を参照。

1. **実績と推定は別世界** — 在庫法（緑）と推定法（オレンジ）を視覚的に分離
2. **コンテキスト駆動** — フィルタは全ページで同じ場所・同じ意味で効く
3. **ドリルは3種類** — A: 絞り込み / B: 明細遷移 / C: 比較遷移
4. **全指標は監査可能** — L1: 一言 → L2: 式と入力 → L3: ドリルダウン

## データフロー（要約）

データは4段階を経てUIに到達する。詳細は `references/data-flow.md` を参照。

| 段階 | 責務 | 層 |
|---|---|---|
| 1. 組み合わせ | 複数ファイルの突き合わせ | infrastructure + application |
| 2. 計算 | 導出値の算出 | domain/calculations |
| 3. インデックス構築 | 計算済み値をUI用構造に | application/usecases |
| 4. 動的フィルタ | ユーザー操作に応じた絞り込み | application/hooks |

**鉄則:** UIは描画のみ。生レコード走査・インライン計算・独自集約は禁止。

## 2つの計算エンジン（要約）

詳細は `references/engine-responsibility.md` と `references/duckdb-architecture.md` を参照。

| | JS 計算エンジン | DuckDB 探索エンジン |
|---|---|---|
| 役割 | 権威的な指標計算 | 自由範囲の探索・集約 |
| スコープ | 単月確定値 | 任意日付範囲 |
| 出力 | StoreResult | SQL 集約結果 |
| 例 | シャープリー分解、粗利計算 | 時間帯×曜日集約、月跨ぎ分析 |

**鉄則:** 同じ集約ロジックを JS と SQL の両方に実装してはならない（二重実装禁止）。

## シャープリー恒等式（数学的不変条件）

- `decompose2`: `custEffect + ticketEffect = curSales - prevSales`
- `decompose3`: `custEffect + qtyEffect + pricePerItemEffect = curSales - prevSales`
- `decompose5`: `custEffect + qtyEffect + priceEffect + mixEffect = curSales - prevSales`

**合計値は実際の売上差に完全一致。** カテゴリデータからの再計算は禁止。

## 禁止事項（7件）

詳細（壊れるパターン・背景）は `references/prohibition-quick-ref.md` を参照。

| # | 禁止事項 | 何が壊れるか |
|---|---|---|
| 1 | コンパイラ警告を `_` や `eslint-disable` で黙らせる | バグがコンパイラの警告ごと隠蔽される |
| 2 | 引数を無視して別ソースから再計算する | シャープリー恒等式が崩れる |
| 3 | useMemo/useCallback の依存配列から参照値を省く | ステールデータバグ |
| 4 | 要因分解の合計を売上差と不一致にする | ウォーターフォールが合計に到達しない |
| 5 | domain/ に外部依存・副作用を持ち込む | 純粋関数のテスト不能 |
| 6 | UI が生データソースを直接参照する | データソース混同、計算ロジック分散 |
| 7 | UI にデータ変換・副作用・状態管理を混在させる | God Component 化、テスト不能 |

**制約の変更:** 「やりたいことの邪魔になるから」は理由にならない。
「この制約が防いでいたバグが、別の仕組みで防がれるようになった」は理由になる。

## Explanation（説明責任）

81 MetricId（型定義済み）に対して3段階 UX（L1: 一言 → L2: 式と入力 → L3: ドリルダウン）を提供。
詳細は `references/explanation-architecture.md` と `references/metric-id-registry.md` を参照。

**鉄則:** 計算を再実行しない（StoreResult の値をそのまま使う）。Domain 層は型定義のみ。
