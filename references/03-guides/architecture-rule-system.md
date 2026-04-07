# Architecture Rule システム — 運用ガイド

## 概要

Architecture Rule は **実行可能なアーキテクチャ仕様** である。
個々のガードテストが「禁止」だけを検出していた状態から、
「禁止」「あるべき姿」「なぜ」「修正手順」「判断基準」「因果関係」を
1 つの構造化データとして管理する仕組みに昇華した。

### 解決する 4 つの課題

| 課題 | 解決方法 |
|---|---|
| AI の学習コスト | architectureRules.ts を読めば全アーキテクチャが構造化データで手に入る |
| 改善が進まない | migrationPath が「次に何をすべきか」を常に提示する |
| ルールの散在 | 1 つの ID から原則・検出・例外・文書に到達できる |
| 判断の属人化 | decisionCriteria が「許容か禁止か」を機械的に判定する |

## ファイル構成

```
app/src/test/
├── architectureRules.ts          ← ルール定義（84 ルール）
├── guardTestHelpers.ts           ← 共有ヘルパー（collectTsFiles, stripComments 等）
├── guardTagRegistry.ts           ← 設計原則タグ定義（A1〜Q4）
├── responsibilityTagRegistry.ts  ← 責務タグ定義（R:chart-view 等 20 種）
├── calculationCanonRegistry.ts   ← domain/calculations/ 分類
├── allowlists/                   ← 例外管理（ruleId で紐づけ）
│   └── types.ts                  ← AllowlistEntry 型（ruleId フィールド付き）
└── guards/                       ← ガードテスト（39 ファイル、全て architectureRules 参照）
    └── architectureRuleGuard.test.ts  ← ルール自体の整合性検証
```

## ArchitectureRule の構造

```typescript
interface ArchitectureRule {
  // ── 識別 ──
  id: string                      // 'AR-001', 'AR-A1-DOMAIN', 'AR-TAG-CHART-VIEW' 等
  guardTags: string[]             // 設計原則タグ（A1〜Q4）
  responsibilityTags?: string[]   // 適用対象の責務タグ（R:chart-view 等）
  epoch?: number                  // 導入世代

  // ── 定義（何を・なぜ） ──
  what: string                    // 1 文で「何を守るか」
  why: string                     // なぜこのルールが必要か
  doc?: string                    // 根拠ドキュメントのパス

  // ── あるべき姿 ──
  correctPattern: {
    description: string           // 正しいパターンの説明
    example?: string              // コード例
    imports?: string[]            // 使うべき import
  }

  // ── 禁止パターン ──
  outdatedPattern: {
    description: string           // 旧パターンの説明
    imports?: string[]            // 使ってはいけない import
    codeSignals?: string[]        // 検出用 regex
  }

  // ── 閾値 ──
  thresholds?: Record<string, number>  // タグ連動の数値上限

  // ── 検出 ──
  detection: {
    type: DetectionType           // import / regex / count / must-include / must-only / co-change / must-not-coexist / custom
    severity: 'gate' | 'warn'    // gate = CI 失敗, warn = 情報出力
    baseline?: number             // frozen count（ratchet-down 用）
  }

  // ── 修正手順（自動改善用） ──
  migrationPath?: {
    steps: string[]               // 順序付き修正手順
    effort: 'trivial' | 'small' | 'medium'
    priority: number              // 低い = 先にやる
  }

  // ── 判断基準（脱属人化） ──
  decisionCriteria?: {
    when: string                  // いつこのルールが適用されるか
    exceptions: string            // 例外が許容される条件
    escalation: string            // 判断に迷ったときの行動
  }

  // ── ルール間の因果関係 ──
  relationships?: {
    dependsOn?: string[]          // 前提ルール
    enables?: string[]            // 守ると有効になるルール
    conflicts?: string[]          // 同時適用不可
  }
}
```

## detection.type 一覧

| type | 意味 | 例 |
|---|---|---|
| `import` | 禁止 import | presentation → wasmEngine |
| `regex` | 禁止コードパターン | getExecutionMode |
| `count` | 数値上限 | useMemo ≤ 12 |
| `must-include` | 必ず含む | `R:calculation` → Zod parse |
| `must-only` | これ以外禁止 | `R:barrel` → re-export のみ |
| `co-change` | A→B 共変更 | readModel 型 → Zod schema |
| `must-not-coexist` | 同居禁止 | useState と SQL query |
| `custom` | 特殊ロジック | テスト側で実装 |

## 運用サイクル

### 1. セッション開始時

AI は `architectureRules.ts` を読む。これだけで以下が全て構造化データとして手に入る:
- 全 84 ルールの what / why / doc
- 正しいパターン（correctPattern）と禁止パターン（outdatedPattern）
- 修正手順（migrationPath.steps）
- 判断基準（decisionCriteria）
- ルール間の因果関係（relationships）

### 2. 実装時

1. 変更対象のパスから関連ルールを特定（guardTags / responsibilityTags で検索）
2. ルールの `correctPattern` に従ってコードを書く
3. `decisionCriteria.when` に該当する判断があれば `exceptions` / `escalation` を参照

### 3. ガード違反時

`formatViolationMessage` が以下を出力する:

```
[AR-A1-PRES-INFRA] presentation/ は infrastructure/ に直接依存しない
理由: presentation は描画専用。データ取得は application 層の hook を経由する
正しいパターン: application/ の hook 経由でデータを取得する。useQueryWithHandler を推奨
参照: references/01-principles/design-principles.md
修正手順:
  1. infrastructure/ への value import を削除（import type は許容）
  2. application/hooks/ に対応する hook があるか確認
  3. なければ useQueryWithHandler で新規 hook を作成
例外条件: import type は許容（実行時依存を生まない）。value import は allowlist に正当理由が必要
違反:
  presentation/components/Foo.tsx: @/infrastructure/duckdb/queries/bar
```

### 4. ratchet-down（自動品質向上）

baseline を持つルールは ratchet-down パターンで管理される:

1. 違反数がベースラインを超えたら **CI 失敗**
2. 違反数がベースラインと同じなら **PASS**（放置しても壊れない）
3. 違反数がベースラインを下回ったら **PASS + 更新を促すメッセージ**

```
[ratchet-down] AR-xxx: 件数が 51 → 48 に減少。
architectureRules.ts の AR-xxx の baseline を 48 に更新してください。
```

これにより **改善するたびに閾値が自動で下がり、二度と悪化しない**。

### 5. タグ付け

新規ファイルには `@responsibility R:xxx` タグを付ける。
タグの選び方は `AR-TAG-SELECTION-GUIDE` の判定テーブルを参照:

| ファイルの特徴 | 推奨タグ |
|---|---|
| JSX + チャート描画 | R:chart-view |
| ECharts option（React なし） | R:chart-option |
| domain/calculations/ 純粋関数 | R:calculation |
| use*Plan hook | R:query-plan |
| useQueryWithHandler 呼び出し | R:query-exec |
| ブラウザ API ラップ | R:adapter |
| Context.Provider + 値提供 | R:context |
| useReducer の reducer | R:reducer |
| export のみ | R:barrel |
| データ変換（React なし） | R:transform |
| useState 主体の状態管理 | R:state-machine |
| 複数 hook の組み立て | R:orchestration |
| ページコンポーネント | R:page |
| ダッシュボード部品 | R:widget |
| フォーム入力 | R:form |
| Header, NavBar 等 | R:layout |
| localStorage/DB 操作 | R:persistence |
| 上記以外の純粋関数 | R:utility |

**確信がない場合はタグを付けない**（C9: 嘘の分類より正直な未分類）。

## 因果グラフ（主要な dependsOn / enables）

```
AR-A1-DOMAIN（domain 純粋性）
  ├── enables → AR-STRUCT-PURITY
  │     └── enables → AR-PATH-GROSS-PROFIT → AR-PATH-GROSS-PROFIT-CONSISTENCY
  │                 → AR-PATH-FACTOR-DECOMPOSITION
  │                 → AR-PATH-PI-VALUE, AR-PATH-CUSTOMER-GAP
  ├── enables → AR-TAG-CALCULATION, AR-TAG-UTILITY, AR-TAG-REDUCER, AR-TAG-TRANSFORM
  └── → AR-STRUCT-CALC-CANON → AR-STRUCT-CANONICALIZATION → 全 AR-PATH-*

AR-A1-PRES-INFRA（presentation → infrastructure 禁止）
  ├── enables → AR-STRUCT-PRES-ISOLATION, AR-STRUCT-RENDER-SIDE-EFFECT
  ├── enables → AR-Q3-CHART-NO-DUCKDB
  └── → AR-STRUCT-QUERY-PATTERN → AR-STRUCT-ANALYSIS-FRAME
                                → AR-STRUCT-COMPARISON-SCOPE
                                → AR-STRUCT-TEMPORAL-SCOPE → AR-STRUCT-TEMPORAL-ROLLING

AR-STRUCT-RESP-SEPARATION（責務分離）
  └── enables → AR-G5-HOOK-MEMO, AR-G5-HOOK-STATE, AR-G6-COMPONENT

AR-STRUCT-CANONICALIZATION（正本化体系）
  └── enables → AR-PATH-SALES, AR-PATH-DISCOUNT, AR-PATH-GROSS-PROFIT,
                AR-PATH-PURCHASE-COST, AR-PATH-CUSTOMER, AR-PATH-FREE-PERIOD
```

**根幹ルールが壊れると末端が全て影響を受ける。** 違反の根本原因を特定する際に因果グラフを辿る。

## allowlist との関係

全 allowlist エントリには `ruleId` フィールドがある:

```typescript
{
  path: 'application/hooks/useComparisonModule.ts',
  ruleId: 'AR-G5-HOOK-MEMO',     // どのルールの例外か
  reason: 'comparison 層の集約 hook。分割は過剰',
  removalCondition: '比較モジュールのリファクタリング時',
  lifecycle: 'permanent',
}
```

これにより:
- **ルール → 例外**: 「AR-G5-HOOK-MEMO の例外は何件？」が即座に分かる
- **例外 → ルール**: 「このファイルはなぜ例外？」がルールの what/why で説明される
- **卒業候補検出**: architectureRuleGuard が空の allowlist 配列を自動検出

## ルールの追加方法

1. `architectureRules.ts` の `ARCHITECTURE_RULES` 配列に新規ルールを追加
2. 必須フィールド: `id`, `guardTags`, `what`, `why`, `correctPattern`, `outdatedPattern`, `detection`
3. 推奨フィールド: `doc`, `migrationPath`, `decisionCriteria`
4. `architectureRuleGuard.test.ts` が自動で整合性を検証:
   - ID 一意性
   - guardTag の存在
   - baseline / thresholds の存在（gate + count 型）
   - migrationPath.steps が空でない
   - relationships の参照先が存在
   - doc が実在するファイルを指す
   - allowlist の ruleId が有効

## 検出精度の注意点

hooks カウント（useMemo / useState / useCallback）は `stripComments()` でコメント行を除外してからカウントする。
JSDoc 内の「7個の useState を」のような記述が誤検出されるのを防ぐ。

```typescript
// ✗ 誤検出あり
const count = (content.match(/\buseState\b/g) || []).length

// ✓ コメント除外
const count = (stripComments(content).match(/\buseState\b/g) || []).length
```

## 数値一覧（現在値）

| 指標 | 値 |
|---|---|
| ルール数 | 84 |
| migrationPath カバレッジ | 84/84 (100%) |
| decisionCriteria カバレッジ | 84/84 (100%) |
| doc カバレッジ | 84/84 (100%) |
| relationships | 45 |
| 統合済みガード | 39/39 (100%) |
| guard タグカバレッジ | 50+/50+ (100%) |
| allowlist ruleId | 52/52 (100%) |
| 参照ドキュメント数 | 27 |
| UNCLASSIFIED_BASELINE | 400 |
| TAG_MISMATCH_BASELINE | 48 |
| Zod review 未済 baseline | 3 |

## ルール健全性評価

### 設計思想

ルールの健全性は **手動で status を書く** のではなく、**テスト実行時に自動計算** する。
これにより健全性自体が陳腐化することを防ぐ。

### 成熟度（maturity）

| 値 | 意味 | severity |
|---|---|---|
| `stable`（デフォルト） | パターンが安定。gate で強制 | gate |
| `experimental` | パターンが新しい。warn で観察 | warn のみ |
| `deprecated` | 不要になった。次回削除 | — |

**新しいルールは `experimental` + `warn` から始める。** パターンが安定し、
違反の検出が正確であることを確認してから `stable` + `gate` に昇格する。

### ruleClass — ルールの性質を 3 層に分ける

| ruleClass | 性質 | severity | 例 |
|---|---|---|---|
| `invariant` (23) | 絶対壊してはいけない | gate | 層境界、domain 純粋性、正本経路 |
| `default` (32) | 強い原則だが例外あり | gate + allowlist | 責務分離、クエリパターン、co-change |
| `heuristic` (29) | 品質傾向の観測 | 原則 warn | useMemo 数、行数、タグ閾値 |

**運用ルール:**
- heuristic は原則 gate にしない（品質の傾向を見るためのもの）
- invariant は説明責任よりも破壊防止を優先
- 数値閾値は heuristic に寄せる

### confidence — ルールの確信度

| confidence | 意味 | 制約 |
|---|---|---|
| `high` | 確立されたパターン。例外は稀 | gate 可 |
| `medium` | 妥当だが検証中の側面あり | gate 可（注意深く） |
| `low` | 仮説段階。検証が必要 | **gate 禁止** |

### sunsetCondition — いつこのルールが不要になるか

反証可能性の実装。各ルールに「このルールが不要になる条件」を定義する。

例: `'presentation から直接 query 実行経路が消滅した'`

sunsetCondition が定義されたルールは定期的に条件達成を確認する。

### lifecyclePolicy — experimental ルールの出口（昇格 / 撤回の対称性）

experimental ルールには **昇格条件と撤回条件の両方** を必須化する。

```typescript
lifecyclePolicy: {
  promoteIf: ['検出精度 > 95%', 'false positive < 3 件', '実害防止の実績あり'],
  withdrawIf: ['permanent 例外 > 5 件', '実害と結びつかない', '別ルールで代替可能'],
}
```

**CI ガード:**
- experimental + lifecyclePolicy 未設定 → CI 失敗
- 様子見のルールが惰性で残ることを防ぐ

これにより **設計が安定する前のルール化による硬直化を防ぐ**。

### reviewPolicy — ルールに時計を持たせる

> 撤回条件より先に、撤回を忘れない仕組みを入れること。

```typescript
reviewPolicy: {
  owner: 'solo-maintainer',
  lastReviewedAt: '2026-04-07',
  reviewCadenceDays: 90,
}
```

**運用ルール:**
- experimental / deprecated: reviewPolicy **必須**（CI で強制）
- stable: reviewPolicy は任意だが推奨
- `today - lastReviewedAt > reviewCadenceDays` → review overdue として warn
- sunsetCondition があるのに 60 日以上未レビュー → 条件達成を確認すべきと warn

**効果:**
- sunsetCondition がただの文章で終わらない
- experimental が惰性で残りにくくなる
- stale rule を機械的に炙れる
- AI が古い rule を盲信するリスクを下げられる

### 自動検出される健全性シグナル

| シグナル | 検出方法 | 閾値 | 対処 |
|---|---|---|---|
| **例外圧** | allowlist の ruleId 集計 | ≥ 10 件 | ルール自体の見直し or ルールの分割 |
| **experimental + gate** | maturity と severity の組み合わせ | 0 件 | warn に降格 |
| **deprecated 残存** | maturity === 'deprecated' | 0 件 | ルールを削除 |

### 例外圧の読み方

例外が多いルールは 2 つの可能性がある:

1. **ルールが粗すぎる**: 1 つのルールが複数の異なる制約を束ねている
   → ルールを分割する（例: AR-STRUCT-RESP-SEPARATION を P2/P7/P8 等に分割）

2. **ルールが現実に合っていない**: 設計が進化してルールが陳腐化した
   → ルールの correctPattern / thresholds を見直す、または deprecated にする

**判断基準**: 例外の `lifecycle` を見る。
- `permanent` が多い → ルールが粗すぎる（構造的に必要な例外）
- `active-debt` が多い → ルールは正しいが改善が追いついていない

### ルールのライフサイクル

```
提案 → experimental（warn で観察）
         ↓ パターン安定・検出精度 OK
      stable（gate で強制）
         ↓ 例外圧が高い
      見直し（分割 or 閾値変更）
         ↓ アーキテクチャ変更で不要に
      deprecated（次回削除）
         ↓
      削除
```

### 「制約の変更」の原則

> 「邪魔だから」は理由にならない。「別の仕組みで防がれるようになった」は理由になる。

ルールを緩和・廃止するときは、以下を確認する:
1. そのルールが防いでいた問題は、別のルールで防がれているか？
2. そのルールが防いでいた問題は、アーキテクチャ変更で発生しなくなったか？
3. 「面倒だから」「よく引っかかるから」は廃止の理由にならない
