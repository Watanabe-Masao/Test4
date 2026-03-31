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
| hex 色違反ファイル数 | 1 | 増加禁止 | 新規は theme.colors.* / palette.* 使用 |
| rgba() 違反ファイル数 | **0** | **ゼロ維持** | 全廃完了。palette hex alpha / theme.mode ternary 必須 |
| font-size 直書き違反ファイル数 | **0** | **ゼロ維持** | 全廃完了。theme.typography.fontSize.* 必須 |
| ECharts fontSize ハードコード | 7 | 増加禁止 | chartFontSize.* 利用 |
| deprecated fontSize alias 使用ファイル数 | 0 | **ゼロ維持** | ロールベース名への移行完了 |
| Recharts 使用ファイル数 | 0 | **ゼロ維持** | ECharts 移行済み |
| ChartCard 未使用チャート数 | 0 | **ゼロ維持** | 新規 standalone chart は ChartCard 必須 |
| z-index ハードコードファイル数 | 10 | 増加禁止 | theme.zIndex.* 利用 |

---

## 3. 後方互換コードの凍結式管理（@deprecated）

残存を認めるが、新規追加は禁止。件数上限は 9。

| ファイル | 凍結理由 | 解除条件 |
|---------|---------|---------|
| domain/calculations/estMethod.ts | WASM dual-run 統合完了まで維持 | WASM 統合完了後 |
| domain/calculations/discountImpact.ts | 同上 | WASM 統合完了後 |
| presentation/theme/tokens.ts | デザインシステム移行完了まで維持 | DS 移行完了後 |
| presentation/components/charts/TimeSlotChart.tsx | context 移行完了まで維持 | 全消費者移行後 |
| infrastructure/duckdb/queryRunner.ts | buildTypedWhere 移行完了まで維持 | 全消費者移行後 |
| application/hooks/useTimeSlotData.ts | 削除済みエイリアスのコメント参照維持 | 移行完了後 |
| domain/models/MonthlyData.ts | ImportedData との段階的共存 | 構造移行完了後 |
| presentation/components/charts/GrossProfitRateChart.tsx | バレルラッパー | 依存整理後 |
| application/services/wasmEngine.ts | getWasmState() 系の移行完了まで維持 | API 移行完了後 |

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
