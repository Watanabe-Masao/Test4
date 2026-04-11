// lib.rs — wasm_bindgen FFI adapter only.
// @contractId BIZ-013
// @semanticClass business
// @authorityKind candidate-authoritative

pub mod customer_gap;
pub mod utils;

use wasm_bindgen::prelude::*;

/// Calculate customer gap metrics.
/// Returns Float64Array [isNull (1.0/0.0), customerYoY, quantityYoY, salesYoY, quantityCustomerGap, amountCustomerGap]
/// isNull: 1.0 = null (invalid prev data), 0.0 = valid result
#[wasm_bindgen]
pub fn calculate_customer_gap(
    cur_customers: f64,
    prev_customers: f64,
    cur_quantity: f64,
    prev_quantity: f64,
    cur_sales: f64,
    prev_sales: f64,
) -> js_sys::Float64Array {
    let arr = js_sys::Float64Array::new_with_length(6);
    match customer_gap::calculate_customer_gap(
        cur_customers, prev_customers, cur_quantity, prev_quantity, cur_sales, prev_sales,
    ) {
        Some(r) => {
            arr.set_index(0, 0.0); // not null
            arr.set_index(1, r.customer_yoy);
            arr.set_index(2, r.quantity_yoy);
            arr.set_index(3, r.sales_yoy);
            arr.set_index(4, r.quantity_customer_gap);
            arr.set_index(5, r.amount_customer_gap);
        }
        None => {
            arr.set_index(0, 1.0); // null
        }
    }
    arr
}
