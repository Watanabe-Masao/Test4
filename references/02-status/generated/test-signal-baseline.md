# Test Signal Integrity — Phase 3 Baseline

> **生成元:** `tools/scripts/test-signal-baseline.ts`
> **目的:** Phase 3 hard gate 投入前の現状件数採取と ratchet-down baseline 決定
> **読み方:** 各 ruleId の現在件数 = ratchet-down の起点。新規追加が 0 に向かうように guard を投入する。

> 生成: 2026-04-13T05:40:24.489Z

## サマリ

| ruleId | label | 件数 | 取扱 |
|---|---|---|---|
| `TSIG-TEST-01` | existence-only assertion | **0** | ✅ baseline 0 (新規も block) |
| `TSIG-TEST-02` | render-only / mount-only smoke | **0** | ✅ baseline 0 (新規も block) |
| `TSIG-TEST-03` | snapshot-only superficial | **0** | ✅ baseline 0 (新規も block) |
| `TSIG-COMP-01` | rationale-free @ts-ignore / @ts-expect-error | **2** | ⚠ ratchet-down baseline = 2 |
| `TSIG-COMP-02` | rationale-free eslint-disable | **6** | ⚠ ratchet-down baseline = 6 |
| `TSIG-COMP-03` | unused suppress escape (multi-underscore) | **0** | ✅ baseline 0 (新規も block) |

## 詳細

### TSIG-TEST-01: existence-only assertion

走査対象ファイル数: 357
検出件数: **0**

検出 0 件。hard gate を baseline 0 で投入可能。

### TSIG-TEST-02: render-only / mount-only smoke

走査対象ファイル数: 357
検出件数: **0**

検出 0 件。hard gate を baseline 0 で投入可能。

### TSIG-TEST-03: snapshot-only superficial

走査対象ファイル数: 357
検出件数: **0**

検出 0 件。hard gate を baseline 0 で投入可能。

### TSIG-COMP-01: rationale-free @ts-ignore / @ts-expect-error

走査対象ファイル数: 1786
検出件数: **2**

代表ファイル（最大 10 件）:

```
app/src/test/tools/resolveProjectOverlayScript.test.ts:18  // @ts-ignore — plain JS module without declaration file
app/src/presentation/components/common/FileDropZone.tsx:161  // @ts-expect-error webkitdirectory is a non-standard attribute
```

### TSIG-COMP-02: rationale-free eslint-disable

走査対象ファイル数: 1786
検出件数: **6**

代表ファイル（最大 10 件）:

```
app/src/test/tools/resolveProjectOverlayScript.test.ts:17  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
app/src/test/observation/bridgeTestHelpers.ts:17  // eslint-disable-next-line @typescript-eslint/no-explicit-any
app/src/presentation/components/charts/EChart.tsx:234  }, [themeName]) // eslint-disable-line react-hooks/exhaustive-deps
app/src/infrastructure/duckdb/__tests__/engineAdditional.test.ts:14  // eslint-disable-next-line @typescript-eslint/no-unused-vars
app/src/infrastructure/duckdb/__tests__/engineAdditional.test.ts:63  // eslint-disable-next-line @typescript-eslint/no-unused-vars
app/src/infrastructure/duckdb/__tests__/workerClient.test.ts:33  // eslint-disable-next-line @typescript-eslint/no-this-alias
```

### TSIG-COMP-03: unused suppress escape (multi-underscore)

走査対象ファイル数: 1786
検出件数: **0**

検出 0 件。hard gate を baseline 0 で投入可能。

## 次のアクション (Phase 3 残作業)

1. ✅ baseline 採取 (本ファイル生成) — 完了
2. G3 allowlist を `app/src/test/allowlists/signalIntegrity.ts` に切り出し
3. TSIG-TEST-01 (existence-only) hard gate を実装 + ratchet-down baseline 設定
4. AR-G3-SUPPRESS rationale enforcement 拡張 (TSIG-COMP-01/02 統合)
5. TSIG-COMP-03 (multi-underscore) 新規 hard gate 実装
6. 各 guard を `renderAagResponse()` 経由の固定フォーマットに接続
