# AAG Strategy — 戦略マスター

> **位置付け**: AAG architecture pattern の **Layer 0+1** (= 目的 + 要件) の戦略 articulate doc。`meta.md` と並ぶ Layer 0 articulate を担うが、本 doc は **戦略 / 文化論 / 意図的に残す弱さ** に責務を絞る (1 doc 1 責務、C1 適用)。
>
> **役割**: AAG が「動くが意図に反するコード」を早期検出する mechanism として運用される際の **戦略指針 + 文化論 + 意図的に残す弱さ** を articulate。`meta.md` §1 (目的) を realize する戦略の正本。
>
> **drill-down pointer**:
> - 上位 (back-pointer): [`meta.md`](./meta.md) §1 (目的 = AAG の why)
> - 下位 (drill-down): [`architecture.md`](./architecture.md) (5 層構造定義) / [`evolution.md`](./evolution.md) (進化動学) / `references/01-foundation/design-principles.md` (設計原則 9 カテゴリ)
>
> **5 層位置付け** (本 doc 自身): Layer 0+1 (目的 + 要件、戦略 articulate)
>
> **§1.5 archive 前 mapping 義務**: 旧 `adaptive-architecture-governance.md` の Split + 部分 Archive (Project A Phase 2 + Phase 5 で実施) 前提は本 doc に「旧 戦略マスター → 新 戦略 mapping」が landed 済 (= 本 doc §6)。

## §1 戦略指針 (Strategic Principles)

AAG は **「品質 OS」** として codebase の進化を保証する。本体アプリ (粗利管理ツール) の機能ではなく、本体を支える **mechanism** に責務を絞る (`AAG-REQ-NO-BUSINESS-LOGIC-INTRUSION` 適用)。

### §1.1 戦略の核心 3 原則

1. **正本を増やさない** — `architecture.md` §5 5 縦スライスごとに 1 つの正本 doc が articulate、重複 articulate 禁止 (`AAG-REQ-ANTI-DUPLICATION` 適用)
2. **導出可能なものは導出する** — generated section / health KPI / certificate / project-health は手編集禁止、`docs:generate` で自動生成
3. **思想 / 型 / 検査 / 運用を混ぜない** — Layer 0 (目的) / Layer 1 (要件) / Layer 2 (設計) / Layer 3 (実装) / Layer 4 (検証) を orthogonal に分離 (`AAG-REQ-LAYER-SEPARATION` 適用)

### §1.2 戦略の運用方針

- **AAG framework の拡張は本体コードに touch しない** — Layer 1〜4 の内部で完結 (`AAG-REQ-NO-BUSINESS-LOGIC-INTRUSION`)
- **state-based trigger のみ、期間 buffer 禁止** — archive / deprecated 化 / 物理削除は inbound 0 機械検証 + 人間 deletion approval が trigger、cooling period は anti-ritual (`AAG-REQ-NO-DATE-RITUAL` + `AAG-REQ-STATE-BASED-GOVERNANCE`)
- **改善は不可逆** — baseline は下がる方向のみ、増加方向は構造禁止 (`AAG-REQ-RATCHET-DOWN`)
- **AI / 人間判断の代替禁止** — 機械検証で判定不可能な領域 (戦略 / 業務的妥当性 / 創造性) は人間判断に残す (`AAG-REQ-NO-AI-HUMAN-SUBSTITUTION`)

## §2 文化論 (AAG が防ぐ AI の本質的弱点)

AAG は AI と人間が共同で開発する codebase において、**AI の本質的弱点** を構造的に補う mechanism として機能する。

### §2.1 AI の本質的弱点

| 弱点 | 構造的補強 |
|---|---|
| **過去判断の文脈消失** — AI は session 間で記憶を持たない、過去の判断理由を失う | allowlist の `retentionReason` / Architecture Rule の `why` / Discovery Review で判断履歴を蓄積、後任 AI が文脈継承可能 |
| **「動く」の妥当性誤認** — テストが通れば「動く」と認識、設計意図に沿っているかは判定しない | 機械検証 (rule + guard) で「動くが意図に反する」を即時 fail させる (Layer 3 実装) |
| **改善の retraversal** — 一度「修正済」と認識した領域に AI は再着手しない | ratchet-down で baseline 増加方向を構造禁止、改善を不可逆化 |
| **重複生成の盲目** — 既存 articulation を copy して新 doc 作成、重複 articulate 横行 | `AAG-REQ-ANTI-DUPLICATION` + `semanticArticulationQualityGuard` (Phase 8 MVP) で重複検出 |
| **抽象化の過剰** — 「べき」「べき」を articulate し続け、具体 mechanism に落ちない | drill-down chain semantic management で `problemAddressed` + `resolutionContribution` 必須化 |

### §2.2 意図的に残す弱さ

AAG は **完璧主義** を禁則 (`AAG-REQ-NO-PERFECTIONISM`)。次の弱さは **意図的に残す**:

| 弱さ | 残す理由 |
|---|---|
| **Layer 0 (目的) は機械検証不可** | 機械検証 condition に変換すると Layer 0 が「proxy metric」化、performative work を生む |
| **Layer 4 検証の sub-audit は extensible (固定しない)** | initial 5 set (4.1〜4.5) で landing し、Phase 3 audit findings に応じて追加候補 (4.6〜4.9) を collapse 可否判定 |
| **Discovery Review の意味品質** | 機械では判定不可能、人間 review で補完 (`semanticArticulationQualityGuard` の hard fail 基準は禁止 keyword + 文字数 minimum + 重複検出 + status 整合 + path 実在 のみ、意味的「それっぽい空文」は機械判定しない) |
| **物理削除 trigger の人間判断必須** | anti-ritual と orthogonal な安全装置、AI 単独で物理削除 commit を実行しない (`AAG-REQ-NO-AI-HUMAN-SUBSTITUTION`) |

「弱さ」を articulate し受容することで、performative work の生成を構造的に防ぐ。

## §3 AAG の本質: 機械的検出と言語化の融合

AAG の強みは「コードを検証する機械」ではない。**「判断を言語化し、蓄積し、検証可能にする制度」** である。

### §3.1 ドキュメントで始まり、ドキュメントで終わる

```
ドキュメント (意図) → 機械 (検出) → 結果 (allowlist / KPI) → ドキュメント (評価・卒業記録)
```

Guard が検出するのは pattern の違反だが、本当に守っているのは AR-rule に書かれた **`what` / `why` / `decisionCriteria`** である。regex が粗くても、なぜそのルールが存在するかが言語化されていれば人間 / AI が正しく判断できる。逆に検出が完璧でもドキュメントがなければ、ルールは「理由のわからない制約」になり形骸化する (`AAG-REQ-NON-PERFORMATIVE` 違反)。

### §3.2 ドキュメント作成コストは投資である

ドキュメントを作り込む手間は品質管理のオーバーヘッドではなく、**暗黙知を形式知に変換する投資**。allowlist 卒業時の一行コメントも単なるコメントではなく AAG の資産:

```typescript
// WeatherPage.tsx — useWeatherDaySelection 抽出で combined 17→13。許可リスト卒業
```

次にこの file を触る人 / AI が「なぜこの構造なのか」を知る手がかりであり、Discovery Review で「この判断は今も正しいか」を検証する材料になる。

### §3.3 1 人開発における特別な意味

チームなら議論で暗黙知が共有されるが、1 人では **過去の自分との対話** がドキュメントを通じてしか成立しない。AAG はその対話の制度化である。

### §3.4 AI との対話インターフェース — 3 者対話の共通言語

AAG のドキュメントは人間のためだけではない。**AI が判断基準を理解し、意図に沿った変更を行うためのインターフェース** でもある。

Architecture Rule の `what` (何を防ぐか) / `why` (なぜ防ぐか) / `decisionCriteria` (例外の判断基準) が明文化されているからこそ、AI はルールの意図を理解して正しく適用できる。暗黙知のままなら、AI は regex pattern を機械的に満たすだけの変更しかできない。

> **3 者対話の構造**: AAG ドキュメントは **「過去の自分」「未来の自分」「AI」の 3 者が同じ判断基準で対話するための共通言語** として機能する。言語化の精度が上がるほど、AI の判断精度も上がる。

これが `AAG-REQ-SEMANTIC-ARTICULATION` (drill-down chain の semantic management、`problemAddressed` + `resolutionContribution` 必須化) の戦略的根拠。

## §4 戦略適用範囲 (in-scope vs out-of-scope)

### §4.1 in-scope (AAG が担う)

- AR-rule schema 設計 + 機械検証 (Layer 2 + 3)
- canonical doc registry + drill-down chain semantic management (Layer 2 + 3)
- guard + collector + health renderer (Layer 3)
- 5 sub-audit (境界 / 方向 / 波及 / 完備性 / 機能性、Layer 4)
- project lifecycle 規約 (Layer 4 別 axis = System Operations)
- ratchet-down + state-based trigger (Layer 1 要件、全層に適用)

### §4.2 out-of-scope (AAG が担わない)

- **本体アプリ機能** (粗利計算 / 売上要因分解 / 需要予測 / UI / API) — 別 project が担う
- **戦略判断 / 業務的妥当性 / 創造性** (人間判断のみ、`AAG-REQ-NO-AI-HUMAN-SUBSTITUTION`)
- **完璧な意味品質検証** (Discovery Review + 人間 review で補完、機械では hard fail 基準のみ)
- **期間 buffer による cooling / 月次 review hook** — anti-ritual (`AAG-REQ-NO-DATE-RITUAL`)

## §5 戦略の進化方針

戦略は **reform** ではなく **refine** で進化する。`evolution.md` (進化動学) に詳細を articulate するが、本 doc では戦略 axis での原則のみ:

- **Discovery** (新規発見) — 既存 5 層 / 5 縦スライスの空きセルに新 doc / 新 rule を配置
- **Accumulation** (蓄積) — `meta.md` §2 の AAG-REQ-* に新 requirement を追加 (Constitution 改訂と同等の慎重さ)
- **Evaluation** (評価) — `meta.md` §4 達成判定総括 で各 requirement の達成 status を flip + audit 履歴記録

戦略 reform (= 5 層構造の根本変更 / 5 縦スライス reshape) は **稀有な例外** で、人間判断 + Constitution 改訂と同等の慎重さで扱う。

## §6 非目的 (Non-goals)

本 doc は次を **articulate しない** (= 別 doc の責務):

- **5 層構造定義 + 旧 4 層 → 新 5 層 mapping** → [`architecture.md`](./architecture.md)
- **進化動学 (Discovery / Accumulation / Evaluation の詳細)** → [`evolution.md`](./evolution.md)
- **ファイル別 5 層マッピング** → [`layer-map.md`](./layer-map.md)
- **正本 / 派生物 / 運用物 区分ポリシー** → [`source-of-truth.md`](./source-of-truth.md)
- **now / debt / review 運用区分** → [`operational-classification.md`](./operational-classification.md)
- **設計原則 9 カテゴリ詳細** → `references/01-foundation/design-principles.md`
- **AAG Layer 1 要件 12 件 (AAG-REQ-*) 詳細** → [`meta.md`](./meta.md) §2

## §7 旧 戦略マスター → 新 戦略 mapping (`§1.5 archive 前 mapping 義務`)

旧 `adaptive-architecture-governance.md` (戦略マスター + 文化論 + 設計原則 + バージョン履歴 + 旧 4 層 + 関連文書 table が同居、6 責務同居 = C1 違反) を Split:

| 旧 doc 内 section | 新 path |
|---|---|
| 戦略マスター (前提 / 4 層内完結 等) | 本 doc §1 戦略指針 |
| 文化論 (AAG が防ぐ AI の本質的弱点 / 意図的に残す弱さ) | 本 doc §2 文化論 |
| AAG の本質 + AI 対話インターフェース (3 者対話) | 本 doc §3 (Project A Phase 2 で migrate) |
| 戦略適用範囲 (in-scope / out-of-scope) | 本 doc §4 |
| 戦略の進化方針 | 本 doc §5 + [`evolution.md`](./evolution.md) |
| 旧 4 層構造定義 | [`architecture.md`](./architecture.md) §1 (新 5 層) + §4.1 (旧 → 新 mapping) |
| AAG Response フロー (違反時の返答 mechanism) | [`operational-classification.md`](./operational-classification.md) §7 (Project A Phase 2 で migrate) |
| 設計原則 9 カテゴリ (A-I + Q) 詳細 | `references/01-foundation/design-principles.md` (既存 doc に集約、本 doc では articulate しない) |
| バージョン履歴 | `references/04-tracking/recent-changes.generated.md` (per-doc 分散、本 doc では articulate しない) |
| 関連文書 table | 本 doc §8 関連 doc + [`README.md`](./README.md) (aag/ ディレクトリ index) |

## §8 関連 doc

| doc | 役割 |
|---|---|
| [`meta.md`](./meta.md) | AAG Meta charter (Layer 0 目的 + Layer 1 要件) — 本 doc の上位 |
| [`architecture.md`](./architecture.md) | 5 層構造定義 + 旧 4 層 → 新 5 層 mapping (Layer 1+2) — 本 doc の sibling |
| [`evolution.md`](./evolution.md) | 進化動学 (Layer 1+2) — 戦略の進化を realize する mechanism |
| [`README.md`](./README.md) | aag/ ディレクトリ index |
| `references/01-foundation/design-principles.md` | 設計原則 9 カテゴリ (A-I + Q) — 本 doc が articulate しない設計原則の詳細 |
| `references/01-foundation/uiux-principles.md` | UI/UX 4 原則 — 本体アプリ側の戦略 (out-of-scope) |
| `projects/completed/aag-bidirectional-integrity/plan.md` | 親 project の正本 |
| `projects/completed/aag-core-doc-refactor/plan.md` | 本 doc を landing する project の plan |
