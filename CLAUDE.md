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
| review-gate | 品質の出口。成果物を受けて PASS/FAIL を自律判定 | 設計原則・ガードテスト・CI 3ジョブ7ステップ |
| documentation-steward | 記録の出口。pm-business の報告を受けて更新要否を自律判断 | CLAUDE.md・roles/・references/ とコードの整合性 |

**実務部門（line/）** — 設計→実装→専門検証

| ロール | 位置づけ | 渡し先 |
|---|---|---|
| architecture | 設計判断（**設計原則の管理者**） | → implementation |
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
├── application/      # アプリケーション層（hooks, stores, usecases, queries, workers, services/temporal）
├── infrastructure/   # インフラ層（DuckDB, storage, export, i18n, pwa）
├── presentation/     # プレゼンテーション層（components, pages, theme）
├── features/         # 縦スライス（sales/, category/, shared/ — 段階的移行中）
├── stories/          # Storybook
└── test/             # ガードテスト・共有インフラ
    ├── guardTestHelpers.ts   # 共有ヘルパー（collectTsFiles, rel 等）
    ├── guardTagRegistry.ts   # ガードタグのメタデータ管理
    ├── allowlists/           # 許可リスト（カテゴリ別分割）
    │   ├── architecture.ts   #   層境界ルール
    │   ├── complexity.ts     #   行数・useMemo 制限
    │   ├── duckdb.ts         #   DuckDB hook
    │   ├── size.ts           #   ファイルサイズ
    │   ├── migration.ts      #   比較移行
    │   └── misc.ts           #   その他
    ├── calculationCanonRegistry.ts  # domain/calculations/ 全ファイル分類
    ├── guards/               # 構造制約ガード（22ファイル / 213テスト）
    │   ├── layerBoundaryGuard.test.ts
    │   ├── presentationIsolationGuard.test.ts
    │   ├── structuralConventionGuard.test.ts
    │   ├── codePatternGuard.test.ts
    │   ├── sizeGuard.test.ts
    │   ├── purityGuard.test.ts
    │   ├── temporalRollingGuard.test.ts
    │   ├── purchaseCostPathGuard.test.ts
    │   ├── purchaseCostImportGuard.test.ts
    │   ├── grossProfitPathGuard.test.ts
    │   ├── salesFactPathGuard.test.ts
    │   ├── discountFactPathGuard.test.ts
    │   ├── factorDecompositionPathGuard.test.ts
    │   ├── calculationCanonGuard.test.ts
    │   └── canonicalizationSystemGuard.test.ts
    ├── audits/               # アーキテクチャ監査
    ├── temporal/             # temporal path テスト
    └── observation/          # 観測テスト（WASM 二重実行）
```

### レイヤー間の依存ルール

`Presentation → Application → Domain ← Infrastructure`

- **domain/** はどの層にも依存しない（純粋なビジネスロジック + 取得対象の契約定義）
- **application/** は domain/ のみに依存（データ取得の調停・フォールバック戦略はここに閉じる）
- **infrastructure/** は domain/ のみに依存（外部API・DuckDB・ストレージの実装）
- **presentation/** は application/ と domain/ に依存（**描画のみ。外部APIを直接呼ばない**）
- infrastructure/ と presentation/ は直接依存しない
- **鉄則:** presentation/ が外部データを必要とする場合、application/ の hook を通じて取得する。取得元の切替（DuckDB → ETRN フォールバック等）は hook 内で完結させ、UIは取得元を知らない

## コマンド

```bash
cd app && npm run lint            # ESLint（エラー0で通ること）
cd app && npm run build           # tsc -b（型チェック）+ vite build
cd app && npm test                # vitest run（全テスト）
cd app && npx vitest run <path>   # 特定テスト実行
cd app && npm run test:guards     # ガードテスト（構造制約、~9秒）
cd app && npm run test:observation # 観測テスト（WASM二重実行）
cd app && npm run format:check    # Prettier フォーマットチェック
cd app && npm run format          # Prettier 自動修正
cd app && npm run test:e2e        # Playwright E2Eテスト
cd app && npm run test:e2e:ui     # Playwright UI モード
cd app && npm run test:coverage   # vitest + カバレッジレポート
cd app && npm run test:visual     # ビジュアルリグレッション
cd app && npm run build:wasm      # WASM モジュールビルド
cd app && npm run storybook       # Storybook 開発サーバー
cd app && npm run build-storybook # Storybook ビルド
cd app && npm run dev             # Vite 開発サーバー
```

### CI パイプライン（3ジョブ構成）

**fast-gate（高速ゲート — 最初に実行）:**
1. `npm run lint` — ESLint（**エラー0必須**）
2. `npm run format:check` — Prettier（**準拠必須**）
3. `npm run build` — tsc -b + vite build（**strict mode**）
4. `npm run test:guards` — ガードテスト（**構造制約の即時検証**）

**test-coverage（fast-gate 後に並列実行）:**
5. `npx vitest run --coverage` — vitest + カバレッジ（**lines 55%**）
6. `npm run build-storybook` — Storybook ビルド（**ストーリーの型・import 健全性**）

**e2e（fast-gate 後に並列実行）:**
7. `npm run test:e2e` — Playwright E2E（**全シナリオ通過**）

## コーディング規約

詳細は `references/03-guides/coding-conventions.md` を参照。

- **strict mode** / `noUnusedLocals` / `noUnusedParameters` — ビルドで強制
- パスエイリアス: `@/` → `src/`
- `any` 禁止（lint エラー）、`readonly` 推奨
- パーセント小数第2位（`formatPercent`）、金額整数（`formatCurrency`）
- Prettier: `semi: false` / `singleQuote: true` / `printWidth: 100`

## 設計原則 — 7カテゴリ

詳細・適用例は `references/01-principles/design-principles.md` を参照。管理責任: architecture。

| カテゴリ | 要点 |
|---------|------|
| **A. 層境界** | 4層依存ルール（A1）、Domain 純粋（A2）、Presentation 描画専用（A3）、契約は Domain 定義（A4）、DI は App.tsx のみ（A5）、load 3段階分離（A6） |
| **B. 実行エンジン境界** | Authoritative 計算は domain/calculations のみ（B1）、JS/SQL 二重実装禁止（B2）、率は domain で算出（B3） |
| **C. 純粋性と責務分離** | 1ファイル=1変更理由（C1）、pure 1仕様軸（C2）、store は state のみ（C3）、描画純粋（C4）、最小セレクタ（C5）、facade は orchestration のみ（C6）、同義API併存禁止（C7） |
| **D. 数学的不変条件** | 要因分解合計=売上差（D1）、引数無視再計算禁止（D2）、不変条件はテストで守る（D3） |
| **E. 型安全と欠損処理** | 境界で検証（E1）、依存配列省略禁止（E2）、sourceDate 保持（E3）、欠損は `== null`（E4） |
| **F. コード構造規約** | バレル後方互換（F1）、文字列カタログ（F2）、全パターン同一（F3）、パス配置（F4）、Contract 管理（F5）、文脈継承（F6）、View に raw 禁止（F7）、正本保護（F8）、Raw=唯一真実源（F9） |
| **G. 機械的防御** | テストに書く（G1）、エラー伝播（G2）、警告黙殺禁止（G3）、テスト用export禁止（G4）、サイズ上限（G5/G6）、キャッシュ≤本体（G7） |

**制約の変更:** 「邪魔だから」は理由にならない。「別の仕組みで防がれるようになった」は理由になる。

## アーキテクチャ進化計画（要約）

詳細は `references/99-archive/old-plans-summary.md` を参照（要約版）。

CQRS + 契約ハイブリッド設計により、既存4層モデルの内側に **処理契約** を導入する。

- **Command側:** JS計算エンジン（単月確定値 → WriteModel = StoreCalculation）
- **Query側:** DuckDB探索エンジン（任意範囲 → ReadModel = QueryResult）
- **ViewModel:** WriteModel + ReadModel を描画データに変換
- **統一構造:** チャート（.tsx + .styles.ts + .vm.ts）、クエリ（QueryHandler + Input/Output型）
- **移行:** Phase 0〜7 の段階的実行。各フェーズに完了基準と Architecture Guard を定義

## モジュール構造の進化方針（要約）

詳細は `references/99-archive/old-plans-summary.md` を参照（要約版）。

現在の**層別構造（横スライス）** から、業務ドメイン境界による**機能別構造（縦スライス）** へ
段階的に移行する。各機能スライス（sales / inventory / category / customer / forecast）が
内部に4層（Presentation → Application → Domain ← Infrastructure）を持つ。

- **縦の壁:** 機能間の直接依存は禁止。共通基盤は `shared/` 経由
- **横の壁:** 各スライス内部の層間依存は従来通り維持
- **移行原則:** 新規は縦スライスで作り、既存は改修タイミングで移動。バレル re-export で後方互換

## UI/UX 4原則（要約）

詳細は `references/01-principles/uiux-principles.md` を参照。

1. **実績と推定は別世界** — 在庫法（緑）と推定法（オレンジ）を視覚的に分離
2. **コンテキスト駆動** — フィルタは全ページで同じ場所・同じ意味で効く
3. **ドリルは3種類** — A: 絞り込み / B: 明細遷移 / C: 比較遷移
4. **全指標は監査可能** — L1: 一言 → L2: 式と入力 → L3: ドリルダウン

## データフロー（要約）

データは4段階を経てUIに到達する。詳細は `references/01-principles/data-flow.md` を参照。
パイプライン整合性の設計思想は `references/01-principles/data-pipeline-integrity.md`、
期間スコープの分離ルールは `references/01-principles/temporal-scope-semantics.md` を参照。

| 段階 | 責務 | 層 |
|---|---|---|
| 1. 組み合わせ | 複数ファイルの突き合わせ | infrastructure + application |
| 2. 計算 | 導出値の算出 | domain/calculations |
| 3. インデックス構築 | 計算済み値をUI用構造に | application/usecases |
| 4. 動的フィルタ | ユーザー操作に応じた絞り込み | application/hooks |

**鉄則:** UIは描画のみ。生レコード走査・インライン計算・独自集約は禁止。

## 3つの Execution Engine（要約）

詳細は `references/01-principles/engine-boundary-policy.md`、`references/01-principles/engine-responsibility.md` を参照。

| Engine | 実装 | 制約 |
|--------|------|------|
| **Authoritative** | `domain/calculations/` | pure only。staging area であり Application の一部ではない |
| **Application** | TypeScript（hooks, stores, usecases） | pure+authoritative を新規実装しない |
| **Exploration** | DuckDB SQL | 正式値の唯一定義元にしない |

## 数学的不変条件

シャープリー恒等式・不変条件の詳細は `references/03-guides/invariant-catalog.md` を参照。
**合計値は実際の売上差に完全一致。** カテゴリデータからの再計算は禁止（D1/D2）。

## 許可リスト・ガード運用

詳細は `references/03-guides/allowlist-management.md` を参照。
即差し戻し条件は `roles/staff/review-gate/SKILL.md` を参照。

## 仕入原価の正本ルール

詳細は `references/01-principles/purchase-cost-definition.md` を参照。
実施計画は `references/03-guides/purchase-cost-unification-plan.md` を参照。

- **正本:** `readPurchaseCost()` が唯一の read 関数。3独立正本（通常仕入・売上納品・移動原価）を `PurchaseCostReadModel` として構築
- **UI 層の入口:** `usePurchaseCost()` を標準入口とする
- **Application 層:** `purchaseCostHandler` / `readPurchaseCost()` の直接使用を許容
- **禁止:** 旧クエリ（queryPurchaseTotal 等7関数）は廃止済み。復活禁止
- **移動原価:** IN + OUT の全方向を含める（IN のみは二重計上になるため禁止）
- **ガード:** `purchaseCostPathGuard.test.ts`（4層9テスト）+ `purchaseCostImportGuard.test.ts`（15テスト）で保証

## 正本化体系（readModels）

全ての業務値は `application/readModels/` に正本化されている。
定義書は `references/01-principles/` を参照。

| 正本 | ReadModel | 定義書 | パスガード |
|------|-----------|--------|-----------|
| 仕入原価 | `readPurchaseCost()` | `purchase-cost-definition.md` | purchaseCostPathGuard (9) + importGuard (15) |
| 粗利 | `calculateGrossProfit()` | `gross-profit-definition.md` | grossProfitPathGuard (6) |
| 売上・販売点数 | `readSalesFact()` | `sales-definition.md` | salesFactPathGuard (5) |
| 値引き | `readDiscountFact()` | `discount-definition.md` | discountFactPathGuard (5) |
| 要因分解 | `calculateFactorDecomposition()` | `authoritative-calculation-definition.md` | factorDecompositionPathGuard (5) |
| 自由期間分析 | `readFreePeriodFact()` | `free-period-analysis-definition.md` | freePeriodPathGuard (7) |
| 自由期間予算 | `readFreePeriodBudgetFact()` | `free-period-budget-kpi-contract.md` | — |
| 自由期間部門KPI | `readFreePeriodDeptKPI()` | `free-period-budget-kpi-contract.md` | — |
| 予算 | StoreResult（統一済み） | `budget-definition.md` | — |
| KPI | StoreResult（統一済み） | `kpi-definition.md` | — |
| PI値 | `calculateQuantityPI()` / `calculateAmountPI()` | `pi-value-definition.md` | — |
| 客数GAP | `calculateCustomerGap()` | `customer-gap-definition.md` | — |

- **widget orchestrator:** `useWidgetDataOrchestrator` が 3正本を `UnifiedWidgetContext.readModels` 経由で全 widget に配布
- **体系統合ガード:** `canonicalizationSystemGuard.test.ts` (6テスト) — 全 readModel ディレクトリ・定義書・CLAUDE.md 参照を検証
- **計算レジストリ:** `calculationCanonRegistry.ts` + `calculationCanonGuard.test.ts` — domain/calculations/ 全ファイルの分類管理
- **Zod 契約:** 全 queryToObjects に46型 + readModels の .parse() fail fast + domain/calculations 必須14/14 + 検討7/9
- **不変条件:** `invariant-catalog.md` に INV-CANON-01〜16 として16件の正本化不変条件を登録
- **正本化原則:** `references/01-principles/canonicalization-principles.md` — 7原則 + 禁止事項
- **正本化マップ:** `references/01-principles/calculation-canonicalization-map.md` — domain/calculations/ 全ファイルの分類

## 直近の主要変更（#673-#730+）

詳細は `references/02-status/recent-changes.md` を参照。

- **正本化体系完成**: 全5正本にパスガード + 体系統合ガード（22ファイル/213テスト）。Zod 契約は必須14/14 + 検討7/9。INV-CANON-01〜16 を不変条件カタログに登録
- **widget orchestrator 統合**: `useWidgetDataOrchestrator` を `UnifiedWidgetContext.readModels` に統合。3正本（purchaseCost/salesFact/discountFact）を全 widget に配布
- **仕入原価正本化**: 3独立正本（通常仕入・売上納品・移動原価）を `readPurchaseCost` に統合。旧7クエリ廃止。取得経路ガード4層防御
- **粗利計算正本化**: 4種の粗利を `calculateGrossProfit` に統一。conditionSummaryUtils の4関数を正本経由に置換。2層構造（計算層 vs 利用層）を文書化
- **Temporal Phase 0-5**: 移動平均 overlay の最小統合。policy は `references/03-guides/temporal-analysis-policy.md`
- **P5/DuckDB 収束**: QueryHandler 移行完了、buildTypedWhere 完全移行
- **Guard 強化**: temporalRollingGuard / purityGuard / codePatternGuard / 正本化ガード群追加

## Explanation（説明責任）

50 MetricId に対して3段階 UX（L1→L2→L3）を提供。
詳細は `references/03-guides/explanation-architecture.md` を参照。
**鉄則:** 計算を再実行しない（StoreResult の値をそのまま使う）。
