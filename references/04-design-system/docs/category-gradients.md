# Category Gradients

`tokens.categoryGradients` は取引区分と業務分類を表す**グラデーション**の
レジストリ。部門（青果・精肉…）ではなく、**取引の方向**や**加工区分**を
色分けする用途です。

---

## 3 つのグループ

Test4 の `categoryGradients` は文脈で 3 グループに分かれます。

### グループ 1 — 取引区分 (Transaction direction)

| キー | 業務用語 | 読み | 意味 | 色味 |
| --- | --- | --- | --- | --- |
| `ti` | TI | 店入 (てんにゅう) | 店間移動の入荷側 | 緑 (#4ade80 → #22c55e) |
| `to` | TO | 店出 (てんしゅつ) | 店間移動の出荷側 | 赤ピンク (#fb7185 → #f43f5e) |
| `bi` | BI | 部入 (ぶにゅう) | 部門間移動の入荷側 | 青 (#60a5fa → #3b82f6) |
| `bo` | BO | 部出 (ぶしゅつ) | 部門間移動の出荷側 | 紫 (#c084fc → #a855f7) |

**ペア構造**: TI/TO が「店間の 入↔出」、BI/BO が「部門間の 入↔出」。
「入 = 緑系/青系」「出 = 赤系/紫系」というサブルール。

**使用箇所（実装確認済み）**:
- `DailyPage.tsx` の日別明細テーブルに `店間入` / `店間出` / `部門間入` /
  `部門間出` 列が存在
- `TransferProcessor.ts` が `processInterStoreIn` / `processInterStoreOut`
  を経て、同一店舗扱いなら `interDepartmentIn` / `interDepartmentOut` に
  振り分け

### グループ 2 — 業務分類 (Operational)

| キー | 業務用語 | 意味 | 色味 |
| --- | --- | --- | --- |
| `daily` | デイリー | デイリー部門 / 日配 | 琥珀 (#fbbf24 → #f59e0b) |
| `market` | 市場 | 市場仕入 | 琥珀 (#fbbf24 → #f59e0b) |
| `lfc` | LFC | LFC (Local Fresh Center / 物流拠点) | 青 (#60a5fa → #3b82f6) |
| `salad` | サラダ | サラダ加工 | 緑 (#4ade80 → #22c55e) |
| `kakou` | 加工 | 加工品 (惣菜加工等) | 紫 (#c084fc → #a855f7) |
| `chokuden` | 直伝 | 直伝（メーカー直伝送） | シアン (#22d3ee → #06b6d4) |
| `hana` | 花 | 花・生花部門 | ピンク (#f472b6 → #ec4899) |
| `sanchoku` | 産直 | 産地直送 | ライム (#a3e635 → #84cc16) |

> `daily` と `market` は同じ色味 (琥珀) を持ちます。並立して使われる
> ことは通常なく、文脈で区別されます。

### グループ 3 — 集計区分 (Aggregation)

| キー | 業務用語 | 意味 | 色味 |
| --- | --- | --- | --- |
| `costInclusion` | 原価算入費 | 原価に算入される費目 | オレンジ (#f97316 → #ea580c) |
| `tenkan` | 店間 | 店間移動（合計） | 赤ピンク (#fb7185 → #f43f5e) |
| `bumonkan` | 部門間 | 部門間移動（合計） | 紫 (#a78bfa → #8b5cf6) |
| `other` | その他 | その他 | スレート (#94a3b8 → #64748b) |

`tenkan` / `bumonkan` は `ti+to` / `bi+bo` の合計系統として、グループ 1 と
色調がリンクしています。

---

## 名称の揺れ: `costInclusion` vs `consumable`

コード上では `costInclusion` ですが、UI 仕様書や一部メッセージ定義では
`consumable` / `消耗品` で扱われている痕跡があります:

| 表現箇所 | 使われている名 |
| --- | --- |
| `categoryGradients` (tokens.ts) | `costInclusion` |
| `DailyRecord` 型の comment | `costInclusion // 原価算入費` |
| `nav.costInclusion` (i18n) | `原価算入費` |
| `categories.consumables` (i18n) | `消耗品` |

**現状の正解**: 原価に算入されるものと消耗品は**隣接概念だが別物**。
リネームの途中で両方が残存しているように見えます。現役のコード上では
`costInclusion` = 原価算入費を信じてよい。ただし UI 表示に「消耗品」と
書かれている画面を見たら、旧表現の残存を疑って確認してください。

本 DS では `costInclusion` を正として扱います。

---

## なぜグラデーションか

Test4 の categoryUI は背景に使われます。チップ・カードの背景に flat color
ではなくグラデーションを敷くことで：

1. **彩度が高くても視覚負荷が下がる** — 単色ベタ塗りより目に優しい
2. **立体感** — 135° のグラデーションは左上から光が入る擬似立体
3. **分類の視認性** — 遠目でも「どのグループか」が分かる

135° は Test4 の全グラデーションで共通（ブランドロゴとも揃っている）。

---

## 使い方

### Chip 背景

```tsx
import styled from 'styled-components'

const Chip = styled.div<{ kind: keyof typeof categoryGradients }>`
  background: ${({ theme, kind }) => theme.categoryGradients[kind]};
  color: #fff;
  padding: ${({ theme }) => `${theme.spacing['2']} ${theme.spacing['5']}`};
  border-radius: ${({ theme }) => theme.radii.pill};
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  font-weight: 600;
`

// 使用
<Chip kind="ti">店間入</Chip>
<Chip kind="to">店間出</Chip>
<Chip kind="bumonkan">部門間</Chip>
```

### カード帯

```tsx
const CategoryCard = styled.div<{ kind: keyof typeof categoryGradients }>`
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing['6']};

  /* 上辺 3px のアクセント帯 */
  border-top: 3px solid transparent;
  background-image:
    linear-gradient(${({ theme }) => theme.colors.bg3},
                    ${({ theme }) => theme.colors.bg3}),
    ${({ theme, kind }) => theme.categoryGradients[kind]};
  background-origin: border-box;
  background-clip: padding-box, border-box;
`
```

二重グラデーションの技で、背景は単色・上辺のみ色帯にできます。

---

## CSS 変数（DS preview 用）

```css
.chip-ti { background: var(--gradient-ti); }
.chip-tenkan { background: var(--gradient-tenkan); }
```

詳細は `tokens.md` の category gradients 節参照。

---

## 追加ルール

新しい取引区分・業務分類が増えたら：

1. `tokens.ts` の `categoryGradients` にキー追加（135° 維持）
2. 既存のグループ色と衝突しないか確認（特に ti/to/bi/bo と
   tenkan/bumonkan の色相リンクを壊さないように）
3. 色味は他グループとの「読み分けやすさ」を最優先。ブランド感やおしゃれさは
   二の次
4. 消耗品系なら warning 系、発送系なら danger 系、のように **意味カテゴリ
   の色相傾向を踏襲**

---

## アンチパターン

### ❌ やらない

```tsx
// ハードコード
<Chip style={{ background: 'linear-gradient(135deg, #4ade80, #22c55e)' }}>

// 部門名で呼ぶ（Test4 の分類軸ではない）
<Chip kind="produce">  // ← そんなキーは無い
```

### ✅ やる

```tsx
<Chip kind="ti">店間入</Chip>
<Chip kind="sanchoku">産直</Chip>
```
