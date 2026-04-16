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

### C8: 1 文説明テスト — 責務の判定基準

> **このインスタンスの責務を「〜を担う」の 1 文で説明できるか？**

- 説明に **AND** が入ったら分離候補
- 行数ではなく **変更理由の数** で判定する（600 行でも変更理由 1 つなら OK、10 行でも 2 つなら分離候補）
- 分割すればいいという問題ではない。適切なインスタンスで構成され、責務が広がりすぎていないかが重要
- 「この意味を説明できる粒度」が正しい粒度

詳細・24 パターンカタログ: `references/03-guides/responsibility-separation-catalog.md`

### C9: 現実把握優先 — 嘘の分類より正直な未分類

> **1 番大事なのは現実を正しく把握すること。**

- 自動推定で全ファイルにタグを振ると「嘘の単一責務」が生まれる
- 正確に分類できないものは未分類のまま残す
- 未分類の数を正確に把握し、増えないことを CI で保証する
- 段階的に正確な分類を増やし、未分類を減らす
- 形式的チェック（ファイルが触られたか）より実効性のある機械的検出を優先する

### G8: 責務分離ガード — 機械的に検出して強制する

> **「気をつける」で終わらせない。「通らない」にする。**

7 種の機械検出（`responsibilitySeparationGuard.test.ts`）:

| ガード | 検出対象 | 上限 |
|---|---|---|
| P2 | presentation/ の getState() | 0（allowlist 管理） |
| P7 | module-scope let | 0（allowlist 管理） |
| P8 | useMemo + useCallback 合計 | ≤12 |
| P10 | features/ の useMemo / useState | ≤7 / ≤6 |
| P12 | domain/models/ の export 数 | ≤8 |
| P17 | storeIds 正規化の散在ファイル数 | ≤27（集約） |
| P18 | fallback 定数密度 | ≤7/file |

R: 責務タグレジストリ（`responsibilityTagGuard.test.ts`）:
- 未分類 BASELINE = 400（ratchet-down: 減少のみ許可。減ったらベースライン更新を促す）
- タグ不一致 BASELINE = 51（ratchet-down: 同上）
- 分類時は複数タグ可（AND の可視化）
- 既存は徐々にタグ付け。新規は登録必須

### Adaptive Architecture Governance (AAG)

本プロジェクトのアーキテクチャ品質は **AAG** により機械的に保証・進化される。
詳細: `references/01-principles/adaptive-architecture-governance.md`
進化方針: `references/01-principles/adaptive-governance-evolution.md`

AAG は「発見 → 蓄積 → 評価」の 3 層サイクルでルール自体を継続的に改善する。
ルールは仮説であり、回避が生まれたらルールを疑う。

### Architecture Rule — 実行可能なアーキテクチャ仕様

> **ガードが「禁止」と「導き」の両方を持つ。ルールは書かれるのではなく、育つ。**

詳細な運用ガイド: `references/03-guides/architecture-rule-system.md`

各ルールが「禁止パターン」「あるべき姿」「なぜ」「ドキュメント」をセットで定義する。
ルール定義: `app/src/test/architectureRules.ts`（consumer facade — **全 consumer はここ経由**）
整合性検証: `app/src/test/guards/architectureRuleGuard.test.ts`

### Governance 3 分割 — AAG 正本の配置

| 概念 | ファイル | 正本区分 |
|---|---|---|
| **BaseRule**（案件非依存） | `app-domain/gross-profit/rule-catalog/base-rules.ts` | App Domain 正本 |
| **ExecutionOverlay**（案件運用状態） | `projects/<active>/aag/execution-overlay.ts` | Project Overlay 正本 |
| **Derived merge** | `app/src/test/architectureRules/merged.ts` | Derived Artifact |
| **Facade**（consumer 入口） | `app/src/test/architectureRules.ts` / `architectureRules/index.ts` | Single Entry |

- consumer は必ず facade 経由で参照する（`from '../architectureRules'`）
- 直 import は `AR-AAG-DERIVED-ONLY-IMPORT` 系ルールで禁止される（件数は generated section 参照）
- project 切替点: `CURRENT_PROJECT.md` + `projects/<id>/config/project.json`（vite/vitest/tools は resolver 経由、tsconfig は暫定静的）
- 詳細: `references/03-guides/governance-final-placement-plan.md`, `app/src/test/architectureRules/README.md`

| detection.type | 意味 | 例 |
|---|---|---|
| `import` | 禁止 import | presentation → wasmEngine |
| `regex` | 禁止コードパターン | getExecutionMode |
| `count` | 数値上限 | useMemo ≤ 12 |
| `must-include` | 必ず含む | `R:calculation` → Zod parse |
| `must-only` | これ以外禁止 | `R:barrel` → re-export のみ |
| `co-change` | A→B 共変更 | readModel 型 → Zod schema |
| `must-not-coexist` | 同居禁止 | useState と SQL query |
| `custom` | 特殊ロジック | テスト側で実装 |

**全ルールに migrationRecipe + executionPlan + doc（decisionCriteria の件数は generated section 参照）**

各ルールが持つ情報:
- `what` / `why` / `doc` — 学習コスト削減
- `correctPattern` / `example` — 自己修復
- `outdatedPattern` / `codeSignals` — 検出
- `migrationRecipe` — 修正手順（App Domain の安定知識）
- `executionPlan` — 工数 + 優先度（Project Overlay の案件運用状態）
- `decisionCriteria` — 判断の脱属人化
- `relationships` — ルール間の因果関係
- `thresholds` / `baseline` — 数値管理（ratchet-down）

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

詳細は `references/01-principles/purchase-cost-definition.md` を参照。
実施計画は `references/03-guides/purchase-cost-unification-plan.md` を参照。

- **正本:** `readPurchaseCost()` が唯一の read 関数。3独立正本（通常仕入・売上納品・移動原価）を `PurchaseCostReadModel` として構築
- **UI 層の入口:** `usePurchaseCost()` を標準入口とする
- **Application 層:** `purchaseCostHandler` / `readPurchaseCost()` の直接使用を許容
- **禁止:** 旧クエリ（queryPurchaseTotal 等7関数）は廃止済み。復活禁止
- **移動原価:** IN + OUT の全方向を含める（IN のみは二重計上になるため禁止）
- **ガード:** `purchaseCostPathGuard.test.ts` + `purchaseCostImportGuard.test.ts` で保証

## 実行時データ経路（実装の主経路）

実装上の主経路は 2 本に整理すると理解しやすい。
詳細は `references/03-guides/runtime-data-path.md` を参照。

### 1. 正本 lane（業務値の意味を確定する経路）

```
infra query → QueryHandler → pure builder → readModel / calculateModel → widget が消費
```

- **handler** は acquisition orchestration を担う（例: `salesFactHandler.ts`）
- **pure builder** は値の意味と runtime 契約（Zod parse）を担う（例: `buildSalesFactReadModel()`）
- handler 側に業務意味論を持ち込まない

### 2. Screen Plan lane（画面固有の取得・比較を束ねる経路）

```
Controller → application hook → Screen Plan → useQueryWithHandler → QueryHandler 群 → View
```

- **Screen Plan**（`useXxxPlan`）が comparison routing・query orchestration を管理
- **useQueryWithHandler** が debounce / cache / stale discard / profiling を担う標準経路
- component に acquisition logic を書かない

### presentation 側の共通入口

`useUnifiedWidgetContext` → comparison slice / query slice / weather slice / chart interaction slice
`query slice` → `useWidgetQueryContext` / `useWidgetDataOrchestrator`

### 現在値の参照先

allowlist 件数、bridge 残数、複雑度 hotspot などの「現在値」は prose ではなく
`references/02-status/generated/architecture-health.json` を正本とする。
詳細レポート: `references/02-status/generated/architecture-health.md`

<!-- GENERATED:START architecture-health-summary -->
**RISK** | 前回比: Flat | Hard Gate: FAIL

| 指標 | 状態 | 詳細 |
|---|---|---|
| 例外圧 | OK | 13/20 / 0/0 / 6/10 |
| 後方互換負債 | OK | 0/3 / 2/3 |
| 複雑性圧 | OK | 0/5 / 10/10 / 27/30 |
| 境界健全性 | OK | 0/0 / 0/0 |
| ガード強度 | OK | 75/30 / 0/5 |
| 性能 | OK | 6506/7000 / 2229/2500 / 919/1000 |
| Temporal Governance | OK | 0/0 / 32/32 / 1/12 / 147/92 / 16/9 / 1/1 |
| Rule Efficacy | OK | 84 / 0/3 / 0/10 |
| Project Governance | OK | 3/20 / 2/20 / 0/0 / 9/100 |

**Next:**
- Doc 更新義務違反数 を budget 0 以下に修正する

> 生成: 2026-04-16T07:48:58.343Z — 正本: `references/02-status/generated/architecture-health.json`
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

## 直近の主要変更（#673-#848+）

詳細は `references/02-status/recent-changes.md` を参照。

- **v1.7.0 アーキテクチャ改善**: readModel pure builder 化（5モデル）、God Hook 3分割、Category チャート features/ 移行（35ファイル）
- **正本化体系完成**: 全正本にパスガード + 体系統合ガード（30ファイル/269テスト）。Zod 契約は必須13/13 + 検討7/9。INV-CANON-01〜16 を不変条件カタログに登録
- **widget orchestrator 統合**: `useWidgetDataOrchestrator` を `UnifiedWidgetContext.readModels` に統合。3正本（purchaseCost/salesFact/discountFact）を全 widget に配布
- **仕入原価正本化**: 3独立正本（通常仕入・売上納品・移動原価）を `readPurchaseCost` に統合。旧7クエリ廃止。取得経路ガード4層防御
- **粗利計算正本化**: 4種の粗利を `calculateGrossProfit` に統一。2層構造（計算層 vs 利用層）を文書化
- **Temporal Phase 0-5**: 移動平均 overlay の最小統合。policy は `references/03-guides/temporal-analysis-policy.md`
- **P5/DuckDB 収束**: QueryHandler 移行完了、buildTypedWhere 完全移行
- **Guard 大幅強化**: 22→39ファイル。analysisFrame, comparisonScope, customerGap, dualRunExitCriteria, fallbackMetadata, grossProfitConsistency, oldPathImport, pageMeta, piValue, queryPattern, renderSideEffect, temporalScope, topology, dataIntegrity, responsibilitySeparation, responsibilityTag, architectureRule
- **ドキュメント整合性基盤**: `docs/contracts/` に構造化データ（principles.json, project-metadata.json）導入。documentConsistency.test.ts で機械検証
- **進化安全の再構成（2026-04-05）**: WASM 全 5 engine を authoritative に昇格（bridge 1,426→431 行）。dual-run infrastructure 全面退役（~5,500 行削減）。ComparisonWindow 契約型導入。near-limit 2→0。noNewDebtGuard + Green/Yellow/Red 1 人運用モデル。Health: RISK → Healthy
- **Architecture Rule 導入（2026-04-07）**: 統一ガードフォーマット。「禁止」「あるべき姿」「なぜ」「ドキュメント」をセットで定義。8種の detection type。architectureEpoch.ts + responsibilityTagExpectations.ts 廃止 → architectureRules.ts に統合。タグ別閾値（18 タグ）+ noNewDebtGuard（5 ルール）= 計 23 ルール。ratchet-down 方式で未分類・タグ不一致を管理
- **Architecture Rule 昇華（2026-04-07）**: 84 ルール / 全 39 ガード統合 / 全ルールに migrationPath + doc + decisionCriteria。maturity（experimental/stable/deprecated）+ 例外圧検出 + ratchet-down 自動進行。全 guard タグ（50+）をルールでカバー。27 ドキュメント双方向リンク。allowlist に ruleId フィールド追加。運用ガイド: `references/03-guides/architecture-rule-system.md`
- **Temporal Governance（2026-04-07）**: reviewPolicy（owner/lastReviewedAt/reviewCadenceDays）でルールに時計を持たせる。ruleClass（invariant/default/heuristic）+ confidence + sunsetCondition + lifecyclePolicy。「疑い、捨て、置き換える」思想を制度化。allowlist に createdAt/expiresAt/renewalCount
- **AAG（アーキテクチャ品質管理）v3.2.0（2026-04-09）**: principles.json 正本昇格（原則メタデータ追加）。Principle Coverage 50/50 達成 + 双方向リンク検証テスト 3 件追加。Active-debt 0 達成（useCostDetailData sub-hook 分離）。totalCustomers allowlist 7→0（presentation 層から完全排除）。Fix hints 4→17。Discovery Review チェックリスト作成。Pre-commit hook slice 別サマリ
- **AAG（アーキテクチャ品質管理）v4.3.0（2026-04-09）**: 統一レスポンス（renderAagResponse）を全入口（guard/obligation/pre-commit）に適用。fixNow をラベルから分岐ロジックに昇格（now=修正手順/debt=allowlist誘導/review=Discovery Review）。SLICE_GUIDANCE で 5 スライスに 1 行誘導文。入口品質の自己監視テスト 2 件。guard-collector に総ルール数 + fixNow 分布 KPI 追加。第 9 原則「ドキュメント自体が品質管理対象」: doc-registry.json（94 文書）+ docRegistryGuard + docCodeConsistencyGuard + docStaticNumberGuard + projectStructureGuard。obligation で references/ 新文書追加時の doc-registry.json 更新を入口で強制
- **v1.8.0（2026-04-10）**: Pure 計算責務再編 Phase 3-7。契約定義ポリシー（BIZ-001〜013 / ANA-001〜009）。registry 契約値埋め 22 件。5 bridge の JSDoc に semanticClass + contractId。wasmEngine に WASM_MODULE_METADATA。current 群保守ポリシー + 7 Cargo.toml semantic metadata。Tier 1 Business 移行計画（候補 6 件）+ Analytic Kernel 移行計画（候補 9 件）。Guard 統合整理 + JS 正本縮退 4 段階ポリシー。Promote Ceremony テンプレート
- **AAG（アーキテクチャ品質管理）v4.5.0（2026-04-10）**: 移行タグ基盤（migrationTagRegistry + migrationTagGuard + migration-tag-policy）。Phase 3-7 guard 31 件追加（AR-CONTRACT-* / AR-BRIDGE-* / AR-CURRENT-* / AR-CAND-BIZ-* / AR-CAND-ANA-* / AR-JS-* / AR-REVIEW-NEEDED-BLOCK）。obligation collector の generated-section-only false positive 修正。Architecture Rules 109→140
- **AAG（アーキテクチャ品質管理）v4.4.0（2026-04-10）**: ReadModelSlice 安全配布アーキテクチャ（discriminated union で silent failure を型レベルで排除）。Pipeline Safety ルール 8 件（silent-catch / fire-forget / nullable-async / validation-enforce / insert-verify / prod-validation / worker-timeout / stale-store）。Co-Change ルール 3 件（validation-severity / duckdb-mock / readmodel-parse）。パイプライン安全性強化（バリデーションブロック / bulkInsert 検証 / Worker 30秒タイムアウト / Zod PROD 有効化 / readModel safeParse 化 / stale data 防止）。PrevYearData source discriminator（disabled/no-data/loaded）。silent catch 30→9（22箇所ログ追加）。空 allowlist 12件削除。co-change ガード: collect-then-assert + fix hints パターン
- **Phase C: Governance 配置完成（2026-04-12）**: BaseRule を `app-domain/gross-profit/rule-catalog/base-rules.ts` に物理移動（C4）。`@app-domain/*` alias 追加（tsconfig / vite / vitest）。`architectureRules/rules.ts` は thin re-export facade として後方互換を維持。Project 参照点を `project-resolver.ts` + `resolve-project-overlay.mjs` 経由に集約（C1、tsconfig は暫定静的）。direct import 禁止ガード（`AR-AAG-DERIVED-ONLY-IMPORT` 系）で consumer を merged 正本に強制（C2）。`architectureRules/README.md` + `governance-final-placement-plan.md` を現行正本文書化（C3）
- **Phase 6: AAG 保証強化（2026-04-12）**: collector / resolver / merge 正本の 3 レイヤーを別々に契約テストで保証。`guardCollectorContract.test.ts` + `temporalGovernanceCollectorContract.test.ts` で KPI 出力を fixture 経由で固定（collector regex を quote-agnostic 化）。`projectResolverContract.test.ts` で CURRENT_PROJECT.md + project.json 解決規約を固定。`architectureRulesMergeSmokeGuard.test.ts` で全 5 経路（barrel / index / merged / re-export / 互換 facade）の同値配線を smoke 検査。`test:guards` に `src/test/tools/` を追加

## Explanation（説明責任）

50 MetricId に対して3段階 UX（L1→L2→L3）を提供。
詳細は `references/03-guides/explanation-architecture.md` を参照。
**鉄則:** 計算を再実行しない（StoreResult の値をそのまま使う）。
