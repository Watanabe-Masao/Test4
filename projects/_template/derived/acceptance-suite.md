# acceptance-suite — <PROJECT-ID>

> 役割: Critical Path Acceptance Suite を設計する。
> 「この test セットが通れば完了」を機械化するための受入条件の定義。
>
> いつ使うか: 受入条件を機械検証したいとき。
> 判断基準: `DERIVED.md` §Q3。

---

## 概要

<本 project の critical path を 1 段落で説明>

## Acceptance Tests

### AT-01: <タイトル>

- **目的**: <何を検証するか>
- **前提**: <fixture / 初期状態>
- **実行**: <実行コマンド or 操作>
- **期待**: <観測可能な状態 / 値>
- **失敗時の影響**: <critical / major / minor>
- **実装場所**: `app/src/test/...`

### AT-02: <...>

...

---

## Coverage Matrix

| 受入条件 | ガード | ロジック test | E2E |
|---|---|---|---|
| AT-01 | `guards/xxx.test.ts` | `domain/xxx.test.ts` | `e2e/xxx.spec.ts` |
| AT-02 | — | `application/yyy.test.ts` | — |

## 実行方法

```bash
cd app && npx vitest run <path> # 単体
cd app && npm run test:guards   # guard のみ
cd app && npm run test:e2e      # E2E
```

## 完了判定

- 全 AT-* が PASS
- カバレッジが <規定%> 以上
- 関連 KPI（`architecture-health.json`）が `status: ok`
