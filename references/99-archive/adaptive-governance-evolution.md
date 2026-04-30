# [ARCHIVED Project A Phase 5.3] Adaptive Architecture Governance — 進化の設計

> **Archived**: 2026-04-30 (Project A Phase 5.3)
> **Archived By**: 本 commit
> **Migrated To**: [`references/01-principles/aag/evolution.md`](../01-principles/aag/evolution.md) (Project A Phase 1 で landed、Discovery / Accumulation / Evaluation 3 層サイクル)
> **Mapping Anchor**: `aag/evolution.md §5` (旧 進化動学 → 新 進化動学 mapping)
> **Inbound 0 検証**: `git grep references/01-principles/adaptive-governance-evolution.md` = active 0 件 (`projects/completed/` 配下の immutable archive 1 件は archive-to-archive 参照として許容)
> **Rollback Anchor** (Insight 8): 本 archive 移管 commit、git revert で復活可能
> **Milestone Acknowledgment** (Insight 7-b): archive 移管 = 「不可逆ステップを今ここで踏む」の announcement
> **Decision Trace** (Insight 1): Project A Phase 1 で `aag/evolution.md` が landed 済、active reference (CLAUDE.md L360 + allowlists/types.ts L87) を新 path に update 済、本 doc は historical reference として retain
> **Active Reference Migration**: CLAUDE.md L360 + `app/src/test/allowlists/types.ts` L87 を `aag/evolution.md` に update (Phase 5.3 同 commit)
> **Note (archive-to-archive exception)**: `projects/completed/architecture-debt-recovery/plan.md` L673 は archived project の immutable reference のため update 対象外 (= inbound 0 は active 非 archived 範囲での 0 を意味する pragmatic 解釈)

---

# (元 content) Adaptive Architecture Governance — 進化の設計

## この文書の位置づけ

Architecture Rule、Guard、Allowlist、Health KPI、Obligation Map から成る
Governance System の **進化方針** を定義する。

個々のルールの内容ではなく、**ルールが生まれ、育ち、退役する制度** を設計する。

---

## 前提: なぜ進化が必要か

1. **完璧なルールは最初から描けない。** 問題は実装してから見つかる
2. **リポジトリは成長する。** 昨日正しかったルールが今日の進化を阻害しうる
3. **検出手段は改善される。** regex → AST → 型情報 と精度は向上する
4. **人の注意力は有限。** 機械的に防げることは機械に任せる

したがって、**ルールは仮説であり、継続的に検証される。**

---

## 3 層サイクル

```
    ┌─────────────┐
    │   発見       │  人が現実を観察し、新しいパターンを見つける
    │  Discovery   │  「これは分割すべきだ」「この混在は危険だ」
    └──────┬──────┘
           ▼
    ┌─────────────┐
    │   蓄積       │  発見を機械的に検出できるルールに変換する
    │ Accumulation │  guard + architecture rule + allowlist baseline
    └──────┬──────┘
           ▼
    ┌─────────────┐
    │   評価       │  ルール自体が価値を持ち続けているか検証する
    │  Evaluation  │  「このルールは改善を生んだか、阻害したか」
    └──────┬──────┘
           │
           ├─→ ルールが有効 → 検出精度を改善して蓄積に戻る
           ├─→ ルールが陳腐化 → 退役（sunset）
           └─→ 新しいパターン発見 → 発見に戻る
```

---

## 第 1 層: 発見（Discovery）

### 原則

> **偶然の発見に頼らない。定期的に現実を観察する制度を持つ。**

今回のセッションで「表示のみと分類された分析パススルー」を発見したのは偶然だった。
この種の発見を制度化する。

### 制度: Discovery Review

| 要素 | 内容 |
|------|------|
| **頻度** | 月 1 回、またはマイルストーン完了時 |
| **方法** | allowlist の全エントリを「本当にこの分類で正しいか」実コードで検証 |
| **観点** | ① 分類の正確性 ② 新しい責務混在 ③ 正本経路の完全性 |
| **成果物** | 発見した新パターンを Issue に起票 → 蓄積フェーズへ |

### Discovery の入力源

- **Allowlist 棚卸し** — 分類（display-only / structural / import-counting）が実態と合っているか
- **Guard 回避パターンの検出** — エイリアス化やリネームが発生していたら、ルールの目的と手段がずれている兆候
- **新規ファイルの傾向分析** — 最近追加されたファイルに新しい責務パターンが現れていないか
- **Hotspot 分析** — 変更頻度が高いファイルに責務混在がないか

---

## 第 2 層: 蓄積（Accumulation）

### 原則

> **ルールの目的を正本にし、検出手段は交換可能にする。**

現在の Architecture Rule 構造:

```typescript
{
  id: 'AR-STRUCT-STORE-RESULT-INPUT',
  what: 'StoreResult.totalCustomers を分析入力に使わない',  // ← 目的
  why: '表示用集計値と分析精度が異なる',                      // ← 理由
  detection: { type: 'regex', severity: 'gate' },           // ← 手段（交換可能）
}
```

`what`（目的）と `why`（理由）は安定し、`detection`（手段）は進化する。
この分離が既に存在するのは良い設計。

### 蓄積のプロセス

```
発見（Issue）
  → ruleClass: 'experimental' で導入（allowlist 広め、threshold 緩め）
  → 1-2 スプリントで実績を観察
  → 効果あり → ruleClass: 'default' に昇格、threshold 縮小
  → 効果なし or 回避多発 → 検出手段を改善 or 退役
```

### 検出精度の段階的改善

| Stage | 手法 | 精度 | 速度 | 適用タイミング |
|-------|------|------|------|--------------|
| 0 | `content.includes()` | 低 | 最速 | パターン発見直後の仮実装 |
| 1 | `regex` | 中 | 速い | 安定したパターンの標準検出 |
| 2 | AST-aware（import 除外等） | 高 | やや遅い | 誤検知が問題になった時 |
| 3 | 型情報ベース | 最高 | 遅い | 型レベルの区別が必要な時 |

**全ルールを Stage 3 にする必要はない。**
誤検知が実害を生んでいるルールだけを優先的に高精度化する。

### 判断基準: いつ検出精度を上げるか

- allowlist に「guard の検出精度が原因」で残留するエントリが **3 件以上** → 精度改善の投資対効果あり
- エイリアス化・リネームによる回避が **2 件以上** 発生 → ルールの目的と手段がずれている
- 同じルールで **false positive が繰り返し報告** → 検出パターンの見直し

---

## 第 3 層: 評価（Evaluation）

### 原則

> **ルールは仮説である。仮説は検証され、棄却されうる。**

ルールが存在し続ける正当性は「それが防いでいる害」によってのみ担保される。
害を防いでいないルール、または防ぐ害より大きな摩擦を生むルールは退役すべき。

### ルールの価値方程式

```
ルールの純価値 = 防いだ害 − 生んだ摩擦
```

- **防いだ害（protectedHarm）**: そのルールなしで発生するリグレッション、責務混在、正本化破壊
- **生んだ摩擦**: false positive、永久 allowlist エントリ、回避ワークアラウンド、開発速度の低下

### 評価の制度

#### 定量指標（自動収集）

| 指標 | 意味 | 閾値 |
|------|------|------|
| **allowlist 残留率** | 導入時の allowlist からの卒業率 | 6ヶ月で 50% 未満 → 見直し |
| **false positive 率** | エイリアス化・リネームによる回避件数 | 2 件以上 → 検出改善 |
| **ratchet 進行速度** | baseline の月次減少率 | 3ヶ月停滞 → 構造的障壁の調査 |
| **review overdue** | reviewCadenceDays を超過したルール数 | 0 を維持 |

#### 定性評価（Discovery Review 時）

| 問い | 期待する答え |
|------|-------------|
| このルールは過去 3 ヶ月で **何を防いだか**？ | 具体的なコミットやPRを挙げられる |
| このルールの allowlist に **永久残留エントリ** はあるか？ | あるなら理由は検出精度か構造か |
| このルールの回避で **ワークアラウンド** が生まれていないか？ | エイリアス化、リネームの有無 |
| このルールは **進化を阻害** していないか？ | 正しいリファクタリングが guard に阻まれていないか |

### 退役（Sunset）の条件

ルールは以下のいずれかで退役する:

1. **sunsetCondition が満たされた** — 定義済みの完了条件（例: 「StoreResult.totalCustomers が削除された」）
2. **防いだ害がゼロ** — 6 ヶ月間、そのルールが検出した新規違反がない（全員が自然に守っている）
3. **摩擦が価値を上回る** — false positive + 回避 + 永久 allowlist が 5 件以上で、改善の見込みがない
4. **別のルールに包含された** — より精度の高いルールが同じ害を防ぐようになった

退役したルールは **削除ではなくアーカイブ** する。
理由: 将来同じ問題が再発した場合、過去の検出手段を参照できる。

```typescript
ruleClass: 'deprecated'  // 検出は停止するが定義は残る
deprecatedAt: '2026-06-01'
deprecationReason: 'AR-STRUCT-NEW-RULE に包含された'
```

---

## 既存の仕組みとの接続

| 既存要素 | 第 1 層（発見） | 第 2 層（蓄積） | 第 3 層（評価） |
|---------|---------------|---------------|---------------|
| Architecture Rule | — | `what`/`why`/`detection` | `reviewPolicy`/`ruleClass`/`sunsetCondition` |
| Guard Test | — | 検出の実行 | false positive の計測 |
| Allowlist | 棚卸しの対象 | baseline 管理 | 残留率の計測 |
| Health KPI | — | ratchet-down の追跡 | 進行速度の評価 |
| Obligation Map | — | 変更→再生成の強制 | — |
| **Discovery Review（新設）** | ✅ 制度化 | Issue → experimental rule | 定性評価の実施 |
| **Rule Efficacy KPI（拡張）** | — | — | ✅ 定量評価の自動化 |

---

## 不変の原則（この文書自体の制約）

1. **ルールの目的は人が決める。** 機械は検出と計測を担う
2. **完璧を求めない。** Stage 0 の粗い検出でも「ないよりまし」
3. **改善は不可逆にする。** ratchet-down は維持する
4. **ルール自体も育てる。** experimental → default → deprecated のライフサイクル
5. **回避が生まれたらルールを疑う。** 人を責めず、仕組みを直す

---

## 次のアクション

| 優先度 | アクション | 期待効果 |
|--------|----------|---------|
| 1 | Allowlist に `reason` 分類を追加（display-only / structural / import-counting / no-readmodels） | Discovery Review の棚卸し効率化 |
| 2 | Rule Efficacy KPI に false positive 率 + 回避件数を追加 | 第 3 層の定量評価を自動化 |
| 3 | Discovery Review の初回実施 → 発見を Issue 化 | 第 1 層の制度化開始 |
| 4 | useState import 行カウント問題の AST-aware 化 | 永久 allowlist 2 件の卒業 |
