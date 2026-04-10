// lib.rs — wasm_bindgen FFI adapter only.
// @contractId BIZ-010
// @semanticClass business
// @authorityKind candidate-authoritative
//
// FFI Output: Float64Array [lastRecordedSalesDay, elapsedDays, salesDays,
//   daysInMonth, remainingDays, statusCode, warningFlags]
// statusCode: 0=ok, 1=partial, 2=invalid, 3=undefined
// warningFlags: bitmask (1=no_sales, 2=insufficient_days, 4=incomplete, 8=stale)

pub mod observation_period;

use wasm_bindgen::prelude::*;
use observation_period::ObservationThresholds;

/// Evaluate observation period.
///
/// `daily_sales`: Float64Array, index i = day (i+1), length === days_in_month.
/// `current_elapsed_days`: calendar elapsed days from month start.
/// `min_days_for_valid`, `min_days_for_ok`, `stale_days_threshold`, `min_sales_days`:
///   observation thresholds (use defaults: 5, 10, 7, 3).
///
/// Returns Float64Array [lastRecordedSalesDay, elapsedDays, salesDays,
///   daysInMonth, remainingDays, statusCode, warningFlags]
#[wasm_bindgen]
pub fn evaluate_observation_period(
    daily_sales: &js_sys::Float64Array,
    days_in_month: u32,
    current_elapsed_days: u32,
    min_days_for_valid: u32,
    min_days_for_ok: u32,
    stale_days_threshold: u32,
    min_sales_days: u32,
) -> js_sys::Float64Array {
    let sales = daily_sales.to_vec();
    let thresholds = ObservationThresholds {
        min_days_for_valid,
        min_days_for_ok,
        stale_days_threshold,
        min_sales_days,
    };

    let r = observation_period::evaluate_observation_period(
        &sales,
        days_in_month,
        current_elapsed_days,
        &thresholds,
    );

    let arr = js_sys::Float64Array::new_with_length(7);
    arr.set_index(0, r.last_recorded_sales_day as f64);
    arr.set_index(1, r.elapsed_days as f64);
    arr.set_index(2, r.sales_days as f64);
    arr.set_index(3, r.days_in_month as f64);
    arr.set_index(4, r.remaining_days as f64);
    arr.set_index(5, r.status as u8 as f64);
    arr.set_index(6, r.warning_flags as f64);
    arr
}
