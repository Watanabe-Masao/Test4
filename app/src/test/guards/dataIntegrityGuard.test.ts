/**
 * データ整合性ガード — 3つのバグパターンの構造的再発防止
 *
 * Pattern 1: データ二重計上（+= 加算パターン）
 *   flowers は storeId × day = 1 レコードが正規形。加算は禁止。
 *
 * Pattern 2: DuckDB is_prev_year 不整合
 *   前年歴史月は is_prev_year=true でも DuckDB にロードすること。
 *
 * Pattern 3: 状態マシンのクリア漏れ
 *   モード切替時に関連状態を全てリセットすること。
 *
 * @guard G1 テストに書く — 機械的検出手段で再発防止
 * ルール定義: architectureRules.ts (AR-STRUCT-DATA-INTEGRITY)
 *
 * @responsibility R:unclassified
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { getRuleById } from '../architectureRules'

const SRC_DIR = path.resolve(__dirname, '../..')
const rule = getRuleById('AR-STRUCT-DATA-INTEGRITY')!

// ── Pattern 1: データ二重計上の防止 ──

describe('Pattern 1: データ二重計上の防止', () => {
  describe('flowers の index 構築が上書き方式 (last-write-wins)', () => {
    it('buildFlowersCustomerIndex が += パターンを使わない', () => {
      const content = fs.readFileSync(
        path.join(SRC_DIR, 'domain/models/ClassifiedSales.ts'),
        'utf-8',
      )
      const funcMatch = content.match(/function buildFlowersCustomerIndex[\s\S]*?^}/m)
      if (!funcMatch) {
        expect.fail(`[${rule.id}] buildFlowersCustomerIndex が見つかりません`)
        return
      }
      expect(
        funcMatch[0].includes('+='),
        `[${rule.id}] buildFlowersCustomerIndex で += 加算が検出。` +
          'flowers は storeId × day = 1 レコードが正規形。上書き (=) にすべき。',
      ).toBe(false)
    })

    it('indexByStoreDay が上書き方式である', () => {
      const content = fs.readFileSync(path.join(SRC_DIR, 'domain/models/DataTypes.ts'), 'utf-8')
      const funcMatch = content.match(/function indexByStoreDay[\s\S]*?^}/m)
      if (!funcMatch) return
      expect(
        funcMatch[0].includes('+='),
        `[${rule.id}] indexByStoreDay で += が検出。lookup index は上書きにすべき。`,
      ).toBe(false)
    })
  })

  describe('merge 関数が Map ベースの重複排除を使用する', () => {
    it('mergeClassifiedSalesData が Map dedup を使用', () => {
      const content = fs.readFileSync(
        path.join(SRC_DIR, 'domain/models/ClassifiedSales.ts'),
        'utf-8',
      )
      const funcMatch = content.match(/function mergeClassifiedSalesData[\s\S]*?^}/m)
      expect(funcMatch?.[0]).toContain('new Map')
    })

    it('mergeCategoryTimeSalesData が Map dedup を使用', () => {
      const content = fs.readFileSync(path.join(SRC_DIR, 'domain/models/DataTypes.ts'), 'utf-8')
      const funcMatch = content.match(/function mergeCategoryTimeSalesData[\s\S]*?^}/m)
      expect(funcMatch?.[0]).toContain('new Map')
    })

    it('mergeSpecialSalesData が Map dedup を使用', () => {
      const content = fs.readFileSync(path.join(SRC_DIR, 'domain/models/DataTypes.ts'), 'utf-8')
      const funcMatch = content.match(/function mergeSpecialSalesData[\s\S]*?^}/m)
      expect(funcMatch?.[0]).toContain('new Map')
    })
  })

  describe('CTS の意図的加算が文書化されている', () => {
    it('indexCtsQuantityByStoreDay にカテゴリ別加算のコメントがある', () => {
      const content = fs.readFileSync(
        path.join(SRC_DIR, 'features/comparison/application/sourceDataIndex.ts'),
        'utf-8',
      )
      expect(content).toContain('同一 storeId・day の複数カテゴリの totalQuantity を合算')
    })
  })
})

// ── Pattern 2: DuckDB is_prev_year 不整合の防止 ──

describe('Pattern 2: DuckDB is_prev_year 不整合の防止', () => {
  it('useDuckDB の歴史月ロードで前年月に isPrevYear=true を渡している', () => {
    const content = fs.readFileSync(
      path.join(SRC_DIR, 'application/runtime-adapters/useDuckDB.ts'),
      'utf-8',
    )
    // 歴史月ロードで前年判定（y === year - 1）と isPrevYear=true の追加ロードがあること
    expect(content).toContain('y === year - 1')
    // loadMonth の第6引数 true（isPrevYear）が歴史月ループ内にあること
    const historicalLoadSection = content.match(/新規・変更月をロード[\s\S]*?(?=── VIEW|$)/)?.[0]
    if (historicalLoadSection) {
      expect(
        historicalLoadSection.includes('true'),
        `[${rule.id}] 歴史月ロードで isPrevYear=true が見つかりません`,
      ).toBe(true)
    }
  })

  it('deletePolicy が is_prev_year 列あり/なしテーブルを正しく分類している', () => {
    const content = fs.readFileSync(
      path.join(SRC_DIR, 'infrastructure/duckdb/deletePolicy.ts'),
      'utf-8',
    )
    // is_prev_year 列ありテーブル
    expect(content).toContain("'classified_sales'")
    expect(content).toContain("'category_time_sales'")
    expect(content).toContain("'time_slots'")
    // is_prev_year 列なしテーブル（year/month で全行削除）
    expect(content).toContain('PREV_YEAR_INSERT_TABLES')
  })

  it('time_slots テーブルに is_prev_year 列がある', () => {
    const content = fs.readFileSync(path.join(SRC_DIR, 'infrastructure/duckdb/schemas.ts'), 'utf-8')
    const tsTable = content.match(/CREATE TABLE IF NOT EXISTS time_slots[\s\S]*?\)/)?.[0]
    expect(tsTable).toContain('is_prev_year')
  })

  it('deleteMonth が is_prev_year=true 行を保護する（巻き込み削除禁止）', () => {
    const content = fs.readFileSync(
      path.join(SRC_DIR, 'infrastructure/duckdb/deletePolicy.ts'),
      'utf-8',
    )
    // deleteMonth 関数が TABLES_WITH_PREV_YEAR_FLAG を参照し、
    // is_prev_year = false 条件で当年行のみ削除していること
    const deleteMonthFunc = content.match(/export async function deleteMonth[\s\S]*?^}/m)?.[0]
    expect(deleteMonthFunc, `[${rule.id}] deleteMonth が見つかりません`).toBeDefined()
    expect(
      deleteMonthFunc,
      `[${rule.id}] deleteMonth が TABLES_WITH_PREV_YEAR_FLAG を参照していません — is_prev_year=true 行の巻き込み削除が再発します`,
    ).toContain('TABLES_WITH_PREV_YEAR_FLAG')
    expect(
      deleteMonthFunc,
      `[${rule.id}] deleteMonth が is_prev_year = false 条件を使っていません — 前年行が保護されていません`,
    ).toContain('is_prev_year = false')
  })
})

// ── Pattern 3: 状態マシンのクリア漏れ防止 ──

describe('Pattern 3: 状態マシンのクリア漏れ防止', () => {
  it('DAY_CLICK reducer が pendingRange を null にクリアする', () => {
    const content = fs.readFileSync(
      path.join(SRC_DIR, 'presentation/components/charts/useDrillStateMachine.ts'),
      'utf-8',
    )
    // DAY_CLICK case の中で pendingRange: null が設定されていること
    const dayClickCase = content.match(/case 'DAY_CLICK'[\s\S]*?(?=case '|default:)/)?.[0]
    if (!dayClickCase) {
      expect.fail(`[${rule.id}] DAY_CLICK case が見つかりません`)
      return
    }
    expect(
      dayClickCase.includes('pendingRange: null') || dayClickCase.includes('pendingRange:null'),
      `[${rule.id}] DAY_CLICK で pendingRange がクリアされていません。` +
        '複数日選択後の単日クリックで範囲選択が残るバグの原因になります。',
    ).toBe(true)
  })

  it('CLEAR_SELECTION reducer が全選択状態をリセットする', () => {
    const content = fs.readFileSync(
      path.join(SRC_DIR, 'presentation/components/charts/useDrillStateMachine.ts'),
      'utf-8',
    )
    const clearCase = content.match(/case 'CLEAR_SELECTION'[\s\S]*?(?=case '|default:)/)?.[0]
    if (!clearCase) return
    // CLEAR_SELECTION は clickedDay, pendingRange, selectedRange を全てクリアすべき
    expect(clearCase).toContain('null')
  })
})

// ── Pattern 4: 現在安全な構造の保護 ──

describe('Pattern 4: 安全な構造が崩れないことの保護', () => {
  describe('DuckDB スキーマの is_prev_year 列の保護', () => {
    it('classified_sales に is_prev_year 列がある', () => {
      const content = fs.readFileSync(
        path.join(SRC_DIR, 'infrastructure/duckdb/schemas.ts'),
        'utf-8',
      )
      const csTable = content.match(/CREATE TABLE IF NOT EXISTS classified_sales[\s\S]*?\)/)?.[0]
      expect(csTable).toContain('is_prev_year')
    })

    it('category_time_sales に is_prev_year 列がある', () => {
      const content = fs.readFileSync(
        path.join(SRC_DIR, 'infrastructure/duckdb/schemas.ts'),
        'utf-8',
      )
      const ctsTable = content.match(
        /CREATE TABLE IF NOT EXISTS category_time_sales[\s\S]*?\)/,
      )?.[0]
      expect(ctsTable).toContain('is_prev_year')
    })
  })

  describe('insertCategoryTimeSales が is_prev_year を正しく設定する', () => {
    it('CTS 挿入時に is_prev_year フラグを行データに含める', () => {
      const content = fs.readFileSync(
        path.join(SRC_DIR, 'infrastructure/duckdb/tableInserts.ts'),
        'utf-8',
      )
      // ctsRows と tsRows の両方に is_prev_year を設定していること
      const insertFunc = content.match(/function insertCategoryTimeSales[\s\S]*?^}/m)?.[0]
      if (!insertFunc) {
        expect.fail(`[${rule.id}] insertCategoryTimeSales が見つかりません`)
        return
      }
      const isPrevYearOccurrences = (insertFunc.match(/is_prev_year/g) || []).length
      // ctsRows と tsRows の両方で設定 = 最低2回
      expect(
        isPrevYearOccurrences,
        `[${rule.id}] insertCategoryTimeSales で is_prev_year の設定が不足しています（CTS + TS の2箇所必要）`,
      ).toBeGreaterThanOrEqual(2)
    })
  })

  describe('store_day_summary VIEW が cs 基準で JOIN する', () => {
    it('VIEW が classified_sales (cs) を LEFT JOIN のドライバーにしている', () => {
      const content = fs.readFileSync(
        path.join(SRC_DIR, 'infrastructure/duckdb/schemas.ts'),
        'utf-8',
      )
      // ss_f, ss_d は cs.year = ss_f.year で結合（cs の is_prev_year で前年を制御）
      expect(content).toContain('cs.year = ss_f.year')
      expect(content).toContain('cs.year = ss_d.year')
    })
  })

  describe('special_sales/purchase/transfers の前年削除が year/month ベース', () => {
    it('PREV_YEAR_INSERT_TABLES にこれらのテーブルが含まれる', () => {
      const content = fs.readFileSync(
        path.join(SRC_DIR, 'infrastructure/duckdb/deletePolicy.ts'),
        'utf-8',
      )
      expect(content).toContain("'purchase'")
      expect(content).toContain("'special_sales'")
      expect(content).toContain("'transfers'")
    })
  })

  describe('processSpecialSales が storeId × day で一意性を保証する', () => {
    it('中間構造が partitioned[mk][storeId][day] である', () => {
      const content = fs.readFileSync(
        path.join(SRC_DIR, 'infrastructure/dataProcessing/SpecialSalesProcessor.ts'),
        'utf-8',
      )
      expect(content).toContain('partitioned[mk][storeId]')
    })
  })

  describe('aggregateAllStores の sales 加算が意図的であることの保護', () => {
    it('aggregateAllStores に花データ JOIN の設計コメントがある', () => {
      const content = fs.readFileSync(
        path.join(SRC_DIR, 'domain/models/ClassifiedSales.ts'),
        'utf-8',
      )
      // aggregateAllStores の JSDoc に flowers の客数 JOIN 用途が文書化されていること
      expect(content).toContain('@param flowers')
      expect(content).toContain('客数 JOIN 用')
    })
  })
})

// ── Pattern 5: 前年データ二重投入の防止 ──

describe('Pattern 5: 前年データ二重投入の防止', () => {
  const duckContent = fs.readFileSync(
    path.join(SRC_DIR, 'application/runtime-adapters/useDuckDB.ts'),
    'utf-8',
  )

  it('初回ロードの歴史月ループで prevYear 二重投入ガードがある', () => {
    // prevYear prop で既にロード済みの月を歴史月ループで再投入しないこと
    // alreadyLoadedAsPrev チェックが初回ロードパスに存在すること
    const initialLoadSection = duckContent.match(
      /initialLoadDone\.current\s*\)[\s\S]*?initialLoadDone\.current\s*=\s*true/,
    )?.[0]
    expect(initialLoadSection, `[${rule.id}] 初回ロードセクションが見つかりません`).toBeDefined()
    expect(
      initialLoadSection!.includes('alreadyLoadedAsPrev'),
      `[${rule.id}] 初回ロードの歴史月ループに prevYear 二重投入ガード (alreadyLoadedAsPrev) がありません。` +
        'prevYear prop と歴史月ループで同一月が isPrevYear=true で2回 INSERT され、' +
        '売上7日MA(前年)等の全比較期指標が2倍になります。',
    ).toBe(true)
  })

  it('差分ロードの歴史月ループでも prevYear 二重投入ガードがある', () => {
    // 差分ロードパスにも同じガードが存在すること
    const diffLoadSection = duckContent.match(
      /新規・変更月をロード[\s\S]*?anyChanged\s*=\s*true\s*\n\s*}/,
    )?.[0]
    if (!diffLoadSection) return // 差分ロードセクションが見つからない場合はスキップ
    // y === year - 1 の分岐がある場合、alreadyLoadedAsPrev ガードも必須
    if (diffLoadSection.includes('y === year - 1')) {
      expect(
        diffLoadSection.includes('alreadyLoadedAsPrev'),
        `[${rule.id}] 差分ロードの歴史月ループに prevYear 二重投入ガード (alreadyLoadedAsPrev) がありません。`,
      ).toBe(true)
    }
  })

  it('alreadyLoadedAsPrev が prevYear.origin の year/month を比較している', () => {
    // ガードが prevYear.origin.year と prevYear.origin.month を参照していること
    expect(
      duckContent.includes('prevYear.origin.year'),
      `[${rule.id}] alreadyLoadedAsPrev が prevYear.origin.year を参照していません`,
    ).toBe(true)
    expect(
      duckContent.includes('prevYear.origin.month'),
      `[${rule.id}] alreadyLoadedAsPrev が prevYear.origin.month を参照していません`,
    ).toBe(true)
  })
})
