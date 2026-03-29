/**
 * timeSlot 観測テスト用フィクスチャ
 *
 * domain/calculations/__tests__/timeSlotCalculationsInvariants.test.ts の
 * データセットを元に、観測ハーネス用に構造化。
 */

export interface TimeSlotFixture {
  readonly name: string
  readonly hourlyData: readonly { hour: number; amount: number }[]
}

/** 典型的な小売パターン（9-21時、昼食・夕方ピーク） */
export const NORMAL: TimeSlotFixture = {
  name: 'normal-retail',
  hourlyData: [
    { hour: 9, amount: 15000 },
    { hour: 10, amount: 25000 },
    { hour: 11, amount: 45000 },
    { hour: 12, amount: 55000 },
    { hour: 13, amount: 40000 },
    { hour: 14, amount: 30000 },
    { hour: 15, amount: 25000 },
    { hour: 16, amount: 30000 },
    { hour: 17, amount: 35000 },
    { hour: 18, amount: 50000 },
    { hour: 19, amount: 45000 },
    { hour: 20, amount: 20000 },
    { hour: 21, amount: 10000 },
  ],
}

/** 朝方集中パターン（スーパー） */
export const MORNING_HEAVY: TimeSlotFixture = {
  name: 'morning-heavy',
  hourlyData: [
    { hour: 8, amount: 30000 },
    { hour: 9, amount: 60000 },
    { hour: 10, amount: 80000 },
    { hour: 11, amount: 70000 },
    { hour: 12, amount: 40000 },
    { hour: 13, amount: 25000 },
    { hour: 14, amount: 15000 },
    { hour: 15, amount: 10000 },
  ],
}

/** 夕方集中パターン（コンビニ） */
export const EVENING_HEAVY: TimeSlotFixture = {
  name: 'evening-heavy',
  hourlyData: [
    { hour: 7, amount: 5000 },
    { hour: 10, amount: 10000 },
    { hour: 12, amount: 15000 },
    { hour: 15, amount: 20000 },
    { hour: 17, amount: 50000 },
    { hour: 18, amount: 70000 },
    { hour: 19, amount: 60000 },
    { hour: 20, amount: 30000 },
  ],
}

/** 均一分布 */
export const UNIFORM: TimeSlotFixture = {
  name: 'uniform',
  hourlyData: [
    { hour: 10, amount: 20000 },
    { hour: 11, amount: 20000 },
    { hour: 12, amount: 20000 },
    { hour: 13, amount: 20000 },
    { hour: 14, amount: 20000 },
  ],
}

/** 疎ら（4時間のみ、ギャップあり） */
export const SPARSE: TimeSlotFixture = {
  name: 'sparse',
  hourlyData: [
    { hour: 9, amount: 30000 },
    { hour: 12, amount: 50000 },
    { hour: 15, amount: 40000 },
    { hour: 18, amount: 20000 },
  ],
}

/** 単一時間（境界テスト） */
export const SINGLE_HOUR: TimeSlotFixture = {
  name: 'single-hour',
  hourlyData: [{ hour: 12, amount: 100000 }],
}

/** ゼロ/空（null 返却テスト） */
export const EMPTY: TimeSlotFixture = {
  name: 'empty',
  hourlyData: [],
}

export const ALL_FIXTURES: readonly TimeSlotFixture[] = [
  NORMAL,
  MORNING_HEAVY,
  EVENING_HEAVY,
  UNIFORM,
  SPARSE,
  SINGLE_HOUR,
  EMPTY,
]
