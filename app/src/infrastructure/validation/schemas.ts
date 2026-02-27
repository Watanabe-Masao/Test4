/**
 * Zod バリデーションスキーマ
 *
 * データ境界（プロセッサ出力・IndexedDB ロード）で使用する実行時検証スキーマ。
 * 既存の interface はそのまま維持し、条件型でスキーマと型の整合をコンパイル時に保証する。
 */
import { z } from 'zod'
import type { ClassifiedSalesRecord } from '@/domain/models/ClassifiedSales'
import type {
  CategoryTimeSalesRecord,
  TimeSlotEntry,
  DepartmentKpiRecord,
} from '@/domain/models/DataTypes'

// ── コンパイル時型整合ガード ──
// Source が Target に代入可能でなければコンパイルエラーになる
type AssertAssignable<_Target, _Source extends _Target> = true

// ── 共通 refinement ──

const finiteNumber = z.number().finite()
const storeId = z.string().min(1)
const dayOfMonth = z.number().int().min(1).max(31)
const monthOfYear = z.number().int().min(1).max(12)
const yearValue = z.number().int().min(2000).max(2100)

// ── ClassifiedSalesRecord ──

export const ClassifiedSalesRecordSchema = z.object({
  year: yearValue,
  month: monthOfYear,
  day: dayOfMonth,
  storeId,
  storeName: z.string(),
  groupName: z.string(),
  departmentName: z.string(),
  lineName: z.string(),
  className: z.string(),
  salesAmount: finiteNumber,
  discount71: finiteNumber,
  discount72: finiteNumber,
  discount73: finiteNumber,
  discount74: finiteNumber,
})

type _CsCheck = AssertAssignable<
  ClassifiedSalesRecord,
  z.infer<typeof ClassifiedSalesRecordSchema>
>

// ── TimeSlotEntry ──

export const TimeSlotEntrySchema = z.object({
  hour: z.number().int().min(0).max(23),
  quantity: finiteNumber,
  amount: finiteNumber,
})

type _TsCheck = AssertAssignable<TimeSlotEntry, z.infer<typeof TimeSlotEntrySchema>>

// ── CategoryTimeSalesRecord ──

const CodeNameSchema = z.object({
  code: z.string(),
  name: z.string(),
})

export const CategoryTimeSalesRecordSchema = z.object({
  year: yearValue,
  month: monthOfYear,
  day: dayOfMonth,
  storeId,
  department: CodeNameSchema,
  line: CodeNameSchema,
  klass: CodeNameSchema,
  timeSlots: z.array(TimeSlotEntrySchema),
  totalQuantity: finiteNumber,
  totalAmount: finiteNumber,
})

type _CtsCheck = AssertAssignable<
  CategoryTimeSalesRecord,
  z.infer<typeof CategoryTimeSalesRecordSchema>
>

// ── DepartmentKpiRecord ──

export const DepartmentKpiRecordSchema = z.object({
  deptCode: z.string().min(1),
  deptName: z.string(),
  gpRateBudget: finiteNumber,
  gpRateActual: finiteNumber,
  gpRateVariance: finiteNumber,
  markupRate: finiteNumber,
  discountRate: finiteNumber,
  salesBudget: finiteNumber,
  salesActual: finiteNumber,
  salesVariance: finiteNumber,
  salesAchievement: finiteNumber,
  openingInventory: finiteNumber,
  closingInventory: finiteNumber,
  gpRateLanding: finiteNumber,
  salesLanding: finiteNumber,
})

type _DkpiCheck = AssertAssignable<
  DepartmentKpiRecord,
  z.infer<typeof DepartmentKpiRecordSchema>
>

// 未使用型エイリアスの抑制（noUnusedLocals 対策）
export type { _CsCheck, _TsCheck, _CtsCheck, _DkpiCheck }
