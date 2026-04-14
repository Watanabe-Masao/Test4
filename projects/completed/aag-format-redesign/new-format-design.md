# new-format-design — aag-format-redesign

> 役割: Phase 2 成果物。project 文書側の新フォーマット設計。
> 必須セットと派生セットの境界、派生セットを足す判断基準、
> bootstrap チェックリストを定義する。
> AAG overlay 側の設計は `overlay-bootstrap-design.md` を参照。

---

## 1. 必須セット（現行維持、破壊変更なし）

| ファイル | 役割 | 主な読み手 | 更新頻度 |
|---|---|---|---|
| `AI_CONTEXT.md` | why (scope / read order / stable content) | 初見の AI | 低（scope 変更時のみ） |
| `HANDOFF.md` | now (現在地 / 次の作業 / ハマり) | 作業再開 AI | 高（session ごと） |
| `plan.md` | how (不可侵原則 / Phase 構造 / 禁止事項) | 作業 AI | 中 |
| `checklist.md` | what (completion 判定の機械入力) | collector / 作業 AI | 高 |
| `config/project.json` | manifest | resolver / collector | 低 |

これらは S-10 で「維持すべき核」と判定済み。本 project では **一切変更しない**。

---

## 2. 派生セット（新設）

### 2.1 派生セットの目的

必須セットだけでは **実行可能粒度** に届かない場合がある（P-02 / P-07）。
具体的には:

- 複数 PR に分解したい（作業単位の明確化）
- レビュー観点を固定化したい（品質判定の脱属人化）
- 受入条件を明示したい（完了判定の機械化）
- テスト計画を先に立てたい（実装ミスリードの防止）
- Phase 0 棚卸しの結果を 1 箇所に固定したい（認知負荷の軽減）

### 2.2 派生セット一覧（`projects/_template/derived/`）

| ファイル | 役割 | いつ足すか |
|---|---|---|
| `pr-breakdown.md` | PR を 1〜N 段階に分解 | project が複数 PR に分かれる場合 |
| `review-checklist.md` | カテゴリ別レビュー観点 | 複数分類の観点を引き継ぐ必要がある場合 |
| `acceptance-suite.md` | Critical Path Acceptance Suite 設計 | 受入条件を文書化したい場合 |
| `test-plan.md` | G0〜G6 ガード + L0〜L4 ロジックテスト計画 | テスト計画を先に立てたい場合 |
| `inventory/README.md` + `NN-<slug>.md` | Phase 0 棚卸しの固定先 | 棚卸しが大量に発生する場合 |

### 2.3 派生セットは「全部足す or 何も足さない」ではない

**必要なものだけ足す**。判断基準:

```
Q1. この project は複数 PR に分かれるか？
    Yes → pr-breakdown.md を足す
Q2. 複数カテゴリにわたるレビュー観点を引き継ぐ必要があるか？
    Yes → review-checklist.md を足す
Q3. 受入条件 / acceptance suite を機械検証したいか？
    Yes → acceptance-suite.md を足す
Q4. テスト計画を先に立ててから実装したいか？
    Yes → test-plan.md を足す
Q5. Phase 0 棚卸しの結果が 3 ファイル以上になるか？
    Yes → inventory/ を足す
```

**小さな fix（`quick-fixes`）は派生セットを絶対に使わない**。

---

## 3. ディレクトリ構造（新フォーマット）

```
projects/<project-id>/
├── AI_CONTEXT.md              # 必須
├── HANDOFF.md                 # 必須
├── plan.md                    # 必須
├── checklist.md               # 必須
├── config/
│   └── project.json           # 必須
├── aag/                       # 必須（executionOverlayGuard 対応 — 後述）
│   └── execution-overlay.ts
├── DERIVED.md                 # 派生セットを使う場合のみ
├── pr-breakdown.md            # 派生（必要時のみ）
├── review-checklist.md        # 派生（必要時のみ）
├── acceptance-suite.md        # 派生（必要時のみ）
├── test-plan.md               # 派生（必要時のみ）
└── inventory/                 # 派生（必要時のみ）
    ├── README.md
    └── NN-<slug>.md
```

### 3.1 配置方針

- 派生セットはすべて **project root 直下** に配置（`derived/` サブディレクトリを
  作らない）
  - 理由: 既存 project（`unify-period-analysis`）が既に root 直下に配置しており、
    互換性を壊さない
- `_template/derived/` 以下のテンプレートファイルは、新 project が
  **コピー時に選択して root に移動**する
- テンプレート選択の判断基準は `_template/DERIVED.md` に集約

---

## 4. `_template/` 拡張方針

### 4.1 現行（無変更）

```
projects/_template/
├── AI_CONTEXT.md
├── HANDOFF.md
├── plan.md
├── checklist.md
└── config/
    └── project.json
```

### 4.2 新フォーマット（additive）

```
projects/_template/
├── AI_CONTEXT.md              # 既存、無変更
├── HANDOFF.md                 # 既存、無変更
├── plan.md                    # 既存、無変更
├── checklist.md               # 既存、無変更
├── config/
│   └── project.json           # 既存、無変更
├── aag/                       # 新設
│   └── execution-overlay.ts   # 空 overlay（defaults で動く）
├── DERIVED.md                 # 新設（派生セットの説明）
└── derived/                   # 新設（派生テンプレート集）
    ├── README.md
    ├── pr-breakdown.md
    ├── review-checklist.md
    ├── acceptance-suite.md
    ├── test-plan.md
    └── inventory/
        ├── README.md
        └── 00-example.md
```

**既存ファイルは 1 行も変更しない**。

---

## 5. bootstrap チェックリスト（新設）

`references/03-guides/new-project-bootstrap-guide.md` に以下のチェックリストを
配置する。

```markdown
## bootstrap チェックリスト

### A. 必須セット
* [ ] `cp -r projects/_template projects/<id>` でコピー
* [ ] `config/project.json` の `<PROJECT-ID>` / `<TITLE>` を置換
* [ ] `AI_CONTEXT.md` / `HANDOFF.md` / `plan.md` / `checklist.md` のプレースホルダを置換
* [ ] 各ファイル冒頭の「テンプレートの使い方」コメントブロックを削除

### B. 派生セット判定
* [ ] `DERIVED.md` の判断基準を読み、必要なファイルを決める
* [ ] 必要な派生ファイルを `derived/` から project root にコピー
* [ ] 不要な派生ファイルは `derived/` に残す（または削除）

### C. AAG overlay
* [ ] `aag/execution-overlay.ts` が空の `EXECUTION_OVERLAY = {}` であることを確認
  - defaults で全 rule がカバーされる（`architectureRules/defaults.ts`）
  - 案件固有の override が必要なルールだけを明示的に書く

### D. 切替
* [ ] `CURRENT_PROJECT.md` の `active: ` を新 project id に書き換える
* [ ] `cd app && npm run verify:project` が PASS することを確認

### E. 検証順序
* [ ] `cd app && npm run test:guards` が PASS
* [ ] `cd app && npm run docs:generate`（1 回目）
* [ ] `cd app && npm run docs:check`（1 回目、stale が出たら 2 回目を叩く）
* [ ] `cd app && npm run lint` が PASS
* [ ] `cd app && npm run build` が PASS

### F. 索引更新
* [ ] `references/02-status/open-issues.md` の active projects 表に行を追加
```

---

## 6. 互換性保証

| 観点 | 保証 |
|---|---|
| 既存 5 project の動作 | 変更なし。既存 `aag/execution-overlay.ts` はそのまま動く |
| 既存 collector | `parent?: string` は optional、既存 project は undefined |
| 既存 guard | 既存 guard 全 PASS（新 guard は additive） |
| 既存 `_template/` | 1 ファイルも変更しない。新ファイル / 新ディレクトリのみ追加 |
| 既存 bootstrap 手順 | §10 はそのまま valid。`new-project-bootstrap-guide.md` は §10 を補完 |

---

## 7. 非スコープ

- 既存 project の新フォーマットへの **移行実行**（移行ガイドのみ作成、実行は別タスク）
- `_template/` の既存ファイル内容の見直し
- `AI_CONTEXT.md` / `HANDOFF.md` の section 構造の変更
- `checklist.md` の format 変更（`* [ ]` / `* [x]` の規約は無変更）
