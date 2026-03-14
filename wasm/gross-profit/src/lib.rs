// lib.rs — wasm_bindgen FFI adapter only.
// Pure authoritative logic lives in the inner modules.
// This file handles only: FFI boundary, Float64Array conversion, null sentinels.

pub mod cost_aggregation;
pub mod discount_impact;
pub mod est_method;
pub mod inv_method;
pub mod markup_rate;
pub mod types;
pub mod utils;

use wasm_bindgen::prelude::*;

/// Calculate inventory cost: totalCost - deliverySalesCost
/// Returns scalar f64 (no null possible).
#[wasm_bindgen]
pub fn calculate_inventory_cost(total_cost: f64, delivery_sales_cost: f64) -> f64 {
    cost_aggregation::calculate_inventory_cost(total_cost, delivery_sales_cost)
}

/// Calculate transfer totals: sum of 4 transfer directions.
/// Returns Float64Array [transferPrice, transferCost]
#[wasm_bindgen]
pub fn calculate_transfer_totals(
    inter_store_in_price: f64,
    inter_store_in_cost: f64,
    inter_store_out_price: f64,
    inter_store_out_cost: f64,
    inter_department_in_price: f64,
    inter_department_in_cost: f64,
    inter_department_out_price: f64,
    inter_department_out_cost: f64,
) -> js_sys::Float64Array {
    let r = cost_aggregation::calculate_transfer_totals(
        inter_store_in_price,
        inter_store_in_cost,
        inter_store_out_price,
        inter_store_out_cost,
        inter_department_in_price,
        inter_department_in_cost,
        inter_department_out_price,
        inter_department_out_cost,
    );
    let arr = js_sys::Float64Array::new_with_length(2);
    arr.set_index(0, r.transfer_price);
    arr.set_index(1, r.transfer_cost);
    arr
}

/// Calculate discount rate: discountAmount / (salesAmount + discountAmount)
/// Returns scalar f64 (no null possible).
#[wasm_bindgen]
pub fn calculate_discount_rate(sales_amount: f64, discount_amount: f64) -> f64 {
    est_method::calculate_discount_rate(sales_amount, discount_amount)
}

/// Calculate core sales with over-delivery detection.
/// Returns Float64Array [coreSales, isOverDelivery (1.0/0.0), overDeliveryAmount]
#[wasm_bindgen]
pub fn calculate_core_sales(
    total_sales: f64,
    flower_sales_price: f64,
    direct_produce_sales_price: f64,
) -> js_sys::Float64Array {
    let r = est_method::calculate_core_sales(total_sales, flower_sales_price, direct_produce_sales_price);
    let arr = js_sys::Float64Array::new_with_length(3);
    arr.set_index(0, r.core_sales);
    arr.set_index(1, if r.is_over_delivery { 1.0 } else { 0.0 });
    arr.set_index(2, r.over_delivery_amount);
    arr
}

/// Calculate markup rates (average and core).
/// Returns Float64Array [averageMarkupRate, coreMarkupRate]
#[wasm_bindgen]
pub fn calculate_markup_rates(
    purchase_price: f64,
    purchase_cost: f64,
    delivery_price: f64,
    delivery_cost: f64,
    transfer_price: f64,
    transfer_cost: f64,
    default_markup_rate: f64,
) -> js_sys::Float64Array {
    let r = markup_rate::calculate_markup_rates(
        purchase_price,
        purchase_cost,
        delivery_price,
        delivery_cost,
        transfer_price,
        transfer_cost,
        default_markup_rate,
    );
    let arr = js_sys::Float64Array::new_with_length(2);
    arr.set_index(0, r.average_markup_rate);
    arr.set_index(1, r.core_markup_rate);
    arr
}

/// Calculate discount impact (discount loss cost).
/// Returns scalar f64 (no null possible).
#[wasm_bindgen]
pub fn calculate_discount_impact(
    core_sales: f64,
    markup_rate: f64,
    discount_rate: f64,
) -> f64 {
    discount_impact::calculate_discount_impact(core_sales, markup_rate, discount_rate)
}

/// Calculate gross profit using inventory method.
/// Returns Float64Array [isNull (1.0/0.0), cogs, grossProfit, grossProfitRate]
///   isNull: 1.0 = null (opening/closing inventory missing), 0.0 = valid result
#[wasm_bindgen]
pub fn calculate_inv_method(
    opening_inventory: f64,
    closing_inventory: f64,
    total_purchase_cost: f64,
    total_sales: f64,
) -> js_sys::Float64Array {
    let r = inv_method::calculate_inv_method(
        opening_inventory,
        closing_inventory,
        total_purchase_cost,
        total_sales,
    );
    let arr = js_sys::Float64Array::new_with_length(4);
    arr.set_index(0, if r.is_null { 1.0 } else { 0.0 });
    arr.set_index(1, r.cogs);
    arr.set_index(2, r.gross_profit);
    arr.set_index(3, r.gross_profit_rate);
    arr
}

/// Calculate gross profit using estimation method.
/// Returns Float64Array [ciIsNull (1.0/0.0), grossSales, cogs, margin, marginRate, closingInventory]
///   ciIsNull: 1.0 = closingInventory is null, 0.0 = valid
#[wasm_bindgen]
pub fn calculate_est_method(
    core_sales: f64,
    discount_rate: f64,
    markup_rate: f64,
    cost_inclusion_cost: f64,
    opening_inventory: f64,
    inventory_purchase_cost: f64,
) -> js_sys::Float64Array {
    let r = est_method::calculate_est_method(
        core_sales,
        discount_rate,
        markup_rate,
        cost_inclusion_cost,
        opening_inventory,
        inventory_purchase_cost,
    );
    let arr = js_sys::Float64Array::new_with_length(6);
    arr.set_index(0, if r.closing_inventory_is_null { 1.0 } else { 0.0 });
    arr.set_index(1, r.gross_sales);
    arr.set_index(2, r.cogs);
    arr.set_index(3, r.margin);
    arr.set_index(4, r.margin_rate);
    arr.set_index(5, r.closing_inventory);
    arr
}
