# projectization — architecture-debt-recovery

> 役割: AAG-COA 判定結果。
> 規約: `references/03-guides/projectization-policy.md`

## 1. 判定結果

| 項目 | 値 |
|---|---|
| `projectizationLevel` | Level 4 (Umbrella) |
| `changeType` | architecture-refactor |
| `implementationScope` | `["app/src/features/", "app/src/application/", "app/src/presentation/", "app/src/domain/", "app/src/test/", "tools/architecture-health/"]` |
| `breakingChange` | true |
| `requiresLegacyRetirement` | true |
| `requiresGuard` | true |
| `requiresHumanApproval` | true |

## 2. 判定理由

widget を入口とする大型改修の **umbrella project**。inquiry → 真因分析 → 原則制定 →
改修計画 → sub-project spawn → 実装 → archive の 7 Phase で、複数 Lane（SP-A / SP-B /
SP-C / SP-D）を spawn して負債回収を行う。

- **Level 4 (Umbrella)** — 4 sub-project を spawn（widget-context-boundary /
  duplicate-orphan-retirement / aag-temporal-governance-hardening / [SP-B Budget TBD]）、
  複数 architecture lane、広範囲の破壊的変更と legacy 撤退、原則・invariant・guard の新設、
  generated health への統合まで行う
- **changeType=architecture-refactor** — 型 / 純粋関数 / データパイプライン / コンポーネント
  分割を一体で再構築する
- **breakingChange=true** — BC-1〜BC-7 の計 7 件の破壊的変更（4 lane 横断）
- **requiresLegacyRetirement=true** — LEG-001〜LEG-015 の 15 legacy item の撤退
- **requiresGuard=true** — 各 Lane で 4-5 guard 新設、合計 17+ 新 guard
- **requiresHumanApproval=true** — Phase 4 改修計画 + Phase 5 原則昇格 + archive 時すべて
  人間承認必須

## 3. 必要な文書

| 文書 | 必要性 | 理由 |
|---|---:|---|
| `AI_CONTEXT.md` | required | Level 4 必須 |
| `HANDOFF.md` | required | Level 4 必須 |
| `plan.md` | required | 7 Phase 構造 + 不可侵原則 16 項 |
| `checklist.md` | required | completion 判定入力 |
| `inquiry/` | required | Phase 1 事実棚卸し（21 ファイル） |
| `breaking-changes.md` | required | BC-1〜BC-7 の umbrella level 一覧（inquiry/16 への pointer） |
| `legacy-retirement.md` | required | LEG-001〜LEG-015 の umbrella level 一覧（inquiry/17 への pointer） |
| `sub-project-map.md` | required | **Level 4 必須**。4 sub-project + 依存関係（inquiry/18 への pointer） |
| `spawn-sequence.md` | 任意 | inquiry/21 に正本がある。root level は pointer 不要 |
| guard 設計 (plan.md 内) | required | 17+ guard の baseline 戦略（Phase 6 で各 sub-project に展開） |
| 最終レビュー (人間承認) checkbox | required | requiresHumanApproval=true |

## 4. やらないこと (nonGoals)

- 個別 widget の cleanup（Budget Simulator 7 項目は真因の 1 入力に過ぎない）
- 新機能追加（負債回収のみ）
- documentation-only 作業（Phase 6 で実装まで行う）
- パフォーマンス最適化（別 project）
- UI デザイン刷新（視覚的変更は最小限）
- budget-achievement-simulator を Phase 5 まで触ること（独立 project の在職状態を保護）
- Phase 4/5 計画を経由せずに sub-project を立ち上げること

## 5. Escalation / De-escalation 条件

- Phase 6 実装中に「真因分析を再度行う必要がある」と判明した場合 → 新 sub-project を spawn、
  Phase 1-3 を小規模に再実施
- sub-project で処理しきれない scope が判明した場合 → inquiry/ に addendum 追加承認後、
  umbrella plan.md に sub-project を追加
- Level 4 → Level 3 de-escalation は発生しない想定（既に sub-project が spawn 済み）

## 6. 履歴

| 日付 | 変更 | 理由 |
|---|---|---|
| 2026-04 (initial) | bootstrap（Phase 1 inquiry 着手） | budget-achievement-simulator findings が起点 |
| 2026-04-23 | Phase 5 人間承認により draft → active 昇格 | Phase 6 sub-project spawn 準備完了 |
| 2026-04-23 | Phase 6 Wave 1 で 3 sub-project spawn (SP-A/SP-C/SP-D) | Lane A/C/D 先行 |
| 2026-04-24 | AAG-COA 遡及判定 (Level 4) | projectization-policy 導入後の retroactive 付与 |
