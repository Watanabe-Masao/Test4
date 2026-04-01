/**
 * useWidgetQueryContext — ウィジェット用 DuckDB クエリコンテキスト
 *
 * DuckDB エンジン初期化・QueryExecutor 生成・天気永続化・前年仕入額取得を
 * application/ 内に閉じ込め、presentation/ が DuckDB hook を直接 import する
 * 必要をなくす。
 *
 * @layer Application — orchestrator hook
 */
import type { DateRange } from '@/domain/models/calendar'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import type { WeatherPersister } from '@/application/queries/weather'
import type { DataRepository } from '@/domain/repositories'
import { useMemo } from 'react'
import { useDuckDB } from '@/application/hooks/useDuckDB'
import { createQueryExecutor } from '@/application/queries/QueryPort'
import { createWeatherPersister } from '@/application/queries/weather'
import { useStoreCostPriceQuery } from '@/application/hooks/duckdb/useStoreCostPriceQuery'

export interface WidgetQueryContext {
  readonly queryExecutor: QueryExecutor
  readonly weatherPersist: WeatherPersister | null
  readonly dataVersion: number
  readonly loadedMonthCount: number
  readonly prevYearStoreCostPrice?: ReadonlyMap<string, { cost: number; price: number }>
}

/**
 * DuckDB エンジン初期化 + クエリコンテキストの一括構築。
 *
 * presentation/ の useUnifiedWidgetContext はこのフックを呼ぶだけで
 * DuckDB 関連の全データを取得できる。
 */
export function useWidgetQueryContext(
  targetYear: number,
  targetMonth: number,
  repo: DataRepository | null,
  prevYearDateRange: DateRange | null | undefined,
): WidgetQueryContext {
  // DuckDB エンジン初期化
  const duck = useDuckDB(targetYear, targetMonth, repo)

  // QueryExecutor — conn を隠蔽し QueryHandler 経由で実行する
  // dataVersion を deps に含めることで、データロード完了時に executor 参照が更新され、
  // useQueryWithHandler の全クエリが再実行される
  const queryExecutor = useMemo(
    () => createQueryExecutor(duck.conn, duck.dataVersion),
    [duck.conn, duck.dataVersion],
  )

  // WeatherPersister — ETRN フォールバック用（useMemo で参照安定化）
  const weatherPersist = useMemo(
    () => createWeatherPersister(duck.conn, duck.db),
    [duck.conn, duck.db],
  )

  // 前年店舗別仕入額（額で保持 — @guard B3）
  const { data: prevYearStoreCostPrice } = useStoreCostPriceQuery(
    duck.conn,
    duck.dataVersion,
    prevYearDateRange ?? null,
  )

  return {
    queryExecutor,
    weatherPersist,
    dataVersion: duck.dataVersion,
    loadedMonthCount: duck.loadedMonthCount,
    prevYearStoreCostPrice,
  }
}
