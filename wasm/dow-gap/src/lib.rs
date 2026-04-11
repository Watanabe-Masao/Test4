// lib.rs — wasm_bindgen FFI adapter only.
// @contractId ANA-007
// @semanticClass analytic
// @authorityKind candidate-authoritative
//
// Input: all flat arrays. Date computation (countDowsInMonth) is TS adapter responsibility.
// Output: Float64Array[65] (fixed-size packed result)

pub mod dow_gap;
pub mod statistics;
pub mod utils;

use wasm_bindgen::prelude::*;

/// Analyze DOW gap.
///
/// current_counts, previous_counts: Float64Array[7] (pre-computed by TS adapter)
/// prev_dow_sales: Float64Array[7] (NaN = no data)
/// sales_by_dow_flat, customers_by_dow_flat: packed column-major 2D arrays
/// dow_data_lengths: Uint32Array[7] (actual data count per DOW)
///
/// Returns Float64Array[65]: see dow_gap.rs TOTAL_OUTPUT comment
#[wasm_bindgen]
pub fn analyze_dow_gap(
    current_counts: &js_sys::Float64Array,
    previous_counts: &js_sys::Float64Array,
    prev_dow_sales: &js_sys::Float64Array,
    daily_average_sales: f64,
    sales_by_dow_flat: &js_sys::Float64Array,
    customers_by_dow_flat: &js_sys::Float64Array,
    dow_data_lengths: &js_sys::Uint32Array,
    daily_average_customers: f64,
    has_daily_data: bool,
) -> js_sys::Float64Array {
    let cur: [f64; 7] = {
        let v = current_counts.to_vec();
        [v[0], v[1], v[2], v[3], v[4], v[5], v[6]]
    };
    let prev: [f64; 7] = {
        let v = previous_counts.to_vec();
        [v[0], v[1], v[2], v[3], v[4], v[5], v[6]]
    };
    let ps: [f64; 7] = {
        let v = prev_dow_sales.to_vec();
        [v[0], v[1], v[2], v[3], v[4], v[5], v[6]]
    };
    let dl: [u32; 7] = {
        let v = dow_data_lengths.to_vec();
        [v[0] as u32, v[1] as u32, v[2] as u32, v[3] as u32, v[4] as u32, v[5] as u32, v[6] as u32]
    };

    let out = dow_gap::analyze_dow_gap(
        &cur, &prev, &ps, daily_average_sales,
        &sales_by_dow_flat.to_vec(), &customers_by_dow_flat.to_vec(),
        &dl, daily_average_customers, has_daily_data,
    );

    let arr = js_sys::Float64Array::new_with_length(dow_gap::TOTAL_OUTPUT as u32);
    for (i, &v) in out.iter().enumerate() {
        arr.set_index(i as u32, v);
    }
    arr
}
