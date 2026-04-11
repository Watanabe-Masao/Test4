// lib.rs — wasm_bindgen FFI adapter only.
// @contractId BIZ-011
// @semanticClass business
// @authorityKind candidate-authoritative
//
// FFI Output: Float64Array, flattened intervals.
// Each interval = 9 fields: [startDay, endDay, openingInv, closingInv,
//   totalSales, totalPurchaseCost, cogs, grossProfit, grossProfitRate]
// Total length = pinCount * 9

pub mod pin_intervals;
pub mod utils;

use wasm_bindgen::prelude::*;

/// Calculate pin intervals.
///
/// Inputs (flat contract):
/// - `daily_sales`: Float64Array, index i = day (i+1)
/// - `daily_total_cost`: Float64Array, getDailyTotalCost applied by adapter
/// - `opening_inventory`: period-start inventory (NaN = null → 0)
/// - `pin_days`: Int32Array, 1-based ascending pin days
/// - `pin_closing_inventory`: Float64Array, closing inventory at each pin
/// - `days_in_month`: total days in month
///
/// Returns Float64Array of length pinCount * 9 (flattened PinInterval results).
#[wasm_bindgen]
pub fn calculate_pin_intervals(
    daily_sales: &js_sys::Float64Array,
    daily_total_cost: &js_sys::Float64Array,
    opening_inventory: f64,
    pin_days: &js_sys::Int32Array,
    pin_closing_inventory: &js_sys::Float64Array,
    days_in_month: u32,
) -> js_sys::Float64Array {
    let sales = daily_sales.to_vec();
    let cost = daily_total_cost.to_vec();
    let days_vec: Vec<u32> = pin_days.to_vec().into_iter().map(|d| d as u32).collect();
    let closing_vec = pin_closing_inventory.to_vec();

    let results = pin_intervals::calculate_pin_intervals(
        &sales,
        &cost,
        opening_inventory,
        &days_vec,
        &closing_vec,
        days_in_month,
    );

    let arr = js_sys::Float64Array::new_with_length(
        (results.len() * pin_intervals::FIELDS_PER_INTERVAL) as u32,
    );
    for (i, r) in results.iter().enumerate() {
        let offset = i * pin_intervals::FIELDS_PER_INTERVAL;
        arr.set_index(offset as u32, r.start_day as f64);
        arr.set_index((offset + 1) as u32, r.end_day as f64);
        arr.set_index((offset + 2) as u32, r.opening_inventory);
        arr.set_index((offset + 3) as u32, r.closing_inventory);
        arr.set_index((offset + 4) as u32, r.total_sales);
        arr.set_index((offset + 5) as u32, r.total_purchase_cost);
        arr.set_index((offset + 6) as u32, r.cogs);
        arr.set_index((offset + 7) as u32, r.gross_profit);
        arr.set_index((offset + 8) as u32, r.gross_profit_rate);
    }
    arr
}
