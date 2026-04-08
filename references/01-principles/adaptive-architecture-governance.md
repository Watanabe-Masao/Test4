# Adaptive Architecture Governance (AAG)

## 概要

**Adaptive Architecture Governance (AAG)** は、仕入荒利管理システムの
アーキテクチャ品質を **機械的に保証し、継続的に進化させる** 統合ガバナンスシステムである。

「完璧なルールを最初から描く」のではなく、**現実から学び、蓄積し、評価し続ける** ことで
リポジトリの成長に伴う変化に適応する。

## 構成要素

| 要素 | 責務 | ファイル |
|------|------|---------|
| **Architecture Rule** | ルールの定義（what/why/detection/migrationPath） | `app/src/test/architectureRules.ts` |
| **Guard Test** | ルールの機械的検出と強制 | `app/src/test/guards/` (39 files) |
| **Allowlist** | 既知の例外管理（lifecycle + retentionReason） | `app/src/test/allowlists/` |
| **Health KPI** | 28 指標のダッシュボード + Hard Gate | `tools/architecture-health/` |
| **Obligation Map** | パス変更 → ドキュメント更新義務の自動検出 | `obligation-collector.ts` |
| **Pre-commit Hook** | 義務違反の事前検出 + 自動再生成 | `tools/git-hooks/pre-commit` |
| **Ratchet-down** | 改善の不可逆化（baseline は下がる一方） | health-rules.ts の target |
| **Discovery Review** | 定期的な現実観察と新パターン発見 | 制度（月1回） |

## 設計原則

1. **ルールは仮説である。** 検証され、棄却されうる
2. **ルールの目的を正本にし、検出手段は交換可能にする。** what/why は安定、detection は進化
3. **改善は不可逆にする。** ratchet-down で一方向の進行を機械的に強制
4. **回避が生まれたらルールを疑う。** 人を責めず、仕組みを直す
5. **ブロックするだけでなく解決する。** pre-commit hook は自動修復を試行

## 3 層サイクル

```
  発見（Discovery）→ 蓄積（Accumulation）→ 評価（Evaluation）
       ↑                                         │
       └─────────── 新パターン / 退役 ────────────┘
```

詳細: `references/01-principles/adaptive-governance-evolution.md`

## バージョン履歴

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
| `references/03-guides/architecture-rule-system.md` | Architecture Rule の運用ガイド |
| `references/03-guides/allowlist-management.md` | Allowlist 管理ガイド |
| `references/03-guides/active-debt-refactoring-plan.md` | Active-Debt リファクタリング計画 |
| `CLAUDE.md` | プロジェクト全体のルール（AAG セクション含む） |
