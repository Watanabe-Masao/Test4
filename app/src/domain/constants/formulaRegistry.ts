/**
 * FORMULA_REGISTRY — 登録済み数学公式レジストリ
 *
 * 全ての計算ロジックはこのレジストリに登録された公式のみ使用可能。
 * CI テストが FORMULA_REGISTRY とコードの整合を検証する。
 *
 * 不変条件:
 *   - domain/calculations/ 内の全 export 関数はいずれかの FormulaId に紐づく
 *   - 未登録の除算（raw `/`）は統計プリミティブ内のみ許容
 *   - METRIC_DEFS の各指標は formulaRef で本レジストリを参照する
 *
 * inputs（接点ルール）:
 *   各公式の入力パラメータに対して source を定義する。
 *   「売上という係数が存在するなら、売上はここから取得する」
 *   というバインディングルールにより、データの取り違えを構造的に防ぐ。
 *
 *   source の表記規約:
 *     - 'StoreResult.fieldName' — 計算済み店舗結果
 *     - 'InventoryConfig.fieldName' — 棚卸設定
 *     - 'BudgetData.fieldName' — 予算データ
 *     - 'CTS.fieldName' — CategoryTimeSalesRecord 集約値
 *     - 'DailyRecord.fieldName' — 日次レコード
 *     - '(引数)' — 呼び出し側が動的に決定（汎用公式）
 */
import type { FormulaId, FormulaMeta } from '../models/Formula'
import { FORMULA_REGISTRY_CORE } from './formulaRegistryCore'
import { FORMULA_REGISTRY_BUSINESS } from './formulaRegistryBusiness'

export const FORMULA_REGISTRY: Readonly<Record<FormulaId, FormulaMeta>> = {
  ...FORMULA_REGISTRY_CORE,
  ...FORMULA_REGISTRY_BUSINESS,
} as const
