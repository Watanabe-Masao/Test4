# 凍結リスト

凍結とは「解消済み」ではなく、「現状を固定し、これ以上増やさない」運用を指す。

凍結対象は以下の 3 種に分かれる。

1. **ゼロ維持凍結** — 今は 0 件。再追加したら fail
2. **件数上限凍結** — 今ある件数を上限として固定。増加したら fail
3. **残存許可凍結** — 既知の互換コードだけ残す。新規追加は禁止

凍結対象に新規追加が必要な場合は、構造改善で代替できない理由を明示し、レビュー承認を必須とする。

---

## 1. ゼロ維持の凍結リスト

現在 0 件で、再追加を禁止する凍結リスト。

| リスト名 | 現在値 | 凍結ルール | 意味 |
|---------|--------|----------|------|
| presentationToInfrastructure | 0 | 再追加禁止 | Presentation → Infrastructure 直接依存を戻さない |
| infrastructureToApplication | 0 | 再追加禁止 | Infrastructure → Application 逆流を戻さない |
| presentationDuckdbHook | 0 | 再追加禁止 | Presentation で DuckDB hook 直結を戻さない |
| largeComponentTier2 | 0 | 再追加禁止 | 大型 component の再肥大化を許さない |
| cmpPrevYearDaily | 0 | 再追加禁止 | 旧比較アクセスの戻りを防ぐ |
| cmpFramePrevious | 0 | 再追加禁止 | 旧 comparison frame パターンの再導入を防ぐ |
| dowCalcOverride | 0 | 再追加禁止 | 曜日計算 override の再導入を防ぐ |

---

## 2. 件数上限で凍結している design system guard

違反ゼロではなく、現状件数を上限として固定している凍結項目。
増加は CI fail 対象、削減時は MAX_* を引き下げる運用。

| 項目 | 現在の上限 | 凍結ルール | 備考 |
|------|----------|----------|------|
| hex 色違反ファイル数 | **0** | **ゼロ維持** | 全廃完了。theme.colors.* / palette.* 必須 |
| rgba() 違反ファイル数 | **0** | **ゼロ維持** | 全廃完了。palette hex alpha / theme.mode ternary 必須 |
| font-size 直書き違反ファイル数 | **0** | **ゼロ維持** | 全廃完了。theme.typography.fontSize.* 必須 |
| ECharts fontSize ハードコード | 7 | 増加禁止 | chartFontSize.* 利用 |
| deprecated fontSize alias 使用ファイル数 | **0** | **ゼロ維持** | 全廃完了。ロールベース名必須 |
| Recharts 使用ファイル数 | **0** | **ゼロ維持** | ECharts 移行済み |
| ChartCard 未使用チャート数 | **0** | **ゼロ維持** | 新規 standalone chart は ChartCard 必須 |
| z-index ハードコードファイル数 | **0** | **ゼロ維持** | 全廃完了。theme.zIndex.* 必須 |

---

## 3. 後方互換コードの凍結式管理（@deprecated）

残存を認めるが、新規追加は禁止。件数上限は **5**。

| ファイル | 凍結理由 | 解除条件 |
|---------|---------|---------|
| domain/calculations/estMethod.ts | WASM dual-run bridge が old 関数名に依存 | WASM bridge 統合完了後 |
| domain/calculations/discountImpact.ts | 同上 | WASM bridge 統合完了後 |
| application/services/grossProfitBridge.ts | WASM dual-run bridge 本体 | WASM 統合完了後 |
| domain/models/ImportedData.ts | infrastructure 内部 + adapter 用（direct import = 0） | ImportedData 型完全削除後 |
| domain/models/monthlyDataAdapter.ts | toLegacyImportedData / toMonthlyData adapter | ImportedData 型完全削除後 |

**解消済み:**
- ~~domain/models/MonthlyData.ts~~ — ImportedData 構造移行完了（2026-04-01）。MonthlyData は正本型として運用中
- ~~tokens.ts~~ — deprecated alias 全廃により削除
- ~~TimeSlotChart.tsx~~ — context prop 移行完了
- ~~queryRunner.ts~~ — buildWhereClause 削除（呼び出し元0）
- ~~useTimeSlotData.ts~~ — orphan コメント削除
- ~~GrossProfitRateChart.tsx~~ — バレルファイル削除（directory index.ts に統合）
- ~~wasmEngine.ts~~ — getWasmState() 削除（呼び出し元0）

---

## 3.1. WASM Dual-Run Exit Criteria

WASM dual-run bridge（estMethod.ts, discountImpact.ts, grossProfitBridge.ts）の
削除には以下の全条件を満たす必要がある。

| 基準 | 閾値 | 現在値 | 測定方法 |
|------|------|--------|---------|
| mismatch rate | < 0.1% | 観測中 | observation test の mismatch / total |
| null mismatch count | 0 | 観測中 | JS=null, WASM≠null または逆のケース数 |
| observation duration | ≥ 30日 | 観測中 | 最初の observation pass からの経過日数 |
| fallback rate | 0% | 観測中 | WASM 不可で JS fallback した割合 |
| observation test coverage | 全5テスト pass | 観測中 | test/observation/*.test.ts |

**収束プロセス:**
1. 全 observation test が pass 状態を 30 日間維持
2. mismatch rate が 0.1% 未満であることを確認
3. WASM-only trial test が pass であることを確認
4. bridge コード（§3 の 3 ファイル）を削除し、WASM を authoritative に昇格
5. frozen-list §3 から当該エントリを削除

**中止条件:**
- mismatch rate > 1% が 7 日間連続 → WASM 実装のバグを修正するまで dual-run を継続
- null mismatch が 1 件でも発生 → 即座に調査（silent data loss の兆候）

---

## 4. 運用ルール

| 種類 | 内容 |
|------|------|
| ゼロ維持凍結 | 今は 0 件。再追加したら fail |
| 件数上限凍結 | 今ある件数を上限として固定。増加したら fail |
| 残存許可凍結 | 既知の互換コードだけ残す。新規追加は禁止 |

---

## 5. 凍結解除の実績

| 項目 | 元の値 | 現在値 | 解除日 | 方法 |
|------|-------|-------|--------|------|
| font-size 直書き | 73 | 0 | 2026-03-31 | theme.typography.fontSize.* トークンに全置換 |
| deprecated fontSize alias | 473回使用 | 0 | 2026-03-31 | ロールベース名（micro/caption/label/body/title/heading/display）に全置換 |
| rgba() | 64 | 0 | 2026-03-31 | palette hex alpha / theme.mode ternary 化で全廃 |
| hex 色 | 1 | 0 | 2026-03-31 | theme.colors.palette.white に置換 |
| z-index ハードコード | 10 | 0 | 2026-03-31 | theme.zIndex.* トークンに全置換 |
| ECharts fontSize | 7 | 0 | 2026-03-31 | chartFontSize.* トークンに全置換 |
| @deprecated | 9 | 4 | 2026-03-31 | tokens/TimeSlotChart/queryRunner/useTimeSlotData/GrossProfitRateChart/wasmEngine の6件を回収 |
