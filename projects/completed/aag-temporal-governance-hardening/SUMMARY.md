# SUMMARY — aag-temporal-governance-hardening（SP-D）

> **役割**: completion 記録（final）。後続 project が本 sub-project の経緯・成果物・
> 引き継ぎ先を参照するためのサマリ。
>
> **status (本 file)**: **final（2026-04-26 archive 完了）**。
> `inquiry/20 §sub-project completion テンプレート` の step1-7 すべて実施完了。

## 完了日

**2026-04-26** — ADR-D-003 PR4 step4 (commit `331ac9e`) で全 6 ADR の 4 step
完遂、P20 fixed mode (上限 20 行) 到達。Phase 7 sub-project completion で archive。

## 目的（再掲）

umbrella `architecture-debt-recovery` の **Lane D** sub-project として、
governance の時間 / 構造 / 存在 3 軸を強化する 6 ADR を一括で実施:
- 「rule に時計を持たせる」（reviewPolicy 必須化）
- 「allowlist に metadata を持たせる」
- 「@deprecated に sunset を持たせる」
- 「G8 を内部行数に拡張」
- 「remediation 進捗を generated health に出す」
- 「project phase gate を guard で止める」

## 成果物（landed）

### 6 ADR 完遂

| ADR | 主な成果 | 関連 BC / LEG | guard 状態 |
|---|---|---|---|
| **D-001** | reviewPolicy 必須化 + 139 rule bulk 整備 + review overdue hard fail | BC-6 | reviewPolicyRequiredGuard fixed (baseline 139→0) |
| **D-002** | allowlist entry に ruleId / createdAt / reviewPolicy / expiresAt 必須化 + 35 entry bulk 整備 + expired fail | BC-7 | allowlistMetadataGuard fixed |
| **D-003** | G8-P20 useMemo body 行数 ratchet-down → fixed mode (上限 20 行)。28 件 useMemo を pure builder に抽出 | — | responsibilitySeparationGuard P20 fixed (baseline 208→20) |
| **D-004** | @deprecated に @expiresAt + @sunsetCondition 必須化 + lifecycle 監視 | LEG-008 sunset | deprecatedMetadataGuard fixed |
| **D-005** | architecture-debt-recovery-remediation.{md,json} 生成 + project-health 連携 + drift 検出 | — | docs:check に組込 |
| **D-006** | projectDocConsistencyGuard 4 check 実装 (HANDOFF/checklist 整合 / status 説明可能性 / phase 着手前 review / required inquiry 突合) | — | projectDocConsistencyGuard fixed |

PR 数 / 行数 / baseline 推移などのメトリクスは
`references/02-status/generated/architecture-debt-recovery-remediation.json` を参照。

### guard fixed mode 達成

| guard | 状態 |
|---|---|
| `reviewPolicyRequiredGuard` | ✅ ADR-D-001 完結（fixed mode） |
| `allowlistMetadataGuard` | ✅ ADR-D-002 完結（fixed mode） |
| `deprecatedMetadataGuard` | ✅ ADR-D-004 完結（fixed mode） |
| `responsibilitySeparationGuard` G8-P20 | ✅ ADR-D-003 完結（fixed mode 上限 20 行） |
| `projectDocConsistencyGuard` | ✅ ADR-D-006 完結（fixed mode） |

### Breaking Changes

| BC ID | 内容 | 適用 |
|---|---|---|
| **BC-6** | `RuleOperationalState.reviewPolicy` required 昇格 | ADR-D-001 PR3 |
| **BC-7** | allowlist entry の `ruleId` / `createdAt` / `reviewPolicy` required 昇格 | ADR-D-002 PR3 |

### LEG sunsetCondition 達成

| LEG ID | 対象 | 状態 |
|---|---|---|
| **LEG-008** | `@deprecated` 単独 metadata（@expiresAt / @sunsetCondition なし） | ✅ migrated（ADR-D-004 完遂） |

### 新設 module / 拡張

| パス | 役割 |
|---|---|
| `app/src/test/guards/reviewPolicyRequiredGuard.test.ts` | rule.reviewPolicy required 検証（ADR-D-001） |
| `app/src/test/guards/allowlistMetadataGuard.test.ts` | allowlist 5 metadata 検証（ADR-D-002） |
| `app/src/test/guards/deprecatedMetadataGuard.test.ts` | @deprecated metadata + expired fail（ADR-D-004） |
| `app/src/test/guards/projectDocConsistencyGuard.test.ts` | project doc 整合 4 check（ADR-D-006） |
| `tools/architecture-health/src/collectors/remediation-collector.ts` | architecture-debt-recovery-remediation 生成（ADR-D-005） |
| `references/02-status/generated/architecture-debt-recovery-remediation.{md,json}` | umbrella 進捗の generated KPI（ADR-D-005） |
| `app/src/presentation/hooks/unifiedWidgetContextBuilder.ts` ほか 7 *.builders.ts | useMemo body 抽出先 pure builder 群（ADR-D-003 PR4） |

## 主要設計判断

### 1. ratchet-down → fixed mode の 4 step pattern

各 ADR とも次の 4 step で完結する型を採用:
- **PR1**: guard 実装 + 実測値で baseline 凍結
- **PR2**: bulk 整備 / 抽出により baseline 削減
- **PR3**: required 昇格 / fixed mode への切替（hard fail）
- **PR4**: lifecycle / expired 監視追加

**教訓**: 「実測 baseline」で凍結することで plan 値との乖離 (例: D-001 plan=92 → 実測 139)
を許容しつつ、削減目標を構造的に強制できる。

### 2. ADR-D-003 PR4 の 4-step 累計 28 件 useMemo 抽出

baseline 208 → 120 (PR2) → 75 (PR3) → 67 (PR4-step1) → 38 (PR4-step2) → 28 (PR4-step3)
→ **20 fixed** (PR4-step4) と段階削減。各 step の抽出 pattern:
- 同 file の module-private 関数（小規模 / hooks 不要）
- `*.builders.ts` 別 file（chart component の G5-CRT 適合）
- 同 directory の `<feature>CardBuilders.ts`（vm 系）
- 戻り値型は **annotate 省略**（excess property check 回避、useMemo 経由代入では走らない）

**教訓**: useMemo body の pure 化は「依存値を input interface で受け取る」「DOM/React
依存は呼び出し側で解決」「戻り値型は推論」の 3 ルールで副作用なく 100+ 行削減が可能。

### 3. BC-6 / BC-7 を別 PR で実施

baseline 0 到達後に type required 昇格を別 commit に分離。bulk 整備 commit が大きく
なるため、breaking change を独立 PR にすることでロールバック粒度を確保。

**教訓**: breaking change と bulk 整備を同 commit に混ぜない。

### 4. generated remediation の active 期間限定

`architecture-debt-recovery-remediation.{md,json}` は umbrella active 期間中のみ生成。
archive 時の扱いは Phase 7 時点で再判断（snapshot 保存 or 削除）。

## CI gate（本 sub-project 期間中の通過実績）

- `npm run test:guards` PASS（98 files / 680 tests）
- `npm run docs:generate` PASS（KPIs OK 44/44、Hard Gate PASS）
- `npm run docs:check` PASS（sections valid、health match committed）
- `npm run lint` PASS（0 errors）
- `npm run build` PASS（tsc -b + vite build、type 整合性）
- `npm test` PASS（724 files / 9,735 tests）

## 後続 project への引き継ぎ

### umbrella architecture-debt-recovery への影響

Lane D 全完遂。残 Lane:
- Lane A widget-context-boundary: ✅ archived (2026-04-25)
- Lane B widget-registry-simplification: ✅ archived (2026-04-26)
- Lane C duplicate-orphan-retirement: ✅ archived (2026-04-25)
- Lane D aag-temporal-governance-hardening: ✅ archived (2026-04-26、本 archive)

**umbrella `architecture-debt-recovery` Phase 6 全 sub-project 完了。**
次は umbrella の Phase 7 として umbrella 自身の archive を実施。

### P21 (widget 直接子数) は別 PR

ADR-D-003 計画時に含まれていた P21 (widget が直接持つ子要素数) は AST ベース
解析が必要なため別 PR に分離（未着手）。次回別 project / quick-fix で着手予定。

## 完了条件（達成状況）

`checklist.md` Phase 1-7 + 最終レビューが正本（本 SUMMARY は要約）。実施完了状態:

- [x] Phase 1: ADR-D-006 projectDocConsistencyGuard 4 step
- [x] Phase 2: ADR-D-005 generated remediation 3 step
- [x] Phase 3: ADR-D-001 reviewPolicy required 昇格 (BC-6) 4 step
- [x] Phase 4: ADR-D-002 allowlist metadata required (BC-7) 4 step
- [x] Phase 5: ADR-D-004 @deprecated metadata 4 step
- [x] Phase 6: ADR-D-003 G8-P20 fixed mode 4 PR (PR4 は 4 step に分割)
- [x] sub-project completion テンプレート step1-7 全実施
- [x] umbrella plan.md 外の破壊的変更なし（`git log` で本 sub-project の commit は
      すべて aag-temporal-governance-hardening scope 内）

## rollback plan

完了 PR の人間承認後に問題が発覚した場合:

- archive 7 step を逆順に revert（git revert）
- sub-project status を `completed → active` に戻す
- 必要に応じて 個別 ADR の PR4 → PR3 → PR2 → PR1 の順で段階 revert
  （rollback 境界は 1 ADR 単位）
- guard ALLOWLIST と baseline は revert 後に手動修復

## 参照

- umbrella project: `projects/architecture-debt-recovery/`
- 本 project HANDOFF / plan / checklist / breaking-changes: 同 directory 内
- 完了 commit:
  - **ADR-D-006**: `18c876d` (PR1) / `26e8611` (PR2-4)
  - **ADR-D-005**: `a849789` (PR1) / `9ca075b` (PR2-3)
  - **ADR-D-001**: `e3d40c0` (PR1) / `da427ca` (PR2) / `1818605` (PR3) / `19fcfee` (PR4)
  - **ADR-D-002**: `fbeba54` (PR1) / `8990c0a` (PR2-4)
  - **ADR-D-004**: `481aaa5` (PR1) / `759ef32` (PR2) / `4adc6a1` (PR3) / `be5ae27` (PR4)
  - **ADR-D-003**: `1bff9b0` (PR1) / `f741f91` (PR2) / `e782531` (PR3) /
    `bd33473` (PR4 step1) / `9551cc7` (PR4 step2) / `ea10a84` (PR4 step3) /
    `331ac9e` (PR4 step4 + fixed mode)

## 歴史的意義

本 sub-project は umbrella `architecture-debt-recovery` の **Phase 6 Wave 1**
で SP-A / SP-C と同時 spawn された Lane D。governance 強化（rule / allowlist /
deprecated / G8 行数 / remediation 生成 / project doc 整合）を **6 ADR × 3-4 step**
の体系で完遂し、5 guard を全て fixed mode に到達させた。

特筆すべき設計判断:

1. **時計を持つ governance** — reviewPolicy / @expiresAt / lastReviewedAt の
   3 metadata を必須化することで、rule / allowlist / @deprecated の経年劣化を
   構造的に検出可能にした。

2. **段階的 ratchet-down → fixed mode** — 各 ADR が 4 step pattern で baseline 削減
   → fixed mode 到達。途中段階での部分達成を許容しつつ最終的に全 baseline 0 を強制。

3. **G8-P20 の段階削減 (208→20)** — 4 step pattern を更に細分化し、PR4 を 4 sub-step
   (75→67→38→28→20) で実施。28 件 useMemo を pure builder に抽出し、最終的に
   useMemo body の行数上限を 20 行 fixed で固定。

4. **generated remediation で進捗の機械可読化** — 6 ADR × 多数 step の進捗を JSON
   として生成し、project-health 経由で全体可読性を向上。drift 検出も組込。

5. **breaking change の独立 PR** — BC-6 / BC-7 は bulk 整備とは別 commit に分離し、
   ロールバック粒度を rule / allowlist 単位で確保。

「rule に時計を持たせる」という governance philosophy を 5 guard の fixed mode
として体現した本 sub-project は、umbrella plan §2 不可侵原則 #16
（governance は機械検証が前提）の模範例。
