/**
 * 部門別KPIビューフック
 *
 * Zustand ストアの生 DepartmentKpiData を DepartmentKpiIndex に変換し、
 * Presentation 層に表示用データを提供する。
 * Presentation 層が生 .records を直接参照することを防ぐ。
 */
import { useMemo } from 'react'
import { useDataStore } from '@/application/stores/dataStore'
import {
  buildDepartmentKpiIndex,
  type DepartmentKpiIndex,
} from '@/application/usecases/departmentKpi/indexBuilder'

export type { DepartmentKpiIndex }

export function useDeptKpiView(): DepartmentKpiIndex {
  const departmentKpi = useDataStore((s) => s.data.departmentKpi)
  return useMemo(() => buildDepartmentKpiIndex(departmentKpi), [departmentKpi])
}
