# HANDOFF — quick-fixes

> 役割: 起点文書。
> 単発の小さな fix の受け皿。複数 phase の文脈は持たない。

## 1. 現在地

repo 横断の単発 fix 集約 collection。継続的に新規 fix が追加され、
完了したものは checked にする。archive はしない。

## 2. 次にやること

`checklist.md` を見て open checkbox から好きなものに着手する。優先順位は
checkbox に近接するコメント（`(高)` / `(低)` 等）で示す。

## 3. ハマりポイント

### 3.1. 文脈が育ってきたら独立 project に切り出す

quick-fixes 内の checkbox を進めるうちに「これは複数 phase が必要だ」と
判断した場合は、その項目を新規 project に昇格させる:

1. `projects/_template/` をコピーして新 project を作る
2. 関連する quick-fixes checkbox を新 project の checklist.md に移管
3. quick-fixes 側の checkbox は削除（重複させない）
4. open-issues.md の active 索引に新 project を追加

### 3.2. 単純な並びを保つ

カテゴリ分けはしない（`## ファイル削除` / `## typo` 等の見出しは作らない）。
カテゴリで Phase を作りたくなったら独立 project にすべきサイン。

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| `references/03-guides/project-checklist-governance.md` | 規約の正本（§11 で large vs small の判断基準） |
