# H. Screen Runtime — 画面実行モデルの標準規格

> 本ドキュメントは CLAUDE.md §設計原則の H カテゴリの詳細を記載する。
> Screen Runtime Standardization Initiative の設計思想・不変条件・適用ルールを定義する。

## 上位定義

**画面の「何を・いつ・どの意味で・どの条件で取得し、どの責務で描画するか」を標準化する。**

パフォーマンス改善は結果であって目的ではない。
目的は、画面が正しい意味のデータを、過不足なく、予測可能に取得・比較・描画すること。

### 北極星

**「速い画面」を作るのではなく、「正しい画面が、正しい理由で、安定して速い」状態を作る。**

### 4つの性質

| 性質 | 定義 |
|------|------|
| **Deterministic** | 同じ入力 → 同じ query identity・比較意味論・ViewModel・描画結果 |
| **Planned** | 取得は component mount の偶然ではなく plan で宣言される |
| **Derived once** | 業務集約・比較は描画のたびに component 内で再解釈しない |
| **Observable** | 欠落・比較崩れ・速度劣化を機械的に検証できる |

---

## 原則一覧

| ID | 原則 | 何が壊れるか |
|----|------|-------------|
| H1 | パフォーマンス最適化は Screen Query Plan 経由のみ | ad-hoc 最適化が散在し、取得責務が分散する |
| H2 | 比較取得は pair/bundle 契約のみ（isPrevYear 単発禁止を段階的に移行） | current/prev の片側だけ失敗・遅延し、比較意味論が壊れる |
| H3 | query input は canonicalizeQueryInput() 経由で正規化必須 | 意味的に同じ query が別物扱いされ、cache miss・重複実行が発生する |
| H4 | component は acquisition logic を持たない（plan hook 経由） | 子チャートの mount 順が取得順を決め、waterfall・hidden fetch が発生する |
| H5 | visible-only query は plan でのみ宣言可能 | 非表示コンテンツが無条件に query を発火し、帯域とレイテンシを浪費する |
| H6 | ChartCard は表示状態を通知するだけ。取得判断は Application 層 plan hook が行う | UI コンポーネントに取得制御が混入し、責務が肥大化する |

---

## Runtime Invariants（不変条件）

| ID | 名称 | 定義 | 検証手段 |
|----|------|------|---------|
| INV-RUN-01 | Semantic Determinism | 同じ意味の入力は同じ query identity になる。`canonicalizeQueryInput` がオブジェクトキー順序・配列順序・undefined/空配列の差異を吸収する | queryPatternGuard: Canonical Integration |
| INV-RUN-02 | Comparison Integrity | 比較は pair/bundle 契約のみで表現される。current/prev の片側だけ別扱いしない。`createPairedHandler` は同型 current/comparison に限定し、alignment が特殊なものは専用 pair handler を維持する | queryPatternGuard: isPrevYear Audit |
| INV-RUN-03 | Fetch Completeness | 必須データは子 component の mount 順ではなく、Screen Query Plan で完全性が決まる。plan が eager / lazy / visible-only / drill-only を宣言する | queryPatternGuard: Presentation Direct Query Count |
| INV-RUN-04 | Derivation Singularity | PI・偏差値・TopN・heatmap shaping 等の導出は ViewModel 層（.vm.ts）で一度だけ行う。component は ViewModel の出力を受け取るだけで再解釈しない | codePatternGuard: ViewModel Boundary |
| INV-RUN-05 | Visibility Safety | 非表示は取得の抑制条件になり得るが、必須取得の欠落理由にはならない。visible-only と required は plan 内で明示的に区別される | queryPatternGuard: Hidden Query Audit |

---

## 3つの Control Plane

### Semantic Control Plane — 画面が扱う意味の標準化

| 規格 | 対象 | 不変条件 |
|------|------|---------|
| Query Identity | `canonicalizeQueryInput()` | INV-RUN-01 |
| Comparison Semantics | `PairedQueryContract`, `createPairedHandler()` | INV-RUN-02 |
| Derivation Boundary | ViewModel (.vm.ts) 分離 | INV-RUN-04 |

### Execution Control Plane — 画面がいつどう取得するかの標準化

| 規格 | 対象 | 不変条件 |
|------|------|---------|
| Screen Execution | Screen Query Plan hook | INV-RUN-03 |
| Visibility / Activation | enabled / visible-only / drill-only | INV-RUN-05 |

### Assurance Control Plane — 壊れないことの制度化

| 規格 | 対象 |
|------|------|
| Guard | queryPatternGuard, codePatternGuard 拡張 |
| Audit | queryAccessAudit 拡張 |
| Baseline | correctness baseline (chartCorrectnessBaseline) |

---

## Stop-the-Line 条件

以下が発生したら、該当 Gate は前に進めない:

- correctness baseline の差分が説明できない
- pair 化により comparison semantics が変わった（比較値の符号反転等）
- feature flag 下で old/new の series 数が一致しない
- plan hook 化で required query が visible-only へ落ちた
- hidden fetch は減ったが empty fallback が増えた

---

## 既存原則との関係

H カテゴリは以下の既存原則を前提とし、それらを「画面実行の視点」で拡張する:

- **A3** (Presentation 描画専用) → H4 は A3 を query 取得にも拡張
- **B1** (Authoritative 計算は domain のみ) → H5 の導出は B1 と矛盾しない（ViewModel は描画整形であり Authoritative 計算ではない）
- **C1** (1ファイル=1変更理由) → plan hook は取得計画、vm は描画整形、component は描画のみ
- **F7** (View に raw 禁止) → H4 の component は ViewModel 出力のみ受け取る、と同義
- **G1** (テストに書く) → INV-RUN-01〜05 は全て guard / baseline で検証
