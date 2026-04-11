# AAG 5.0.0 — 4層構造定義

> AAG を作り直すのではなく、品質OSとして骨格整理する。

## 前提

- AAG は品質OS。本体は粗利管理ツール
- 正本を増やさない
- 導出可能なものは導出する
- 思想 / 型 / 検査 / 運用を混ぜない

## 4層定義

### Layer 1: Constitution（憲法層）

> **「何を守るか、なぜ守るか」の正本**

ほとんど変えない層。変更には人間の明示的承認が必要。

**責務:** 不可侵原則、用語定義、意味分類体系、設計思想の固定

**含むもの:**
- 設計原則（A〜I + Q カテゴリ、50 タグ）
- 意味分類ポリシー（semanticClass / authorityKind / runtimeStatus）
- current / candidate 分離原則
- Promote Ceremony 原則（人間承認必須）
- エンジン境界ポリシー（Authoritative / Application / Exploration）
- 正本化原則（canonicalization-principles）
- 業務値定義書（sales / discount / customer / gross-profit 等 13 定義）
- 数学的不変条件（Shapley 恒等式、D1-D3）

**変更条件:** 「別の仕組みで防がれるようになった」場合のみ変更可。
「邪魔だから」は理由にならない。

---

### Layer 2: Schema（スキーマ層）

> **「何が存在するか」の正本**

全ての型契約、レジストリ、メタデータ構造がここに属する。
データの形を定義する層であり、検出ロジックは持たない。

**責務:** 型定義、レジストリ、契約、violation 構造、evidence 構造

**含むもの:**
- `calculationCanonRegistry.ts` — Master Registry（唯一の正本）
- `architectureRules.ts` — ルール定義（140 ルール、検出定義を含む）
- `guardTagRegistry.ts` — ガードタグ定義
- `responsibilityTagRegistry.ts` — 責務タグ定義
- `migrationTagRegistry.ts` — 移行タグ定義
- `allowlists/types.ts` — AllowlistEntry 型定義
- `docs/contracts/principles.json` — 原則メタデータ
- `docs/contracts/doc-registry.json` — 文書レジストリ
- `docs/contracts/project-metadata.json` — プロジェクトメタデータ
- Contract テンプレート（BIZ-001〜013 / ANA-001〜009）

**今後追加すべきスキーマ（Phase A2）:**
- `Violation` スキーマ
- `EvidencePack` スキーマ
- `PromoteRecord` スキーマ
- `RetirementRecord` スキーマ
- `GuardMetadata` スキーマ

---

### Layer 3: Execution（実行層）

> **「どう検出するか」の層**

ガードテスト、derived view 生成、health 収集・評価がここに属する。
Schema 層が定義した型を使って、Constitution 層の原則を機械的に検証する。

**責務:** 違反検出、ratchet 管理、health KPI 収集、自動導出

**含むもの:**
- `app/src/test/guards/` — 48 ガードテスト
- `app/src/test/semanticViews.ts` — Derived View 生成（master → 自動導出）
- `app/src/test/allowlists/*.ts` — 例外管理（types.ts 以外）
- `tools/architecture-health/` — Health 収集・評価・レンダリング
- `tools/git-hooks/` — pre-commit / pre-push
- `tools/aag-render-cli.ts` — AAG Response CLI
- `app/src/test/observation/` — WASM 観測テスト
- `app/src/test/audits/` — アーキテクチャ監査
- `references/02-status/generated/` — 生成済みレポート（派生物）

**原則:**
- Constitution 層の原則を「通過条件」にする層
- 派生物は手編集禁止
- ルール追加時は Schema 層のカテゴリ上の居場所を先に決める

---

### Layer 4: Operations（運用層）

> **「どう使うか」の層**

人間と AI が触る手順書、計画書、チェックリスト。
コード truth の後追いであり、先走らない。

**責務:** 引き継ぎ、移行計画、昇格手順、退役手順、進行管理

**含むもの:**
- `HANDOFF.md` — 起点文書
- `plan.md` — 全体計画と原則
- `plan-checklist.md` — 進行管理の正本
- `references/03-guides/tier1-business-migration-plan.md` — BIZ 移行計画
- `references/03-guides/analytic-kernel-migration-plan.md` — ANA 移行計画
- `references/03-guides/promote-ceremony-template.md` — 昇格手順
- `references/03-guides/guard-consolidation-and-js-retirement.md` — Guard マップ + JS 縮退
- `references/03-guides/data-load-idempotency-plan.md` — データロード冪等化
- `references/02-status/promotion-readiness-*.md` — 昇格判定表（11 件）
- `references/02-status/recent-changes.md` — 変更履歴
- `references/02-status/technical-debt-roadmap.md` — 技術的負債ロードマップ

**原則:**
- progress truth は `plan-checklist.md` の1箇所のみ
- 文書がコード truth より先走ったままにしない
- 人間承認が必要な箇所を明示する

---

## 非目的

AAG 5.0.0 で**やらないこと**:

1. 既存 guard の全面削除
2. 物理ディレクトリ大移動
3. 本体ロジックの意味変更
4. ルール追加で問題解決（まず骨格、次に不足ルール）
5. 文書テンプレートと schema の食い違い放置
6. AAG の責務拡張（責務分離のための見直し）

---

## 層間の依存ルール

```
Constitution（変わりにくい）
    ↓ 参照
Schema（型を定義）
    ↓ 使用
Execution（検出する）
    ↓ 後追い
Operations（使う）
```

- 上位層は下位層に依存しない
- Execution は Schema の型定義に依存する
- Operations はコード truth（Execution の結果）に後追いする
- Constitution を変更する場合は Schema / Execution / Operations を連鎖更新する
