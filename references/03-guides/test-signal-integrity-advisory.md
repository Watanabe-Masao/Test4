# Test Signal Integrity Advisory — 運用ガイド

> **AAG Layer 3-4: Detection / Response（advisory レーン）**
>
> 役割: Test Signal Integrity 原則のうち、**hard gate にしないグレー領域** を
> 扱う advisory レーンの運用手順を定義する。trigger / 文面 / 自己点検項目 /
> 昇格条件 / 例外運用を 1 ファイルに集約する。
>
> 上位原則: [`references/01-principles/test-signal-integrity.md`](../01-principles/test-signal-integrity.md)
>
> 実装コンポーネント:
> - 新規 test ファイル検知（diff scan / pre-commit hook）
> - advisory 文面テンプレート（renderAagResponse）
> - allowlist `app/src/test/allowlists/signalIntegrity.ts`
> - guard `app/src/test/guards/testSignalIntegrityGuard.test.ts`（Phase 3 で作成）

## 0. なぜ advisory が必要か

Test Signal Integrity 原則は「**機械的に検知できるもの**」と「**機械的には
断定できないが注意喚起すべきもの**」を分けて扱う。後者を hard gate 化すると
false positive で実装者の信頼を失うため、以下の 2 系統で運用する。

| レーン | 対象 | 結果 | 目的 |
|---|---|---|---|
| **Hard Gate** | TSIG-TEST-01 / TSIG-COMP-01〜03 等の構造的検知可能パターン | `fixNow=now` で push を止める | False Green を機械的に防ぐ |
| **Advisory** | TSIG-ADV-01〜04 等の意味論依存パターン + 新規 test 追加時の自己点検 | `fixNow=review` で warning のみ | 作成者（人間/AI）に再点検させる |

Advisory は **止めない** が、AI が自己点検できる形に文面を提供する。

## 1. Trigger — どの diff で advisory を出すか

新規 test / spec / e2e ファイルが diff に含まれる場合、advisory を返す。

### Trigger globs

| Glob | 対象 |
|---|---|
| `app/src/**/*.test.ts` | 単体テスト (TS) |
| `app/src/**/*.test.tsx` | 単体テスト (TSX / React) |
| `app/src/**/*.spec.ts` | spec 形式テスト (TS) |
| `app/src/**/*.spec.tsx` | spec 形式テスト (TSX) |
| `app/src/**/__tests__/**/*.ts` | __tests__ 配下 |
| `app/src/**/__tests__/**/*.tsx` | __tests__ 配下 |
| `app/e2e/**/*.spec.ts` | Playwright E2E |

### Trigger 条件

- **新規ファイル**: diff に `A` (added) として含まれる
- **既存ファイル変更**: diff に `M` (modified) として含まれる場合は `+ ` 行に
  `expect(` または `it(` または `test(` を含むときのみ advisory を出す（無関係
  な refactor で毎回出さない）

### 実装場所

| 段階 | 場所 |
|---|---|
| **Phase 2 (本ガイド)** | trigger / 文面 / 条件を文書化 |
| **Phase 3** | `tools/git-hooks/pre-push` に検出ロジックを追加（既存の `add_warn` 経由）|
| **Phase 3 + α** | `tools/architecture-health/src/collectors/test-signal-collector.ts` で health KPI 化（オプション） |

## 2. Advisory 文面テンプレート

`renderAagResponse({ fixNow: 'review', slice: 'governance-ops', ... })` 経由で
固定フォーマットを返す。

### Template: 新規 test 追加時の自己点検 advisory

```
[AAG][TSIG-ADVISORY][fixNow=review][governance-ops]
new test file detected — please self-check signal integrity

Detected
- 新規テストファイル: app/src/foo/bar.test.ts (added)
- 新規 expect/it: 12 行追加

Why this advisory exists
- coverage を上げるためだけの無価値テストが混入すると、Green が見かけだけに
  なり H1 (False Green) と H2 (Review Misleading) を生む
- 機械的に hard gate 化できないが、作成者本人の自己点検で防げる

Self-check (作成者が自分で確認してください)
- [ ] existence-only assertion (toBeDefined() のみ) で終わっていないか
- [ ] render / import 成功だけで満足していないか
- [ ] snapshot だけで主要挙動を済ませていないか
- [ ] 出力・契約・副作用・分岐のいずれかを検証しているか
- [ ] suppress (eslint-disable / @ts-ignore) に依存していないか
- [ ] mock call count だけで満足し、本来の観測対象を mock で置き換えていないか

Protected harm
- H1 False Green
- H2 Review Misleading

How to act
- 該当する self-check 項目があれば、push 前にテスト本体を見直す
- 例外に該当する場合は references/01-principles/test-signal-integrity.md
  の EX-01〜EX-03 を参照
- 不明確な場合は Discovery Review に持ち込む
  (references/03-guides/discovery-review-checklist.md)

このアドバイザリは push を止めません。push 後の CI も止めません。
ただし、レビュアーや未来の自分のために自己点検してください。
```

### Template: グレーな品質劣化パターン検知（TSIG-ADV-*）

```
[AAG][TSIG-ADV-01][fixNow=review][governance-ops]
assertion present but may not validate behavior

Detected
- foo.test.ts:42 — assertion 数 5 件、ただし出力契約を直接検証していない可能性

Why this advisory exists
- assertion 数だけでは品質を保証できない
- 内部実装の中間状態を覗いているだけで、出力契約を検証していない可能性

Protected harm
- H1 False Green (potential)
- H4 Governance Drift (potential)

Self-check
- このテストが失敗するのは、対象関数が「正しい出力を返さなくなった時」か？
  それとも「内部実装が変わった時」か？
- 後者なら、より外側の契約を検証する形に書き換えられないか？

このアドバイザリは push を止めません。Discovery Review 候補です。
```

## 3. Self-check 項目（advisory 内に含めるもの）

新規 test 追加時の advisory に必ず含める自己点検項目:

| 項目 | 対応する Protected Harm | 機械検知の可否 |
|---|---|---|
| existence-only assertion (`toBeDefined` のみ) | H1, H2 | ✅ (TSIG-TEST-01 で hard gate 化) |
| render-only / import-only smoke | H1, H2 | ⚠ 部分的 (TSIG-TEST-02 で限定的に hard gate) |
| snapshot-only superficial | H1, H3 | ✅ (TSIG-TEST-03 で hard gate 化) |
| suppression (`eslint-disable` / `@ts-ignore`) 依存 | H1, H3 | ✅ (AR-G3-SUPPRESS-RATIONALE で hard gate 化) |
| mock 過剰依存 (TSIG-ADV-02) | H3 | ❌ advisory のみ |
| brittle test (TSIG-ADV-03) | H3 | ❌ advisory のみ |
| 異常系 / 境界条件欠落 (TSIG-ADV-04) | H3, H4 | ❌ advisory のみ |
| 出力・契約・副作用のいずれかを検証しているか | H1, H2 | ❌ advisory のみ |

## 4. Review-only patterns（advisory に留めるパターン）

以下は機械的に断定できないため hard gate 化しない。**advisory + Discovery
Review** で扱う。

### TSIG-ADV-01: assertion はあるが本質を検証していない

assertion 数は多いが、契約・出力・副作用のどれも見ていないケース。

**判定例:** すべての assertion が「中間 state の存在確認」のみで、関数の出力
契約を検証する `expect(result).toBe(...)` が存在しない。

### TSIG-ADV-02: mock 過剰依存

mock call count は見ているが、本来の観測対象が置き換わっているケース。

**判定例:** `expect(mockFn).toHaveBeenCalledWith(...)` のみで、対象関数の
実際の出力（戻り値 / 副作用）を検証していない。

### TSIG-ADV-03: brittle test

内部実装詳細に強く依存し、リファクタリング耐性が低いテスト。

**判定例:** private helper を直接 mock している、内部 state 変数を直接
読み書きしている、`toMatchObject({ _internal: ... })` 形式で内部 state を
固定している。

### TSIG-ADV-04: 境界条件・異常系欠落

一見まともだが、見るべき異常系・境界条件が抜けているテスト。

**判定例:** happy path のみで empty / null / 上限 / 下限 / 異常入力の
いずれもない。

## 5. Advisory → Hard Gate 昇格条件

advisory として観測しているパターンを、いつ hard gate に昇格させるか。

### 昇格条件（すべて満たす必要がある）

1. **構造的検知の精度**: false positive 率が **5% 未満** に下がっている
   （baseline 採取で確認）
2. **修正コストの定量化**: 修正の自動化または半自動化（fix hint）が可能
3. **観測期間**: advisory として最低 **2 週間** 運用し、誤検知パターンが
   出尽くしている
4. **Protected Harm の明確化**: 該当 Protected Harm が H1〜H4 のどれかに
   明示的に紐付いている
5. **Discovery Review 経由**: 昇格提案が Discovery Review で承認されている

### 昇格手順

1. advisory ログを集計し、誤検知件数 / 真の違反件数を採取
2. `app-domain/gross-profit/rule-catalog/base-rules.ts` に新規 rule を追加
   または既存 rule の `maturity` を `experimental` → `stable` に昇格
3. 対応する guard を `app/src/test/guards/` に追加または拡張
4. allowlist がある場合は `signalIntegrity.ts` に登録（reason / removalCondition 必須）
5. ratchet-down baseline を設定（既存違反は許容、新規追加は block）
6. `references/03-guides/architecture-rule-system.md` の手順に従い登録

## 6. False Positive 発生時の扱い

advisory / hard gate どちらでも、false positive が出た場合の扱いを定義する。

### 即時対応

1. **hard gate の場合**: push が止まる。ローカルで以下のいずれか:
   - 該当箇所が許容例外に該当 → `signalIntegrity.ts` allowlist に登録
     （`reason` / `removalCondition` 必須）
   - 該当箇所が真の違反 → 修正
   - 該当箇所が誤検知 → rule の `detection` 精度を改善（短期暫定として
     allowlist 追加 + `removalCondition: rule detection improved` を記録）

2. **advisory の場合**: push は止まらない。ただし以下を行う:
   - 自己点検が「該当しない」と判断できるなら、そのまま push
   - 自己点検が「該当する」なら修正
   - 誤検知の場合、`projects/completed/test-signal-integrity` の HANDOFF §3 に該当
     パターンを記録（蓄積データ）

### 中期改善

1. 同じ false positive が **2 回以上** 出たら rule の検出ロジックを修正
2. 修正できないパターンは **review-only** に格下げを検討
3. allowlist が **20 件以上** 溜まったら、ルール自体の有効性を再評価

### 改善トリガー

| トリガー | 対応 |
|---|---|
| false positive 1 件発生 | 個別対応（allowlist or 修正） |
| false positive 2 件以上の同パターン | rule 検出ロジック改善 |
| allowlist 20 件超過 | ルール有効性の Discovery Review |
| true positive 0 件が 1 ヶ月続く | rule の sunset を検討 |

## 7. 関連実装の場所（Phase 3 以降の実装計画）

| 機能 | 場所 | Phase |
|---|---|---|
| 新規 test 検知 | `tools/git-hooks/pre-push` の `check_test_signal_advisory()` | Phase 3 |
| advisory 文面生成 | `tools/aag-render-cli.ts` の advisory mode | Phase 3 |
| TSIG-TEST-01 hard gate | `app/src/test/guards/testSignalIntegrityGuard.test.ts` | Phase 3 |
| AR-G3-SUPPRESS-RATIONALE | `app/src/test/guards/codePatternGuard.test.ts` 拡張 | Phase 3 |
| Allowlist | `app/src/test/allowlists/signalIntegrity.ts` | Phase 3 |
| Rule 登録 | `app-domain/gross-profit/rule-catalog/base-rules.ts` | Phase 3 |
| Health KPI | `tools/architecture-health/src/collectors/test-signal-collector.ts`（任意） | Phase 4 |

## 8. 関連文書

- [`references/01-principles/test-signal-integrity.md`](../01-principles/test-signal-integrity.md) — 上位原則（Protected Harm / Detection Boundary / Allowed Exceptions）
- [`references/03-guides/discovery-review-checklist.md`](./discovery-review-checklist.md) — グレーパターンの逃がし先
- [`references/03-guides/architecture-rule-system.md`](./architecture-rule-system.md) — Architecture Rule の運用手順
- [`references/03-guides/coding-conventions.md`](./coding-conventions.md) — TypeScript / lint 規約
- [`projects/completed/test-signal-integrity/plan.md`](../../projects/completed/test-signal-integrity/plan.md) — 実装計画と Phase 構造
- [`projects/completed/test-signal-integrity/checklist.md`](../../projects/completed/test-signal-integrity/checklist.md) — required checkbox 集合
