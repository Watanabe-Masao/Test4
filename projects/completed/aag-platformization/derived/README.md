# derived/ — 派生ファイルセットのテンプレート集

> 役割: 必須セットだけでは実行可能粒度に届かない project 向けの、
> 「必要に応じて足す」派生ファイルのテンプレート集。
>
> **判断基準は `../DERIVED.md` を参照**。

---

## 一覧

| ファイル | 役割 |
|---|---|
| `pr-breakdown.md` | PR を 1〜N 段階に分解 |
| `review-checklist.md` | カテゴリ別レビュー観点 |
| `acceptance-suite.md` | Critical Path Acceptance Suite 設計 |
| `test-plan.md` | G0〜G6 ガード + L0〜L4 ロジックテスト計画 |
| `inventory/README.md` + `00-example.md` | Phase 0 棚卸しの固定先 |

---

## 使い方

1. `../DERIVED.md` の判断フローで、足すべきファイルを決める
2. 必要なファイルを project root にコピー:
   ```bash
   cp derived/pr-breakdown.md pr-breakdown.md
   ```
3. コピーしたファイルの placeholder を実値で置換する
4. 使わないファイルは `derived/` に残す（または削除）

---

## 原則

- **全部足す必要はない**。必要なものだけを足す
- **コピー先は project root**（`derived/` ではない）
- **派生ファイルは追加した時点で `HANDOFF.md` の関連文書表に行を追加する**
