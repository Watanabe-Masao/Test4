# Adaptive Architecture Governance (AAG)

> **この文書は AAG の正本定義。** 運用上の入口は違反時レスポンス（`renderAagResponse()`）。
> 最初からここを読む必要はない。止まったときに返る情報が AAG の実運用入口。

| 目的 | 参照先 |
|------|--------|
| AAG の全体像を知りたい | **この文書** |
| 4 層の詳細 | `aag-four-layer-architecture.md` |
| ルールの運用区分 | `aag-operational-classification.md` |
| ルール分割の原則 | `aag-rule-splitting-plan.md` |
| 進化の 3 層サイクル | `adaptive-governance-evolution.md` |
| Phase 4〜6 の実装計画 | `references/03-guides/aag-phase4-6-plan.md` |

## 概要

**Adaptive Architecture Governance (AAG)** は、仕入荒利管理システムの
アーキテクチャ品質を **機械的に保証し、継続的に進化させる** 統合ガバナンスシステムである。

AAG は冷たいルール集ではなく、**生きた組織** である。

- **成長する** — Discovery で新しいパターンを発見し、ルールに変換する
- **代謝する** — sunsetCondition で役目を終えたルールを退役させる
- **自己修復する** — 回避パターンが生まれたら検出精度を改善する
- **対話する** — 人間と AI の間で判断基準を共有する

AAG が作るのはルールではなく **文化** である。
ルールは破られるか形骸化するが、文化は判断基準として内面化される。
思想を言語化し、言語化された思想に基づいて判断し、
判断の結果を言語化して蓄積する。このサイクルが文化を育てる。

「完璧なルールを最初から描く」のではなく、**現実から学び、蓄積し、評価し続ける** ことで
リポジトリの成長に伴う変化に適応する。

## AAG Response フロー — 違反時に何が返るか

```
コード変更
  │
  ├─ pre-commit ──┐
  ├─ guard test ──┤── renderAagResponse() ──→ 統一フォーマット出力
  ├─ obligation ──┤                              │
  └─ health ──────┘                              │
                                                 ├─ fixNow=now    → 修正手順を返す
                                                 ├─ fixNow=debt   → allowlist 誘導
                                                 └─ fixNow=review → Discovery Review 誘導
                                                 │
                                                 └─ slice 誘導文（向かう先を 1 行で示す）
```

| 入口 | タイミング | 共通レンダラ |
|------|-----------|-------------|
| pre-commit | `git commit` 時 | 統一フォーマット（shell 互換） |
| guard test | `npm run test:guards` 時 | `renderAagResponse()` 経由 |
| obligation | `docs:generate` 時 | 統一フォーマット（console.error） |
| health | `health:check` 時 | certificate renderer |

**原則:** どこで止まっても、同じ情報構造（何が / なぜ / 方向 / 手順 / 例外 / 詳細）で返る。

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

## 第 9 原則: ドキュメント自体が品質管理対象である

AAG の品質はドキュメントで保たれている。ルールの `what` / `why` / `decisionCriteria`、
定義書、正本化体系、運用区分表 — これらが正しいことが AAG の前提である。

**したがって、ドキュメント自体も品質管理対象であり、自己改善すべき対象項目である。**

### ドキュメント品質の 3 層防御

```
正本レジストリ（doc-registry.json）
  │
  ├─ 存在確認: レジストリの文書が実在するか
  ├─ 網羅確認: 実在する文書がレジストリに登録されているか
  └─ 索引確認: レジストリの文書が README.md に記載されているか
  │
定義書↔実装の整合性（docCodeConsistencyGuard）
  │
  ├─ 定義書 → 実装: 定義書が実装関数名を含んでいるか
  └─ 実装 → 定義書: 実装関数がコードベースに存在するか
  │
文書の鮮度（docStaticNumberGuard + generated sections）
  │
  ├─ 静的数値: ハードコード数値が drift していないか
  ├─ generated: ルール数・分布・構成が自動更新されているか
  └─ obligation: コード変更時にドキュメント更新が強制されるか
```

### 管理対象ガード一覧

| ガード | 検証内容 | fixNow |
|--------|---------|--------|
| docRegistryGuard | レジストリ↔ファイル↔README の整合性 | now |
| docCodeConsistencyGuard | 定義書↔実装の双方向リンク | now |
| docStaticNumberGuard | ハードコード数値の drift | now |
| projectStructureGuard | プロジェクト構成と実ファイルの整合性 | now |
| documentConsistency | principles.json↔CLAUDE.md 整合性 | now |

### obligation による入口強制

| トリガー | 検出される義務 |
|---------|-------------|
| `references/03-guides/` に新文書追加 | doc-registry.json 更新 |
| `references/01-principles/` 変更 | principles.json 確認 |
| `app/src/features/` に新モジュール追加 | docs:generate 実行 |
| guard / allowlist 変更 | docs:generate 実行 |

**原則:** ドキュメントの整合性が取れないコミットは入口で止まる。

## 4 層アーキテクチャ（Principles / Judgment / Detection / Response）

AAG 自体を 4 層 + 5 縦スライスのマトリクスで設計する。
詳細: `references/01-principles/aag-four-layer-architecture.md`

```
Response（入口）→ Judgment（判断）→ Principles（思想）← Detection（検出）
```

| 層 | 役割 |
|---|------|
| **Principles** | 何を守るか。なぜ守るか。変更頻度が最も低い |
| **Judgment** | この状況で何をすべきか。fixNow / migrationRecipe / executionPlan / decisionCriteria |
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
| **Architecture Rule** | ルール定義（fixNow / slice） | Principles + Judgment | `app/src/test/architectureRules.ts` |
| **Guard Test** | ルールの機械的検出と強制 | Detection | `app/src/test/guards/` |
| **Allowlist** | 例外管理（lifecycle + retentionReason） | Judgment | `app/src/test/allowlists/` |
| **Health KPI** | ダッシュボード + Hard Gate | Detection | `tools/architecture-health/` |
| **Obligation Map** | パス変更 → ドキュメント更新義務の自動検出 | Detection | `obligation-collector.ts` |
| **Pre-commit Hook** | 義務違反の事前検出 + 自動再生成 | Detection + Response | `tools/git-hooks/pre-commit` |
| **Ratchet-down** | 改善の不可逆化（baseline は下がる一方） | Judgment | health-rules.ts の target |
| **AagResponse** | 統一違反レスポンス構造（単一描画経路） | Response | `aag-response.ts` |
| **Discovery Review** | 定期的な現実観察と新パターン発見 | Principles | 制度（月1回） |

### ルール統計（自動生成）

<!-- GENERATED:START aag-rule-stats -->
| 指標 | 値 |
|------|-----|
| 総ルール数 | 166 |
| fixNow=now（即修正） | 88 |
| fixNow=debt（構造負債） | 57 |
| fixNow=review（観測） | 21 |
| ガードテストファイル | 120 |

> 生成: 2026-04-30T14:27:56.742Z — 正本: `app/src/test/architectureRules.ts`
<!-- GENERATED:END aag-rule-stats -->

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
8. **ルールは絶対ではなく、人間・AI 間のインターフェースである。** 変更は「邪魔だから」ではなく、不要な理由・代替案・不要になる条件を説明できたとき行う

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
- [ ] **メンテナンスコストに見合うか？** 全ルール × 新フィールド = メンテナンス負債

### 第 8 原則の具体化: ルール変更プロトコル

> ルールは AI と人間の間の **インターフェース** である。
> AI がルールを絶対視せず、人間がルールを放置しない。
> 変更は「邪魔だから」では通らない。「なぜ不要か」を説明できたら通る。

#### ルール変更を提案するとき（AI → 人間）

AI がルールの変更・緩和・削除を提案する場合、以下を明示する:

1. **何を変えたいか** — 対象ルール ID と現在の制約
2. **なぜ変えたいか** — 具体的な摩擦（false positive、回避パターンの発生、開発速度の低下）
3. **変えないと何が起きるか** — 摩擦が続くことの害
4. **代替案** — ルール削除ではなく、検出精度改善・分割・条件緩和の選択肢
5. **不要になる条件** — いつこのルールが役目を終えるか（sunsetCondition）

#### ルール変更を判断するとき（人間）

人間は以下を確認する:

- **このルールが防いでいる害** は今も存在するか？（protectedHarm）
- **代替手段** でその害を防げるか？
- **変更後の ratchet** は維持されるか？（改善が不可逆であり続けるか）

#### 禁止事項

- **「邪魔だから」だけで変更しない。** 摩擦の原因を特定する
- **AI が黙ってルールを回避しない。** 回避が必要なら提案として明示する
- **人間がルールの見直しを無期限に先送りしない。** reviewPolicy で期限を持つ

## 3 層サイクル

```
  発見（Discovery）→ 蓄積（Accumulation）→ 評価（Evaluation）
       ↑                                         │
       └─────────── 新パターン / 退役 ────────────┘
```

詳細: `references/01-principles/adaptive-governance-evolution.md`

## バージョン履歴

### v4.3.0 — 2026-04-09: 統一レスポンス全入口適用 + 入口品質の自己監視

**AAG Response を"概念"から"唯一の実装経路"に昇格:**
- 正本文書の冒頭を「唯一の入口」→「正本定義」に変更。Response を実運用入口と明記
- `formatViolationMessage` を `buildAagResponse + renderAagResponse` 経由に統一
- obligation-collector / pre-commit の出力を統一フォーマットに移行
- AAG Response フロー図を正本文書に追加

**fixNow を分岐ロジックに昇格:**
- now: この diff で直す修正手順を返す
- debt: allowlist / active-debt 側へ誘導
- review: コード修正不要、Discovery Review へ誘導

**SLICE_GUIDANCE — スライスを分類から誘導へ:**
- 5 スライスに 1 行の誘導文を追加（「向かう先」を即座に示す）

**入口品質の自己監視:**
- 手書き AAG レスポンス残件数テスト（BASELINE = 0）
- SLICE_GUIDANCE 全スライスカバーテスト
- guard-collector に総ルール数 + fixNow 分布 KPI を追加

**第 9 原則: ドキュメント自体が品質管理対象:**
- ドキュメントレジストリ（doc-registry.json）: 7 カテゴリの全文書を構造化管理
- docRegistryGuard: レジストリ↔ファイル↔README の双方向整合性検証
- docCodeConsistencyGuard: 定義書↔実装関数の双方向リンク検証
- docStaticNumberGuard: ハードコード数値の drift 検出（BASELINE = 0）
- projectStructureGuard: プロジェクト構成と実ファイルの整合性検証
- obligation: references/ 新文書追加 → doc-registry.json 更新を入口で強制
- 静的数値の generated section 化（ルール数・分布・features/guards 一覧）

### v3.2.0 — 2026-04-09: 正本昇格 + 双方向検証 + Discovery Review

**principles.json を正本に昇格:**
- 各原則にタイトル・カテゴリ別ドキュメント参照を追加（tags → principles 構造）
- architectureRuleGuard の ALL_PRINCIPLES を principles.json から動的生成（ハードコード廃止）

**思想カバレッジ完成 + 双方向リンク検証:**
- Principle Coverage: 42/50 → 50/50（8原則の principleRefs を既存ルールに追加）
- 双方向リンク検証テスト 3 件追加（原則→ルール / ルール→原則 / PrincipleId 型一致）
- ガードテスト: 421 → 424

**技術的負債の解消:**
- Active-debt: 1 → 0（useCostDetailData useMemo 9→2、sub-hook 分離）
- totalCustomers allowlist: 7 → 0（presentation 層から `.totalCustomers` 完全排除）
- extractPrevYearCustomerCount を features/comparison に移動（bridge の application 層化）

**AAG 運用基盤の整備:**
- Pre-commit hook: 影響スライス別ファイル数を表示
- Fix hints: 4 → 17 に拡充（docs/boundary/allowlist/complexity/guard/perf/temporal）
- Discovery Review チェックリスト: 観測 20 ルール + メタルール + Health の 26 項目

**次のステップ（v3.1.0 から継続）:**
- CLAUDE.md の原則セクションを generated section（ビュー）に変換
- 原則自体に reviewPolicy / sunsetCondition を持たせる
- 初回 Discovery Review の実施

### v3.1.0 — 2026-04-08: 自己品質 + トレーサビリティ

**第 7 原則: ルール自身がルールの品質基準を満たす**
- デッドコード禁止 → 未使用フィールド 3 件削除（entrypointSummary/deepDiveDoc/commonMistakes）
- DRY → KPI_FIX_HINTS を `aag-fix-hints.ts` に集約
- 自己品質ガード 5 テスト追加（why/doc/migrationPath/decisionCriteria/deprecated 検証）

**第 8 原則: ルールは人間・AI 間のインターフェース**
- ルール変更プロトコル（5 項目の説明義務 + 3 禁止事項）

**思想→原則→ルールの 3 層トレーサビリティ:**
- `PrincipleId` 型（A1〜Q4, 50 原則）+ 全 92 ルールに `principleRefs` 設定
- 思想カバレッジ: 42/50 原則にルールが紐づいている
- 思想の密度: C1 に 21 ルール集中（中核思想の確認）
- ルール未設定の原則 8 件を可視化（Discovery Review の入力）

**次のステップ（計画のみ）:**
- 設計原則（A1〜Q4）の所有権を CLAUDE.md から AAG に移行
- CLAUDE.md の原則セクションを generated section（ビュー）に変換
- 原則自体に reviewPolicy / sunsetCondition を持たせる

### v3.0.0 — 2026-04-08: AAG 4 層アーキテクチャ + ルール分割

**4 層の確立:**
- Principles（思想）/ Judgment（判断）/ Detection（検出）/ Response（入口）
- プロダクトコードの 4 層と独立した AAG 固有の名称
- `aag-four-layer-architecture.md` に定義 + ファイルマッピング

**5 縦スライス:**
- layer-boundary (12) / canonicalization (19) / query-runtime (7) /
  responsibility-separation (33) / governance-ops (23)
- 全 92 ルールに `slice` フィールドを設定

**運用区分（fixNow）:**
- 全 92 ルールに now (31) / debt (45) / review (18) を設定
- `aag-operational-classification.md` に 84→92 ルールの 3 分類を文書化

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
- health-rules.ts による KPI 自動評価（件数は generated section 参照）

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
| `references/01-principles/aag-operational-classification.md` | 運用区分表（即修正/構造負債/観測） |
| `references/01-principles/aag-rule-splitting-plan.md` | ルール分割計画（例外圧 → protected harm ベース） |
| `references/03-guides/architecture-rule-system.md` | Architecture Rule の運用ガイド |
| `references/03-guides/allowlist-management.md` | Allowlist 管理ガイド |
| `references/03-guides/active-debt-refactoring-plan.md` | Active-Debt リファクタリング計画 |
| `CLAUDE.md` | プロジェクト全体のルール（AAG セクション含む） |
