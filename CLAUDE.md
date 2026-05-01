# CLAUDE.md - 開発ルール

## プロジェクト概要

仕入荒利管理システム（shiire-arari）。小売業の仕入・売上・在庫データから粗利計算・
予算分析・売上要因分解・需要予測を行うSPA。

## CLAUDE.md Test Contract

本ファイルは複数の guard が要求する暗黙のテスト依存を持つ。
編集前に下表で **何が削除/改変できないか** を確認すること。

- 正本: `docs/contracts/test-contract.json`
- 検証 guard: `app/src/test/guards/testContractGuard.test.ts`
- 自動生成: `tools/architecture-health/src/collectors/test-contract-collector.ts`

新しい guard が CLAUDE.md に新たな必須要素を要求する場合は、test-contract.json
にも宣言を追加する（双方向の整合は testContractGuard が機械検証）。

<!-- GENERATED:START test-contract -->
| Contract | Source guard | 検証内容 | 状態 |
|---|---|---|---|
| `canonicalization-tokens` | `canonicalizationSystemGuard.test.ts` | CLAUDE.md に各トークンが文字列として出現すること | OK |
| `features-modules` | `projectStructureGuard.test.ts` | app/src/features/ 配下の全モジュール名が CLAUDE.md に出現すること（動的） | OK |
| `generated-sections` | `tools/architecture-health/src/docs-check.ts` | GENERATED:START/END マーカー対が CLAUDE.md に存在すること | OK |
| `canonical-table` | `docCodeConsistencyGuard.test.ts` | CANONICAL_PAIRS の実装関数名と定義書名のペアが CLAUDE.md に共起すること | OK |
| `reference-link-existence` | `docRegistryGuard.test.ts` | CLAUDE.md 内の references 配下 .md および docs/contracts 配下 .json パスが全て実在ファイルを指すこと（動的検証、列挙不要） | OK |
| `no-static-numbers` | `docStaticNumberGuard.test.ts` | 現在形の静的数値（N ルール / N テスト / N ガード / N KPI / N 原則 / N ファイル）が generated section / バージョン履歴 / 直近の主要変更 セクション以外の prose に出現しないこと（BASELINE=0） | OK |

> 生成: 2026-05-01T06:27:29.364Z — 正本: `docs/contracts/test-contract.json` — 6/6 契約満足
<!-- GENERATED:END test-contract -->

## AI Single Entry Manifest

AI セッションの動線・階層・発火設計の統一入口は **`.claude/manifest.json`** に集約されている。
本セクション以下の各リンクは manifest 経由でも辿れる。

- **canonicalSources** — 全構造化正本（doc-registry / principles / project-metadata / test-contract / scope.json 群）への参照
- **discovery** — 業務用語 / 専門領域 → 関連 docs の hint マップ（強制ではない、見つけやすさのため）
  - `byTopic`: 粗利計算 / シャープリー分解 / DuckDB クエリ / Explanation L1-L3 等の業務用語起点
  - `byExpertise`: 計算の正しさ / DuckDB 専門 / 説明責任 / 設計判断 等の専門領域起点
- **pathTriggers** — 編集パス → 必読 docs（実装は `tools/architecture-health/src/collectors/obligation-collector.ts` の `PATH_TO_REQUIRED_READS`）
- **activeContext** — AI が作業中に自由記述する notebook（free-form、固定 schema は最小）

整合性は `app/src/test/guards/manifestGuard.test.ts` が機械検証する。
manifest は AI を rigid な rule で縛らない。**入口と道具立てだけ最良に**整え、
AI が context から導き出す力を信頼する設計。

## AAG を背景にした思考

> **AAG 関連 doc 群の単一エントリ**: [`references/01-principles/aag/README.md`](./references/01-principles/aag/README.md) — Layer 0+1 (Meta) / Layer 2+3 (Core) / Layer 4 (Audit) の index。詳細は [`aag/strategy.md`](./references/01-principles/aag/strategy.md) (戦略) / [`aag/architecture.md`](./references/01-principles/aag/architecture.md) (5 層構造) / [`aag/evolution.md`](./references/01-principles/aag/evolution.md) (進化動学) / [`aag/source-of-truth.md`](./references/01-principles/aag/source-of-truth.md) (正本ポリシー) を参照。

### 鉄則 (Project A Phase 3 で薄化、§8.13 判断 = B 適用)

1. **AAG = ガードレール、CLAUDE.md = 動的思考の場** — 振り分け原則: commit / CI で YES/NO 判定可能か? **YES → AAG / NO → CLAUDE.md**
2. **製本されないものを guard 化しない** — guard は canonical doc に裏打ちされる (`AAG-REQ-NON-PERFORMATIVE`)
3. **期間 buffer は anti-ritual** — archive / sunset の trigger は state-based (inbound 0 機械検証 + 人間 deletion approval) のみ (`AAG-REQ-NO-DATE-RITUAL`)
4. **重複と参照を切り分ける** — 上位 content の copy 禁止、下位は pointer + `problemAddressed` + `resolutionContribution` で参照 (`AAG-REQ-ANTI-DUPLICATION` + `AAG-REQ-SEMANTIC-ARTICULATION`)
5. **AAG PASS = ルール準拠であり、「良い実装」を保証しない** — AAG が床を保証した上で CLAUDE.md は意図 / 粒度 / 専門性 / 保留 / より良い形 / AAG が拾わない壊れ方を能動的に問う

> **「良くすること」は目的ではない。その先の到達点を実現するために、要件を正しく理解した上で改善する (局所対応しない)**。

### 動的思考の材料 (hint であって rule ではない)

- **業務用語 / 専門性**: `.claude/manifest.json` の `discovery.byTopic` / `byExpertise`
- **AAG 詳細**: [`references/01-principles/aag/`](./references/01-principles/aag/) (戦略 / 構造 / 進化 / 運用区分 / 正本 / layer-map)
- **設計原則の詳細**: [`references/01-principles/design-principles.md`](./references/01-principles/design-principles.md)
- **過去の判断履歴**: [`references/02-status/recent-changes.md`](./references/02-status/recent-changes.md)
- **思考の途中経過**: `.claude/manifest.json` の `activeContext.workingNotes` / `openQuestions` に free-form (強制ではない、揮発物は commit されない)

## ロール・スキルシステム

開発タスクの品質を構造的に保証するためのロールベースシステム。
詳細プロトコル・判断基準・連携ルールは各 `roles/<role>/ROLE.md` + `SKILL.md` を参照。
タスクからロールへの consult 経路は `manifest.discovery.byExpertise` 経由。

### 4層モデル

| 層 | 担い手 | 責務 |
|---|---|---|
| Authority | 人間 | 何をやるか・やらないか（最終意思決定） |
| Orchestration | CLAUDE.md（本セクション） | タスク→ロール→連携の自動ルーティング |
| Identity | roles/*/ROLE.md | 各ロールの前提・価値基準・判断基準 |
| Execution | roles/*/SKILL.md | 論理構造（因果関係）と方法論（手順） |

### ロール一覧

**スタッフ部門（staff/）** — 報告を受けて自律的に品質責任を果たす

| ロール | 品質責任 |
|---|---|
| pm-business | 要件の正確さ・受入基準の測定可能性（指示者・要件入口）|
| review-gate | 設計原則・ガードテスト・CI 通過（品質の出口）|
| documentation-steward | CLAUDE.md・roles/・references/ とコードの整合性（記録の出口）|

**実務部門（line/）** — 設計→実装→専門検証

| ロール | 担当領域 |
|---|---|
| architecture | 設計判断（**設計原則の管理者**） |
| implementation | コーディング（コードを書く唯一のロール）|
| specialist/invariant-guardian | 数学検証（シャープリー恒等式・計算正確性）|
| specialist/duckdb-specialist | DuckDB クエリ・スキーマ・SQL/JS 責務境界 |
| specialist/explanation-steward | Explanation L1-L3 の説明責任 |

### 知識の3層分類

| 層 | 配置先 | 読むタイミング |
|---|---|---|
| **AI 単一エントリ** | `.claude/manifest.json`（discovery + canonicalSources）| セッション中いつでも（道具立て）|
| **全員必読** | CLAUDE.md（本ファイル） | 常に（セッション開始時） |
| **ロール固有** | roles/*/ROLE.md + SKILL.md | タスク開始時（1-2ロール分） |
| **必要時参照** | references/ | 実装中に必要な箇所だけ |

### 越境検出（mechanism）

各ロールの編集権限境界は `roles/<role>/scope.json` で宣言される（owns / out_of_scope_warn）。
pre-commit hook が staged ファイルの role 帰属を informational 表示し、
`scopeJsonGuard.test.ts` が宣言の整合性を機械検証する。
**「気をつける」（exhortation）ではなく mechanism として運用する**（G8 適用）。

### フィードバックスパイラル（mechanism）

品質改善ループは AAG の ratchet-down 機構で実装されている。
- review-gate FAIL → migrationRecipe / fix-now hint で復帰経路が機械生成（`tools/architecture-health/src/aag-response.ts`）
- 同種バグ 2 回発生 → guard に baseline 追加、ratchet-down で再発防止（`responsibilityTagGuard.test.ts` 等）
- ロール判断の明確化 → `roles/<role>/ROLE.md` の判断基準セクションを更新

**原則:** 「気をつける」で終わらせない。再発を防ぐ構造（テスト・guard・ratchet-down）に変換する（G8）。

## プロジェクト構成

詳細は `references/02-status/project-structure.md` を参照（正本）。

```
app/src/
├── domain/           # ドメイン層（フレームワーク非依存、純粋関数）
├── application/      # アプリケーション層（hooks, stores, usecases, queries, workers, services/temporal）
├── infrastructure/   # インフラ層（DuckDB, storage, export, i18n, pwa）
├── presentation/     # プレゼンテーション層（components, pages, theme）
├── features/         # 縦スライス（13モジュール: budget, category, clip-export, comparison, cost-detail, forecast, purchase, reports, sales, shared, storage-admin, time-slot, weather）
├── stories/          # Storybook
└── test/             # ガードテスト・共有インフラ
    ├── guardTestHelpers.ts   # 共有ヘルパー（collectTsFiles, rel 等）
    ├── guardTagRegistry.ts   # ガードタグのメタデータ管理
    ├── architectureRules.ts  # Consumer facade（物理正本は app-domain/gross-profit/rule-catalog/base-rules.ts）
    ├── allowlists/           # 許可リスト（カテゴリ別分割）
    │   ├── architecture.ts   #   層境界ルール
    │   ├── complexity.ts     #   行数・useMemo 制限
    │   ├── duckdb.ts         #   DuckDB hook
    │   ├── size.ts           #   ファイルサイズ
    │   ├── performance.ts    #   パフォーマンス制限
    │   ├── migration.ts      #   比較移行
    │   └── misc.ts           #   その他
    ├── calculationCanonRegistry.ts  # domain/calculations/ 全ファイル分類
    ├── guards/               # 構造制約ガード（件数は generated section 参照）
    │   ├── analysisFrameGuard.test.ts
    │   ├── architectureRuleGuard.test.ts
    │   ├── calculationCanonGuard.test.ts
    │   ├── canonicalInputGuard.test.ts
    │   ├── canonicalizationSystemGuard.test.ts
    │   ├── codePatternGuard.test.ts
    │   ├── comparisonScopeGuard.test.ts
    │   ├── customerFactPathGuard.test.ts
    │   ├── customerGapPathGuard.test.ts
    │   ├── dataIntegrityGuard.test.ts
    │   ├── discountFactPathGuard.test.ts
    │   ├── dualRunExitCriteriaGuard.test.ts
    │   ├── factorDecompositionPathGuard.test.ts
    │   ├── fallbackMetadataGuard.test.ts
    │   ├── freePeriodBudgetPathGuard.test.ts
    │   ├── freePeriodDeptKPIPathGuard.test.ts
    │   ├── freePeriodPathGuard.test.ts
    │   ├── grossProfitConsistencyGuard.test.ts
    │   ├── grossProfitPathGuard.test.ts
    │   ├── layerBoundaryGuard.test.ts
    │   ├── noNewDebtGuard.test.ts
    │   ├── oldPathImportGuard.test.ts
    │   ├── pageMetaGuard.test.ts
    │   ├── piValuePathGuard.test.ts
    │   ├── presentationIsolationGuard.test.ts
    │   ├── purchaseCostImportGuard.test.ts
    │   ├── purchaseCostPathGuard.test.ts
    │   ├── purityGuard.test.ts
    │   ├── queryPatternGuard.test.ts
    │   ├── renderSideEffectGuard.test.ts
    │   ├── responsibilitySeparationGuard.test.ts
    │   ├── responsibilityTagGuard.test.ts
    │   ├── salesFactPathGuard.test.ts
    │   ├── sizeGuard.test.ts
    │   ├── storeResultAnalysisInputGuard.test.ts
    │   ├── structuralConventionGuard.test.ts
    │   ├── temporalRollingGuard.test.ts
    │   ├── temporalScopeGuard.test.ts
    │   └── topologyGuard.test.ts
    ├── audits/               # アーキテクチャ監査
    ├── temporal/             # temporal path テスト
    └── observation/          # WASM 不変条件テスト（全 5 engine authoritative）
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
cd app && npm run docs:generate   # health 収集 + generated section 更新
cd app && npm run docs:check      # 生成差分未反映を検出（CI で使用）
cd app && npm run health          # architecture health 単体実行
cd app && npm run health:check    # health 判定のみ（書き込みなし）
```

### CI パイプライン

CI は `wasm-build` → `fast-gate` → (`docs-health` + `test-coverage` + `e2e`) の依存構造で実行される。
`wasm-build` が WASM モジュールを artifact として配布し、後続ジョブが利用する。

**wasm-build（前段 — WASM artifact 生成）:**
0. `wasm-pack build` — 全 WASM モジュール（factor-decomposition, gross-profit, budget-analysis, forecast, time-slot, statistics, core-utils）

**fast-gate（高速ゲート — wasm-build 後に実行）:**
1. `npm run lint` — ESLint（**エラー0必須**）
2. `npm run format:check` — Prettier（**準拠必須**）
3. `npm run build` — tsc -b + vite build（**strict mode**）
4. `npm run test:guards` — ガードテスト（**構造制約の即時検証**）

**docs-health（fast-gate 後に並列実行 — 生成差分検出 + health 判定）:**
5. `npm run build` — バンドルサイズ収集のためのビルド
6. `npm run docs:check` — generated section の鮮度検証 + hard gate 判定

**test-coverage（fast-gate 後に並列実行）:**
7. `npx vitest run --coverage` — vitest + カバレッジ（**lines 55%**）
8. `npm run build-storybook` — Storybook ビルド（**ストーリーの型・import 健全性**）

**e2e（fast-gate 後に並列実行）:**
9. `npm run test:e2e` — Playwright E2E（**全シナリオ通過**）

## コーディング規約

詳細は `references/03-guides/coding-conventions.md` を参照。

- **strict mode** / `noUnusedLocals` / `noUnusedParameters` — ビルドで強制
- パスエイリアス: `@/` → `src/`
- `any` 禁止（lint エラー）、`readonly` 推奨
- `authoritative` 単独使用禁止 — 必ず `business-authoritative` / `analytic-authoritative` / `candidate-authoritative` で修飾する（`references/01-principles/semantic-classification-policy.md`）
- パーセント小数第2位（`formatPercent`）、金額整数（`formatCurrency`）
- Prettier: `semi: false` / `singleQuote: true` / `printWidth: 100`

## ドキュメント運用原則

ドキュメントはコードの一部であり、品質保証の一部であり、運用の一部である。
「書く文化」ではなく「通過条件」として扱う。

> **基本思想:** ドキュメントはその機能を説明するためにある。そこに課題が紛れる
> とノイズになる。**live な作業項目（やることリスト）の正本は
> `projects/<id>/checklist.md` のみ。** references/ / CLAUDE.md / roles/ には
> live task table を一切書かない。詳細:
> [`references/03-guides/project-checklist-governance.md`](./references/03-guides/project-checklist-governance.md)
> （AAG Layer 4A System Operations）。

### 3層分離

| 層 | 内容 | 更新主体 |
|---|---|---|
| **定義層** | 原則・正本定義・受け入れ基準・invariant | 人（変わりにくい） |
| **実態層** | health metrics・snapshot・coverage・bundle size | 機械（`docs:generate`） |
| **判断層** | roadmap・tradeoff・判断理由・移行方針 | 人（方針のみ） |

### 鉄則

- **prose に現在値を書かない** — 件数・残数・bridge 数・bundle size は全て generated section に寄せる
- **generated section が古ければ CI が落ちる** — `docs:check` が差分を検出して fail
- **パス変更に doc 更新義務がある** — obligation map が自動検出（`tools/architecture-health/src/collectors/obligation-collector.ts`）
- **文書にも API を持たせる** — 全 KPI に `id` / `docRefs` / `implRefs` があり、定義書・guard・実装ファイルと双方向にリンク
- **guard / allowlist を変更したら `cd app && npm run docs:generate` を実行してからコミットする** — pre-commit hook（`tools/git-hooks/pre-commit`）が未実行を検出してブロック

### Obligation Map（パス → 更新義務）

| 変更パス | 更新義務 |
|---|---|
| `app/src/test/allowlists/` | health regeneration |
| `app/src/application/readModels/` | 定義書リンク確認 |
| `app/src/test/guards/` | health regeneration |
| `app/src/domain/calculations/` | calculationCanonRegistry 確認 |
| `.github/workflows/` | project-metadata.json 確認 |
| `wasm/` | setup docs 確認 |
| `references/01-principles/` | principles.json 確認 |
| `projects/` | project-health 再生成 + checklist format guard 通過 |

### 正本構造

```
docs/contracts/*.json     �� 構造化正本（principles, project-metadata）
    ↓ 入力
tools/architecture-health/ ← 収集 → 評価 → 生成
    ↓ 出力
references/02-status/generated/
  architecture-health.json ← KPI 正本（全指標 + docRefs + implRefs）
  architecture-health.md   �� ビュー（人間可読レポート）
    ↓ 埋め込み
CLAUDE.md / technical-debt-roadmap.md の generated section
```

## 設計原則 — 9カテゴリ

詳細・適用例は `references/01-principles/design-principles.md` を参照。管理責任: architecture。
H カテゴリの詳細は `references/01-principles/safe-performance-principles.md` を参照。
Safety Tier 分類は `references/01-principles/critical-path-safety-map.md` を参照。
安全設計改善計画は `references/03-guides/safety-first-architecture-plan.md` を参照。
モジュラーモノリス進化は `references/01-principles/modular-monolith-evolution.md` を参照。

| カテゴリ | 要点 |
|---------|------|
| **A. 層境界** | 4層依存ルール（A1）、Domain 純粋（A2）、Presentation 描画専用（A3）、契約は Domain 定義（A4）、DI は App.tsx のみ（A5）、load 3段階分離（A6） |
| **B. 実行エンジン境界** | Authoritative 計算は domain/calculations のみ（B1）、JS/SQL 二重実装禁止（B2）、率は domain で算出（B3） |
| **C. 純粋性と責務分離** | 1ファイル=1変更理由（C1）、pure 1仕様軸（C2）、store は state のみ（C3）、描画純粋（C4）、最小セレクタ（C5）、facade は orchestration のみ（C6）、同義API併存禁止（C7）、**1文説明テスト（C8）**、**現実把握優先（C9）** |
| **D. 数学的不変条件** | 要因分解合計=売上差（D1）、引数無視再計算禁止（D2）、不変条件はテストで守る（D3） |
| **E. 型安全と欠損処理** | 境界で検証（E1）、依存配列省略禁止（E2）、sourceDate 保持（E3）、欠損は `== null`（E4） |
| **F. コード構造規約** | バレル後方互換（F1）、文字列カタログ（F2）、全パターン同一（F3）、パス配置（F4）、Contract 管理（F5）、文脈継承（F6）、View に raw 禁止（F7）、正本保護（F8）、Raw=唯一真実源（F9） |
| **G. 機械的防御** | テストに書く（G1）、エラー伝播（G2）、警告黙殺禁止（G3）、テスト用export禁止（G4）、サイズ上限（G5/G6）、キャッシュ≤本体（G7）、**責務分離ガード（G8）** |
| **H. Screen Runtime** | Screen Plan 経由のみ（H1）、比較は pair/bundle 契約（H2）、query input 正規化必須（H3）、component に acquisition logic 禁止（H4）、visible-only は plan 宣言（H5）、ChartCard は通知のみ（H6） |
| **Q. Query Access Architecture** | Chart は DuckDB hook 直接 import 禁止（Q3）、alignment-aware access は handler/resolver に閉じる（Q4） |
| **I. 意味分類** | `authoritative` 単独使用禁止（I1）、意味責任で棚を分ける — business vs analytic（I2）、current と candidate を混ぜない（I3）、正本は calculationCanonRegistry の1つだけ（I4） |

**制約の変更:** 「邪魔だから」は理由にならない。「別の仕組みで防がれるようになった」は理由になる。

C8（1 文説明テスト）/ C9（現実把握優先）/ G8（責務分離ガード）の詳細は
`references/01-principles/design-principles.md` を参照。

### Adaptive Architecture Governance (AAG)

本プロジェクトのアーキテクチャ品質は AAG により機械的に保証・進化される（mechanism は
本 CLAUDE.md「## AAG を背景にした思考」セクション参照）。

- 詳細: `references/01-principles/aag/strategy.md` (戦略 + 文化論 + AAG の本質 + AI 対話、Project A Phase 1〜2 で `adaptive-architecture-governance.md` から Split + Rewrite、Phase 5.8 で旧 doc archive)
- 進化方針: `references/01-principles/aag/evolution.md` (Project A Phase 1 で `adaptive-governance-evolution.md` から Rewrite + Relocate + Rename)
- Architecture Rule 運用: `references/03-guides/architecture-rule-system.md`
- ルール定義: `app/src/test/architectureRules.ts`（consumer facade — 全 consumer はここ経由）
- 整合性検証: `app/src/test/guards/architectureRuleGuard.test.ts`

### taxonomy-binding（AI Vocabulary Binding）

`taxonomy-v2` family（責務軸 R:* + テスト軸 T:*）は AAG 第 3 の柱として運用される。
**AI は新タグを単独で提案・追加できない**（Constitution 原則 3「語彙生成は高コスト儀式」）。

#### AI が触ってよいこと

- `R:unclassified` / `T:unclassified` への退避（判断保留）
- registry **登録済み** タグの新規ファイルへの付与
- Origin Journal の `lastReviewedAt` 更新
- guard baseline の **ratchet-down**（増加方向は禁止）

#### AI が触ってはいけないこと（review window 経路でのみ可）

- 新 R:tag / 新 T:kind の追加（Constitution + registry + Origin Journal の改変）
- 既存タグの retirement（active → deprecated → retired）
- Antibody Pair の組み換え
- Cognitive Load Ceiling（軸ごと 15）の引き上げ
- AR-TAXONOMY-* rule baseline の **緩和**（増加方向）
- Interlock マトリクスの required T:kind 追加・削除

#### review window への提案手順

1. `references/02-status/taxonomy-review-journal.md`（Phase 2 で landing）に提案 entry を追加
2. 提案には Why / 対応 Antibody Pair / 必須 T:kind（または R:tag）/ 推定 promotionLevel を併記
3. 四半期 review window で人間判断 → 承認後にのみ registry / Constitution / Interlock を改変

#### 違反検出

- `AR-TAXONOMY-AI-VOCABULARY-BINDING`（plan §AR-TAXONOMY-* 仕様正本）が git diff で新タグ追加 + 対応 review record の不在を検出して hard fail
- `AR-TAXONOMY-NO-UNTAGGED` がタグなし状態を hard fail
- `AR-TAXONOMY-KNOWN-VOCABULARY` が registry 未登録タグの使用を hard fail

#### v1 / TSIG 撤去状況（Phase 7→8 完遂、2026-04-27）

| 軸 | 撤退対象 | `@deprecated since` | 物理削除日 | 置換先 |
|---|---|---|---|---|
| 責務軸 (R:\*) | `responsibilityTagRegistry.ts` + `responsibilityTagGuard.test.ts` | 2026-04-27 | **2026-04-27 retired** | v2 R:tag (10 件、L5 Guarded、`responsibilityTaxonomyRegistryV2.ts`) で完全置換 |
| テスト軸 (T:\*) | `testSignalIntegrityGuard.test.ts`（TSIG-TEST-01 / TSIG-TEST-04 / TSIG-COMP-03）| 2026-04-27 | **2026-04-27 retired** | v2 T:kind (15 件、L5 Guarded、`testTaxonomyRegistryV2.ts`) で完全置換 |

> **2026-04-27 ad-hoc human review** (`taxonomy-review-journal.md` §3.1) で **90 日 cooling 撤廃**を承認 → Phase 7 → Phase 8 を同日中に完遂。internal-only codebase での儀式的 cooling は不要と判定（migration は machine-verifiable）。

- v2 vocabulary は **新規 file で必須**（v1 / TSIG vocabulary は registry / guard が物理削除済、参照すれば V2-R-2 hard fail）
- 詳細マップ: `references/03-guides/responsibility-v1-to-v2-migration-map.md` §3.4 / `references/03-guides/test-tsig-to-v2-migration-map.md` §3.5
- AR-G3-SUPPRESS-RATIONALE は **撤退対象外**（scope 違いで恒久維持）

詳細:

- Constitution 本体: `references/01-principles/taxonomy-constitution.md`
- Interlock マトリクス: `references/01-principles/taxonomy-interlock.md`
- Origin Journal: `references/01-principles/taxonomy-origin-journal.md`
- 親 plan: `projects/taxonomy-v2/plan.md` §Operational Control System / §AR-TAXONOMY-*

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
意味分類ポリシーは `references/01-principles/semantic-classification-policy.md` を参照。

| Engine | 実装 | 制約 |
|--------|------|------|
| **Authoritative** | `domain/calculations/` + WASM（business-authoritative 3 + analytic-authoritative 2） | pure only。WASM が ready なら WASM、そうでなければ TS fallback |
| **Application** | TypeScript（hooks, stores, usecases） | pure + business-authoritative / analytic-authoritative な処理を新規実装しない |
| **Exploration** | DuckDB SQL | 正式値の唯一定義元にしない |

> **用語規則:** `authoritative` を単独語で使用しない。必ず `business-authoritative` / `analytic-authoritative` / `candidate-authoritative` として修飾する。

## 数学的不変条件

シャープリー恒等式・不変条件の詳細は `references/03-guides/invariant-catalog.md` を参照。
**合計値は実際の売上差に完全一致。** カテゴリデータからの再計算は禁止（D1/D2）。

## 許可リスト・ガード運用

詳細は `references/03-guides/allowlist-management.md` を参照。
即差し戻し条件は `roles/staff/review-gate/SKILL.md` を参照。

## 仕入原価の正本ルール

詳細は `references/01-principles/purchase-cost-definition.md` を参照（manifest.discovery.byTopic 経由）。
実施計画は `references/03-guides/purchase-cost-unification-plan.md` を参照。
実装関数 / 定義書 / ガードのペアは「## 正本化体系（readModels）」セクションを参照。

## 実行時データ経路（実装の主経路）

詳細は `references/03-guides/runtime-data-path.md` を参照。
実装上の主経路は 2 本（**正本 lane** = infra query → QueryHandler → pure builder → readModel / calculateModel
／ **Screen Plan lane** = Controller → hook → Screen Plan → useQueryWithHandler → View）。

### 現在値の参照先

allowlist 件数、bridge 残数、複雑度 hotspot などの「現在値」は prose ではなく
`references/02-status/generated/architecture-health.json` を正本とする。
詳細レポート: `references/02-status/generated/architecture-health.md`

<!-- GENERATED:START architecture-health-summary -->
**Healthy** | 前回比: Improved | Hard Gate: PASS

| 指標 | 状態 | 詳細 |
|---|---|---|
| 例外圧 | OK | 14/20 / 0/0 / 6/10 |
| 後方互換負債 | OK | 0/3 / 0/3 |
| 複雑性圧 | OK | 1/5 / 10/10 / 25/30 |
| 境界健全性 | OK | 0/0 / 0/0 |
| ガード強度 | OK | 126/30 / 0/5 |
| 性能 | OK | 6601/7000 / 2386/2500 / 919/1000 |
| Temporal Governance | OK | 0/0 / 0/32 / 2/12 / 171/92 / 35/9 / 2/1 |
| Rule Efficacy | OK | 103 / 0/3 / 0/10 |
| Project Governance | OK | 4/20 / 3/20 / 0/0 / 34/100 |

**Next:**
- 上限間近ファイル 1 件を分割検討する

> 生成: 2026-05-01T06:27:29.356Z — 正本: `references/02-status/generated/architecture-health.json`
<!-- GENERATED:END architecture-health-summary -->

## 正本化体系（readModels）

主要な業務値は `application/readModels/` に正本化されている。
定義書は `references/01-principles/` を参照。

ただし、実装上の取得経路は次の 2 系統を持つ:
1. **共通正本系** — `useWidgetDataOrchestrator` が取得系 readModel を統合配布
2. **画面固有集約系** — `useXxxPlan` + `useQueryWithHandler` で画面固有の比較・階層・補助系列を束ねる

| 正本 | ReadModel | 定義書 | パスガード |
|------|-----------|--------|-----------|
| 仕入原価 | `readPurchaseCost()` | `purchase-cost-definition.md` | purchaseCostPathGuard + importGuard |
| 粗利 | `calculateGrossProfit()` | `gross-profit-definition.md` | grossProfitPathGuard + consistencyGuard |
| 売上・販売点数 | `readSalesFact()` | `sales-definition.md` | salesFactPathGuard |
| 値引き | `readDiscountFact()` | `discount-definition.md` | discountFactPathGuard |
| 客数 | `readCustomerFact()` | `customer-definition.md` | customerFactPathGuard |
| 要因分解 | `calculateFactorDecomposition()` | `authoritative-calculation-definition.md` | factorDecompositionPathGuard |
| 自由期間分析 | `readFreePeriodFact()` | `free-period-analysis-definition.md` | freePeriodPathGuard |
| 自由期間予算 | `readFreePeriodBudgetFact()` | `free-period-budget-kpi-contract.md` | freePeriodBudgetPathGuard |
| 自由期間部門KPI | `readFreePeriodDeptKPI()` | `free-period-budget-kpi-contract.md` | freePeriodDeptKPIPathGuard |
| 予算 | StoreResult（統一済み） | `budget-definition.md` | — |
| KPI | StoreResult（統一済み） | `kpi-definition.md` | — |
| PI値 | `calculateQuantityPI()` / `calculateAmountPI()` | `pi-value-definition.md` | piValuePathGuard |
| 客数GAP | `calculateCustomerGap()` | `customer-gap-definition.md` | customerGapPathGuard |

- **体系統合ガード:** `canonicalizationSystemGuard.test.ts` — 全 readModel ディレクトリ・定義書・CLAUDE.md 参照を検証
- **計算レジストリ:** `calculationCanonRegistry.ts` + `calculationCanonGuard.test.ts` — domain/calculations/ 全ファイルの分類管理
- **Zod 契約:** 全 queryToObjects + readModels の .parse() fail fast + domain/calculations Zod 適用
- **不変条件:** `invariant-catalog.md` に正本化不変条件を登録
- **正本化原則:** `references/01-principles/canonicalization-principles.md`
- **正本化マップ:** `references/01-principles/calculation-canonicalization-map.md` — domain/calculations/ 全ファイルの分類

## 直近の主要変更

正本: `references/02-status/recent-changes.md`（最新 v は当該ファイル冒頭を参照）。
CLAUDE.md には changelog を記載しない（L1 = 鉄則・索引、履歴は L2）。

## Explanation（説明責任）

50 MetricId に対して3段階 UX（L1→L2→L3）を提供。
詳細は `references/03-guides/explanation-architecture.md` を参照。
**鉄則:** 計算を再実行しない（StoreResult の値をそのまま使う）。
