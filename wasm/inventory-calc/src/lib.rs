// lib.rs — wasm_bindgen FFI adapter only.
// @contractId BIZ-009
// @semanticClass business
// @authorityKind candidate-authoritative
//
// FFI Output: Float64Array, flattened daily rows.
// Each row = 11 fields: [day, sales, coreSales, grossSales, inventoryCost,
//   estCogs, costInclusionCost, cumInventoryCost, cumEstCogs, estimated, actual]
// actual: NaN = null. Total length = daysInMonth * 11.

pub mod inventory_calc;
pub mod utils;

use wasm_bindgen::prelude::*;

/// Compute daily estimated inventory details.
///
/// All daily_* arrays: index i = day (i+1), length === days_in_month.
/// closing_inventory: NaN = null (no physical count).
/// markup_rate / discount_rate: from same canonical source as current JS reference.
///
/// Returns Float64Array of length daysInMonth * 11 (flattened InventoryDetailRow).
#[wasm_bindgen]
pub fn compute_estimated_inventory_details(
    daily_sales: &js_sys::Float64Array,
    daily_flowers_price: &js_sys::Float64Array,
    daily_direct_produce_price: &js_sys::Float64Array,
    daily_cost_inclusion_cost: &js_sys::Float64Array,
    daily_total_cost: &js_sys::Float64Array,
    daily_delivery_sales_cost: &js_sys::Float64Array,
    opening_inventory: f64,
    closing_inventory: f64,
    markup_rate: f64,
    discount_rate: f64,
    days_in_month: u32,
) -> js_sys::Float64Array {
    let result = inventory_calc::compute_estimated_inventory_details(
        &daily_sales.to_vec(),
        &daily_flowers_price.to_vec(),
        &daily_direct_produce_price.to_vec(),
        &daily_cost_inclusion_cost.to_vec(),
        &daily_total_cost.to_vec(),
        &daily_delivery_sales_cost.to_vec(),
        opening_inventory,
        closing_inventory,
        markup_rate,
        discount_rate,
        days_in_month as usize,
    );

    let arr = js_sys::Float64Array::new_with_length(result.len() as u32);
    for (i, &v) in result.iter().enumerate() {
        arr.set_index(i as u32, v);
    }
    arr
}
