# Adaptive Architecture Governance (AAG)

> **この文書が AAG の唯一の入口。** 他の AAG 文書は全てここから参照する。

| 目的 | 参照先 |
|------|--------|
| AAG の全体像を知りたい | **この文書** |
| 4 層の詳細 | `aag-four-layer-architecture.md` |
| 94 ルールの運用区分 | `aag-operational-classification.md` |
| ルール分割の原則 | `aag-rule-splitting-plan.md` |
| 進化の 3 層サイクル | `adaptive-governance-evolution.md` |
| Phase 4〜6 の実装計画 | `references/03-guides/aag-phase4-6-plan.md` |

## 概要

**Adaptive Architecture Governance (AAG)** は、仕入荒利管理システムの
アーキテクチャ品質を **機械的に保証し、継続的に進化させる** 統合ガバナンスシステムである。

AAG が作るのはルールではなく **文化** である。
ルールは破られるか形骸化するが、文化は判断基準として内面化される。
思想を言語化し、言語化された思想に基づいて判断し、
判断の結果を言語化して蓄積する。このサイクルが文化を育てる。

「完璧なルールを最初から描く」のではなく、**現実から学び、蓄積し、評価し続ける** ことで
リポジトリの成長に伴う変化に適応する。

## AAG の本質: 機械的検出と言語化の融合

AAG の強みは「コードを検証する機械」ではない。
**「判断を言語化し、蓄積し、検証可能にする制度」** である。

### ドキュメントで始まり、ドキュメントで終わる

```
ドキュメント（意図）→ 機械（検出）→ 結果（allowlist/KPI）→ ドキュメント（評価・卒業記録）
```

Guard が検出するのはパターンの違反だが、本当に守っているのは
Architecture Rule に書かれた **`what` / `why` / `decisionCriteria`** である。
regex が粗くても、なぜそのルールが存在するかが言語化されていれば人間が正しく判断できる。
逆に検出が完璧でもドキュメントがなければ、ルールは「理由のわからない制約」になり形骸化する。

### ドキュメント作成コストは投資である

ドキュメントを作り込む手間は品質管理のオーバーヘッドではなく、
**暗黙知を形式知に変換する投資** である。

allowlist 卒業時の一行コメント：

```typescript
// WeatherPage.tsx — useWeatherDaySelection 抽出で combined 17→13。許可リスト卒業
```

これは単なるコメントではなく AAG の資産である。次にこのファイルを触る人が
「なぜこの構造なのか」を知る手がかりであり、Discovery Review で
「この判断は今も正しいか」を検証する材料になる。

### 1 人開発における特別な意味

チームなら議論で暗黙知が共有されるが、1 人では
**過去の自分との対話** がドキュメントを通じてしか成立しない。
AAG はその対話の制度化である。

### AI との対話インターフェース

AAG のドキュメントは人間のためだけではない。
**AI が判断基準を理解し、意図に沿った変更を行うためのインターフェース** でもある。

Architecture Rule の `what`（何を防ぐか）、`why`（なぜ防ぐか）、
`decisionCriteria`（例外の判断基準）が明文化されているからこそ、
AI はルールの意図を理解して正しく適用できる。
暗黙知のままなら、AI は regex パターンを機械的に満たすだけの変更しかできない。

実際に AAG を運用した結果、以下の判断は AI が思想に基づいて行った：

- allowlist の `retentionReason` の分類（display-only / no-readmodels / fallback）
- Discovery での構造問題の発見（「表示のみ」に分類された分析パススルー）
- guard 回避パターンの検出と検出精度改善の提案（import 行カウント問題）
- ルールの純価値評価（防いだ害 − 生んだ摩擦）

これは AAG のドキュメントが **「過去の自分」「未来の自分」「AI」の 3 者が
同じ判断基準で対話するための共通言語** として機能していることを示している。

ドキュメントの作り込みが投資である理由がここにある。
言語化の精度が上がるほど、AI の判断精度も上がる。

### AAG が防ぐ AI の本質的弱点

AI の最大の弱点は **「動くコードを書けてしまう」** ことである。
コンパイルが通り、テストが通り、見た目も正しい。しかし設計意図に反している。
そして設計意図に反していることに **後から壊れるまで気づけない**。

AI は効率的であるが故に短期的に合理的な判断をする。
人間が意味を持って選んだ「回りくどいやり方」を、
別のセッションの AI が「もっと簡単にできる」と判断して元に戻す。
動く。テストも通る。しかし設計意図が崩れている。

例:
- `extractPrevYearCustomerCount` を経由すべきところを `prevYear.totalCustomers` で直接アクセス
  → 動く。しかし allowlist が増え、正本化が後退する
- `storeCustomerMap` を props で渡すべきところを `result.totalCustomers` で計算
  → 動く。しかし CustomerFact 正本から乖離する

AAG はこの問題に対して **3 層の防御** を提供する:

1. **Guard（機械的検出）**: 「動くが意図に反するコード」をパターンで検出する。
   新規の `.totalCustomers` 参照は Guard が即座にブロックする

2. **Architecture Rule の `why`（意図の言語化）**: なぜこの回りくどいやり方を
   しているかを説明する。次のセッションの AI がこれを読み、意図を理解した上で判断できる

3. **Allowlist の卒業記録（判断の蓄積）**: 過去にどのような経緯でこの構造に至ったかが
   記録されている。文脈を失った AI でもこの記録を参照すれば同じ判断に到達できる

この 3 層は **「動くコード」ではなく「意図に沿ったコード」** を保証する仕組みである。
後から壊れてから気づくのではなく、壊れる前に制度と契約で防ぐ。

### 意図的に残す弱さ

| 弱さ | 受け入れる理由 | 改善の条件 |
|------|-------------|-----------|
| regex 検出の粗さ | **即日導入可能**。5 分で新ルール追加 | 誤検知が実害を生んだルールのみ Stage を上げる |
| Discovery の属人性 | **人間の洞察が入る**。機械にできない文脈判断 | 制度の枠組みだけ改善し、判断は人間に残す |
| 評価の手動性 | **ルールの意図が言語化される**。暗黙知が残らない | 数値指標は補助。最終判断は人間 |

弱さを知り、弱さの意味を理解し、弱さの改善タイミングを見極める。
これ自体が AAG の適応能力である。

## 4 層アーキテクチャ（Principles / Judgment / Detection / Response）

AAG 自体を 4 層 + 5 縦スライスのマトリクスで設計する。
詳細: `references/01-principles/aag-four-layer-architecture.md`

```
Response（入口）→ Judgment（判断）→ Principles（思想）← Detection（検出）
```

| 層 | 役割 |
|---|------|
| **Principles** | 何を守るか。なぜ守るか。変更頻度が最も低い |
| **Judgment** | この状況で何をすべきか。fixNow / migrationPath / decisionCriteria |
| **Detection** | どうやって観測するか。regex → AST → 型。改善・交換可能 |
| **Response** | 違反時に必要最小限の判断材料を返す。AAG の正式入口 |

### 5 縦スライス

| スライス | ルール数 | 関心 |
|---------|---------|------|
| `layer-boundary` | 12 | 層境界、依存方向、描画専用原則 |
| `canonicalization` | 19 | 正本経路、readModel、Zod、path guard |
| `query-runtime` | 7 | QueryHandler、AnalysisFrame、ComparisonScope |
| `responsibility-separation` | 33 | size / hook complexity / responsibility tags |
| `governance-ops` | 23 | allowlist、health、obligation、conventions |

## 構成要素

| 要素 | 責務 | 層 | ファイル |
|------|------|---|---------|
| **Architecture Rule** | ルール定義（92 ルール / fixNow / slice） | Principles + Judgment | `app/src/test/architectureRules.ts` |
| **Guard Test** | ルールの機械的検出と強制 | Detection | `app/src/test/guards/` (39+ files) |
| **Allowlist** | 例外管理（lifecycle + retentionReason） | Judgment | `app/src/test/allowlists/` |
| **Health KPI** | 28 指標のダッシュボード + Hard Gate | Detection | `tools/architecture-health/` |
| **Obligation Map** | パス変更 → ドキュメント更新義務の自動検出 | Detection | `obligation-collector.ts` |
| **Pre-commit Hook** | 義務違反の事前検出 + 自動再生成 | Detection + Response | `tools/git-hooks/pre-commit` |
| **Ratchet-down** | 改善の不可逆化（baseline は下がる一方） | Judgment | health-rules.ts の target |
| **AagResponse** | 統一違反レスポンス構造 | Response | `architectureRules.ts` |
| **Discovery Review** | 定期的な現実観察と新パターン発見 | Principles | 制度（月1回） |

## 運用区分

詳細: `references/01-principles/aag-operational-classification.md`

| 区分 | ルール数 | 方針 |
|------|---------|------|
| **⚡ 即修正 (now)** | 31 | hard gate。今の diff で直す |
| **📋 構造負債 (debt)** | 45 | 新規悪化は止める。既存は allowlist + ratchet-down |
| **🔍 観測 (review)** | 18 | 即 fail にしない。Discovery Review の入力 |

## 設計原則

1. **ルールは仮説である。** 検証され、棄却されうる
2. **Principles を正本にし、Detection は交換可能にする。** what/why は安定、検出手段は進化
3. **改善は不可逆にする。** ratchet-down で一方向の進行を機械的に強制
4. **回避が生まれたらルールを疑う。** 人を責めず、仕組みを直す
5. **ブロックするだけでなく解決する。** pre-commit hook は自動修復を試行
6. **Response は薄く、必要十分にする。** 情報を渡しすぎない。作業を前に進める
7. **ルール自身がルールの品質基準を満たす。** コードに品質を求めるなら、ルールにも同じ品質を求める

### 第 7 原則の具体化

> ルールを作る側が、ルールが求める品質基準を自ら満たしていなければ、
> そのルールは信頼されない。

AAG のコード・文書・構造に適用する品質基準:

| プロダクトコードの基準 | AAG への適用 |
|---------------------|------------|
| **デッドコード禁止** | 使われていないフィールド・ルール・文書は削除する |
| **DRY** | 同じ情報を 2 箇所に書かない。hints / 定義 / 判断基準は 1 箇所に集約する |
| **不要な抽象化禁止** | 傘ルール（下位ルールと重複する抽象）は作らない |
| **1 ファイル = 1 変更理由 (C1)** | 1 ルール = 1 つの防ぎたい害。複数の害を束ねない |
| **テストで守る (G1)** | ルールの品質も guard で検証する（fixNow 未設定 = 0、slice 未設定 = 0） |
| **必要である理由を述べられること** | why / protectedHarm が空のルールは存在理由が不明。削除候補 |

### AAG 自己品質チェックリスト

ルールやフィールドを追加する前に確認する:

- [ ] **このルール/フィールドがないと何が壊れるか** を 1 文で述べられるか？
- [ ] **既存のルール/フィールドで代替できないか？** 新設より既存の改善が優先
- [ ] **追加した瞬間から使われるか？** 「将来使うかもしれない」は追加理由にならない
- [ ] **メンテナンスコストに見合うか？** 94 ルール × 新フィールド = メンテナンス負債

## 3 層サイクル

```
  発見（Discovery）→ 蓄積（Accumulation）→ 評価（Evaluation）
       ↑                                         │
       └─────────── 新パターン / 退役 ────────────┘
```

詳細: `references/01-principles/adaptive-governance-evolution.md`

## バージョン履歴

### v3.0.0 — 2026-04-08: AAG 4 層アーキテクチャ + ルール分割

**4 層の確立:**
- Principles（思想）/ Judgment（判断）/ Detection（検出）/ Response（入口）
- プロダクトコードの 4 層と独立した AAG 固有の名称
- `aag-four-layer-architecture.md` に定義 + ファイルマッピング

**5 縦スライス:**
- layer-boundary (12) / canonicalization (19) / query-runtime (7) /
  responsibility-separation (33) / governance-ops (23)
- 全 94 ルールに `slice` フィールドを設定

**運用区分（fixNow）:**
- 全 94 ルールに now (31) / debt (45) / review (18) を設定
- `aag-operational-classification.md` に 84→94 ルールの 3 分類を文書化

**ルール分割:**
- AR-STRUCT-RESP-SEPARATION → 7 下位ルール（P2/P7/P8/P10/P12/P17/P18）
- AR-STRUCT-CONVENTION → 3 下位ルール（バレル/feature境界/context重複）
- 例外圧の可視化: MODULE-STATE に 4 件集中、他は 0
- `aag-rule-splitting-plan.md` に分割原則と判断フローを文書化

**統一レスポンス（Phase 3）:**
- `AagResponse` インターフェース: source/fixNow/slice/summary/reason/steps/exceptions/deepDive
- `buildAagResponse()` + `renderAagResponse()` で guard/obligation/health/pre-commit 共通
- `buildObligationResponse()` で obligation 違反用レスポンスも統一
- `formatViolationMessage()` を AAG 標準レスポンス生成器に昇格

**AAG の本質を文書化:**
- 「ルールではなく文化を育てる」
- AI との対話インターフェースとしてのドキュメント
- AI の弱点「動くが意図に反するコード」への 3 層防御

### v2.1.0 — 2026-04-08: Governance 自己改善

**検出精度の向上:**
- P10 guard の useState 検出パターンを `\buseState\b` → `\buseState\s*[<(]` に修正
- import 行の誤カウントを解消。永久 allowlist 2 件が卒業

**分類の構造化:**
- `RetentionReason` 型を allowlist に追加（display-only / no-readmodels / detection-limit / structural / fallback）
- Discovery Review での棚卸しを型安全に

**自動化:**
- Pre-commit hook を「ブロック→手動」から「自動 docs:generate + staging」に改善
- Obligation bootstrapping の循環を解消

**設計原則の文書化:**
- `adaptive-governance-evolution.md` — 3 層サイクル（発見→蓄積→評価）を定義
- ルールの純価値方程式: 防いだ害 − 生んだ摩擦

### v2.0.0 — 2026-04-08: Active-Debt 大規模削減

**active-debt 33 → 1 (97% 削減):**
- Phase A: Limit 縮小（ratchet 予防）
- Phase B: domain/models export 分割（DiscountEntry, AsyncStateFactories, DateRangeChunks 新設）
- Phase C: getState → Zustand selector 移行（7 件の store 直接アクセスを解消）
- Phase D: module-scope let → const object 化（3 件）
- Phase E: fallback 定数エイリアス化（7 件の密度超過を解消）
- Phase G: useCallback/useState 統合（WeatherPage hook 抽出、BoxPlot/StorageDataViewers 統合）
- Phase H: WeatherPage → useWeatherDaySelection 抽出（combined 17→13）
- Phase I: InventorySettingsSection → callback props（getState 12→0）
- Phase J: useCostDetailData useMemo 統合（12→9）
- Phase K: useMonthDataManagement useState 統合（5→4）

**構造問題の修正:**
- registryAnalysisWidgets の分析パススルーを正本経由に
- SensitivityDashboard / useInsightData に customerFact 配布経路を追加
- near-limit ファイル（purchaseComparisonCategory.ts）の分割

**totalCustomers 正本化 P1-P3:**
- allowlist 16 → 7（P1: GAP/PI 3件、P2: YoY/客単価 5件、P3: ローカルプロパティ 1件）
- 値一致テスト（totalCustomersParity.test.ts）で移行の安全性を保証
- extractPrevYearCustomerCount ブリッジ関数で prevYear 経路を構造化

### v1.0.0 — 2026-04-07: Architecture Rule 統合

- 84 ルール / 39 ガード / 8 種の detection type
- ruleClass（invariant/default/heuristic）+ reviewPolicy + sunsetCondition
- allowlist に createdAt/expiresAt/renewalCount（Temporal Governance）
- health-rules.ts による 28 KPI 自動評価

### v0.x — 〜2026-04-06: 初期ガードシステム

- 個別ガードテストの段階的追加
- allowlist の手動管理
- CI パイプライン（fast-gate → docs-health → test-coverage → e2e）

---

## 関連文書

| 文書 | 内容 |
|------|------|
| `references/01-principles/adaptive-governance-evolution.md` | 進化の設計原則（3層サイクル） |
| `references/01-principles/aag-four-layer-architecture.md` | 4 層定義（Principles/Judgment/Detection/Response） |
| `references/01-principles/aag-operational-classification.md` | 運用区分表（即修正/構造負債/観測 × 94 ルール） |
| `references/01-principles/aag-rule-splitting-plan.md` | ルール分割計画（例外圧 → protected harm ベース） |
| `references/03-guides/architecture-rule-system.md` | Architecture Rule の運用ガイド |
| `references/03-guides/allowlist-management.md` | Allowlist 管理ガイド |
| `references/03-guides/active-debt-refactoring-plan.md` | Active-Debt リファクタリング計画 |
| `CLAUDE.md` | プロジェクト全体のルール（AAG セクション含む） |
