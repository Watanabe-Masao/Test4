# AAG Size Statistics

> **役割: 生成された effective LOC 集計の articulation (= 機械生成、手編集禁止)。**
> 正本: [`aag-size-statistics.json`](./aag-size-statistics.json)、集計対象: [`source-facts.json`](./source-facts.json)、bucket 定義: [`aag/parameters/aag-parameters.json`](../../../aag/parameters/aag-parameters.json)。

> 生成: 2026-05-06T10:53:14.625Z
> 集計 metric: `effectiveCodeLines`
> 集計対象 file 数: **2714**

## Summary (= 全 file 集計)

| 指標 | 値 |
|---|---|
| p50 (median) | 80 |
| p75 | 148 |
| p90 | 248 |
| p95 | 331 |
| p99 | 625 |
| max | 1606 |
| mean | 115.19 |

## Bucket Distribution (= effective LOC 範囲別 file 数)

| bucket id | label | file 数 | 比率 | 累積 |
|---|---|---:|---:|---:|
| `loc.001_010` | 1-10 | 203 | 7.5% | 7.5% |
| `loc.011_020` | 11-20 | 183 | 6.7% | 14.2% |
| `loc.021_030` | 21-30 | 159 | 5.9% | 20.1% |
| `loc.031_040` | 31-40 | 162 | 6.0% | 26.1% |
| `loc.041_050` | 41-50 | 156 | 5.7% | 31.8% |
| `loc.051_060` | 51-60 | 190 | 7.0% | 38.8% |
| `loc.061_070` | 61-70 | 160 | 5.9% | 44.7% |
| `loc.071_080` | 71-80 | 151 | 5.6% | 50.3% |
| `loc.081_090` | 81-90 | 149 | 5.5% | 55.7% |
| `loc.091_100` | 91-100 | 116 | 4.3% | 60.0% |
| `loc.101_150` | 101-150 | 424 | 15.6% | 75.6% |
| `loc.151_200` | 151-200 | 242 | 8.9% | 84.6% |
| `loc.201_300` | 201-300 | 231 | 8.5% | 93.1% |
| `loc.301_plus` | 301+ | 186 | 6.9% | 99.9% |

## By Layer (= layer 別 effective LOC 集計)

| layer | file 数 | p50 | p90 | p95 | max |
|---|---:|---:|---:|---:|---:|
| `aag-engine` | 23 | 146 | 301 | 327 | 378 |
| `app` | 11 | 17 | 75 | 175 | 276 |
| `application` | 602 | 67 | 192 | 254 | 1410 |
| `docs` | 13 | 84 | 278 | 677 | 1239 |
| `domain` | 247 | 58 | 216 | 317 | 654 |
| `features` | 1 | 59 | 59 | 59 | 59 |
| `features/budget` | 37 | 106 | 328 | 358 | 732 |
| `features/category` | 65 | 111 | 303 | 347 | 419 |
| `features/clip-export` | 4 | 7 | 47 | 55 | 64 |
| `features/comparison` | 55 | 71 | 211 | 277 | 461 |
| `features/cost-detail` | 14 | 107 | 360 | 384 | 403 |
| `features/forecast` | 9 | 15 | 196 | 277 | 358 |
| `features/purchase` | 10 | 101 | 263 | 316 | 370 |
| `features/reports` | 6 | 65 | 288 | 370 | 452 |
| `features/sales` | 10 | 15 | 239 | 247 | 256 |
| `features/shared` | 2 | 4 | 7 | 7 | 8 |
| `features/storage-admin` | 14 | 74 | 212 | 299 | 448 |
| `features/time-slot` | 10 | 63 | 117 | 147 | 178 |
| `features/weather` | 8 | 20 | 132 | 162 | 192 |
| `infrastructure` | 208 | 105 | 272 | 332 | 906 |
| `presentation` | 670 | 91 | 280 | 364 | 773 |
| `projects` | 77 | 44 | 122 | 322 | 1606 |
| `references` | 291 | 74 | 229 | 351 | 983 |
| `stories` | 23 | 62 | 145 | 155 | 250 |
| `test` | 262 | 88 | 233 | 344 | 1066 |
| `tools` | 42 | 125 | 291 | 306 | 373 |

---

> 関連 query: `aag stats files --metric effectiveCodeLines --range N..M` / `--bucket loc.021_030` / `--layer presentation` / `--above p95` (= Wave 1 #6 deliverable)。
