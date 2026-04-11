// lib.rs — wasm_bindgen FFI adapter only.
// Pure candidate-authoritative logic lives in pi_value module.
// This file handles only: FFI boundary, Float64Array conversion.
//
// @contractId BIZ-012
// @semanticClass business
// @authorityKind candidate-authoritative

pub mod pi_value;
pub mod utils;

use wasm_bindgen::prelude::*;

/// Calculate quantity PI value: (total_quantity / customers) * 1,000
/// Returns scalar f64. Returns 0 when customers = 0.
#[wasm_bindgen]
pub fn calculate_quantity_pi(total_quantity: f64, customers: f64) -> f64 {
    pi_value::calculate_quantity_pi(total_quantity, customers)
}

/// Calculate amount PI value: (total_sales / customers) * 1,000
/// Returns scalar f64. Returns 0 when customers = 0.
#[wasm_bindgen]
pub fn calculate_amount_pi(total_sales: f64, customers: f64) -> f64 {
    pi_value::calculate_amount_pi(total_sales, customers)
}

/// Calculate both PI values at once.
/// Returns Float64Array [quantityPI, amountPI].
#[wasm_bindgen]
pub fn calculate_pi_values(total_quantity: f64, total_sales: f64, customers: f64) -> js_sys::Float64Array {
    let (qty, amt) = pi_value::calculate_pi_values(total_quantity, total_sales, customers);
    let arr = js_sys::Float64Array::new_with_length(2);
    arr.set_index(0, qty);
    arr.set_index(1, amt);
    arr
}
