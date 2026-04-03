/**
 * 後方互換 re-export
 *
 * 実体は application/hooks/plans/useIntegratedSalesPlan.ts に移動。
 * Screen Query Plan は Application 層の責務。
 */
export {
  useIntegratedSalesPlan,
  buildQtyPairInput,
  type IntegratedSalesPlanParams,
  type IntegratedSalesPlanResult,
  type DailyQuantityData,
} from '@/application/hooks/plans/useIntegratedSalesPlan'
