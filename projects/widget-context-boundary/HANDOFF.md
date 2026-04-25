# HANDOFF — widget-context-boundary（SP-A）

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

**Wave 1 メインライン完了 (2026-04-25)。status: `active` / parent: `architecture-debt-recovery`。**

ADR-A-001 / A-002 / A-003 は実装完了。ADR-A-004 は PR1 (guard) のみ完了し PR2-4 は次セッション以降の大型タスク。

### 完了 ADR

| ADR | BC | 状態 | 主な成果 |
|---|---|---|---|
| A-001 | BC-1 | ✅ PR1/2/3a/3b/3c/4 全 | UnifiedWidgetContext から 5 page-local field 削除、Insight/CostDetail/Category page-specific ctx 新設 |
| A-002 | BC-2 (部分) | ✅ PR1/2/3/4 全 | DashboardWidgetContext 新設、WidgetContext alias 削除、20 field を audit して 11 Dashboard 専用 field を削除（9 cross-page 共有は残置）|
| A-003 | BC-3 | ✅ PR1/2/3/4 全 | WidgetDef 同名 2 ファイル並存を UnifiedWidgetDef / DashboardWidgetDef に分離、19 consumer を bulk migrate、alias 削除 |
| A-004 | BC-4 | 🟡 PR1 のみ | coreRequiredFieldNullCheckGuard baseline=1 で導入。PR2-4 (discriminated union 化) は次セッション以降 |

### 新規 guard (本 project が landed)

- `unifiedWidgetContextNoPageLocalOptionalGuard` (baseline=0、ADR-A-001 完結)
- `unifiedWidgetContextNoDashboardSpecificGuard` (baseline=9、ADR-A-002 移行中)
- `sameInterfaceNameGuard` (baseline=27、ADR-A-003 完結)
- `coreRequiredFieldNullCheckGuard` (baseline=1、ADR-A-004 PR1 完了)

## 2. 次にやること

### 高優先（次セッション）

1. **ADR-A-004 PR2-PR4**: StoreResult / PrevYearData の discriminated union 化（BC-4）
   - PR2: `{ status: 'ready'; data } | { status: 'empty' }` 型を並行導入
   - PR3: 全 consumer を type narrowing 経由に移行（`if (result.status === 'ready') ...`）
   - PR4: 旧 shape 削除、guard baseline=0
   - **影響範囲: domain / application / presentation 全 3 層、推定 100+ ファイル**
2. **45 widget の `lastVerifiedCommit` 更新**: WSS spec のメンテナンスは未着手（ADR-A-001〜A-003 で touched widget だけでも 30+ 件）

### sub-project completion 条件

- ADR-A-004 PR4 完了
- LEG-007 / LEG-008 sunsetCondition 達成
- 45 widget の `lastVerifiedCommit` が同期
- visual / E2E 回帰テスト
- sub-project completion PR (umbrella inquiry/20 §テンプレート 7 step)

## 3. ハマりポイント

### 3.1. ADR-A-002 PR4 で発見した audit 誤り

inquiry/15 §ADR-A-002 では「Dashboard 固有 20 field」と分類されていたが、
実装中に 9 field が cross-page 共有（Insight ページの PiCvBubbleChart / DashboardPage 内部参照など）
であることが判明。残 11 field のみ削除した。**事前 audit より実コード検証を優先する**ことの教訓。

### 3.2. discriminated union 化の影響範囲は予想以上

`StoreResult` は domain core type で、`result.daily` / `result.budget` 等の access が
コードベース全域に散在。`if (result.status === 'ready') result.daily` 形式に切替えるには
段階的移行（utility selector で吸収 → 各 widget を順次切替）が必須。1 セッションで完遂は困難。

### 3.3. 45 widget 影響の段階移行

一気に変えると回帰リスク大。ADR-A-001 / A-002 の PR3 は複数 batch に分けて完遂済み
（例: INSIGHT 6 widget を 1 batch、COST_DETAIL 4 widget を 1 batch）。

### 3.4. WSS spec の `lastVerifiedCommit` 更新は未自動化

各 PR で手動更新する規律は守れていない（バルク作業が多すぎた）。
SP-B 完了後に WSS generator project でこれを自動化することを検討。

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| `AI_CONTEXT.md` | why / scope / parent / read order |
| `plan.md` | 4 ADR 実行計画 |
| `checklist.md` | Phase 別 completion 条件 |
| `config/project.json` | project manifest |
| `aag/execution-overlay.ts` | rule overlay |
| `projects/architecture-debt-recovery/inquiry/15-remediation-plan.md §Lane A` | 4 ADR 元台帳 |
| `projects/architecture-debt-recovery/inquiry/16-breaking-changes.md §BC-1〜BC-4` | 4 破壊的変更 |
| `projects/architecture-debt-recovery/inquiry/17-legacy-retirement.md §LEG-001〜LEG-008` | 8 legacy item |
| `projects/architecture-debt-recovery/inquiry/10a-wss-concern-link.md` | WSS 45 widget concern 連結 |
| `references/05-contents/widgets/WID-NNN.md` | 各 widget の現状把握（PR ごと更新） |
