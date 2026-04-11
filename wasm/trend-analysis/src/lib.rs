// lib.rs — wasm_bindgen FFI adapter only.
// @contractId ANA-004
// @semanticClass analytic
// @authorityKind candidate-authoritative

pub mod trend_analysis;
pub mod utils;

use wasm_bindgen::prelude::*;

/// Analyze trend from monthly data.
///
/// Input: years(Int32Array), months(Int32Array), totalSales(Float64Array)
/// Output: flat packed Float64Array
/// [n, overallTrend, avgMonthlySales, seasonal[12],
///  sortedIndices[n], momChanges[n], yoyChanges[n], movingAvg3[n], movingAvg6[n]]
#[wasm_bindgen]
pub fn analyze_trend(
    years: &js_sys::Int32Array,
    months: &js_sys::Int32Array,
    total_sales: &js_sys::Float64Array,
) -> js_sys::Float64Array {
    let y: Vec<i32> = years.to_vec();
    let m: Vec<i32> = months.to_vec();
    let s = total_sales.to_vec();

    let r = trend_analysis::analyze_trend(&y, &m, &s);
    let n = r.sorted_indices.len();

    let total_len = 3 + 12 + 5 * n;
    let arr = js_sys::Float64Array::new_with_length(total_len as u32);

    let mut off: u32 = 0;
    arr.set_index(off, n as f64); off += 1;
    arr.set_index(off, r.overall_trend as u8 as f64); off += 1;
    arr.set_index(off, r.average_monthly_sales); off += 1;

    for i in 0..12u32 {
        arr.set_index(off + i, r.seasonal_index[i as usize]);
    }
    off += 12;

    for i in 0..n as u32 {
        arr.set_index(off + i, r.sorted_indices[i as usize] as f64);
    }
    off += n as u32;

    for i in 0..n as u32 {
        arr.set_index(off + i, r.mom_changes[i as usize]);
    }
    off += n as u32;

    for i in 0..n as u32 {
        arr.set_index(off + i, r.yoy_changes[i as usize]);
    }
    off += n as u32;

    for i in 0..n as u32 {
        arr.set_index(off + i, r.moving_avg_3[i as usize]);
    }
    off += n as u32;

    for i in 0..n as u32 {
        arr.set_index(off + i, r.moving_avg_6[i as usize]);
    }

    arr
}
