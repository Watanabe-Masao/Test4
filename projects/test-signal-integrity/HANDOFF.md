# HANDOFF — test-signal-integrity

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

bootstrap 直後（2026-04-13）。Phase 1〜5 の required checkbox はすべて未着手。
plan.md と checklist.md は確定し、AAG Core 側の改善 project として独立した
スコープを持っている。`presentation-quality-hardening` の coverage 70 引き上げ
（Phase 3）の **前提条件** として位置づけられている。

既存 AAG 実装との接続点は plan.md「既存 AAG 実装との接続」セクションに整理済み。
特に既存 G3 ガード（`codePatternGuard.test.ts` の `AR-G3-SUPPRESS`）は TSIG-COMP-01/02
と検出範囲が重なるため、新規ガードを並列に立てず **G3 を rationale enforcement に
拡張する** 方針が確定している。

## 2. 次にやること

詳細は `checklist.md` を参照。優先順位を Phase 順に整理する。

### 高優先（Phase 1）

- Signal Integrity の思想を `references/01-principles/test-signal-integrity.md` に
  正本化する。protected harm（H1〜H4）を定義し、品質劣化テストパターン /
  compiler silencing パターンを bad/good example 付きで列挙する
- 「機械的に検知できるもの」と「advisory / review に留めるもの」の境界を先に書く
- 許容例外（smoke test / migration 中の一時 suppression / 公開契約の存在確認）を
  先に書く
- 固定レスポンスの必須項目を定義する

### 中優先（Phase 2）

- 新規 test 追加時の advisory 文面と trigger 対象パスを定義する
- advisory 自己点検項目（existence-only / render-only / snapshot-only / suppression 依存）を整理する
- advisory → hard gate 昇格条件と false positive 発生時の扱いを定義する

### 中優先（Phase 3）— 実装

> **Phase 3 着手の最初は baseline 採取**。これを skip して hard gate を投入すると
> 既存違反まで全部 fail して導入不能・なんとなく allowlist が増えて制度が緩む・
> ratchet が効かないという失敗パターンに陥る（§3.6 / checklist L35 / plan.md
> 「Discovery / Baseline 採取」参照）。

1. **最初に**: TSIG-TEST-01〜03 / TSIG-COMP-01〜03 の現状件数と代表ファイルパスを
   採取し、ratchet-down baseline を決定する
2. G3 allowlist を `app/src/test/allowlists/signalIntegrity.ts` に切り出し、
   `reason` / `removalCondition` を必須化する（TSIG-COMP-01/02 の前提作業）
3. TSIG-TEST-01 (existence-only assertion) の guard 実装
4. AR-G3-SUPPRESS の rationale 拡張サブルール（TSIG-COMP-01/02 を統合）
5. TSIG-COMP-03 (unused suppress escape) の guard 実装
6. 各 guard が `renderAagResponse()` 経由で固定フォーマットを返すこと

### 低優先（Phase 4-5）

- guide / guard-test-map / doc-registry の整備
- 運用着地確認と application-side（`presentation-quality-hardening`）への前提条件 cross-link

## 3. ハマりポイント

### 3.1. 既存 G3 ガードと並列に同じ検出を作らない

既存の `app/src/test/guards/codePatternGuard.test.ts` L359-405 にある
`AR-G3-SUPPRESS` ガードはすでに `eslint-disable` / `@ts-ignore` /
`@ts-expect-error` を **検出している**（baseline 0 / allowlist ≤ 2）。

TSIG-COMP-01/02 をゼロから新規ガードとして書くと、同じパターンを 2 回
検出することになり、二重カウント / drift / メンテナンス負債を生む。
**正解は AR-G3-SUPPRESS の subordinate rule（AR-G3-SUPPRESS-RATIONALE 等）として
rationale 必須化を追加すること**。allowlist エントリに `reason` /
`removalCondition` を必須化することで「黙らせる手段」を構造化された
rationale enforcement に格上げする。

### 3.2. 「検知できないもの」を hard gate 化しない

意味論依存のパターン（TSIG-ADV-01〜04）を hard gate 化したくなる誘惑が常に
ある。実害が出ていないのに hard fail を入れると false positive で実装者の
信頼を失い、AAG 全体の権威が落ちる。**advisory / review / Discovery Review
への逃がし先を維持することが project 成功の前提**。

### 3.3. 既存 G3 allowlist は inline。構造化を先に行う

現在 `codePatternGuard.test.ts` の G3_ALLOWLIST は inline 定義 + human readable
コメントで管理されており、machine-parseable な rationale フィールドを持たない。
Phase 3 で rationale enforcement を追加する **前** に、G3_ALLOWLIST を
`app/src/test/allowlists/signalIntegrity.ts`（新規）に切り出して
`AllowlistEntry` 型に `reason` / `removalCondition` を必須化する。
順序を逆にすると既存エントリが新スキーマと整合せず、guard が壊れる。

### 3.4. coverage 数値目標を本 project が触らない

`vitest.config.ts` の `lines: 55` を 70 に上げる作業は **明示的に
`presentation-quality-hardening` の所掌**。本 project が触ると、
- 「signal integrity が coverage 数値目標に従属している」という誤解を生む
- application-side project の意思決定動線を侵食する
- Scope を超える

文書上で「数値目標は application-side / signal integrity は AAG-side」と
分離することは Phase 5 の必須項目になっている。

### 3.5. doc-registry.json への登録漏れに注意

第 9 原則「ドキュメント自体が品質管理対象」(AAG v4.3) により、
`references/01-principles/` / `references/03-guides/` に新規文書を
追加するときは **同コミット内で `references/03-guides/doc-registry.json`
にも登録** する必要がある。obligation collector が pre-commit hook から
未登録を検出して block するため、Phase 1 / Phase 4 で文書を作るたびに
忘れず registry を更新する。

### 3.6. 推奨される補助作業: Phase 3 着手前の Discovery

required checkbox には含まれていないが、Phase 3 の guard 実装に着手する前に
**現 repo の TSIG-TEST-01〜03 / TSIG-COMP-01〜03 violation 数を採取しておく**
ことを強く推奨する。「いきなり block」を避け ratchet-down baseline を
正しく設定するための実装上の知恵。詳細は `plan.md` の「推奨される補助作業」
セクションを参照。

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| `projects/test-signal-integrity/AI_CONTEXT.md` | project 意味空間の入口 |
| `projects/test-signal-integrity/plan.md` | 不可侵原則 / Phase 構造 / 既存 AAG 実装との接続 |
| `projects/test-signal-integrity/checklist.md` | required checkbox（completion 判定の唯一の入力） |
| `app/src/test/guards/codePatternGuard.test.ts` | 既存 G3 ガード — TSIG-COMP-01/02 拡張先 |
| `app-domain/gross-profit/rule-catalog/base-rules.ts` | rule catalog 物理正本 — TSIG-* rule 追加先 |
| `app/src/test/architectureRules/helpers.ts` / `tools/architecture-health/src/aag-response.ts` | `renderAagResponse()` 2 ソース |
| `app/src/test/migrationTagRegistry.ts` | 段階的 rollout 管理 |
| `references/03-guides/architecture-rule-system.md` | rule 追加方法の正本 |
| `references/03-guides/project-checklist-governance.md` | project ライフサイクル規約（AAG Layer 4A） |
| `projects/presentation-quality-hardening/checklist.md` | Phase 5 で前提行を追記する application-side checklist |
| `projects/presentation-quality-hardening/HANDOFF.md` | **観測戦略の正本** — 本 project の hard gate / advisory が機能するかを実 test 追加作業で検証する |

## 5. 観測期間ログ

> 役割: `projects/presentation-quality-hardening` Phase 3 (coverage 70 達成のための
> test 追加) 作業を本 project の **観測期間** とし、hard gate / advisory が
> 実際の test 追加作業で機能するかを記録する。
>
> 観測戦略の詳細: `projects/presentation-quality-hardening/HANDOFF.md` §2

### 5.1. 観測の目的

1. Hard gate (TSIG-TEST-01 / AR-G3-SUPPRESS-RATIONALE / TSIG-COMP-03) が
   実際に bad pattern を止めるか確認
2. Advisory (`check_test_signal_advisory`) が新規 test 追加時に出るか確認
3. 機械検出可能なのに既存ルールでカバーされていない新規アンチパターンを発見
4. False positive が頻発しないことを確認 (advisory ガイド §5: < 5%)

### 5.2. 記録様式

```markdown
### YYYY-MM-DD HH:MM — <作業内容>

**試した bad pattern**: <パターン名 / コード片>
**期待される検出**: <ルール ID / なし>
**実際の挙動**: <hard gate で止まった / advisory が出た / 何も起きなかった>
**ルール側のアクション**: <そのまま / 検出ロジック改善 / 新規ルール候補 / Discovery Review>
```

### 5.3. ログ (時系列)

> 観測期間開始: 2026-04-13 (presentation-quality-hardening Phase 3 着手と同時)
>
> 終了判定:
> - false positive < 5%
> - 観測期間 ≥ 2 週間
> - Discovery Review 承認
>
> 終了後: 本 project の最終レビュー checkbox を [x] → §6.2 archive プロセス

_(まだ観測ログなし。Phase 3 作業開始時に追記する)_

### 5.4. 終了条件達成時のアクション

1. checklist.md 末尾の「最終レビュー (人間承認)」 checkbox を [x] にする
2. `references/03-guides/project-checklist-governance.md` §6.2 の archive
   プロセス (8 step) を 1 commit で実行
3. 同じ commit で `projects/presentation-quality-hardening` の archive 判断も
   行う (両 project は観測戦略で連動しているため)
