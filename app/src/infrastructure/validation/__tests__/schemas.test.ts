import { describe, it, expect } from 'vitest'
import {
  ClassifiedSalesRecordSchema,
  CategoryTimeSalesRecordSchema,
  DepartmentKpiRecordSchema,
  TimeSlotEntrySchema,
} from '../schemas'

// ── ヘルパー ──

function validCSRecord() {
  return {
    year: 2026,
    month: 2,
    day: 15,
    storeId: '1',
    storeName: '毎日屋',
    groupName: '食品',
    departmentName: '青果',
    lineName: '野菜',
    className: 'トマト',
    salesAmount: 12345,
    discount71: 100,
    discount72: 200,
    discount73: 0,
    discount74: 50,
  }
}

function validCTSRecord() {
  return {
    year: 2026,
    month: 2,
    day: 10,
    storeId: '1',
    department: { code: '000061', name: '果物' },
    line: { code: '000601', name: '柑橘' },
    klass: { code: '601010', name: '温州みかん' },
    timeSlots: [
      { hour: 9, quantity: 5, amount: 500 },
      { hour: 10, quantity: 3, amount: 300 },
    ],
    totalQuantity: 8,
    totalAmount: 800,
  }
}

function validDeptKpiRecord() {
  return {
    deptCode: '61',
    deptName: '果物',
    gpRateBudget: 0.222,
    gpRateActual: 0.215,
    gpRateVariance: -0.7,
    markupRate: 0.25,
    discountRate: 0.03,
    salesBudget: 1000000,
    salesActual: 950000,
    salesVariance: -50000,
    salesAchievement: 0.95,
    openingInventory: 500000,
    closingInventory: 480000,
    gpRateLanding: 0.22,
    salesLanding: 1100000,
  }
}

// ── ClassifiedSalesRecordSchema ──

describe('ClassifiedSalesRecordSchema', () => {
  it('正常なレコードを受け入れる', () => {
    const result = ClassifiedSalesRecordSchema.safeParse(validCSRecord())
    expect(result.success).toBe(true)
  })

  it('year が範囲外の場合に拒否する', () => {
    expect(ClassifiedSalesRecordSchema.safeParse({ ...validCSRecord(), year: 1999 }).success).toBe(
      false,
    )
    expect(ClassifiedSalesRecordSchema.safeParse({ ...validCSRecord(), year: 2101 }).success).toBe(
      false,
    )
  })

  it('month が範囲外の場合に拒否する', () => {
    expect(
      ClassifiedSalesRecordSchema.safeParse({ ...validCSRecord(), month: 0 }).success,
    ).toBe(false)
    expect(
      ClassifiedSalesRecordSchema.safeParse({ ...validCSRecord(), month: 13 }).success,
    ).toBe(false)
  })

  it('day が範囲外の場合に拒否する', () => {
    expect(ClassifiedSalesRecordSchema.safeParse({ ...validCSRecord(), day: 0 }).success).toBe(
      false,
    )
    expect(ClassifiedSalesRecordSchema.safeParse({ ...validCSRecord(), day: 32 }).success).toBe(
      false,
    )
  })

  it('storeId が空文字の場合に拒否する', () => {
    expect(
      ClassifiedSalesRecordSchema.safeParse({ ...validCSRecord(), storeId: '' }).success,
    ).toBe(false)
  })

  it('salesAmount が NaN の場合に拒否する', () => {
    expect(
      ClassifiedSalesRecordSchema.safeParse({ ...validCSRecord(), salesAmount: NaN }).success,
    ).toBe(false)
  })

  it('salesAmount が Infinity の場合に拒否する', () => {
    expect(
      ClassifiedSalesRecordSchema.safeParse({ ...validCSRecord(), salesAmount: Infinity }).success,
    ).toBe(false)
  })

  it('discount フィールドが NaN の場合に拒否する', () => {
    expect(
      ClassifiedSalesRecordSchema.safeParse({ ...validCSRecord(), discount71: NaN }).success,
    ).toBe(false)
  })

  it('必須フィールドが欠落している場合に拒否する', () => {
    const { storeId: _, ...missing } = validCSRecord()
    expect(ClassifiedSalesRecordSchema.safeParse(missing).success).toBe(false)
  })

  it('負の salesAmount を受け入れる（返品等）', () => {
    expect(
      ClassifiedSalesRecordSchema.safeParse({ ...validCSRecord(), salesAmount: -500 }).success,
    ).toBe(true)
  })
})

// ── TimeSlotEntrySchema ──

describe('TimeSlotEntrySchema', () => {
  it('正常なエントリを受け入れる', () => {
    expect(TimeSlotEntrySchema.safeParse({ hour: 9, quantity: 5, amount: 500 }).success).toBe(true)
  })

  it('hour が 0-23 の範囲外の場合に拒否する', () => {
    expect(TimeSlotEntrySchema.safeParse({ hour: -1, quantity: 0, amount: 0 }).success).toBe(false)
    expect(TimeSlotEntrySchema.safeParse({ hour: 24, quantity: 0, amount: 0 }).success).toBe(false)
  })

  it('quantity が NaN の場合に拒否する', () => {
    expect(TimeSlotEntrySchema.safeParse({ hour: 9, quantity: NaN, amount: 0 }).success).toBe(
      false,
    )
  })
})

// ── CategoryTimeSalesRecordSchema ──

describe('CategoryTimeSalesRecordSchema', () => {
  it('正常なレコードを受け入れる', () => {
    const result = CategoryTimeSalesRecordSchema.safeParse(validCTSRecord())
    expect(result.success).toBe(true)
  })

  it('department の code/name が欠落している場合に拒否する', () => {
    expect(
      CategoryTimeSalesRecordSchema.safeParse({
        ...validCTSRecord(),
        department: { code: '001' },
      }).success,
    ).toBe(false)
  })

  it('timeSlots 内の不正エントリを拒否する', () => {
    expect(
      CategoryTimeSalesRecordSchema.safeParse({
        ...validCTSRecord(),
        timeSlots: [{ hour: 25, quantity: 0, amount: 0 }],
      }).success,
    ).toBe(false)
  })

  it('空の timeSlots 配列を受け入れる', () => {
    expect(
      CategoryTimeSalesRecordSchema.safeParse({
        ...validCTSRecord(),
        timeSlots: [],
      }).success,
    ).toBe(true)
  })

  it('totalAmount が NaN の場合に拒否する', () => {
    expect(
      CategoryTimeSalesRecordSchema.safeParse({
        ...validCTSRecord(),
        totalAmount: NaN,
      }).success,
    ).toBe(false)
  })
})

// ── DepartmentKpiRecordSchema ──

describe('DepartmentKpiRecordSchema', () => {
  it('正常なレコードを受け入れる', () => {
    const result = DepartmentKpiRecordSchema.safeParse(validDeptKpiRecord())
    expect(result.success).toBe(true)
  })

  it('deptCode が空文字の場合に拒否する', () => {
    expect(
      DepartmentKpiRecordSchema.safeParse({ ...validDeptKpiRecord(), deptCode: '' }).success,
    ).toBe(false)
  })

  it('数値フィールドが NaN の場合に拒否する', () => {
    const numericFields = [
      'gpRateBudget',
      'gpRateActual',
      'gpRateVariance',
      'markupRate',
      'discountRate',
      'salesBudget',
      'salesActual',
      'salesVariance',
      'salesAchievement',
      'openingInventory',
      'closingInventory',
      'gpRateLanding',
      'salesLanding',
    ] as const

    for (const field of numericFields) {
      const record = { ...validDeptKpiRecord(), [field]: NaN }
      expect(
        DepartmentKpiRecordSchema.safeParse(record).success,
        `${field} should reject NaN`,
      ).toBe(false)
    }
  })

  it('必須フィールドが欠落している場合に拒否する', () => {
    const { salesLanding: _, ...missing } = validDeptKpiRecord()
    expect(DepartmentKpiRecordSchema.safeParse(missing).success).toBe(false)
  })
})
