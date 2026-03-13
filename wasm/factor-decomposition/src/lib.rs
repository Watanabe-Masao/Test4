// lib.rs — wasm_bindgen FFI adapter only.
// Pure authoritative logic lives in decompose.rs / price_mix.rs / utils.rs.
// This file handles only: FFI boundary, Float64Array conversion, null sentinels.

pub mod decompose;
pub mod price_mix;
pub mod types;
pub mod utils;

use decompose::{
    decompose2 as decompose2_inner, decompose3 as decompose3_inner,
    decompose5 as decompose5_inner,
};
use price_mix::decompose_price_mix as decompose_price_mix_inner;
use wasm_bindgen::prelude::*;

/// 2-factor Shapley decomposition: customer effect + ticket effect
/// Returns Float64Array [cust_effect, ticket_effect]
#[wasm_bindgen]
pub fn decompose2(
    prev_sales: f64,
    cur_sales: f64,
    prev_cust: f64,
    cur_cust: f64,
) -> js_sys::Float64Array {
    let r = decompose2_inner(prev_sales, cur_sales, prev_cust, cur_cust);
    let arr = js_sys::Float64Array::new_with_length(2);
    arr.set_index(0, r.cust_effect);
    arr.set_index(1, r.ticket_effect);
    arr
}

/// 3-factor Shapley decomposition: customer + qty + price-per-item
/// Returns Float64Array [cust_effect, qty_effect, price_per_item_effect]
#[wasm_bindgen]
pub fn decompose3(
    prev_sales: f64,
    cur_sales: f64,
    prev_cust: f64,
    cur_cust: f64,
    prev_total_qty: f64,
    cur_total_qty: f64,
) -> js_sys::Float64Array {
    let r = decompose3_inner(prev_sales, cur_sales, prev_cust, cur_cust, prev_total_qty, cur_total_qty);
    let arr = js_sys::Float64Array::new_with_length(3);
    arr.set_index(0, r.cust_effect);
    arr.set_index(1, r.qty_effect);
    arr.set_index(2, r.price_per_item_effect);
    arr
}

/// Price/mix Shapley decomposition
/// Input: parallel arrays for cur/prev categories (keys, qtys, amts)
/// Returns Float64Array [is_null, price_effect, mix_effect]
///   is_null: 0.0 = valid result, 1.0 = null (insufficient data)
#[wasm_bindgen]
pub fn decompose_price_mix(
    cur_keys: Vec<String>,
    cur_qtys: &[f64],
    cur_amts: &[f64],
    prev_keys: Vec<String>,
    prev_qtys: &[f64],
    prev_amts: &[f64],
) -> js_sys::Float64Array {
    let cur_cats = build_categories(&cur_keys, cur_qtys, cur_amts);
    let prev_cats = build_categories(&prev_keys, prev_qtys, prev_amts);

    let arr = js_sys::Float64Array::new_with_length(3);
    match decompose_price_mix_inner(&cur_cats, &prev_cats) {
        Some(r) => {
            arr.set_index(0, 0.0); // valid
            arr.set_index(1, r.price_effect);
            arr.set_index(2, r.mix_effect);
        }
        None => {
            arr.set_index(0, 1.0); // null
            arr.set_index(1, 0.0);
            arr.set_index(2, 0.0);
        }
    }
    arr
}

/// 5-factor decomposition: customer + qty + price + mix
/// Returns Float64Array [is_null, cust_effect, qty_effect, price_effect, mix_effect]
#[wasm_bindgen]
pub fn decompose5(
    prev_sales: f64,
    cur_sales: f64,
    prev_cust: f64,
    cur_cust: f64,
    prev_total_qty: f64,
    cur_total_qty: f64,
    cur_keys: Vec<String>,
    cur_qtys: &[f64],
    cur_amts: &[f64],
    prev_keys: Vec<String>,
    prev_qtys: &[f64],
    prev_amts: &[f64],
) -> js_sys::Float64Array {
    let cur_cats = build_categories(&cur_keys, cur_qtys, cur_amts);
    let prev_cats = build_categories(&prev_keys, prev_qtys, prev_amts);

    let arr = js_sys::Float64Array::new_with_length(5);
    match decompose5_inner(
        prev_sales, cur_sales, prev_cust, cur_cust, prev_total_qty, cur_total_qty,
        &cur_cats, &prev_cats,
    ) {
        None => {
            arr.set_index(0, 1.0); // null sentinel
            arr.set_index(1, 0.0);
            arr.set_index(2, 0.0);
            arr.set_index(3, 0.0);
            arr.set_index(4, 0.0);
        }
        Some(r) => {
            arr.set_index(0, 0.0); // valid
            arr.set_index(1, r.cust_effect);
            arr.set_index(2, r.qty_effect);
            arr.set_index(3, r.price_effect);
            arr.set_index(4, r.mix_effect);
        }
    }
    arr
}

fn build_categories(keys: &[String], qtys: &[f64], amts: &[f64]) -> Vec<(String, f64, f64)> {
    let len = keys.len().min(qtys.len()).min(amts.len());
    (0..len)
        .map(|i| (keys[i].clone(), qtys[i], amts[i]))
        .collect()
}
