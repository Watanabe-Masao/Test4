// lib.rs — wasm_bindgen FFI adapter only.
// Pure forecast logic lives in the inner modules.
// This file handles only: FFI boundary, Float64Array conversion, null sentinels.

pub mod anomalies;
pub mod regression;
pub mod stddev;
pub mod trend;
pub mod types;
pub mod utils;
pub mod wma;

use wasm_bindgen::prelude::*;

/// Calculate population mean and standard deviation.
/// Returns Float64Array [mean, stdDev]
#[wasm_bindgen]
pub fn calculate_stddev(values: &[f64]) -> js_sys::Float64Array {
    let r = stddev::calculate_stddev(values);
    let arr = js_sys::Float64Array::new_with_length(2);
    arr.set_index(0, r.mean);
    arr.set_index(1, r.std_dev);
    arr
}

/// Detect anomalies using z-score method.
/// Input: sorted keys & values (pre-filtered v > 0), threshold.
/// Returns Float64Array [count, day0, value0, mean0, stdDev0, zScore0, isAnomaly0, ...]
///   isAnomaly: 1.0 = true, 0.0 = false
#[wasm_bindgen]
pub fn detect_anomalies(
    keys: &[f64],
    values: &[f64],
    threshold: f64,
) -> js_sys::Float64Array {
    let results = anomalies::detect_anomalies(keys, values, threshold);
    let count = results.len();
    let arr = js_sys::Float64Array::new_with_length((1 + count * 6) as u32);
    arr.set_index(0, count as f64);
    for (i, entry) in results.iter().enumerate() {
        let base = 1 + i * 6;
        arr.set_index(base as u32, entry.day);
        arr.set_index((base + 1) as u32, entry.value);
        arr.set_index((base + 2) as u32, entry.mean);
        arr.set_index((base + 3) as u32, entry.std_dev);
        arr.set_index((base + 4) as u32, entry.z_score);
        arr.set_index((base + 5) as u32, if entry.is_anomaly { 1.0 } else { 0.0 });
    }
    arr
}

/// Calculate weighted moving average.
/// Input: sorted keys & values (pre-filtered v > 0), window size.
/// Returns Float64Array [count, day0, actual0, wma0, ...]
#[wasm_bindgen]
pub fn calculate_wma(
    keys: &[f64],
    values: &[f64],
    window: u32,
) -> js_sys::Float64Array {
    let results = wma::calculate_wma(keys, values, window as usize);
    let count = results.len();
    let arr = js_sys::Float64Array::new_with_length((1 + count * 3) as u32);
    arr.set_index(0, count as f64);
    for (i, entry) in results.iter().enumerate() {
        let base = 1 + i * 3;
        arr.set_index(base as u32, entry.day);
        arr.set_index((base + 1) as u32, entry.actual);
        arr.set_index((base + 2) as u32, entry.wma);
    }
    arr
}

/// Linear regression: y = slope * x + intercept.
/// Returns Float64Array [slope, intercept, rSquared]
#[wasm_bindgen]
pub fn linear_regression(keys: &[f64], values: &[f64]) -> js_sys::Float64Array {
    let r = regression::linear_regression(keys, values);
    let arr = js_sys::Float64Array::new_with_length(3);
    arr.set_index(0, r.slope);
    arr.set_index(1, r.intercept);
    arr.set_index(2, r.r_squared);
    arr
}

/// Analyze trend from monthly data points.
/// Input: parallel arrays (years, months, totalSales).
/// Returns Float64Array packed:
///   [N, momChanges(N), yoyChanges(N), movingAvg3(N), movingAvg6(N),
///    seasonalIndex(12), overallTrend, averageMonthlySales]
///   NaN represents null. overallTrend: 0=up, 1=down, 2=flat.
#[wasm_bindgen]
pub fn analyze_trend(
    years: &[f64],
    months: &[f64],
    total_sales: &[f64],
) -> js_sys::Float64Array {
    let r = trend::analyze_trend(years, months, total_sales);
    let n = r.mom_changes.len();
    // Layout: [N, mom(N), yoy(N), ma3(N), ma6(N), seasonal(12), trend, avgSales]
    let total_len = 1 + n * 4 + 12 + 1 + 1;
    let arr = js_sys::Float64Array::new_with_length(total_len as u32);

    arr.set_index(0, n as f64);

    let mut offset = 1;
    for v in &r.mom_changes {
        arr.set_index(offset as u32, *v);
        offset += 1;
    }
    for v in &r.yoy_changes {
        arr.set_index(offset as u32, *v);
        offset += 1;
    }
    for v in &r.moving_avg_3 {
        arr.set_index(offset as u32, *v);
        offset += 1;
    }
    for v in &r.moving_avg_6 {
        arr.set_index(offset as u32, *v);
        offset += 1;
    }
    for v in &r.seasonal_index {
        arr.set_index(offset as u32, *v);
        offset += 1;
    }
    arr.set_index(offset as u32, r.overall_trend as f64);
    arr.set_index((offset + 1) as u32, r.average_monthly_sales);

    arr
}
