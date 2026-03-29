// Core utility functions — safe arithmetic, ratio primitives, moving average.
// Authoritative implementations with mathematical invariant proofs.

pub mod ratios;
pub mod moving_average;
pub mod aggregation;

use wasm_bindgen::prelude::*;

// ── Safe Division ──

#[wasm_bindgen]
pub fn safe_divide(numerator: f64, denominator: f64, fallback: f64) -> f64 {
    if denominator != 0.0 { numerator / denominator } else { fallback }
}

// ── Ratio Primitives (all use safe_divide internally) ──

#[wasm_bindgen]
pub fn calculate_achievement_rate(actual: f64, target: f64) -> f64 {
    safe_divide(actual, target, 0.0)
}

#[wasm_bindgen]
pub fn calculate_yoy_ratio(current: f64, previous: f64) -> f64 {
    safe_divide(current, previous, 0.0)
}

#[wasm_bindgen]
pub fn calculate_share(part: f64, whole: f64) -> f64 {
    safe_divide(part, whole, 0.0)
}

#[wasm_bindgen]
pub fn calculate_gross_profit_rate(gross_profit: f64, sales: f64) -> f64 {
    safe_divide(gross_profit, sales, 0.0)
}

#[wasm_bindgen]
pub fn calculate_markup_rate(gross_profit: f64, sales_price: f64) -> f64 {
    safe_divide(gross_profit, sales_price, 0.0)
}

#[wasm_bindgen]
pub fn calculate_growth_rate(current: f64, previous: f64) -> f64 {
    safe_divide(current - previous, previous, 0.0)
}

#[wasm_bindgen]
pub fn calculate_transaction_value(sales: f64, customers: f64) -> f64 {
    safe_divide(sales, customers, 0.0)
}

#[wasm_bindgen]
pub fn calculate_items_per_customer(total_qty: f64, customers: f64) -> f64 {
    safe_divide(total_qty, customers, 0.0)
}

#[wasm_bindgen]
pub fn calculate_average_price_per_item(sales: f64, total_qty: f64) -> f64 {
    safe_divide(sales, total_qty, 0.0)
}

#[wasm_bindgen]
pub fn calculate_remaining_budget_rate(
    actual_cum: f64, budget: f64, elapsed_days: f64, total_days: f64,
) -> f64 {
    if budget <= 0.0 || total_days <= 0.0 { return 0.0; }
    let remaining_budget = budget - actual_cum;
    let remaining_days = total_days - elapsed_days;
    if remaining_days <= 0.0 { return 0.0; }
    safe_divide(remaining_budget, remaining_days, 0.0)
}

// ── Moving Average ──

/// Moving average with configurable window.
/// Returns Float64Array of same length as input.
/// First (window-1) values use partial window.
#[wasm_bindgen]
pub fn calculate_moving_average(values: &js_sys::Float64Array, window: u32) -> js_sys::Float64Array {
    let vals = values.to_vec();
    let result = moving_average::compute_moving_average(&vals, window as usize);
    let arr = js_sys::Float64Array::new_with_length(result.len() as u32);
    for (i, v) in result.iter().enumerate() {
        arr.set_index(i as u32, *v);
    }
    arr
}

// ── Aggregation ──

/// Sum of nullable values (NaN = null sentinel).
/// Returns sum, ignoring NaN entries.
#[wasm_bindgen]
pub fn sum_nullable(values: &js_sys::Float64Array) -> f64 {
    aggregation::sum_nullable(&values.to_vec())
}
