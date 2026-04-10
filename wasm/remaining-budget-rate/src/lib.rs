// lib.rs — wasm_bindgen FFI adapter only.
// @contractId BIZ-008
// @semanticClass business
// @authorityKind candidate-authoritative

pub mod remaining_budget_rate;
pub mod utils;

use wasm_bindgen::prelude::*;

/// Calculate remaining budget achievement rate.
///
/// `budget_daily_arr`: Float64Array where index i = day (i+1)'s budget amount.
/// Returns scalar f64 (percentage, 100 = on plan).
#[wasm_bindgen]
pub fn calculate_remaining_budget_rate(
    budget: f64,
    total_sales: f64,
    budget_daily_arr: &js_sys::Float64Array,
    elapsed_days: u32,
    days_in_month: u32,
) -> f64 {
    let daily = budget_daily_arr.to_vec();
    remaining_budget_rate::calculate_remaining_budget_rate(
        budget,
        total_sales,
        &daily,
        elapsed_days as usize,
        days_in_month as usize,
    )
}
