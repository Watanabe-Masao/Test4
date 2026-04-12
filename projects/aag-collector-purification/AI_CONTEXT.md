# AI_CONTEXT — aag-collector-purification

## Project

AAG collector 純化 — 規約と実装の対称性回復（aag-collector-purification）

## Purpose

AAG 5.1 で確立した「checklist driven completion 管理」の規約と実装の間に
存在する **非対称性** を解消する。

具体的には、`project-checklist-collector.ts` の `countCheckboxes` 関数が
checklist.md 内の「やってはいけないこと」「常時チェック」「最重要項目」
セクションを **見出し正規表現マッチで除外** している点を解消する。
governance ガイド §3 では「これらの項目は checklist に書かない」と明記
しているのに、collector は「書かれることを前提に除外する」設計になっており、
規約と実装が逆向きになっている。

長期的には heading 抑制を消し、format guard で checklist を純化することで
**「format guard が通過する範囲 = collector が集計する範囲」** という対称性を
取り戻す。これは framework としての完成度を一段上げる重要な仕上げ作業。

## Read Order

1. 本ファイル
2. `HANDOFF.md`（残作業の優先順位とハマりポイント）
3. `plan.md`（不可侵原則と Phase 構造）
4. `checklist.md`（completion 判定の入力 — required checkbox 集合）
5. `references/03-guides/project-checklist-governance.md` §3 / §11（規約の正本）
6. `tools/architecture-health/src/collectors/project-checklist-collector.ts`（純化対象）
7. `app/src/test/guards/checklistFormatGuard.test.ts`（純化対象）
8. `projects/pure-calculation-reorg/checklist.md`（移行対象 — 既存形式の互換例外）

## Why this project exists

AAG 5.1 release 直後の振り返りで、外部レビューから 3 つの論点が提示された:

1. CURRENT_PROJECT.md の主戦場選定（判断保留で OK）
2. technical-debt-roadmap.md の見た目の live 感（quick-fix で対応）
3. **collector の heading 依存（本 project で対応）**

3 番目は単なる fix ではなく **framework の対称性に関わる構造問題** で、
依存関係が複雑（collector / format guard / pure-calculation-reorg checklist /
規約ガイド の 4 箇所が連動）かつ既存 project の進行を止めない順序が必要なため、
quick-fix ではなく独立 project として立ち上げる。

これは governance §11.4 の「fix だったが依存関係が複雑で大掛かりになる」昇格
シグナルが全て当てはまる典型例である。

## Scope

含む:
- `pure-calculation-reorg/checklist.md` の純化（やってはいけないこと → plan.md / 常時チェック → CONTRIBUTING / 最重要項目 → plan.md への移動）
- `FORMAT_EXEMPT_PROJECT_IDS` から `pure-calculation-reorg` を外す
- `project-checklist-collector.ts::countCheckboxes` から heading 抑制ロジックを削除
- `checklistFormatGuard.test.ts` を strict 化（heading 内 checkbox は全 project で禁止）
- 規約 §3 と collector 実装が対称になっていることの test 化

含まない:
- pure-calculation-reorg の Phase 8-11 の進行（独立した別作業として並行）
- 他の collector / guard の構造変更
- governance ガイド §3 の規約自体の変更（実装を規約に揃えるのが目的）

## 関連文書

| 文書 | 役割 |
|---|---|
| `references/03-guides/project-checklist-governance.md` | §3 / §11 が規約の正本 |
| `references/01-principles/aag-5-constitution.md` | AAG Layer 構造 |
| `tools/architecture-health/src/collectors/project-checklist-collector.ts` | 純化対象 (Layer 3 Execution) |
| `app/src/test/guards/checklistFormatGuard.test.ts` | 純化対象 (Layer 3 Execution) |
| `projects/pure-calculation-reorg/checklist.md` | 移行対象 (互換例外) |
| `projects/pure-calculation-reorg/plan.md` | 移行先 (やってはいけないこと / 最重要項目) |
